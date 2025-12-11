import type { LogCategory, ComponentType, ParsedLogMetadata } from "@/lib/types/ui"

// ============================================================================
// COMPONENT DATA - From Synthesys Backend
// ============================================================================

export const SERVICE_NAMES = [
  "AddressService",
  "AgentService",
  "AnalyticsService",
  "AudienceService",
  "BillingService",
  "BugReportService",
  "CampaignService",
  "CommerceAttributionService",
  "CommerceService",
  "ComplianceInquiryService",
  "ContactManagementService",
  "ConversationService",
  "DirectCallService",
  "FAQService",
  "FlowExecutor",
  "FlowService",
  "FollowUpService",
  "GHLOAuthService",
  "GoogleCalendarApiService",
  "GoogleCalendarOAuthService",
  "HealthCheckService",
  "JobService",
  "KnowledgeBaseService",
  "LogsService",
  "MonitoringService",
  "NodeExecutor",
  "OutboundCallService",
  "PhoneNumberService",
  "RecordingService",
  "RegulatoryComplianceService",
  "RegulatoryService",
  "ReportingService",
  "SMSService",
  "ScraperService",
  "StripeService",
  "TemplateInstantiationService",
  "ToolRegistryService",
  "TwilioAddressService",
  "TwilioBundleService",
  "TwilioClientService",
  "TwilioDocumentService",
  "TwilioSubaccountService",
  "UserService",
  "VapiAssistantService",
  "VapiCallMetricsService",
  "VoiceCloningService",
  "WalletService",
  "WebhookProcessingService",
  "WhatsAppService",
] as const

export const REPOSITORY_NAMES = [
  "AddressRepository",
  "AgentRepository",
  "AgentTagsFieldsRepository",
  "AudienceRepository",
  "AvailabilityRepository",
  "ComplianceInquiryRepository",
  "ConversationRepository",
  "CustomerRepository",
  "FollowUpRepository",
  "JobRepository",
  "MessageRepository",
  "RegulatoryBundleRepository",
  "RegulatoryRequirementRepository",
  "ReportRepository",
  "StorageRepository",
  "StorageService",
  "TaskRepository",
  "TwilioSubaccountRepository",
  "UserInvitationRepository",
  "UserRepository",
  "VoiceCloneRepository",
  "WhatsAppRepository",
] as const

export const CONTROLLER_NAMES = [
  "AddressController",
  "AgentConfigController",
  "AgentController",
  "AgentFaqsController",
  "AgentFollowUpsController",
  "AnalyticsController",
  "AssistantController",
  "AssistantFollowUpSequencesController",
  "AudienceController",
  "AuthController",
  "AvailabilityController",
  "BillingController",
  "BugReportController",
  "CRMFieldsController",
  "CallController",
  "CallRecordingController",
  "CampaignController",
  "ClerkWebhookController",
  "CommerceAttributionController",
  "CommerceController",
  "ComplianceInquiryController",
  "ContactListController",
  "ContactsController",
  "ConversationController",
  "FAQController",
  "FlowController",
  "FollowUpController",
  "FollowUpStepsController",
  "GHLMarketplaceController",
  "GHLWebhookController",
  "InboundConfigController",
  "KnowledgeBaseController",
  "LogsController",
  "OAuthController",
  "PaymentMethodController",
  "PhoneNumberController",
  "PromptController",
  "QueueController",
  "ReportController",
  "ShopifyWebhookController",
  "SmsWebhookController",
  "StorageController",
  "StripeWebhookController",
  "TransfersController",
  "TwilioPhoneController",
  "UserController",
  "VapiCalendarController",
  "VapiWebhookController",
  "VoiceCloningController",
  "WebhookFlowController",
  "WhatsAppIntegrationController",
  "WidgetController",
] as const

