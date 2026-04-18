import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  real,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  boolean,
  serial,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  name: text("name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  companyId: varchar("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // "active", "trialing", "past_due", "canceled", "incomplete"
  subscriptionTier: text("subscription_tier"), // "starter", "professional", "enterprise"
  trialEndsAt: timestamp("trial_ends_at"),
  onboardingComplete: integer("onboarding_complete").default(0), // 0 = needs onboarding, 1 = complete
  // ── Email/password auth fields (null for pure SSO users) ─────────────────
  passwordHash: text("password_hash"),
  username: text("username").unique(),
  role: text("role").default("viewer"), // viewer | analyst | operator | admin
  googleId: text("google_id").unique(),
  // ── Login security (lockout + device tracking) ────────────────────────────
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginIp: text("last_login_ip"),
  lastLoginDevice: text("last_login_device"),
  // ── Onboarding profile fields ─────────────────────────────────────────────
  jobTitle: text("job_title"),
  phone: text("phone"),
  department: text("department"),
  selectedPlanId: text("selected_plan_id"),
  selectedBillingInterval: text("selected_billing_interval"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team Invitations - for inviting new team members
export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    roleId: varchar("role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    invitedBy: varchar("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending", "accepted", "expired", "cancelled"
    token: varchar("token").notNull().unique(), // Unique invitation token
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("team_invitations_company_idx").on(table.companyId),
    index("team_invitations_email_idx").on(table.email),
    index("team_invitations_token_idx").on(table.token),
  ],
);

// RBAC - Permission definitions (system-wide)
export const permissions = pgTable("permissions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "view_forecast", "edit_procurement"
  description: text("description"),
  category: text("category"), // "forecasting", "procurement", "administration", etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// RBAC - Roles (company-scoped)
export const roles = pgTable(
  "roles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "Executive", "Procurement Manager", etc.
    description: text("description"),
    isDefault: integer("is_default").default(0), // System default roles (cannot be deleted)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("roles_company_idx").on(table.companyId),
    uniqueIndex("roles_company_name_unique").on(table.companyId, table.name),
  ],
);

// RBAC - Role-Permission mappings
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: varchar("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: varchar("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

// RBAC - User-Role assignments (users can have multiple roles)
export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: varchar("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    assignedBy: varchar("assigned_by").references(() => users.id), // Who assigned this role
    assignedAt: timestamp("assigned_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_role_assignments_user_idx").on(table.userId),
    index("user_role_assignments_company_idx").on(table.companyId),
  ],
);

export const companies = pgTable("companies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  // Company Profile
  industry: text("industry"),
  location: text("location"),
  companySize: text("company_size"), // "small", "medium", "large", "enterprise"
  timezone: text("timezone").default("America/New_York"),
  // ── Onboarding operations intelligence ────────────────────────────────────
  website: text("website"),
  annualRevenue: text("annual_revenue"),
  productionVolume: text("production_volume"),
  annualProcurementSpend: text("annual_procurement_spend"),
  keyMaterials: text("key_materials"), // JSON array
  erpSystemUsed: text("erp_system_used"),
  painPoints: text("pain_points"), // JSON array
  numberOfSuppliers: text("number_of_suppliers"),
  numberOfFacilities: text("number_of_facilities"),
  topProducts: text("top_products"),
  // Budget Configuration
  annualBudget: real("annual_budget"),
  currentBudgetSpent: real("current_budget_spent").default(0),
  budgetPeriod: text("budget_period"), // "monthly", "quarterly", "annual", "custom"
  budgetStartDate: timestamp("budget_start_date"),
  budgetEndDate: timestamp("budget_end_date"),
  budgetResetDate: timestamp("budget_reset_date"),
  // Economic Policy Preferences
  fdrThresholdLow: real("fdr_threshold_low").default(0.5),
  fdrThresholdMid: real("fdr_threshold_mid").default(1.0),
  fdrThresholdHigh: real("fdr_threshold_high").default(1.5),
  defaultProcurementPolicy: text("default_procurement_policy"), // "conservative", "balanced", "aggressive"
  // Alert & Notification Preferences
  alertEmail: text("alert_email"),
  enableRegimeAlerts: integer("enable_regime_alerts").default(1), // 1 = enabled, 0 = disabled
  enableBudgetAlerts: integer("enable_budget_alerts").default(1),
  budgetAlertThreshold: real("budget_alert_threshold").default(0.8), // Alert when 80% budget spent
  enableAllocationAlerts: integer("enable_allocation_alerts").default(1),
  enablePriceAlerts: integer("enable_price_alerts").default(1),
  // Email Processing & Forwarding Settings
  emailForwardingEnabled: integer("email_forwarding_enabled").default(0), // 1 = enabled
  emailForwardingAddress: text("email_forwarding_address"), // Unique email address for this company to forward emails to
  emailProcessingConsent: integer("email_processing_consent").default(0), // User consent to process emails
  emailRetentionDays: integer("email_retention_days").default(90), // How long to keep emails
  emailAutoTagging: integer("email_auto_tagging").default(1), // Auto-tag emails with NLP
  // AI & Chatbot Settings (Future-proofing)
  aiChatbotEnabled: integer("ai_chatbot_enabled").default(1),
  aiDataAccessConsent: integer("ai_data_access_consent").default(0), // Consent for AI to access company data
  aiCanAccessFinancials: integer("ai_can_access_financials").default(0),
  aiCanAccessSupplierData: integer("ai_can_access_supplier_data").default(0),
  aiCanAccessAllocations: integer("ai_can_access_allocations").default(1),
  aiCanAccessEmails: integer("ai_can_access_emails").default(0),
  // Integration & API Settings
  apiAccessEnabled: integer("api_access_enabled").default(0),
  apiKey: text("api_key"), // Company's API key for programmatic access
  webhookUrl: text("webhook_url"), // Webhook URL for real-time notifications
  webhookEvents: text("webhook_events"), // JSON array of events to send to webhook
  // Data & Privacy Settings
  dataRetentionPolicy: text("data_retention_policy").default("standard"), // "minimal", "standard", "extended", "permanent"
  anonymizeOldData: integer("anonymize_old_data").default(0), // Auto-anonymize data older than retention period
  exportDataFormat: text("export_data_format").default("json"), // "json", "csv", "excel"
  // Integration Settings - Slack
  slackWebhookUrl: text("slack_webhook_url"),
  slackDefaultChannel: text("slack_default_channel").default(
    "#prescient-alerts",
  ),
  slackEnabled: integer("slack_enabled").default(0),
  // Integration Settings - Twilio
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioPhoneNumber: text("twilio_phone_number"),
  twilioEnabled: integer("twilio_enabled").default(0),
  twilioAlertPhone: text("twilio_alert_phone"),
  // Integration Settings - HubSpot
  hubspotAccessToken: text("hubspot_access_token"),
  hubspotRefreshToken: text("hubspot_refresh_token"),
  hubspotEnabled: integer("hubspot_enabled").default(0),
  // Integration Settings - Microsoft Teams
  teamsWebhookUrl: text("teams_webhook_url"),
  teamsChannelName: text("teams_channel_name").default("Prescient Alerts"),
  teamsEnabled: integer("teams_enabled").default(0),
  // Integration Settings - Shopify
  shopifyDomain: text("shopify_domain"),
  shopifyApiKey: text("shopify_api_key"),
  shopifySecret: text("shopify_secret"),
  shopifySyncOrders: integer("shopify_sync_orders").default(0),
  shopifySyncProducts: integer("shopify_sync_products").default(0),
  shopifySyncInventory: integer("shopify_sync_inventory").default(0),
  shopifyEnabled: integer("shopify_enabled").default(0),
  // Integration Settings - Google Sheets
  googleSheetsEnabled: integer("google_sheets_enabled").default(0),
  googleSheetsSpreadsheetId: text("google_sheets_spreadsheet_id"),
  googleSheetsAutoExport: integer("google_sheets_auto_export").default(0),
  // Integration Settings - Google Calendar
  googleCalendarEnabled: integer("google_calendar_enabled").default(0),
  googleCalendarId: text("google_calendar_id"),
  googleCalendarSyncMeetings: integer("google_calendar_sync_meetings").default(
    0,
  ),
  // Integration Settings - Notion
  notionEnabled: integer("notion_enabled").default(0),
  notionAccessToken: text("notion_access_token"),
  notionWorkspaceId: text("notion_workspace_id"),
  notionDatabaseId: text("notion_database_id"),
  // Integration Settings - Salesforce
  salesforceEnabled: integer("salesforce_enabled").default(0),
  salesforceAccessToken: text("salesforce_access_token"),
  salesforceRefreshToken: text("salesforce_refresh_token"),
  salesforceInstanceUrl: text("salesforce_instance_url"),
  // Integration Settings - Jira
  jiraEnabled: integer("jira_enabled").default(0),
  jiraApiToken: text("jira_api_token"),
  jiraDomain: text("jira_domain"),
  jiraProjectKey: text("jira_project_key"),
  // Integration Settings - Linear
  linearEnabled: integer("linear_enabled").default(0),
  linearApiKey: text("linear_api_key"),
  linearTeamId: text("linear_team_id"),
  // Company Branding
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3b82f6"), // Hex color for branding
  // Billing & Metering
  verifiedSavingsTotalCents: integer("verified_savings_total_cents").default(0), // YTD verified savings (for Performance plan)
  // Onboarding & Feature Flags
  onboardingCompleted: integer("onboarding_completed").default(0),
  showOnboardingHints: integer("show_onboarding_hints").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Integration Credentials - Centralized encrypted credential storage
export const integrationCredentials = pgTable(
  "integration_credentials",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(), // e.g., "salesforce", "google-sheets", "xero"
    integrationName: text("integration_name").notNull(), // Human-readable name
    credentialType: text("credential_type").notNull(), // "oauth2", "api_key", "basic_auth", "token"
    // Encrypted credentials stored as JSON string
    encryptedCredentials: text("encrypted_credentials").notNull(),
    // OAuth-specific fields
    accessToken: text("access_token"), // Encrypted
    refreshToken: text("refresh_token"), // Encrypted
    tokenExpiresAt: timestamp("token_expires_at"),
    tokenRefreshedAt: timestamp("token_refreshed_at"),
    // OAuth scopes and configuration
    scopes: text("scopes"), // JSON array of granted scopes
    instanceUrl: text("instance_url"), // For Salesforce, NetSuite, etc.
    tenantId: text("tenant_id"), // For multi-tenant APIs like Xero
    accountId: text("account_id"), // External account identifier
    // Status and metadata
    status: text("status").notNull().default("active"), // "active", "expired", "revoked", "error"
    lastUsedAt: timestamp("last_used_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    connectionTestPassed: integer("connection_test_passed").default(0),
    // Audit fields
    createdBy: varchar("created_by").references(() => users.id),
    updatedBy: varchar("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("integration_credentials_company_idx").on(table.companyId),
    index("integration_credentials_integration_idx").on(table.integrationId),
    uniqueIndex("integration_credentials_company_integration_unique").on(
      table.companyId,
      table.integrationId
    ),
  ]
);

export const insertIntegrationCredentialSchema = createInsertSchema(integrationCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIntegrationCredential = z.infer<typeof insertIntegrationCredentialSchema>;
export type IntegrationCredential = typeof integrationCredentials.$inferSelect;

// Company Locations (warehouses, factories, offices)
export const companyLocations = pgTable(
  "company_locations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    locationType: text("location_type").notNull(), // "warehouse", "factory", "office", "distribution_center", "retail"
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    city: text("city").notNull(),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("United States"),
    isPrimary: integer("is_primary").default(0), // 1 = primary location
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    squareFootage: real("square_footage"),
    capacity: real("capacity"), // Storage capacity in units
    operationalStatus: text("operational_status").default("active"), // "active", "inactive", "under_construction"
    timezone: text("timezone"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("company_locations_company_idx").on(table.companyId),
    index("company_locations_type_idx").on(table.locationType),
  ],
);

export const economicSnapshots = pgTable(
  "economic_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(), // Raw regime classification from FDR
    confirmedRegime: text("confirmed_regime"), // Persistence-filtered regime (after hysteresis/duration/confirmation)
    gdpReal: real("gdp_real"),
    gdpNominal: real("gdp_nominal"),
    sp500Index: real("sp500_index"),
    inflationRate: real("inflation_rate"),
    sentimentScore: real("sentiment_score"),
    source: text("source").notNull().default("fallback"), // 'external' or 'fallback'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("economic_snapshots_company_timestamp_idx").on(
      table.companyId,
      table.timestamp,
    ),
  ],
);

// Regime State Tracking - Persistence enforcement for regime transitions
// Tracks confirmed regime, tentative transitions, and confirmation counts per company
export const regimeState = pgTable(
  "regime_state",
  {
    companyId: varchar("company_id")
      .primaryKey()
      .references(() => companies.id, { onDelete: "cascade" }),
    confirmedRegime: text("confirmed_regime").notNull().default("HEALTHY_EXPANSION"),
    previousRegime: text("previous_regime"), // Tracks prior regime for 2x reversion penalty
    tentativeRegime: text("tentative_regime"),
    lastConfirmedAt: timestamp("last_confirmed_at").notNull().defaultNow(),
    transitionStartedAt: timestamp("transition_started_at"),
    confirmationCount: integer("confirmation_count").notNull().default(0),
    lastFdr: real("last_fdr").notNull().default(1.0),
    lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  },
);

// Regime Transitions Audit Log - Records all regime changes with context
export const regimeTransitions = pgTable(
  "regime_transitions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    previousRegime: text("previous_regime").notNull(),
    newRegime: text("new_regime").notNull(),
    fdr: real("fdr").notNull(),
    triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
    hysteresisApplied: integer("hysteresis_applied").notNull().default(0),
    durationFilterApplied: integer("duration_filter_applied").notNull().default(0),
    confirmationRequired: integer("confirmation_required").notNull().default(0),
    confirmationCount: integer("confirmation_count").notNull().default(0),
    daysInPreviousRegime: integer("days_in_previous_regime"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("regime_transitions_company_idx").on(table.companyId),
    index("regime_transitions_triggered_idx").on(table.triggeredAt),
  ],
);

export const skus = pgTable(
  "skus",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    priority: real("priority").notNull().default(1.0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("skus_company_idx").on(table.companyId)],
);

export const materials = pgTable(
  "materials",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    onHand: real("on_hand").notNull().default(0),
    inbound: real("inbound").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("materials_company_idx").on(table.companyId)],
);

export const boms = pgTable(
  "boms",
  {
    skuId: varchar("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    materialId: varchar("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    quantityPerUnit: real("quantity_per_unit").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.skuId, table.materialId] }),
  }),
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("suppliers_company_idx").on(table.companyId)],
);

export const supplierMaterials = pgTable("supplier_materials", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  materialId: varchar("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  unitCost: real("unit_cost").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  onTimePct: real("on_time_pct"),        // 0.0–1.0 on-time delivery rate; null = no data
  deliveryVariance: real("delivery_variance"), // fractional variance ≥ 0; null = no data
}, (table) => [
  index("sm_supplier_idx").on(table.supplierId),
  index("sm_material_idx").on(table.materialId),
]);

export const demandHistory = pgTable("demand_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  skuId: varchar("sku_id")
    .notNull()
    .references(() => skus.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  units: real("units").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("dh_sku_idx").on(table.skuId),
  index("dh_period_idx").on(table.period),
]);

export const allocations = pgTable(
  "allocations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    budget: real("budget").notNull(),
    regime: text("regime").notNull(),
    fdr: real("fdr").notNull(),
    policyKnobs: jsonb("policy_knobs").notNull(),
    kpis: jsonb("kpis").notNull(),
    budgetDurationValue: integer("budget_duration_value"), // How many periods the budget should last
    budgetDurationUnit: text("budget_duration_unit"), // "day", "week", "month", "quarter"
    horizonStart: timestamp("horizon_start"), // Optional start date for budget period (defaults to now)
    directMaterialRequirements: jsonb("direct_material_requirements"), // Array of {materialId, quantity} for direct material allocation
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("allocations_company_idx").on(table.companyId),
    index("allocations_created_at_idx").on(table.createdAt),
  ],
);

export const allocationResults = pgTable("allocation_results", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  allocationId: varchar("allocation_id")
    .notNull()
    .references(() => allocations.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id")
    .notNull()
    .references(() => skus.id, { onDelete: "cascade" }),
  plannedUnits: real("planned_units").notNull(),
  allocatedUnits: real("allocated_units").notNull(),
  fillRate: real("fill_rate").notNull(),
  // Budget runway fields
  estimatedCostPerPeriod: real("estimated_cost_per_period"), // Burn rate for this SKU
  projectedDepletionDate: timestamp("projected_depletion_date"), // When budget runs out for this SKU
  daysOfInventory: real("days_of_inventory"), // How many days this allocation covers
}, (table) => [
  index("ar_allocation_idx").on(table.allocationId),
  index("ar_sku_idx").on(table.skuId),
]);

export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  materialCode: text("material_code").notNull(),
  materialName: text("material_name").notNull(),
  targetPrice: real("target_price").notNull(),
  priceDirection: text("price_direction").notNull(), // "above" or "below"
  supplierId: varchar("supplier_id").references(() => suppliers.id, {
    onDelete: "set null",
  }),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  lastCheckedPrice: real("last_checked_price"),
  lastCheckedAt: timestamp("last_checked_at"),
  notificationsSent: integer("notifications_sent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("pa_company_idx").on(table.companyId),
  index("pa_supplier_idx").on(table.supplierId),
  index("pa_active_idx").on(table.isActive),
]);

export const machinery = pgTable("machinery", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  category: text("category").notNull(), // "CNC", "Injection Molding", "Assembly Robot", etc.
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: real("purchase_cost").notNull(),
  salvageValue: real("salvage_value").notNull().default(0),
  usefulLifeYears: integer("useful_life_years").notNull().default(10),
  depreciationMethod: text("depreciation_method")
    .notNull()
    .default("straight-line"), // "straight-line", "declining-balance", "units-of-production"
  currentValue: real("current_value"),
  location: text("location"),
  status: text("status").notNull().default("operational"), // "operational", "maintenance", "down", "retired"
  productUrl: text("product_url"),
  specifications: jsonb("specifications"), // Store detailed specs from APIs
  hoursOperated: real("hours_operated").default(0),
  unitsProduced: real("units_produced").default(0),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  maintenanceIntervalDays: integer("maintenance_interval_days").default(90),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  machineryId: varchar("machinery_id")
    .notNull()
    .references(() => machinery.id, { onDelete: "cascade" }),
  maintenanceType: text("maintenance_type").notNull(), // "preventive", "corrective", "predictive"
  description: text("description").notNull(),
  cost: real("cost").notNull().default(0),
  performedDate: timestamp("performed_date").notNull(),
  performedBy: text("performed_by"),
  nextScheduledDate: timestamp("next_scheduled_date"),
  downTimeHours: real("down_time_hours").default(0),
  partsReplaced: text("parts_replaced").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("mr_machinery_idx").on(table.machineryId),
  index("mr_type_idx").on(table.maintenanceType),
  index("mr_performed_date_idx").on(table.performedDate),
]);

