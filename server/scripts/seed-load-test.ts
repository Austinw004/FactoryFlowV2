/**
 * seed-load-test.ts — seed the database with large volumes of data to stress-test
 * UI virtualization, search performance, and query planner behavior.
 *
 * Usage:
 *   npx tsx server/scripts/seed-load-test.ts --company <companyId> [--audit 100000] [--materials 10000] [--pos 5000]
 *
 * Safety:
 *   - Requires --company (scoped to one tenant — this script never touches other companies' data).
 *   - Refuses to run if NODE_ENV=production unless --force is passed.
 *   - Uses batched INSERTs (chunks of 1000) so we don't blow the protocol buffer.
 */

import { sql } from "drizzle-orm";
import { db } from "../db";
import { auditLogs, materials, purchaseOrders, companies } from "../../shared/schema";

interface Args {
  companyId: string;
  audit: number;
  materials: number;
  pos: number;
  force: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback?: string) => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return fallback;
    return argv[idx + 1];
  };
  const companyId = get("--company");
  if (!companyId) {
    console.error("Usage: tsx server/scripts/seed-load-test.ts --company <id> [--audit N] [--materials N] [--pos N] [--force]");
    process.exit(2);
  }
  return {
    companyId,
    audit: Number(get("--audit", "100000")),
    materials: Number(get("--materials", "10000")),
    pos: Number(get("--pos", "5000")),
    force: argv.includes("--force"),
  };
}

const BATCH_SIZE = 1000;

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ENTITY_TYPES = ["sku", "material", "supplier", "purchase_order", "machinery", "employee", "quality_record", "work_order"];
const ACTIONS = ["create", "update", "delete", "view", "export", "login", "logout"];
const STATUSES = ["draft", "submitted", "approved", "received", "cancelled"];
const CATEGORIES = ["raw", "packaging", "component", "finished_good", "consumable"];

async function seedAuditLogs(companyId: string, count: number) {
  console.log(`[seed] audit_logs: generating ${count.toLocaleString()} rows...`);
  const started = Date.now();
  const now = Date.now();
  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const rows = [] as Array<typeof auditLogs.$inferInsert>;
    const batch = Math.min(BATCH_SIZE, count - offset);
    for (let i = 0; i < batch; i++) {
      const idx = offset + i;
      const entity = rand(ENTITY_TYPES);
      rows.push({
        companyId,
        userId: null,
        action: rand(ACTIONS),
        entityType: entity,
        entityId: `seed-${entity}-${idx}`,
        changes: {
          before: { status: rand(STATUSES), qty: Math.floor(Math.random() * 1000) },
          after: { status: rand(STATUSES), qty: Math.floor(Math.random() * 1000) },
        },
        ipAddress: `10.${idx & 0xff}.${(idx >> 8) & 0xff}.${(idx >> 16) & 0xff}`,
        userAgent: "load-test-seed/1.0",
        // Spread timestamps across last 90 days so index scans look realistic
        timestamp: new Date(now - Math.floor(Math.random() * 90 * 24 * 3600 * 1000)),
      });
    }
    await db.insert(auditLogs).values(rows);
    if (offset % 10000 === 0 || offset + batch >= count) {
      console.log(`[seed]   ${offset + batch}/${count} (+${Date.now() - started}ms)`);
    }
  }
  console.log(`[seed] audit_logs done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function seedMaterials(companyId: string, count: number) {
  console.log(`[seed] materials: generating ${count.toLocaleString()} rows...`);
  const started = Date.now();
  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const rows = [] as Array<typeof materials.$inferInsert>;
    const batch = Math.min(BATCH_SIZE, count - offset);
    for (let i = 0; i < batch; i++) {
      const idx = offset + i;
      rows.push({
        companyId,
        name: `Load Test Material ${idx}`,
        materialCode: `LT-MAT-${String(idx).padStart(6, "0")}`,
        category: rand(CATEGORIES),
        unit: rand(["kg", "lb", "ea", "m", "L"]),
        currentPrice: (Math.random() * 500).toFixed(2),
        priceVolatility: (Math.random() * 0.5).toFixed(4),
      } as any);
    }
    await db.insert(materials).values(rows);
    if (offset % 5000 === 0 || offset + batch >= count) {
      console.log(`[seed]   ${offset + batch}/${count} (+${Date.now() - started}ms)`);
    }
  }
  console.log(`[seed] materials done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function seedPurchaseOrders(companyId: string, count: number) {
  console.log(`[seed] purchase_orders: generating ${count.toLocaleString()} rows...`);
  const started = Date.now();
  const now = Date.now();
  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const rows = [] as Array<typeof purchaseOrders.$inferInsert>;
    const batch = Math.min(BATCH_SIZE, count - offset);
    for (let i = 0; i < batch; i++) {
      const idx = offset + i;
      rows.push({
        companyId,
        poNumber: `LT-PO-${String(idx).padStart(6, "0")}`,
        status: rand(STATUSES),
        totalAmount: (Math.random() * 100000).toFixed(2),
        currency: "USD",
        createdAt: new Date(now - Math.floor(Math.random() * 365 * 24 * 3600 * 1000)),
      } as any);
    }
    await db.insert(purchaseOrders).values(rows);
    if (offset % 5000 === 0 || offset + batch >= count) {
      console.log(`[seed]   ${offset + batch}/${count} (+${Date.now() - started}ms)`);
    }
  }
  console.log(`[seed] purchase_orders done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function main() {
  const args = parseArgs();

  if (process.env.NODE_ENV === "production" && !args.force) {
    console.error("Refusing to run load-test seed against production. Pass --force if you really mean it.");
    process.exit(1);
  }

  // Verify company exists before we spray tens of thousands of FK-related rows
  const existing = await db.execute(sql`SELECT id FROM companies WHERE id = ${args.companyId} LIMIT 1`);
  if (!(existing as any).rows?.length) {
    console.error(`Company ${args.companyId} not found. Aborting.`);
    process.exit(1);
  }

  const total = args.audit + args.materials + args.pos;
  console.log(`[seed] target company: ${args.companyId}`);
  console.log(`[seed] total rows planned: ${total.toLocaleString()}`);
  console.log("---");

  const t0 = Date.now();
  if (args.materials > 0) await seedMaterials(args.companyId, args.materials);
  if (args.pos > 0) await seedPurchaseOrders(args.companyId, args.pos);
  if (args.audit > 0) await seedAuditLogs(args.companyId, args.audit);
  console.log("---");
  console.log(`[seed] complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] fatal:", err);
  process.exit(1);
});
