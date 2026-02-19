import { db } from "../db";
import { backgroundJobLocks, structuredEventLog } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const INSTANCE_ID = `instance-${randomUUID().slice(0, 8)}-${process.pid}`;

export interface LockOptions {
  jobName: string;
  companyId?: string;
  ttlMs?: number;
}

export interface LockResult {
  acquired: boolean;
  lockId?: string;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function acquireJobLock(opts: LockOptions): Promise<LockResult> {
  const { jobName, companyId, ttlMs = DEFAULT_TTL_MS } = opts;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    const companyIdValue = companyId || null;
    const companyIdCondition = companyIdValue
      ? sql`company_id = ${companyIdValue}`
      : sql`company_id IS NULL`;

    const inserted = await db.execute(sql`
      INSERT INTO background_job_locks (id, job_name, company_id, locked_by, locked_at, expires_at, heartbeat_at)
      VALUES (gen_random_uuid(), ${jobName}, ${companyIdValue}, ${INSTANCE_ID}, ${now}, ${expiresAt}, ${now})
      ON CONFLICT (job_name, company_id) DO NOTHING
      RETURNING id
    `);

    if (inserted.rows && inserted.rows.length > 0) {
      return { acquired: true, lockId: inserted.rows[0].id as string };
    }

    const stale = await db.execute(sql`
      UPDATE background_job_locks
      SET locked_by = ${INSTANCE_ID}, locked_at = ${now}, expires_at = ${expiresAt}, heartbeat_at = ${now}
      WHERE job_name = ${jobName}
        AND ${companyIdCondition}
        AND expires_at < ${now}
      RETURNING id
    `);

    if (stale.rows && stale.rows.length > 0) {
      await db.insert(structuredEventLog).values({
        companyId: companyId || null,
        level: "warn",
        category: "background_jobs",
        event: "stale_lock_recovered",
        details: {
          jobName,
          instance: INSTANCE_ID,
          message: `Stale lock recovered for job ${jobName}`,
        },
      });
      return { acquired: true, lockId: stale.rows[0].id as string };
    }

    return { acquired: false };
  } catch (e: any) {
    if (e.code === "23505" || e.message?.includes("duplicate") || e.message?.includes("unique")) {
      return { acquired: false };
    }
    throw e;
  }
}

export async function renewJobLock(lockId: string, ttlMs: number = DEFAULT_TTL_MS): Promise<boolean> {
  const now = new Date();
  const result = await db
    .update(backgroundJobLocks)
    .set({
      expiresAt: new Date(now.getTime() + ttlMs),
      heartbeatAt: now,
    })
    .where(
      and(
        eq(backgroundJobLocks.id, lockId),
        eq(backgroundJobLocks.lockedBy, INSTANCE_ID)
      )
    )
    .returning({ id: backgroundJobLocks.id });

  return result.length > 0;
}

export async function releaseJobLock(lockId: string): Promise<void> {
  await db
    .delete(backgroundJobLocks)
    .where(
      and(
        eq(backgroundJobLocks.id, lockId),
        eq(backgroundJobLocks.lockedBy, INSTANCE_ID)
      )
    );
}

export async function withJobLock<T>(
  opts: LockOptions,
  fn: () => Promise<T>
): Promise<{ executed: boolean; result?: T }> {
  const lock = await acquireJobLock(opts);
  if (!lock.acquired || !lock.lockId) {
    return { executed: false };
  }

  let heartbeatInterval: NodeJS.Timeout | undefined;
  try {
    const ttl = opts.ttlMs || DEFAULT_TTL_MS;
    heartbeatInterval = setInterval(async () => {
      try {
        await renewJobLock(lock.lockId!, ttl);
      } catch {
      }
    }, Math.floor(ttl / 3));

    const result = await fn();
    return { executed: true, result };
  } finally {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    try {
      await releaseJobLock(lock.lockId);
    } catch {
    }
  }
}

export function getInstanceId(): string {
  return INSTANCE_ID;
}
