import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { platformAnalyticsService } from "../lib/platformAnalytics";

const router = Router();

const requirePlatformAdmin = async (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user?.claims?.sub) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isPlatformAdmin = await platformAnalyticsService.isPlatformAdmin(user.claims.sub);
  if (!isPlatformAdmin) {
    return res.status(403).json({ 
      error: "Access denied. Platform admin privileges required.",
      code: "PLATFORM_ADMIN_REQUIRED"
    });
  }

  req.platformAdmin = await platformAnalyticsService.getPlatformAdmin(user.claims.sub);
  next();
};

router.get("/check-access", isAuthenticated, async (req: any, res) => {
  const user = req.user;
  if (!user?.claims?.sub) {
    return res.json({ isPlatformAdmin: false });
  }

  const isPlatformAdmin = await platformAnalyticsService.isPlatformAdmin(user.claims.sub);
  const admin = isPlatformAdmin 
    ? await platformAnalyticsService.getPlatformAdmin(user.claims.sub) 
    : null;

  res.json({ 
    isPlatformAdmin, 
    admin: admin ? {
      role: admin.role,
      accessLevel: admin.accessLevel,
    } : null
  });
});

router.get("/metrics", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const metrics = await platformAnalyticsService.getLiveMetrics();
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/metrics",
      action: "view",
      responseTimeMs: Date.now() - startTime,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json(metrics);
  } catch (error) {
    console.error("[Platform Analytics] Error fetching metrics:", error);
    res.status(500).json({ error: "Failed to fetch platform metrics" });
  }
});

router.get("/materials/trends", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const trends = await platformAnalyticsService.getMaterialTrends();
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/materials/trends",
      action: "view",
      recordsReturned: trends.length,
      responseTimeMs: Date.now() - startTime,
    });

    res.json(trends);
  } catch (error) {
    console.error("[Platform Analytics] Error fetching material trends:", error);
    res.status(500).json({ error: "Failed to fetch material trends" });
  }
});

router.get("/suppliers/intelligence", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const intel = await platformAnalyticsService.getSupplierIntelligence();
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/suppliers/intelligence",
      action: "view",
      recordsReturned: intel.length,
      responseTimeMs: Date.now() - startTime,
    });

    res.json(intel);
  } catch (error) {
    console.error("[Platform Analytics] Error fetching supplier intelligence:", error);
    res.status(500).json({ error: "Failed to fetch supplier intelligence" });
  }
});

router.get("/features/usage", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const usage = await platformAnalyticsService.getFeatureUsage();
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/features/usage",
      action: "view",
      recordsReturned: usage.length,
      responseTimeMs: Date.now() - startTime,
    });

    res.json(usage);
  } catch (error) {
    console.error("[Platform Analytics] Error fetching feature usage:", error);
    res.status(500).json({ error: "Failed to fetch feature usage" });
  }
});

router.get("/companies", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const companies = await platformAnalyticsService.getCompanyDetails();
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/companies",
      action: "view",
      recordsReturned: companies.length,
      responseTimeMs: Date.now() - startTime,
    });

    res.json(companies);
  } catch (error) {
    console.error("[Platform Analytics] Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch company data" });
  }
});

router.get("/export/:dataType", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const { dataType } = req.params;
    const format = (req.query.format as string) || "json";
    
    if (!["json", "csv"].includes(format)) {
      return res.status(400).json({ error: "Invalid format. Use 'json' or 'csv'" });
    }

    const data = await platformAnalyticsService.exportData(format as "json" | "csv", dataType);
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: `/api/platform/export/${dataType}`,
      action: "export",
      queryParams: { format },
      responseTimeMs: Date.now() - startTime,
    });

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${dataType}_export.csv`);
    } else {
      res.setHeader("Content-Type", "application/json");
    }

    res.send(data);
  } catch (error) {
    console.error("[Platform Analytics] Error exporting data:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

router.post("/snapshot", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  try {
    const snapshot = await platformAnalyticsService.createSnapshot();
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/snapshot",
      action: "view",
    });

    res.json(snapshot);
  } catch (error) {
    console.error("[Platform Analytics] Error creating snapshot:", error);
    res.status(500).json({ error: "Failed to create snapshot" });
  }
});

router.get("/snapshots", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  const startTime = Date.now();
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const snapshots = await platformAnalyticsService.getHistoricalSnapshots(limit);
    
    await platformAnalyticsService.logAccess({
      adminId: req.platformAdmin.id,
      endpoint: "/api/platform/snapshots",
      action: "view",
      recordsReturned: snapshots.length,
      responseTimeMs: Date.now() - startTime,
    });

    res.json(snapshots);
  } catch (error) {
    console.error("[Platform Analytics] Error fetching snapshots:", error);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

router.post("/admins", isAuthenticated, requirePlatformAdmin, async (req: any, res) => {
  try {
    if (req.platformAdmin.role !== "owner" && req.platformAdmin.accessLevel !== "admin") {
      return res.status(403).json({ error: "Only platform owners can add admins" });
    }

    const { userId, email, role, accessLevel } = req.body;
    
    const admin = await platformAnalyticsService.addPlatformAdmin({
      userId,
      email,
      role: role || "analyst",
      accessLevel: accessLevel || "read",
      createdBy: req.platformAdmin.id,
    });

    res.json(admin);
  } catch (error) {
    console.error("[Platform Analytics] Error adding admin:", error);
    res.status(500).json({ error: "Failed to add platform admin" });
  }
});

export default router;