export const JOB_HANDLER_NAMES = [
  "AddressValidationPollingJobHandler",
  "AddressVerificationJobHandler",
  "AnalyticsJobHandler",
  "BillingCheckHandler",
  "BillingPhonePurchaseJobHandler",
  "BillingStripeWebhookJobHandler",
  "BillingUsageMeteringJobHandler",
  "BulkAddAudienceMembersHandler",
  "BulkAddTagsHandler",
  "BulkRemoveTagsHandler",
  "BundleTrackingJobHandler",
  "CSVContactImportJobHandler",
  "CalendarSyncJobHandler",
  "CampaignCallCompleteHandler",
  "CampaignCallInitiateHandler",
  "CampaignCallReconciliationHandler",
  "CampaignLaunchHandler",
  "CampaignRefundHandler",
  "CleanupJobHandler",
  "ConsistencyCheckHandler",
  "ConversationJobHandler",
  "DriftRemediationHandler",
  "DriftReportingHandler",
  "FileUploadJobHandler",
  "FlowNodeCompleteHandler",
  "FlowNodeExecuteHandler",
  "FlowStartHandler",
  "FollowUpJobHandler",
  "GHLWebhookJobHandler",
  "KBBulkUploadJobHandler",
  "KBDocumentUploadJobHandler",
  "KBQAUploadJobHandler",
  "KBQueryToolMigrationJobHandler",
  "KBUrlScrapeJobHandler",
  "PhoneAgentVoiceJobHandler",
  "PhoneNumberJobHandler",
  "PhoneSubscriptionJobHandler",
  "RefreshAudienceSizeHandler",
  "RegulatoryCheckJobHandler",
  "RegulatoryVerificationJobHandler",
  "ReportJobHandler",
  "ReservationCleanupHandler",
  "SmsIncomingHandler",
  "SmsJobHandler",
  "TestAIResponseHandler",
  "TranscriptionJobHandler",
  "TwilioBundleStatusHandler",
  "TwilioJobHandler",
  "VapiAnalyticsSyncHandler",
  "VoiceCloneJobHandler",
  "WalletAutoRechargeJobHandler",
  "WebhookEventCleanupHandler",
  "WebhookJobHandler",
  "WebhookTriggerHandler",
  "WhatsAppJobHandler",
] as const

export const MIDDLEWARE_NAMES = [
  "auth",
  "clerk",
  "connection-tracker",
  "ghl",
  "ghl-marketplace",
  "idempotency",
  "security",
  "slug-resolver",
  "twilio",
  "vapi",
  "verify-shopify-signature",
  "wallet",
] as const

export const JOB_TYPE_NAMES = [
  "agent_sync",
  "analytics_export",
  "analytics_generate",
  "analytics_process",
  "billing_check",
  "billing_stripe_webhook",
  "billing_usage_metering",
  "cleanup_files",
  "cleanup_logs",
  "cleanup_task",
  "cleanup_transcriptions",
  "conversation_archive",
  "conversation_create",
  "conversation_update",
  "csv_contact_import",
  "file_process",
  "file_upload",
  "follow_up_schedule",
  "generate_test_ai_response",
  "kb_bulk_upload",
  "kb_document_upload",
  "kb_qa_upload",
  "kb_url_scrape",
  "phone_agent_voice_link",
  "phone_agent_voice_unlink",
  "phone_number_bundle_tracking",
  "phone_number_import",
  "phone_number_provision",
  "phone_number_regulatory_check",
  "phone_number_regulatory_verification",
  "phone_number_release",
  "phone_number_sip_configure",
  "phone_number_sync",
  "phone_number_twilio_purchase",
  "phone_number_twilio_search",
  "phone_subscription",
  "report_generate",
  "report_schedule",
  "sms_send",
  "transcription_cleanup",
  "transcription_process",
  "vapi_analytics_sync",
  "voice_clone",
  "voice_clone_status",
  "webhook_call",
  "webhook_event_cleanup",
  "whatsapp_media_process",
  "whatsapp_send",
  "whatsapp_template",
  "whatsapp_webhook_process",
] as const

// Create Sets for O(1) lookup
const SERVICE_SET = new Set<string>(SERVICE_NAMES)
const REPOSITORY_SET = new Set<string>(REPOSITORY_NAMES)
const CONTROLLER_SET = new Set<string>(CONTROLLER_NAMES)
const JOB_HANDLER_SET = new Set<string>(JOB_HANDLER_NAMES)
const MIDDLEWARE_SET = new Set<string>(MIDDLEWARE_NAMES)
const JOB_TYPE_SET = new Set<string>(JOB_TYPE_NAMES)