// Financial Statements
export const balanceSheets = pgTable("balance_sheets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  statementType: text("statement_type").notNull().default("quarterly"), // "quarterly", "annual", "monthly"
  version: integer("version").notNull().default(1), // For revisions
  // Assets
  currentAssets: real("current_assets"),
  cashAndEquivalents: real("cash_and_equivalents"),
  accountsReceivable: real("accounts_receivable"),
  inventory: real("inventory"),
  prepaidExpenses: real("prepaid_expenses"),
  fixedAssets: real("fixed_assets"),
  propertyPlantEquipment: real("property_plant_equipment"),
  accumulatedDepreciation: real("accumulated_depreciation"),
  intangibleAssets: real("intangible_assets"),
  totalAssets: real("total_assets"),
  // Liabilities
  currentLiabilities: real("current_liabilities"),
  accountsPayable: real("accounts_payable"),
  shortTermDebt: real("short_term_debt"),
  accruedExpenses: real("accrued_expenses"),
  longTermLiabilities: real("long_term_liabilities"),
  longTermDebt: real("long_term_debt"),
  totalLiabilities: real("total_liabilities"),
  // Equity
  shareholdersEquity: real("shareholders_equity"),
  retainedEarnings: real("retained_earnings"),
  // Metadata
  additionalData: jsonb("additional_data"), // Flexible field for extra line items
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const incomeStatements = pgTable("income_statements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  statementType: text("statement_type").notNull().default("quarterly"), // "quarterly", "annual", "monthly"
  version: integer("version").notNull().default(1),
  // Revenue
  revenue: real("revenue"),
  costOfGoodsSold: real("cost_of_goods_sold"),
  grossProfit: real("gross_profit"),
  // Operating Expenses
  operatingExpenses: real("operating_expenses"),
  sellingGeneralAdmin: real("selling_general_admin"),
  researchDevelopment: real("research_development"),
  depreciationAmortization: real("depreciation_amortization"),
  operatingIncome: real("operating_income"),
  // Other
  interestExpense: real("interest_expense"),
  interestIncome: real("interest_income"),
  otherIncome: real("other_income"),
  incomeBeforeTax: real("income_before_tax"),
  incomeTax: real("income_tax"),
  netIncome: real("net_income"),
  // Metadata
  additionalData: jsonb("additional_data"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cashFlowStatements = pgTable("cash_flow_statements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  statementType: text("statement_type").notNull().default("quarterly"), // "quarterly", "annual", "monthly"
  version: integer("version").notNull().default(1),
  // Operating Activities
  netIncome: real("net_income"),
  depreciationAmortization: real("depreciation_amortization"),
  changesInWorkingCapital: real("changes_in_working_capital"),
  changesInReceivables: real("changes_in_receivables"),
  changesInInventory: real("changes_in_inventory"),
  changesInPayables: real("changes_in_payables"),
  operatingCashFlow: real("operating_cash_flow"),
  // Investing Activities
  capitalExpenditures: real("capital_expenditures"),
  acquisitions: real("acquisitions"),
  investmentPurchases: real("investment_purchases"),
  investmentSales: real("investment_sales"),
  investingCashFlow: real("investing_cash_flow"),
  // Financing Activities
  debtIssuance: real("debt_issuance"),
  debtRepayment: real("debt_repayment"),
  equityIssuance: real("equity_issuance"),
  dividendsPaid: real("dividends_paid"),
  financingCashFlow: real("financing_cash_flow"),
  // Summary
  netCashFlow: real("net_cash_flow"),
  beginningCash: real("beginning_cash"),
  endingCash: real("ending_cash"),
  // Metadata
  additionalData: jsonb("additional_data"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Price Tracking & Supplier Machinery
export const supplierMachinery = pgTable("supplier_machinery", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  machineryType: text("machinery_type").notNull(), // e.g., "CNC Machine", "Industrial Robot"
  manufacturer: text("manufacturer"),
  model: text("model"),
  unitPrice: real("unit_price").notNull(),
  currency: text("currency").notNull().default("USD"),
  leadTimeDays: integer("lead_time_days"),
  warrantyMonths: integer("warranty_months"),
  specifications: jsonb("specifications"), // Detailed specs from API
  availabilityStatus: text("availability_status").default("available"), // "available", "limited", "out_of_stock"
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const priceHistory = pgTable("price_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // "material" or "machinery"
  itemId: varchar("item_id").notNull(), // ID of material or machinery type
  supplierId: varchar("supplier_id").references(() => suppliers.id, {
    onDelete: "cascade",
  }),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  source: text("source").notNull(), // "supplier_quote", "api", "market_data"
  apiProvider: text("api_provider"), // "metals_dev", "commodities_api", "equipmentwatch"
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional context (volume, terms, etc.)
});

export const priceRecommendations = pgTable("price_recommendations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // "material" or "machinery"
  itemId: varchar("item_id").notNull(),
  itemName: text("item_name").notNull(),
  currentSupplierId: varchar("current_supplier_id").references(
    () => suppliers.id,
  ),
  currentPrice: real("current_price").notNull(),
  recommendedSupplierId: varchar("recommended_supplier_id").references(
    () => suppliers.id,
  ),
  recommendedPrice: real("recommended_price").notNull(),
  potentialSavings: real("potential_savings").notNull(),
  savingsPercentage: real("savings_percentage").notNull(),
  status: text("status").notNull().default("active"), // "active", "dismissed", "accepted"
  priority: text("priority").default("medium"), // "high", "medium", "low"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dismissedAt: timestamp("dismissed_at"),
  acceptedAt: timestamp("accepted_at"),
});

// Regulatory Compliance Management
export const complianceDocuments = pgTable("compliance_documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(), // "policy", "procedure", "certificate", "permit", "audit_report", "training_record"
  regulationType: text("regulation_type").notNull(), // "environmental", "safety", "labor", "quality", "financial", "data_privacy"
  documentNumber: text("document_number"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"), // "draft", "under_review", "approved", "active", "archived", "expired"
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  fileUrl: text("file_url"), // URL to stored document
  fileType: text("file_type"), // "pdf", "docx", "xlsx"
  fileSize: integer("file_size"), // bytes
  description: text("description"),
  tags: text("tags").array(),
  issuingAuthority: text("issuing_authority"), // Regulatory body that issued/requires this
  economicRegimeContext: text("economic_regime_context"), // Track which regime this was created/modified under
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  nextReviewDate: timestamp("next_review_date"),
  metadata: jsonb("metadata"), // Flexible field for custom attributes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const complianceRegulations = pgTable("compliance_regulations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  regulationType: text("regulation_type").notNull(), // "environmental", "safety", "labor", "quality", "financial", "data_privacy"
  jurisdiction: text("jurisdiction").notNull(), // "federal", "state", "local", "international"
  issuingBody: text("issuing_body").notNull(), // e.g., "OSHA", "EPA", "ISO", "FDA"
  regulationCode: text("regulation_code"), // e.g., "ISO 9001", "OSHA 1910.147"
  description: text("description").notNull(),
  requirements: jsonb("requirements"), // Structured requirements list
  applicabilityStatus: text("applicability_status")
    .notNull()
    .default("applicable"), // "applicable", "not_applicable", "under_review"
  riskLevel: text("risk_level").default("medium"), // "critical", "high", "medium", "low"
  complianceStatus: text("compliance_status").notNull().default("compliant"), // "compliant", "non_compliant", "partial", "pending_verification"
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  relatedDocuments: text("related_documents").array(), // IDs of related compliance documents
  economicImpactNotes: text("economic_impact_notes"), // How different economic regimes affect this
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const complianceAudits = pgTable("compliance_audits", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  auditName: text("audit_name").notNull(),
  auditType: text("audit_type").notNull(), // "internal", "external", "certification", "regulatory"
  regulationType: text("regulation_type").notNull(), // "environmental", "safety", "labor", "quality", "financial", "data_privacy"
  auditor: text("auditor").notNull(), // Name of auditor or firm
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  status: text("status").notNull().default("scheduled"), // "scheduled", "in_progress", "completed", "failed"
  overallResult: text("overall_result"), // "pass", "pass_with_findings", "fail"
  score: real("score"), // 0-100
  findings: jsonb("findings"), // List of audit findings
  correctiveActions: jsonb("corrective_actions"), // Required actions
  followUpDate: timestamp("follow_up_date"),
  documentPackageUrl: text("document_package_url"), // One-click audit package
  economicRegime: text("economic_regime"), // Economic regime during audit
  fdrAtAudit: real("fdr_at_audit"), // FDR ratio when audit occurred
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // "create", "update", "delete", "login", "logout", "export", "import"
    entityType: text("entity_type").notNull(), // "company", "sku", "material", "supplier", "allocation", "settings", etc.
    entityId: varchar("entity_id"), // ID of the affected entity
    changes: jsonb("changes"), // Before/after values for updates
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_company_idx").on(table.companyId),
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_timestamp_idx").on(table.timestamp),
  ],
);

export const complianceApprovals = pgTable("compliance_approvals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: varchar("document_id")
    .notNull()
    .references(() => complianceDocuments.id, { onDelete: "cascade" }),
  approverUserId: varchar("approver_user_id")
    .notNull()
    .references(() => users.id),
  approvalLevel: integer("approval_level").notNull(), // 1, 2, 3 for multi-level approvals
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "deferred"
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Findings - Track findings from audits with owner assignment and closure
export const auditFindings = pgTable("audit_findings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").references(() => complianceAudits.id, {
    onDelete: "set null",
  }),
  findingNumber: text("finding_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("minor"), // "critical", "major", "minor", "observation"
  category: text("category").notNull(), // "safety", "environmental", "quality", "documentation", "process"
  status: text("status").notNull().default("open"), // "open", "in_progress", "resolved", "closed", "overdue"
  assignedTo: varchar("assigned_to").references(() => users.id),
  assignedToName: text("assigned_to_name"),
  dueDate: timestamp("due_date"),
  closedDate: timestamp("closed_date"),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  preventiveAction: text("preventive_action"),
  evidence: text("evidence"), // URL or description of supporting evidence
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit Checklist Templates - Pre-built checklists for ISO, OSHA, EPA
export const auditChecklistTemplates = pgTable("audit_checklist_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }), // null for system templates
  name: text("name").notNull(),
  standard: text("standard").notNull(), // "ISO_9001", "OSHA_SAFETY", "EPA_ENVIRONMENTAL", "ISO_14001", "ISO_45001"
  version: text("version").notNull(),
  description: text("description"),
  isSystemTemplate: boolean("is_system_template").notNull().default(false),
  checklistItems: jsonb("checklist_items").notNull(), // Array of { id, section, item, requirement, guidance }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Compliance Calendar Events - Pre-populated with manufacturing deadlines
export const complianceCalendarEvents = pgTable("compliance_calendar_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  eventType: text("event_type").notNull(), // "deadline", "renewal", "audit", "training", "inspection", "filing"
  regulatoryBody: text("regulatory_body"), // "OSHA", "EPA", "ISO", "FDA", "STATE", "LOCAL"
  dueDate: timestamp("due_date").notNull(),
  reminderDays: integer("reminder_days").default(30), // Days before to send reminder
  status: text("status").notNull().default("upcoming"), // "upcoming", "completed", "overdue", "dismissed"
  relatedDocumentId: varchar("related_document_id").references(
    () => complianceDocuments.id,
    { onDelete: "set null" },
  ),
  description: text("description"),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // "annual", "quarterly", "monthly"
  lastCompleted: timestamp("last_completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employee Training Records - Track safety training completion
export const employeeTrainingRecords = pgTable("employee_training_records", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id"), // Optional link to workforce management system
  employeeName: text("employee_name").notNull(),
  trainingType: text("training_type").notNull(), // "safety", "hazmat", "equipment", "emergency", "quality", "environmental"
  trainingName: text("training_name").notNull(),
  provider: text("provider"), // Training provider/instructor
  completionDate: timestamp("completion_date"),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull().default("not_started"), // "not_started", "in_progress", "completed", "expired", "overdue"
  certificateUrl: text("certificate_url"),
  score: real("score"), // Test score if applicable
  passingScore: real("passing_score"),
  hoursCompleted: real("hours_completed"),
  hoursRequired: real("hours_required"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Production KPIs and OEE Tracking
export const productionRuns = pgTable("production_runs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id").references(() => skus.id, { onDelete: "set null" }),
  machineryId: varchar("machinery_id").references(() => machinery.id, {
    onDelete: "set null",
  }),
  runNumber: text("run_number").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("in_progress"), // "in_progress", "completed", "aborted", "paused"
  plannedDuration: real("planned_duration"), // minutes
  actualDuration: real("actual_duration"), // minutes
  plannedUnits: integer("planned_units"),
  producedUnits: integer("produced_units"),
  goodUnits: integer("good_units"), // For quality calculation
  defectiveUnits: integer("defective_units"),
  cycleTime: real("cycle_time"), // seconds per unit
  targetCycleTime: real("target_cycle_time"), // seconds per unit
  downtime: real("downtime"), // minutes of unplanned stops
  setupTime: real("setup_time"), // minutes for changeover
  economicRegime: text("economic_regime"), // Regime during production
  fdrAtStart: real("fdr_at_start"), // FDR when run started
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productionMetrics = pgTable("production_metrics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  productionRunId: varchar("production_run_id").references(
    () => productionRuns.id,
    { onDelete: "cascade" },
  ),
  machineryId: varchar("machinery_id").references(() => machinery.id, {
    onDelete: "set null",
  }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  // OEE Components: OEE = Availability × Performance × Quality
  availability: real("availability"), // (Operating Time / Planned Production Time) × 100
  performance: real("performance"), // (Actual Production / Theoretical Max Production) × 100
  quality: real("quality"), // (Good Units / Total Units) × 100
  oee: real("oee"), // Overall Equipment Effectiveness percentage
  // Supporting Metrics
  plannedProductionTime: real("planned_production_time"), // minutes
  actualOperatingTime: real("actual_operating_time"), // minutes
  downtimeMinutes: real("downtime_minutes"),
  idealCycleTime: real("ideal_cycle_time"), // seconds
  actualCycleTime: real("actual_cycle_time"), // seconds
  totalUnitsProduced: integer("total_units_produced"),
  goodUnitsProduced: integer("good_units_produced"),
  defectiveUnits: integer("defective_units"),
  // Throughput
  unitsPerHour: real("units_per_hour"),
  utilizationRate: real("utilization_rate"), // percentage
  // Economic Context
  economicRegime: text("economic_regime"),
  fdrAtPeriod: real("fdr_at_period"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const downtimeEvents = pgTable("downtime_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  productionRunId: varchar("production_run_id").references(
    () => productionRuns.id,
    { onDelete: "set null" },
  ),
  machineryId: varchar("machinery_id")
    .notNull()
    .references(() => machinery.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // "breakdown", "changeover", "material_shortage", "maintenance", "quality_issue", "other"
  category: text("category").notNull(), // "planned", "unplanned"
  severity: text("severity").default("medium"), // "critical", "high", "medium", "low"
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: real("duration_minutes"),
  description: text("description").notNull(),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  responsiblePerson: text("responsible_person"),
  impactOnProduction: text("impact_on_production"), // "production_stopped", "reduced_capacity", "quality_affected"
  estimatedCost: real("estimated_cost"), // Cost of downtime
  preventativeMeasures: text("preventative_measures"),
  economicRegime: text("economic_regime"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productionBottlenecks = pgTable("production_bottlenecks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  identifiedAt: timestamp("identified_at").defaultNow().notNull(),
  status: text("status").notNull().default("active"), // "active", "resolved", "monitoring"
  bottleneckType: text("bottleneck_type").notNull(), // "machinery", "material", "labor", "process"
  location: text("location").notNull(), // Where in production line
  machineryId: varchar("machinery_id").references(() => machinery.id),
  description: text("description").notNull(),
  impactLevel: text("impact_level").notNull(), // "critical", "high", "medium", "low"
  throughputLoss: real("throughput_loss"), // percentage
  estimatedDailyCost: real("estimated_daily_cost"),
  recommendedActions: jsonb("recommended_actions"),
  implementedSolutions: text("implemented_solutions"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  economicRegimeContext: text("economic_regime_context"), // How regime affects this bottleneck
  fdrImpact: text("fdr_impact"), // Notes on FDR correlation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// IoT Sensors & Predictive Maintenance
export const equipmentSensors = pgTable("equipment_sensors", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id")
    .notNull()
    .references(() => machinery.id, { onDelete: "cascade" }),
  sensorType: text("sensor_type").notNull(), // "vibration", "temperature", "pressure", "current", "flow", "acoustic"
  sensorId: text("sensor_id").notNull().unique(), // External IoT sensor identifier
  manufacturer: text("manufacturer"),
  model: text("model"),
  location: text("location").notNull(), // Where on equipment (e.g., "bearing", "motor", "pump")
  unit: text("unit").notNull(), // "celsius", "hz", "psi", "amps", "gpm", "db"
  normalMin: real("normal_min"), // Normal operating range minimum
  normalMax: real("normal_max"), // Normal operating range maximum
  warningMin: real("warning_min"), // Warning threshold minimum
  warningMax: real("warning_max"), // Warning threshold maximum
  criticalMin: real("critical_min"), // Critical threshold minimum
  criticalMax: real("critical_max"), // Critical threshold maximum
  status: text("status").notNull().default("active"), // "active", "inactive", "maintenance", "error"
  lastCommunication: timestamp("last_communication"),
  calibrationDate: timestamp("calibration_date"),
  nextCalibrationDate: timestamp("next_calibration_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sensorReadings = pgTable("sensor_readings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sensorId: varchar("sensor_id")
    .notNull()
    .references(() => equipmentSensors.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  status: text("status").notNull(), // "normal", "warning", "critical"
  timestamp: timestamp("timestamp").notNull(),
  metadata: jsonb("metadata"), // Additional context from sensor
});

export const maintenanceAlerts = pgTable("maintenance_alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id")
    .notNull()
    .references(() => machinery.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(), // "predictive_failure", "anomaly_detected", "threshold_exceeded", "pattern_change"
  severity: text("severity").notNull(), // "critical", "high", "medium", "low"
  title: text("title").notNull(),
  description: text("description").notNull(),
  predictedFailureDate: timestamp("predicted_failure_date"),
  confidence: real("confidence"), // 0-100 ML confidence score
  affectedSensors: text("affected_sensors").array(),
  recommendedActions: jsonb("recommended_actions"),
  status: text("status").notNull().default("active"), // "active", "acknowledged", "resolved", "dismissed"
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  economicRegime: text("economic_regime"), // Regime when alert triggered
  fdrAtAlert: real("fdr_at_alert"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const maintenancePredictions = pgTable("maintenance_predictions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id")
    .notNull()
    .references(() => machinery.id, { onDelete: "cascade" }),
  predictionType: text("prediction_type").notNull(), // "failure", "degradation", "maintenance_window"
  failureMode: text("failure_mode"), // "bearing_failure", "motor_burnout", "seal_leak", etc.
  predictedDate: timestamp("predicted_date").notNull(),
  confidence: real("confidence").notNull(), // 0-100
  timeToFailure: real("time_to_failure"), // hours
  impactAssessment: jsonb("impact_assessment"), // Production impact, cost, etc.
  mlModel: text("ml_model"), // Which model generated this
  featureImportance: jsonb("feature_importance"), // What factors led to prediction
  status: text("status").notNull().default("pending"), // "pending", "validated", "false_positive"
  actualFailureDate: timestamp("actual_failure_date"),
  accuracyScore: real("accuracy_score"), // Post-validation accuracy
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI-Powered Inventory Optimization
export const inventoryOptimizations = pgTable("inventory_optimizations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  currentStock: real("current_stock").notNull(),
  optimalStock: real("optimal_stock").notNull(),
  reorderPoint: real("reorder_point").notNull(),
  safetyStock: real("safety_stock").notNull(),
  economicOrderQuantity: real("economic_order_quantity"), // EOQ
  leadTimeVariability: real("lead_time_variability"), // days
  demandVariability: real("demand_variability"), // coefficient of variation
  forecastAccuracy: real("forecast_accuracy"), // percentage
  stockoutRisk: real("stockout_risk"), // percentage
  excessInventoryRisk: real("excess_inventory_risk"), // percentage
  recommendedAction: text("recommended_action"), // "increase", "decrease", "maintain", "urgent_reorder"
  estimatedCostImpact: real("estimated_cost_impact"),
  mlModel: text("ml_model"),
  confidence: real("confidence"),
  economicRegime: text("economic_regime"),
  fdrAtAnalysis: real("fdr_at_analysis"),
  regimeRecommendation: text("regime_recommendation"), // Regime-specific advice
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const demandPredictions = pgTable("demand_predictions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id").references(() => skus.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").references(() => materials.id, {
    onDelete: "cascade",
  }),
  forecastPeriod: text("forecast_period").notNull(), // "2025-Q1", "2025-01", etc.
  forecastHorizon: integer("forecast_horizon").notNull(), // days ahead
  predictedDemand: real("predicted_demand").notNull(),
  lowerBound: real("lower_bound"), // 95% confidence interval
  upperBound: real("upper_bound"), // 95% confidence interval
  seasonalityFactor: real("seasonality_factor"),
  trendComponent: real("trend_component"),
  externalFactors: jsonb("external_factors"), // Market signals, economic indicators
  mlModel: text("ml_model").notNull(), // "ARIMA", "LSTM", "Prophet", "XGBoost"
  accuracy: real("accuracy"), // MAPE or other metric
  actualDemand: real("actual_demand"), // Filled in after period ends
  economicRegime: text("economic_regime"),
  fdrAtForecast: real("fdr_at_forecast"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Multi-Horizon Forecasting Demand Signal Repository
export const multiHorizonForecasts = pgTable(
  "multi_horizon_forecasts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    skuId: varchar("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(), // When the forecast was made
    forecastDate: text("forecast_date").notNull(), // The date this forecast is for (YYYY-MM-DD)
    horizonDays: integer("horizon_days").notNull(), // Days ahead from createdAt (1, 7, 14, 30, 60, 90, 180, 365)
    predictedDemand: real("predicted_demand").notNull(),
    lowerBound: real("lower_bound"), // 95% confidence interval
    upperBound: real("upper_bound"), // 95% confidence interval
    confidence: real("confidence"), // 0-100
    mlModel: text("ml_model").notNull(), // Model used for this horizon
    externalFactors: jsonb("external_factors"), // Market signals, economic indicators
    economicRegime: text("economic_regime"), // Regime at forecast time
    fdrAtForecast: real("fdr_at_forecast"), // FDR at forecast time
    actualDemand: real("actual_demand"), // Filled in after the forecast date
    accuracy: real("accuracy"), // MAPE after actual is known
    signalStrength: text("signal_strength"), // "strong", "moderate", "weak" - quality of demand signal
    volatility: real("volatility"), // Expected demand volatility
    seasonality: real("seasonality"), // Seasonal component strength
    trend: real("trend"), // Trend component
  },
  (table) => [
    index("multi_horizon_forecasts_company_idx").on(table.companyId),
    index("multi_horizon_forecasts_sku_idx").on(table.skuId),
    index("multi_horizon_forecasts_horizon_idx").on(table.horizonDays),
    index("multi_horizon_forecasts_date_idx").on(table.forecastDate),
  ],
);

// Real-time Forecast Accuracy Tracking & Monitoring
export const forecastAccuracyTracking = pgTable(
  "forecast_accuracy_tracking",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    skuId: varchar("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),

    // Timeframe
    measurementDate: timestamp("measurement_date").notNull().defaultNow(),
    evaluationPeriodDays: integer("evaluation_period_days")
      .notNull()
      .default(30), // Window used for calculation

    // Accuracy metrics
    mape: real("mape").notNull(), // Mean Absolute Percentage Error
    mae: real("mae"), // Mean Absolute Error
    rmse: real("rmse"), // Root Mean Square Error
    predictionsEvaluated: integer("predictions_evaluated").notNull(), // Number of predictions used

    // Enhanced accuracy metrics (new)
    bias: real("bias"), // Average signed error - positive = over-forecasting, negative = under-forecasting
    trackingSignal: real("tracking_signal"), // Cumulative error / MAD - detects persistent drift (target: -4 to +4)
    theilsU: real("theils_u"), // Comparison to naive forecast (< 1 means better than naive)
    directionalAccuracy: real("directional_accuracy"), // % of correct direction predictions (up/down)
    confidenceHitRate: real("confidence_hit_rate"), // % of actuals within predicted confidence bounds

    // Trend indicators
    mapeTrend: text("map_trend"), // "improving", "degrading", "stable"
    trendChangePercent: real("trend_change_percent"), // % change from previous measurement

    // Baseline comparison
    baselineMAPE: real("baseline_mape"), // MAPE when SKU was last retrained
    improvementVsBaseline: real("improvement_vs_baseline"), // % better/worse than baseline

    // Context
    economicRegime: text("economic_regime"),
    averageDemand: real("average_demand"),
    demandVolatility: real("demand_volatility"), // Standard deviation / mean

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("forecast_accuracy_tracking_company_idx").on(table.companyId),
    index("forecast_accuracy_tracking_sku_idx").on(table.skuId),
    index("forecast_accuracy_tracking_date_idx").on(table.measurementDate),
  ],
);

export const forecastDegradationAlerts = pgTable(
  "forecast_degradation_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    skuId: varchar("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),

    // Alert details
    alertType: text("alert_type").notNull(), // "degradation", "threshold_exceeded", "rapid_decline"
    severity: text("severity").notNull(), // "low", "medium", "high", "critical"
    triggeredAt: timestamp("triggered_at").notNull().defaultNow(),

    // Metrics that triggered alert
    currentMAPE: real("current_mape").notNull(),
    previousMAPE: real("previous_mape"),
    baselineMAPE: real("baseline_mape"),
    degradationPercent: real("degradation_percent"), // % worse than baseline

    // Thresholds
    thresholdType: text("threshold_type").notNull(), // "absolute", "relative", "trend"
    thresholdValue: real("threshold_value").notNull(),

    // Recommended actions
    recommendedAction: text("recommended_action").notNull(), // "retrain", "recalibrate", "investigate", "monitor"
    actionTaken: text("action_taken"), // "retrained", "recalibrated", "ignored", null = pending
    actionTakenAt: timestamp("action_taken_at"),
    actionTakenBy: varchar("action_taken_by").references(() => users.id),

    // Status
    acknowledged: integer("acknowledged").notNull().default(0),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at"),
    resolved: integer("resolved").notNull().default(0),
    resolvedAt: timestamp("resolved_at"),

    // Additional context
    message: text("message").notNull(),
    details: jsonb("details"), // Additional diagnostic information

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("forecast_degradation_alerts_company_idx").on(table.companyId),
    index("forecast_degradation_alerts_sku_idx").on(table.skuId),
    index("forecast_degradation_alerts_severity_idx").on(table.severity),
    index("forecast_degradation_alerts_resolved_idx").on(table.resolved),
  ],
);

export const inventoryRecommendations = pgTable("inventory_recommendations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  recommendationType: text("recommendation_type").notNull(), // "reorder", "adjust_safety_stock", "consolidate_orders", "slow_moving_alert"
  priority: text("priority").notNull(), // "critical", "high", "medium", "low"
  affectedMaterials: text("affected_materials").array(), // Material IDs
  currentState: jsonb("current_state"),
  recommendedState: jsonb("recommended_state"),
  reasoning: text("reasoning").notNull(),
  estimatedSavings: real("estimated_savings"),
  estimatedRisk: text("estimated_risk"),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected", "implemented"
  implementedBy: varchar("implemented_by").references(() => users.id),
  implementedAt: timestamp("implemented_at"),
  outcomeNotes: text("outcome_notes"),
  economicRegime: text("economic_regime"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// End-to-End Supply Chain Traceability
export const materialBatches = pgTable("material_batches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull().unique(),
  supplierId: varchar("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  receivedDate: timestamp("received_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  qualityStatus: text("quality_status").notNull().default("pending"), // "pending", "approved", "rejected", "quarantine"
  inspectionDate: timestamp("inspection_date"),
  inspectedBy: varchar("inspected_by").references(() => users.id),
  certifications: text("certifications").array(), // "ISO", "REACH", "RoHS", etc.
  countryOfOrigin: text("country_of_origin"),
  lotNumber: text("lot_number"),
  poNumber: text("po_number"),
  currentLocation: text("current_location"),
  status: text("status").notNull().default("in_stock"), // "in_stock", "in_production", "consumed", "returned", "disposed"
  parentBatchId: varchar("parent_batch_id").references(
    (): AnyPgColumn => materialBatches.id,
  ), // For split batches
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const traceabilityEvents = pgTable("traceability_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id")
    .notNull()
    .references(() => materialBatches.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // "received", "inspected", "moved", "used_in_production", "shipped", "quality_issue"
  eventDescription: text("event_description").notNull(),
  location: text("location"),
  performedBy: varchar("performed_by").references(() => users.id),
  productionRunId: varchar("production_run_id").references(
    () => productionRuns.id,
  ),
  skuId: varchar("sku_id").references(() => skus.id),
  quantityAffected: real("quantity_affected"),
  qualityData: jsonb("quality_data"), // Test results, measurements, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

export const supplierChainLinks = pgTable("supplier_chain_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  primarySupplierId: varchar("primary_supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  alternativeSuppliers: text("alternative_suppliers").array(), // Supplier IDs
  riskLevel: text("risk_level").notNull().default("medium"), // "low", "medium", "high", "critical"
  singleSourceRisk: integer("single_source_risk").notNull().default(0), // 1 if single source, 0 if multiple
  geographicDiversification: text("geographic_diversification"), // "high", "medium", "low"
  leadTimeReliability: real("lead_time_reliability"), // percentage
  qualityScore: real("quality_score"), // 0-100
  lastDisruptionDate: timestamp("last_disruption_date"),
  disruptionHistory: jsonb("disruption_history"), // Historical disruptions
  contingencyPlan: text("contingency_plan"),
  economicRegimeImpact: jsonb("economic_regime_impact"), // How each regime affects this supply chain
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Multi-Tier Supplier Mapping (Resilinc/Interos competitor feature)
// Tracks supplier tiers (Tier-1, Tier-2, Tier-3, etc.) for deep supply chain visibility
export const supplierTiers = pgTable(
  "supplier_tiers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    tier: integer("tier").notNull().default(1), // 1 = direct supplier, 2 = sub-supplier, 3 = sub-sub-supplier, etc.
    tierLabel: text("tier_label"), // "Direct Supplier", "Sub-Supplier", "Raw Material Provider"
    materialCategories: text("material_categories").array(), // What categories this supplier provides
    region: text("region"), // Geographic region (country, state, city)
    country: text("country"),
    coordinates: jsonb("coordinates"), // { lat: number, lng: number } for mapping
    riskRegion: integer("risk_region").default(0), // 1 if in high-risk region, 0 otherwise
    spendShare: real("spend_share"), // Percentage of total spend with this tier
    dependencyWeight: real("dependency_weight"), // How critical is this supplier (0-100)
    alternativesCount: integer("alternatives_count").default(0), // Number of alternative suppliers at this tier
    lastAssessmentDate: timestamp("last_assessment_date"),
    dataConfidence: real("data_confidence"), // 0-100 confidence in tier data
    dataSource: text("data_source"), // "manual", "api", "inferred"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("supplier_tiers_company_idx").on(table.companyId),
    index("supplier_tiers_supplier_idx").on(table.supplierId),
    index("supplier_tiers_tier_idx").on(table.tier),
  ],
);

// Parent-child relationships between suppliers (who supplies whom)
export const supplierRelationships = pgTable(
  "supplier_relationships",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    parentSupplierId: varchar("parent_supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    childSupplierId: varchar("child_supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull().default("supplies"), // "supplies", "subcontracts", "joint_venture"
    materialFlows: jsonb("material_flows"), // [{ materialId, volumePercent, criticalPath }]
    volumeShare: real("volume_share"), // What % of parent's materials come from child
    isCriticalPath: integer("is_critical_path").default(0), // 1 if on critical supply path
    isSingleSource: integer("is_single_source").default(0), // 1 if parent has no alternatives for this material
    leadTimeDays: integer("lead_time_days"),
    qualityScore: real("quality_score"), // 0-100
    relationshipStrength: text("relationship_strength"), // "strong", "moderate", "weak"
    contractEndDate: timestamp("contract_end_date"),
    riskScore: real("risk_score"), // Calculated risk for this relationship (0-100)
    lastVerifiedDate: timestamp("last_verified_date"),
    verificationMethod: text("verification_method"), // "manual", "api", "document", "inferred"
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("supplier_rel_company_idx").on(table.companyId),
    index("supplier_rel_parent_idx").on(table.parentSupplierId),
    index("supplier_rel_child_idx").on(table.childSupplierId),
  ],
);

// High-risk regions database for alerting when sub-tier suppliers are in risky areas
export const supplierRegionRisks = pgTable(
  "supplier_region_risks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }), // null = global risk data
    region: text("region").notNull(), // Country, state, or specific region
    country: text("country").notNull(),
    riskLevel: text("risk_level").notNull().default("medium"), // "low", "medium", "high", "critical"
    riskScore: real("risk_score").notNull().default(50), // 0-100
    riskFactors: jsonb("risk_factors"), // { geopolitical: 80, natural_disaster: 60, infrastructure: 40, ... }
    geopoliticalRisk: real("geopolitical_risk"), // 0-100
    naturalDisasterRisk: real("natural_disaster_risk"), // 0-100
    infrastructureRisk: real("infrastructure_risk"), // 0-100
    laborRisk: real("labor_risk"), // 0-100
    regulatoryRisk: real("regulatory_risk"), // 0-100
    economicInstabilityRisk: real("economic_instability_risk"), // 0-100
    activeEvents: jsonb("active_events"), // Current risk events affecting this region
    lastEventDate: timestamp("last_event_date"),
    dataSource: text("data_source"), // "internal", "external_api", "manual"
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("region_risks_company_idx").on(table.companyId),
    index("region_risks_country_idx").on(table.country),
    index("region_risks_level_idx").on(table.riskLevel),
  ],
);

// Alerts for multi-tier supply chain issues
export const supplierTierAlerts = pgTable(
  "supplier_tier_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    alertType: text("alert_type").notNull(), // "single_source", "concentration_risk", "high_risk_region", "tier_dependency", "contract_expiry"
    severity: text("severity").notNull().default("medium"), // "low", "medium", "high", "critical"
    title: text("title").notNull(),
    description: text("description"),
    affectedSupplierId: varchar("affected_supplier_id").references(
      () => suppliers.id,
    ),
    affectedTier: integer("affected_tier"),
    affectedRegion: text("affected_region"),
    affectedMaterials: text("affected_materials").array(),
    riskScore: real("risk_score"), // 0-100
    impactEstimate: jsonb("impact_estimate"), // { revenueAtRisk, productionDays, affectedSkus }
    recommendations: jsonb("recommendations"), // [{ action, priority, timeframe }]
    status: text("status").notNull().default("active"), // "active", "acknowledged", "mitigated", "resolved"
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolution: text("resolution"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tier_alerts_company_idx").on(table.companyId),
    index("tier_alerts_type_idx").on(table.alertType),
    index("tier_alerts_severity_idx").on(table.severity),
    index("tier_alerts_status_idx").on(table.status),
  ],
);

// Workforce Scheduling & Skills Management
export const employees = pgTable("employees", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id), // Link to user if they have account
  employeeNumber: text("employee_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  department: text("department").notNull(), // "production", "quality", "maintenance", "logistics"
  role: text("role").notNull(), // "operator", "technician", "supervisor", "engineer"
  skills: text("skills").array(), // List of skill codes
  certifications: text("certifications").array(),
  hourlyRate: real("hourly_rate"),
  employmentType: text("employment_type").notNull().default("full_time"), // "full_time", "part_time", "contractor"
  status: text("status").notNull().default("active"), // "active", "on_leave", "terminated"
  hireDate: timestamp("hire_date"),
  maxHoursPerWeek: real("max_hours_per_week").default(40),
  preferredShifts: text("preferred_shifts").array(), // "day", "evening", "night"
  availabilityNotes: text("availability_notes"),
  performanceRating: real("performance_rating"), // 0-5
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workShifts = pgTable("work_shifts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  shiftName: text("shift_name").notNull(), // "Morning Shift", "Afternoon Shift", "Night Shift"
  shiftType: text("shift_type").notNull(), // "day", "evening", "night", "weekend"
  department: text("department").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  requiredHeadcount: integer("required_headcount").notNull(),
  requiredSkills: text("required_skills").array(),
  machineryIds: text("machinery_ids").array(), // Which machinery this shift operates
  productionTargets: jsonb("production_targets"), // Expected output
  status: text("status").notNull().default("scheduled"), // "scheduled", "in_progress", "completed", "cancelled"
  economicRegime: text("economic_regime"),
  fdrAtScheduling: real("fdr_at_scheduling"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const skillRequirements = pgTable("skill_requirements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  skillCode: text("skill_code").notNull().unique(), // "CNC_OPERATION", "WELDING_MIG", "FORKLIFT_CERT"
  skillName: text("skill_name").notNull(),
  category: text("category").notNull(), // "machinery", "safety", "quality", "technical"
  description: text("description"),
  certificationRequired: integer("certification_required").default(0), // 0 or 1
  trainingDurationHours: real("training_duration_hours"),
  expirationMonths: integer("expiration_months"), // How often recertification needed
  relatedMachineryTypes: text("related_machinery_types").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employee Skill Certifications for Skills Matrix
export const employeeSkillCertifications = pgTable(
  "employee_skill_certifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    skillCode: text("skill_code").notNull(),
    skillLevel: integer("skill_level").notNull().default(1), // 1=Basic, 2=Intermediate, 3=Advanced, 4=Expert
    certifiedDate: timestamp("certified_date"),
    expirationDate: timestamp("expiration_date"),
    certifiedBy: varchar("certified_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("skill_cert_company_idx").on(table.companyId),
    index("skill_cert_employee_idx").on(table.employeeId),
  ],
);

// Weekly Shift Schedules for Schedule Builder
export const weeklySchedules = pgTable(
  "weekly_schedules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    weekStartDate: timestamp("week_start_date").notNull(),
    department: text("department").notNull(),
    status: text("status").notNull().default("draft"), // "draft", "published", "archived"
    publishedAt: timestamp("published_at"),
    publishedBy: varchar("published_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("weekly_schedule_company_idx").on(table.companyId),
    index("weekly_schedule_week_idx").on(table.weekStartDate),
  ],
);

// Shift Assignments for Schedule Builder
export const shiftAssignments = pgTable(
  "shift_assignments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    scheduleId: varchar("schedule_id").references(() => weeklySchedules.id, {
      onDelete: "cascade",
    }),
    employeeId: varchar("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftDate: timestamp("shift_date").notNull(),
    shiftType: text("shift_type").notNull(), // "day", "evening", "night"
    startTime: text("start_time").notNull(), // "06:00"
    endTime: text("end_time").notNull(), // "14:00"
    hoursScheduled: real("hours_scheduled").notNull(),
    department: text("department").notNull(),
    productionLine: text("production_line"),
    status: text("status").notNull().default("scheduled"), // "scheduled", "worked", "absent", "late"
    actualHours: real("actual_hours"),
    overtimeHours: real("overtime_hours").default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shift_assignment_company_idx").on(table.companyId),
    index("shift_assignment_employee_idx").on(table.employeeId),
    index("shift_assignment_date_idx").on(table.shiftDate),
  ],
);

export const staffAssignments = pgTable("staff_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id")
    .notNull()
    .references(() => workShifts.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  assignedRole: text("assigned_role").notNull(),
  machineryId: varchar("machinery_id").references(() => machinery.id),
  status: text("status").notNull().default("assigned"), // "assigned", "confirmed", "checked_in", "completed", "absent"
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  hoursWorked: real("hours_worked"),
  overtimeHours: real("overtime_hours"),
  productionOutput: jsonb("production_output"), // What they produced
  performanceNotes: text("performance_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comprehensive Employee Management - HR, Payroll, Benefits
export const employeePayroll = pgTable("employee_payroll", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" })
    .unique(),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  annualSalary: real("annual_salary"),
  hourlyRate: real("hourly_rate"),
  payFrequency: text("pay_frequency").notNull().default("biweekly"), // "weekly", "biweekly", "monthly", "semimonthly"
  paymentMethod: text("payment_method").notNull().default("direct_deposit"), // "direct_deposit", "check", "cash"
  bankName: text("bank_name"),
  accountNumber: text("account_number"), // Encrypted in production
  routingNumber: text("routing_number"),
  taxFilingStatus: text("tax_filing_status"), // "single", "married", "head_of_household"
  federalWithholdings: integer("federal_withholdings").default(0), // Number of allowances
  stateWithholdings: integer("state_withholdings").default(0),
  additionalWithholding: real("additional_withholding").default(0),
  ssnLast4: text("ssn_last4"), // Only last 4 digits for security
  bonusEligible: integer("bonus_eligible").default(0), // 0 or 1
  commissionRate: real("commission_rate"),
  overtimeEligible: integer("overtime_eligible").default(1), // 0 or 1
  overtimeRate: real("overtime_rate").default(1.5), // Multiplier
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeBenefits = pgTable("employee_benefits", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  benefitType: text("benefit_type").notNull(), // "health", "dental", "vision", "life", "401k", "pto", "other"
  planName: text("plan_name").notNull(),
  provider: text("provider"),
  policyNumber: text("policy_number"),
  coverageLevel: text("coverage_level"), // "employee_only", "employee_spouse", "employee_children", "family"
  employeeContribution: real("employee_contribution"),
  employerContribution: real("employer_contribution"),
  deductionFrequency: text("deduction_frequency").default("per_paycheck"), // "per_paycheck", "monthly", "annually"
  enrollmentDate: timestamp("enrollment_date"),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull().default("active"), // "active", "pending", "cancelled", "expired"
  dependents: jsonb("dependents"), // Array of dependent info
  beneficiaries: jsonb("beneficiaries"), // For life insurance
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeDocuments = pgTable("employee_documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // "i9", "w4", "contract", "offer_letter", "certification", "license", "performance_review", "disciplinary", "other"
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"), // Path to uploaded file
  fileName: text("file_name"),
  fileSize: integer("file_size"), // in bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  documentDate: timestamp("document_date"),
  expirationDate: timestamp("expiration_date"),
  isConfidential: integer("is_confidential").default(0), // 0 or 1
  requiresSignature: integer("requires_signature").default(0),
  signedAt: timestamp("signed_at"),
  signedBy: varchar("signed_by").references(() => users.id),
  status: text("status").notNull().default("active"), // "active", "expired", "archived"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeTimeOff = pgTable("employee_time_off", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  requestType: text("request_type").notNull(), // "vacation", "sick", "personal", "unpaid", "bereavement", "parental", "jury_duty", "other"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: real("total_days").notNull(),
  totalHours: real("total_hours").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "denied", "cancelled"
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeePtoBalances = pgTable("employee_pto_balances", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" })
    .unique(),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  vacationDaysTotal: real("vacation_days_total").default(0),
  vacationDaysUsed: real("vacation_days_used").default(0),
  vacationDaysRemaining: real("vacation_days_remaining").default(0),
  sickDaysTotal: real("sick_days_total").default(0),
  sickDaysUsed: real("sick_days_used").default(0),
  sickDaysRemaining: real("sick_days_remaining").default(0),
  personalDaysTotal: real("personal_days_total").default(0),
  personalDaysUsed: real("personal_days_used").default(0),
  personalDaysRemaining: real("personal_days_remaining").default(0),
  accrualRate: real("accrual_rate"), // Days per month
  accrualStartDate: timestamp("accrual_start_date"),
  lastAccrualDate: timestamp("last_accrual_date"),
  yearStartDate: timestamp("year_start_date"), // When PTO year starts
  carryoverDays: real("carryover_days").default(0),
  maxCarryover: real("max_carryover"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeEmergencyContacts = pgTable(
  "employee_emergency_contacts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    employeeId: varchar("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    contactName: text("contact_name").notNull(),
    relationship: text("relationship").notNull(), // "spouse", "parent", "sibling", "child", "friend", "other"
    phone: text("phone").notNull(),
    alternatePhone: text("alternate_phone"),
    email: text("email"),
    address: text("address"),
    isPrimary: integer("is_primary").default(0), // 0 or 1
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const employeePerformanceReviews = pgTable(
  "employee_performance_reviews",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    employeeId: varchar("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    reviewDate: timestamp("review_date").notNull(),
    reviewPeriodStart: timestamp("review_period_start").notNull(),
    reviewPeriodEnd: timestamp("review_period_end").notNull(),
    reviewerUserId: varchar("reviewer_user_id")
      .notNull()
      .references(() => users.id),
    reviewType: text("review_type").notNull(), // "annual", "quarterly", "probationary", "promotion", "disciplinary"
    overallRating: real("overall_rating"), // 1-5 scale
    productivityScore: real("productivity_score"),
    qualityScore: real("quality_score"),
    communicationScore: real("communication_score"),
    teamworkScore: real("teamwork_score"),
    attendanceScore: real("attendance_score"),
    strengths: text("strengths"),
    areasForImprovement: text("areas_for_improvement"),
    goals: text("goals"),
    accomplishments: text("accomplishments"),
    reviewNotes: text("review_notes"),
    employeeComments: text("employee_comments"),
    raiseAmount: real("raise_amount"),
    raisePercentage: real("raise_percentage"),
    bonusAmount: real("bonus_amount"),
    promotionTitle: text("promotion_title"),
    nextReviewDate: timestamp("next_review_date"),
    status: text("status").notNull().default("draft"), // "draft", "completed", "acknowledged"
    acknowledgedAt: timestamp("acknowledged_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});
export const insertCompanyLocationSchema = createInsertSchema(
  companyLocations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateCompanyLocationSchema =
  insertCompanyLocationSchema.partial();
export const insertSkuSchema = createInsertSchema(skus).omit({
  id: true,
  createdAt: true,
});
export const updateSkuSchema = createInsertSchema(skus)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});
export const updateMaterialSchema = createInsertSchema(materials)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertBomSchema = createInsertSchema(boms);
export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});
export const insertSupplierMaterialSchema = createInsertSchema(
  supplierMaterials,
).omit({ id: true });
export const insertDemandHistorySchema = createInsertSchema(demandHistory).omit(
  { id: true, createdAt: true },
);
export const insertAllocationSchema = createInsertSchema(allocations).omit({
  id: true,
  createdAt: true,
});
export const insertAllocationResultSchema = createInsertSchema(
  allocationResults,
).omit({ id: true });
export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCheckedAt: true,
  lastCheckedPrice: true,
  notificationsSent: true,
});
export const updatePriceAlertSchema = createInsertSchema(priceAlerts)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertMachinerySchema = createInsertSchema(machinery).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentValue: true,
});
export const updateMachinerySchema = createInsertSchema(machinery)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertMaintenanceRecordSchema = createInsertSchema(
  maintenanceRecords,
).omit({ id: true, createdAt: true });
export const insertBalanceSheetSchema = createInsertSchema(balanceSheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateBalanceSheetSchema = createInsertSchema(balanceSheets)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertIncomeStatementSchema = createInsertSchema(
  incomeStatements,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateIncomeStatementSchema = createInsertSchema(incomeStatements)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertCashFlowStatementSchema = createInsertSchema(
  cashFlowStatements,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateCashFlowStatementSchema = createInsertSchema(
  cashFlowStatements,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertSupplierMachinerySchema = createInsertSchema(
  supplierMachinery,
).omit({ id: true, createdAt: true, lastUpdated: true });
export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  recordedAt: true,
});
export const insertPriceRecommendationSchema = createInsertSchema(
  priceRecommendations,
).omit({ id: true, createdAt: true, dismissedAt: true, acceptedAt: true });
export const insertComplianceDocumentSchema = createInsertSchema(
  complianceDocuments,
).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const updateComplianceDocumentSchema = createInsertSchema(
  complianceDocuments,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertComplianceRegulationSchema = createInsertSchema(
  complianceRegulations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateComplianceRegulationSchema = createInsertSchema(
  complianceRegulations,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertComplianceAuditSchema = createInsertSchema(
  complianceAudits,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateComplianceAuditSchema = createInsertSchema(complianceAudits)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertComplianceApprovalSchema = createInsertSchema(
  complianceApprovals,
).omit({ id: true, createdAt: true, requestedAt: true, respondedAt: true });
export const insertAuditFindingSchema = createInsertSchema(auditFindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateAuditFindingSchema = createInsertSchema(auditFindings)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertAuditChecklistTemplateSchema = createInsertSchema(
  auditChecklistTemplates,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertComplianceCalendarEventSchema = createInsertSchema(
  complianceCalendarEvents,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateComplianceCalendarEventSchema = createInsertSchema(
  complianceCalendarEvents,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertEmployeeTrainingRecordSchema = createInsertSchema(
  employeeTrainingRecords,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeTrainingRecordSchema = createInsertSchema(
  employeeTrainingRecords,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertProductionRunSchema = createInsertSchema(
  productionRuns,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateProductionRunSchema = createInsertSchema(productionRuns)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertProductionMetricSchema = createInsertSchema(
  productionMetrics,
).omit({ id: true, createdAt: true });
export const insertDowntimeEventSchema = createInsertSchema(
  downtimeEvents,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateDowntimeEventSchema = createInsertSchema(downtimeEvents)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertProductionBottleneckSchema = createInsertSchema(
  productionBottlenecks,
).omit({ id: true, createdAt: true, updatedAt: true, identifiedAt: true });
export const updateProductionBottleneckSchema = createInsertSchema(
  productionBottlenecks,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();

// RBAC Insert Schemas
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});
export const updateRoleSchema = createInsertSchema(roles)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertRolePermissionSchema = createInsertSchema(
  rolePermissions,
).omit({ createdAt: true });
export const insertUserRoleAssignmentSchema = createInsertSchema(
  userRoleAssignments,
).omit({ assignedAt: true });

// Team Invitation Insert Schemas
export const insertTeamInvitationSchema = createInsertSchema(
  teamInvitations,
).omit({ id: true, createdAt: true, acceptedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type CompanyLocation = typeof companyLocations.$inferSelect;
export type InsertCompanyLocation = z.infer<typeof insertCompanyLocationSchema>;
export type UpdateCompanyLocation = z.infer<typeof updateCompanyLocationSchema>;
export type Sku = typeof skus.$inferSelect;
export type InsertSku = z.infer<typeof insertSkuSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Bom = typeof boms.$inferSelect;
export type InsertBom = z.infer<typeof insertBomSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type SupplierMaterial = typeof supplierMaterials.$inferSelect;
export type InsertSupplierMaterial = z.infer<
  typeof insertSupplierMaterialSchema
>;
export type DemandHistory = typeof demandHistory.$inferSelect;
export type InsertDemandHistory = z.infer<typeof insertDemandHistorySchema>;
export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type AllocationResult = typeof allocationResults.$inferSelect;
export type InsertAllocationResult = z.infer<
  typeof insertAllocationResultSchema
>;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type Machinery = typeof machinery.$inferSelect;
export type InsertMachinery = z.infer<typeof insertMachinerySchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<
  typeof insertMaintenanceRecordSchema
>;
export type BalanceSheet = typeof balanceSheets.$inferSelect;
export type InsertBalanceSheet = z.infer<typeof insertBalanceSheetSchema>;
export type IncomeStatement = typeof incomeStatements.$inferSelect;
export type InsertIncomeStatement = z.infer<typeof insertIncomeStatementSchema>;
export type CashFlowStatement = typeof cashFlowStatements.$inferSelect;
export type InsertCashFlowStatement = z.infer<
  typeof insertCashFlowStatementSchema
>;
export type SupplierMachinery = typeof supplierMachinery.$inferSelect;
export type InsertSupplierMachinery = z.infer<
  typeof insertSupplierMachinerySchema
>;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceRecommendation = typeof priceRecommendations.$inferSelect;
export type InsertPriceRecommendation = z.infer<
  typeof insertPriceRecommendationSchema
>;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertComplianceDocument = z.infer<
  typeof insertComplianceDocumentSchema
>;
export type ComplianceRegulation = typeof complianceRegulations.$inferSelect;
export type InsertComplianceRegulation = z.infer<
  typeof insertComplianceRegulationSchema
>;
export type ComplianceAudit = typeof complianceAudits.$inferSelect;
export type InsertComplianceAudit = z.infer<typeof insertComplianceAuditSchema>;
export type ComplianceApproval = typeof complianceApprovals.$inferSelect;
export type InsertComplianceApproval = z.infer<
  typeof insertComplianceApprovalSchema
>;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type InsertAuditFinding = z.infer<typeof insertAuditFindingSchema>;
export type AuditChecklistTemplate =
  typeof auditChecklistTemplates.$inferSelect;
export type InsertAuditChecklistTemplate = z.infer<
  typeof insertAuditChecklistTemplateSchema
>;
export type ComplianceCalendarEvent =
  typeof complianceCalendarEvents.$inferSelect;
export type InsertComplianceCalendarEvent = z.infer<
  typeof insertComplianceCalendarEventSchema
>;
export type EmployeeTrainingRecord =
  typeof employeeTrainingRecords.$inferSelect;
export type InsertEmployeeTrainingRecord = z.infer<
  typeof insertEmployeeTrainingRecordSchema
>;
export type ProductionRun = typeof productionRuns.$inferSelect;
export type InsertProductionRun = z.infer<typeof insertProductionRunSchema>;
export type ProductionMetric = typeof productionMetrics.$inferSelect;
export type InsertProductionMetric = z.infer<
  typeof insertProductionMetricSchema
>;
export type DowntimeEvent = typeof downtimeEvents.$inferSelect;
export type InsertDowntimeEvent = z.infer<typeof insertDowntimeEventSchema>;
export type ProductionBottleneck = typeof productionBottlenecks.$inferSelect;
export type InsertProductionBottleneck = z.infer<
  typeof insertProductionBottleneckSchema
>;

// RBAC Types
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = z.infer<
  typeof insertUserRoleAssignmentSchema
>;

// Team Invitation Types
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;

// IoT Sensors & Predictive Maintenance schemas
export const insertEquipmentSensorSchema = createInsertSchema(
  equipmentSensors,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSensorReadingSchema = createInsertSchema(
  sensorReadings,
).omit({ id: true });
export const insertMaintenanceAlertSchema = createInsertSchema(
  maintenanceAlerts,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
});
export const insertMaintenancePredictionSchema = createInsertSchema(
  maintenancePredictions,
).omit({ id: true, createdAt: true });

export type EquipmentSensor = typeof equipmentSensors.$inferSelect;
export type InsertEquipmentSensor = z.infer<typeof insertEquipmentSensorSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type MaintenanceAlert = typeof maintenanceAlerts.$inferSelect;
export type InsertMaintenanceAlert = z.infer<
  typeof insertMaintenanceAlertSchema
>;
export type MaintenancePrediction = typeof maintenancePredictions.$inferSelect;
export type InsertMaintenancePrediction = z.infer<
  typeof insertMaintenancePredictionSchema
>;

// AI Inventory Optimization schemas
export const insertInventoryOptimizationSchema = createInsertSchema(
  inventoryOptimizations,
).omit({ id: true, analysisDate: true, createdAt: true });
export const insertDemandPredictionSchema = createInsertSchema(
  demandPredictions,
).omit({ id: true, createdAt: true });
export const insertInventoryRecommendationSchema = createInsertSchema(
  inventoryRecommendations,
).omit({ id: true, createdAt: true, implementedAt: true });
export const insertMultiHorizonForecastSchema = createInsertSchema(
  multiHorizonForecasts,
).omit({ id: true, createdAt: true });
export const insertForecastAccuracyTrackingSchema = createInsertSchema(
  forecastAccuracyTracking,
).omit({ id: true, createdAt: true });
export const insertForecastDegradationAlertSchema = createInsertSchema(
  forecastDegradationAlerts,
).omit({ id: true, createdAt: true });

export type InventoryOptimization = typeof inventoryOptimizations.$inferSelect;
export type InsertInventoryOptimization = z.infer<
  typeof insertInventoryOptimizationSchema
>;
export type DemandPrediction = typeof demandPredictions.$inferSelect;
export type InsertDemandPrediction = z.infer<
  typeof insertDemandPredictionSchema
>;
export type InventoryRecommendation =
  typeof inventoryRecommendations.$inferSelect;
export type InsertInventoryRecommendation = z.infer<
  typeof insertInventoryRecommendationSchema
>;
export type MultiHorizonForecast = typeof multiHorizonForecasts.$inferSelect;
export type InsertMultiHorizonForecast = z.infer<
  typeof insertMultiHorizonForecastSchema
>;
export type ForecastAccuracyTracking =
  typeof forecastAccuracyTracking.$inferSelect;
export type InsertForecastAccuracyTracking = z.infer<
  typeof insertForecastAccuracyTrackingSchema
>;
export type ForecastDegradationAlert =
  typeof forecastDegradationAlerts.$inferSelect;
export type InsertForecastDegradationAlert = z.infer<
  typeof insertForecastDegradationAlertSchema
>;

// Supply Chain Traceability schemas
export const insertMaterialBatchSchema = createInsertSchema(
  materialBatches,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTraceabilityEventSchema = createInsertSchema(
  traceabilityEvents,
).omit({ id: true, timestamp: true });
export const insertSupplierChainLinkSchema = createInsertSchema(
  supplierChainLinks,
).omit({ id: true, createdAt: true, updatedAt: true });

export type MaterialBatch = typeof materialBatches.$inferSelect;
export type InsertMaterialBatch = z.infer<typeof insertMaterialBatchSchema>;
export type TraceabilityEvent = typeof traceabilityEvents.$inferSelect;
export type InsertTraceabilityEvent = z.infer<
  typeof insertTraceabilityEventSchema
>;
export type SupplierChainLink = typeof supplierChainLinks.$inferSelect;
export type InsertSupplierChainLink = z.infer<
  typeof insertSupplierChainLinkSchema
>;

// Multi-Tier Supplier Mapping schemas
export const insertSupplierTierSchema = createInsertSchema(supplierTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSupplierTierSchema = createInsertSchema(supplierTiers)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertSupplierRelationshipSchema = createInsertSchema(
  supplierRelationships,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateSupplierRelationshipSchema = createInsertSchema(
  supplierRelationships,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertSupplierRegionRiskSchema = createInsertSchema(
  supplierRegionRisks,
).omit({ id: true, createdAt: true, lastUpdated: true });
export const updateSupplierRegionRiskSchema = createInsertSchema(
  supplierRegionRisks,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertSupplierTierAlertSchema = createInsertSchema(
  supplierTierAlerts,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
});
export const updateSupplierTierAlertSchema = createInsertSchema(
  supplierTierAlerts,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();

export type SupplierTier = typeof supplierTiers.$inferSelect;
export type InsertSupplierTier = z.infer<typeof insertSupplierTierSchema>;
export type UpdateSupplierTier = z.infer<typeof updateSupplierTierSchema>;
export type SupplierRelationship = typeof supplierRelationships.$inferSelect;
export type InsertSupplierRelationship = z.infer<
  typeof insertSupplierRelationshipSchema
>;
export type UpdateSupplierRelationship = z.infer<
  typeof updateSupplierRelationshipSchema
>;
export type SupplierRegionRisk = typeof supplierRegionRisks.$inferSelect;
export type InsertSupplierRegionRisk = z.infer<
  typeof insertSupplierRegionRiskSchema
>;
export type UpdateSupplierRegionRisk = z.infer<
  typeof updateSupplierRegionRiskSchema
>;
export type SupplierTierAlert = typeof supplierTierAlerts.$inferSelect;
export type InsertSupplierTierAlert = z.infer<
  typeof insertSupplierTierAlertSchema
>;
export type UpdateSupplierTierAlert = z.infer<
  typeof updateSupplierTierAlertSchema
>;

// Workforce Scheduling schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateEmployeeSchema = createInsertSchema(employees)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertWorkShiftSchema = createInsertSchema(workShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSkillRequirementSchema = createInsertSchema(
  skillRequirements,
).omit({ id: true, createdAt: true });
export const insertStaffAssignmentSchema = createInsertSchema(
  staffAssignments,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeSkillCertificationSchema = createInsertSchema(
  employeeSkillCertifications,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeSkillCertificationSchema = createInsertSchema(
  employeeSkillCertifications,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertWeeklyScheduleSchema = createInsertSchema(
  weeklySchedules,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShiftAssignmentSchema = createInsertSchema(
  shiftAssignments,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateShiftAssignmentSchema = createInsertSchema(shiftAssignments)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
export type WorkShift = typeof workShifts.$inferSelect;
export type InsertWorkShift = z.infer<typeof insertWorkShiftSchema>;
export type SkillRequirement = typeof skillRequirements.$inferSelect;
export type InsertSkillRequirement = z.infer<
  typeof insertSkillRequirementSchema
>;
export type StaffAssignment = typeof staffAssignments.$inferSelect;
export type InsertStaffAssignment = z.infer<typeof insertStaffAssignmentSchema>;
export type EmployeeSkillCertification =
  typeof employeeSkillCertifications.$inferSelect;
export type InsertEmployeeSkillCertification = z.infer<
  typeof insertEmployeeSkillCertificationSchema
>;
export type UpdateEmployeeSkillCertification = z.infer<
  typeof updateEmployeeSkillCertificationSchema
>;
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type InsertWeeklySchedule = z.infer<typeof insertWeeklyScheduleSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type UpdateShiftAssignment = z.infer<typeof updateShiftAssignmentSchema>;

// Comprehensive Employee Management schemas
export const insertEmployeePayrollSchema = createInsertSchema(
  employeePayroll,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeePayrollSchema = createInsertSchema(employeePayroll)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertEmployeeBenefitSchema = createInsertSchema(
  employeeBenefits,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeBenefitSchema = createInsertSchema(employeeBenefits)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertEmployeeDocumentSchema = createInsertSchema(
  employeeDocuments,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeDocumentSchema = createInsertSchema(
  employeeDocuments,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertEmployeeTimeOffSchema = createInsertSchema(
  employeeTimeOff,
).omit({ id: true, createdAt: true, updatedAt: true, requestedAt: true });
export const updateEmployeeTimeOffSchema = createInsertSchema(employeeTimeOff)
  .omit({ id: true, companyId: true, createdAt: true, requestedAt: true })
  .partial();
export const insertEmployeePtoBalanceSchema = createInsertSchema(
  employeePtoBalances,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeePtoBalanceSchema = createInsertSchema(
  employeePtoBalances,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertEmployeeEmergencyContactSchema = createInsertSchema(
  employeeEmergencyContacts,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeEmergencyContactSchema = createInsertSchema(
  employeeEmergencyContacts,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();
export const insertEmployeePerformanceReviewSchema = createInsertSchema(
  employeePerformanceReviews,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeePerformanceReviewSchema = createInsertSchema(
  employeePerformanceReviews,
)
  .omit({ id: true, companyId: true, createdAt: true })
  .partial();

export type EmployeePayroll = typeof employeePayroll.$inferSelect;
export type InsertEmployeePayroll = z.infer<typeof insertEmployeePayrollSchema>;
export type UpdateEmployeePayroll = z.infer<typeof updateEmployeePayrollSchema>;
export type EmployeeBenefit = typeof employeeBenefits.$inferSelect;
export type InsertEmployeeBenefit = z.infer<typeof insertEmployeeBenefitSchema>;
export type UpdateEmployeeBenefit = z.infer<typeof updateEmployeeBenefitSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<
  typeof insertEmployeeDocumentSchema
>;
export type UpdateEmployeeDocument = z.infer<
  typeof updateEmployeeDocumentSchema
>;
export type EmployeeTimeOff = typeof employeeTimeOff.$inferSelect;
export type InsertEmployeeTimeOff = z.infer<typeof insertEmployeeTimeOffSchema>;
export type UpdateEmployeeTimeOff = z.infer<typeof updateEmployeeTimeOffSchema>;
export type EmployeePtoBalance = typeof employeePtoBalances.$inferSelect;
export type InsertEmployeePtoBalance = z.infer<
  typeof insertEmployeePtoBalanceSchema
>;
export type UpdateEmployeePtoBalance = z.infer<
  typeof updateEmployeePtoBalanceSchema
>;
export type EmployeeEmergencyContact =
  typeof employeeEmergencyContacts.$inferSelect;
export type InsertEmployeeEmergencyContact = z.infer<
  typeof insertEmployeeEmergencyContactSchema
>;
export type UpdateEmployeeEmergencyContact = z.infer<
  typeof updateEmployeeEmergencyContactSchema
>;
export type EmployeePerformanceReview =
  typeof employeePerformanceReviews.$inferSelect;
export type InsertEmployeePerformanceReview = z.infer<
  typeof insertEmployeePerformanceReviewSchema
>;
export type UpdateEmployeePerformanceReview = z.infer<
  typeof updateEmployeePerformanceReviewSchema
>;

// Automatic Procurement & Purchasing
export const procurementSchedules = pgTable("procurement_schedules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  scheduleType: text("schedule_type").notNull(), // "daily", "weekly", "monthly", "quarterly"
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  dayOfWeek: integer("day_of_week"), // 1-7 for weekly
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  isActive: text("is_active").notNull().default("active"), // "active", "paused", "cancelled"
  nextOrderDate: timestamp("next_order_date").notNull(),
  lastOrderDate: timestamp("last_order_date"),
  totalOrdersPlaced: integer("total_orders_placed").notNull().default(0),
  economicRegime: text("economic_regime"),
  fdrThreshold: real("fdr_threshold"), // Only execute if FDR is below/above this
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const autoPurchaseRecommendations = pgTable(
  "auto_purchase_recommendations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    materialId: varchar("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id").references(() => suppliers.id),
    recommendationType: text("recommendation_type").notNull(), // "stock_low", "price_optimal", "counter_cyclical", "demand_spike"
    priority: text("priority").notNull(), // "critical", "high", "medium", "low"
    suggestedQuantity: real("suggested_quantity").notNull(),
    suggestedPrice: real("suggested_price"),
    currentStockLevel: real("current_stock_level"),
    projectedStockoutDate: timestamp("projected_stockout_date"),
    reasoning: text("reasoning").notNull(),
    costSavings: real("cost_savings"),
    aiConfidence: real("ai_confidence").notNull(), // 0-1
    status: text("status").notNull().default("pending"), // "pending", "auto_approved", "user_approved", "rejected", "executed"
    executedAt: timestamp("executed_at"),
    orderReference: text("order_reference"),
    economicRegime: text("economic_regime"),
    fdrAtRecommendation: real("fdr_at_recommendation"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const incomingEmails = pgTable("incoming_emails", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject").notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at").notNull(),
  emailProvider: text("email_provider"), // "gmail", "agentmail", "sendgrid_inbound"
  rawEmailData: jsonb("raw_email_data"),
  attachments: jsonb("attachments"), // Array of attachment metadata
  isProcessed: text("is_processed").notNull().default("unprocessed"), // "unprocessed", "processing", "processed", "failed"
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  relatedOrderId: text("related_order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailAnalysis = pgTable("email_analysis", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  emailId: varchar("email_id")
    .notNull()
    .references(() => incomingEmails.id, { onDelete: "cascade" }),
  analysisType: text("analysis_type").notNull(), // "price_update", "delivery_notification", "order_confirmation", "invoice", "quote", "general"
  extractedData: jsonb("extracted_data").notNull(), // Structured data extracted from email
  materials: text("materials").array(), // Material IDs mentioned
  suppliers: text("suppliers").array(), // Supplier IDs mentioned
  priceChanges: jsonb("price_changes"), // Array of {materialId, oldPrice, newPrice, effectiveDate}
  deliveryInfo: jsonb("delivery_info"), // {expectedDate, trackingNumber, carrier}
  invoiceInfo: jsonb("invoice_info"), // {invoiceNumber, amount, dueDate, items[]}
  quoteInfo: jsonb("quote_info"), // {quoteNumber, validUntil, items[], totalAmount}
  sentiment: text("sentiment"), // "positive", "neutral", "negative", "urgent"
  actionRequired: text("action_required"), // "respond", "approve_quote", "update_pricing", "track_delivery", "none"
  aiConfidence: real("ai_confidence").notNull(),
  processingNotes: text("processing_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(), // PO-2024-001, etc
    materialId: varchar("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    quantity: real("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    totalCost: real("total_cost").notNull(),
    status: text("status").notNull().default("pending"), // "pending", "in_progress", "delivered", "cancelled"
    orderDate: timestamp("order_date").notNull().defaultNow(),
    expectedDeliveryDate: timestamp("expected_delivery_date"),
    actualDeliveryDate: timestamp("actual_delivery_date"),
    trackingNumber: text("tracking_number"),
    carrier: text("carrier"),
    notes: text("notes"),
    sourceType: text("source_type").notNull(), // "manual", "scheduled", "ai_recommendation", "email_trigger"
    sourceId: text("source_id"), // ID of schedule, recommendation, or email that triggered this
    procurementScheduleId: varchar("procurement_schedule_id").references(
      () => procurementSchedules.id,
    ),
    recommendationId: varchar("recommendation_id").references(
      () => autoPurchaseRecommendations.id,
    ),
    emailId: varchar("email_id").references(() => incomingEmails.id),
    economicRegime: text("economic_regime"),
    fdrAtPurchase: real("fdr_at_purchase"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("purchase_orders_company_idx").on(table.companyId),
    index("purchase_orders_status_idx").on(table.status),
    index("purchase_orders_company_status_idx").on(
      table.companyId,
      table.status,
    ),
  ],
);

export const materialUsageTracking = pgTable("material_usage_tracking", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  usageDate: timestamp("usage_date").notNull().defaultNow(),
  quantityUsed: real("quantity_used").notNull(),
  usageType: text("usage_type").notNull(), // "production", "waste", "spoilage", "adjustment", "sample", "rework"
  productionRunId: varchar("production_run_id").references(
    () => productionRuns.id,
  ),
  skuId: varchar("sku_id").references(() => skus.id), // What was being produced
  batchNumber: text("batch_number"),
  machineId: varchar("machine_id").references(() => machinery.id),
  operatorEmployeeId: varchar("operator_employee_id").references(
    () => employees.id,
  ),
  notes: text("notes"),
  remainingStock: real("remaining_stock"), // Stock level after this usage
  costPerUnit: real("cost_per_unit"), // FIFO/LIFO cost at time of usage
  totalCost: real("total_cost"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Research Validation System - Historical Predictions & Backtesting (NOT USER-FACING)
// This validates the dual-circuit economic theory by making predictions at historical points
// and tracking accuracy over time from 2000 AD onwards
export const historicalPredictions = pgTable(
  "historical_predictions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    predictionDate: timestamp("prediction_date").notNull(), // When the prediction was made (e.g., "2008-01-15")
    targetDate: timestamp("target_date").notNull(), // What date the prediction was for (e.g., "2008-06-15")
    horizonDays: integer("horizon_days").notNull(), // Days ahead prediction (targetDate - predictionDate)

    // Dual-Circuit Variables at prediction time
    fdrAtPrediction: real("fdr_at_prediction").notNull(), // Ma*Va / Mr*Vr
    regimeAtPrediction: text("regime_at_prediction").notNull(), // HEALTHY_EXPANSION, etc.
    mrGrowthRate: real("mr_growth_rate"), // Real economy money growth
    maGrowthRate: real("ma_growth_rate"), // Asset market money growth
    vrVelocity: real("vr_velocity"), // Real economy velocity
    vaVelocity: real("va_velocity"), // Asset market velocity

    // What was predicted
    predictionType: text("prediction_type").notNull(), // "commodity_price", "economic_regime", "asset_bubble", "recession"
    itemId: varchar("item_id"), // Material/commodity ID if applicable
    itemName: text("item_name"), // Name of what's being predicted
    predictedValue: real("predicted_value"), // Predicted price or numeric value
    predictedRegime: text("predicted_regime"), // Predicted economic regime
    predictedDirection: text("predicted_direction"), // "up", "down", "stable"
    confidenceScore: real("confidence_score"), // 0-1 confidence in prediction

    // What actually happened
    actualValue: real("actual_value"), // Actual price or value at target date
    actualRegime: text("actual_regime"), // Actual regime at target date
    actualDirection: text("actual_direction"), // Actual direction of movement

    // Accuracy metrics
    absoluteError: real("absolute_error"), // |predicted - actual|
    percentageError: real("percentage_error"), // (predicted - actual) / actual * 100
    directionalAccuracy: integer("directional_accuracy"), // 1 if correct, 0 if incorrect
    regimeAccuracy: integer("regime_accuracy"), // 1 if correct, 0 if incorrect

    // Methodology tracking
    modelVersion: text("model_version").notNull().default("v1.0"), // Version of prediction algorithm
    inputIndicators: jsonb("input_indicators"), // What indicators were used
    calculationNotes: text("calculation_notes"), // How prediction was derived

    // External data sources used
    dataSource: text("data_source").notNull(), // "FRED", "Alpha Vantage", etc.
    dataQuality: text("data_quality"), // "high", "medium", "low", "estimated"

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("historical_predictions_prediction_date_idx").on(
      table.predictionDate,
    ),
    index("historical_predictions_target_date_idx").on(table.targetDate),
    index("historical_predictions_type_idx").on(table.predictionType),
  ],
);

// Aggregate accuracy metrics for the research validation system
export const predictionAccuracyMetrics = pgTable(
  "prediction_accuracy_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    metricPeriod: text("metric_period").notNull(), // "2000-2005", "2005-2010", "all_time"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Overall accuracy metrics
    totalPredictions: integer("total_predictions").notNull(),
    correctDirectionPct: real("correct_direction_pct"), // % of directional predictions that were correct
    correctRegimePct: real("correct_regime_pct"), // % of regime predictions that were correct
    meanAbsolutePercentageError: real("mean_absolute_percentage_error"), // MAPE for price predictions
    rootMeanSquareError: real("root_mean_square_error"), // RMSE for price predictions

    // Breakdown by prediction type
    commodityPriceMAPE: real("commodity_price_mape"),
    regimeChangeAccuracy: real("regime_change_accuracy"),
    assetBubbleDetection: real("asset_bubble_detection"), // % of bubbles correctly predicted
    recessionPredictionAccuracy: real("recession_prediction_accuracy"),

    // Breakdown by economic regime
    healthyExpansionAccuracy: real("healthy_expansion_accuracy"),
    assetLedGrowthAccuracy: real("asset_led_growth_accuracy"),
    imbalancedExcessAccuracy: real("imbalanced_excess_accuracy"),
    realEconomyLeadAccuracy: real("real_economy_lead_accuracy"),

    // FDR correlation with accuracy
    fdrRangeAnalysis: jsonb("fdr_range_analysis"), // Accuracy by FDR ranges
    optimalFDRThresholds: jsonb("optimal_fdr_thresholds"), // Data-driven threshold recommendations

    // Statistical significance
    sampleSize: integer("sample_size").notNull(),
    confidenceInterval95: jsonb("confidence_interval_95"), // [lower, upper] bounds
    pValue: real("p_value"), // Statistical significance vs random predictions

    // Paper validation metrics
    paperTheoryAlignment: real("paper_theory_alignment"), // How well results match paper predictions (0-1)
    unexpectedFindings: text("unexpected_findings"), // Notable deviations from theory
    improvementRecommendations: text("improvement_recommendations"),

    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("prediction_accuracy_metrics_period_idx").on(
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

// Automatic Procurement schemas
export const insertProcurementScheduleSchema = createInsertSchema(
  procurementSchedules,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutoPurchaseRecommendationSchema = createInsertSchema(
  autoPurchaseRecommendations,
).omit({ id: true, createdAt: true });
export const insertIncomingEmailSchema = createInsertSchema(
  incomingEmails,
).omit({ id: true, createdAt: true });
export const insertEmailAnalysisSchema = createInsertSchema(emailAnalysis).omit(
  { id: true, createdAt: true },
);
export const insertPurchaseOrderSchema = createInsertSchema(
  purchaseOrders,
).omit({ id: true, createdAt: true, updatedAt: true });
export const updatePurchaseOrderSchema = insertPurchaseOrderSchema.partial();
export const insertMaterialUsageTrackingSchema = createInsertSchema(
  materialUsageTracking,
).omit({ id: true, createdAt: true });

export type ProcurementSchedule = typeof procurementSchedules.$inferSelect;
export type InsertProcurementSchedule = z.infer<
  typeof insertProcurementScheduleSchema
>;
export type AutoPurchaseRecommendation =
  typeof autoPurchaseRecommendations.$inferSelect;
export type InsertAutoPurchaseRecommendation = z.infer<
  typeof insertAutoPurchaseRecommendationSchema
>;
export type IncomingEmail = typeof incomingEmails.$inferSelect;
export type InsertIncomingEmail = z.infer<typeof insertIncomingEmailSchema>;
export type EmailAnalysis = typeof emailAnalysis.$inferSelect;
export type InsertEmailAnalysis = z.infer<typeof insertEmailAnalysisSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type UpdatePurchaseOrder = z.infer<typeof updatePurchaseOrderSchema>;
export type MaterialUsageTracking = typeof materialUsageTracking.$inferSelect;
export type InsertMaterialUsageTracking = z.infer<
  typeof insertMaterialUsageTrackingSchema
>;

// Economic Snapshots
export const insertEconomicSnapshotSchema = createInsertSchema(
  economicSnapshots,
).omit({
  id: true,
  createdAt: true,
});
export type EconomicSnapshot = typeof economicSnapshots.$inferSelect;
export type InsertEconomicSnapshot = z.infer<
  typeof insertEconomicSnapshotSchema
>;

// Regime State Tracking
export const insertRegimeStateSchema = createInsertSchema(regimeState);
export const updateRegimeStateSchema = insertRegimeStateSchema.partial().required({ companyId: true });
export type RegimeState = typeof regimeState.$inferSelect;
export type InsertRegimeState = z.infer<typeof insertRegimeStateSchema>;
export type UpdateRegimeState = z.infer<typeof updateRegimeStateSchema>;

// Regime Transitions Audit Log
export const insertRegimeTransitionSchema = createInsertSchema(regimeTransitions).omit({
  id: true,
  createdAt: true,
});
export type RegimeTransition = typeof regimeTransitions.$inferSelect;
export type InsertRegimeTransition = z.infer<typeof insertRegimeTransitionSchema>;

// Model Comparison Tracking - Prove Dual-Circuit Superiority over traditional models
export const modelComparisons = pgTable(
  "model_comparisons",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    predictionDate: timestamp("prediction_date").notNull(),
    targetDate: timestamp("target_date").notNull(),
    commodity: text("commodity").notNull(), // "Aluminum", "Copper", "Steel", "Nickel", "Oil"

    // Actual outcome (ground truth)
    actualPrice: real("actual_price").notNull(),
    actualDirection: text("actual_direction").notNull(), // "up", "down", "stable"

    // Dual-Circuit FDR Model (PRIMARY - YOUR THESIS)
    dualCircuitPredicted: real("dual_circuit_predicted").notNull(),
    dualCircuitDirection: text("dual_circuit_direction").notNull(),
    dualCircuitMAPE: real("dual_circuit_mape").notNull(),
    dualCircuitCorrect: integer("dual_circuit_correct").notNull(), // 1 if direction correct, 0 if wrong

    // Quantity Theory of Money Baseline
    qtmPredicted: real("qtm_predicted").notNull(),
    qtmDirection: text("qtm_direction").notNull(),
    qtmMAPE: real("qtm_mape").notNull(),
    qtmCorrect: integer("qtm_correct").notNull(),

    // Random Walk Baseline (null hypothesis)
    randomWalkPredicted: real("random_walk_predicted").notNull(),
    randomWalkDirection: text("random_walk_direction").notNull(),
    randomWalkMAPE: real("random_walk_mape").notNull(),
    randomWalkCorrect: integer("random_walk_correct").notNull(),

    // Momentum Baseline
    momentumPredicted: real("momentum_predicted").notNull(),
    momentumDirection: text("momentum_direction").notNull(),
    momentumMAPE: real("momentum_mape").notNull(),
    momentumCorrect: integer("momentum_correct").notNull(),

    // Economic Context (for Dual-Circuit model)
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("model_comparisons_commodity_idx").on(table.commodity),
    index("model_comparisons_prediction_date_idx").on(table.predictionDate),
  ],
);

// Machinery Performance Validation - Test dual-circuit theory on equipment
export const machineryPredictions = pgTable(
  "machinery_predictions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    predictionDate: timestamp("prediction_date").notNull(),
    targetDate: timestamp("target_date").notNull(),
    machineryId: varchar("machinery_id")
      .notNull()
      .references(() => machinery.id),
    machineryType: text("machinery_type").notNull(),

    // Economic context at prediction time
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(),

    // Machinery metrics predicted
    predictedOEE: real("predicted_oee"), // Overall Equipment Effectiveness
    predictedMaintenanceCost: real("predicted_maintenance_cost"),
    predictedDowntimeHours: real("predicted_downtime_hours"),
    predictedReplacementNeed: integer("predicted_replacement_need"), // 1 if replacement recommended

    // Actual outcomes
    actualOEE: real("actual_oee"),
    actualMaintenanceCost: real("actual_maintenance_cost"),
    actualDowntimeHours: real("actual_downtime_hours"),
    actualReplacementNeed: integer("actual_replacement_need"),

    // Accuracy metrics
    oeeMAPE: real("oee_mape"),
    maintenanceCostMAPE: real("maintenance_cost_mape"),
    downtimeMAPE: real("downtime_mape"),
    replacementCorrect: integer("replacement_correct"),

    // Dual-circuit hypothesis
    hypothesis: text("hypothesis"), // "High FDR = defer capex", "Low FDR = invest in equipment"
    hypothesisConfirmed: integer("hypothesis_confirmed"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("machinery_predictions_date_idx").on(table.predictionDate),
    index("machinery_predictions_regime_idx").on(table.regime),
  ],
);

// Workforce Validation - Test dual-circuit theory on labor economics
export const workforcePredictions = pgTable(
  "workforce_predictions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    predictionDate: timestamp("prediction_date").notNull(),
    targetDate: timestamp("target_date").notNull(),

    // Economic context at prediction time
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(),

    // Workforce metrics predicted
    predictedAverageWage: real("predicted_average_wage"),
    predictedHeadcount: integer("predicted_headcount"),
    predictedTurnoverRate: real("predicted_turnover_rate"), // % annual turnover
    predictedUnemploymentRate: real("predicted_unemployment_rate"), // Local/industry rate
    predictedHiringRate: real("predicted_hiring_rate"), // New hires per month
    predictedOvertimeHours: real("predicted_overtime_hours"),
    predictedLaborProductivity: real("predicted_labor_productivity"), // Output per worker

    // Actual outcomes
    actualAverageWage: real("actual_average_wage"),
    actualHeadcount: integer("actual_headcount"),
    actualTurnoverRate: real("actual_turnover_rate"),
    actualUnemploymentRate: real("actual_unemployment_rate"),
    actualHiringRate: real("actual_hiring_rate"),
    actualOvertimeHours: real("actual_overtime_hours"),
    actualLaborProductivity: real("actual_labor_productivity"),

    // Accuracy metrics
    wageMAPE: real("wage_mape"),
    headcountMAPE: real("headcount_mape"),
    turnoverMAPE: real("turnover_mape"),
    unemploymentMAPE: real("unemployment_mape"),
    hiringMAPE: real("hiring_mape"),
    overtimeMAPE: real("overtime_mape"),
    productivityMAPE: real("productivity_mape"),

    // Dual-circuit hypothesis
    hypothesis: text("hypothesis"), // "High FDR = wage pressure + layoffs", "Low FDR = wage growth + hiring"
    hypothesisConfirmed: integer("hypothesis_confirmed"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workforce_predictions_date_idx").on(table.predictionDate),
    index("workforce_predictions_regime_idx").on(table.regime),
  ],
);

// ============================================================================
// FEATURE TOGGLES SYSTEM
// ============================================================================
export const featureToggles = pgTable(
  "feature_toggles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(), // 'scenario_planning', 'geopolitical_risk', etc.
    enabled: integer("enabled").notNull().default(0), // 0 = disabled, 1 = enabled
    enabledAt: timestamp("enabled_at"),
    enabledBy: varchar("enabled_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("feature_toggles_company_idx").on(table.companyId),
    uniqueIndex("feature_toggles_unique_idx").on(
      table.companyId,
      table.featureKey,
    ),
  ],
);

// ============================================================================
// SUPPLY CHAIN NETWORK INTELLIGENCE
// ============================================================================

// Extended supplier nodes with FDR-aware health metrics
export const supplierNodes = pgTable(
  "supplier_nodes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    tier: integer("tier").notNull().default(1), // 1 = direct, 2 = sub-tier, etc.
    criticality: text("criticality").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
    region: text("region"), // Geographic location

    // Financial health indicators
    currentFDR: real("current_fdr"), // Supplier's own FDR if available
    financialHealthScore: real("financial_health_score"), // 0-100 score
    bankruptcyRisk: real("bankruptcy_risk"), // 0-100 probability
    creditRating: text("credit_rating"),

    // Performance metrics
    onTimeDeliveryRate: real("on_time_delivery_rate"), // %
    qualityScore: real("quality_score"), // 0-100
    capacityUtilization: real("capacity_utilization"), // %

    // Economic exposure
    regimeExposure: text("regime_exposure"), // Which regime they're in
    commodityExposure: jsonb("commodity_exposure"), // Which commodities affect them

    lastHealthCheck: timestamp("last_health_check"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("supplier_nodes_company_idx").on(table.companyId),
    index("supplier_nodes_criticality_idx").on(table.criticality),
    index("supplier_nodes_health_idx").on(table.financialHealthScore),
  ],
);

// Network connections between suppliers (supply chain graph)
export const supplierLinks = pgTable(
  "supplier_links",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fromNodeId: varchar("from_node_id")
      .notNull()
      .references(() => supplierNodes.id, { onDelete: "cascade" }),
    toNodeId: varchar("to_node_id")
      .notNull()
      .references(() => supplierNodes.id, { onDelete: "cascade" }),
    materialId: varchar("material_id").references(() => materials.id), // What's being supplied
    dependencyStrength: real("dependency_strength").notNull().default(1.0), // 0-1 how critical
    leadTimeDays: integer("lead_time_days"),
    annualVolume: real("annual_volume"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("supplier_links_company_idx").on(table.companyId),
    index("supplier_links_from_idx").on(table.fromNodeId),
    index("supplier_links_to_idx").on(table.toNodeId),
  ],
);

// Time-series supplier health metrics
export const supplierHealthMetrics = pgTable(
  "supplier_health_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    supplierNodeId: varchar("supplier_node_id")
      .notNull()
      .references(() => supplierNodes.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),

    // Economic context
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(),

    // Financial metrics
    revenueGrowth: real("revenue_growth"), // % YoY
    profitMargin: real("profit_margin"), // %
    debtToEquity: real("debt_to_equity"),
    cashReserves: real("cash_reserves"), // Days of operating cash

    // Operational metrics
    productionCapacity: real("production_capacity"), // % of max
    inventoryTurnover: real("inventory_turnover"),
    employeeCount: integer("employee_count"),
    employeeTurnover: real("employee_turnover"), // % annual

    // Risk indicators
    riskScore: real("risk_score").notNull(), // 0-100 composite risk
    disruptionProbability: real("disruption_probability"), // 0-100

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("supplier_health_metrics_node_idx").on(table.supplierNodeId),
    index("supplier_health_metrics_timestamp_idx").on(table.timestamp),
    index("supplier_health_metrics_risk_idx").on(table.riskScore),
  ],
);

// Cascading risk alerts for supply chain
export const supplierRiskAlerts = pgTable(
  "supplier_risk_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplierNodeId: varchar("supplier_node_id")
      .notNull()
      .references(() => supplierNodes.id, { onDelete: "cascade" }),

    alertType: text("alert_type").notNull(), // 'financial_distress', 'quality_decline', 'capacity_shortage', 'bankruptcy_risk'
    severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'

    title: text("title").notNull(),
    description: text("description").notNull(),

    // Risk context
    fdr: real("fdr"),
    regime: text("regime"),
    riskScore: real("risk_score"),

    // Recommendations
    recommendedAction: text("recommended_action"), // 'find_alternative', 'increase_inventory', 'negotiate_terms'
    alternativeSuppliers: jsonb("alternative_suppliers"), // Array of supplier IDs
    estimatedImpact: real("estimated_impact"), // $ impact if disruption occurs

    // Cascading impact
    affectedMaterials: jsonb("affected_materials"), // Material IDs affected
    affectedSkus: jsonb("affected_skus"), // SKU IDs affected
    downstreamRisk: real("downstream_risk"), // Risk to your operations (0-100)

    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("supplier_risk_alerts_company_idx").on(table.companyId),
    index("supplier_risk_alerts_severity_idx").on(table.severity),
    index("supplier_risk_alerts_resolved_idx").on(table.resolvedAt),
  ],
);

// ============================================================================
// AUTOMATED PURCHASE ORDER EXECUTION
// ============================================================================

// Smart PO generation rules based on FDR regimes
export const poRules = pgTable(
  "po_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    enabled: integer("enabled").notNull().default(1),

    // Trigger conditions
    materialId: varchar("material_id").references(() => materials.id),
    supplierId: varchar("supplier_id").references(() => suppliers.id),

    // FDR-based triggers
    fdrMin: real("fdr_min"), // Trigger when FDR >= this
    fdrMax: real("fdr_max"), // Trigger when FDR <= this
    regime: text("regime"), // Trigger only in this regime

    // Inventory triggers
    inventoryMin: real("inventory_min"), // Trigger when inventory falls below
    inventoryMax: real("inventory_max"), // Don't trigger if inventory above this

    // Price triggers
    priceMin: real("price_min"), // Only buy if price <= this
    priceMax: real("price_max"), // Don't buy if price >= this
    priceChange: real("price_change"), // Trigger on % price movement

    // Order parameters
    orderQuantity: real("order_quantity"), // Fixed quantity
    orderDuration: integer("order_duration"), // Days of supply to order
    maxOrderValue: real("max_order_value"), // $ cap on order

    // Approval requirements
    requiresApproval: integer("requires_approval").notNull().default(0),
    approvalThreshold: real("approval_threshold"), // $ value requiring approval

    priority: integer("priority").notNull().default(1), // Higher = more important

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [
    index("po_rules_company_idx").on(table.companyId),
    index("po_rules_enabled_idx").on(table.enabled),
  ],
);

// PO approval workflows
export const poWorkflowSteps = pgTable(
  "po_workflow_steps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseOrderId: varchar("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    stepType: text("step_type").notNull(), // 'approval', 'review', 'notification'

    assignedTo: varchar("assigned_to").references(() => users.id),
    assignedRole: text("assigned_role"), // 'procurement_manager', 'cfo', 'ceo'

    status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'skipped'
    comments: text("comments"),

    completedAt: timestamp("completed_at"),
    completedBy: varchar("completed_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("po_workflow_steps_po_idx").on(table.purchaseOrderId),
    index("po_workflow_steps_assigned_idx").on(table.assignedTo),
    index("po_workflow_steps_status_idx").on(table.status),
  ],
);

// Approval records
export const poApprovals = pgTable(
  "po_approvals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseOrderId: varchar("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    workflowStepId: varchar("workflow_step_id").references(
      () => poWorkflowSteps.id,
    ),

    approverType: text("approver_type").notNull(), // 'user', 'automatic', 'rule_based'
    approverId: varchar("approver_id").references(() => users.id),

    decision: text("decision").notNull(), // 'approved', 'rejected', 'conditional'
    justification: text("justification"), // FDR regime context, cost savings, etc.

    // FDR context at approval time
    fdr: real("fdr"),
    regime: text("regime"),

    conditions: jsonb("conditions"), // Any conditions placed on approval

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("po_approvals_po_idx").on(table.purchaseOrderId),
    index("po_approvals_approver_idx").on(table.approverId),
  ],
);

// Negotiation playbook templates
export const negotiationPlaybooks = pgTable(
  "negotiation_playbooks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),

    // Regime-specific strategies
    regime: text("regime"), // Which regime this playbook is for
    fdrMin: real("fdr_min"),
    fdrMax: real("fdr_max"),

    // Negotiation tactics
    strategy: text("strategy").notNull(), // 'aggressive_discount', 'volume_commit', 'long_term_lock', 'spot_pricing'
    scriptTemplate: text("script_template"), // Email/conversation template
    targetDiscount: real("target_discount"), // % discount to aim for

    // Terms to negotiate
    paymentTerms: text("payment_terms"), // 'net_30', 'net_60', 'prepaid_discount'
    contractDuration: integer("contract_duration"), // Days
    volumeCommitment: real("volume_commitment"),
    priceIndexing: text("price_indexing"), // 'fdr_indexed', 'cpi_indexed', 'fixed'

    // Success metrics
    usageCount: integer("usage_count").notNull().default(0),
    avgSavings: real("avg_savings"), // Average % saved using this playbook

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [
    index("negotiation_playbooks_company_idx").on(table.companyId),
    index("negotiation_playbooks_regime_idx").on(table.regime),
  ],
);

// ERP connection configurations
export const erpConnections = pgTable(
  "erp_connections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    erpSystem: text("erp_system").notNull(), // 'sap', 'oracle', 'dynamics', 'netsuite', 'custom'
    erpVersion: text("erp_version"),

    // Connection details (encrypted in production)
    apiEndpoint: text("api_endpoint"),
    authMethod: text("auth_method"), // 'oauth', 'api_key', 'basic'
    credentialsEncrypted: text("credentials_encrypted"), // Encrypted JSON

    // Capabilities
    canReadPOs: integer("can_read_pos").notNull().default(0),
    canCreatePOs: integer("can_create_pos").notNull().default(0),
    canUpdatePOs: integer("can_update_pos").notNull().default(0),
    canReadInventory: integer("can_read_inventory").notNull().default(0),

    // Status
    status: text("status").notNull().default("inactive"), // 'active', 'inactive', 'error'
    lastSync: timestamp("last_sync"),
    lastError: text("last_error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [
    index("erp_connections_company_idx").on(table.companyId),
    index("erp_connections_status_idx").on(table.status),
  ],
);

// ============================================================================
// INDUSTRY DATA CONSORTIUM
// ============================================================================

// Anonymous contributions from companies
export const consortiumContributions = pgTable(
  "consortium_contributions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contributionDate: timestamp("contribution_date").notNull().defaultNow(),

    // Anonymized aggregate data (NO companyId to ensure privacy)
    anonymousId: varchar("anonymous_id").notNull(), // Cryptographically hashed company ID - cannot be reverse-engineered
    industrySector: text("industry_sector"), // 'automotive', 'aerospace', 'electronics', etc.
    companySize: text("company_size"), // 'small', 'medium', 'large', 'enterprise'
    region: text("region"), // 'north_america', 'europe', 'asia', etc.

    // Economic regime context
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(),

    // Procurement data (anonymized)
    commodityPurchases: jsonb("commodity_purchases"), // {materialType: avgPrice, volume}
    avgProcurementSavings: real("avg_procurement_savings"), // % vs market

    // Machinery data
    avgOEE: real("avg_oee"),
    avgMaintenanceCost: real("avg_maintenance_cost"),

    // Workforce data
    avgWageGrowth: real("avg_wage_growth"), // %
    avgTurnover: real("avg_turnover"), // %

    // Performance indicators
    marginImpact: real("margin_impact"), // % impact from regime
    inventoryTurns: real("inventory_turns"),

    // Privacy flags
    optedIn: integer("opted_in").notNull().default(1),
    dataRetentionDays: integer("data_retention_days").notNull().default(730), // 2 years

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("consortium_contributions_date_idx").on(table.contributionDate),
    index("consortium_contributions_regime_idx").on(table.regime),
    index("consortium_contributions_sector_idx").on(table.industrySector),
  ],
);

// Aggregated consortium metrics (derived from contributions)
export const consortiumMetrics = pgTable(
  "consortium_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    metricDate: timestamp("metric_date").notNull(),

    // Segmentation
    industrySector: text("industry_sector"),
    companySize: text("company_size"),
    region: text("region"),
    regime: text("regime").notNull(),

    // Sample size
    contributorCount: integer("contributor_count").notNull(),

    // Aggregated procurement metrics
    medianCommodityPrice: jsonb("median_commodity_price"), // {material: price}
    p25CommodityPrice: jsonb("p25_commodity_price"),
    p75CommodityPrice: jsonb("p75_commodity_price"),
    avgProcurementSavings: real("avg_procurement_savings"),

    // Aggregated performance metrics
    medianOEE: real("median_oee"),
    p25OEE: real("p25_oee"),
    p75OEE: real("p75_oee"),

    medianTurnover: real("median_turnover"),
    p25Turnover: real("p25_turnover"),
    p75Turnover: real("p75_turnover"),

    // Best practices indicators
    topDecileProcurementSavings: real("top_decile_procurement_savings"),
    topDecileOEE: real("top_decile_oee"),
    topDecileTurnover: real("top_decile_turnover"),

    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  },
  (table) => [
    index("consortium_metrics_date_idx").on(table.metricDate),
    index("consortium_metrics_regime_idx").on(table.regime),
    index("consortium_metrics_sector_idx").on(table.industrySector),
  ],
);

// Early warning alerts from consortium data
export const consortiumAlerts = pgTable(
  "consortium_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    alertDate: timestamp("alert_date").notNull().defaultNow(),

    alertType: text("alert_type").notNull(), // 'regime_shift_early_warning', 'price_anomaly', 'performance_divergence'
    severity: text("severity").notNull(), // 'info', 'warning', 'critical'

    title: text("title").notNull(),
    description: text("description").notNull(),

    // Consortium signal
    regime: text("regime"),
    affectedSectors: jsonb("affected_sectors"), // Array of industry sectors
    signalStrength: real("signal_strength"), // 0-100 confidence

    // Leading indicator data
    peerAction: text("peer_action"), // What are peers doing?
    peerPerformance: jsonb("peer_performance"), // How are peers performing?

    // Recommendations
    recommendedAction: text("recommended_action"),
    estimatedImpact: real("estimated_impact"), // Potential $ impact

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("consortium_alerts_date_idx").on(table.alertDate),
    index("consortium_alerts_severity_idx").on(table.severity),
  ],
);

// ============================================================================
// M&A INTELLIGENCE
// ============================================================================

// Potential acquisition targets or divestiture candidates
export const maTargets = pgTable(
  "ma_targets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    targetType: text("target_type").notNull(), // 'acquisition', 'divestiture', 'joint_venture'

    // Target company info
    targetName: text("target_name").notNull(),
    targetIndustry: text("target_industry"),
    targetRevenue: real("target_revenue"),
    targetEmployees: integer("target_employees"),
    targetRegion: text("target_region"),

    // FDR-based valuation
    currentFDR: real("current_fdr"),
    currentRegime: text("current_regime"),
    targetFDR: real("target_fdr"), // Target company's FDR if known
    targetRegime: text("target_regime"),

    // Valuation metrics
    estimatedValue: real("estimated_value"), // $
    fdrAdjustedValue: real("fdr_adjusted_value"), // $ adjusted for regime
    marketMultiple: real("market_multiple"), // EV/EBITDA
    fdrAdjustedMultiple: real("fdr_adjusted_multiple"), // Regime-adjusted multiple

    // Strategic fit
    strategicFitScore: real("strategic_fit_score"), // 0-100
    synergyPotential: real("synergy_potential"), // $ annual synergies
    integrationComplexity: text("integration_complexity"), // 'low', 'medium', 'high'

    // Timing recommendation
    timingScore: real("timing_score"), // 0-100 how good is timing now
    timingRationale: text("timing_rationale"), // Why buy/sell now vs. wait
    optimalRegimeForDeal: text("optimal_regime_for_deal"),

    // Risk factors
    regulatoryRisk: real("regulatory_risk"), // 0-100
    culturalRisk: real("cultural_risk"), // 0-100
    financialRisk: real("financial_risk"), // 0-100

    status: text("status").notNull().default("evaluating"), // 'evaluating', 'pursuing', 'on_hold', 'rejected', 'completed'

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [
    index("ma_targets_company_idx").on(table.companyId),
    index("ma_targets_status_idx").on(table.status),
    index("ma_targets_timing_idx").on(table.timingScore),
  ],
);

// M&A scenario modeling
export const maScenarios = pgTable(
  "ma_scenarios",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    maTargetId: varchar("ma_target_id")
      .notNull()
      .references(() => maTargets.id, { onDelete: "cascade" }),

    scenarioName: text("scenario_name").notNull(),
    description: text("description"),

    // Deal structure
    dealValue: real("deal_value").notNull(), // $
    cashPortion: real("cash_portion"), // % or $
    stockPortion: real("stock_portion"), // % or $
    debtAssumed: real("debt_assumed"), // $

    // Economic assumptions
    assumedFDR: real("assumed_fdr").notNull(),
    assumedRegime: text("assumed_regime").notNull(),
    regimeDuration: integer("regime_duration"), // Months

    // Projected outcomes
    projectedSynergies: real("projected_synergies"), // $ annual
    synergyCaptureRate: real("synergy_capture_rate"), // % of synergies realized
    integrationCost: real("integration_cost"), // $ one-time
    integrationTimeline: integer("integration_timeline"), // Months

    // Financial projections
    year1Revenue: real("year1_revenue"),
    year1EBITDA: real("year1_ebitda"),
    year3Revenue: real("year3_revenue"),
    year3EBITDA: real("year3_ebitda"),

    // Returns
    projectedROI: real("projected_roi"), // % IRR
    paybackPeriod: real("payback_period"), // Years

    // Risk adjustments
    riskAdjustedROI: real("risk_adjusted_roi"),
    fdrVolatilityImpact: real("fdr_volatility_impact"), // How regime changes affect returns

    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [index("ma_scenarios_target_idx").on(table.maTargetId)],
);

// Integration risk assessment
export const maIntegrationRisks = pgTable(
  "ma_integration_risks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    maTargetId: varchar("ma_target_id")
      .notNull()
      .references(() => maTargets.id, { onDelete: "cascade" }),

    riskCategory: text("risk_category").notNull(), // 'supply_chain', 'workforce', 'technology', 'culture', 'financial'
    riskTitle: text("risk_title").notNull(),
    riskDescription: text("risk_description"),

    severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
    probability: real("probability"), // 0-100
    impact: real("impact"), // $ if risk materializes

    // FDR regime context
    regimeSensitivity: text("regime_sensitivity"), // Which regimes amplify this risk
    fdrImpact: text("fdr_impact"), // How FDR changes affect this risk

    // Mitigation
    mitigationStrategy: text("mitigation_strategy"),
    mitigationCost: real("mitigation_cost"), // $
    residualRisk: real("residual_risk"), // Risk after mitigation (0-100)

    ownerRole: text("owner_role"), // Who manages this risk

    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [
    index("ma_integration_risks_target_idx").on(table.maTargetId),
    index("ma_integration_risks_severity_idx").on(table.severity),
  ],
);

// M&A recommendations based on FDR regimes
export const maRecommendations = pgTable(
  "ma_recommendations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    maTargetId: varchar("ma_target_id").references(() => maTargets.id),

    recommendationType: text("recommendation_type").notNull(), // 'buy_now', 'wait', 'sell_now', 'explore'

    title: text("title").notNull(),
    summary: text("summary").notNull(),
    detailedRationale: text("detailed_rationale"),

    // FDR-based timing
    currentFDR: real("current_fdr").notNull(),
    currentRegime: text("current_regime").notNull(),
    optimalFDRRange: text("optimal_fdr_range"), // e.g., "1.0-1.3"

    // Valuation insights
    currentValuation: real("current_valuation"),
    fdrNormalizedValuation: real("fdr_normalized_valuation"),
    potentialDiscount: real("potential_discount"), // % vs intrinsic value

    // Action items
    actionItems: jsonb("action_items"), // Array of next steps
    timeline: text("timeline"), // "Execute within 30 days", "Wait 6 months"

    confidence: real("confidence"), // 0-100

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ma_recommendations_company_idx").on(table.companyId),
    index("ma_recommendations_type_idx").on(table.recommendationType),
  ],
);

// ============================================================================
// SCENARIO PLANNING & WHAT-IF SIMULATOR (OPTIONAL FEATURE)
// ============================================================================

export const scenarios = pgTable(
  "scenarios",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),
    scenarioType: text("scenario_type").notNull(), // 'regime_transition', 'commodity_shock', 'multi_variable', 'custom'

    // Base state (current reality)
    baselineFDR: real("baseline_fdr"),
    baselineRegime: text("baseline_regime"),
    baselineDate: timestamp("baseline_date"),

    // Scenario assumptions
    targetFDR: real("target_fdr"),
    targetRegime: text("target_regime"),
    transitionDuration: integer("transition_duration"), // Days to transition

    status: text("status").notNull().default("draft"), // 'draft', 'running', 'completed'

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  },
  (table) => [
    index("scenarios_company_idx").on(table.companyId),
    index("scenarios_status_idx").on(table.status),
  ],
);

// Variables to test in scenario
export const scenarioVariables = pgTable(
  "scenario_variables",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scenarioId: varchar("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),

    variableType: text("variable_type").notNull(), // 'fdr', 'commodity_price', 'demand', 'capacity', 'wage_rate'
    variableName: text("variable_name").notNull(),

    // Baseline value
    baselineValue: real("baseline_value"),
    baselineUnit: text("baseline_unit"),

    // Scenario value
    scenarioValue: real("scenario_value"),
    changePercentage: real("change_percentage"), // % change from baseline

    // Linking
    materialId: varchar("material_id").references(() => materials.id),
    skuId: varchar("sku_id").references(() => skus.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("scenario_variables_scenario_idx").on(table.scenarioId)],
);

// Scenario outputs and projections
export const scenarioOutputs = pgTable(
  "scenario_outputs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scenarioId: varchar("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),

    outputCategory: text("output_category").notNull(), // 'financial', 'operational', 'workforce', 'risk'
    outputName: text("output_name").notNull(),

    // Baseline vs. scenario comparison
    baselineValue: real("baseline_value"),
    scenarioValue: real("scenario_value"),
    delta: real("delta"),
    deltaPercentage: real("delta_percentage"),

    unit: text("unit"),

    // Impact classification
    impactType: text("impact_type"), // 'cost_increase', 'cost_decrease', 'revenue_impact', 'risk_change'
    impactValue: real("impact_value"), // $ value of impact

    // Time-based projection
    forecastHorizonDays: integer("forecast_horizon_days"),
    confidenceLevel: real("confidence_level"), // 0-100

    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  },
  (table) => [
    index("scenario_outputs_scenario_idx").on(table.scenarioId),
    index("scenario_outputs_category_idx").on(table.outputCategory),
  ],
);

// ============================================================================
// GEOPOLITICAL RISK INTELLIGENCE (OPTIONAL FEATURE)
// ============================================================================

// Geopolitical events that may impact supply chains
export const geopoliticalEvents = pgTable(
  "geopolitical_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    eventType: text("event_type").notNull(), // 'tariff', 'sanction', 'trade_agreement', 'conflict', 'regulation'
    title: text("title").notNull(),
    description: text("description"),

    // Geographic scope
    affectedRegions: jsonb("affected_regions"), // Array of regions
    affectedCountries: jsonb("affected_countries"), // Array of country codes

    // Timing
    eventDate: timestamp("event_date"),
    effectiveDate: timestamp("effective_date"),
    expirationDate: timestamp("expiration_date"),

    // Impact assessment
    severity: text("severity"), // 'low', 'medium', 'high', 'critical'
    commoditiesAffected: jsonb("commodities_affected"), // Array of material types
    industriesAffected: jsonb("industries_affected"),

    // Source and confidence
    source: text("source"), // 'government', 'news', 'analysis', 'internal'
    sourceUrl: text("source_url"),
    confidence: real("confidence"), // 0-100

    status: text("status").notNull().default("active"), // 'active', 'resolved', 'monitoring'

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("geopolitical_events_date_idx").on(table.eventDate),
    index("geopolitical_events_severity_idx").on(table.severity),
    index("geopolitical_events_status_idx").on(table.status),
  ],
);

// Company-specific geopolitical impacts
export const geopoliticalImpacts = pgTable(
  "geopolitical_impacts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    geopoliticalEventId: varchar("geopolitical_event_id")
      .notNull()
      .references(() => geopoliticalEvents.id),

    // Impact assessment
    impactType: text("impact_type").notNull(), // 'cost_increase', 'supply_disruption', 'market_access', 'regulatory_burden'
    impactSeverity: text("impact_severity").notNull(), // 'low', 'medium', 'high', 'critical'

    // Financial impact
    estimatedCostImpact: real("estimated_cost_impact"), // $ annual
    estimatedRevenueImpact: real("estimated_revenue_impact"), // $ annual

    // Operational impact
    affectedSuppliers: jsonb("affected_suppliers"), // Supplier IDs
    affectedMaterials: jsonb("affected_materials"), // Material IDs
    affectedMarkets: jsonb("affected_markets"), // Geographic markets

    // FDR context
    fdrAtAssessment: real("fdr_at_assessment"),
    regimeAtAssessment: text("regime_at_assessment"),
    fdrAmplification: real("fdr_amplification"), // How much FDR regime amplifies impact (1.0 = no change, 2.0 = doubles)

    // Mitigation strategies
    mitigationPlan: text("mitigation_plan"),
    mitigationCost: real("mitigation_cost"), // $
    mitigationTimeline: integer("mitigation_timeline"), // Days
    residualRisk: real("residual_risk"), // 0-100 after mitigation

    // Status tracking
    status: text("status").notNull().default("assessing"), // 'assessing', 'mitigating', 'monitoring', 'resolved'

    assignedTo: varchar("assigned_to").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("geopolitical_impacts_company_idx").on(table.companyId),
    index("geopolitical_impacts_event_idx").on(table.geopoliticalEventId),
    index("geopolitical_impacts_severity_idx").on(table.impactSeverity),
  ],
);

// Regional FDR snapshots for divergence analysis
export const regionalFdrSnapshots = pgTable(
  "regional_fdr_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),
    region: text("region").notNull(), // 'north_america', 'europe', 'china', 'india', 'japan', etc.
    country: text("country"), // More granular than region

    // Regional economic indicators
    fdr: real("fdr").notNull(),
    regime: text("regime").notNull(),
    gdpGrowth: real("gdp_growth"), // % YoY
    inflation: real("inflation"), // %
    unemployment: real("unemployment"), // %

    // Manufacturing indicators
    pmIndex: real("pm_index"), // Purchasing Managers Index
    industrialProduction: real("industrial_production"), // Index or % change

    // Currency
    currencyCode: text("currency_code"),
    exchangeRateUSD: real("exchange_rate_usd"),

    // Divergence from global
    fdrDivergence: real("fdr_divergence"), // Difference from global FDR
    regimeMismatch: integer("regime_mismatch"), // 1 if different regime than global

    // Source
    source: text("source").notNull().default("calculated"), // 'calculated', 'external_api'

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("regional_fdr_snapshots_date_idx").on(table.snapshotDate),
    index("regional_fdr_snapshots_region_idx").on(table.region),
    index("regional_fdr_snapshots_divergence_idx").on(table.fdrDivergence),
  ],
);

// ============================================================================
// INSERT SCHEMAS & TYPES FOR NEW FEATURES
// ============================================================================

// Feature Toggles
export const insertFeatureToggleSchema = createInsertSchema(
  featureToggles,
).omit({ id: true, createdAt: true, updatedAt: true });
export type FeatureToggle = typeof featureToggles.$inferSelect;
export type InsertFeatureToggle = z.infer<typeof insertFeatureToggleSchema>;

// Supply Chain Network Intelligence
export const insertSupplierNodeSchema = createInsertSchema(supplierNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSupplierLinkSchema = createInsertSchema(supplierLinks).omit({
  id: true,
  createdAt: true,
});
export const insertSupplierHealthMetricsSchema = createInsertSchema(
  supplierHealthMetrics,
).omit({ id: true, createdAt: true });
export const insertSupplierRiskAlertSchema = createInsertSchema(
  supplierRiskAlerts,
).omit({ id: true, createdAt: true });

export type SupplierNode = typeof supplierNodes.$inferSelect;
export type InsertSupplierNode = z.infer<typeof insertSupplierNodeSchema>;
export type SupplierLink = typeof supplierLinks.$inferSelect;
export type InsertSupplierLink = z.infer<typeof insertSupplierLinkSchema>;
export type SupplierHealthMetrics = typeof supplierHealthMetrics.$inferSelect;
export type InsertSupplierHealthMetrics = z.infer<
  typeof insertSupplierHealthMetricsSchema
>;
export type SupplierRiskAlert = typeof supplierRiskAlerts.$inferSelect;
export type InsertSupplierRiskAlert = z.infer<
  typeof insertSupplierRiskAlertSchema
>;

// Automated PO Execution
export const insertPoRuleSchema = createInsertSchema(poRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPoWorkflowStepSchema = createInsertSchema(
  poWorkflowSteps,
).omit({ id: true, createdAt: true });
export const insertPoApprovalSchema = createInsertSchema(poApprovals).omit({
  id: true,
  createdAt: true,
});
export const insertNegotiationPlaybookSchema = createInsertSchema(
  negotiationPlaybooks,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertErpConnectionSchema = createInsertSchema(
  erpConnections,
).omit({ id: true, createdAt: true, updatedAt: true });

export type PoRule = typeof poRules.$inferSelect;
export type InsertPoRule = z.infer<typeof insertPoRuleSchema>;
export type PoWorkflowStep = typeof poWorkflowSteps.$inferSelect;
export type InsertPoWorkflowStep = z.infer<typeof insertPoWorkflowStepSchema>;
export type PoApproval = typeof poApprovals.$inferSelect;
export type InsertPoApproval = z.infer<typeof insertPoApprovalSchema>;
export type NegotiationPlaybook = typeof negotiationPlaybooks.$inferSelect;
export type InsertNegotiationPlaybook = z.infer<
  typeof insertNegotiationPlaybookSchema
>;
export type ErpConnection = typeof erpConnections.$inferSelect;
export type InsertErpConnection = z.infer<typeof insertErpConnectionSchema>;

// Industry Data Consortium
export const insertConsortiumContributionSchema = createInsertSchema(
  consortiumContributions,
).omit({ id: true, createdAt: true });
export const insertConsortiumMetricsSchema = createInsertSchema(
  consortiumMetrics,
).omit({ id: true, calculatedAt: true });
export const insertConsortiumAlertSchema = createInsertSchema(
  consortiumAlerts,
).omit({ id: true, createdAt: true });

export type ConsortiumContribution =
  typeof consortiumContributions.$inferSelect;
export type InsertConsortiumContribution = z.infer<
  typeof insertConsortiumContributionSchema
>;
export type ConsortiumMetrics = typeof consortiumMetrics.$inferSelect;
export type InsertConsortiumMetrics = z.infer<
  typeof insertConsortiumMetricsSchema
>;
export type ConsortiumAlert = typeof consortiumAlerts.$inferSelect;
export type InsertConsortiumAlert = z.infer<typeof insertConsortiumAlertSchema>;

// M&A Intelligence
export const insertMaTargetSchema = createInsertSchema(maTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMaScenarioSchema = createInsertSchema(maScenarios).omit({
  id: true,
  createdAt: true,
});
export const insertMaIntegrationRiskSchema = createInsertSchema(
  maIntegrationRisks,
).omit({ id: true, createdAt: true });
export const insertMaRecommendationSchema = createInsertSchema(
  maRecommendations,
).omit({ id: true, createdAt: true });

export type MaTarget = typeof maTargets.$inferSelect;
export type InsertMaTarget = z.infer<typeof insertMaTargetSchema>;
export type MaScenario = typeof maScenarios.$inferSelect;
export type InsertMaScenario = z.infer<typeof insertMaScenarioSchema>;
export type MaIntegrationRisk = typeof maIntegrationRisks.$inferSelect;
export type InsertMaIntegrationRisk = z.infer<
  typeof insertMaIntegrationRiskSchema
>;
export type MaRecommendation = typeof maRecommendations.$inferSelect;
export type InsertMaRecommendation = z.infer<
  typeof insertMaRecommendationSchema
>;

// Scenario Planning (OPTIONAL FEATURE)
export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertScenarioVariableSchema = createInsertSchema(
  scenarioVariables,
).omit({ id: true, createdAt: true });
export const insertScenarioOutputSchema = createInsertSchema(
  scenarioOutputs,
).omit({ id: true, calculatedAt: true });

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type ScenarioVariable = typeof scenarioVariables.$inferSelect;
export type InsertScenarioVariable = z.infer<
  typeof insertScenarioVariableSchema
>;
export type ScenarioOutput = typeof scenarioOutputs.$inferSelect;
export type InsertScenarioOutput = z.infer<typeof insertScenarioOutputSchema>;

// Geopolitical Risk Intelligence (OPTIONAL FEATURE)
export const insertGeopoliticalEventSchema = createInsertSchema(
  geopoliticalEvents,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGeopoliticalImpactSchema = createInsertSchema(
  geopoliticalImpacts,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRegionalFdrSnapshotSchema = createInsertSchema(
  regionalFdrSnapshots,
).omit({ id: true, createdAt: true });

export type GeopoliticalEvent = typeof geopoliticalEvents.$inferSelect;
export type InsertGeopoliticalEvent = z.infer<
  typeof insertGeopoliticalEventSchema
>;
export type GeopoliticalImpact = typeof geopoliticalImpacts.$inferSelect;
export type InsertGeopoliticalImpact = z.infer<
  typeof insertGeopoliticalImpactSchema
>;
export type RegionalFdrSnapshot = typeof regionalFdrSnapshots.$inferSelect;
export type InsertRegionalFdrSnapshot = z.infer<
  typeof insertRegionalFdrSnapshotSchema
>;

// Research Validation System schemas
export const insertHistoricalPredictionSchema = createInsertSchema(
  historicalPredictions,
).omit({ id: true, createdAt: true });
// Model Calibration Results - 10,000+ test iterations
export const modelCalibrationResults = pgTable(
  "model_calibration_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    totalIterations: integer("total_iterations").notNull(),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    status: text("status").notNull().default("running"),
    bestParams: jsonb("best_params").notNull(),
    bestPerformance: jsonb("best_performance").notNull(),
    averagePerformance: jsonb("average_performance").notNull(),
    parameterSensitivity: jsonb("parameter_sensitivity").notNull(),
    thesisValidation: jsonb("thesis_validation").notNull(),
    recommendations: jsonb("recommendations").notNull(),
    allResults: jsonb("all_results"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("model_calibration_results_company_idx").on(table.companyId),
  ],
);

export const insertPredictionAccuracyMetricsSchema = createInsertSchema(
  predictionAccuracyMetrics,
).omit({ id: true, createdAt: true, calculatedAt: true });
export const insertModelComparisonSchema = createInsertSchema(
  modelComparisons,
).omit({ id: true, createdAt: true });
export const insertMachineryPredictionSchema = createInsertSchema(
  machineryPredictions,
).omit({ id: true, createdAt: true });
export const insertWorkforcePredictionSchema = createInsertSchema(
  workforcePredictions,
).omit({ id: true, createdAt: true });
export const insertModelCalibrationResultSchema = createInsertSchema(
  modelCalibrationResults,
).omit({ id: true, createdAt: true });

// Saved Scenarios & Bookmarks - Feature Enhancement
export const savedScenarios = pgTable(
  "saved_scenarios",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(), // 'economic', 'geopolitical', 'combined'
    configuration: jsonb("configuration").notNull(), // Stores form data for reuse
    tags: text("tags").array(), // For categorization and search
    isTemplate: integer("is_template").notNull().default(0), // 0 = saved result, 1 = reusable template
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("saved_scenarios_company_idx").on(table.companyId),
    index("saved_scenarios_user_idx").on(table.userId),
    index("saved_scenarios_type_idx").on(table.type),
  ],
);

export const scenarioBookmarks = pgTable(
  "scenario_bookmarks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    savedScenarioId: varchar("saved_scenario_id").references(
      () => savedScenarios.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(),
    notes: text("notes"),
    results: jsonb("results").notNull(), // Complete analysis results
    fdrAtTime: real("fdr_at_time"),
    regimeAtTime: text("regime_at_time"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scenario_bookmarks_company_idx").on(table.companyId),
    index("scenario_bookmarks_user_idx").on(table.userId),
  ],
);

// Scenario Simulations ("What-If" Analysis)
export const scenarioSimulations = pgTable(
  "scenario_simulations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    baseFdrValue: real("base_fdr_value").notNull(),
    baseRegime: text("base_regime").notNull(),
    baseCommodityInputs: jsonb("base_commodity_inputs"), // Initial commodity prices/settings
    status: text("status").notNull().default("draft"), // 'draft', 'running', 'completed', 'archived'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("scenario_simulations_company_idx").on(table.companyId),
    index("scenario_simulations_created_by_idx").on(table.createdById),
    index("scenario_simulations_status_idx").on(table.status),
  ],
);

export const scenarioVariants = pgTable(
  "scenario_variants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    simulationId: varchar("simulation_id")
      .notNull()
      .references(() => scenarioSimulations.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // e.g., "Optimistic", "Pessimistic", "Base Case"
    fdrValue: real("fdr_value").notNull(),
    regime: text("regime").notNull(),
    commodityAdjustments: jsonb("commodity_adjustments"), // Price changes per commodity
    procurementImpact: real("procurement_impact"), // % change in procurement costs
    inventoryImpact: real("inventory_impact"), // % change in inventory levels
    allocationImpact: jsonb("allocation_impact"), // Detailed allocation changes
    forecastImpact: jsonb("forecast_impact"), // Impact on demand forecasts
    budgetImpact: real("budget_impact"), // Impact on budget utilization
    riskScore: real("risk_score"), // Overall risk score for this variant
    comparisonMeta: jsonb("comparison_meta"), // Additional comparison data
    isBaseline: integer("is_baseline").default(0), // 1 if this is the baseline scenario
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("scenario_variants_simulation_idx").on(table.simulationId)],
);

// Supplier Risk Scoring with FDR Signals
export const supplierRiskSnapshots = pgTable(
  "supplier_risk_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    regime: text("regime").notNull(), // Economic regime at time of evaluation
    fdrValue: real("fdr_value"), // FDR value at evaluation
    fdrSignalStrength: real("fdr_signal_strength"), // How strong the FDR signal is (0-1)
    baseScore: real("base_score").notNull(), // Risk score before FDR adjustment (0-100)
    adjustedScore: real("adjusted_score").notNull(), // Risk score after FDR adjustment (0-100)
    riskTier: text("risk_tier").notNull(), // 'low', 'medium', 'high', 'critical'
    riskFactors: jsonb("risk_factors"), // Breakdown of risk factors
    recommendations: jsonb("recommendations"), // Actionable recommendations
    // Component scores
    financialHealthScore: real("financial_health_score"),
    geographicRiskScore: real("geographic_risk_score"),
    concentrationRiskScore: real("concentration_risk_score"),
    performanceScore: real("performance_score"),
    regimeImpactScore: real("regime_impact_score"), // How current regime affects this supplier
    evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
    nextEvaluationDue: timestamp("next_evaluation_due"),
    isLatest: integer("is_latest").default(1), // 1 if this is the most recent snapshot
  },
  (table) => [
    index("supplier_risk_snapshots_company_idx").on(table.companyId),
    index("supplier_risk_snapshots_supplier_idx").on(table.supplierId),
    index("supplier_risk_snapshots_regime_idx").on(table.regime),
    index("supplier_risk_snapshots_tier_idx").on(table.riskTier),
    index("supplier_risk_snapshots_latest_idx").on(table.isLatest),
  ],
);

// Smart Alerts & Monitoring
export const fdrAlerts = pgTable(
  "fdr_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    condition: text("condition").notNull(), // 'above', 'below', 'crosses_above', 'crosses_below'
    threshold: real("threshold").notNull(),
    isActive: integer("is_active").notNull().default(1),
    lastTriggered: timestamp("last_triggered"),
    notificationMethod: text("notification_method").notNull().default("in_app"), // 'in_app', 'email'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("fdr_alerts_company_idx").on(table.companyId),
    index("fdr_alerts_active_idx").on(table.isActive),
  ],
);

export const commodityPriceAlerts = pgTable(
  "commodity_price_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: varchar("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    condition: text("condition").notNull(), // 'above', 'below', 'change_pct'
    threshold: real("threshold").notNull(),
    changePercentage: real("change_percentage"), // For 'change_pct' condition
    timeframe: text("timeframe"), // 'daily', 'weekly', 'monthly'
    isActive: integer("is_active").notNull().default(1),
    lastTriggered: timestamp("last_triggered"),
    notificationMethod: text("notification_method").notNull().default("in_app"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("commodity_price_alerts_company_idx").on(table.companyId),
    index("commodity_price_alerts_material_idx").on(table.materialId),
    index("commodity_price_alerts_active_idx").on(table.isActive),
  ],
);

export const regimeChangeNotifications = pgTable(
  "regime_change_notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fromRegime: text("from_regime").notNull(),
    toRegime: text("to_regime").notNull(),
    fdrAtChange: real("fdr_at_change").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    acknowledged: integer("acknowledged").notNull().default(0),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("regime_change_notifications_company_idx").on(table.companyId),
    index("regime_change_notifications_timestamp_idx").on(table.timestamp),
  ],
);

export const alertTriggers = pgTable(
  "alert_triggers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    alertType: text("alert_type").notNull(), // 'fdr', 'commodity_price', 'regime_change'
    alertId: varchar("alert_id").notNull(), // References the specific alert
    triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
    currentValue: real("current_value"),
    thresholdValue: real("threshold_value"),
    message: text("message").notNull(),
    acknowledged: integer("acknowledged").notNull().default(0),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at"),
  },
  (table) => [
    index("alert_triggers_company_idx").on(table.companyId),
    index("alert_triggers_acknowledged_idx").on(table.acknowledged),
  ],
);

// ================================================================================
// S&OP (Sales & Operations Planning) Workspace
// ================================================================================

// S&OP Planning Scenarios - Different demand/supply planning scenarios
export const sopScenarios = pgTable(
  "sop_scenarios",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "Q1 2025 Baseline", "Optimistic Growth", etc.
    scenarioType: text("scenario_type").notNull(), // "baseline", "optimistic", "pessimistic", "custom"
    planningPeriod: text("planning_period").notNull(), // "monthly", "quarterly", "annual"
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),

    // Demand assumptions
    demandGrowthRate: real("demand_growth_rate"), // % growth expected
    seasonalityFactors: jsonb("seasonality_factors"), // Monthly/quarterly seasonality adjustments

    // Supply assumptions
    productionCapacity: real("production_capacity"), // Units per period
    materialAvailability: real("material_availability"), // % of materials available
    supplierReliability: real("supplier_reliability"), // % reliability score

    // Financial assumptions
    budgetAllocation: real("budget_allocation"),
    costInflationRate: real("cost_inflation_rate"), // % expected cost increase

    // Status and ownership
    status: text("status").notNull().default("draft"), // "draft", "active", "archived"
    createdBy: varchar("created_by").references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_scenarios_company_idx").on(table.companyId),
    index("sop_scenarios_status_idx").on(table.status),
    index("sop_scenarios_period_idx").on(table.startDate, table.endDate),
  ],
);

// S&OP Gap Analysis - Tracking demand vs supply gaps
export const sopGapAnalysis = pgTable(
  "sop_gap_analysis",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    scenarioId: varchar("scenario_id").references(() => sopScenarios.id, {
      onDelete: "cascade",
    }),

    // Time period
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Demand side
    forecastedDemand: real("forecasted_demand").notNull(), // Total units
    demandByProduct: jsonb("demand_by_product"), // { skuId: quantity }

    // Supply side
    plannedProduction: real("planned_production").notNull(), // Total units
    productionCapacity: real("production_capacity"), // Max possible units
    materialConstraints: jsonb("material_constraints"), // { materialId: shortage }

    // Gap calculation
    gapQuantity: real("gap_quantity").notNull(), // demand - supply (negative = surplus)
    gapPercentage: real("gap_percentage"), // gap / demand * 100
    gapCategory: text("gap_category").notNull(), // "surplus", "balanced", "shortage_minor", "shortage_critical"

    // Recommended actions
    recommendedAction: text("recommended_action"),
    estimatedImpact: real("estimated_impact"), // Financial impact if gap not addressed

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_gap_analysis_company_idx").on(table.companyId),
    index("sop_gap_analysis_scenario_idx").on(table.scenarioId),
    index("sop_gap_analysis_period_idx").on(table.periodStart),
  ],
);

// S&OP Meeting Notes - Record of monthly S&OP meetings
export const sopMeetingNotes = pgTable(
  "sop_meeting_notes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    meetingDate: timestamp("meeting_date").notNull(),
    meetingType: text("meeting_type").notNull().default("monthly"), // "monthly", "quarterly", "ad_hoc"

    // Participants
    attendees: jsonb("attendees"), // Array of { userId, name, role }
    facilitator: varchar("facilitator").references(() => users.id),

    // Content
    agendaItems: jsonb("agenda_items"), // Array of agenda topics
    keyDecisions: text("key_decisions"), // Major decisions made
    notes: text("notes"), // General meeting notes

    // Scenarios discussed
    scenariosReviewed: jsonb("scenarios_reviewed"), // Array of scenario IDs
    approvedScenario: varchar("approved_scenario").references(
      () => sopScenarios.id,
    ),

    // Follow-up
    nextMeetingDate: timestamp("next_meeting_date"),
    attachments: jsonb("attachments"), // Array of file references

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_meeting_notes_company_idx").on(table.companyId),
    index("sop_meeting_notes_date_idx").on(table.meetingDate),
  ],
);

// S&OP Action Items - Tasks and decisions from S&OP meetings
export const sopActionItems = pgTable(
  "sop_action_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    meetingId: varchar("meeting_id").references(() => sopMeetingNotes.id, {
      onDelete: "cascade",
    }),
    scenarioId: varchar("scenario_id").references(() => sopScenarios.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(), // "demand", "supply", "financial", "process_improvement"
    priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "critical"

    // Ownership
    assignedTo: varchar("assigned_to").references(() => users.id),
    reportingTo: varchar("reporting_to").references(() => users.id),

    // Timeline
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),

    // Status tracking
    status: text("status").notNull().default("open"), // "open", "in_progress", "blocked", "completed", "cancelled"
    blockers: text("blockers"), // Description of any blockers
    progress: integer("progress").default(0), // 0-100 percentage

    // Impact and outcomes
    expectedImpact: text("expected_impact"),
    actualOutcome: text("actual_outcome"),
    relatedGapId: varchar("related_gap_id").references(() => sopGapAnalysis.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_action_items_company_idx").on(table.companyId),
    index("sop_action_items_status_idx").on(table.status),
    index("sop_action_items_assigned_idx").on(table.assignedTo),
    index("sop_action_items_due_idx").on(table.dueDate),
  ],
);

// ============================================================================
// AUTOMATED RFQ GENERATION
// ============================================================================

// RFQs - Request for Quotations automatically generated based on inventory and regime signals
export const rfqs = pgTable(
  "rfqs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // RFQ Details
    rfqNumber: text("rfq_number").notNull(), // Human-readable RFQ number (e.g., "RFQ-2024-001")
    title: text("title").notNull(),
    description: text("description"),

    // Material Information
    materialId: varchar("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    requestedQuantity: real("requested_quantity").notNull(),
    unit: text("unit").notNull(),

    // Regime Context (captured at time of generation)
    regimeAtGeneration: text("regime_at_generation").notNull(), // "expansionary", "contractionary", "transitional"
    fdrAtGeneration: real("fdr_at_generation").notNull(),
    policySignal: text("policy_signal"), // "buy_aggressively", "buy_conservatively", "wait", etc.

    // Generation Trigger
    isAutoGenerated: integer("is_auto_generated").notNull().default(1), // 1 = auto-generated, 0 = manual
    triggerReason: text("trigger_reason"), // "low_inventory", "regime_change", "forecast_spike", "manual"
    inventoryLevelAtTrigger: real("inventory_level_at_trigger"), // Material inventory when triggered
    reorderPointThreshold: real("reorder_point_threshold"), // Threshold that triggered the RFQ

    // Urgency & Timing
    priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "urgent"
    dueDate: timestamp("due_date"),
    expectedDeliveryDate: timestamp("expected_delivery_date"),

    // Status Tracking
    status: text("status").notNull().default("draft"), // "draft", "pending_approval", "sent", "quotes_received", "awarded", "cancelled"
    sentAt: timestamp("sent_at"),
    closedAt: timestamp("closed_at"),

    // Supplier Management
    targetSupplierIds: text("target_supplier_ids").array(), // Array of supplier IDs to send RFQ to
    quotesReceived: integer("quotes_received").default(0),
    bestQuotePrice: real("best_quote_price"),
    bestQuoteSupplierId: varchar("best_quote_supplier_id").references(
      () => suppliers.id,
    ),

    // Ownership
    createdBy: varchar("created_by").references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    // Additional Context
    notes: text("notes"),
    internalNotes: text("internal_notes"), // Notes not shared with suppliers
    attachments: jsonb("attachments"), // Array of file references

    // Audit
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("rfqs_company_idx").on(table.companyId),
    index("rfqs_status_idx").on(table.status),
    index("rfqs_material_idx").on(table.materialId),
    index("rfqs_created_at_idx").on(table.createdAt),
    uniqueIndex("rfqs_company_number_unique").on(
      table.companyId,
      table.rfqNumber,
    ),
  ],
);

// RFQ Supplier Quotes - Responses from suppliers to RFQs
export const rfqQuotes = pgTable(
  "rfq_quotes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    rfqId: varchar("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),

    // Quote Details
    unitPrice: real("unit_price").notNull(),
    totalPrice: real("total_price").notNull(),
    quantity: real("quantity").notNull(),
    currency: text("currency").notNull().default("USD"),

    // Terms
    leadTimeDays: integer("lead_time_days").notNull(),
    validUntil: timestamp("valid_until"),
    paymentTerms: text("payment_terms"),
    deliveryTerms: text("delivery_terms"),

    // Status
    status: text("status").notNull().default("received"), // "received", "under_review", "accepted", "rejected"
    isWinningQuote: integer("is_winning_quote").default(0), // 1 if this quote was selected

    // Metadata
    notes: text("notes"),
    attachments: jsonb("attachments"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    reviewedBy: varchar("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rfq_quotes_rfq_idx").on(table.rfqId),
    index("rfq_quotes_supplier_idx").on(table.supplierId),
  ],
);

// ==========================================
// PEER BENCHMARKING (INDUSTRY DATA CONSORTIUM)
// ==========================================

// Benchmark Submissions - Anonymized material cost data from companies
export const benchmarkSubmissions = pgTable(
  "benchmark_submissions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Material Classification (standardized for cross-company comparison)
    materialCategory: text("material_category").notNull(), // "Metals", "Polymers", "Electronics", etc.
    materialSubcategory: text("material_subcategory"), // "Aluminum", "Steel", "Copper", etc.
    materialName: text("material_name").notNull(), // Generic name (e.g., "Aluminum Sheet 6061")

    // Cost Data
    unitCost: real("unit_cost").notNull(), // Cost per unit
    unit: text("unit").notNull(), // "kg", "ton", "piece", etc.
    currency: text("currency").notNull().default("USD"),

    // Volume & Context
    purchaseVolume: real("purchase_volume"), // Monthly/annual volume purchased
    volumePeriod: text("volume_period").default("monthly"), // "monthly", "quarterly", "annual"

    // Company Context (anonymized in aggregates)
    companyIndustry: text("company_industry"), // From companies.industry
    companySize: text("company_size"), // From companies.companySize
    companyLocation: text("company_location"), // Generalized region (e.g., "Northeast US")

    // Temporal Data
    snapshotDate: timestamp("snapshot_date").notNull(), // When this data was captured

    // Data Quality & Consent
    dataQuality: text("data_quality").default("verified"), // "verified", "estimated", "supplier_quoted"
    shareConsent: integer("share_consent").notNull().default(1), // 1 = consent to share anonymized data

    // Audit
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("benchmark_submissions_company_idx").on(table.companyId),
    index("benchmark_submissions_category_idx").on(
      table.materialCategory,
      table.materialSubcategory,
    ),
    index("benchmark_submissions_snapshot_idx").on(table.snapshotDate),
    index("benchmark_submissions_industry_idx").on(table.companyIndustry),
  ],
);

// Benchmark Aggregates - Pre-computed industry averages for fast comparison
export const benchmarkAggregates = pgTable(
  "benchmark_aggregates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Material Classification
    materialCategory: text("material_category").notNull(),
    materialSubcategory: text("material_subcategory"),
    materialName: text("material_name").notNull(),
    unit: text("unit").notNull(),

    // Segmentation (for comparing apples to apples)
    industry: text("industry"), // Filter to specific industry or null for all industries
    companySize: text("company_size"), // Filter to company size or null for all sizes
    region: text("region"), // Geographic region or null for all regions

    // Aggregate Statistics
    participantCount: integer("participant_count").notNull(), // Number of companies contributing (min 3 for privacy)
    averageCost: real("average_cost").notNull(), // Mean cost per unit
    medianCost: real("median_cost").notNull(), // Median cost per unit
    minCost: real("min_cost").notNull(), // Minimum cost (5th percentile for privacy)
    maxCost: real("max_cost").notNull(), // Maximum cost (95th percentile for privacy)
    standardDeviation: real("standard_deviation"), // Cost variation

    // Percentiles (for detailed comparison)
    p25Cost: real("p25_cost"), // 25th percentile
    p75Cost: real("p75_cost"), // 75th percentile
    p90Cost: real("p90_cost"), // 90th percentile

    // Volume-Weighted Statistics (larger buyers may get better prices)
    volumeWeightedAvgCost: real("volume_weighted_avg_cost"),
    totalVolume: real("total_volume"), // Total industry volume for this material

    // Temporal Context
    snapshotMonth: text("snapshot_month").notNull(), // "2024-01" format for monthly aggregation
    calculatedAt: timestamp("calculated_at").notNull().defaultNow(),

    // Data Quality
    dataQualityScore: real("data_quality_score"), // 0-100 score based on submission quality
    isPublished: integer("is_published").default(0), // 1 = available for customer viewing

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("benchmark_aggregates_category_idx").on(
      table.materialCategory,
      table.materialSubcategory,
    ),
    index("benchmark_aggregates_snapshot_idx").on(table.snapshotMonth),
    index("benchmark_aggregates_industry_idx").on(table.industry),
    uniqueIndex("benchmark_aggregates_unique").on(
      table.materialCategory,
      table.materialSubcategory,
      table.materialName,
      table.unit,
      table.industry,
      table.companySize,
      table.region,
      table.snapshotMonth,
    ),
  ],
);

// Benchmark Comparisons - Store individual company comparisons against industry
export const benchmarkComparisons = pgTable(
  "benchmark_comparisons",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Reference to submission and aggregate
    submissionId: varchar("submission_id")
      .notNull()
      .references(() => benchmarkSubmissions.id, { onDelete: "cascade" }),
    aggregateId: varchar("aggregate_id")
      .notNull()
      .references(() => benchmarkAggregates.id, { onDelete: "cascade" }),

    // Comparison Results
    companyCost: real("company_cost").notNull(),
    industryCost: real("industry_cost").notNull(), // Average from aggregate
    costDifferencePercent: real("cost_difference_percent").notNull(), // (company - industry) / industry * 100
    costDifferenceAbsolute: real("cost_difference_absolute").notNull(),

    // Percentile Ranking
    companyPercentile: real("company_percentile"), // Where company ranks (0-100)

    // Insights
    competitivePosition: text("competitive_position"), // "below_average", "average", "above_average", "significantly_above"
    savingsOpportunity: real("savings_opportunity"), // Potential annual savings if matched industry average

    // Temporal
    comparisonDate: timestamp("comparison_date").notNull().defaultNow(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("benchmark_comparisons_company_idx").on(table.companyId),
    index("benchmark_comparisons_submission_idx").on(table.submissionId),
  ],
);

// Demand Signal Sources - Configure external signal sources
export const demandSignalSources = pgTable(
  "demand_signal_sources",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 100 }).notNull(),
    sourceType: text("source_type").notNull(), // "pos", "ecommerce", "distributor", "erp", "manual", "api", "edi"
    description: text("description"),

    isActive: boolean("is_active").default(true).notNull(),
    refreshFrequency: text("refresh_frequency").default("daily"), // "realtime", "hourly", "daily", "weekly"
    lastSyncAt: timestamp("last_sync_at"),

    configuration: jsonb("configuration"), // API endpoints, credentials ref, etc.

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("demand_signal_sources_company_idx").on(table.companyId),
    index("demand_signal_sources_type_idx").on(table.sourceType),
  ],
);

// Demand Signals - Individual demand signal entries
export const demandSignals = pgTable(
  "demand_signals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sourceId: varchar("source_id").references(() => demandSignalSources.id, {
      onDelete: "set null",
    }),

    skuId: varchar("sku_id").references(() => skus.id, { onDelete: "cascade" }),
    materialId: varchar("material_id").references(() => materials.id, {
      onDelete: "cascade",
    }),

    signalType: text("signal_type").notNull(), // "order", "forecast", "promotion", "seasonality", "trend", "event", "market"
    signalDate: timestamp("signal_date").notNull(),

    quantity: real("quantity").notNull(),
    unit: varchar("unit", { length: 20 }),

    confidence: real("confidence"), // 0-100
    priority: text("priority").default("medium"), // "low", "medium", "high", "critical"

    region: varchar("region", { length: 100 }),
    channel: varchar("channel", { length: 100 }), // "retail", "wholesale", "ecommerce", "direct"
    customer: varchar("customer", { length: 255 }),

    economicRegime: text("economic_regime"), // Regime at signal time
    fdrAtSignal: real("fdr_at_signal"),

    attributes: jsonb("attributes"), // Flexible attributes
    notes: text("notes"),

    isProcessed: boolean("is_processed").default(false).notNull(),
    processedAt: timestamp("processed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("demand_signals_company_idx").on(table.companyId),
    index("demand_signals_sku_idx").on(table.skuId),
    index("demand_signals_material_idx").on(table.materialId),
    index("demand_signals_date_idx").on(table.signalDate),
    index("demand_signals_type_idx").on(table.signalType),
    index("demand_signals_source_idx").on(table.sourceId),
  ],
);

// Demand Signal Aggregates - Daily/weekly/monthly rollups
export const demandSignalAggregates = pgTable(
  "demand_signal_aggregates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    skuId: varchar("sku_id").references(() => skus.id, { onDelete: "cascade" }),
    materialId: varchar("material_id").references(() => materials.id, {
      onDelete: "cascade",
    }),

    aggregationPeriod: text("aggregation_period").notNull(), // "daily", "weekly", "monthly"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    totalSignals: integer("total_signals").notNull(),
    totalQuantity: real("total_quantity").notNull(),
    avgConfidence: real("avg_confidence"),

    bySignalType: jsonb("by_signal_type"), // { "order": 100, "forecast": 50 }
    byChannel: jsonb("by_channel"), // { "retail": 80, "ecommerce": 70 }
    byRegion: jsonb("by_region"), // { "NA": 100, "EU": 50 }

    trendDirection: text("trend_direction"), // "increasing", "stable", "decreasing"
    trendStrength: real("trend_strength"), // Percentage change
    volatility: real("volatility"),

    economicRegime: text("economic_regime"),
    fdrAtAggregate: real("fdr_at_aggregate"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("demand_signal_aggregates_company_idx").on(table.companyId),
    index("demand_signal_aggregates_sku_idx").on(table.skuId),
    index("demand_signal_aggregates_period_idx").on(
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

// Saved Scenarios schemas
export const insertSavedScenarioSchema = createInsertSchema(
  savedScenarios,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScenarioBookmarkSchema = createInsertSchema(
  scenarioBookmarks,
).omit({ id: true, createdAt: true });

// Scenario Simulation schemas
export const insertScenarioSimulationSchema = createInsertSchema(
  scenarioSimulations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScenarioVariantSchema = createInsertSchema(
  scenarioVariants,
).omit({ id: true, createdAt: true });

// Supplier Risk Scoring schemas
export const insertSupplierRiskSnapshotSchema = createInsertSchema(
  supplierRiskSnapshots,
).omit({ id: true, evaluatedAt: true });

// Audit Logs schemas
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Smart Alerts schemas
export const insertFdrAlertSchema = createInsertSchema(fdrAlerts).omit({
  id: true,
  createdAt: true,
});
export const insertCommodityPriceAlertSchema = createInsertSchema(
  commodityPriceAlerts,
).omit({ id: true, createdAt: true });
export const insertRegimeChangeNotificationSchema = createInsertSchema(
  regimeChangeNotifications,
).omit({ id: true, createdAt: true });
export const insertAlertTriggerSchema = createInsertSchema(alertTriggers).omit({
  id: true,
});

export type HistoricalPrediction = typeof historicalPredictions.$inferSelect;
export type InsertHistoricalPrediction = z.infer<
  typeof insertHistoricalPredictionSchema
>;
export type PredictionAccuracyMetrics =
  typeof predictionAccuracyMetrics.$inferSelect;
export type InsertPredictionAccuracyMetrics = z.infer<
  typeof insertPredictionAccuracyMetricsSchema
>;
export type ModelComparison = typeof modelComparisons.$inferSelect;
export type InsertModelComparison = z.infer<typeof insertModelComparisonSchema>;
export type MachineryPrediction = typeof machineryPredictions.$inferSelect;
export type InsertMachineryPrediction = z.infer<
  typeof insertMachineryPredictionSchema
>;
export type WorkforcePrediction = typeof workforcePredictions.$inferSelect;
export type InsertWorkforcePrediction = z.infer<
  typeof insertWorkforcePredictionSchema
>;
export type ModelCalibrationResult =
  typeof modelCalibrationResults.$inferSelect;
export type InsertModelCalibrationResult = z.infer<
  typeof insertModelCalibrationResultSchema
>;

// Saved Scenarios & Bookmarks types
export type SavedScenario = typeof savedScenarios.$inferSelect;
export type InsertSavedScenario = z.infer<typeof insertSavedScenarioSchema>;
export type ScenarioBookmark = typeof scenarioBookmarks.$inferSelect;
export type InsertScenarioBookmark = z.infer<
  typeof insertScenarioBookmarkSchema
>;

// Scenario Simulation types
export type ScenarioSimulation = typeof scenarioSimulations.$inferSelect;
export type InsertScenarioSimulation = z.infer<
  typeof insertScenarioSimulationSchema
>;
export type ScenarioVariant = typeof scenarioVariants.$inferSelect;
export type InsertScenarioVariant = z.infer<typeof insertScenarioVariantSchema>;

// Supplier Risk Scoring types
export type SupplierRiskSnapshot = typeof supplierRiskSnapshots.$inferSelect;
export type InsertSupplierRiskSnapshot = z.infer<
  typeof insertSupplierRiskSnapshotSchema
>;

// Audit Logs types
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Smart Alerts types
export type FdrAlert = typeof fdrAlerts.$inferSelect;
export type InsertFdrAlert = z.infer<typeof insertFdrAlertSchema>;
export type CommodityPriceAlert = typeof commodityPriceAlerts.$inferSelect;
export type InsertCommodityPriceAlert = z.infer<
  typeof insertCommodityPriceAlertSchema
>;
export type RegimeChangeNotification =
  typeof regimeChangeNotifications.$inferSelect;
export type InsertRegimeChangeNotification = z.infer<
  typeof insertRegimeChangeNotificationSchema
>;
export type AlertTrigger = typeof alertTriggers.$inferSelect;
export type InsertAlertTrigger = z.infer<typeof insertAlertTriggerSchema>;

// S&OP Workspace schemas
export const insertSopScenarioSchema = createInsertSchema(sopScenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSopGapAnalysisSchema = createInsertSchema(
  sopGapAnalysis,
).omit({ id: true, createdAt: true });
export const insertSopMeetingNotesSchema = createInsertSchema(
  sopMeetingNotes,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSopActionItemSchema = createInsertSchema(
  sopActionItems,
).omit({ id: true, createdAt: true, updatedAt: true });

// S&OP Workspace types
export type SopScenario = typeof sopScenarios.$inferSelect;
export type InsertSopScenario = z.infer<typeof insertSopScenarioSchema>;
export type SopGapAnalysis = typeof sopGapAnalysis.$inferSelect;
export type InsertSopGapAnalysis = z.infer<typeof insertSopGapAnalysisSchema>;
export type SopMeetingNotes = typeof sopMeetingNotes.$inferSelect;
export type InsertSopMeetingNotes = z.infer<typeof insertSopMeetingNotesSchema>;
export type SopActionItem = typeof sopActionItems.$inferSelect;
export type InsertSopActionItem = z.infer<typeof insertSopActionItemSchema>;

// RFQ schemas
export const insertRfqSchema = createInsertSchema(rfqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRfqQuoteSchema = createInsertSchema(rfqQuotes).omit({
  id: true,
  createdAt: true,
});

// RFQ types
export type Rfq = typeof rfqs.$inferSelect;
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type RfqQuote = typeof rfqQuotes.$inferSelect;
export type InsertRfqQuote = z.infer<typeof insertRfqQuoteSchema>;

// Benchmark schemas
export const insertBenchmarkSubmissionSchema = createInsertSchema(
  benchmarkSubmissions,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBenchmarkAggregateSchema = createInsertSchema(
  benchmarkAggregates,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBenchmarkComparisonSchema = createInsertSchema(
  benchmarkComparisons,
).omit({ id: true, createdAt: true });

// Benchmark types
export type BenchmarkSubmission = typeof benchmarkSubmissions.$inferSelect;
export type InsertBenchmarkSubmission = z.infer<
  typeof insertBenchmarkSubmissionSchema
>;
export type BenchmarkAggregate = typeof benchmarkAggregates.$inferSelect;
export type InsertBenchmarkAggregate = z.infer<
  typeof insertBenchmarkAggregateSchema
>;
export type BenchmarkComparison = typeof benchmarkComparisons.$inferSelect;
export type InsertBenchmarkComparison = z.infer<
  typeof insertBenchmarkComparisonSchema
>;

// Demand Signal Repository schemas
export const insertDemandSignalSourceSchema = createInsertSchema(
  demandSignalSources,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDemandSignalSchema = createInsertSchema(demandSignals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDemandSignalAggregateSchema = createInsertSchema(
  demandSignalAggregates,
).omit({ id: true, createdAt: true, updatedAt: true });

// Demand Signal Repository types
export type DemandSignalSource = typeof demandSignalSources.$inferSelect;
export type InsertDemandSignalSource = z.infer<
  typeof insertDemandSignalSourceSchema
>;
export type DemandSignal = typeof demandSignals.$inferSelect;
export type InsertDemandSignal = z.infer<typeof insertDemandSignalSchema>;
export type DemandSignalAggregate = typeof demandSignalAggregates.$inferSelect;
export type InsertDemandSignalAggregate = z.infer<
  typeof insertDemandSignalAggregateSchema
>;

// ============================================
// ROI DASHBOARD & METRICS
// ============================================

// ROI Metrics - Track savings, accuracy improvements, and time saved
export const roiMetrics = pgTable(
  "roi_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    metricType: text("metric_type").notNull(), // "procurement_savings", "forecast_accuracy", "time_saved", "inventory_reduction"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Value metrics
    value: real("value").notNull(), // The actual metric value
    unit: text("unit").notNull(), // "dollars", "percent", "hours", "units"

    // Comparison values
    baselineValue: real("baseline_value"), // What it was before optimization
    improvement: real("improvement"), // Absolute improvement
    improvementPercent: real("improvement_percent"), // Percentage improvement

    // Context
    economicRegime: text("economic_regime"),
    fdrAtPeriod: real("fdr_at_period"),

    // Attribution
    source: text("source"), // "rfq_optimization", "regime_timing", "forecast_model", "automated_allocation"
    details: jsonb("details"), // Additional context specific to the metric type

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("roi_metrics_company_idx").on(table.companyId),
    index("roi_metrics_type_idx").on(table.metricType),
    index("roi_metrics_period_idx").on(table.periodStart, table.periodEnd),
  ],
);

// ROI Summary - Aggregated ROI dashboard data
export const roiSummary = pgTable(
  "roi_summary",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    periodType: text("period_type").notNull(), // "weekly", "monthly", "quarterly", "yearly"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Procurement Savings
    totalProcurementSavings: real("total_procurement_savings").default(0),
    regimeTimingSavings: real("regime_timing_savings").default(0), // Savings from buying at right regime
    supplierOptimizationSavings: real("supplier_optimization_savings").default(
      0,
    ),
    bulkPurchaseSavings: real("bulk_purchase_savings").default(0),

    // Forecast Accuracy
    avgForecastMape: real("avg_forecast_mape"), // Average MAPE across all SKUs
    forecastAccuracyImprovement: real("forecast_accuracy_improvement"), // % improvement
    skusWithImprovedAccuracy: integer("skus_with_improved_accuracy"),
    totalSkusTracked: integer("total_skus_tracked"),

    // Time Savings
    hoursAutoRfq: real("hours_auto_rfq").default(0), // Hours saved from automated RFQ
    hoursAutoRetraining: real("hours_auto_retraining").default(0), // Hours saved from auto model retraining
    hoursAutoAllocation: real("hours_auto_allocation").default(0), // Hours saved from automated allocation
    totalHoursSaved: real("total_hours_saved").default(0),

    // Inventory Optimization
    inventoryReduction: real("inventory_reduction"), // $ value of reduced inventory
    stockoutsPrevented: integer("stockouts_prevented"),
    excessInventoryAvoided: real("excess_inventory_avoided"),

    // Overall ROI
    totalValueGenerated: real("total_value_generated"), // Sum of all savings
    estimatedAnnualizedRoi: real("estimated_annualized_roi"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("roi_summary_company_idx").on(table.companyId),
    index("roi_summary_period_idx").on(table.periodStart, table.periodEnd),
    uniqueIndex("roi_summary_company_period_unique").on(
      table.companyId,
      table.periodType,
      table.periodStart,
    ),
  ],
);

// ============================================
// ERP INTEGRATION TEMPLATES
// ============================================

// ERP Integration Templates - Pre-built templates for popular ERPs
export const erpIntegrationTemplates = pgTable("erp_integration_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  erpName: text("erp_name").notNull(), // "SAP", "Oracle NetSuite", "Microsoft Dynamics 365", "Sage", "Infor"
  erpVersion: text("erp_version"), // e.g., "S/4HANA", "Cloud", "Business Central"
  displayName: text("display_name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),

  // Integration capabilities
  supportedModules: text("supported_modules").array(), // ["inventory", "procurement", "sales", "production"]
  dataFlowDirection: text("data_flow_direction").notNull(), // "import", "export", "bidirectional"

  // Technical details
  connectionType: text("connection_type").notNull(), // "api", "file", "database", "webhook"
  authMethod: text("auth_method").notNull(), // "oauth2", "api_key", "basic", "certificate"
  apiDocumentationUrl: text("api_documentation_url"),

  // Field mappings template
  fieldMappings: jsonb("field_mappings").notNull(), // Template for mapping ERP fields to our schema

  // Sample configuration
  sampleConfig: jsonb("sample_config"), // Example configuration for quick setup
  setupInstructions: text("setup_instructions"), // Markdown instructions

  // Metadata
  isPopular: boolean("is_popular").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ERP Sync Logs - Track sync history (uses existing erpConnections table)
export const erpSyncLogs = pgTable(
  "erp_sync_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    connectionId: varchar("connection_id")
      .notNull()
      .references(() => erpConnections.id, { onDelete: "cascade" }),

    syncType: text("sync_type").notNull(), // "full", "incremental", "manual"
    direction: text("direction").notNull(), // "import", "export"

    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),

    status: text("status").notNull(), // "running", "success", "partial", "failed"

    recordsProcessed: integer("records_processed").default(0),
    recordsSucceeded: integer("records_succeeded").default(0),
    recordsFailed: integer("records_failed").default(0),

    errors: jsonb("errors"), // Array of error details
    summary: jsonb("summary"), // Sync summary statistics

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("erp_sync_logs_connection_idx").on(table.connectionId),
    index("erp_sync_logs_started_idx").on(table.startedAt),
  ],
);

// ============================================
// PRESCRIPTIVE ACTION PLAYBOOKS
// ============================================

// Action Playbooks - Prescriptive actions for regime changes
export const actionPlaybooks = pgTable("action_playbooks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  name: text("name").notNull(),
  description: text("description"),

  // Trigger conditions
  triggerType: text("trigger_type").notNull(), // "regime_change", "fdr_threshold", "forecast_degradation", "inventory_alert"
  fromRegime: text("from_regime"), // Previous regime (for regime_change)
  toRegime: text("to_regime"), // New regime (for regime_change)
  fdrThreshold: real("fdr_threshold"), // FDR threshold for fdr_threshold type
  fdrDirection: text("fdr_direction"), // "above", "below", "crossing"

  // Priority and applicability
  priority: text("priority").notNull().default("medium"), // "critical", "high", "medium", "low"
  applicableIndustries: text("applicable_industries").array(), // null means all industries

  // Actions - ordered list of recommended actions
  actions: jsonb("actions").notNull(), // Array of action objects

  // Expected outcomes
  expectedOutcomes: jsonb("expected_outcomes"), // Expected benefits from following playbook

  // Metadata
  isSystemDefault: boolean("is_system_default").default(false),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Active Playbook Instances - When a playbook is triggered for a company
export const activePlaybookInstances = pgTable(
  "active_playbook_instances",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    playbookId: varchar("playbook_id")
      .notNull()
      .references(() => actionPlaybooks.id),

    // Trigger context
    triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
    triggerContext: jsonb("trigger_context"), // FDR value, regime info, etc.

    // Status tracking
    status: text("status").notNull().default("active"), // "active", "in_progress", "completed", "dismissed"

    // Action progress
    actionsCompleted: jsonb("actions_completed"), // Array of completed action IDs with timestamps
    currentActionIndex: integer("current_action_index").default(0),

    // Outcome tracking
    actualOutcomes: jsonb("actual_outcomes"), // Tracked outcomes after completion
    completedAt: timestamp("completed_at"),
    dismissedAt: timestamp("dismissed_at"),
    dismissedReason: text("dismissed_reason"),

    // User interaction
    assignedTo: varchar("assigned_to").references(() => users.id),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("active_playbook_instances_company_idx").on(table.companyId),
    index("active_playbook_instances_status_idx").on(table.status),
    index("active_playbook_instances_triggered_idx").on(table.triggeredAt),
  ],
);

// Playbook Action Log - Track individual action completions
export const playbookActionLogs = pgTable(
  "playbook_action_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    instanceId: varchar("instance_id")
      .notNull()
      .references(() => activePlaybookInstances.id, { onDelete: "cascade" }),

    actionIndex: integer("action_index").notNull(),
    actionTitle: text("action_title").notNull(),

    status: text("status").notNull(), // "pending", "in_progress", "completed", "skipped"
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    completedBy: varchar("completed_by").references(() => users.id),
    notes: text("notes"),
    evidence: jsonb("evidence"), // Links, screenshots, data points

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("playbook_action_logs_instance_idx").on(table.instanceId)],
);

// ROI Metrics schemas
export const insertRoiMetricSchema = createInsertSchema(roiMetrics).omit({
  id: true,
  createdAt: true,
});
export const insertRoiSummarySchema = createInsertSchema(roiSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ERP Integration schemas
export const insertErpIntegrationTemplateSchema = createInsertSchema(
  erpIntegrationTemplates,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertErpSyncLogSchema = createInsertSchema(erpSyncLogs).omit({
  id: true,
  createdAt: true,
});

// Action Playbook schemas
export const insertActionPlaybookSchema = createInsertSchema(
  actionPlaybooks,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivePlaybookInstanceSchema = createInsertSchema(
  activePlaybookInstances,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlaybookActionLogSchema = createInsertSchema(
  playbookActionLogs,
).omit({ id: true, createdAt: true });

// ROI Metrics types
export type RoiMetric = typeof roiMetrics.$inferSelect;
export type InsertRoiMetric = z.infer<typeof insertRoiMetricSchema>;
export type RoiSummary = typeof roiSummary.$inferSelect;
export type InsertRoiSummary = z.infer<typeof insertRoiSummarySchema>;

// ERP Integration types
export type ErpIntegrationTemplate =
  typeof erpIntegrationTemplates.$inferSelect;
export type InsertErpIntegrationTemplate = z.infer<
  typeof insertErpIntegrationTemplateSchema
>;
export type ErpSyncLog = typeof erpSyncLogs.$inferSelect;
export type InsertErpSyncLog = z.infer<typeof insertErpSyncLogSchema>;

// Action Playbook types
export type ActionPlaybook = typeof actionPlaybooks.$inferSelect;
export type InsertActionPlaybook = z.infer<typeof insertActionPlaybookSchema>;
export type ActivePlaybookInstance =
  typeof activePlaybookInstances.$inferSelect;
export type InsertActivePlaybookInstance = z.infer<
  typeof insertActivePlaybookInstanceSchema
>;
export type PlaybookActionLog = typeof playbookActionLogs.$inferSelect;
export type InsertPlaybookActionLog = z.infer<
  typeof insertPlaybookActionLogSchema
>;

// ============================================
// COLLABORATIVE S&OP WORKFLOWS
// ============================================

// S&OP Meeting Types
export const SOP_MEETING_TYPES = [
  "demand_review", // Weekly demand review with sales team
  "supply_review", // Weekly supply review with operations
  "pre_sop", // Pre-S&OP reconciliation meeting
  "executive_sop", // Executive S&OP decision meeting
  "custom", // Custom meeting type
] as const;

export const SOP_MEETING_STATUS = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

// S&OP Meeting Templates - Pre-built agendas for different meeting types
export const sopMeetingTemplates = pgTable(
  "sop_meeting_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }), // null = system template

    name: text("name").notNull(),
    description: text("description"),
    meetingType: text("meeting_type").notNull(), // demand_review, supply_review, pre_sop, executive_sop

    // Default duration in minutes
    defaultDuration: integer("default_duration").default(60),

    // Agenda items template
    agendaItems: jsonb("agenda_items").notNull(), // Array of { title, description, duration, presenter, order }

    // Required attendee roles
    requiredRoles: text("required_roles").array(), // ["sales_manager", "operations_lead", "finance"]

    // Outputs/deliverables expected from this meeting type
    expectedOutputs: jsonb("expected_outputs"), // Array of { type, description }

    // Best practices and guidelines
    guidelines: text("guidelines"),

    isSystemDefault: boolean("is_system_default").default(false),
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_meeting_templates_company_idx").on(table.companyId),
    index("sop_meeting_templates_type_idx").on(table.meetingType),
  ],
);

// S&OP Meeting Instances - Actual scheduled meetings
export const sopMeetings = pgTable(
  "sop_meetings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    templateId: varchar("template_id").references(() => sopMeetingTemplates.id),

    title: text("title").notNull(),
    meetingType: text("meeting_type").notNull(),
    description: text("description"),

    // Scheduling
    scheduledStart: timestamp("scheduled_start").notNull(),
    scheduledEnd: timestamp("scheduled_end").notNull(),
    actualStart: timestamp("actual_start"),
    actualEnd: timestamp("actual_end"),

    // Status tracking
    status: text("status").notNull().default("scheduled"),

    // Regime context at meeting time
    regimeAtMeeting: text("regime_at_meeting"),
    fdrAtMeeting: real("fdr_at_meeting"),

    // Meeting content
    agenda: jsonb("agenda"), // Copy of agenda items, can be customized
    notes: text("notes"),
    decisions: jsonb("decisions"), // Array of { decision, rationale, owner, deadline }
    actionItems: jsonb("action_items"), // Array of { task, owner, deadline, status }

    // Reconciliation data snapshot
    reconciliationSummary: jsonb("reconciliation_summary"), // Summary of gaps discussed

    // Organizer
    organizerId: varchar("organizer_id").references(() => users.id),

    // Planning horizon this meeting covers
    planningHorizonStart: timestamp("planning_horizon_start"),
    planningHorizonEnd: timestamp("planning_horizon_end"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_meetings_company_idx").on(table.companyId),
    index("sop_meetings_status_idx").on(table.status),
    index("sop_meetings_scheduled_idx").on(table.scheduledStart),
  ],
);

// S&OP Meeting Attendees
export const sopMeetingAttendees = pgTable(
  "sop_meeting_attendees",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    meetingId: varchar("meeting_id")
      .notNull()
      .references(() => sopMeetings.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // External attendees (without user account)
    externalName: text("external_name"),
    externalEmail: text("external_email"),

    role: text("role"), // "organizer", "presenter", "required", "optional"
    department: text("department"), // "sales", "operations", "finance", "executive"

    // Attendance tracking
    rsvpStatus: text("rsvp_status").default("pending"), // "pending", "accepted", "declined", "tentative"
    attended: boolean("attended"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_meeting_attendees_meeting_idx").on(table.meetingId),
    index("sop_meeting_attendees_user_idx").on(table.userId),
  ],
);

// S&OP Reconciliation Items - Demand/Supply gaps and resolutions
export const sopReconciliationItems = pgTable(
  "sop_reconciliation_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    meetingId: varchar("meeting_id").references(() => sopMeetings.id, {
      onDelete: "set null",
    }),

    // What is being reconciled
    itemType: text("item_type").notNull(), // "sku", "material", "capacity", "budget"
    itemId: varchar("item_id"), // Reference to SKU, material, etc.
    itemName: text("item_name").notNull(),

    // Planning period
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Gap analysis
    demandQuantity: real("demand_quantity").notNull(),
    supplyQuantity: real("supply_quantity").notNull(),
    gapQuantity: real("gap_quantity").notNull(), // demand - supply
    gapPercentage: real("gap_percentage"), // gap as % of demand

    // Financial impact
    gapCostImpact: real("gap_cost_impact"), // Estimated cost of the gap

    // Regime context
    regime: text("regime"),
    fdrValue: real("fdr_value"),

    // Resolution tracking
    status: text("status").notNull().default("open"), // "open", "in_review", "resolved", "accepted", "escalated"
    priority: text("priority").default("medium"), // "critical", "high", "medium", "low"

    // Proposed resolution
    proposedResolution: text("proposed_resolution"), // "increase_supply", "reduce_demand", "shift_timing", "accept_gap"
    resolutionDetails: jsonb("resolution_details"), // Specific actions
    resolutionOwner: varchar("resolution_owner").references(() => users.id),
    resolutionDeadline: timestamp("resolution_deadline"),

    // Approval status
    approvalRequired: boolean("approval_required").default(false),
    approvalStatus: text("approval_status"), // "pending", "approved", "rejected"
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_reconciliation_items_company_idx").on(table.companyId),
    index("sop_reconciliation_items_meeting_idx").on(table.meetingId),
    index("sop_reconciliation_items_status_idx").on(table.status),
    index("sop_reconciliation_items_period_idx").on(
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

// S&OP Approval Chains - Configurable approval workflows
export const sopApprovalChains = pgTable(
  "sop_approval_chains",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    // What this chain applies to
    appliesToType: text("applies_to_type").notNull(), // "procurement", "capacity_change", "budget_adjustment", "demand_override"

    // Trigger conditions
    minThreshold: real("min_threshold"), // Minimum value to trigger this chain
    maxThreshold: real("max_threshold"), // Maximum value (if null, no upper limit)
    thresholdType: text("threshold_type"), // "amount", "percentage", "quantity"

    // Chain is active
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_approval_chains_company_idx").on(table.companyId),
    index("sop_approval_chains_type_idx").on(table.appliesToType),
  ],
);

// S&OP Approval Steps - Steps within an approval chain
export const sopApprovalSteps = pgTable(
  "sop_approval_steps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    chainId: varchar("chain_id")
      .notNull()
      .references(() => sopApprovalChains.id, { onDelete: "cascade" }),

    stepOrder: integer("step_order").notNull(),
    name: text("name").notNull(),

    // Who can approve at this step
    approverType: text("approver_type").notNull(), // "user", "role", "department"
    approverId: varchar("approver_id"), // User ID or role name

    // Approval rules
    requiresAllApprovers: boolean("requires_all_approvers").default(false), // If multiple approvers, do all need to approve?
    autoApproveAfterHours: integer("auto_approve_after_hours"), // Auto-approve if no action after X hours
    canDelegate: boolean("can_delegate").default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("sop_approval_steps_chain_idx").on(table.chainId)],
);

// S&OP Approval Requests - Actual approval requests
export const sopApprovalRequests = pgTable(
  "sop_approval_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    chainId: varchar("chain_id")
      .notNull()
      .references(() => sopApprovalChains.id),

    // What is being approved
    requestType: text("request_type").notNull(),
    requestTitle: text("request_title").notNull(),
    requestDescription: text("request_description"),

    // Reference to the item being approved
    referenceType: text("reference_type"), // "reconciliation_item", "purchase_order", "budget_adjustment"
    referenceId: varchar("reference_id"),

    // Value for threshold checking
    requestValue: real("request_value"),

    // Regime context
    regime: text("regime"),
    fdrValue: real("fdr_value"),

    // Request tracking
    status: text("status").notNull().default("pending"), // "pending", "in_progress", "approved", "rejected", "cancelled"
    currentStepOrder: integer("current_step_order").default(1),

    // Requester
    requesterId: varchar("requester_id").references(() => users.id),

    // Final decision
    finalDecision: text("final_decision"), // "approved", "rejected"
    finalDecisionBy: varchar("final_decision_by").references(() => users.id),
    finalDecisionAt: timestamp("final_decision_at"),
    finalDecisionNotes: text("final_decision_notes"),

    // Urgency
    priority: text("priority").default("normal"), // "urgent", "high", "normal", "low"
    dueDate: timestamp("due_date"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_approval_requests_company_idx").on(table.companyId),
    index("sop_approval_requests_status_idx").on(table.status),
    index("sop_approval_requests_requester_idx").on(table.requesterId),
  ],
);

// S&OP Approval Actions - Individual approval/rejection actions
export const sopApprovalActions = pgTable(
  "sop_approval_actions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestId: varchar("request_id")
      .notNull()
      .references(() => sopApprovalRequests.id, { onDelete: "cascade" }),
    stepId: varchar("step_id")
      .notNull()
      .references(() => sopApprovalSteps.id),

    // Approver
    approverId: varchar("approver_id").references(() => users.id),

    // Action taken
    action: text("action").notNull(), // "approved", "rejected", "delegated", "requested_info"
    comments: text("comments"),

    // Delegation
    delegatedTo: varchar("delegated_to").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sop_approval_actions_request_idx").on(table.requestId),
    index("sop_approval_actions_approver_idx").on(table.approverId),
  ],
);

// S&OP Workflow Schemas
export const insertSopMeetingTemplateSchema = createInsertSchema(
  sopMeetingTemplates,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSopMeetingSchema = createInsertSchema(sopMeetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSopMeetingAttendeeSchema = createInsertSchema(
  sopMeetingAttendees,
).omit({ id: true, createdAt: true });
export const insertSopReconciliationItemSchema = createInsertSchema(
  sopReconciliationItems,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSopApprovalChainSchema = createInsertSchema(
  sopApprovalChains,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSopApprovalStepSchema = createInsertSchema(
  sopApprovalSteps,
).omit({ id: true, createdAt: true });
export const insertSopApprovalRequestSchema = createInsertSchema(
  sopApprovalRequests,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSopApprovalActionSchema = createInsertSchema(
  sopApprovalActions,
).omit({ id: true, createdAt: true });

// S&OP Workflow Types
export type SopMeetingTemplate = typeof sopMeetingTemplates.$inferSelect;
export type InsertSopMeetingTemplate = z.infer<
  typeof insertSopMeetingTemplateSchema
>;
export type SopMeeting = typeof sopMeetings.$inferSelect;
export type InsertSopMeeting = z.infer<typeof insertSopMeetingSchema>;
export type SopMeetingAttendee = typeof sopMeetingAttendees.$inferSelect;
export type InsertSopMeetingAttendee = z.infer<
  typeof insertSopMeetingAttendeeSchema
>;
export type SopReconciliationItem = typeof sopReconciliationItems.$inferSelect;
export type InsertSopReconciliationItem = z.infer<
  typeof insertSopReconciliationItemSchema
>;
export type SopApprovalChain = typeof sopApprovalChains.$inferSelect;
export type InsertSopApprovalChain = z.infer<
  typeof insertSopApprovalChainSchema
>;
export type SopApprovalStep = typeof sopApprovalSteps.$inferSelect;
export type InsertSopApprovalStep = z.infer<typeof insertSopApprovalStepSchema>;
export type SopApprovalRequest = typeof sopApprovalRequests.$inferSelect;
export type InsertSopApprovalRequest = z.infer<
  typeof insertSopApprovalRequestSchema
>;
export type SopApprovalAction = typeof sopApprovalActions.$inferSelect;
export type InsertSopApprovalAction = z.infer<
  typeof insertSopApprovalActionSchema
>;

// ============================================
// DIGITAL TWIN - Real-Time Supply Chain Mirror
// ============================================

// Digital Twin Data Feeds - Live data sources
export const digitalTwinDataFeeds = pgTable(
  "digital_twin_data_feeds",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Feed identification
    name: text("name").notNull(),
    description: text("description"),
    feedType: text("feed_type").notNull(), // "inventory", "production", "supplier", "demand", "logistics", "economic", "sensor"
    sourceSystem: text("source_system"), // "ERP", "WMS", "MES", "IoT", "API", "manual"

    // Connection configuration
    connectionType: text("connection_type").notNull(), // "api", "database", "webhook", "file", "mqtt", "internal"
    connectionConfig: jsonb("connection_config"), // API URL, credentials, query, etc.

    // Refresh settings
    refreshInterval: integer("refresh_interval").default(300), // seconds (5 min default)
    lastRefresh: timestamp("last_refresh"),
    nextRefresh: timestamp("next_refresh"),
    isActive: integer("is_active").default(1),

    // Data mapping
    dataMapping: jsonb("data_mapping"), // How to map source data to digital twin entities
    transformRules: jsonb("transform_rules"), // Data transformation rules

    // Health monitoring
    status: text("status").default("active"), // "active", "paused", "error", "initializing"
    lastError: text("last_error"),
    errorCount: integer("error_count").default(0),
    successCount: integer("success_count").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("dt_data_feeds_company_idx").on(table.companyId),
    index("dt_data_feeds_type_idx").on(table.feedType),
    index("dt_data_feeds_status_idx").on(table.status),
  ],
);

// Digital Twin Snapshots - Point-in-time state captures
export const digitalTwinSnapshots = pgTable(
  "digital_twin_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Snapshot metadata
    snapshotType: text("snapshot_type").notNull(), // "full", "incremental", "demand", "supply", "production"
    capturedAt: timestamp("captured_at").defaultNow().notNull(),

    // Current state metrics
    totalInventoryValue: real("total_inventory_value"),
    totalInventoryUnits: integer("total_inventory_units"),
    activeSkuCount: integer("active_sku_count"),
    activeMaterialCount: integer("active_material_count"),
    activeSupplierCount: integer("active_supplier_count"),
    openOrderCount: integer("open_order_count"),
    pendingRfqCount: integer("pending_rfq_count"),

    // Production state
    productionCapacity: real("production_capacity"), // percentage
    machineUtilization: real("machine_utilization"), // percentage
    oeeScore: real("oee_score"), // Overall Equipment Effectiveness
    activeMachineryCount: integer("active_machinery_count"),

    // Supply chain health
    averageLeadTime: real("average_lead_time"), // days
    onTimeDeliveryRate: real("on_time_delivery_rate"), // percentage
    supplierRiskScore: real("supplier_risk_score"), // 0-100

    // Economic context
    economicRegime: text("economic_regime"),
    fdrValue: real("fdr_value"),
    regimeIntensity: real("regime_intensity"),

    // Demand signals
    forecastedDemandValue: real("forecasted_demand_value"),
    actualDemandValue: real("actual_demand_value"),
    forecastAccuracy: real("forecast_accuracy"), // MAPE

    // Full state data (detailed)
    inventoryState: jsonb("inventory_state"), // Per-material inventory levels
    productionState: jsonb("production_state"), // Production line status
    supplyState: jsonb("supply_state"), // Supplier and order status
    demandState: jsonb("demand_state"), // Demand forecasts and actuals

    // Alerts at time of snapshot
    activeAlertCount: integer("active_alert_count"),
    criticalAlertCount: integer("critical_alert_count"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dt_snapshots_company_idx").on(table.companyId),
    index("dt_snapshots_captured_idx").on(table.capturedAt),
    index("dt_snapshots_type_idx").on(table.snapshotType),
  ],
);

// Digital Twin Queries - Natural language queries and insights
export const digitalTwinQueries = pgTable(
  "digital_twin_queries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id),

    // Query content
    queryText: text("query_text").notNull(),
    queryType: text("query_type").notNull(), // "insight", "prediction", "comparison", "alert", "what_if", "optimization"

    // Parsed intent
    parsedIntent: jsonb("parsed_intent"), // NLP-parsed intent and entities
    targetEntities: text("target_entities").array(), // ["inventory", "production", "supplier"]
    timeRange: jsonb("time_range"), // {start, end, granularity}

    // Response
    responseType: text("response_type"), // "text", "chart", "table", "recommendation", "simulation"
    responseText: text("response_text"),
    responseData: jsonb("response_data"), // Structured data for visualization

    // Performance
    processingTime: integer("processing_time"), // milliseconds
    dataSourcesUsed: text("data_sources_used").array(),
    confidence: real("confidence"), // 0-1 confidence score

    // Feedback
    helpfulness: integer("helpfulness"), // 1-5 rating
    feedback: text("feedback"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dt_queries_company_idx").on(table.companyId),
    index("dt_queries_user_idx").on(table.userId),
    index("dt_queries_type_idx").on(table.queryType),
    index("dt_queries_created_idx").on(table.createdAt),
  ],
);

// Digital Twin Simulations - What-if scenarios
export const digitalTwinSimulations = pgTable(
  "digital_twin_simulations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id),

    // Simulation metadata
    name: text("name").notNull(),
    description: text("description"),
    simulationType: text("simulation_type").notNull(), // "demand_shock", "supply_disruption", "price_change", "capacity_change", "regime_shift", "custom"
    status: text("status").default("draft"), // "draft", "running", "completed", "failed"

    // Base state (starting point)
    baseSnapshotId: varchar("base_snapshot_id").references(
      () => digitalTwinSnapshots.id,
    ),
    baseTimestamp: timestamp("base_timestamp"),

    // Scenario parameters
    scenarioParams: jsonb("scenario_params").notNull(), // Detailed simulation parameters
    /*
    Example: {
      demandChange: { percentage: 30, affectedSkus: ["SKU-001"], duration: "3_months" },
      supplyDisruption: { supplierId: "SUP-001", disruptionType: "delay", delayDays: 14 },
      priceChange: { materialId: "MAT-001", priceChangePercent: 25 },
      regimeShift: { targetRegime: "IMBALANCED_EXCESS", fdrValue: 1.8 }
    }
  */

    // Simulation horizon
    horizonDays: integer("horizon_days").default(90),
    granularity: text("granularity").default("daily"), // "hourly", "daily", "weekly"

    // Results
    results: jsonb("results"), // Full simulation results
    /*
    Example: {
      inventoryImpact: { projected: [...], riskLevel: "high" },
      costImpact: { additionalCost: 50000, savingsOpportunity: 20000 },
      productionImpact: { capacityUtilization: [...], bottlenecks: [...] },
      supplyChainRisk: { score: 75, recommendations: [...] },
      timeline: [{ day: 1, metrics: {...} }, ...]
    }
  */

    // Summary metrics
    totalCostImpact: real("total_cost_impact"),
    riskScore: real("risk_score"),
    confidenceLevel: real("confidence_level"),
    keyFindings: text("key_findings").array(),
    recommendations: jsonb("recommendations"),

    // Execution info
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    executionTime: integer("execution_time"), // milliseconds

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("dt_simulations_company_idx").on(table.companyId),
    index("dt_simulations_user_idx").on(table.userId),
    index("dt_simulations_type_idx").on(table.simulationType),
    index("dt_simulations_status_idx").on(table.status),
  ],
);

// Digital Twin Alerts - Real-time anomaly detection
export const digitalTwinAlerts = pgTable(
  "digital_twin_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Alert identification
    alertType: text("alert_type").notNull(), // "anomaly", "threshold", "prediction", "correlation", "pattern"
    severity: text("severity").notNull(), // "info", "warning", "critical", "emergency"
    category: text("category").notNull(), // "inventory", "production", "supply", "demand", "financial", "quality"

    // Alert content
    title: text("title").notNull(),
    description: text("description").notNull(),

    // Entity reference
    entityType: text("entity_type"), // "sku", "material", "supplier", "machine", "order"
    entityId: varchar("entity_id"),
    entityName: text("entity_name"),

    // Detection details
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    detectedValue: real("detected_value"),
    expectedValue: real("expected_value"),
    deviationPercent: real("deviation_percent"),

    // Context
    triggerCondition: jsonb("trigger_condition"), // What triggered the alert
    relatedMetrics: jsonb("related_metrics"), // Additional context metrics

    // Impact assessment
    estimatedImpact: real("estimated_impact"), // Financial impact estimate
    affectedEntities: jsonb("affected_entities"), // List of affected SKUs, materials, etc.

    // Recommendations
    suggestedActions: jsonb("suggested_actions"), // Recommended actions
    automatedActions: jsonb("automated_actions"), // Actions that can be taken automatically

    // Status tracking
    status: text("status").default("active"), // "active", "acknowledged", "investigating", "resolved", "dismissed"
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolution: text("resolution"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("dt_alerts_company_idx").on(table.companyId),
    index("dt_alerts_type_idx").on(table.alertType),
    index("dt_alerts_severity_idx").on(table.severity),
    index("dt_alerts_status_idx").on(table.status),
    index("dt_alerts_detected_idx").on(table.detectedAt),
  ],
);

// Digital Twin KPI Metrics - Time-series performance data
export const digitalTwinMetrics = pgTable(
  "digital_twin_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Metric identification
    metricName: text("metric_name").notNull(), // "inventory_turnover", "fill_rate", "lead_time", etc.
    metricCategory: text("metric_category").notNull(), // "inventory", "production", "supply", "demand", "financial"

    // Time
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    granularity: text("granularity").notNull(), // "minute", "hour", "day", "week"

    // Value
    value: real("value").notNull(),
    unit: text("unit"), // "percent", "days", "units", "dollars"

    // Context
    entityType: text("entity_type"), // Optional entity-specific metric
    entityId: varchar("entity_id"),

    // Comparison
    previousValue: real("previous_value"),
    targetValue: real("target_value"),
    changePercent: real("change_percent"),

    // Anomaly detection
    isAnomaly: integer("is_anomaly").default(0),
    anomalyScore: real("anomaly_score"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dt_metrics_company_idx").on(table.companyId),
    index("dt_metrics_name_idx").on(table.metricName),
    index("dt_metrics_recorded_idx").on(table.recordedAt),
    index("dt_metrics_category_idx").on(table.metricCategory),
  ],
);

// ============================================================================
// AGENTIC AI SYSTEM - Autonomous Actions & Intelligent Automation
// ============================================================================

// AI Agent Profiles - Different AI agents with specific capabilities
export const aiAgents = pgTable(
  "ai_agents",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Agent identity
    name: text("name").notNull(), // "Procurement Agent", "Inventory Agent", etc.
    description: text("description"),
    agentType: text("agent_type").notNull(), // "procurement", "inventory", "forecasting", "supplier", "production", "custom"
    avatar: text("avatar"), // Icon/image for the agent

    // Capabilities & permissions
    capabilities: text("capabilities").array(), // ["create_po", "adjust_inventory", "send_rfq", "rebalance_stock"]
    maxAutonomyLevel: text("max_autonomy_level").default("suggest"), // "suggest", "auto_draft", "auto_execute", "full_autonomous"

    // Activation
    isEnabled: integer("is_enabled").default(1),
    priority: integer("priority").default(50), // 1-100, higher = more important

    // Learning & adaptation
    learningEnabled: integer("learning_enabled").default(1),
    confidenceThreshold: real("confidence_threshold").default(0.75), // Min confidence to take action

    // Limits
    dailyActionLimit: integer("daily_action_limit").default(100),
    dailyValueLimit: real("daily_value_limit"), // Max $ value of actions per day

    // Scheduling
    activeHoursStart: text("active_hours_start").default("08:00"),
    activeHoursEnd: text("active_hours_end").default("18:00"),
    activeDays: text("active_days")
      .array()
      .default(sql`ARRAY['monday','tuesday','wednesday','thursday','friday']`),
    timezone: text("timezone").default("America/New_York"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_agents_company_idx").on(table.companyId),
    index("ai_agents_type_idx").on(table.agentType),
  ],
);

// AI Automation Rules - Configurable triggers and conditions
export const aiAutomationRules = pgTable(
  "ai_automation_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id").references(() => aiAgents.id, {
      onDelete: "cascade",
    }),

    // Rule identification
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(), // "procurement", "inventory", "safety_stock", "reorder", "supplier", "budget", "regime"

    // Trigger conditions (when to fire)
    triggerType: text("trigger_type").notNull(), // "threshold", "schedule", "event", "regime_change", "forecast", "compound"
    triggerConditions: jsonb("trigger_conditions").notNull(),
    /*
    Examples:
    { type: "threshold", metric: "inventory_level", operator: "<", value: 100, materialId: "MAT-001" }
    { type: "schedule", cron: "0 8 * * MON", timezone: "America/New_York" }
    { type: "event", eventType: "price_spike", threshold: 0.15 }
    { type: "regime_change", fromRegime: "any", toRegime: "IMBALANCED_EXCESS" }
    { type: "compound", logic: "AND", conditions: [...] }
  */

    // Action to take when triggered
    actionType: text("action_type").notNull(), // "create_po", "adjust_safety_stock", "rebalance_inventory", "send_alert", "generate_rfq", "pause_orders", "escalate"
    actionConfig: jsonb("action_config").notNull(),
    /*
    Examples:
    { type: "create_po", materialId: "MAT-001", quantity: "auto_calculate", supplierId: "preferred", urgency: "normal" }
    { type: "adjust_safety_stock", skuIds: ["all"], adjustmentPercent: 15, direction: "increase" }
    { type: "rebalance_inventory", fromLocations: ["WAREHOUSE-A"], toLocations: ["WAREHOUSE-B"], targetBalance: "equal" }
    { type: "send_alert", channels: ["email", "in_app"], recipients: ["procurement_managers"], template: "low_stock" }
  */

    // Execution settings
    autonomyLevel: text("autonomy_level").default("suggest"), // "suggest", "auto_draft", "auto_execute"
    requiresApproval: integer("requires_approval").default(1),
    approverRoles: text("approver_roles").array(), // ["procurement_manager", "finance_director"]
    approvalTimeout: integer("approval_timeout").default(24), // Hours before auto-escalation

    // Guardrails & limits
    maxExecutionsPerDay: integer("max_executions_per_day").default(10),
    maxValuePerExecution: real("max_value_per_execution"), // Max $ value
    cooldownMinutes: integer("cooldown_minutes").default(60), // Min time between executions

    // Regime-aware behavior
    regimeOverrides: jsonb("regime_overrides"),
    /*
    {
      "BUBBLE": { enabled: false },
      "IMBALANCED_EXCESS": { adjustmentMultiplier: 1.5 },
      "HEALTHY": { enabled: true }
    }
  */

    // Status
    isEnabled: integer("is_enabled").default(1),
    priority: integer("priority").default(50),

    // Metrics
    executionCount: integer("execution_count").default(0),
    lastExecutedAt: timestamp("last_executed_at"),
    successRate: real("success_rate"),
    avgSavings: real("avg_savings"), // Average $ saved per execution

    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_rules_company_idx").on(table.companyId),
    index("ai_rules_agent_idx").on(table.agentId),
    index("ai_rules_category_idx").on(table.category),
    index("ai_rules_enabled_idx").on(table.isEnabled),
  ],
);

// AI Actions - Log of all actions taken or suggested by AI agents
export const aiActions = pgTable(
  "ai_actions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id").references(() => aiAgents.id),
    ruleId: varchar("rule_id").references(() => aiAutomationRules.id),

    // Action details
    actionType: text("action_type").notNull(), // Same as rule actionType
    actionPayload: jsonb("action_payload").notNull(), // Full action details

    // Context when action was triggered
    triggerContext: jsonb("trigger_context"), // What triggered this action
    economicRegime: text("economic_regime"), // Regime at time of action
    fdrValue: real("fdr_value"), // FDR at time of action

    // Execution status
    status: text("status").default("pending"), // "pending", "awaiting_approval", "approved", "rejected", "executing", "completed", "failed", "cancelled"

    // Impact assessment
    estimatedImpact: jsonb("estimated_impact"),
    /*
    {
      costSavings: 5000,
      riskReduction: 0.15,
      efficiencyGain: 0.08,
      affectedItems: 12,
      confidence: 0.85
    }
  */

    // Approval workflow
    requiresApproval: integer("requires_approval").default(1),
    approvalDeadline: timestamp("approval_deadline"),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    rejectedBy: varchar("rejected_by").references(() => users.id),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),

    // Execution results
    executedAt: timestamp("executed_at"),
    executionResult: jsonb("execution_result"),
    actualImpact: jsonb("actual_impact"), // Measured after execution
    errorMessage: text("error_message"),

    // Related entities
    relatedEntityType: text("related_entity_type"), // "purchase_order", "inventory_transfer", "rfq", etc.
    relatedEntityId: varchar("related_entity_id"),

    // User feedback
    feedbackRating: integer("feedback_rating"), // 1-5
    feedbackComment: text("feedback_comment"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_actions_company_idx").on(table.companyId),
    index("ai_actions_agent_idx").on(table.agentId),
    index("ai_actions_rule_idx").on(table.ruleId),
    index("ai_actions_status_idx").on(table.status),
    index("ai_actions_created_idx").on(table.createdAt),
    index("ai_actions_type_idx").on(table.actionType),
  ],
);

// AI Approval Workflows - Multi-step approval chains
export const aiApprovalWorkflows = pgTable(
  "ai_approval_workflows",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Workflow identity
    name: text("name").notNull(),
    description: text("description"),

    // When to use this workflow
    actionTypes: text("action_types").array(), // Which action types use this workflow
    minValue: real("min_value"), // Minimum $ value to require this workflow
    maxValue: real("max_value"), // Maximum $ value (higher values may need different workflow)

    // Approval steps
    steps: jsonb("steps").notNull(),
    /*
    [
      { order: 1, role: "procurement_manager", required: true, timeout: 4 },
      { order: 2, role: "finance_director", required: true, timeout: 24, minValue: 10000 },
      { order: 3, role: "ceo", required: false, timeout: 48, minValue: 50000 }
    ]
  */

    // Escalation
    escalationPolicy: jsonb("escalation_policy"),
    autoApproveOnTimeout: integer("auto_approve_on_timeout").default(0),

    isEnabled: integer("is_enabled").default(1),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("ai_approval_workflows_company_idx").on(table.companyId)],
);

// AI Agent Learning - Track agent learning and improvement
export const aiAgentLearning = pgTable(
  "ai_agent_learning",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id")
      .notNull()
      .references(() => aiAgents.id, { onDelete: "cascade" }),

    // Learning event
    learningType: text("learning_type").notNull(), // "action_feedback", "prediction_accuracy", "user_correction", "pattern_detection"

    // What was learned
    insight: text("insight").notNull(),
    context: jsonb("context"), // Contextual data

    // Impact on behavior
    confidenceAdjustment: real("confidence_adjustment"), // How much to adjust confidence
    behaviorChange: jsonb("behavior_change"), // Changes to make

    // Source
    sourceActionId: varchar("source_action_id").references(() => aiActions.id),
    sourceUserId: varchar("source_user_id").references(() => users.id),

    appliedAt: timestamp("applied_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_learning_company_idx").on(table.companyId),
    index("ai_learning_agent_idx").on(table.agentId),
  ],
);

// AI Guardrails - Safety limits and constraints
export const aiGuardrails = pgTable(
  "ai_guardrails",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Guardrail identification
    name: text("name").notNull(),
    description: text("description"),
    guardrailType: text("guardrail_type").notNull(), // "spending_limit", "quantity_limit", "time_restriction", "supplier_restriction", "approval_requirement", "escalation"

    // Scope
    appliesToAgents: text("applies_to_agents").array(), // Agent IDs or ["all"]
    appliesToActionTypes: text("applies_to_action_types").array(),

    // Conditions
    conditions: jsonb("conditions").notNull(),
    /*
    Examples:
    { type: "spending_limit", period: "daily", limit: 50000 }
    { type: "quantity_limit", material: "all", maxQuantity: 1000 }
    { type: "time_restriction", blockedHours: ["00:00-06:00"], blockedDays: ["saturday", "sunday"] }
    { type: "supplier_restriction", allowedSuppliers: ["SUP-001", "SUP-002"] }
    { type: "regime_restriction", blockedRegimes: ["BUBBLE", "IMBALANCED_DEFICIT"] }
  */

    // Enforcement
    enforcementLevel: text("enforcement_level").default("hard"), // "soft" (warn), "hard" (block), "escalate"

    // Violation handling
    onViolation: text("on_violation").default("block"), // "block", "warn", "escalate", "require_approval"
    notifyOnViolation: text("notify_on_violation").array(), // User IDs or roles

    isEnabled: integer("is_enabled").default(1),
    priority: integer("priority").default(50),

    // Metrics
    violationCount: integer("violation_count").default(0),
    lastViolationAt: timestamp("last_violation_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_guardrails_company_idx").on(table.companyId),
    index("ai_guardrails_type_idx").on(table.guardrailType),
  ],
);

// AI Execution Queue - Pending and scheduled actions
export const aiExecutionQueue = pgTable(
  "ai_execution_queue",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    actionId: varchar("action_id")
      .notNull()
      .references(() => aiActions.id, { onDelete: "cascade" }),

    // Scheduling
    scheduledFor: timestamp("scheduled_for").notNull(),
    priority: integer("priority").default(50),

    // Status
    status: text("status").default("queued"), // "queued", "processing", "completed", "failed", "cancelled"
    attempts: integer("attempts").default(0),
    maxAttempts: integer("max_attempts").default(3),
    lastAttemptAt: timestamp("last_attempt_at"),
    claimedAt: timestamp("claimed_at"),
    claimedBy: text("claimed_by"),

    // Results
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_queue_company_idx").on(table.companyId),
    index("ai_queue_scheduled_idx").on(table.scheduledFor),
    index("ai_queue_status_idx").on(table.status),
  ],
);

// AI Performance Metrics - Track agent and rule performance
export const aiPerformanceMetrics = pgTable(
  "ai_performance_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id").references(() => aiAgents.id),
    ruleId: varchar("rule_id").references(() => aiAutomationRules.id),

    // Time period
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    granularity: text("granularity").notNull(), // "hourly", "daily", "weekly", "monthly"

    // Action metrics
    actionsTriggered: integer("actions_triggered").default(0),
    actionsApproved: integer("actions_approved").default(0),
    actionsRejected: integer("actions_rejected").default(0),
    actionsExecuted: integer("actions_executed").default(0),
    actionsFailed: integer("actions_failed").default(0),

    // Impact metrics
    totalCostSavings: real("total_cost_savings").default(0),
    totalRiskReduction: real("total_risk_reduction").default(0),
    totalEfficiencyGain: real("total_efficiency_gain").default(0),

    // Quality metrics
    avgConfidenceScore: real("avg_confidence_score"),
    avgUserRating: real("avg_user_rating"),
    falsePositiveRate: real("false_positive_rate"),

    // Timing metrics
    avgApprovalTime: real("avg_approval_time"), // Hours
    avgExecutionTime: real("avg_execution_time"), // Seconds

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_metrics_company_idx").on(table.companyId),
    index("ai_metrics_agent_idx").on(table.agentId),
    index("ai_metrics_period_idx").on(table.periodStart),
  ],
);

// Enterprise Automation: Runtime state persisted to DB (replaces in-memory Maps)
export const automationRuntimeState = pgTable(
  "automation_runtime_state",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    stateDate: text("state_date").notNull(),
    dailySpendTotal: real("daily_spend_total").default(0),
    dailyActionCount: integer("daily_action_count").default(0),
    lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ars_company_date_unique").on(table.companyId, table.stateDate),
    index("ars_company_idx").on(table.companyId),
  ],
);

// Enterprise Automation: Processed trigger events for idempotency
export const processedTriggerEvents = pgTable(
  "processed_trigger_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    triggerType: text("trigger_type").notNull(),
    triggerEventId: text("trigger_event_id").notNull(),
    ruleId: varchar("rule_id"),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
    result: text("result"),
    actionId: varchar("action_id"),
    status: text("status").notNull().default("processing"),
    claimedAt: timestamp("claimed_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("pte_company_trigger_unique").on(table.companyId, table.triggerType, table.triggerEventId),
    index("pte_company_idx").on(table.companyId),
    index("pte_processed_idx").on(table.processedAt),
    index("pte_status_idx").on(table.status),
  ],
);

// Enterprise: Durable Stripe webhook event deduplication with atomic locking
export const stripeProcessedEvents = pgTable(
  "stripe_processed_events",
  {
    eventId: varchar("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    customerId: text("customer_id"),
    subscriptionId: text("subscription_id"),
    status: text("status").default("processing").notNull(), // 'processing' | 'processed' | 'failed'
    errorMessage: text("error_message"),
    idempotencyHash: text("idempotency_hash"),
  },
  (table) => [
    index("spe_type_idx").on(table.eventType),
    index("spe_processed_idx").on(table.processedAt),
    index("spe_customer_idx").on(table.customerId),
    index("spe_status_idx").on(table.status),
  ],
);

// Enterprise: Per-company safe mode configuration
export const automationSafeMode = pgTable(
  "automation_safe_mode",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    safeModeEnabled: integer("safe_mode_enabled").default(1),
    overrideActions: text("override_actions").array(),
    readinessChecklistPassed: integer("readiness_checklist_passed").default(0),
    readinessPassedAt: timestamp("readiness_passed_at"),
    readinessPassedBy: varchar("readiness_passed_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("asm_company_unique").on(table.companyId),
  ],
);

// Enterprise: Structured event log for observability
export const structuredEventLog = pgTable(
  "structured_event_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    level: text("level").notNull(),
    category: text("category").notNull(),
    event: text("event").notNull(),
    companyId: varchar("company_id"),
    userId: varchar("user_id"),
    details: jsonb("details"),
    durationMs: integer("duration_ms"),
    success: integer("success"),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("sel_timestamp_idx").on(table.timestamp),
    index("sel_category_idx").on(table.category),
    index("sel_company_idx").on(table.companyId),
    index("sel_level_idx").on(table.level),
  ],
);

// Enterprise: Background job locks for distributed deduplication
export const backgroundJobLocks = pgTable(
  "background_job_locks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    jobName: text("job_name").notNull(),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
    lockedBy: text("locked_by").notNull(),
    lockedAt: timestamp("locked_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    heartbeatAt: timestamp("heartbeat_at"),
  },
  (table) => [
    uniqueIndex("bjl_job_company_unique").on(table.jobName, table.companyId),
    index("bjl_job_name_idx").on(table.jobName),
    index("bjl_expires_idx").on(table.expiresAt),
  ],
);

export type BackgroundJobLock = typeof backgroundJobLocks.$inferSelect;

export const insertAutomationRuntimeStateSchema = createInsertSchema(automationRuntimeState).omit({ id: true, lastUpdatedAt: true });
export type AutomationRuntimeState = typeof automationRuntimeState.$inferSelect;
export type InsertAutomationRuntimeState = z.infer<typeof insertAutomationRuntimeStateSchema>;

export const insertProcessedTriggerEventSchema = createInsertSchema(processedTriggerEvents).omit({ id: true, processedAt: true });
export type ProcessedTriggerEvent = typeof processedTriggerEvents.$inferSelect;
export type InsertProcessedTriggerEvent = z.infer<typeof insertProcessedTriggerEventSchema>;

export const insertStripeProcessedEventSchema = createInsertSchema(stripeProcessedEvents).omit({ processedAt: true });
export type StripeProcessedEvent = typeof stripeProcessedEvents.$inferSelect;
export type InsertStripeProcessedEvent = z.infer<typeof insertStripeProcessedEventSchema>;

export const insertAutomationSafeModeSchema = createInsertSchema(automationSafeMode).omit({ id: true, createdAt: true, updatedAt: true });
export type AutomationSafeMode = typeof automationSafeMode.$inferSelect;
export type InsertAutomationSafeMode = z.infer<typeof insertAutomationSafeModeSchema>;

export const insertStructuredEventLogSchema = createInsertSchema(structuredEventLog).omit({ id: true, timestamp: true });
export type StructuredEventLog = typeof structuredEventLog.$inferSelect;
export type InsertStructuredEventLog = z.infer<typeof insertStructuredEventLogSchema>;

// AI Agent Schemas
export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAiAutomationRuleSchema = createInsertSchema(
  aiAutomationRules,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  executionCount: true,
  lastExecutedAt: true,
  successRate: true,
  avgSavings: true,
});
export const insertAiActionSchema = createInsertSchema(aiActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAiApprovalWorkflowSchema = createInsertSchema(
  aiApprovalWorkflows,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiGuardrailSchema = createInsertSchema(aiGuardrails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  violationCount: true,
  lastViolationAt: true,
});

// AI Agent Types
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAutomationRule = typeof aiAutomationRules.$inferSelect;
export type InsertAiAutomationRule = z.infer<
  typeof insertAiAutomationRuleSchema
>;
export type AiAction = typeof aiActions.$inferSelect;
export type InsertAiAction = z.infer<typeof insertAiActionSchema>;
export type AiApprovalWorkflow = typeof aiApprovalWorkflows.$inferSelect;
export type InsertAiApprovalWorkflow = z.infer<
  typeof insertAiApprovalWorkflowSchema
>;
export type AiGuardrail = typeof aiGuardrails.$inferSelect;
export type InsertAiGuardrail = z.infer<typeof insertAiGuardrailSchema>;
export type AiAgentLearning = typeof aiAgentLearning.$inferSelect;
export type AiExecutionQueue = typeof aiExecutionQueue.$inferSelect;
export type AiPerformanceMetric = typeof aiPerformanceMetrics.$inferSelect;

// Digital Twin Schemas
export const insertDigitalTwinDataFeedSchema = createInsertSchema(
  digitalTwinDataFeeds,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDigitalTwinSnapshotSchema = createInsertSchema(
  digitalTwinSnapshots,
).omit({ id: true, createdAt: true });
export const insertDigitalTwinQuerySchema = createInsertSchema(
  digitalTwinQueries,
).omit({ id: true, createdAt: true });
export const insertDigitalTwinSimulationSchema = createInsertSchema(
  digitalTwinSimulations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDigitalTwinAlertSchema = createInsertSchema(
  digitalTwinAlerts,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDigitalTwinMetricSchema = createInsertSchema(
  digitalTwinMetrics,
).omit({ id: true, createdAt: true });

// Digital Twin Types
export type DigitalTwinDataFeed = typeof digitalTwinDataFeeds.$inferSelect;
export type InsertDigitalTwinDataFeed = z.infer<
  typeof insertDigitalTwinDataFeedSchema
>;
export type DigitalTwinSnapshot = typeof digitalTwinSnapshots.$inferSelect;
export type InsertDigitalTwinSnapshot = z.infer<
  typeof insertDigitalTwinSnapshotSchema
>;
export type DigitalTwinQuery = typeof digitalTwinQueries.$inferSelect;
export type InsertDigitalTwinQuery = z.infer<
  typeof insertDigitalTwinQuerySchema
>;
export type DigitalTwinSimulation = typeof digitalTwinSimulations.$inferSelect;
export type InsertDigitalTwinSimulation = z.infer<
  typeof insertDigitalTwinSimulationSchema
>;
export type DigitalTwinAlert = typeof digitalTwinAlerts.$inferSelect;
export type InsertDigitalTwinAlert = z.infer<
  typeof insertDigitalTwinAlertSchema
>;
export type DigitalTwinMetric = typeof digitalTwinMetrics.$inferSelect;
export type InsertDigitalTwinMetric = z.infer<
  typeof insertDigitalTwinMetricSchema
>;

// Activity Log - Track user and system actions
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Activity details
    activityType: text("activity_type").notNull(), // "forecast_run", "allocation_created", "sku_added", "material_updated", "regime_change", "rfq_generated", "report_exported", "settings_changed", "user_invited", "data_imported"
    title: text("title").notNull(), // Human-readable title
    description: text("description"), // Optional longer description

    // Context
    entityType: text("entity_type"), // "sku", "material", "supplier", "allocation", "forecast", "rfq"
    entityId: varchar("entity_id"),
    metadata: jsonb("metadata"), // Additional context (e.g., { skuCount: 5, accuracy: 0.95 })

    // Classification
    category: text("category").notNull().default("general"), // "forecasting", "procurement", "inventory", "settings", "system"
    severity: text("severity").default("info"), // "info", "success", "warning", "error"

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_logs_company_idx").on(table.companyId),
    index("activity_logs_user_idx").on(table.userId),
    index("activity_logs_type_idx").on(table.activityType),
    index("activity_logs_created_idx").on(table.createdAt),
  ],
);

// User Notification Preferences - Per-user settings
export const userNotificationPreferences = pgTable(
  "user_notification_preferences",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // In-App Notifications
    inAppEnabled: integer("in_app_enabled").default(1),
    inAppRegimeChanges: integer("in_app_regime_changes").default(1),
    inAppForecastAlerts: integer("in_app_forecast_alerts").default(1),
    inAppLowStock: integer("in_app_low_stock").default(1),
    inAppBudgetAlerts: integer("in_app_budget_alerts").default(1),
    inAppSystemUpdates: integer("in_app_system_updates").default(1),

    // Email Notifications
    emailEnabled: integer("email_enabled").default(1),
    emailRegimeChanges: integer("email_regime_changes").default(1),
    emailForecastAlerts: integer("email_forecast_alerts").default(0), // Off by default
    emailLowStock: integer("email_low_stock").default(1),
    emailBudgetAlerts: integer("email_budget_alerts").default(1),
    emailWeeklyDigest: integer("email_weekly_digest").default(1),
    emailDailyDigest: integer("email_daily_digest").default(0),

    // Notification Frequency
    digestFrequency: text("digest_frequency").default("weekly"), // "realtime", "daily", "weekly", "none"
    quietHoursStart: text("quiet_hours_start"), // "22:00"
    quietHoursEnd: text("quiet_hours_end"), // "08:00"

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_notif_prefs_user_idx").on(table.userId),
    index("user_notif_prefs_company_idx").on(table.companyId),
  ],
);

// Activity Log Schemas
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// User Notification Preferences Schemas
export const insertUserNotificationPreferencesSchema = createInsertSchema(
  userNotificationPreferences,
).omit({ id: true, createdAt: true, updatedAt: true });
export type UserNotificationPreferences =
  typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<
  typeof insertUserNotificationPreferencesSchema
>;

// ================================
// WEBHOOK INTEGRATIONS
// ================================

// Webhook Integrations - For middleware platforms (MuleSoft, Boomi, Zapier, etc.)
export const webhookIntegrations = pgTable(
  "webhook_integrations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Integration identity
    name: text("name").notNull(), // "MuleSoft Production", "Zapier Integration"
    description: text("description"),
    platform: text("platform").notNull(), // "mulesoft", "boomi", "zapier", "make", "workato", "custom"

    // Inbound webhook (data coming INTO Prescient Labs)
    inboundEnabled: integer("inbound_enabled").default(1),
    inboundEndpoint: text("inbound_endpoint"), // Generated unique endpoint: /api/webhooks/inbound/{id}
    inboundSecret: text("inbound_secret"), // HMAC secret for validating incoming webhooks
    inboundDataTypes: text("inbound_data_types").array(), // ["inventory", "purchase_orders", "sales_orders", "production"]

    // Outbound webhook (data going OUT from Prescient Labs)
    outboundEnabled: integer("outbound_enabled").default(0),
    outboundUrl: text("outbound_url"), // URL to send data to
    outboundSecret: text("outbound_secret"), // Secret for signing outbound payloads
    outboundEvents: text("outbound_events").array(), // ["regime_change", "forecast_complete", "rfq_generated", "low_stock", "price_alert"]
    outboundHeaders: jsonb("outbound_headers"), // Custom headers to include { "X-API-Key": "..." }

    // Authentication
    authMethod: text("auth_method").default("hmac"), // "hmac", "api_key", "oauth2", "basic", "none"
    authConfig: jsonb("auth_config"), // Auth-specific config

    // Rate limiting & batching
    rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
    batchingEnabled: integer("batching_enabled").default(0),
    batchSize: integer("batch_size").default(100),
    batchIntervalMinutes: integer("batch_interval_minutes").default(5),

    // Status
    status: text("status").notNull().default("active"), // "active", "paused", "error", "pending_setup"
    lastInboundAt: timestamp("last_inbound_at"),
    lastOutboundAt: timestamp("last_outbound_at"),
    lastError: text("last_error"),
    errorCount: integer("error_count").default(0),

    // Field mappings for data transformation
    fieldMappings: jsonb("field_mappings"), // Maps external fields to Prescient Labs schema
    transformScript: text("transform_script"), // Optional JS transform for complex mappings

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhook_integrations_company_idx").on(table.companyId),
    index("webhook_integrations_status_idx").on(table.status),
    index("webhook_integrations_platform_idx").on(table.platform),
  ],
);

// Webhook Event Logs - Track all webhook activity
export const webhookEventLogs = pgTable(
  "webhook_event_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    integrationId: varchar("integration_id")
      .notNull()
      .references(() => webhookIntegrations.id, { onDelete: "cascade" }),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Event details
    direction: text("direction").notNull(), // "inbound", "outbound"
    eventType: text("event_type").notNull(), // "inventory_sync", "po_created", "regime_change", etc.

    // Request/Response data
    requestMethod: text("request_method"), // "POST", "PUT", etc.
    requestUrl: text("request_url"),
    requestHeaders: jsonb("request_headers"),
    requestBody: jsonb("request_body"),

    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),

    // Processing
    processingStatus: text("processing_status").notNull().default("pending"), // "pending", "processing", "success", "failed", "retrying"
    processingError: text("processing_error"),
    retryCount: integer("retry_count").default(0),
    nextRetryAt: timestamp("next_retry_at"),

    // Metrics
    durationMs: integer("duration_ms"),
    recordsProcessed: integer("records_processed").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    index("webhook_event_logs_integration_idx").on(table.integrationId),
    index("webhook_event_logs_company_idx").on(table.companyId),
    index("webhook_event_logs_status_idx").on(table.processingStatus),
    index("webhook_event_logs_created_idx").on(table.createdAt),
  ],
);

// Webhook Schemas
export const insertWebhookIntegrationSchema = createInsertSchema(
  webhookIntegrations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookEventLogSchema = createInsertSchema(
  webhookEventLogs,
).omit({ id: true, createdAt: true });

// Webhook Types
export type WebhookIntegration = typeof webhookIntegrations.$inferSelect;
export type InsertWebhookIntegration = z.infer<
  typeof insertWebhookIntegrationSchema
>;
export type WebhookEventLog = typeof webhookEventLogs.$inferSelect;
export type InsertWebhookEventLog = z.infer<typeof insertWebhookEventLogSchema>;

// ============================================
// PLATFORM ANALYTICS - Owner-Only Access
// ============================================

// Platform Admins - Users who can access platform-level analytics (NOT company users)
export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    role: text("role").notNull().default("analyst"), // "owner", "analyst", "viewer"
    accessLevel: text("access_level").notNull().default("read"), // "read", "write", "admin"
    isActive: integer("is_active").default(1),
    lastAccessAt: timestamp("last_access_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: varchar("created_by"),
  },
  (table) => [
    index("platform_admins_user_idx").on(table.userId),
    index("platform_admins_email_idx").on(table.email),
  ],
);

// Platform Analytics Snapshots - Aggregated cross-tenant data (anonymized)
export const platformAnalyticsSnapshots = pgTable(
  "platform_analytics_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    snapshotDate: timestamp("snapshot_date").notNull(),
    snapshotType: text("snapshot_type").notNull(), // "daily", "weekly", "monthly"

    // Platform-wide metrics (aggregated, anonymized)
    totalCompanies: integer("total_companies").default(0),
    activeCompanies: integer("active_companies").default(0), // Active in last 30 days
    totalUsers: integer("total_users").default(0),
    activeUsers: integer("active_users").default(0),

    // Feature usage metrics
    totalRfqsGenerated: integer("total_rfqs_generated").default(0),
    totalAllocationsRun: integer("total_allocations_run").default(0),
    totalForecastsGenerated: integer("total_forecasts_generated").default(0),
    totalSuppliersTracked: integer("total_suppliers_tracked").default(0),
    totalMaterialsManaged: integer("total_materials_managed").default(0),

    // Financial metrics (aggregated, anonymized)
    totalProcurementVolume: real("total_procurement_volume").default(0),
    totalSavingsReported: real("total_savings_reported").default(0),
    avgSavingsPercentage: real("avg_savings_percentage").default(0),

    // Industry distribution (JSON)
    industryBreakdown: jsonb("industry_breakdown"), // { "manufacturing": 45, "automotive": 20, ... }
    companySizeBreakdown: jsonb("company_size_breakdown"), // { "small": 30, "medium": 50, ... }

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("platform_snapshots_date_idx").on(table.snapshotDate),
    index("platform_snapshots_type_idx").on(table.snapshotType),
  ],
);

// Platform Material Trends - Aggregated material demand patterns
export const platformMaterialTrends = pgTable(
  "platform_material_trends",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    trendDate: timestamp("trend_date").notNull(),

    // Material category (aggregated, not specific to any company)
    materialCategory: text("material_category").notNull(), // "steel", "aluminum", "copper", etc.

    // Demand metrics (percentile-based for anonymity)
    demandGrowthPercentile: real("demand_growth_percentile"), // 0-100
    priceChangePercentile: real("price_change_percentile"),
    companiesTracking: integer("companies_tracking").default(0), // How many companies track this

    // Trend indicators
    trendDirection: text("trend_direction"), // "up", "down", "stable"
    volatilityScore: real("volatility_score"), // 0-10
    supplyRiskScore: real("supply_risk_score"), // 0-10

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("platform_material_trends_date_idx").on(table.trendDate),
    index("platform_material_trends_category_idx").on(table.materialCategory),
  ],
);

// Platform Supplier Intelligence - Aggregated supplier performance
export const platformSupplierIntelligence = pgTable(
  "platform_supplier_intelligence",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    analysisDate: timestamp("analysis_date").notNull(),

    // Supplier category (aggregated)
    supplierRegion: text("supplier_region"), // "North America", "Asia Pacific", etc.
    supplierCategory: text("supplier_category"), // "raw materials", "components", etc.

    // Performance metrics (anonymized averages)
    avgLeadTimeDays: real("avg_lead_time_days"),
    avgOnTimeDeliveryRate: real("avg_on_time_delivery_rate"),
    avgQualityScore: real("avg_quality_score"),
    avgPriceCompetitiveness: real("avg_price_competitiveness"),

    // Risk metrics
    avgRiskScore: real("avg_risk_score"),
    suppliersAtRisk: integer("suppliers_at_risk").default(0),

    // Count metrics
    totalSuppliersInCategory: integer("total_suppliers_in_category").default(0),
    companiesUsingCategory: integer("companies_using_category").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("platform_supplier_intel_date_idx").on(table.analysisDate),
    index("platform_supplier_intel_region_idx").on(table.supplierRegion),
  ],
);

// Platform Behavioral Analytics - User behavior patterns
export const platformBehavioralAnalytics = pgTable(
  "platform_behavioral_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    analysisDate: timestamp("analysis_date").notNull(),

    // Feature engagement
    featureName: text("feature_name").notNull(), // "forecasting", "rfq_generation", "ai_assistant", etc.
    usageCount: integer("usage_count").default(0),
    uniqueCompaniesUsing: integer("unique_companies_using").default(0),
    avgSessionDuration: real("avg_session_duration"), // minutes

    // Conversion & Retention
    conversionRate: real("conversion_rate"), // Feature trial to regular use
    retentionRate: real("retention_rate"), // 30-day retention

    // Time patterns
    peakUsageHour: integer("peak_usage_hour"), // 0-23
    peakUsageDay: text("peak_usage_day"), // "monday", "tuesday", etc.

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("platform_behavior_date_idx").on(table.analysisDate),
    index("platform_behavior_feature_idx").on(table.featureName),
  ],
);

// Platform Analytics Access Logs - Audit trail for platform data access
export const platformAnalyticsAccessLogs = pgTable(
  "platform_analytics_access_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    adminId: varchar("admin_id")
      .notNull()
      .references(() => platformAdmins.id, { onDelete: "cascade" }),

    // Access details
    endpoint: text("endpoint").notNull(),
    action: text("action").notNull(), // "view", "export", "query"
    queryParams: jsonb("query_params"),

    // Response metadata
    recordsReturned: integer("records_returned").default(0),
    responseTimeMs: integer("response_time_ms"),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("platform_access_logs_admin_idx").on(table.adminId),
    index("platform_access_logs_date_idx").on(table.createdAt),
  ],
);

// Platform Admin Schemas
export const insertPlatformAdminSchema = createInsertSchema(
  platformAdmins,
).omit({ id: true, createdAt: true });
export const insertPlatformAnalyticsSnapshotSchema = createInsertSchema(
  platformAnalyticsSnapshots,
).omit({ id: true, createdAt: true });
export const insertPlatformMaterialTrendSchema = createInsertSchema(
  platformMaterialTrends,
).omit({ id: true, createdAt: true });
export const insertPlatformSupplierIntelligenceSchema = createInsertSchema(
  platformSupplierIntelligence,
).omit({ id: true, createdAt: true });
export const insertPlatformBehavioralAnalyticsSchema = createInsertSchema(
  platformBehavioralAnalytics,
).omit({ id: true, createdAt: true });

// Platform Admin Types
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type InsertPlatformAdmin = z.infer<typeof insertPlatformAdminSchema>;
export type PlatformAnalyticsSnapshot =
  typeof platformAnalyticsSnapshots.$inferSelect;
export type PlatformMaterialTrend = typeof platformMaterialTrends.$inferSelect;
export type PlatformSupplierIntelligence =
  typeof platformSupplierIntelligence.$inferSelect;
export type PlatformBehavioralAnalytics =
  typeof platformBehavioralAnalytics.$inferSelect;

// ============================================================================
// BEHAVIORAL OBSERVATION SYSTEM
// Purpose: Build longitudinal dataset of decision behavior under varying regimes
// Constraint: Model logic is fixed ground truth; user behavior is the variable
// This system observes, not influences. No nudging, no optimization for outcomes.
// ============================================================================

// Regime Snapshot - Immutable record of regime state at observation time
export const behavioralRegimeSnapshots = pgTable(
  "behavioral_regime_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Regime state (fixed ground truth at observation time)
    fdrValue: real("fdr_value").notNull(),
    regimeType: text("regime_type").notNull(), // "expansion", "contraction", "stagflation", "transition"
    confidenceLevel: real("confidence_level").notNull(),
    robustnessScore: real("robustness_score"),

    // Validation state at time of snapshot
    nullTestPassed: integer("null_test_passed"), // 1 = passed, 0 = failed
    thresholdConsistent: integer("threshold_consistent"),
    classifiedFailures: jsonb("classified_failures"), // Array of failure categories
    confidenceCap: real("confidence_cap"),

    // Underlying indicators (for audit traceability)
    m2Growth: real("m2_growth"),
    fedFundsRate: real("fed_funds_rate"),
    cpiYoY: real("cpi_yoy"),
    unemploymentRate: real("unemployment_rate"),

    // Metadata
    snapshotTimestamp: timestamp("snapshot_timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("regime_snapshots_timestamp_idx").on(table.snapshotTimestamp),
    index("regime_snapshots_regime_idx").on(table.regimeType),
  ],
);

// Signal Exposure Event - Records when user was exposed to a regime signal
export const behavioralSignalExposures = pgTable(
  "behavioral_signal_exposures",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Anonymized organization identifier (hashed)
    anonymizedOrgId: varchar("anonymized_org_id").notNull(),

    // Link to regime state at exposure time
    regimeSnapshotId: varchar("regime_snapshot_id").references(
      () => behavioralRegimeSnapshots.id,
    ),

    // Exposure context
    exposureType: text("exposure_type").notNull(), // "dashboard_view", "api_call", "alert_received", "report_generated"
    signalCategory: text("signal_category").notNull(), // "regime_change", "confidence_update", "procurement_timing", "risk_alert"

    // What was shown (not interpreted)
    signalContent: jsonb("signal_content"), // Raw signal data shown to user

    // Session context
    sessionId: varchar("session_id"),
    exposureTimestamp: timestamp("exposure_timestamp").defaultNow().notNull(),

    // Time user spent on signal (if measurable)
    dwellTimeMs: integer("dwell_time_ms"),
  },
  (table) => [
    index("signal_exposures_org_idx").on(table.anonymizedOrgId),
    index("signal_exposures_timestamp_idx").on(table.exposureTimestamp),
    index("signal_exposures_regime_idx").on(table.regimeSnapshotId),
  ],
);

// User Action Event - Records actions taken after signal exposure
export const behavioralUserActions = pgTable(
  "behavioral_user_actions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Anonymized identifiers
    anonymizedOrgId: varchar("anonymized_org_id").notNull(),

    // Link to triggering signal exposure (may be null for unprompted actions)
    signalExposureId: varchar("signal_exposure_id").references(
      () => behavioralSignalExposures.id,
    ),
    regimeSnapshotId: varchar("regime_snapshot_id").references(
      () => behavioralRegimeSnapshots.id,
    ),

    // Action classification
    actionType: text("action_type").notNull(), // "follow_signal", "ignore_signal", "override_signal", "delay_action", "contradict_signal", "no_action"
    actionCategory: text("action_category").notNull(), // "procurement", "inventory", "supplier", "budget", "forecast_adjustment"

    // Time from signal exposure to action
    latencyMs: integer("latency_ms"),

    // Action details (factual, not interpreted)
    actionDetails: jsonb("action_details"), // What the user actually did

    // Operational context provided by user
    operationalContext: jsonb("operational_context"), // SKUs, costs, lead times, capacity constraints

    actionTimestamp: timestamp("action_timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("user_actions_org_idx").on(table.anonymizedOrgId),
    index("user_actions_exposure_idx").on(table.signalExposureId),
    index("user_actions_timestamp_idx").on(table.actionTimestamp),
    index("user_actions_type_idx").on(table.actionType),
  ],
);

// Signal Override Event - Explicit user decision to contradict system recommendation
export const behavioralSignalOverrides = pgTable(
  "behavioral_signal_overrides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    anonymizedOrgId: varchar("anonymized_org_id").notNull(),
    signalExposureId: varchar("signal_exposure_id").references(
      () => behavioralSignalExposures.id,
    ),
    regimeSnapshotId: varchar("regime_snapshot_id").references(
      () => behavioralRegimeSnapshots.id,
    ),

    // What system recommended vs what user did
    systemRecommendation: jsonb("system_recommendation").notNull(),
    userDecision: jsonb("user_decision").notNull(),

    // Override classification (factual, no judgment)
    overrideType: text("override_type").notNull(), // "timing_change", "quantity_change", "supplier_change", "cancel_action", "proceed_against_signal"

    // User-provided reason (if captured, optional)
    userProvidedReason: text("user_provided_reason"),

    overrideTimestamp: timestamp("override_timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("signal_overrides_org_idx").on(table.anonymizedOrgId),
    index("signal_overrides_timestamp_idx").on(table.overrideTimestamp),
  ],
);

// Behavioral Audit Trail - Traces insights back to observations
export const behavioralAuditTrail = pgTable(
  "behavioral_audit_trail",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    companyId: varchar("company_id").notNull().default("system"),

    insightType: text("insight_type").notNull(),
    insightDescription: text("insight_description").notNull(),

    observedInputs: jsonb("observed_inputs").notNull(),
    observedOutputs: jsonb("observed_outputs").notNull(),
    observedActions: jsonb("observed_actions").notNull(),
    regimeConditions: jsonb("regime_conditions").notNull(),

    signalExposureIds: text("signal_exposure_ids").array(),
    userActionIds: text("user_action_ids").array(),

    evidenceCount: integer("evidence_count").notNull(),
    confidenceInInsight: real("confidence_in_insight"),

    isReversible: integer("is_reversible").default(1),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("audit_trail_company_idx").on(table.companyId),
    index("audit_trail_type_idx").on(table.insightType),
    index("audit_trail_created_idx").on(table.createdAt),
  ],
);

// Aggregated Behavioral Patterns - Anonymized cross-organization patterns
export const behavioralPatternAggregates = pgTable(
  "behavioral_pattern_aggregates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Pattern identification
    patternType: text("pattern_type").notNull(), // "early_discipline", "delayed_reaction", "overconfidence", "conservatism", "internal_constraint"
    regimeType: text("regime_type").notNull(), // Which regime this pattern was observed under

    // Aggregate metrics (never individual organizations)
    organizationCount: integer("organization_count").notNull(),
    observationCount: integer("observation_count").notNull(),

    // Pattern characteristics
    avgLatencyToAction: integer("avg_latency_to_action"), // ms
    followRate: real("follow_rate"), // % that followed signal
    overrideRate: real("override_rate"), // % that overrode signal
    ignoreRate: real("ignore_rate"), // % that took no action

    // Regime context
    avgFdrAtObservation: real("avg_fdr_at_observation"),
    avgConfidenceAtObservation: real("avg_confidence_at_observation"),

    // Time bounds for aggregation
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pattern_aggregates_type_idx").on(table.patternType),
    index("pattern_aggregates_regime_idx").on(table.regimeType),
    index("pattern_aggregates_period_idx").on(table.periodStart),
  ],
);

// Behavioral Observation Schemas
export const insertBehavioralRegimeSnapshotSchema = createInsertSchema(
  behavioralRegimeSnapshots,
).omit({ id: true });
export const insertBehavioralSignalExposureSchema = createInsertSchema(
  behavioralSignalExposures,
).omit({ id: true });
export const insertBehavioralUserActionSchema = createInsertSchema(
  behavioralUserActions,
).omit({ id: true });
export const insertBehavioralSignalOverrideSchema = createInsertSchema(
  behavioralSignalOverrides,
).omit({ id: true });
export const insertBehavioralAuditTrailSchema = createInsertSchema(
  behavioralAuditTrail,
).omit({ id: true, createdAt: true });
export const insertBehavioralPatternAggregateSchema = createInsertSchema(
  behavioralPatternAggregates,
).omit({ id: true, createdAt: true });

// Behavioral Observation Types
export type BehavioralRegimeSnapshot =
  typeof behavioralRegimeSnapshots.$inferSelect;
export type InsertBehavioralRegimeSnapshot = z.infer<
  typeof insertBehavioralRegimeSnapshotSchema
>;
export type BehavioralSignalExposure =
  typeof behavioralSignalExposures.$inferSelect;
export type InsertBehavioralSignalExposure = z.infer<
  typeof insertBehavioralSignalExposureSchema
>;
export type BehavioralUserAction = typeof behavioralUserActions.$inferSelect;
export type InsertBehavioralUserAction = z.infer<
  typeof insertBehavioralUserActionSchema
>;
export type BehavioralSignalOverride =
  typeof behavioralSignalOverrides.$inferSelect;
export type InsertBehavioralSignalOverride = z.infer<
  typeof insertBehavioralSignalOverrideSchema
>;
export type BehavioralAuditTrail = typeof behavioralAuditTrail.$inferSelect;
export type InsertBehavioralAuditTrail = z.infer<
  typeof insertBehavioralAuditTrailSchema
>;
export type BehavioralPatternAggregate =
  typeof behavioralPatternAggregates.$inferSelect;
export type InsertBehavioralPatternAggregate = z.infer<
  typeof insertBehavioralPatternAggregateSchema
>;

// ============================================================================
// INTEGRATION INFRASTRUCTURE - Unified Integration Management
// ============================================================================

// Integration Configurations - Unified storage for all integration credentials
export const integrationConfigs = pgTable(
  "integration_configs",
  {
    id: serial("id").primaryKey(),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(), // e.g., "salesforce", "sap", "shopify"
    integrationType: text("integration_type").notNull(), // "crm", "erp", "ecommerce", etc.
    
    // Connection details (encrypted in production)
    credentials: jsonb("credentials").notNull(), // API keys, tokens, URLs, etc.
    
    // Status tracking
    status: text("status").notNull().default("configured"), // "configured", "active", "error", "disabled"
    lastSyncAt: timestamp("last_sync_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    
    // Data flow metrics
    inboundRecordCount: integer("inbound_record_count").default(0),
    outboundRecordCount: integer("outbound_record_count").default(0),
    lastInboundAt: timestamp("last_inbound_at"),
    lastOutboundAt: timestamp("last_outbound_at"),
    
    // Regime awareness
    regimeAwareEnabled: integer("regime_aware_enabled").default(1),
    regimeFilterLevel: text("regime_filter_level").default("all"), // "all", "confirmed_only", "high_confidence"
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("integration_configs_company_idx").on(table.companyId),
    index("integration_configs_integration_idx").on(table.integrationId),
    index("integration_configs_status_idx").on(table.status),
  ],
);

// Integration Audit Logs - Centralized error and event tracking
export const integrationAuditLogs = pgTable(
  "integration_audit_logs",
  {
    id: serial("id").primaryKey(),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    integrationConfigId: integer("integration_config_id")
      .references(() => integrationConfigs.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    
    // Event details
    eventType: text("event_type").notNull(), // "sync", "error", "config_change", "data_inbound", "data_outbound"
    eventLevel: text("event_level").notNull().default("info"), // "debug", "info", "warn", "error", "critical"
    eventMessage: text("event_message").notNull(),
    eventDetails: jsonb("event_details"), // Additional context
    
    // Data flow tracking
    recordsAffected: integer("records_affected").default(0),
    direction: text("direction"), // "inbound", "outbound", "bidirectional"
    
    // Regime context at time of event
    regimeAtEvent: text("regime_at_event"),
    fdrAtEvent: real("fdr_at_event"),
    
    // Error handling
    errorCode: text("error_code"),
    errorStackTrace: text("error_stack_trace"),
    isResolved: integer("is_resolved").default(0),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    
    // User visibility
    isUserVisible: integer("is_user_visible").default(1),
    acknowledgedAt: timestamp("acknowledged_at"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("integration_audit_logs_company_idx").on(table.companyId),
    index("integration_audit_logs_integration_idx").on(table.integrationId),
    index("integration_audit_logs_level_idx").on(table.eventLevel),
    index("integration_audit_logs_created_idx").on(table.createdAt),
  ],
);

// Canonical Entities - Cross-integration entity resolution
export const canonicalEntities = pgTable(
  "canonical_entities",
  {
    id: serial("id").primaryKey(),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    
    // Canonical entity info
    entityType: text("entity_type").notNull(), // "customer", "supplier", "product", "order", "invoice"
    canonicalId: text("canonical_id").notNull(), // Internal unique ID
    canonicalName: text("canonical_name").notNull(),
    canonicalData: jsonb("canonical_data"), // Merged/normalized data
    
    // Resolution metadata
    primarySourceIntegration: text("primary_source_integration"), // Which integration is authoritative
    confidenceScore: real("confidence_score").default(1.0),
    lastResolvedAt: timestamp("last_resolved_at"),
    conflictCount: integer("conflict_count").default(0),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("canonical_entities_company_idx").on(table.companyId),
    index("canonical_entities_type_idx").on(table.entityType),
    uniqueIndex("canonical_entities_company_type_id_unique").on(table.companyId, table.entityType, table.canonicalId),
  ],
);

// Canonical Entity Mappings - Links external IDs to canonical entities
export const canonicalEntityMappings = pgTable(
  "canonical_entity_mappings",
  {
    id: serial("id").primaryKey(),
    canonicalEntityId: integer("canonical_entity_id")
      .notNull()
      .references(() => canonicalEntities.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    externalId: text("external_id").notNull(),
    externalData: jsonb("external_data"), // Raw data from external system
    
    // Sync tracking
    lastSyncAt: timestamp("last_sync_at"),
    syncStatus: text("sync_status").default("synced"), // "synced", "pending", "conflict", "stale"
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("canonical_entity_mappings_canonical_idx").on(table.canonicalEntityId),
    index("canonical_entity_mappings_integration_idx").on(table.integrationId),
    index("canonical_entity_mappings_external_idx").on(table.externalId),
  ],
);

// Integration Documentation - Scope and limitations registry
export const integrationDocumentation = pgTable(
  "integration_documentation",
  {
    id: serial("id").primaryKey(),
    integrationId: text("integration_id").notNull().unique(),
    integrationName: text("integration_name").notNull(),
    integrationType: text("integration_type").notNull(),
    
    // Capabilities
    supportedDataObjects: jsonb("supported_data_objects").notNull(), // ["orders", "invoices", "customers"]
    supportedOperations: jsonb("supported_operations").notNull(), // ["read", "write", "sync", "webhook"]
    dataFlowDirection: text("data_flow_direction").notNull(), // "inbound", "outbound", "bidirectional"
    
    // Limitations
    knownLimitations: jsonb("known_limitations"), // Array of limitation descriptions
    rateLimits: jsonb("rate_limits"), // { requests_per_minute: 100, daily_limit: 10000 }
    dataFreshness: text("data_freshness"), // "real-time", "hourly", "daily", "manual"
    
    // Regime integration
    regimeAwareCapable: integer("regime_aware_capable").default(1),
    regimeDataFields: jsonb("regime_data_fields"), // Which fields are regime-filtered
    
    // Compliance
    lastTestedAt: timestamp("last_tested_at"),
    testStatus: text("test_status").default("untested"), // "untested", "passed", "failed", "partial"
    complianceNotes: text("compliance_notes"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("integration_documentation_type_idx").on(table.integrationType),
    index("integration_documentation_status_idx").on(table.testStatus),
  ],
);

// Integration Schemas
export const insertIntegrationConfigSchema = createInsertSchema(
  integrationConfigs,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIntegrationAuditLogSchema = createInsertSchema(
  integrationAuditLogs,
).omit({ id: true, createdAt: true });
export const insertCanonicalEntitySchema = createInsertSchema(
  canonicalEntities,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCanonicalEntityMappingSchema = createInsertSchema(
  canonicalEntityMappings,
).omit({ id: true, createdAt: true });
export const insertIntegrationDocumentationSchema = createInsertSchema(
  integrationDocumentation,
).omit({ id: true, createdAt: true, updatedAt: true });

// Integration Types
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;
export type IntegrationAuditLog = typeof integrationAuditLogs.$inferSelect;
export type InsertIntegrationAuditLog = z.infer<typeof insertIntegrationAuditLogSchema>;
export type CanonicalEntity = typeof canonicalEntities.$inferSelect;
export type InsertCanonicalEntity = z.infer<typeof insertCanonicalEntitySchema>;
export type CanonicalEntityMapping = typeof canonicalEntityMappings.$inferSelect;
export type InsertCanonicalEntityMapping = z.infer<typeof insertCanonicalEntityMappingSchema>;
export type IntegrationDocumentation = typeof integrationDocumentation.$inferSelect;
export type InsertIntegrationDocumentation = z.infer<typeof insertIntegrationDocumentationSchema>;

// Prediction Outcome Tracking (Falsification Discipline)
export const predictionOutcomes = pgTable(
  "prediction_outcomes",
  {
    id: serial("id").primaryKey(),
    companyId: text("company_id").notNull(),
    predictionType: text("prediction_type").notNull(),
    predictionId: text("prediction_id").notNull(),
    fdrAtPrediction: real("fdr_at_prediction").notNull(),
    regimeAtPrediction: text("regime_at_prediction").notNull(),
    confidenceAtPrediction: real("confidence_at_prediction").notNull(),
    predictedValue: text("predicted_value").notNull(),
    predictedDirection: text("predicted_direction"),
    actualValue: text("actual_value"),
    actualDirection: text("actual_direction"),
    isResolved: integer("is_resolved").default(0),
    wasAccurate: integer("was_accurate"),
    errorMagnitude: real("error_magnitude"),
    regimeAtOutcome: text("regime_at_outcome"),
    fdrAtOutcome: real("fdr_at_outcome"),
    predictionTimestamp: timestamp("prediction_timestamp").defaultNow().notNull(),
    outcomeTimestamp: timestamp("outcome_timestamp"),
    metadata: text("metadata"),
  },
  (table) => [
    index("prediction_outcomes_company_idx").on(table.companyId),
    index("prediction_outcomes_type_idx").on(table.predictionType),
    index("prediction_outcomes_resolved_idx").on(table.isResolved),
  ],
);

export const insertPredictionOutcomeSchema = createInsertSchema(
  predictionOutcomes,
).omit({ id: true });
export type PredictionOutcome = typeof predictionOutcomes.$inferSelect;
export type InsertPredictionOutcome = z.infer<typeof insertPredictionOutcomeSchema>;

// ============================================
// Integration Orchestrator - Canonical Data Model
// ============================================

// Integration Connections - tracks per-tenant connection state for each integration
export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("not_configured"),
    capabilities: text("capabilities").default("[]"),
    supportedObjects: text("supported_objects").default("[]"),
    dataFlowDirection: text("data_flow_direction").default("bidirectional"),
    lastSyncAt: timestamp("last_sync_at"),
    lastSyncStatus: text("last_sync_status"),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    syncFrequencyMinutes: integer("sync_frequency_minutes").default(60),
    totalSyncs: integer("total_syncs").default(0),
    totalErrors: integer("total_errors").default(0),
    totalObjectsSynced: integer("total_objects_synced").default(0),
    isVerified: integer("is_verified").default(0),
    verifiedAt: timestamp("verified_at"),
    configuredBy: varchar("configured_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ic_company_idx").on(table.companyId),
    index("ic_integration_idx").on(table.integrationId),
    uniqueIndex("ic_company_integration_unique").on(table.companyId, table.integrationId),
  ],
);

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;

// Integration Events - normalized event stream for all integration activity
export const integrationEvents = pgTable(
  "integration_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    connectionId: varchar("connection_id").references(() => integrationConnections.id),
    eventType: text("event_type").notNull(),
    canonicalObjectType: text("canonical_object_type"),
    canonicalObjectId: text("canonical_object_id"),
    externalObjectId: text("external_object_id"),
    direction: text("direction").notNull().default("inbound"),
    status: text("status").notNull().default("pending"),
    payload: text("payload"),
    errorMessage: text("error_message"),
    idempotencyKey: text("idempotency_key"),
    retryCount: integer("retry_count").default(0),
    processedAt: timestamp("processed_at"),
    regimeContext: text("regime_context"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ie_company_idx").on(table.companyId),
    index("ie_integration_idx").on(table.integrationId),
    index("ie_event_type_idx").on(table.eventType),
    index("ie_status_idx").on(table.status),
    uniqueIndex("ie_idempotency_unique_idx").on(table.companyId, table.idempotencyKey),
  ],
);

export const insertIntegrationEventSchema = createInsertSchema(integrationEvents).omit({ id: true, createdAt: true });
export type InsertIntegrationEvent = z.infer<typeof insertIntegrationEventSchema>;
export type IntegrationEvent = typeof integrationEvents.$inferSelect;

// Sync Jobs - tracks sync operations for each integration
export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    connectionId: varchar("connection_id").notNull().references(() => integrationConnections.id),
    integrationId: text("integration_id").notNull(),
    jobType: text("job_type").notNull().default("pull"),
    status: text("status").notNull().default("pending"),
    objectTypes: text("object_types").default("[]"),
    totalObjects: integer("total_objects").default(0),
    processedObjects: integer("processed_objects").default(0),
    failedObjects: integer("failed_objects").default(0),
    checkpointData: text("checkpoint_data"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sj_company_idx").on(table.companyId),
    index("sj_connection_idx").on(table.connectionId),
    index("sj_status_idx").on(table.status),
  ],
);

export const insertSyncJobSchema = createInsertSchema(syncJobs).omit({ id: true, createdAt: true });
export type InsertSyncJob = z.infer<typeof insertSyncJobSchema>;
export type SyncJob = typeof syncJobs.$inferSelect;

// Dead Letter Events - failed events that need manual review
export const deadLetterEvents = pgTable(
  "dead_letter_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    connectionId: varchar("connection_id").references(() => integrationConnections.id),
    originalEventId: varchar("original_event_id"),
    eventType: text("event_type").notNull(),
    canonicalObjectType: text("canonical_object_type"),
    payload: text("payload"),
    errorMessage: text("error_message").notNull(),
    errorCategory: text("error_category").notNull().default("unknown"),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    isResolved: integer("is_resolved").default(0),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolution: text("resolution"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dle_company_idx").on(table.companyId),
    index("dle_integration_idx").on(table.integrationId),
    index("dle_resolved_idx").on(table.isResolved),
  ],
);

export const insertDeadLetterEventSchema = createInsertSchema(deadLetterEvents).omit({ id: true, createdAt: true });
export type InsertDeadLetterEvent = z.infer<typeof insertDeadLetterEventSchema>;
export type DeadLetterEvent = typeof deadLetterEvents.$inferSelect;

// External Identity Resolution - maps external IDs to canonical internal IDs
export const externalIdentities = pgTable(
  "external_identities",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    externalId: text("external_id").notNull(),
    externalObjectType: text("external_object_type").notNull(),
    canonicalObjectType: text("canonical_object_type").notNull(),
    canonicalObjectId: text("canonical_object_id").notNull(),
    lastSyncedAt: timestamp("last_synced_at").defaultNow(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ei_company_idx").on(table.companyId),
    index("ei_external_idx").on(table.externalId),
    uniqueIndex("ei_unique_external").on(table.companyId, table.integrationId, table.externalId, table.externalObjectType),
  ],
);

export const insertExternalIdentitySchema = createInsertSchema(externalIdentities).omit({ id: true, createdAt: true });
export type InsertExternalIdentity = z.infer<typeof insertExternalIdentitySchema>;
export type ExternalIdentity = typeof externalIdentities.$inferSelect;

// Integration Health Snapshots - periodic health checks
export const integrationHealthSnapshots = pgTable(
  "integration_health_snapshots",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    connectionId: varchar("connection_id").notNull().references(() => integrationConnections.id),
    integrationId: text("integration_id").notNull(),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms"),
    errorRate: real("error_rate"),
    objectsFreshness: text("objects_freshness"),
    details: text("details"),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => [
    index("ihs_company_idx").on(table.companyId),
    index("ihs_connection_idx").on(table.connectionId),
    index("ihs_checked_idx").on(table.checkedAt),
  ],
);

export const insertIntegrationHealthSnapshotSchema = createInsertSchema(integrationHealthSnapshots).omit({ id: true });
export type InsertIntegrationHealthSnapshot = z.infer<typeof insertIntegrationHealthSnapshotSchema>;
export type IntegrationHealthSnapshot = typeof integrationHealthSnapshots.$inferSelect;

// Canonical Object Types enum for type safety
export const CANONICAL_OBJECT_TYPES = [
  "organization", "user", "location", "sku", "material", "supplier",
  "customer", "contract", "rfq", "purchase_order", "invoice", "payment",
  "shipment", "inventory_snapshot", "production_run", "quality_event",
  "work_order", "ticket", "project", "document", "news_item",
  "economic_snapshot", "commodity_price", "weather_data",
] as const;
export type CanonicalObjectType = typeof CANONICAL_OBJECT_TYPES[number];

// Integration Status enum
export const INTEGRATION_STATUSES = [
  "not_configured", "connected", "syncing", "healthy",
  "degraded", "failed", "disabled",
] as const;
export type IntegrationStatus = typeof INTEGRATION_STATUSES[number];

// Integration Capability enum
export const INTEGRATION_CAPABILITIES = [
  "import", "export", "bidirectional", "webhooks", "batch", "file_edi", "real_time",
] as const;
export type IntegrationCapability = typeof INTEGRATION_CAPABILITIES[number];
  
// ============================================================
// Track D: Data Foundation - Lead-time distributions, MOQ, capacity, data quality
// ============================================================

export const dataQualityScores = pgTable("data_quality_scores", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  missingness: real("missingness").notNull().default(0),
  staleness: real("staleness").notNull().default(0),
  outlierScore: real("outlier_score").notNull().default(0),
  overallScore: real("overall_score").notNull().default(0),
  details: jsonb("details"),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
}, (table) => [
  index("dqs_company_idx").on(table.companyId),
  index("dqs_entity_idx").on(table.companyId, table.entityType, table.entityId),
]);

export const insertDataQualityScoreSchema = createInsertSchema(dataQualityScores).omit({ id: true });
export type DataQualityScore = typeof dataQualityScores.$inferSelect;
export type InsertDataQualityScore = z.infer<typeof insertDataQualityScoreSchema>;

export const leadTimeDistributions = pgTable("lead_time_distributions", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  meanDays: real("mean_days").notNull(),
  stddevDays: real("stddev_days").notNull().default(0),
  p50Days: real("p50_days"),
  p90Days: real("p90_days"),
  p95Days: real("p95_days"),
  sampleSize: integer("sample_size").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("ltd_company_idx").on(table.companyId),
  index("ltd_supplier_material_idx").on(table.supplierId, table.materialId),
]);

export const insertLeadTimeDistributionSchema = createInsertSchema(leadTimeDistributions).omit({ id: true });
export type LeadTimeDistribution = typeof leadTimeDistributions.$inferSelect;
export type InsertLeadTimeDistribution = z.infer<typeof insertLeadTimeDistributionSchema>;

export const materialConstraints = pgTable("material_constraints", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  moq: real("moq"),
  packSize: real("pack_size"),
  maxCapacityPerPeriod: real("max_capacity_per_period"),
  safetyStockDays: real("safety_stock_days"),
  reorderPointUnits: real("reorder_point_units"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("mc_company_idx").on(table.companyId),
  uniqueIndex("mc_company_material_unique").on(table.companyId, table.materialId),
]);

export const insertMaterialConstraintSchema = createInsertSchema(materialConstraints).omit({ id: true });
export type MaterialConstraint = typeof materialConstraints.$inferSelect;
export type InsertMaterialConstraint = z.infer<typeof insertMaterialConstraintSchema>;

// ============================================================
// Track B: AI Copilot - Draft-only action system
// ============================================================

export const COPILOT_DRAFT_STATUSES = ["draft", "pending_approval", "approved", "rejected", "expired"] as const;
export type CopilotDraftStatus = typeof COPILOT_DRAFT_STATUSES[number];

export const COPILOT_DRAFT_TYPES = ["purchase_order", "rfq", "safety_stock_adjustment", "inventory_rebalance"] as const;
export type CopilotDraftType = typeof COPILOT_DRAFT_TYPES[number];

export const copilotActionDrafts = pgTable("copilot_action_drafts", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  draftType: varchar("draft_type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  title: text("title").notNull(),
  reasoning: text("reasoning"),
  evidence: jsonb("evidence"),
  evidenceBundle: jsonb("evidence_bundle"),
  draftPayload: jsonb("draft_payload").notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  approvedBy: varchar("approved_by", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by", { length: 255 }),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  executedAt: timestamp("executed_at"),
  executionResult: jsonb("execution_result"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cad_company_idx").on(table.companyId),
  index("cad_status_idx").on(table.companyId, table.status),
]);

export const insertCopilotActionDraftSchema = createInsertSchema(copilotActionDrafts).omit({ id: true, createdAt: true });
export type CopilotActionDraft = typeof copilotActionDrafts.$inferSelect;
export type InsertCopilotActionDraft = z.infer<typeof insertCopilotActionDraftSchema>;

export const copilotQueryLog = pgTable("copilot_query_log", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }),
  query: text("query").notNull(),
  responseText: text("response_text"),
  evidenceRefs: jsonb("evidence_refs"),
  evidenceBundle: jsonb("evidence_bundle"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cql_company_idx").on(table.companyId),
]);

export const insertCopilotQueryLogSchema = createInsertSchema(copilotQueryLog).omit({ id: true, createdAt: true });
export type CopilotQueryLog = typeof copilotQueryLog.$inferSelect;
export type InsertCopilotQueryLog = z.infer<typeof insertCopilotQueryLogSchema>;

// ============================================================
// Track A: Offline Evaluation & Calibration
// ============================================================

export const evaluationRuns = pgTable("evaluation_runs", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("running"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  config: jsonb("config"),
  summary: jsonb("summary"),
  artifactPath: text("artifact_path"),
}, (table) => [
  index("er_company_idx").on(table.companyId),
]);

export const insertEvaluationRunSchema = createInsertSchema(evaluationRuns).omit({ id: true });
export type EvaluationRun = typeof evaluationRuns.$inferSelect;
export type InsertEvaluationRun = z.infer<typeof insertEvaluationRunSchema>;

export const evaluationMetrics = pgTable("evaluation_metrics", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => evaluationRuns.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 64 }).notNull(),
  metricName: varchar("metric_name", { length: 128 }).notNull(),
  value: real("value").notNull(),
  details: jsonb("details"),
}, (table) => [
  index("em_run_idx").on(table.runId),
]);

export const insertEvaluationMetricSchema = createInsertSchema(evaluationMetrics).omit({ id: true });
export type EvaluationMetric = typeof evaluationMetrics.$inferSelect;
export type InsertEvaluationMetric = z.infer<typeof insertEvaluationMetricSchema>;

// ============================================================
// Track C: Decision Intelligence - Recommendations & What-If
// ============================================================

export const decisionRecommendations = pgTable("decision_recommendations", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  recommendationType: varchar("recommendation_type", { length: 64 }).notNull(),
  materialId: varchar("material_id").references(() => materials.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  regime: varchar("regime", { length: 32 }),
  recommendedQuantity: real("recommended_quantity"),
  recommendedTiming: varchar("recommended_timing", { length: 128 }),
  confidence: real("confidence"),
  reasoning: text("reasoning"),
  inputs: jsonb("inputs"),
  policyVersion: varchar("policy_version", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("dr_company_idx").on(table.companyId),
]);

export const insertDecisionRecommendationSchema = createInsertSchema(decisionRecommendations).omit({ id: true, createdAt: true });
export type DecisionRecommendation = typeof decisionRecommendations.$inferSelect;
export type InsertDecisionRecommendation = z.infer<typeof insertDecisionRecommendationSchema>;

export const decisionOverrides = pgTable("decision_overrides", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  recommendationId: integer("recommendation_id").references(() => decisionRecommendations.id),
  userId: varchar("user_id", { length: 255 }).notNull(),
  overriddenField: varchar("overridden_field", { length: 128 }).notNull(),
  originalValue: text("original_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  regime: varchar("regime", { length: 32 }),
  forecastUncertainty: real("forecast_uncertainty"),
  dataQualityScore: real("data_quality_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("do_company_idx").on(table.companyId),
  index("do_recommendation_idx").on(table.recommendationId),
]);

export const insertDecisionOverrideSchema = createInsertSchema(decisionOverrides).omit({ id: true, createdAt: true });
export type DecisionOverride = typeof decisionOverrides.$inferSelect;
export type InsertDecisionOverride = z.infer<typeof insertDecisionOverrideSchema>;

// ============================================================
// Milestone 2 - Track 2: Auditable Counterfactual Savings
// ============================================================

export const savingsEvidenceRecords = pgTable("savings_evidence_records", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  savingsType: varchar("savings_type", { length: 64 }).notNull(),
  actionContext: jsonb("action_context").notNull(),
  counterfactualDefinition: varchar("counterfactual_definition", { length: 128 }).notNull(),
  assumptions: jsonb("assumptions").notNull(),
  scenarioInputs: jsonb("scenario_inputs"),
  computationMethod: varchar("computation_method", { length: 128 }).notNull(),
  estimatedSavings: real("estimated_savings").notNull(),
  measuredSavings: real("measured_savings"),
  measuredOutcomeRef: jsonb("measured_outcome_ref"),
  entityRefs: jsonb("entity_refs").notNull(),
  regime: varchar("regime", { length: 32 }),
  policyVersion: varchar("policy_version", { length: 32 }),
  immutable: boolean("immutable").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  measuredAt: timestamp("measured_at"),
}, (table) => [
  index("ser_company_idx").on(table.companyId),
  index("ser_type_idx").on(table.companyId, table.savingsType),
]);

export const insertSavingsEvidenceRecordSchema = createInsertSchema(savingsEvidenceRecords).omit({ id: true, createdAt: true });
export type SavingsEvidenceRecord = typeof savingsEvidenceRecords.$inferSelect;
export type InsertSavingsEvidenceRecord = z.infer<typeof insertSavingsEvidenceRecordSchema>;

// ============================================================
// Milestone 2 - Track 4: Enterprise Identity & Access
// ============================================================

export const ssoConfigurations = pgTable("sso_configurations", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 512 }),
  ssoUrl: varchar("sso_url", { length: 1024 }),
  certificate: text("certificate"),
  metadataUrl: varchar("metadata_url", { length: 1024 }),
  enabled: boolean("enabled").notNull().default(false),
  enforced: boolean("enforced").notNull().default(false),
  allowedDomains: text("allowed_domains").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("sso_company_provider_unique").on(table.companyId, table.provider),
]);

export const insertSsoConfigurationSchema = createInsertSchema(ssoConfigurations).omit({ id: true, createdAt: true, updatedAt: true });
export type SsoConfiguration = typeof ssoConfigurations.$inferSelect;
export type InsertSsoConfiguration = z.infer<typeof insertSsoConfigurationSchema>;

export const scimProvisioningLog = pgTable("scim_provisioning_log", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  operation: varchar("operation", { length: 32 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  externalId: varchar("external_id", { length: 512 }),
  internalUserId: varchar("internal_user_id", { length: 255 }),
  requestPayload: jsonb("request_payload"),
  responseStatus: integer("response_status"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("spl_company_idx").on(table.companyId),
  index("spl_external_idx").on(table.companyId, table.externalId),
]);

export const insertScimProvisioningLogSchema = createInsertSchema(scimProvisioningLog).omit({ id: true, createdAt: true });
export type ScimProvisioningLog = typeof scimProvisioningLog.$inferSelect;
export type InsertScimProvisioningLog = z.infer<typeof insertScimProvisioningLogSchema>;

export const auditExportConfigs = pgTable("audit_export_configs", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  retentionDays: integer("retention_days").notNull().default(365),
  exportFormat: varchar("export_format", { length: 32 }).notNull().default("json"),
  redactionEnabled: boolean("redaction_enabled").notNull().default(true),
  allowedCategories: text("allowed_categories").array(),
  lastExportAt: timestamp("last_export_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("aec_company_unique").on(table.companyId),
]);

export const insertAuditExportConfigSchema = createInsertSchema(auditExportConfigs).omit({ id: true });
export type AuditExportConfig = typeof auditExportConfigs.$inferSelect;
export type InsertAuditExportConfig = z.infer<typeof insertAuditExportConfigSchema>;

// ============================================================
// Milestone 3: Regime-Aware Optimization & Backtest
// ============================================================

export const regimeBacktestReports = pgTable("regime_backtest_reports", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("running"),
  transitionsAnalyzed: integer("transitions_analyzed").notNull().default(0),
  avgDetectionLagDays: real("avg_detection_lag_days"),
  avgStabilityDurationDays: real("avg_stability_duration_days"),
  falseTransitionRate: real("false_transition_rate"),
  totalReadings: integer("total_readings").notNull().default(0),
  regimeAccuracy: real("regime_accuracy"),
  summary: jsonb("summary"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("rbr_company_idx").on(table.companyId),
]);

export const insertRegimeBacktestReportSchema = createInsertSchema(regimeBacktestReports).omit({ id: true, createdAt: true });
export type RegimeBacktestReport = typeof regimeBacktestReports.$inferSelect;
export type InsertRegimeBacktestReport = z.infer<typeof insertRegimeBacktestReportSchema>;

export const optimizationRuns = pgTable("optimization_runs", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").references(() => materials.id),
  regime: varchar("regime", { length: 32 }),
  optimizedQuantity: real("optimized_quantity"),
  currentPolicyQuantity: real("current_policy_quantity"),
  expectedServiceLevel: real("expected_service_level"),
  expectedCost: real("expected_cost"),
  stockoutRisk: real("stockout_risk"),
  costSavingsVsCurrent: real("cost_savings_vs_current"),
  serviceLevelDelta: real("service_level_delta"),
  confidenceInterval: jsonb("confidence_interval"),
  evidenceBundle: jsonb("evidence_bundle"),
  whatIfComparison: jsonb("what_if_comparison"),
  policyInputs: jsonb("policy_inputs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("or_company_idx").on(table.companyId),
  index("or_material_idx").on(table.companyId, table.materialId),
]);

export const insertOptimizationRunSchema = createInsertSchema(optimizationRuns).omit({ id: true, createdAt: true });
export type OptimizationRun = typeof optimizationRuns.$inferSelect;
export type InsertOptimizationRun = z.infer<typeof insertOptimizationRunSchema>;

// ============================================================
// Milestone 4: Pilot Evaluation Mode
// ============================================================

export const pilotExperiments = pgTable("pilot_experiments", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  experimentId: varchar("experiment_id", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("created"),
  windowWeeks: integer("window_weeks").notNull().default(12),
  configSnapshot: jsonb("config_snapshot").notNull(),
  configHash: varchar("config_hash", { length: 64 }).notNull(),
  baselineResults: jsonb("baseline_results"),
  optimizedResults: jsonb("optimized_results"),
  comparisonSummary: jsonb("comparison_summary"),
  evidenceBundle: jsonb("evidence_bundle"),
  artifactMd: text("artifact_md"),
  artifactJson: jsonb("artifact_json"),
  seed: integer("seed").notNull().default(42),
  replayable: boolean("replayable").notNull().default(true),
  productionMutations: integer("production_mutations").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  lockedAt: timestamp("locked_at"),
}, (table) => [
  index("pe_company_idx").on(table.companyId),
  index("pe_experiment_idx").on(table.experimentId),
]);

export const insertPilotExperimentSchema = createInsertSchema(pilotExperiments).omit({ id: true, createdAt: true });
export type PilotExperiment = typeof pilotExperiments.$inferSelect;
export type InsertPilotExperiment = z.infer<typeof insertPilotExperimentSchema>;

// ============================================================
// Predictive Stability Reports (Adaptive Forecasting Layer)
// ============================================================

export const predictiveStabilityReports = pgTable("predictive_stability_reports", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 64 }).notNull(),
  engineVersion: varchar("engine_version", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("created"),
  configHash: varchar("config_hash", { length: 64 }).notNull(),
  seed: integer("seed").notNull().default(42),
  reportData: jsonb("report_data"),
  artifactMd: text("artifact_md"),
  artifactJson: jsonb("artifact_json"),
  productionMutations: integer("production_mutations").notNull().default(0),
  replayable: boolean("replayable").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("psr_company_idx").on(table.companyId),
  index("psr_version_idx").on(table.version),
]);

export const insertPredictiveStabilityReportSchema = createInsertSchema(predictiveStabilityReports).omit({ id: true, createdAt: true });
export type PredictiveStabilityReport = typeof predictiveStabilityReports.$inferSelect;
export type InsertPredictiveStabilityReport = z.infer<typeof insertPredictiveStabilityReportSchema>;

// ============================================================
// Stress Test Reports (Stress Testing & Robustness Module)
// ============================================================

export const stressTestReports = pgTable("stress_test_reports", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 64 }).notNull(),
  engineVersion: varchar("engine_version", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("created"),
  configHash: varchar("config_hash", { length: 64 }).notNull(),
  seed: integer("seed").notNull().default(42),
  reportData: jsonb("report_data"),
  artifactMd: text("artifact_md"),
  artifactJson: jsonb("artifact_json"),
  productionMutations: integer("production_mutations").notNull().default(0),
  replayable: boolean("replayable").notNull().default(true),
  overallRating: varchar("overall_rating", { length: 32 }),
  scenarioCount: integer("scenario_count").notNull().default(0),
  robustnessScore: real("robustness_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("str_company_idx").on(table.companyId),
  index("str_version_idx").on(table.version),
]);

export const insertStressTestReportSchema = createInsertSchema(stressTestReports).omit({ id: true, createdAt: true });
export type StressTestReport = typeof stressTestReports.$inferSelect;
export type InsertStressTestReport = z.infer<typeof insertStressTestReportSchema>;

// ============================================================
// Executive Reports (Revenue-Optimized Execution Layer)
// ============================================================

export const executiveReports = pgTable("executive_reports", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  experimentId: varchar("experiment_id", { length: 128 }).notNull(),
  reportType: varchar("report_type", { length: 64 }).notNull().default("pilot_conversion"),
  configHash: varchar("config_hash", { length: 64 }).notNull(),
  replayId: varchar("replay_id", { length: 128 }).notNull(),
  roiSummary: jsonb("roi_summary").notNull(),
  stressResilienceSummary: jsonb("stress_resilience_summary"),
  regimeExposureSummary: jsonb("regime_exposure_summary"),
  tailRiskMetrics: jsonb("tail_risk_metrics"),
  reportJson: jsonb("report_json").notNull(),
  reportMd: text("report_md").notNull(),
  productionMutations: integer("production_mutations").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("exec_rpt_company_idx").on(table.companyId),
  index("exec_rpt_experiment_idx").on(table.experimentId),
]);

export const insertExecutiveReportSchema = createInsertSchema(executiveReports).omit({ id: true, createdAt: true });
export type ExecutiveReport = typeof executiveReports.$inferSelect;
export type InsertExecutiveReport = z.infer<typeof insertExecutiveReportSchema>;

// ============================================================
// Landing Mode Configuration
// ============================================================

export const landingModeConfig = pgTable("landing_mode_config", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLandingModeConfigSchema = createInsertSchema(landingModeConfig).omit({ id: true });
export type LandingModeConfig = typeof landingModeConfig.$inferSelect;

// ============================================================
// Decision Outcomes — win/loss tracking for every system decision
// ============================================================

export const decisionOutcomes = pgTable(
  "decision_outcomes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    decisionId: varchar("decision_id").notNull(),
    skuId: varchar("sku_id"),
    regime: text("regime"),
    segment: text("segment"),     // "fast_mover" | "slow_mover" | "intermittent" | "no_data"
    baselineDecision: jsonb("baseline_decision").notNull(),
    systemDecision: jsonb("system_decision").notNull(),
    actualOutcome: jsonb("actual_outcome").notNull(),
    win: boolean("win").notNull(),
    winType: text("win_type").notNull(),
    deltaCost: real("delta_cost"),
    deltaServiceLevel: real("delta_service_level"),
    deltaStockout: real("delta_stockout"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("decision_outcomes_company_idx").on(t.companyId)],
);

export const insertDecisionOutcomeSchema = createInsertSchema(decisionOutcomes).omit({ id: true, createdAt: true });
export type DecisionOutcomeRow = typeof decisionOutcomes.$inferSelect;

// ============================================================
// Win Rate Snapshots — daily aggregated performance metrics
// ============================================================

export const winRateSnapshots = pgTable(
  "win_rate_snapshots",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    snapshotDate: text("snapshot_date").notNull(),   // "YYYY-MM-DD"
    globalWinRate: real("global_win_rate").notNull(),
    totalDecisions: integer("total_decisions").notNull(),
    totalWins: integer("total_wins").notNull(),
    winRateBySku: jsonb("win_rate_by_sku"),
    winRateBySegment: jsonb("win_rate_by_segment"),
    winRateByRegime: jsonb("win_rate_by_regime"),
    performanceFlag: text("performance_flag"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("win_rate_snapshots_company_idx").on(t.companyId),
    uniqueIndex("win_rate_snapshots_company_date_uniq").on(t.companyId, t.snapshotDate),
  ],
);

export const insertWinRateSnapshotSchema = createInsertSchema(winRateSnapshots).omit({ id: true, createdAt: true });
export type WinRateSnapshot = typeof winRateSnapshots.$inferSelect;
 
// ============================================================
// News Articles — real RSS-ingested, validated, deduplicated
// ============================================================

export const newsArticles = pgTable(
  "news_articles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    link: text("link").notNull(),
    source: text("source").notNull(),
    pubDate: timestamp("pub_date").notNull(),
    description: text("description"),
    category: text("category").notNull(),   // macro | supply_chain | commodities | manufacturing | geopolitics
    sentiment: text("sentiment").notNull(),  // positive | neutral | negative
    relevanceScore: real("relevance_score").notNull(),  // [0, 1]
    region: text("region"),
    relatedEntities: text("related_entities").array(),
    ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
    hash: text("hash").notNull(),  // sha256(normalizedTitle + source)
    provenance: text("provenance").notNull().default("RSS_V1"),
  },
  (t) => [
    index("news_articles_ingested_idx").on(t.ingestedAt),
    index("news_articles_category_idx").on(t.category),
    uniqueIndex("news_articles_hash_uniq").on(t.hash),
  ],
);

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({ id: true, ingestedAt: true });
export type NewsArticleRow = typeof newsArticles.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE AUTH + PAYMENTS TABLES
// ─────────────────────────────────────────────────────────────────────────────

// Password Reset Tokens — secure hashed tokens with expiration + single-use flag
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),  // sha256 of the raw token
    expiresAt: timestamp("expires_at").notNull(),
    used: integer("used").notNull().default(0), // 0=unused, 1=used
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("prt_user_idx").on(t.userId),
    index("prt_expires_idx").on(t.expiresAt),
  ],
);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Payments — immutable payment event records (one per payment intent lifecycle)
export const payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),         // in cents
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"), // pending | succeeded | failed | refunded
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeChargeId: text("stripe_charge_id"),
    description: text("description"),
    metadata: text("metadata"),                 // JSON string
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("payments_user_idx").on(t.userId),
    index("payments_company_idx").on(t.companyId),
    index("payments_status_idx").on(t.status),
    index("payments_created_idx").on(t.createdAt),
  ],
);

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });
export type Payment = typeof payments.$inferSelect;

// Supplier Payouts — Stripe Connect transfer records
export const supplierPayouts = pgTable(
  "supplier_payouts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),         // in cents
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"), // pending | sent | failed
    stripeTransferId: text("stripe_transfer_id").unique(),
    stripeConnectedAccountId: text("stripe_connected_account_id"),
    description: text("description"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("payouts_supplier_idx").on(t.supplierId),
    index("payouts_company_idx").on(t.companyId),
    index("payouts_status_idx").on(t.status),
  ],
);

export const insertSupplierPayoutSchema = createInsertSchema(supplierPayouts).omit({ id: true, createdAt: true, updatedAt: true });
export type SupplierPayout = typeof supplierPayouts.$inferSelect;

// ─── Enterprise Auth & Billing Tables ─────────────────────────────────────────

/**
 * authSessions — JWT refresh token store (distinct from Express sessions table).
 * Enables server-side refresh token rotation and revocation.
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceFingerprint: text("device_fingerprint"),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("auth_sessions_user_idx").on(t.userId),
    index("auth_sessions_token_idx").on(t.refreshTokenHash),
    index("auth_sessions_expires_idx").on(t.expiresAt),
  ],
);
export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({ id: true, createdAt: true });
export type AuthSession = typeof authSessions.$inferSelect;

/**
 * subscriptions — Tracks user/company billing plan.
 * IMPORTANT: Plan type is stored for billing mechanics ONLY — no feature gating.
 * All plans include all features. Differences are billing structure only.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(), // "monthly_starter"|"monthly_growth"|"annual_starter"|"annual_growth"|"usage_based"
    status: text("status").notNull().default("active"), // active|past_due|canceled|trialing|incomplete
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: integer("cancel_at_period_end").default(0),
    trialEndsAt: timestamp("trial_ends_at"),
    // Usage-based billing: base fee + per-unit / % of spend
    usageBaseFeeCents: integer("usage_base_fee_cents"),     // $199/month = 19900
    usageRatePerUnit: text("usage_rate_per_unit"),           // "0.02" = $0.02 per unit
    usageRatePercent: text("usage_rate_percent"),            // "0.0025" = 0.25% of spend
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_company_idx").on(t.companyId),
    index("subscriptions_status_idx").on(t.status),
    index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  ],
);
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type Subscription = typeof subscriptions.$inferSelect;

/**
 * usageEvents — Metered billing event log.
 * Aggregated daily and reported to Stripe for usage-based plans.
 */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
    subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    metricType: text("metric_type").notNull(), // "units_processed" | "procurement_spend"
    quantity: text("quantity").notNull(), // stored as text to preserve decimal precision
    valueCents: integer("value_cents"),  // computed billing value for this event (if spend-based)
    reportedToStripe: integer("reported_to_stripe").default(0),
    stripeUsageRecordId: text("stripe_usage_record_id"),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (t) => [
    index("usage_events_user_idx").on(t.userId),
    index("usage_events_company_idx").on(t.companyId),
    index("usage_events_metric_idx").on(t.metricType),
    index("usage_events_timestamp_idx").on(t.timestamp),
    index("usage_events_reported_idx").on(t.reportedToStripe),
  ],
);
export const insertUsageEventSchema = createInsertSchema(usageEvents).omit({ id: true, timestamp: true });
export type UsageEvent = typeof usageEvents.$inferSelect;

/**
 * transactions — One-time procurement payment transactions.
 * Records platform fee, supplier ID, and full audit trail.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
    supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),              // total in cents
    fee: integer("fee").notNull().default(0),          // platform fee in cents
    netAmount: integer("net_amount").notNull(),         // amount - fee
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"), // pending|succeeded|failed|refunded|blocked
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeChargeId: text("stripe_charge_id"),
    description: text("description"),
    fraudScore: text("fraud_score"),                   // 0.0–1.0 as text for precision
    fraudFlags: jsonb("fraud_flags"),                  // array of flag reasons
    requiresApproval: integer("requires_approval").default(0),
    approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("transactions_user_idx").on(t.userId),
    index("transactions_company_idx").on(t.companyId),
    index("transactions_supplier_idx").on(t.supplierId),
    index("transactions_status_idx").on(t.status),
    index("transactions_created_idx").on(t.createdAt),
  ],
);
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true, updatedAt: true });
export type Transaction = typeof transactions.$inferSelect;

/**
 * invoices — Invoice records (subscription + usage breakdowns).
 */
export const invoices = pgTable(
  "invoices",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
    subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    status: text("status").notNull().default("draft"), // draft|open|paid|void|uncollectible
    total: integer("total").notNull(),                 // in cents
    subtotal: integer("subtotal").notNull(),
    taxAmount: integer("tax_amount").default(0),
    currency: text("currency").notNull().default("usd"),
    lineItems: jsonb("line_items"),                    // [{description, quantity, unitAmount, amount}]
    usageBreakdown: jsonb("usage_breakdown"),           // aggregated usage for the period
    pdfUrl: text("pdf_url"),                           // stored URL or "/api/invoices/:id/download"
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("invoices_user_idx").on(t.userId),
    index("invoices_company_idx").on(t.companyId),
    index("invoices_status_idx").on(t.status),
    index("invoices_stripe_idx").on(t.stripeInvoiceId),
  ],
);
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export type Invoice = typeof invoices.$inferSelect;

/**
 * skuCountSnapshots — Daily SKU count snapshots for usage-based metering.
 * Stores historical SKU counts per company per day for billing audits.
 */
export const skuCountSnapshots = pgTable(
  "sku_count_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    countDate: text("count_date").notNull(), // ISO date string (YYYY-MM-DD)
    activeSkuCount: integer("active_sku_count").notNull(),
    stripeMeterEventId: text("stripe_meter_event_id"), // Idempotency key or Stripe event ID
    recordedAt: timestamp("recorded_at").defaultNow(),
  },
  (t) => [
    index("sku_count_snapshots_company_idx").on(t.companyId),
    index("sku_count_snapshots_date_idx").on(t.countDate),
    // Unique constraint: one snapshot per company per day
  ],
);

export const insertSkuCountSnapshotSchema = createInsertSchema(skuCountSnapshots).omit({
  id: true,
  recordedAt: true,
});
export type SkuCountSnapshot = typeof skuCountSnapshots.$inferSelect;

/**
 * fraudEvents — Immutable fraud detection audit log.
 */
export const fraudEvents = pgTable(
  "fraud_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
    transactionId: varchar("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    fraudScore: text("fraud_score").notNull(),       // "0.00" – "1.00"
    outcome: text("outcome").notNull(),               // "allowed"|"requires_approval"|"blocked"
    flags: jsonb("flags").notNull(),                  // [{rule, detail}]
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("fraud_events_user_idx").on(t.userId),
    index("fraud_events_score_idx").on(t.fraudScore),
    index("fraud_events_outcome_idx").on(t.outcome),
    index("fraud_events_created_idx").on(t.createdAt),
  ],
);
export const insertFraudEventSchema = createInsertSchema(fraudEvents).omit({ id: true, createdAt: true });
export type FraudEvent = typeof fraudEvents.$inferSelect;

// ============================================================
// Performance-Based Billing
// Tracks verified savings → fee computation → invoice audit
// ============================================================

export const performanceBilling = pgTable(
  "performance_billing",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    savingsRecordId: integer("savings_record_id").notNull().references(() => savingsEvidenceRecords.id, { onDelete: "restrict" }),
    measuredSavings: real("measured_savings").notNull(),   // dollars — must match evidence record
    feePercentage: real("fee_percentage").notNull(),        // 0.10 – 0.20
    feeAmount: real("fee_amount").notNull(),                // measuredSavings × feePercentage
    status: text("status").notNull().default("pending"),    // pending | invoiced | paid | disputed | cancelled
    billingPeriodStart: timestamp("billing_period_start"),
    billingPeriodEnd: timestamp("billing_period_end"),
    invoiceId: varchar("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("perf_billing_company_idx").on(t.companyId),
    index("perf_billing_savings_record_idx").on(t.savingsRecordId),
    index("perf_billing_status_idx").on(t.status),
    uniqueIndex("perf_billing_savings_record_unique").on(t.savingsRecordId), // no duplicate billing per record
  ],
);

export const insertPerformanceBillingSchema = createInsertSchema(performanceBilling).omit({ id: true, createdAt: true, updatedAt: true });
export type PerformanceBilling = typeof performanceBilling.$inferSelect;
export type InsertPerformanceBilling = z.infer<typeof insertPerformanceBillingSchema>;

// ============================================================
// Procurement Execution — Purchase Intents & Billing Profiles
// ============================================================

export const billingProfiles = pgTable(
  "billing_profiles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().unique().references(() => companies.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    defaultPaymentMethodId: text("default_payment_method_id"),
    paymentMethodLast4: text("payment_method_last4"),
    paymentMethodBrand: text("payment_method_brand"),
    billingEmail: text("billing_email").notNull(),
    companyName: text("company_name").notNull(),
    address: jsonb("address"),                           // { street, city, state, zip, country }
    taxId: text("tax_id"),
    preferredPaymentMethod: text("preferred_payment_method").notNull().default("card"), // card|ach|invoice
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("billing_profiles_company_idx").on(t.companyId),
  ],
);
export const insertBillingProfileSchema = createInsertSchema(billingProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type BillingProfile = typeof billingProfiles.$inferSelect;
export type InsertBillingProfile = z.infer<typeof insertBillingProfileSchema>;

export const purchaseIntents = pgTable(
  "purchase_intents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    materialId: varchar("material_id").references(() => materials.id, { onDelete: "set null" }),
    recommendationId: varchar("recommendation_id").references(() => autoPurchaseRecommendations.id, { onDelete: "set null" }),
    executedByUserId: varchar("executed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    quantity: real("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    totalAmount: real("total_amount").notNull(),
    status: text("status").notNull().default("draft"),   // draft|pending_approval|approved|executing|completed|failed
    paymentMethod: text("payment_method").notNull().default("card"), // card|ach|invoice
    trustScore: real("trust_score"),
    fraudScore: real("fraud_score"),
    evidenceBundle: jsonb("evidence_bundle"),             // { recommendationId, trustScore, unitCostSource, demandBasis, decisionTraceId }
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
    failureReason: text("failure_reason"),
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("purchase_intents_company_idx").on(t.companyId),
    index("purchase_intents_status_idx").on(t.status),
    index("purchase_intents_recommendation_idx").on(t.recommendationId),
  ],
);
export const insertPurchaseIntentSchema = createInsertSchema(purchaseIntents).omit({ id: true, createdAt: true, updatedAt: true });
export type PurchaseIntent = typeof purchaseIntents.$inferSelect;
export type InsertPurchaseIntent = z.infer<typeof insertPurchaseIntentSchema>;

// ============================================================
// Payment Methods — Saved cards per company (multi-card)
// ============================================================
export const companyPaymentMethods = pgTable(
  "company_payment_methods",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    expMonth: integer("exp_month").notNull(),
    expYear: integer("exp_year").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("company_pm_company_idx").on(t.companyId),
  ],
);
export const insertCompanyPaymentMethodSchema = createInsertSchema(companyPaymentMethods).omit({ id: true, createdAt: true });
export type CompanyPaymentMethod = typeof companyPaymentMethods.$inferSelect;
export type InsertCompanyPaymentMethod = z.infer<typeof insertCompanyPaymentMethodSchema>;

// ============================================================
// Subscription Payments — Invoice tracking
// ============================================================
export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("pending"),   // paid|pending|failed
    billingPeriodStart: timestamp("billing_period_start"),
    billingPeriodEnd: timestamp("billing_period_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("subscription_payments_company_idx").on(t.companyId),
  ],
);
export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).omit({ id: true, createdAt: true });
export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;

// ============================================================
// Purchase Transactions — Supplier payment tracking
// ============================================================
export const purchaseTransactions = pgTable(
  "purchase_transactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    purchaseIntentId: varchar("purchase_intent_id").references(() => purchaseIntents.id, { onDelete: "set null" }),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("pending"),   // pending|succeeded|failed
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("purchase_transactions_company_idx").on(t.companyId),
    index("purchase_transactions_intent_idx").on(t.purchaseIntentId),
  ],
);
export const insertPurchaseTransactionSchema = createInsertSchema(purchaseTransactions).omit({ id: true, createdAt: true });
export type PurchaseTransaction = typeof purchaseTransactions.$inferSelect;
export type InsertPurchaseTransaction = z.infer<typeof insertPurchaseTransactionSchema>;

// ── Workflow Automation Engine ──────────────────────────────────────────────
export const automationRules = pgTable(
  "automation_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdBy: varchar("created_by")
      .references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    triggerType: text("trigger_type").notNull(), // "entity_change", "threshold", "schedule", "manual"
    triggerEntity: text("trigger_entity"), // "material", "supplier", "machinery", etc.
    triggerEvent: text("trigger_event"), // "create", "update", "delete", "any"
    conditions: jsonb("conditions").notNull().default(sql`'[]'::jsonb`), // Array of { field, operator, value }
    actions: jsonb("actions").notNull().default(sql`'[]'::jsonb`), // Array of { type, params }
    executionCount: integer("execution_count").notNull().default(0),
    lastExecutedAt: timestamp("last_executed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("automation_rules_company_idx").on(table.companyId),
    index("automation_rules_trigger_idx").on(table.triggerType, table.triggerEntity),
  ],
);

export const automationExecutions = pgTable(
  "automation_executions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ruleId: varchar("rule_id")
      .notNull()
      .references(() => automationRules.id, { onDelete: "cascade" }),
    companyId: varchar("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    triggerData: jsonb("trigger_data"), // The event data that triggered execution
    conditionResults: jsonb("condition_results"), // Which conditions matched
    actionResults: jsonb("action_results"), // Result of each action
    status: text("status").notNull().default("pending"), // "pending", "running", "completed", "failed"
    error: text("error"),
    duration: integer("duration"), // ms
    executedAt: timestamp("executed_at").notNull().defaultNow(),
  },
  (table) => [
    index("automation_executions_rule_idx").on(table.ruleId),
    index("automation_executions_company_idx").on(table.companyId),
    index("automation_executions_status_idx").on(table.status),
  ],
);

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, createdAt: true, updatedAt: true, executionCount: true, lastExecutedAt: true });
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationExecution = typeof automationExecutions.$inferSelect;

/**
 * Contact / sales inquiries — inbound leads from the public /contact form
 * (POST /api/contact-sales). Pre-conversion, so deliberately NOT scoped to
 * a companyId — these are people we don't have a tenant for yet.
 *
 * Status enum drives the lightweight pipeline view at /internal/leads:
 *   new       → fresh, no human has looked at it
 *   triaged   → reviewed, decision deferred (waiting on info)
 *   replied   → human responded
 *   qualified → moved to the active sales pipeline
 *   won       → closed/won (tag with referenced company once known)
 *   lost      → closed/lost (note the reason)
 *   spam      → bot or junk; counts toward abuse signal
 */
export const contactInquiries = pgTable(
  "contact_inquiries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    role: text("role"),
    topic: text("topic").notNull().default("other"), // demo|pilot|enterprise|integration|security|press|other
    message: text("message").notNull(),
    // Request metadata for abuse triage; never used for marketing.
    ip: text("ip"),
    userAgent: text("user_agent"),
    referer: text("referer"),
    // Sales pipeline state.
    status: text("status").notNull().default("new"), // new|triaged|replied|qualified|won|lost|spam
    notes: text("notes"), // free-form internal notes (CSM/BDR scratch pad)
    assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
    // Mirror of best-effort transactional email send result.
    emailedAt: timestamp("emailed_at"),
    // For analytics — how often did the same email keep submitting?
    submissionCount: integer("submission_count").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("contact_inquiries_received_at_idx").on(table.receivedAt),
    index("contact_inquiries_email_idx").on(table.email),
    index("contact_inquiries_status_idx").on(table.status),
  ],
);

export const insertContactInquirySchema = createInsertSchema(contactInquiries).omit({
  id: true,
  receivedAt: true,
  updatedAt: true,
  submissionCount: true,
  emailedAt: true,
  status: true,
  notes: true,
  assignedTo: true,
});
export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type InsertContactInquiry = z.infer<typeof insertContactInquirySchema>;

