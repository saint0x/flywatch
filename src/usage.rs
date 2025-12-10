use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use stoar::Store;
use tokio::sync::RwLock;
use tracing::{error, info};

use crate::pricing::CostBreakdown;

const USAGE_COLLECTION: &str = "ai_usage";

/// A single AI chat usage record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub model: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
    pub cost_usd: f64,
    pub processing_time_ms: u64,
    pub tools_called: Vec<String>,
}

/// Aggregated usage statistics
#[derive(Debug, Clone, Serialize)]
pub struct UsageStats {
    pub total_requests: u64,
    pub total_tokens: u64,
    pub total_prompt_tokens: u64,
    pub total_completion_tokens: u64,
    pub total_cost_usd: f64,
    pub average_processing_time_ms: f64,
    pub requests_with_tools: u64,
    pub period_start: Option<DateTime<Utc>>,
    pub period_end: Option<DateTime<Utc>>,
}

impl Default for UsageStats {
    fn default() -> Self {
        Self {
            total_requests: 0,
            total_tokens: 0,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            total_cost_usd: 0.0,
            average_processing_time_ms: 0.0,
            requests_with_tools: 0,
            period_start: None,
            period_end: None,
        }
    }
}

/// Usage tracker with persistent storage
pub struct UsageTracker {
    store: Arc<RwLock<Option<Store>>>,
}

impl UsageTracker {
    /// Create a new usage tracker with optional persistence
    pub fn new(store_path: Option<&str>) -> Self {
        let store = store_path.and_then(|path| {
            match Store::open(path) {
                Ok(s) => {
                    info!(path = %path, "Usage tracking persistence enabled");
                    Some(s)
                }
                Err(e) => {
                    error!(error = %e, path = %path, "Failed to open usage store, running without persistence");
                    None
                }
            }
        });

        Self {
            store: Arc::new(RwLock::new(store)),
        }
    }

    /// Record a new AI chat usage
    pub async fn record(
        &self,
        model: &str,
        cost: &CostBreakdown,
        processing_time_ms: u64,
        tools_called: &[String],
    ) {
        let record = UsageRecord {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            model: model.to_string(),
            prompt_tokens: cost.input_tokens,
            completion_tokens: cost.output_tokens,
            total_tokens: cost.total_tokens,
            cost_usd: cost.total_cost_usd,
            processing_time_ms,
            tools_called: tools_called.to_vec(),
        };

        let store_guard = self.store.read().await;
        if let Some(store) = store_guard.as_ref() {
            if let Err(e) = store.put(USAGE_COLLECTION, &record.id, &record) {
                error!(error = %e, "Failed to persist usage record");
            }
        }
    }

    /// Get aggregated usage statistics
    pub async fn get_stats(&self) -> UsageStats {
        let store_guard = self.store.read().await;

        let Some(store) = store_guard.as_ref() else {
            return UsageStats::default();
        };

        let records: Vec<UsageRecord> = match store.all(USAGE_COLLECTION) {
            Ok(r) => r,
            Err(e) => {
                error!(error = %e, "Failed to fetch usage records");
                return UsageStats::default();
            }
        };

        if records.is_empty() {
            return UsageStats::default();
        }

        let total_requests = records.len() as u64;
        let total_tokens: u64 = records.iter().map(|r| r.total_tokens as u64).sum();
        let total_prompt_tokens: u64 = records.iter().map(|r| r.prompt_tokens as u64).sum();
        let total_completion_tokens: u64 = records.iter().map(|r| r.completion_tokens as u64).sum();
        let total_cost_usd: f64 = records.iter().map(|r| r.cost_usd).sum();
        let total_processing_time: u64 = records.iter().map(|r| r.processing_time_ms).sum();
        let requests_with_tools = records.iter().filter(|r| !r.tools_called.is_empty()).count() as u64;

        let period_start = records.iter().map(|r| r.timestamp).min();
        let period_end = records.iter().map(|r| r.timestamp).max();

        UsageStats {
            total_requests,
            total_tokens,
            total_prompt_tokens,
            total_completion_tokens,
            total_cost_usd,
            average_processing_time_ms: total_processing_time as f64 / total_requests as f64,
            requests_with_tools,
            period_start,
            period_end,
        }
    }

    /// Get recent usage records (last N)
    pub async fn get_recent(&self, limit: usize) -> Vec<UsageRecord> {
        let store_guard = self.store.read().await;

        let Some(store) = store_guard.as_ref() else {
            return Vec::new();
        };

        let mut records: Vec<UsageRecord> = match store.all(USAGE_COLLECTION) {
            Ok(r) => r,
            Err(e) => {
                error!(error = %e, "Failed to fetch usage records");
                return Vec::new();
            }
        };

        // Sort by timestamp descending and take limit
        records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        records.truncate(limit);
        records
    }
}
