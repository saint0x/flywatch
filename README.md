# Flywatch

Real-time log streaming service for Fly.io applications. Exposes production logs and health metrics via SSE and WebSocket endpoints.

## Features

- **Real-time log streaming** from Fly.io's internal NATS bus
- **SSE and WebSocket** support for flexible client integration
- **Health metrics** including CPU, memory, and connection counts
- **AI-powered log analysis** via OpenRouter with tool-calling agent
- **Production-ready** with automatic reconnection and backpressure handling

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health status JSON |
| `/healthz` | GET | Kubernetes-compatible health check |
| `/ready` | GET | Readiness probe (checks NATS connection) |
| `/metrics` | GET | Full metrics snapshot |
| `/logs/stream` | GET | SSE stream of raw log events |
| `/logs/ws` | GET | WebSocket stream of raw log events |
| `/metrics/ws` | GET | WebSocket stream of metrics (1/sec) |
| `/chat` | POST | AI-powered log analysis (requires OpenRouter API key) |

## Deployment

### Prerequisites

- Fly.io account with an existing app to monitor
- Fly CLI installed and authenticated

### Deploy to Fly.io

```bash
# Create the app
fly launch --name flywatch --region iad --no-deploy

# Set required secrets
fly secrets set FLY_PROD_APP_NAME=your-app-name
fly secrets set ORG_SLUG=personal  # or your org slug from 'fly orgs list'
fly secrets set ACCESS_TOKEN=$(fly auth token)

# Deploy
fly deploy
```

### Optional: API Authentication

To require authentication for log streaming:

```bash
fly secrets set AUTH_TOKEN=your-secret-token
```

Clients must then include `Authorization: Bearer your-secret-token` header.

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `FLY_PROD_APP_NAME` | Yes | Name of the Fly app to monitor |
| `ORG_SLUG` | Yes | Fly organization slug |
| `ACCESS_TOKEN` | Yes | Fly auth token for NATS access |
| `AUTH_TOKEN` | No | Optional bearer token for API auth |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for AI chat |
| `OPENROUTER_MODEL` | No | Model to use (default: `moonshotai/kimi-k2`) |
| `LOG_BUFFER_MAX_ENTRIES` | No | Max logs in buffer (default: `10000`) |
| `LOG_BUFFER_MAX_AGE_MINUTES` | No | Max log age in minutes (default: `30`) |
| `RUST_LOG` | No | Log level (default: `info`) |
| `PORT` | No | HTTP port (default: `8080`) |

## Usage Examples

### SSE Stream (curl)

```bash
curl -N https://flywatch.fly.dev/logs/stream
```

### WebSocket (websocat)

```bash
websocat wss://flywatch.fly.dev/logs/ws
```

### Metrics WebSocket

```bash
websocat wss://flywatch.fly.dev/metrics/ws
```

### Health Check

```bash
curl https://flywatch.fly.dev/health | jq .
```

### AI Chat (Ask questions about your logs)

```bash
curl -X POST https://flywatch.fly.dev/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"message": "Are there any errors in the recent logs?"}'
```

Response:
```json
{
  "response": "Based on my analysis of the recent logs...",
  "model": "moonshotai/kimi-k2",
  "tools_called": ["get_logs({\"count\":100})"],
  "usage": {"prompt_tokens": 1234, "completion_tokens": 256, "total_tokens": 1490},
  "processing_time_ms": 2345
}
```

The AI agent has access to tools:
- `get_logs` - Fetch logs by count or time range
- `get_metrics` - Fetch system metrics (CPU, memory, connections)

## Response Formats

### Log Event (SSE/WebSocket)

```json
{
  "event": {"provider": "app"},
  "fly": {
    "app": {"instance": "abc123", "name": "your-app"},
    "region": "iad"
  },
  "log": {"level": "info"},
  "message": "Your log message here",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Metrics

```json
{
  "timestamp": "2025-01-01T12:00:00Z",
  "uptime_seconds": 3600,
  "nats_connected": true,
  "subscription_errors": 0,
  "messages_forwarded": 12345,
  "active_sse_connections": 2,
  "active_ws_connections": 1,
  "system": {
    "cpu_usage_percent": 5.2,
    "memory_used_bytes": 52428800,
    "memory_total_bytes": 268435456,
    "memory_usage_percent": 19.5
  }
}
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App      │────▶│  Fly NATS Bus   │────▶│   Flywatch      │
│ (synthesys-api) │     │ [fdaa::3]:4223  │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                              ┌──────────┴──────────┐
                                              │                     │
                                        ┌─────▼─────┐         ┌─────▼─────┐
                                        │    SSE    │         │ WebSocket │
                                        │  Clients  │         │  Clients  │
                                        └───────────┘         └───────────┘
```

## Development

### Build

```bash
cargo build --release
```

### Run Locally

Note: NATS connection only works from within Fly's private network.

```bash
export FLY_PROD_APP_NAME=your-app
export ORG_SLUG=personal
export ACCESS_TOKEN=$(fly auth token)
cargo run
```

## License

MIT
