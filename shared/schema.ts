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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const allocationResults = pgTable("allocation_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  allocationId: varchar("allocation_id").notNull().references(() => allocations.id, { onDelete: "cascade" }),
  skuId: varchar("sku_id").notNull().references(() => skus.id, { onDelete: "cascade" }),
  plannedUnits: real("planned_units").notNull(),
  allocatedUnits: real("allocated_units").notNull(),
  fillRate: real("fill_rate").notNull(),
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
