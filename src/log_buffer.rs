use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::RwLock;

/// A timestamped log entry with parsed metadata
#[derive(Debug, Clone, Serialize)]
pub struct TimestampedLog {
    pub timestamp: DateTime<Utc>,
    pub raw: String,
    pub level: Option<String>,
    pub instance: Option<String>,
    pub region: Option<String>,
    pub message: Option<String>,
}

impl TimestampedLog {
    pub fn new(raw: String) -> Self {
        let (level, instance, region, message) = Self::parse_log(&raw);
        Self {
            timestamp: Utc::now(),
            raw,
            level,
            instance,
            region,
            message,
        }
    }

    /// Parse Fly.io log JSON to extract useful fields
    fn parse_log(raw: &str) -> (Option<String>, Option<String>, Option<String>, Option<String>) {
        #[derive(Deserialize)]
        struct FlyLog {
            log: Option<LogLevel>,
            fly: Option<FlyMeta>,
            message: Option<String>,
        }

        #[derive(Deserialize)]
        struct LogLevel {
            level: Option<String>,
        }

        #[derive(Deserialize)]
        struct FlyMeta {
            app: Option<AppMeta>,
            region: Option<String>,
        }

        #[derive(Deserialize)]
        struct AppMeta {
            instance: Option<String>,
        }

        match serde_json::from_str::<FlyLog>(raw) {
            Ok(parsed) => {
                let level = parsed.log.and_then(|l| l.level);
                let (instance, region) = parsed.fly.map_or((None, None), |f| {
                    (f.app.and_then(|a| a.instance), f.region)
                });
                (level, instance, region, parsed.message)
            }
            Err(_) => (None, None, None, None),
        }
    }

    /// Check if this is an error log
    pub fn is_error(&self) -> bool {
        self.level
            .as_ref()
            .map(|l| l.eq_ignore_ascii_case("error") || l.eq_ignore_ascii_case("err"))
            .unwrap_or(false)
    }

    /// Check if this is a warning log
    pub fn is_warning(&self) -> bool {
        self.level
            .as_ref()
            .map(|l| l.eq_ignore_ascii_case("warn") || l.eq_ignore_ascii_case("warning"))
            .unwrap_or(false)
    }
}

/// Configuration for the log buffer
#[derive(Debug, Clone)]
pub struct LogBufferConfig {
    pub max_entries: usize,
    pub max_age_minutes: i64,
}

impl Default for LogBufferConfig {
    fn default() -> Self {
        Self {
            max_entries: 10_000,
            max_age_minutes: 30,
        }
    }
}

/// Summary of buffered logs for initial context
#[derive(Debug, Clone, Serialize)]
pub struct LogSummary {
    pub total_count: usize,
    pub oldest_timestamp: Option<DateTime<Utc>>,
    pub newest_timestamp: Option<DateTime<Utc>>,
    pub error_count: usize,
    pub warn_count: usize,
    pub recent_errors: Vec<String>,
    pub active_instances: Vec<String>,
}

/// Buffer statistics
#[derive(Debug, Clone, Serialize)]
pub struct LogBufferStats {
    pub count: usize,
    pub oldest_timestamp: Option<DateTime<Utc>>,
    pub newest_timestamp: Option<DateTime<Utc>>,
    pub max_entries: usize,
    pub max_age_minutes: i64,
}

/// Thread-safe rolling log buffer
pub struct LogBuffer {
    config: LogBufferConfig,
    logs: RwLock<VecDeque<TimestampedLog>>,
}

impl LogBuffer {
    pub fn new(config: LogBufferConfig) -> Arc<Self> {
        let capacity = config.max_entries;
        Arc::new(Self {
            config,
            logs: RwLock::new(VecDeque::with_capacity(capacity)),
        })
    }

    /// Push a new log entry, pruning old entries if necessary
    pub async fn push(&self, raw: String) {
        let entry = TimestampedLog::new(raw);
        let mut logs = self.logs.write().await;

        logs.push_back(entry);

        // Prune by count
        while logs.len() > self.config.max_entries {
            logs.pop_front();
        }

        // Prune by age
        let cutoff = Utc::now() - Duration::minutes(self.config.max_age_minutes);
        while let Some(front) = logs.front() {
            if front.timestamp < cutoff {
                logs.pop_front();
            } else {
                break;
            }
        }
    }

    /// Get the last N log entries
    pub async fn get_last_n(&self, n: usize) -> Vec<TimestampedLog> {
        let logs = self.logs.read().await;
        logs.iter()
            .rev()
            .take(n)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }

    /// Get logs from the last X minutes
    pub async fn get_last_minutes(&self, minutes: i64) -> Vec<TimestampedLog> {
        let cutoff = Utc::now() - Duration::minutes(minutes);
        let logs = self.logs.read().await;
        logs.iter()
            .filter(|log| log.timestamp >= cutoff)
            .cloned()
            .collect()
    }

    /// Get logs within a specific time range
    pub async fn get_time_range(
        &self,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> Vec<TimestampedLog> {
        let logs = self.logs.read().await;
        logs.iter()
            .filter(|log| log.timestamp >= start && log.timestamp <= end)
            .cloned()
            .collect()
    }

    /// Get a summary of the buffer for initial AI context
    pub async fn get_summary(&self) -> LogSummary {
        let logs = self.logs.read().await;

        let total_count = logs.len();
        let oldest_timestamp = logs.front().map(|l| l.timestamp);
        let newest_timestamp = logs.back().map(|l| l.timestamp);

        let mut error_count = 0;
        let mut warn_count = 0;
        let mut recent_errors: Vec<String> = Vec::new();
        let mut instances: std::collections::HashSet<String> = std::collections::HashSet::new();

        for log in logs.iter() {
            if log.is_error() {
                error_count += 1;
                if recent_errors.len() < 5 {
                    if let Some(msg) = &log.message {
                        recent_errors.push(format!(
                            "[{}] {}",
                            log.timestamp.format("%H:%M:%S"),
                            msg
                        ));
                    }
                }
            } else if log.is_warning() {
                warn_count += 1;
            }

            if let Some(instance) = &log.instance {
                instances.insert(instance.clone());
            }
        }

        // Get most recent errors (reverse to show newest first)
        recent_errors.reverse();
        recent_errors.truncate(5);

        LogSummary {
            total_count,
            oldest_timestamp,
            newest_timestamp,
            error_count,
            warn_count,
            recent_errors,
            active_instances: instances.into_iter().collect(),
        }
    }

    /// Get buffer statistics
    pub async fn stats(&self) -> LogBufferStats {
        let logs = self.logs.read().await;
        LogBufferStats {
            count: logs.len(),
            oldest_timestamp: logs.front().map(|l| l.timestamp),
            newest_timestamp: logs.back().map(|l| l.timestamp),
            max_entries: self.config.max_entries,
            max_age_minutes: self.config.max_age_minutes,
        }
    }
}
