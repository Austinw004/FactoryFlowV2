/**
 * Internal sales-leads admin routes — gated behind isPlatformAdmin.
 *
 * Only Prescient Labs platform owners can see inbound contact-form leads.
 * These rows contain PII (name, work email, IP) so the auth gate is
 * non-negotiable.
 *
 * Endpoints:
 *   GET    /api/internal/leads               → list (filterable, paginated)
 *   GET    /api/internal/leads/stats         → counts by status, last-7d trend
 *   PATCH  /api/internal/leads/:id           → update status/notes/assignedTo
 *
 * No DELETE — leads are kept for audit; mark as "spam" instead.
 */
import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { platformAnalyticsService } from "../lib/platformAnalytics";
import { db } from "../db";
import { contactInquiries } from "@shared/schema";
import { sql, desc, eq, and, ilike, or, gte } from "drizzle-orm";

const router = Router();

const ALLOWED_STATUSES = new Set([
  "new", "triaged", "replied", "qualified", "won", "lost", "spam",
]);

const requirePlatformAdmin = async (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user?.claims?.sub) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAdmin = await platformAnalyticsService.isPlatformAdmin(user.claims.sub);
  if (!isAdmin) {
    return res.status(403).json({ error: "Platform admin required.", code: "PLATFORM_ADMIN_REQUIRED" });
  }
  next();
};

/**
 * GET /api/internal/leads
 * Query params:
 *   ?status=new|triaged|replied|qualified|won|lost|spam
 *   ?q=<search across name, email, company, message>
 *   ?limit=<1..200, default 50>
 *   ?offset=<default 0>
 */
router.get("/leads", isAuthenticated, requirePlatformAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const q = String(req.query.q || "").trim().slice(0, 200);
    const limit = Math.max(1, Math.min(200, parseInt(String(req.query.limit || "50"), 10) || 50));
    const offset = Math.max(0, parseInt(String(req.query.offset || "0"), 10) || 0);

    const conditions = [];
    if (status && ALLOWED_STATUSES.has(status)) {
      conditions.push(eq(contactInquiries.status, status));
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(contactInquiries.name, like),
          ilike(contactInquiries.email, like),
          ilike(contactInquiries.company, like),
          ilike(contactInquiries.message, like),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(contactInquiries)
      .where(whereClause)
      .orderBy(desc(contactInquiries.receivedAt))
      .limit(limit)
      .offset(offset);

    // Total count for pagination — separate query, same WHERE.
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactInquiries)
      .where(whereClause);
    const total = totalResult[0]?.count ?? 0;

    res.json({ leads: rows, total, limit, offset });
  } catch (err: any) {
    console.error("[leads-admin] list failed:", err?.message || err);
    res.status(500).json({ error: "Failed to load leads." });
  }
});

/**
 * GET /api/internal/leads/stats
 * Returns counts by status + 7-day inbound count + 30-day inbound count.
 */
router.get("/leads/stats", isAuthenticated, requirePlatformAdmin, async (_req, res) => {
  try {
    const byStatusRows = await db
      .select({
        status: contactInquiries.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contactInquiries)
      .groupBy(contactInquiries.status);

    const byStatus: Record<string, number> = {};
    for (const r of byStatusRows) byStatus[r.status] = r.count;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [last7] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactInquiries)
      .where(gte(contactInquiries.receivedAt, sevenDaysAgo));

    const [last30] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactInquiries)
      .where(gte(contactInquiries.receivedAt, thirtyDaysAgo));

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactInquiries);

    res.json({
      byStatus,
      last7Days: last7?.count ?? 0,
      last30Days: last30?.count ?? 0,
      total: totalRow?.count ?? 0,
    });
  } catch (err: any) {
    console.error("[leads-admin] stats failed:", err?.message || err);
    res.status(500).json({ error: "Failed to load stats." });
  }
});

/**
 * PATCH /api/internal/leads/:id
 * Body: { status?, notes?, assignedTo? }
 */
router.patch("/leads/:id", isAuthenticated, requirePlatformAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id." });

    const body = req.body || {};
    const updates: Record<string, any> = {};

    if (typeof body.status === "string") {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${[...ALLOWED_STATUSES].join(", ")}` });
      }
      updates.status = body.status;
    }
    if (typeof body.notes === "string") {
      updates.notes = body.notes.slice(0, 5000);
    }
    if (typeof body.assignedTo === "string" || body.assignedTo === null) {
      updates.assignedTo = body.assignedTo || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    updates.updatedAt = new Date();

    const result = await db
      .update(contactInquiries)
      .set(updates)
      .where(eq(contactInquiries.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Lead not found." });
    }

    res.json({ lead: result[0] });
  } catch (err: any) {
    console.error("[leads-admin] update failed:", err?.message || err);
    res.status(500).json({ error: "Failed to update lead." });
  }
});

export default router;
