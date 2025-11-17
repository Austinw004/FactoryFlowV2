import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, primaryKey, index } from "drizzle-orm/pg-core";
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