// ============================================================================
// VALIDATION AND COMPONENT TYPE FUNCTIONS
// ============================================================================

/**
 * Check if a name is a valid/known component
 * Validates against known component lists AND common naming patterns
 */
export function isValidComponentName(name: string): boolean {
  if (!name || name.length === 0) return false

  // Check against all known component sets
  if (SERVICE_SET.has(name)) return true
  if (REPOSITORY_SET.has(name)) return true
  if (CONTROLLER_SET.has(name)) return true
  if (JOB_HANDLER_SET.has(name)) return true
  if (MIDDLEWARE_SET.has(name)) return true
  if (JOB_TYPE_SET.has(name)) return true

  // Check pattern matches (for components not in the lists but follow naming conventions)
  // Service patterns
  if (name.endsWith("Service") || name.endsWith("Executor")) return true
  // Repository patterns
  if (name.endsWith("Repository")) return true
  // Controller patterns
  if (name.endsWith("Controller")) return true
  // Handler patterns
  if (name.endsWith("Handler") || name.endsWith("JobHandler")) return true
  // Rate limiter
  if (name.startsWith("RateLimiter")) return true

  // Additional common patterns from production logs
  if (name.endsWith("Middleware")) return true
  if (name.endsWith("Utils")) return true
  if (name.endsWith("Router")) return true
  if (name.endsWith("Processor")) return true
  if (name.endsWith("Manager")) return true
  if (name.endsWith("Worker")) return true
  if (name.endsWith("Tracker")) return true
  if (name.endsWith("Client")) return true
  if (name.endsWith("Provider")) return true
  if (name.endsWith("Factory")) return true
  if (name.endsWith("Builder")) return true
  if (name.endsWith("Validator")) return true
  if (name.endsWith("Parser")) return true
  if (name.endsWith("Logger")) return true
  if (name.endsWith("Helper")) return true
  if (name.endsWith("Adapter")) return true
  if (name.endsWith("Gateway")) return true
  if (name.endsWith("Queue")) return true
  if (name.endsWith("Cache")) return true
  if (name.endsWith("Store")) return true

  return false
}

/**
 * Determine component type from name
 * Maps component names to their logical type for categorization
 */
export function getComponentType(name: string): ComponentType {
  // Check known sets first (highest priority)
  if (SERVICE_SET.has(name)) return "service"
  if (REPOSITORY_SET.has(name)) return "repository"
  if (CONTROLLER_SET.has(name)) return "controller"
  if (JOB_HANDLER_SET.has(name)) return "jobHandler"
  if (MIDDLEWARE_SET.has(name)) return "middleware"
  if (JOB_TYPE_SET.has(name)) return "jobType"

  // Pattern-based categorization for unlisted components
  // Service-like components
  if (name.endsWith("Service") || name.endsWith("Executor")) return "service"
  if (name.endsWith("Manager") || name.endsWith("Client") || name.endsWith("Provider")) return "service"
  if (name.endsWith("Factory") || name.endsWith("Builder") || name.endsWith("Adapter")) return "service"
  if (name.endsWith("Gateway") || name.endsWith("Cache") || name.endsWith("Logger")) return "service"
  if (name.endsWith("Utils") || name.endsWith("Helper")) return "service"

  // Repository-like components
  if (name.endsWith("Repository") || name.endsWith("Store")) return "repository"

  // Controller-like components
  if (name.endsWith("Controller") || name.endsWith("Router")) return "controller"

  // Job handler-like components
  if (name.endsWith("Handler") || name.endsWith("JobHandler")) return "jobHandler"
  if (name.endsWith("Worker") || name.endsWith("Processor")) return "jobHandler"
  if (name.endsWith("Queue")) return "jobHandler"

  // Middleware-like components
  if (name.endsWith("Middleware") || name.endsWith("Tracker")) return "middleware"
  if (name.endsWith("Validator") || name.endsWith("Parser")) return "middleware"

  return "unknown"
}

