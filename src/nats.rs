use async_nats::{Client, ConnectOptions, ServerAddr};
use futures::StreamExt;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::metrics::Metrics;

#[derive(Debug, Clone)]
pub struct LogMessage {
    pub raw: String,
}

pub struct NatsSubscriber {
    config: Arc<Config>,
    metrics: Arc<Metrics>,
    tx: broadcast::Sender<LogMessage>,
}

impl NatsSubscriber {
    pub fn new(
        config: Arc<Config>,
        metrics: Arc<Metrics>,
        tx: broadcast::Sender<LogMessage>,
    ) -> Self {
        Self { config, metrics, tx }
    }

    pub async fn connect(&self) -> Result<Client, async_nats::ConnectError> {
        let addr: ServerAddr = format!("nats://{}", self.config.nats_url)
            .parse()
            .expect("Invalid NATS URL");

        let options = ConnectOptions::new()
            .user_and_password(
                self.config.nats_user.clone(),
                self.config.nats_password.clone(),
            )
            .retry_on_initial_connect()
            .connection_timeout(std::time::Duration::from_secs(10))
            .reconnect_delay_callback(|attempts| {
                std::time::Duration::from_millis(std::cmp::min(
                    (attempts * 100) as u64,
                    5000,
                ))
            });

        info!(
            url = %self.config.nats_url,
            user = %self.config.nats_user,
            "Connecting to NATS with authentication"
        );
        let client = options.connect(addr).await?;
        info!("Connected to NATS successfully");
        self.metrics.set_nats_connected(true);

        Ok(client)
    }

    pub async fn run(&self) {
        loop {
            match self.connect().await {
                Ok(client) => {
                    if let Err(e) = self.subscribe_loop(&client).await {
                        error!(error = %e, "Subscription loop error");
                        self.metrics.increment_subscription_errors();
                    }
                    self.metrics.set_nats_connected(false);
                }
                Err(e) => {
                    error!(error = %e, "Failed to connect to NATS");
                    self.metrics.set_nats_connected(false);
                    self.metrics.increment_subscription_errors();
                }
            }

            warn!("NATS connection lost, reconnecting in 5 seconds...");
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
    }

    async fn subscribe_loop(&self, client: &Client) -> Result<(), async_nats::Error> {
        let subject = self.config.nats_subject();
        info!(subject = %subject, "Subscribing to NATS subject");

        let mut subscriber = client.subscribe(subject.clone()).await?;
        info!(subject = %subject, "Successfully subscribed");

        while let Some(message) = subscriber.next().await {
            let raw = String::from_utf8_lossy(&message.payload).to_string();
            let log_msg = LogMessage { raw };

            self.metrics.increment_messages_forwarded();
            let _ = self.tx.send(log_msg);
        }

        Ok(())
    }
}
