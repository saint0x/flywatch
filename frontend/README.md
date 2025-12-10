# FlyWatch - Log Streaming & System Monitoring Dashboard

A gorgeous, production-ready log streaming application with real-time system metrics and AI-powered chat analysis. Built with Next.js 16, TypeScript, and the GOD-UI-TEMPLATE design system.

## Features

- **Real-time Log Streaming**: Mock Fly.io logs with multiple severity levels (info, success, warn, error)
- **System Health Metrics**: Live CPU, memory, network I/O, and request monitoring
- **AI Chat Assistant**: Ask questions about logs and system health with cost tracking
- **Floating Chat Interface**: Elegant popup responses that persist on hover/focus
- **Production Architecture**: Strictly typed with proper separation of concerns

## Architecture

### Data Layer

\`\`\`
lib/
├── types/           # TypeScript type definitions
│   ├── api.ts       # API response types (FlyLog, ChatResponse, etc.)
│   └── ui.ts        # UI-specific types (ProcessedLog, SystemMetric)
├── mock/            # Mock data repositories
│   ├── logs.repository.ts
│   ├── metrics.repository.ts
│   └── chat.repository.ts
├── api/             # API layer (wraps repositories)
│   ├── logs.ts
│   ├── metrics.ts
│   └── chat.ts
├── utils/           # Utility functions
│   ├── format.ts    # Formatting helpers
│   └── log-helpers.ts
└── constants/       # Configuration constants
    └── config.ts
\`\`\`

### Presentation Layer

\`\`\`
hooks/               # Custom React hooks
├── use-logs.ts      # Log streaming hook
├── use-metrics.ts   # Metrics updates hook
└── use-chat.ts      # Chat interaction hook

components/          # React components
├── log-stream.tsx
├── system-metrics.tsx
├── floating-chat-bar.tsx
└── chat-response.tsx
\`\`\`

## Data Structures

### FlyLog (from Fly.io NATS stream)

\`\`\`typescript
{
  event: { provider: "app" | "fly" },
  fly: {
    app: { instance: string, name: string },
    region: "ewr" | "iad" | "lax" | "sfo" | "sin" | "syd" | "fra"
  },
  log: { level: "info" | "warn" | "error" | "debug" },
  message: string,
  timestamp: string (ISO 8601)
}
\`\`\`

### ChatResponse

\`\`\`typescript
{
  response: string,           // Markdown-formatted AI response
  model: string,
  usage: { prompt_tokens, completion_tokens, total_tokens },
  cost: {
    input_cost_usd: number,
    output_cost_usd: number,
    total_cost_usd: number,
    // ... detailed cost breakdown
  },
  tools_called: string[],    // AI tools invoked during analysis
  processing_time_ms: number
}
\`\`\`

### MetricsSnapshot

\`\`\`typescript
{
  cpu_percent: number,
  memory_used_bytes: number,
  memory_total_bytes: number,
  memory_percent: number,
  sse_connections: number,
  ws_connections: number,
  nats_connected: boolean,
  messages_forwarded: number,
  uptime_seconds: number
}
\`\`\`

## Design System

Following the GOD-UI-TEMPLATE design principles:

- **16px border radius** for all containers
- **Slate/Gray color scales** with precise RGB values
- **Negative letter-spacing** (-0.42px for body, -1.12px for headings)
- **Glass-morphism effects** with backdrop blur and transparency
- **Multi-layer shadows** for depth and hierarchy
- **Generous spacing** for breathing room
- **Smooth transitions** (300ms duration)

## Key Patterns

### Repository Pattern

All data access goes through repository classes:
- Singleton instances for consistent state
- Subscribe/unsubscribe pattern for real-time updates
- Easy to swap mock implementations for real API calls

### Custom Hooks

UI components never directly access repositories:
- `useLogs()` - Subscribe to log stream, handle auto-scroll
- `useMetrics()` - Subscribe to metric updates, transform to UI format
- `useChat()` - Handle message sending, loading states, errors

### Type Safety

Strict TypeScript everywhere:
- Separate API types (`lib/types/api.ts`) and UI types (`lib/types/ui.ts`)
- Transform functions convert between API and UI representations
- No `any` types allowed

## Migration to Real API

To connect to the real Fly.io API:

1. Update `lib/api/logs.ts`:
   \`\`\`typescript
   export function streamLogs(): EventSource {
     return new EventSource('https://flywatch.fly.dev/logs/stream')
   }
   \`\`\`

2. Update `lib/api/chat.ts`:
   \`\`\`typescript
   export async function sendChatMessage(message: string): Promise<ChatResponse> {
     const res = await fetch('https://flywatch.fly.dev/chat', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ message })
     })
     return res.json()
   }
   \`\`\`

3. Update hooks to use real API functions instead of mock repositories

## Development

\`\`\`bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
\`\`\`

## Environment Variables

For production API integration:

\`\`\`
# Optional: If API requires authentication
AUTH_TOKEN=your_bearer_token

# Optional: Override API base URL
NEXT_PUBLIC_API_URL=https://flywatch.fly.dev
\`\`\`

## Performance Considerations

- **Log buffer**: Max 10,000 logs in memory, oldest removed first
- **Display limit**: Only render last 100 logs in UI
- **Update intervals**: Logs ~2s, Metrics 2s, Chat on-demand
- **Auto-scroll**: Smart detection, only scroll when user at bottom

## Future Enhancements

- [ ] WebSocket support for bidirectional log streaming
- [ ] Log filtering and search UI
- [ ] Export logs to CSV/JSON
- [ ] Historical metrics graphs
- [ ] Multiple chat sessions
- [ ] Cost tracking dashboard
- [ ] Custom alerts and notifications