/**
 * Derive log category from component type
 * This uses the component name to determine category, not emojis
 */
export function getCategoryFromComponentType(componentType: ComponentType): LogCategory {
  switch (componentType) {
    case "service":
      return "service"
    case "repository":
      return "repository"
    case "controller":
      return "webhook" // Controllers handle HTTP/webhook requests
    case "jobHandler":
      return "analytics" // Job handlers process background analytics/tasks
    case "middleware":
      return "ratelimit" // Middleware includes rate limiting
    case "jobType":
      return "config" // Job types are configuration-like
    default:
      return "unknown"
  }
}

/**
 * Parse rate limiter info from bracket content like "RateLimiter:100/900000ms"
 */
function parseRateLimitInfo(content: string): { requests: number; windowMs: number } | undefined {
  const match = content.match(/RateLimiter:(\d+)\/(\d+)ms/)
  if (match) {
    return {
      requests: parseInt(match[1], 10),
      windowMs: parseInt(match[2], 10),
    }
  }
  return undefined
}

/**
 * Extract key-value pairs from message like "(key:value, key2:value2)"
 */
function parseKeyValues(message: string): Record<string, string> | undefined {
  const match = message.match(/\(([^)]+)\)\s*$/)
  if (!match) return undefined

  const pairs: Record<string, string> = {}
  const content = match[1]

  // Split by comma and parse each key:value
  const parts = content.split(/,\s*/)
  for (const part of parts) {
    const colonIndex = part.indexOf(":")
    if (colonIndex > 0) {
      const key = part.substring(0, colonIndex).trim()
      const value = part.substring(colonIndex + 1).trim()
      if (key && value) {
        pairs[key] = value
      }
    }
  }

  return Object.keys(pairs).length > 0 ? pairs : undefined
}

/**
 * Emoji to category mapping
 * These emojis appear at the start of log messages from the backend
 * Note: Some emojis have variation selectors (U+FE0F) that need to be handled
 */
const EMOJI_TO_CATEGORY: Record<string, LogCategory> = {
  "⚡": "service",
  "⚡️": "service", // with variation selector
  "💾": "repository",
  "🌐": "webhook",
  "📘": "ratelimit",
  "🔧": "config",
  "📊": "analytics",
}

/**
 * Detect category from emoji at start of message
 */
function getCategoryFromEmoji(message: string): LogCategory {
  // Check first few characters for emoji
  // Emojis can be 1-4 code units, so check the start of the string
  for (const [emoji, category] of Object.entries(EMOJI_TO_CATEGORY)) {
    if (message.startsWith(emoji)) {
      return category
    }
  }
  return "unknown"
}

/**
 * Main parser function - extracts all metadata from a log message
 * Category is detected from emoji prefix (most reliable)
 * Component type is derived from component name patterns
 */
export function parseLogMessage(message: string): ParsedLogMetadata {
  // Default result
  const result: ParsedLogMetadata = {
    category: "unknown",
    componentType: "unknown",
    componentName: "",
  }

  // Step 1: Detect category from emoji prefix (most reliable method)
  result.category = getCategoryFromEmoji(message)

  // Step 2: Extract bracket content [ComponentName] or [ComponentName:Operation]
  const bracketMatch = message.match(/\[([^\]]+)\]/)
  if (bracketMatch) {
    const bracketContent = bracketMatch[1]

    // Check for RateLimiter special format
    if (bracketContent.startsWith("RateLimiter")) {
      result.componentName = "RateLimiter"
      result.componentType = "middleware"
      // Override category if emoji didn't set it
      if (result.category === "unknown") {
        result.category = "ratelimit"
      }
      result.rateLimitInfo = parseRateLimitInfo(bracketContent)
    } else if (bracketContent.includes(":")) {
      // Format: [ServiceName:OperationName]
      const [name, operation] = bracketContent.split(":")
      const trimmedName = name.trim()

      // Only accept if it's a valid component name
      if (isValidComponentName(trimmedName)) {
        result.componentName = trimmedName
        result.operation = operation.trim()
        result.componentType = getComponentType(result.componentName)
        // Only use component-derived category as fallback if emoji didn't set it
        if (result.category === "unknown") {
          result.category = getCategoryFromComponentType(result.componentType)
        }
      }
    } else {
      // Format: [ComponentName]
      const trimmedName = bracketContent.trim()

      // Only accept if it's a valid component name
      if (isValidComponentName(trimmedName)) {
        result.componentName = trimmedName
        result.componentType = getComponentType(result.componentName)
        // Only use component-derived category as fallback if emoji didn't set it
        if (result.category === "unknown") {
          result.category = getCategoryFromComponentType(result.componentType)
        }
      }
    }
  }

  // Step 3: Extract key-value pairs
  result.keyValues = parseKeyValues(message)

  return result
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get human-readable label for log category
 */
