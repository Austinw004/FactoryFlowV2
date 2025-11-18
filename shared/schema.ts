import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, primaryKey, index, type AnyPgColumn } from "drizzle-orm/pg-core";
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  name: text("name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skus = pgTable("skus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  priority: real("priority").notNull().default(1.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  onHand: real("on_hand").notNull().default(0),
  inbound: real("inbound").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boms = pgTable("boms", {
  skuId: varchar("sku_id").notNull().references(() => skus.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  quantityPerUnit: real("quantity_per_unit").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.skuId, table.materialId] }),
}));

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierMaterials = pgTable("supplier_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  unitCost: real("unit_cost").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
});

export const demandHistory = pgTable("demand_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  skuId: varchar("sku_id").notNull().references(() => skus.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  units: real("units").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const allocations = pgTable("allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
});

export const allocationResults = pgTable("allocation_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  allocationId: varchar("allocation_id").notNull().references(() => allocations.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id").notNull().references(() => skus.id, { onDelete: "cascade" }),
  plannedUnits: real("planned_units").notNull(),
  allocatedUnits: real("allocated_units").notNull(),
  fillRate: real("fill_rate").notNull(),
  // Budget runway fields
  estimatedCostPerPeriod: real("estimated_cost_per_period"), // Burn rate for this SKU
  projectedDepletionDate: timestamp("projected_depletion_date"), // When budget runs out for this SKU
  daysOfInventory: real("days_of_inventory"), // How many days this allocation covers
});

export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialCode: text("material_code").notNull(),
  materialName: text("material_name").notNull(),
  targetPrice: real("target_price").notNull(),
  priceDirection: text("price_direction").notNull(), // "above" or "below"
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  lastCheckedPrice: real("last_checked_price"),
  lastCheckedAt: timestamp("last_checked_at"),
  notificationsSent: integer("notifications_sent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const machinery = pgTable("machinery", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  category: text("category").notNull(), // "CNC", "Injection Molding", "Assembly Robot", etc.
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: real("purchase_cost").notNull(),
  salvageValue: real("salvage_value").notNull().default(0),
  usefulLifeYears: integer("useful_life_years").notNull().default(10),
  depreciationMethod: text("depreciation_method").notNull().default("straight-line"), // "straight-line", "declining-balance", "units-of-production"
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineryId: varchar("machinery_id").notNull().references(() => machinery.id, { onDelete: "cascade" }),
  maintenanceType: text("maintenance_type").notNull(), // "preventive", "corrective", "predictive"
  description: text("description").notNull(),
  cost: real("cost").notNull().default(0),
  performedDate: timestamp("performed_date").notNull(),
  performedBy: text("performed_by"),
  nextScheduledDate: timestamp("next_scheduled_date"),
  downTimeHours: real("down_time_hours").default(0),
  partsReplaced: text("parts_replaced").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial Statements
export const balanceSheets = pgTable("balance_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // "material" or "machinery"
  itemId: varchar("item_id").notNull(), // ID of material or machinery type
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  source: text("source").notNull(), // "supplier_quote", "api", "market_data"
  apiProvider: text("api_provider"), // "metals_dev", "commodities_api", "equipmentwatch"
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional context (volume, terms, etc.)
});

