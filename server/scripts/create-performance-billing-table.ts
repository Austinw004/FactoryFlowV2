import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS performance_billing (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      savings_record_id INTEGER NOT NULL REFERENCES savings_evidence_records(id) ON DELETE RESTRICT,
      measured_savings REAL NOT NULL,
      fee_percentage REAL NOT NULL,
      fee_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      billing_period_start TIMESTAMP,
      billing_period_end TIMESTAMP,
      invoice_id VARCHAR REFERENCES invoices(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT perf_billing_savings_record_unique UNIQUE (savings_record_id)
    );
    CREATE INDEX IF NOT EXISTS perf_billing_company_idx ON performance_billing(company_id);
    CREATE INDEX IF NOT EXISTS perf_billing_status_idx ON performance_billing(status);
  `);
  console.log("✔ performance_billing table created successfully");
  await pool.end();
}

run().catch(err => { console.error("Error:", err.message); process.exit(1); });
