import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_profiles (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      default_payment_method_id TEXT,
      payment_method_last4 TEXT,
      payment_method_brand TEXT,
      billing_email TEXT NOT NULL,
      company_name TEXT NOT NULL,
      address JSONB,
      tax_id TEXT,
      preferred_payment_method TEXT NOT NULL DEFAULT 'card',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS billing_profiles_company_idx ON billing_profiles(company_id);

    CREATE TABLE IF NOT EXISTS purchase_intents (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      supplier_id VARCHAR REFERENCES suppliers(id) ON DELETE SET NULL,
      material_id VARCHAR REFERENCES materials(id) ON DELETE SET NULL,
      recommendation_id VARCHAR REFERENCES auto_purchase_recommendations(id) ON DELETE SET NULL,
      executed_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      payment_method TEXT NOT NULL DEFAULT 'card',
      trust_score REAL,
      fraud_score REAL,
      evidence_bundle JSONB,
      stripe_payment_intent_id TEXT,
      purchase_order_id VARCHAR REFERENCES purchase_orders(id) ON DELETE SET NULL,
      failure_reason TEXT,
      executed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS purchase_intents_company_idx ON purchase_intents(company_id);
    CREATE INDEX IF NOT EXISTS purchase_intents_status_idx ON purchase_intents(status);
    CREATE INDEX IF NOT EXISTS purchase_intents_recommendation_idx ON purchase_intents(recommendation_id);
  `);
  console.log("✔ billing_profiles and purchase_intents tables created");
  await pool.end();
}

run().catch(e => { console.error("Error:", e.message); process.exit(1); });
