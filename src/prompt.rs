use crate::log_buffer::{LogSummary, TimestampedLog};
use crate::metrics::MetricsSnapshot;

/// Format a duration in human-readable form
fn format_duration(seconds: u64) -> String {
    if seconds < 60 {
        format!("{}s", seconds)
    } else if seconds < 3600 {
        format!("{}m{}s", seconds / 60, seconds % 60)
    } else {
        let hours = seconds / 3600;
        let minutes = (seconds % 3600) / 60;
        format!("{}h{}m", hours, minutes)
    }
}

/// Format bytes in human-readable form
fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{}B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.0}KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.0}MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.1}GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

/// Format metrics as a compact one-liner
pub fn format_metrics_compact(metrics: &MetricsSnapshot) -> String {
    let system_info = metrics.system.as_ref().map_or(String::new(), |s| {
        format!(
            "CPU: {:.0}% | Mem: {}/{} ({:.0}%) | ",
            s.cpu_usage_percent,
            format_bytes(s.memory_used_bytes),
            format_bytes(s.memory_total_bytes),
            s.memory_usage_percent
        )
    });

    format!(
        "{}Conns: SSE={} WS={} | NATS: {} | Msgs: {} | Uptime: {}",
        system_info,
        metrics.active_sse_connections,
        metrics.active_ws_connections,
        if metrics.nats_connected { "up" } else { "down" },
        metrics.messages_forwarded,
        format_duration(metrics.uptime_seconds)
    )
}

/// Format a single log entry in compact form
pub fn format_log_compact(log: &TimestampedLog) -> String {
    let time = log.timestamp.format("%H:%M:%S");
    let level = log
        .level
        .as_ref()
        .map(|l| {
            match l.to_uppercase().as_str() {
                "ERROR" | "ERR" => "ERR ",
                "WARNING" | "WARN" => "WARN",
                "INFO" => "INFO",
                "DEBUG" => "DBG ",
                "TRACE" => "TRC ",
                _ => l.as_str(),
            }
        })
        .unwrap_or("----");

    let instance = log
        .instance
        .as_ref()
        .map(|i| {
            // Truncate long instance IDs
            if i.len() > 12 {
                &i[..12]
            } else {
                i.as_str()
            }
        })
        .unwrap_or("unknown");

    let region = log.region.as_deref().unwrap_or("---");

    let message = log.message.as_deref().unwrap_or(&log.raw);
    // Truncate very long messages
    let message = if message.len() > 200 {
        format!("{}...", &message[..197])
    } else {
        message.to_string()
    };

    format!("[{}] {} {} {}: {}", time, level, instance, region, message)
}

/// Format multiple logs in compact form
pub fn format_logs_compact(logs: &[TimestampedLog]) -> String {
    if logs.is_empty() {
        return "No logs available.".to_string();
    }

    logs.iter()
        .map(format_log_compact)
        .collect::<Vec<_>>()
        .join("\n")
}

/// Build the initial context for the AI (compressed summary)
pub fn build_initial_context(metrics: &MetricsSnapshot, summary: &LogSummary, recent_logs: &[TimestampedLog]) -> String {
    let mut context = String::with_capacity(2000);

    // Current state line
    context.push_str("## Current State\n");
    context.push_str(&format_metrics_compact(metrics));
    context.push('\n');

    // Log buffer summary
    let time_range = match (summary.oldest_timestamp, summary.newest_timestamp) {
        (Some(old), Some(new)) => {
            let duration = new.signed_duration_since(old);
            format!("{}min", duration.num_minutes())
        }
        _ => "N/A".to_string(),
    };

    context.push_str(&format!(
        "Logs: {} buffered (last {}) | Errors: {} | Warns: {}\n",
        summary.total_count, time_range, summary.error_count, summary.warn_count
    ));

    // Recent errors section
    if !summary.recent_errors.is_empty() {
        context.push_str("\n## Recent Errors\n");
        for err in &summary.recent_errors {
            context.push_str(err);
            context.push('\n');
        }
    }

    // Active instances
    if !summary.active_instances.is_empty() {
        let instances: Vec<&str> = summary
            .active_instances
            .iter()
            .take(5)
            .map(|s| {
                if s.len() > 12 {
                    &s[..12]
                } else {
                    s.as_str()
                }
            })
            .collect();
        context.push_str(&format!("\nActive instances: {}\n", instances.join(", ")));
    }

    // Recent logs
    if !recent_logs.is_empty() {
        context.push_str(&format!("\n## Last {} Logs\n", recent_logs.len()));
        context.push_str(&format_logs_compact(recent_logs));
        context.push('\n');
    }

    context
}

/// Build the system prompt for the AI
pub fn build_system_prompt() -> &'static str {
    r#"You are the Synthesys Logs Agent - a production observability assistant for the Synthesys backend.

## Tools

**get_logs** - Fetch logs from buffer
```json
{"count": 100}        // last N logs
{"minutes": 10}       // logs from last N minutes
```

**get_metrics** - Fetch system metrics
```json
{"type": "all"}       // cpu | memory | connections | all
```

## Behavior
- Analyze provided context first; only call tools when more data is needed
- Be concise and direct - respond in 2-4 sentences when possible
- For errors: identify cause, impact, and fix
- For patterns: note frequency and timeline
- For metrics: highlight anomalies and thresholds

Keep responses tight and actionable. The user is an engineer."#
}

/// Format tool results for inclusion in the conversation
pub fn format_tool_result(tool_name: &str, result: &str) -> String {
    format!("## Tool Result: {}\n{}", tool_name, result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(30), "30s");
        assert_eq!(format_duration(90), "1m30s");
        assert_eq!(format_duration(3661), "1h1m");
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(500), "500B");
        assert_eq!(format_bytes(1500), "1KB");
        assert_eq!(format_bytes(1_500_000), "1MB");
        assert_eq!(format_bytes(1_500_000_000), "1.4GB");
    }

    #[test]
    fn test_format_log_compact() {
        let log = TimestampedLog {
            timestamp: Utc::now(),
            raw: "test".to_string(),
            level: Some("INFO".to_string()),
            instance: Some("web-abc123".to_string()),
            region: Some("iad".to_string()),
            message: Some("Request completed".to_string()),
        };

        let formatted = format_log_compact(&log);
        assert!(formatted.contains("INFO"));
        assert!(formatted.contains("web-abc123"));
        assert!(formatted.contains("iad"));
        assert!(formatted.contains("Request completed"));
    }
}
