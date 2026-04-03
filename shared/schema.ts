mestamp: timestamp("timestamp").notNull().defaultNow(),
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
