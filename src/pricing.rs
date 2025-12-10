use serde::Serialize;

/// Pricing per million tokens for different models
#[derive(Debug, Clone)]
pub struct ModelPricing {
    pub input_per_million: f64,
    pub output_per_million: f64,
}

impl ModelPricing {
    /// Get pricing for a model by name
    pub fn for_model(model: &str) -> Self {
        match model {
            // Moonshot Kimi K2
            "moonshotai/kimi-k2" => Self {
                input_per_million: 0.456,
                output_per_million: 1.84,
            },
            // Anthropic Claude models
            "anthropic/claude-3.5-sonnet" | "anthropic/claude-3-5-sonnet-20241022" => Self {
                input_per_million: 3.0,
                output_per_million: 15.0,
            },
            "anthropic/claude-3-haiku" | "anthropic/claude-3-haiku-20240307" => Self {
                input_per_million: 0.25,
                output_per_million: 1.25,
            },
            "anthropic/claude-3-opus" | "anthropic/claude-3-opus-20240229" => Self {
                input_per_million: 15.0,
                output_per_million: 75.0,
            },
            // OpenAI GPT-4 models
            "openai/gpt-4-turbo" | "openai/gpt-4-turbo-preview" => Self {
                input_per_million: 10.0,
                output_per_million: 30.0,
            },
            "openai/gpt-4o" => Self {
                input_per_million: 2.5,
                output_per_million: 10.0,
            },
            "openai/gpt-4o-mini" => Self {
                input_per_million: 0.15,
                output_per_million: 0.6,
            },
            // Default fallback (use Kimi K2 pricing as baseline)
            _ => Self {
                input_per_million: 0.456,
                output_per_million: 1.84,
            },
        }
    }

    /// Calculate cost for token usage
    pub fn calculate_cost(&self, prompt_tokens: u32, completion_tokens: u32) -> CostBreakdown {
        let input_cost = (prompt_tokens as f64 / 1_000_000.0) * self.input_per_million;
        let output_cost = (completion_tokens as f64 / 1_000_000.0) * self.output_per_million;
        let total_cost = input_cost + output_cost;

        CostBreakdown {
            input_tokens: prompt_tokens,
            output_tokens: completion_tokens,
            total_tokens: prompt_tokens + completion_tokens,
            input_cost_usd: input_cost,
            output_cost_usd: output_cost,
            total_cost_usd: total_cost,
            model_input_price_per_million: self.input_per_million,
            model_output_price_per_million: self.output_per_million,
        }
    }
}

/// Detailed cost breakdown for a request
#[derive(Debug, Clone, Serialize)]
pub struct CostBreakdown {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
    pub input_cost_usd: f64,
    pub output_cost_usd: f64,
    pub total_cost_usd: f64,
    pub model_input_price_per_million: f64,
    pub model_output_price_per_million: f64,
}

impl CostBreakdown {
    /// Format cost as a human-readable string
    pub fn format_cost(&self) -> String {
        if self.total_cost_usd < 0.01 {
            format!("${:.6}", self.total_cost_usd)
        } else {
            format!("${:.4}", self.total_cost_usd)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kimi_k2_pricing() {
        let pricing = ModelPricing::for_model("moonshotai/kimi-k2");
        let cost = pricing.calculate_cost(1000, 500);

        // 1000 input tokens at $0.456/M = $0.000456
        // 500 output tokens at $1.84/M = $0.00092
        // Total = $0.001376
        assert!((cost.total_cost_usd - 0.001376).abs() < 0.0001);
    }

    #[test]
    fn test_unknown_model_uses_default() {
        let pricing = ModelPricing::for_model("unknown/model");
        assert_eq!(pricing.input_per_million, 0.456);
        assert_eq!(pricing.output_per_million, 1.84);
    }
}