export function getCategoryLabel(category: LogCategory): string {
  const labels: Record<LogCategory, string> = {
    service: "Service",
    repository: "Database",
    webhook: "Webhook",
    ratelimit: "Rate Limit",
    config: "Config",
    analytics: "Analytics",
    unknown: "Other",
  }
  return labels[category]
}

/**
 * Get emoji for category
 */
export function getCategoryEmoji(category: LogCategory): string {
  const emojis: Record<LogCategory, string> = {
    service: "⚡",
    repository: "💾",
    webhook: "🌐",
    ratelimit: "📘",
    config: "🔧",
    analytics: "📊",
    unknown: "📝",
  }
  return emojis[category]
}

/**
 * Get color classes for log category badge
 */
export function getCategoryColor(category: LogCategory): string {
  const colors: Record<LogCategory, string> = {
    service: "bg-yellow-100 text-yellow-800",
    repository: "bg-purple-100 text-purple-700",
    webhook: "bg-blue-100 text-blue-700",
    ratelimit: "bg-indigo-100 text-indigo-700",
    config: "bg-slate-100 text-slate-700",
    analytics: "bg-emerald-100 text-emerald-700",
    unknown: "bg-gray-100 text-gray-600",
  }
  return colors[category]
}

/**
 * Get human-readable label for component type
 */
export function getComponentTypeLabel(type: ComponentType): string {
  const labels: Record<ComponentType, string> = {
    service: "Service",
    repository: "Repository",
    controller: "Controller",
    jobHandler: "Job Handler",
    middleware: "Middleware",
    jobType: "Job Type",
    unknown: "Unknown",
  }
  return labels[type]
}

/**
 * Get color classes for component type badge
 */
export function getComponentTypeColor(type: ComponentType): string {
  const colors: Record<ComponentType, string> = {
    service: "bg-yellow-100 text-yellow-800",
    repository: "bg-purple-100 text-purple-700",
    controller: "bg-blue-100 text-blue-700",
    jobHandler: "bg-orange-100 text-orange-700",
    middleware: "bg-cyan-100 text-cyan-700",
    jobType: "bg-pink-100 text-pink-700",
    unknown: "bg-gray-100 text-gray-600",
  }
  return colors[type]
}

/**
 * Shorten component name for display (e.g., "AgentService" -> "Agent")
 */
export function shortenComponentName(name: string): string {
  if (!name) return ""

  // Remove common suffixes
  return name
    .replace(/Service$/, "")
    .replace(/Repository$/, "")
    .replace(/Controller$/, "")
    .replace(/JobHandler$/, "")
    .replace(/Handler$/, "")
}

// ============================================================================
// ALL COMPONENT NAMES (for dropdowns)
// ============================================================================

export const ALL_COMPONENT_NAMES = [
  ...SERVICE_NAMES,
  ...REPOSITORY_NAMES,
  ...CONTROLLER_NAMES,
  ...JOB_HANDLER_NAMES,
  ...MIDDLEWARE_NAMES,
  ...JOB_TYPE_NAMES,
] as const

export const ALL_CATEGORIES: LogCategory[] = [
  "service",
  "repository",
  "webhook",
  "ratelimit",
  "config",
  "analytics",
  "unknown",
]
