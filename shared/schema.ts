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