export const priceRecommendations = pgTable("price_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // "material" or "machinery"
  itemId: varchar("item_id").notNull(),
  itemName: text("item_name").notNull(),
  currentSupplierId: varchar("current_supplier_id").references(() => suppliers.id),
  currentPrice: real("current_price").notNull(),
  recommendedSupplierId: varchar("recommended_supplier_id").references(() => suppliers.id),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  regulationType: text("regulation_type").notNull(), // "environmental", "safety", "labor", "quality", "financial", "data_privacy"
  jurisdiction: text("jurisdiction").notNull(), // "federal", "state", "local", "international"
  issuingBody: text("issuing_body").notNull(), // e.g., "OSHA", "EPA", "ISO", "FDA"
  regulationCode: text("regulation_code"), // e.g., "ISO 9001", "OSHA 1910.147"
  description: text("description").notNull(),
  requirements: jsonb("requirements"), // Structured requirements list
  applicabilityStatus: text("applicability_status").notNull().default("applicable"), // "applicable", "not_applicable", "under_review"
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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

export const complianceApprovals = pgTable("compliance_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => complianceDocuments.id, { onDelete: "cascade" }),
  approverUserId: varchar("approver_user_id").notNull().references(() => users.id),
  approvalLevel: integer("approval_level").notNull(), // 1, 2, 3 for multi-level approvals
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "deferred"
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Production KPIs and OEE Tracking
export const productionRuns = pgTable("production_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id").references(() => skus.id, { onDelete: "set null" }),
  machineryId: varchar("machinery_id").references(() => machinery.id, { onDelete: "set null" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  productionRunId: varchar("production_run_id").references(() => productionRuns.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id").references(() => machinery.id, { onDelete: "set null" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  productionRunId: varchar("production_run_id").references(() => productionRuns.id, { onDelete: "set null" }),
  machineryId: varchar("machinery_id").notNull().references(() => machinery.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id").notNull().references(() => machinery.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sensorId: varchar("sensor_id").notNull().references(() => equipmentSensors.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  status: text("status").notNull(), // "normal", "warning", "critical"
  timestamp: timestamp("timestamp").notNull(),
  metadata: jsonb("metadata"), // Additional context from sensor
});

export const maintenanceAlerts = pgTable("maintenance_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id").notNull().references(() => machinery.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  machineryId: varchar("machinery_id").notNull().references(() => machinery.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id").references(() => skus.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").references(() => materials.id, { onDelete: "cascade" }),
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

export const inventoryRecommendations = pgTable("inventory_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull().unique(),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
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
  parentBatchId: varchar("parent_batch_id").references((): AnyPgColumn => materialBatches.id), // For split batches
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const traceabilityEvents = pgTable("traceability_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id").notNull().references(() => materialBatches.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // "received", "inspected", "moved", "used_in_production", "shipped", "quality_issue"
  eventDescription: text("event_description").notNull(),
  location: text("location"),
  performedBy: varchar("performed_by").references(() => users.id),
  productionRunId: varchar("production_run_id").references(() => productionRuns.id),
  skuId: varchar("sku_id").references(() => skus.id),
  quantityAffected: real("quantity_affected"),
  qualityData: jsonb("quality_data"), // Test results, measurements, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

export const supplierChainLinks = pgTable("supplier_chain_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  primarySupplierId: varchar("primary_supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
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

// Workforce Scheduling & Skills Management
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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

export const staffAssignments = pgTable("staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id").notNull().references(() => workShifts.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }).unique(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }).unique(),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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

export const employeeEmergencyContacts = pgTable("employee_emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
});

export const employeePerformanceReviews = pgTable("employee_performance_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  reviewDate: timestamp("review_date").notNull(),
  reviewPeriodStart: timestamp("review_period_start").notNull(),
  reviewPeriodEnd: timestamp("review_period_end").notNull(),
  reviewerUserId: varchar("reviewer_user_id").notNull().references(() => users.id),
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
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertSkuSchema = createInsertSchema(skus).omit({ id: true, createdAt: true });
export const updateSkuSchema = createInsertSchema(skus).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const updateMaterialSchema = createInsertSchema(materials).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertBomSchema = createInsertSchema(boms);
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertSupplierMaterialSchema = createInsertSchema(supplierMaterials).omit({ id: true });
export const insertDemandHistorySchema = createInsertSchema(demandHistory).omit({ id: true, createdAt: true });
export const insertAllocationSchema = createInsertSchema(allocations).omit({ id: true, createdAt: true });
export const insertAllocationResultSchema = createInsertSchema(allocationResults).omit({ id: true });
export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({ id: true, createdAt: true, updatedAt: true, lastCheckedAt: true, lastCheckedPrice: true, notificationsSent: true });
export const updatePriceAlertSchema = createInsertSchema(priceAlerts).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertMachinerySchema = createInsertSchema(machinery).omit({ id: true, createdAt: true, updatedAt: true, currentValue: true });
export const updateMachinerySchema = createInsertSchema(machinery).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({ id: true, createdAt: true });
export const insertBalanceSheetSchema = createInsertSchema(balanceSheets).omit({ id: true, createdAt: true, updatedAt: true });
export const updateBalanceSheetSchema = createInsertSchema(balanceSheets).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertIncomeStatementSchema = createInsertSchema(incomeStatements).omit({ id: true, createdAt: true, updatedAt: true });
export const updateIncomeStatementSchema = createInsertSchema(incomeStatements).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertCashFlowStatementSchema = createInsertSchema(cashFlowStatements).omit({ id: true, createdAt: true, updatedAt: true });
export const updateCashFlowStatementSchema = createInsertSchema(cashFlowStatements).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertSupplierMachinerySchema = createInsertSchema(supplierMachinery).omit({ id: true, createdAt: true, lastUpdated: true });
export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({ id: true, recordedAt: true });
export const insertPriceRecommendationSchema = createInsertSchema(priceRecommendations).omit({ id: true, createdAt: true, dismissedAt: true, acceptedAt: true });
export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const updateComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertComplianceRegulationSchema = createInsertSchema(complianceRegulations).omit({ id: true, createdAt: true, updatedAt: true });
export const updateComplianceRegulationSchema = createInsertSchema(complianceRegulations).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertComplianceAuditSchema = createInsertSchema(complianceAudits).omit({ id: true, createdAt: true, updatedAt: true });
export const updateComplianceAuditSchema = createInsertSchema(complianceAudits).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertComplianceApprovalSchema = createInsertSchema(complianceApprovals).omit({ id: true, createdAt: true, requestedAt: true, respondedAt: true });
export const insertProductionRunSchema = createInsertSchema(productionRuns).omit({ id: true, createdAt: true, updatedAt: true });
export const updateProductionRunSchema = createInsertSchema(productionRuns).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertProductionMetricSchema = createInsertSchema(productionMetrics).omit({ id: true, createdAt: true });
export const insertDowntimeEventSchema = createInsertSchema(downtimeEvents).omit({ id: true, createdAt: true, updatedAt: true });
export const updateDowntimeEventSchema = createInsertSchema(downtimeEvents).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertProductionBottleneckSchema = createInsertSchema(productionBottlenecks).omit({ id: true, createdAt: true, updatedAt: true, identifiedAt: true });
export const updateProductionBottleneckSchema = createInsertSchema(productionBottlenecks).omit({ id: true, companyId: true, createdAt: true }).partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Sku = typeof skus.$inferSelect;
export type InsertSku = z.infer<typeof insertSkuSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Bom = typeof boms.$inferSelect;
export type InsertBom = z.infer<typeof insertBomSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type SupplierMaterial = typeof supplierMaterials.$inferSelect;
export type InsertSupplierMaterial = z.infer<typeof insertSupplierMaterialSchema>;
export type DemandHistory = typeof demandHistory.$inferSelect;
export type InsertDemandHistory = z.infer<typeof insertDemandHistorySchema>;
export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type AllocationResult = typeof allocationResults.$inferSelect;
export type InsertAllocationResult = z.infer<typeof insertAllocationResultSchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type Machinery = typeof machinery.$inferSelect;
export type InsertMachinery = z.infer<typeof insertMachinerySchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type BalanceSheet = typeof balanceSheets.$inferSelect;
export type InsertBalanceSheet = z.infer<typeof insertBalanceSheetSchema>;
export type IncomeStatement = typeof incomeStatements.$inferSelect;
export type InsertIncomeStatement = z.infer<typeof insertIncomeStatementSchema>;
export type CashFlowStatement = typeof cashFlowStatements.$inferSelect;
export type InsertCashFlowStatement = z.infer<typeof insertCashFlowStatementSchema>;
export type SupplierMachinery = typeof supplierMachinery.$inferSelect;
export type InsertSupplierMachinery = z.infer<typeof insertSupplierMachinerySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceRecommendation = typeof priceRecommendations.$inferSelect;
export type InsertPriceRecommendation = z.infer<typeof insertPriceRecommendationSchema>;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;
export type ComplianceRegulation = typeof complianceRegulations.$inferSelect;
export type InsertComplianceRegulation = z.infer<typeof insertComplianceRegulationSchema>;
export type ComplianceAudit = typeof complianceAudits.$inferSelect;
export type InsertComplianceAudit = z.infer<typeof insertComplianceAuditSchema>;
export type ComplianceApproval = typeof complianceApprovals.$inferSelect;
export type InsertComplianceApproval = z.infer<typeof insertComplianceApprovalSchema>;
export type ProductionRun = typeof productionRuns.$inferSelect;
export type InsertProductionRun = z.infer<typeof insertProductionRunSchema>;
export type ProductionMetric = typeof productionMetrics.$inferSelect;
export type InsertProductionMetric = z.infer<typeof insertProductionMetricSchema>;
export type DowntimeEvent = typeof downtimeEvents.$inferSelect;
export type InsertDowntimeEvent = z.infer<typeof insertDowntimeEventSchema>;
export type ProductionBottleneck = typeof productionBottlenecks.$inferSelect;
export type InsertProductionBottleneck = z.infer<typeof insertProductionBottleneckSchema>;

// IoT Sensors & Predictive Maintenance schemas
export const insertEquipmentSensorSchema = createInsertSchema(equipmentSensors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSensorReadingSchema = createInsertSchema(sensorReadings).omit({ id: true });
export const insertMaintenanceAlertSchema = createInsertSchema(maintenanceAlerts).omit({ id: true, createdAt: true, updatedAt: true, acknowledgedAt: true, resolvedAt: true });
export const insertMaintenancePredictionSchema = createInsertSchema(maintenancePredictions).omit({ id: true, createdAt: true });

export type EquipmentSensor = typeof equipmentSensors.$inferSelect;
export type InsertEquipmentSensor = z.infer<typeof insertEquipmentSensorSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type MaintenanceAlert = typeof maintenanceAlerts.$inferSelect;
export type InsertMaintenanceAlert = z.infer<typeof insertMaintenanceAlertSchema>;
export type MaintenancePrediction = typeof maintenancePredictions.$inferSelect;
export type InsertMaintenancePrediction = z.infer<typeof insertMaintenancePredictionSchema>;

// AI Inventory Optimization schemas
export const insertInventoryOptimizationSchema = createInsertSchema(inventoryOptimizations).omit({ id: true, analysisDate: true, createdAt: true });
export const insertDemandPredictionSchema = createInsertSchema(demandPredictions).omit({ id: true, createdAt: true });
export const insertInventoryRecommendationSchema = createInsertSchema(inventoryRecommendations).omit({ id: true, createdAt: true, implementedAt: true });

export type InventoryOptimization = typeof inventoryOptimizations.$inferSelect;
export type InsertInventoryOptimization = z.infer<typeof insertInventoryOptimizationSchema>;
export type DemandPrediction = typeof demandPredictions.$inferSelect;
export type InsertDemandPrediction = z.infer<typeof insertDemandPredictionSchema>;
export type InventoryRecommendation = typeof inventoryRecommendations.$inferSelect;
export type InsertInventoryRecommendation = z.infer<typeof insertInventoryRecommendationSchema>;

// Supply Chain Traceability schemas
export const insertMaterialBatchSchema = createInsertSchema(materialBatches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTraceabilityEventSchema = createInsertSchema(traceabilityEvents).omit({ id: true, timestamp: true });
export const insertSupplierChainLinkSchema = createInsertSchema(supplierChainLinks).omit({ id: true, createdAt: true, updatedAt: true });

export type MaterialBatch = typeof materialBatches.$inferSelect;
export type InsertMaterialBatch = z.infer<typeof insertMaterialBatchSchema>;
export type TraceabilityEvent = typeof traceabilityEvents.$inferSelect;
export type InsertTraceabilityEvent = z.infer<typeof insertTraceabilityEventSchema>;
export type SupplierChainLink = typeof supplierChainLinks.$inferSelect;
export type InsertSupplierChainLink = z.infer<typeof insertSupplierChainLinkSchema>;

// Workforce Scheduling schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeSchema = createInsertSchema(employees).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertWorkShiftSchema = createInsertSchema(workShifts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSkillRequirementSchema = createInsertSchema(skillRequirements).omit({ id: true, createdAt: true });
export const insertStaffAssignmentSchema = createInsertSchema(staffAssignments).omit({ id: true, createdAt: true, updatedAt: true });

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
export type WorkShift = typeof workShifts.$inferSelect;
export type InsertWorkShift = z.infer<typeof insertWorkShiftSchema>;
export type SkillRequirement = typeof skillRequirements.$inferSelect;
export type InsertSkillRequirement = z.infer<typeof insertSkillRequirementSchema>;
export type StaffAssignment = typeof staffAssignments.$inferSelect;
export type InsertStaffAssignment = z.infer<typeof insertStaffAssignmentSchema>;

// Comprehensive Employee Management schemas
export const insertEmployeePayrollSchema = createInsertSchema(employeePayroll).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeePayrollSchema = createInsertSchema(employeePayroll).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertEmployeeBenefitSchema = createInsertSchema(employeeBenefits).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeBenefitSchema = createInsertSchema(employeeBenefits).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertEmployeeTimeOffSchema = createInsertSchema(employeeTimeOff).omit({ id: true, createdAt: true, updatedAt: true, requestedAt: true });
export const updateEmployeeTimeOffSchema = createInsertSchema(employeeTimeOff).omit({ id: true, companyId: true, createdAt: true, requestedAt: true }).partial();
export const insertEmployeePtoBalanceSchema = createInsertSchema(employeePtoBalances).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeePtoBalanceSchema = createInsertSchema(employeePtoBalances).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertEmployeeEmergencyContactSchema = createInsertSchema(employeeEmergencyContacts).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeeEmergencyContactSchema = createInsertSchema(employeeEmergencyContacts).omit({ id: true, companyId: true, createdAt: true }).partial();
export const insertEmployeePerformanceReviewSchema = createInsertSchema(employeePerformanceReviews).omit({ id: true, createdAt: true, updatedAt: true });
export const updateEmployeePerformanceReviewSchema = createInsertSchema(employeePerformanceReviews).omit({ id: true, companyId: true, createdAt: true }).partial();

export type EmployeePayroll = typeof employeePayroll.$inferSelect;
export type InsertEmployeePayroll = z.infer<typeof insertEmployeePayrollSchema>;
export type UpdateEmployeePayroll = z.infer<typeof updateEmployeePayrollSchema>;
export type EmployeeBenefit = typeof employeeBenefits.$inferSelect;
export type InsertEmployeeBenefit = z.infer<typeof insertEmployeeBenefitSchema>;
export type UpdateEmployeeBenefit = z.infer<typeof updateEmployeeBenefitSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type UpdateEmployeeDocument = z.infer<typeof updateEmployeeDocumentSchema>;
export type EmployeeTimeOff = typeof employeeTimeOff.$inferSelect;
export type InsertEmployeeTimeOff = z.infer<typeof insertEmployeeTimeOffSchema>;
export type UpdateEmployeeTimeOff = z.infer<typeof updateEmployeeTimeOffSchema>;
export type EmployeePtoBalance = typeof employeePtoBalances.$inferSelect;
export type InsertEmployeePtoBalance = z.infer<typeof insertEmployeePtoBalanceSchema>;
export type UpdateEmployeePtoBalance = z.infer<typeof updateEmployeePtoBalanceSchema>;
export type EmployeeEmergencyContact = typeof employeeEmergencyContacts.$inferSelect;
export type InsertEmployeeEmergencyContact = z.infer<typeof insertEmployeeEmergencyContactSchema>;
export type UpdateEmployeeEmergencyContact = z.infer<typeof updateEmployeeEmergencyContactSchema>;
export type EmployeePerformanceReview = typeof employeePerformanceReviews.$inferSelect;
export type InsertEmployeePerformanceReview = z.infer<typeof insertEmployeePerformanceReviewSchema>;
export type UpdateEmployeePerformanceReview = z.infer<typeof updateEmployeePerformanceReviewSchema>;

// Automatic Procurement & Purchasing
export const procurementSchedules = pgTable("procurement_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
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

export const autoPurchaseRecommendations = pgTable("auto_purchase_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
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
});

export const incomingEmails = pgTable("incoming_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  emailId: varchar("email_id").notNull().references(() => incomingEmails.id, { onDelete: "cascade" }),
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

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(), // PO-2024-001, etc
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
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
  procurementScheduleId: varchar("procurement_schedule_id").references(() => procurementSchedules.id),
  recommendationId: varchar("recommendation_id").references(() => autoPurchaseRecommendations.id),
  emailId: varchar("email_id").references(() => incomingEmails.id),
  economicRegime: text("economic_regime"),
  fdrAtPurchase: real("fdr_at_purchase"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const materialUsageTracking = pgTable("material_usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  usageDate: timestamp("usage_date").notNull().defaultNow(),
  quantityUsed: real("quantity_used").notNull(),
  usageType: text("usage_type").notNull(), // "production", "waste", "spoilage", "adjustment", "sample", "rework"
  productionRunId: varchar("production_run_id").references(() => productionRuns.id),
  skuId: varchar("sku_id").references(() => skus.id), // What was being produced
  batchNumber: text("batch_number"),
  machineId: varchar("machine_id").references(() => machinery.id),
  operatorEmployeeId: varchar("operator_employee_id").references(() => employees.id),
  notes: text("notes"),
  remainingStock: real("remaining_stock"), // Stock level after this usage
  costPerUnit: real("cost_per_unit"), // FIFO/LIFO cost at time of usage
  totalCost: real("total_cost"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Automatic Procurement schemas
export const insertProcurementScheduleSchema = createInsertSchema(procurementSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutoPurchaseRecommendationSchema = createInsertSchema(autoPurchaseRecommendations).omit({ id: true, createdAt: true });
export const insertIncomingEmailSchema = createInsertSchema(incomingEmails).omit({ id: true, createdAt: true });
export const insertEmailAnalysisSchema = createInsertSchema(emailAnalysis).omit({ id: true, createdAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const updatePurchaseOrderSchema = insertPurchaseOrderSchema.partial();
export const insertMaterialUsageTrackingSchema = createInsertSchema(materialUsageTracking).omit({ id: true, createdAt: true });

export type ProcurementSchedule = typeof procurementSchedules.$inferSelect;
export type InsertProcurementSchedule = z.infer<typeof insertProcurementScheduleSchema>;
export type AutoPurchaseRecommendation = typeof autoPurchaseRecommendations.$inferSelect;
export type InsertAutoPurchaseRecommendation = z.infer<typeof insertAutoPurchaseRecommendationSchema>;
export type IncomingEmail = typeof incomingEmails.$inferSelect;
export type InsertIncomingEmail = z.infer<typeof insertIncomingEmailSchema>;
export type EmailAnalysis = typeof emailAnalysis.$inferSelect;
export type InsertEmailAnalysis = z.infer<typeof insertEmailAnalysisSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type UpdatePurchaseOrder = z.infer<typeof updatePurchaseOrderSchema>;
export type MaterialUsageTracking = typeof materialUsageTracking.$inferSelect;
export type InsertMaterialUsageTracking = z.infer<typeof insertMaterialUsageTrackingSchema>;
