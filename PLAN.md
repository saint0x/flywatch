# Flywatch AI Chat Implementation Plan

## Status: ✅ COMPLETE

All implementation steps finished. Build successful.

## Overview

POST `/chat` endpoint with a tool-using AI agent that can query logs and metrics on demand. Uses OpenRouter API with Moonshot Kimi K2 model.

## Architecture

```
User question → Build initial context (compressed) → Send to OpenRouter with tools
    ↓
AI analyzes, may call tools → Execute tool, return results → AI continues
    ↓
Final response
```

**Key Design Principles:**
- Token-efficient, information-dense prompts
- Dynamic prompt builder that packs context efficiently
- AI has tools to fetch more data when needed (not just dump everything upfront)

## Agent Tools

1. **`get_logs`** - Fetch logs by count or time range
   - `count`: number of recent logs
   - `minutes`: logs from last X minutes

2. **`get_metrics`** - Fetch system metrics
   - `type`: cpu, memory, connections, or all

## Token-Efficient Formatting

**Log format** (compact):
```
[15:32:01] INFO web-abc123 iad: Request completed 200 in 45ms
[15:32:02] ERR  web-abc123 iad: Connection refused to postgres
```

**Metrics format** (one line):
```
CPU: 23% | Mem: 456MB/1024MB (44%) | Conns: SSE=3 WS=12 | NATS: connected | Msgs: 45,231
```

**Initial context** (~200-400 tokens):
```
## Current State
CPU: 23% | Mem: 44% | Conns: 15 | NATS: up | Uptime: 2h34m
Logs: 8,432 buffered (last 30min) | Errors: 12 | Warns: 45

## Recent Errors (last 5)
[15:30:01] Connection refused to postgres (x3 in last 5min)
[15:28:45] Timeout waiting for response from auth service

## Last 20 Logs
[15:32:01] INFO web-abc: Request /api/users 200 45ms
...
```

## Files

### New Files

| File | Purpose | Status |
|------|---------|--------|
| `src/log_buffer.rs` | Rolling buffer with summary generation | ✅ DONE |
| `src/prompt.rs` | Token-efficient formatting | ✅ DONE |
| `src/chat.rs` | OpenRouter client with tool loop | ✅ DONE |

### Modified Files

| File | Changes | Status |
|------|---------|--------|
| `Cargo.toml` | Add reqwest dependency | ✅ DONE |
| `src/config.rs` | Add OpenRouter + buffer config | ✅ DONE |
| `src/nats.rs` | Wire log buffer | ✅ DONE |
| `src/http.rs` | Add AppState fields + /chat route | ✅ DONE |
| `src/main.rs` | Wire everything together | ✅ DONE |

## Environment Variables

```bash
# Required for AI chat
OPENROUTER_API_KEY=sk-or-v1-...

# Model configuration
OPENROUTER_MODEL=moonshotai/kimi-k2

# Optional buffer configuration
LOG_BUFFER_MAX_ENTRIES=10000      # default: 10,000
LOG_BUFFER_MAX_AGE_MINUTES=30     # default: 30
```

## API Usage

```bash
# Just ask - AI figures out what data it needs
curl -X POST http://localhost:8080/chat \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Why are we seeing connection errors?"}'

# Response includes which tools were called
{
  "response": "You're seeing connection errors to PostgreSQL...",
  "model": "moonshotai/kimi-k2",
  "tools_called": ["get_logs(minutes=10)", "get_metrics(type=all)"],
  "usage": { "prompt_tokens": 1234, "completion_tokens": 256 },
  "processing_time_ms": 3456
}
```

## Implementation Complete

All steps finished:
1. ✅ `Cargo.toml` - Added reqwest
2. ✅ `src/log_buffer.rs` - Buffer + summary generation
3. ✅ `src/prompt.rs` - Token-efficient formatting
4. ✅ `src/config.rs` - New env vars
5. ✅ `src/chat.rs` - OpenRouter + tool loop
6. ✅ `src/nats.rs` - Wire buffer
7. ✅ `src/http.rs` - AppState + route
8. ✅ `src/main.rs` - Wire everything
9. ✅ Build successful

---

