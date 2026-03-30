import { db } from "../db";
import { sql } from "drizzle-orm";

async function createPaymentTables() {
  console.log("Creating payment tables...");

  // company_payment_methods
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_payment_methods (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      stripe_payment_method_id TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      last4 TEXT NOT NULL,
      exp_month INTEGER NOT NULL,
      exp_year INTEGER NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS company_pm_company_idx ON company_payment_methods(company_id)
  `);
  console.log("  company_payment_methods ✓");

  // subscription_payments
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscription_payments (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      stripe_invoice_id TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      billing_period_start TIMESTAMP,
      billing_period_end TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS subscription_payments_company_idx ON subscription_payments(company_id)
  `);
  console.log("  subscription_payments ✓");

  // purchase_transactions
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS purchase_transactions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      purchase_intent_id VARCHAR REFERENCES purchase_intents(id) ON DELETE SET NULL,
      stripe_payment_intent_id TEXT UNIQUE,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      failure_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS purchase_transactions_company_idx ON purchase_transactions(company_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS purchase_transactions_intent_idx ON purchase_transactions(purchase_intent_id)
  `);
  console.log("  purchase_transactions ✓");

  console.log("All payment tables created successfully.");
  process.exit(0);
}

createPaymentTables().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
