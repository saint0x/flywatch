use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub fly_prod_app_name: String,
    pub auth_token: Option<String>,
    pub nats_url: String,
    pub nats_user: String,
    pub nats_password: String,
    pub host: String,
    pub port: u16,

    // OpenRouter configuration
    pub openrouter_api_key: Option<String>,
    pub openrouter_model: String,

    // Log buffer configuration
    pub log_buffer_max_entries: usize,
    pub log_buffer_max_age_minutes: i64,

    // Persistence configuration
    pub store_path: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        let fly_prod_app_name = env::var("FLY_PROD_APP_NAME")
            .expect("FLY_PROD_APP_NAME must be set");

        let auth_token = env::var("AUTH_TOKEN").ok().filter(|s| !s.is_empty());

        // Fly.io internal NATS is available at this address within 6PN
        let nats_url = env::var("NATS_URL")
            .unwrap_or_else(|_| "[fdaa::3]:4223".to_string());

        // NATS authentication - org slug as user, fly token as password
        let nats_user = env::var("ORG_SLUG")
            .expect("ORG_SLUG must be set (your Fly organization slug)");
        let nats_password = env::var("ACCESS_TOKEN")
            .expect("ACCESS_TOKEN must be set (output of 'fly auth token')");

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("PORT must be a valid number");

        // OpenRouter configuration
        let openrouter_api_key = env::var("OPENROUTER_API_KEY")
            .ok()
            .filter(|s| !s.is_empty());
        let openrouter_model = env::var("OPENROUTER_MODEL")
            .unwrap_or_else(|_| "moonshotai/kimi-k2".to_string());

        // Log buffer configuration
        let log_buffer_max_entries = env::var("LOG_BUFFER_MAX_ENTRIES")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10_000);
        let log_buffer_max_age_minutes = env::var("LOG_BUFFER_MAX_AGE_MINUTES")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(30);

        // Persistence configuration
        let store_path = env::var("STORE_PATH")
            .ok()
            .filter(|s| !s.is_empty());

        Self {
            fly_prod_app_name,
            auth_token,
            nats_url,
            nats_user,
            nats_password,
            host,
            port,
            openrouter_api_key,
            openrouter_model,
            log_buffer_max_entries,
            log_buffer_max_age_minutes,
            store_path,
        }
    }

    pub fn nats_subject(&self) -> String {
        format!("logs.{}.>", self.fly_prod_app_name)
    }

    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