## Proposed Enhancement: Stoar Integration + Smart Log Filtering

> **Note:** This section was added by an AI agent that analyzed the Flywatch codebase and identified potential improvements. These are suggestions only - the final decision on whether to implement any of this is entirely yours.

### Analysis Summary

After reviewing the current architecture, I identified two opportunities to make Flywatch more powerful:

1. **Problem:** Logs are stored in-memory only (VecDeque with 10k/30min limit). Data is lost on restart.
2. **Problem:** When fetching logs for AI context, `get_last_n(50)` might return 48 INFO logs and only 2 ERRORs - not very information-dense.

### Suggested Improvements

#### 1. Persistent Storage via Stoar

Integrate your Stoar library (`../stoar`) for SQLite-based persistence:

```
NATS Message -> LogBuffer (VecDeque) -> Broadcast SSE/WS
                    |
                    v
             PersistenceWriter (async channel)
                    |
                    v (spawn_blocking)
               Stoar (SQLite)
```

**Key design:** Write-behind with batching. Keep in-memory buffer for fast reads, async persist to Stoar. Uses `spawn_blocking` to bridge async tokio with blocking rusqlite. Batch writes every 100ms or 100 logs.

**New file:** `src/persistence.rs`

#### 2. Health Snapshots (Time + Event Triggered)

Auto-capture system state for historical analysis:

- **Time-based:** Every 5 minutes (configurable)
- **Event-driven:** Error spike (>10/min) or memory >85%

```rust
pub enum SnapshotTrigger {
    Scheduled,           // Timer-based
    ErrorSpike(u32),     // Error count threshold
    MemoryHigh(f32),     // Memory % threshold
    Manual,              // API-triggered
}
```

**New file:** `src/snapshots.rs`

#### 3. Level-Filtered Log Retrieval

Instead of "last 50 logs", get last N of each level:

```rust
pub async fn get_by_level(&self, n_per_level: usize) -> LevelFilteredLogs;

pub struct LevelFilteredLogs {
    pub errors: Vec<TimestampedLog>,    // Last N errors
    pub warnings: Vec<TimestampedLog>,  // Last N warnings
    pub infos: Vec<TimestampedLog>,     // Last N infos
    pub others: Vec<TimestampedLog>,    // Last N other
}
```

This gives the AI chat much more representative context - 10 ERROR + 10 WARN + 10 INFO instead of potentially 48 INFO + 2 ERROR.

### Files to Create

| File | Purpose |
|------|---------|
| `src/persistence.rs` | PersistenceWriter, PersistedLog, background writer task |
| `src/snapshots.rs` | SnapshotManager, event detection, HealthSnapshot |

### Files to Modify

| File | Changes |
|------|---------|
| `Cargo.toml` | Add `stoar = { path = "../stoar" }` |
| `src/log_buffer.rs` | Add `get_by_level()` method |
| `src/config.rs` | Add persistence + snapshot config fields |
| `src/nats.rs` | Wire persistence into message loop |
| `src/http.rs` | Add snapshot endpoints |
| `src/main.rs` | Initialize persistence + snapshot manager |

### New Environment Variables

```bash
STORE_PATH=./flywatch.db
PERSISTENCE_ENABLED=true
SNAPSHOT_INTERVAL_MINUTES=5
SNAPSHOT_ERROR_THRESHOLD=10
SNAPSHOT_MEMORY_THRESHOLD=85.0
```

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/snapshots` | GET | List recent snapshots |
| `/snapshots` | POST | Trigger manual snapshot |
| `/logs/history` | GET | Query persisted logs by time range |

### Implementation Order (if you decide to proceed)

1. `Cargo.toml` - Add Stoar dependency
2. `src/persistence.rs` - Create PersistenceWriter
3. `src/config.rs` - Add new config fields
4. `src/log_buffer.rs` - Add `get_by_level()` method
5. `src/nats.rs` - Wire persistence
6. `src/snapshots.rs` - Create SnapshotManager
7. `src/http.rs` - Add endpoints
8. `src/main.rs` - Wire everything

---

**Your call.** This is a significant addition. The current in-memory approach works fine for real-time monitoring - persistence adds complexity but enables historical analysis and survives restarts.
