import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { attachRbacUser, requirePermission } from "./middleware/rbac";
import rbacRoutes from "./routes/rbac";
import { initializePermissions, initializeDefaultRoles } from "./lib/rbac";
import { logAudit } from "./lib/auditLogger";
import { globalCache } from "./lib/caching";
import { DualCircuitEconomics } from "./lib/economics";
import { DemandForecaster } from "./lib/forecasting";
import { AllocationEngine } from "./lib/allocation";
import { setupWebSocket, getConnectedClientCount } from "./websocket";
import { applySecurityHardening, securityMonitor, rateLimiters } from "./lib/securityHardening";
import { 
  calculateSupplierRiskScore, 
  getFDRRiskMultiplier, 
  analyzeCascadingImpact,
  generateRegimeAwareActions,
  scoreAlternativeSuppliers,
  type RiskScoreInputs 
} from "./lib/supplyChainRisk";
import { POExecutionEngine, type POGenerationContext } from "./lib/poExecution";
import { IndustryConsortiumEngine } from "./lib/industryConsortium";
import { MAIntelligenceEngine } from "./lib/maIntelligence";
import { ScenarioPlanningEngine, type ScenarioInput } from "./lib/scenarioPlanning";
import { GeopoliticalRiskEngine, type GeopoliticalEvent } from "./lib/geopoliticalRisk";
import { WebhookService } from "./lib/webhookService";
import { DataExportService } from "./lib/dataExport";
import { DataImportService } from "./lib/dataImport";
import { createRfqGenerationService } from "./lib/rfqGeneration";
import multer from "multer";
import { z } from "zod";
import {
  insertCompanySchema,
  insertSkuSchema,
  updateSkuSchema,
  insertMaterialSchema,
  updateMaterialSchema,
  insertBomSchema,
  insertSupplierSchema,
  insertSupplierMaterialSchema,
  insertDemandHistorySchema,
  insertMultiHorizonForecastSchema,
  insertForecastAccuracyTrackingSchema,
  insertForecastDegradationAlertSchema,
  insertFeatureToggleSchema,
  insertSupplierNodeSchema,
  insertSupplierLinkSchema,
  insertSupplierHealthMetricsSchema,
  insertSupplierRiskAlertSchema,
  insertPoRuleSchema,
  insertPoWorkflowStepSchema,
  insertPoApprovalSchema,
  insertNegotiationPlaybookSchema,
  insertErpConnectionSchema,
  insertConsortiumContributionSchema,
  insertConsortiumMetricsSchema,
  insertConsortiumAlertSchema,
  insertMaTargetSchema,
  insertMaRecommendationSchema,
  insertRfqSchema,
  insertRfqQuoteSchema,
  insertBenchmarkSubmissionSchema,
  insertSopMeetingTemplateSchema,
  insertSopMeetingSchema,
  insertSopMeetingAttendeeSchema,
  insertSopReconciliationItemSchema,
  insertSopApprovalChainSchema,
  insertSopApprovalStepSchema,
  insertSopApprovalRequestSchema,
  insertSopApprovalActionSchema,
  SOP_MEETING_TYPES,
  SOP_MEETING_STATUS,
  insertDigitalTwinDataFeedSchema,
  insertDigitalTwinSnapshotSchema,
  insertDigitalTwinQuerySchema,
  insertDigitalTwinSimulationSchema,
  insertDigitalTwinAlertSchema,
  insertDigitalTwinMetricSchema,
} from "@shared/schema";

const economics = new DualCircuitEconomics();
const webhookService = new WebhookService(storage);
const rfqGenerationService = createRfqGenerationService(storage);

// Helper function to calculate policy signals based on regime
function calculateSignalsForRegime(regime: string) {
  const signals: any[] = [];

  switch (regime) {
    case 'HEALTHY_EXPANSION':
      signals.push(
        { type: 'procurement', action: 'normal', description: 'Maintain standard procurement levels' },
        { type: 'inventory', action: 'maintain', description: 'Keep inventory at optimal levels' },
        { type: 'production', action: 'increase', description: 'Gradually increase production capacity' }
      );
      break;
    case 'ASSET_LED_GROWTH':
      signals.push(
        { type: 'procurement', action: 'strategic_buy', description: 'Lock in favorable prices before inflation hits' },
        { type: 'inventory', action: 'build', description: 'Build strategic inventory reserves' },
        { type: 'production', action: 'increase', description: 'Expand production to meet anticipated demand' }
      );
      break;
    case 'IMBALANCED_EXCESS':
      signals.push(
        { type: 'procurement', action: 'reduce', description: 'Reduce procurement due to bubble risk' },
        { type: 'inventory', action: 'drawdown', description: 'Draw down excess inventory' },
        { type: 'production', action: 'decrease', description: 'Scale back production capacity' }
      );
      break;
    case 'REAL_ECONOMY_LEAD':
      signals.push(
        { type: 'procurement', action: 'aggressive_buy', description: 'Aggressively purchase materials at low prices' },
        { type: 'inventory', action: 'maximize', description: 'Maximize inventory to capitalize on low prices' },
        { type: 'production', action: 'maximize', description: 'Maximize production for upcoming expansion' }
      );
      break;
    default:
      signals.push(
        { type: 'procurement', action: 'normal', description: 'Maintain standard procurement levels' },
        { type: 'inventory', action: 'maintain', description: 'Keep inventory at optimal levels' },
        { type: 'production', action: 'normal', description: 'Maintain current production levels' }
      );
  }

  return signals;
}

// ===== SCENARIO SIMULATION HELPER FUNCTIONS =====

// Calculate procurement cost impact based on FDR and regime changes
function calculateProcurementImpact(
  baseFdrValue: number,
  variantFdrValue: number,
  baseRegime: string,
  variantRegime: string
): number {
  // FDR impact: Higher FDR typically means higher procurement costs
  const fdrDelta = variantFdrValue - baseFdrValue;
  let fdrImpact = fdrDelta * 5; // 5% cost change per 1.0 FDR change
  
  // Regime impact adjustments
  const regimeImpacts: Record<string, number> = {
    HEALTHY_EXPANSION: 0,
    ASSET_LED_GROWTH: 8, // Higher costs due to inflation expectations
    IMBALANCED_EXCESS: 15, // Highest costs in bubble territory
    REAL_ECONOMY_LEAD: -10, // Lower costs in opportunity zone
    balanced: 0,
  };
  
  const baseRegimeImpact = regimeImpacts[baseRegime] || 0;
  const variantRegimeImpact = regimeImpacts[variantRegime] || 0;
  const regimeDelta = variantRegimeImpact - baseRegimeImpact;
  
  return Math.round((fdrImpact + regimeDelta) * 100) / 100;
}

// Calculate inventory level impact
function calculateInventoryImpact(
  baseFdrValue: number,
  variantFdrValue: number,
  commodityAdjustments: any
): number {
  // FDR impact on inventory strategy
  const fdrDelta = variantFdrValue - baseFdrValue;
  let inventoryImpact = 0;
  
  // Higher FDR = build less inventory (more risk)
  if (fdrDelta > 0.3) {
    inventoryImpact = -15; // Reduce inventory
  } else if (fdrDelta < -0.3) {
    inventoryImpact = 20; // Build inventory when favorable
  }
  
  // Commodity price adjustments impact
  if (commodityAdjustments && typeof commodityAdjustments === 'object') {
    const adjustments = Object.values(commodityAdjustments) as number[];
    const avgPriceChange = adjustments.length > 0 
      ? adjustments.reduce((a, b) => a + b, 0) / adjustments.length 
      : 0;
    
    // If prices expected to rise, build inventory
    if (avgPriceChange > 10) {
      inventoryImpact += 10;
    } else if (avgPriceChange < -10) {
      inventoryImpact -= 10;
    }
  }
  
  return Math.round(inventoryImpact * 100) / 100;
}

// Calculate budget utilization impact
function calculateBudgetImpact(
  procurementImpact: number,
  commodityAdjustments: any
): number {
  let budgetImpact = procurementImpact * 0.7; // Procurement is major budget driver
  
  // Commodity price adjustments
  if (commodityAdjustments && typeof commodityAdjustments === 'object') {
    const adjustments = Object.values(commodityAdjustments) as number[];
    const avgPriceChange = adjustments.length > 0 
      ? adjustments.reduce((a, b) => a + b, 0) / adjustments.length 
      : 0;
    budgetImpact += avgPriceChange * 0.3;
  }
  
  return Math.round(budgetImpact * 100) / 100;
}

// Calculate overall risk score for a scenario variant
function calculateVariantRiskScore(
  fdrValue: number,
  regime: string,
  commodityAdjustments: any
): number {
  let riskScore = 50; // Base risk
  
  // FDR risk contribution
  if (fdrValue > 1.5) {
    riskScore += 25; // High financial excess
  } else if (fdrValue > 1.2) {
    riskScore += 15;
  } else if (fdrValue < 0.8) {
    riskScore -= 10; // Favorable conditions
  }
  
  // Regime risk contribution
  const regimeRisks: Record<string, number> = {
    HEALTHY_EXPANSION: -10,
    ASSET_LED_GROWTH: 10,
    IMBALANCED_EXCESS: 25,
    REAL_ECONOMY_LEAD: -15,
    balanced: 0,
  };
  riskScore += regimeRisks[regime] || 0;
  
  // Commodity volatility risk
  if (commodityAdjustments && typeof commodityAdjustments === 'object') {
    const adjustments = Object.values(commodityAdjustments) as number[];
    const volatility = adjustments.length > 0
      ? Math.sqrt(adjustments.reduce((sum, val) => sum + val * val, 0) / adjustments.length)
      : 0;
    riskScore += Math.min(20, volatility * 0.5);
  }
  
  return Math.round(Math.max(0, Math.min(100, riskScore)));
}

// ===== SUPPLIER RISK SCORING HELPER FUNCTIONS =====

// Calculate financial health score for a supplier (0-100)
function calculateFinancialHealthScore(supplier: any, financialData: any): number {
  // If we have actual financial data, use it
  if (financialData) {
    let score = 50;
    if (financialData.creditRating) {
      const creditScores: Record<string, number> = {
        'AAA': 95, 'AA': 85, 'A': 75, 'BBB': 65, 'BB': 50, 'B': 35, 'CCC': 20, 'CC': 10, 'C': 5
      };
      score = creditScores[financialData.creditRating] || 50;
    }
    if (financialData.debtRatio && financialData.debtRatio > 0.7) {
      score -= 15;
    }
    if (financialData.cashFlow && financialData.cashFlow > 0) {
      score += 10;
    }
    return Math.max(0, Math.min(100, score));
  }
  
  // Default score based on available data
  return 60; // Moderate default score
}

// Calculate geographic risk score for a supplier (0-100, higher = more risk)
function calculateGeographicRiskScore(supplier: any): number {
  // Base risk score
  let riskScore = 30;
  
  // This would ideally check against geopolitical risk data
  // For now, use simple heuristics
  if (supplier.contactEmail) {
    const domain = supplier.contactEmail.split('@')[1] || '';
    // Higher risk for certain regions (simplified)
    if (domain.endsWith('.cn') || domain.endsWith('.ru')) {
      riskScore = 70;
    } else if (domain.endsWith('.us') || domain.endsWith('.de') || domain.endsWith('.uk')) {
      riskScore = 20;
    }
  }
  
  return riskScore;
}

// Calculate concentration risk (how dependent on single supplier)
async function calculateConcentrationRiskScore(supplier: any, companyId: string): Promise<number> {
  const allSuppliers = await storage.getSuppliers(companyId);
  
  if (allSuppliers.length <= 1) {
    return 90; // Very high risk if single supplier
  }
  
  // Get materials for this supplier
  const supplierMaterials = await storage.getSupplierMaterials(supplier.id);
  
  // Higher concentration if supplier provides many materials
  const materialsCount = supplierMaterials.length;
  
  if (materialsCount > 10) return 70;
  if (materialsCount > 5) return 50;
  if (materialsCount > 2) return 30;
  return 20;
}

// Calculate supplier performance score
async function calculatePerformanceScore(supplier: any): Promise<number> {
  // Would ideally check historical delivery data, quality metrics, etc.
  // For now, return a moderate score
  return 55;
}

// Calculate regime impact score (how current regime affects supplier risk)
function calculateRegimeImpactScore(regime: string, fdrValue: number): number {
  const regimeImpacts: Record<string, number> = {
    HEALTHY_EXPANSION: 25, // Low risk
    ASSET_LED_GROWTH: 45,
    IMBALANCED_EXCESS: 75, // High risk in bubble
    REAL_ECONOMY_LEAD: 35,
    balanced: 40,
  };
  
  let score = regimeImpacts[regime] || 50;
  
  // Adjust based on FDR value
  if (fdrValue > 1.5) score += 15;
  if (fdrValue < 0.8) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

// Determine risk tier based on adjusted score
function getRiskTier(adjustedScore: number): string {
  if (adjustedScore >= 75) return 'critical';
  if (adjustedScore >= 50) return 'high';
  if (adjustedScore >= 25) return 'medium';
  return 'low';
}

// Generate recommendations based on risk factors and regime
function generateRiskRecommendations(
  riskTier: string,
  riskFactors: any,
  regime: string
): any[] {
  const recommendations: any[] = [];
  
  // Tier-based recommendations
  if (riskTier === 'critical') {
    recommendations.push({
      priority: 'urgent',
      action: 'Identify alternative suppliers immediately',
      rationale: 'Critical supplier risk requires immediate diversification',
      timeframe: '1-2 weeks',
    });
    recommendations.push({
      priority: 'high',
      action: 'Build strategic inventory buffer',
      rationale: 'Protect against potential supply disruption',
      timeframe: '30 days',
    });
  } else if (riskTier === 'high') {
    recommendations.push({
      priority: 'high',
      action: 'Develop secondary supplier relationships',
      rationale: 'Reduce dependency on high-risk supplier',
      timeframe: '30-60 days',
    });
  }
  
  // Risk factor specific recommendations
  if (riskFactors.financial?.score > 60) {
    recommendations.push({
      priority: 'medium',
      action: 'Request updated financial statements',
      rationale: 'Elevated financial health concerns require monitoring',
      timeframe: '2 weeks',
    });
  }
  
  if (riskFactors.concentration?.score > 50) {
    recommendations.push({
      priority: 'medium',
      action: 'Qualify additional suppliers for key materials',
      rationale: 'Reduce concentration risk through supplier diversification',
      timeframe: '60-90 days',
    });
  }
  
  // Regime-specific recommendations
  if (regime === 'IMBALANCED_EXCESS') {
    recommendations.push({
      priority: 'high',
      action: 'Negotiate fixed-price contracts',
      rationale: 'Lock in pricing before bubble correction impacts costs',
      timeframe: '2 weeks',
    });
  } else if (regime === 'REAL_ECONOMY_LEAD') {
    recommendations.push({
      priority: 'medium',
      action: 'Explore long-term supply agreements at favorable rates',
      rationale: 'Capitalize on opportunity zone pricing',
      timeframe: '30 days',
    });
  }
  
  return recommendations;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply SOC2-lite security hardening
  applySecurityHardening(app);

  // Setup authentication
  await setupAuth(app);

  // Initialize RBAC system on startup
  console.log("[RBAC] Initializing permissions...");
  await initializePermissions(storage);
  console.log("[RBAC] Permissions initialized successfully");

  // Attach RBAC user to all authenticated API requests (not frontend static files)
  app.use('/api', isAuthenticated, attachRbacUser);

  // RBAC routes (roles, permissions, user role assignments)
  app.use('/api/rbac', rbacRoutes);

  // Auth endpoints
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all users in company (for role management)
  app.get('/api/users', isAuthenticated, requirePermission('MANAGE_USERS'), async (req: any, res) => {
    try {
      const companyId = req.rbacUser?.companyId;
      
      if (!companyId) {
        return res.status(403).json({ error: "Access denied: no company association" });
      }
      
      const users = await storage.getUsersByCompany(companyId);
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Seed data endpoint (for demo purposes)
  app.post('/api/seed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create company if user doesn't have one
      if (!user.companyId) {
        const company = await storage.createCompany({
          name: `${user.firstName || 'User'}'s Company`,
        });
        
        // Initialize default roles for the new company
        console.log(`[RBAC] Initializing default roles for company ${company.id}`);
        await initializeDefaultRoles(storage, company.id);
        
        // Assign Admin role to the first user
        const adminRole = await storage.getRoleByName(company.id, "Admin");
        if (adminRole) {
          await storage.assignRoleToUser(userId, adminRole.id, company.id, userId);
          console.log(`[RBAC] Assigned Admin role to user ${userId}`);
        }
        
        // Update user with company
        user = await storage.upsertUser({
          ...user,
          companyId: company.id,
        });
      }

      // Import seed function
      const { seedData } = await import("./seed");
      const result = await seedData(user.companyId!);
      
      res.json({ message: "Seed data created successfully", result });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Economic regime endpoint - reads from latest snapshot
  app.get("/api/economics/regime", isAuthenticated, async (req: any, res) => {
    try {
      // Load full user from database to get companyId
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no associated company" });
      }
      
      // Check regime-aware cache first
      const cacheKey = `economicData:regime:${user.companyId}`;
      const cachedData = globalCache.get<any>(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // Try to get latest snapshot from background jobs
      const snapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      if (snapshot) {
        // Use persisted snapshot data
        const responseData = {
          regime: snapshot.regime,
          fdr: snapshot.fdr,
          data: {
            gdpReal: snapshot.gdpReal,
            gdpNominal: snapshot.gdpNominal,
            sp500Index: snapshot.sp500Index,
            inflationRate: snapshot.inflationRate,
            sentimentScore: snapshot.sentimentScore,
          },
          source: snapshot.source,
          timestamp: snapshot.timestamp,
          signals: calculateSignalsForRegime(snapshot.regime),
        };
        
        // Cache with regime-aware TTL
        globalCache.set(cacheKey, responseData, 'economicData');
        
        res.json(responseData);
      } else {
        // Fallback to balance sheet calculation if no snapshot exists
        await economics.fetch();
        res.json({
          regime: economics.regime,
          fdr: economics.fdr,
          data: economics.data,
          source: 'balance_sheet',
          signals: calculateSignalsForRegime(economics.regime),
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Master Materials Catalog Endpoint
  app.get("/api/materials/catalog", isAuthenticated, async (req: any, res) => {
    try {
      const { MASTER_MATERIALS_CATALOG, searchMaterials, getAllCategories } = await import("./lib/materialsCatalog");
      const { query } = req.query;
      
      if (query) {
        const results = searchMaterials(query as string);
        res.json(results);
      } else {
        res.json({
          materials: MASTER_MATERIALS_CATALOG,
          categories: getAllCategories(),
        });
      }
    } catch (error: any) {
      console.error("Error fetching materials catalog:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Commodity Pricing Endpoints
  app.get("/api/commodities/prices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Check regime-aware cache first
      const cacheKey = `commodityPrices:all:${user.companyId}`;
      const cachedPrices = globalCache.get<any>(cacheKey);
      if (cachedPrices) {
        return res.json(cachedPrices);
      }
      
      const { fetchAllCommodityPrices } = await import("./lib/commodityPricing");
      const prices = await fetchAllCommodityPrices();
      
      // Cache with regime-aware TTL
      globalCache.set(cacheKey, prices, 'commodityPrices');
      
      res.json(prices);
    } catch (error: any) {
      console.error("Error fetching commodity prices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/commodities/prices/:materialCode", isAuthenticated, async (req: any, res) => {
    try {
      const { fetchSingleCommodityPrice } = await import("./lib/commodityPricing");
      const price = await fetchSingleCommodityPrice(req.params.materialCode);
      if (!price) {
        return res.status(404).json({ error: "Price not available for this material" });
      }
      res.json(price);
    } catch (error: any) {
      console.error("Error fetching commodity price:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk fetch prices for specific materials
  app.post("/api/commodities/prices/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { materialCodes } = req.body;
      if (!Array.isArray(materialCodes)) {
        return res.status(400).json({ error: "materialCodes must be an array" });
      }
      const { fetchCommodityPrices } = await import("./lib/commodityPricing");
      const prices = await fetchCommodityPrices(materialCodes);
      res.json(prices);
    } catch (error: any) {
      console.error("Error fetching bulk commodity prices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Price Alert Endpoints
  app.get("/api/price-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const alerts = await storage.getPriceAlerts(user.companyId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/price-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const { insertPriceAlertSchema } = await import("@shared/schema");
      const alertData = insertPriceAlertSchema.parse({
        ...req.body,
        companyId: user.companyId, // Force company ownership
      });
      
      const alert = await storage.createPriceAlert(alertData);
      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/price-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      // Verify ownership
      const existingAlert = await storage.getPriceAlert(req.params.id);
      if (!existingAlert) {
        return res.status(404).json({ error: "Price alert not found" });
      }
      if (existingAlert.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const { updatePriceAlertSchema } = await import("@shared/schema");
      const updateData = updatePriceAlertSchema.parse(req.body);
      
      const updated = await storage.updatePriceAlert(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/price-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      // Verify ownership
      const existingAlert = await storage.getPriceAlert(req.params.id);
      if (!existingAlert) {
        return res.status(404).json({ error: "Price alert not found" });
      }
      if (existingAlert.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deletePriceAlert(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Machinery Endpoints
  app.get("/api/machinery", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const machines = await storage.getMachinery(user.companyId);
      res.json(machines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/machinery/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      if (machine.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(machine);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/machinery", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const { insertMachinerySchema } = await import("@shared/schema");
      const machineData = insertMachinerySchema.parse({
        ...req.body,
        purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : null,
        lastMaintenanceDate: req.body.lastMaintenanceDate ? new Date(req.body.lastMaintenanceDate) : null,
        companyId: user.companyId,
      });
      
      const machine = await storage.createMachine(machineData);
      res.json(machine);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/machinery/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const existingMachine = await storage.getMachine(req.params.id);
      if (!existingMachine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      if (existingMachine.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const { updateMachinerySchema } = await import("@shared/schema");
      const bodyWithParsedDates = {
        ...req.body,
        ...(req.body.purchaseDate && { purchaseDate: new Date(req.body.purchaseDate) }),
        ...(req.body.lastMaintenanceDate && { lastMaintenanceDate: new Date(req.body.lastMaintenanceDate) }),
      };
      const updateData = updateMachinerySchema.parse(bodyWithParsedDates);
      
      const updated = await storage.updateMachine(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/machinery/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const existingMachine = await storage.getMachine(req.params.id);
      if (!existingMachine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      if (existingMachine.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteMachine(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate depreciation for a machine
  app.get("/api/machinery/:id/depreciation", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      if (machine.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const { calculateDepreciation } = await import("./lib/depreciation");
      const depreciationData = calculateDepreciation(machine);
      res.json(depreciationData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Maintenance Records Endpoints
  app.get("/api/machinery/:id/maintenance", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      if (machine.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const records = await storage.getMaintenanceRecords(req.params.id);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/machinery/:id/maintenance", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      if (machine.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const { insertMaintenanceRecordSchema } = await import("@shared/schema");
      const recordData = insertMaintenanceRecordSchema.parse({
        ...req.body,
        machineryId: req.params.id,
        performedDate: req.body.performedDate ? new Date(req.body.performedDate) : new Date(),
        nextScheduledDate: req.body.nextScheduledDate ? new Date(req.body.nextScheduledDate) : null,
      });
      
      const record = await storage.createMaintenanceRecord(recordData);
      
      // Update machine's last maintenance date
      await storage.updateMachine(req.params.id, {
        lastMaintenanceDate: recordData.performedDate,
        nextMaintenanceDate: recordData.nextScheduledDate || null,
      });
      
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // SKUs
  app.get("/api/skus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const cacheKey = `masterData:skus:${user.companyId}`;
      const cached = globalCache.get<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const skus = await storage.getSkus(user.companyId);
      globalCache.set(cacheKey, skus, 'masterData');
      
      res.json(skus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/skus/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sku = await storage.getSku(req.params.id);
      if (!sku) {
        return res.status(404).json({ error: "SKU not found" });
      }
      if (sku.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(sku);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/skus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const validatedData = insertSkuSchema.parse({ ...req.body, companyId: user.companyId });
      const sku = await storage.createSku(validatedData);
      globalCache.invalidate(`masterData:skus:${user.companyId}`);
      await logAudit({ action: "create", entityType: "sku", entityId: sku.id, changes: validatedData, req });
      res.status(201).json(sku);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/skus/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getSku(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "SKU not found" });
      }
      if (existing.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = updateSkuSchema.parse(req.body);
      const sku = await storage.updateSku(req.params.id, validatedData);
      globalCache.invalidate(`masterData:skus:${user.companyId}`);
      await logAudit({ action: "update", entityType: "sku", entityId: req.params.id, changes: validatedData, req });
      res.json(sku);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/skus/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getSku(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "SKU not found" });
      }
      if (existing.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteSku(req.params.id);
      globalCache.invalidate(`masterData:skus:${user.companyId}`);
      await logAudit({ action: "delete", entityType: "sku", entityId: req.params.id, changes: { name: existing.name }, req });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Materials
  app.get("/api/materials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const cacheKey = `masterData:materials:${user.companyId}`;
      const cached = globalCache.get<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const materials = await storage.getMaterials(user.companyId);
      globalCache.set(cacheKey, materials, 'masterData');
      
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/materials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const material = await storage.getMaterial(req.params.id);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (material.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/materials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const validatedData = insertMaterialSchema.parse({ ...req.body, companyId: user.companyId });
      const material = await storage.createMaterial(validatedData);
      globalCache.invalidate(`masterData:materials:${user.companyId}`);
      await logAudit({ action: "create", entityType: "material", entityId: material.id, changes: validatedData, req });
      res.status(201).json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/materials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getMaterial(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (existing.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = updateMaterialSchema.parse(req.body);
      const material = await storage.updateMaterial(req.params.id, validatedData);
      globalCache.invalidate(`masterData:materials:${user.companyId}`);
      await logAudit({ action: "update", entityType: "material", entityId: req.params.id, changes: validatedData, req });
      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/materials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getMaterial(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (existing.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteMaterial(req.params.id);
      globalCache.invalidate(`masterData:materials:${user.companyId}`);
      await logAudit({ action: "delete", entityType: "material", entityId: req.params.id, changes: { name: existing.name }, req });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // BOMs
  app.get("/api/boms/:skuId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sku = await storage.getSku(req.params.skuId);
      if (!sku || sku.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const boms = await storage.getBomsForSku(req.params.skuId);
      res.json(boms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/boms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sku = await storage.getSku(req.body.skuId);
      if (!sku || sku.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = insertBomSchema.parse(req.body);
      const bom = await storage.createBom(validatedData);
      res.status(201).json(bom);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/boms/:skuId/:materialId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sku = await storage.getSku(req.params.skuId);
      if (!sku || sku.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteBom(req.params.skuId, req.params.materialId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Suppliers
  app.get("/api/suppliers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const cacheKey = `masterData:suppliers:${user.companyId}`;
      const cached = globalCache.get<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const suppliers = await storage.getSuppliers(user.companyId);
      globalCache.set(cacheKey, suppliers, 'masterData');
      
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/suppliers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const validatedData = insertSupplierSchema.parse({ ...req.body, companyId: user.companyId });
      const supplier = await storage.createSupplier(validatedData);
      globalCache.invalidate(`masterData:suppliers:${user.companyId}`);
      await logAudit({ action: "create", entityType: "supplier", entityId: supplier.id, changes: validatedData, req });
      res.status(201).json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Supplier Materials
  app.get("/api/supplier-materials/:supplierId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const supplier = await storage.getSupplier(req.params.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const supplierMaterials = await storage.getSupplierMaterials(req.params.supplierId);
      res.json(supplierMaterials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/supplier-materials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const supplier = await storage.getSupplier(req.body.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied to supplier" });
      }
      const material = await storage.getMaterial(req.body.materialId);
      if (!material || material.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied to material" });
      }
      const validatedData = insertSupplierMaterialSchema.parse(req.body);
      const sm = await storage.createSupplierMaterial(validatedData);
      res.status(201).json(sm);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Demand History
  app.get("/api/demand-history/:skuId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sku = await storage.getSku(req.params.skuId);
      if (!sku || sku.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const history = await storage.getDemandHistory(req.params.skuId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/demand-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sku = await storage.getSku(req.body.skuId);
      if (!sku || sku.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = insertDemandHistorySchema.parse(req.body);
      const dh = await storage.createDemandHistory(validatedData);
      res.status(201).json(dh);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/demand-history/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const items = req.body.items || [];
      for (const item of items) {
        const sku = await storage.getSku(item.skuId);
        if (!sku || sku.companyId !== user.companyId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const validated = items.map((item: any) => insertDemandHistorySchema.parse(item));
      await storage.bulkCreateDemandHistory(validated);
      res.status(201).json({ count: validated.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Forecast Accuracy
  app.get("/api/forecast-accuracy/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const cacheKey = `forecasts:accuracy-metrics:${user.companyId}`;
      const cached = globalCache.get<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const metrics = await storage.getForecastAccuracyMetrics(user.companyId);
      globalCache.set(cacheKey, metrics, 'forecasts');
      
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/forecast-accuracy/by-period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const data = await storage.getForecastAccuracyByPeriod(user.companyId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/forecast-accuracy/by-sku", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const data = await storage.getForecastAccuracyBySku(user.companyId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/forecast-accuracy/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const predictions = await storage.getPredictionsWithActuals(user.companyId, limit);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Multi-Horizon Forecasting
  app.get("/api/multi-horizon-forecasts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const skuId = req.query.skuId as string | undefined;
      const horizonDays = req.query.horizonDays ? parseInt(req.query.horizonDays as string) : undefined;
      
      const cacheKey = `forecasts:multi-horizon:${user.companyId}:${skuId || 'all'}:${horizonDays || 'all'}`;
      const cached = globalCache.get<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const forecasts = await storage.getMultiHorizonForecasts(user.companyId, { skuId, horizonDays });
      globalCache.set(cacheKey, forecasts, 'forecasts');
      
      res.json(forecasts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/multi-horizon-forecasts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const validated = insertMultiHorizonForecastSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      const forecast = await storage.createMultiHorizonForecast(validated);
      res.status(201).json(forecast);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/multi-horizon-forecasts/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const forecasts = req.body.forecasts || [];
      const validated = forecasts.map((f: any) => insertMultiHorizonForecastSchema.parse({
        ...f,
        companyId: user.companyId,
      }));
      const created = await storage.createMultiHorizonForecasts(validated);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/multi-horizon-forecasts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const forecasts = await storage.getMultiHorizonForecasts(user.companyId);
      const forecast = forecasts.find(f => f.id === req.params.id);
      if (!forecast) {
        return res.status(404).json({ error: "Forecast not found" });
      }
      const updated = await storage.updateMultiHorizonForecast(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/multi-horizon-forecasts/comparison/:skuId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const comparison = await storage.getMultiHorizonForecastComparison(user.companyId, req.params.skuId);
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Forecast Accuracy Tracking & Monitoring
  app.get("/api/forecast-accuracy-tracking", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const skuId = req.query.skuId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const tracking = await storage.getForecastAccuracyTracking(user.companyId, { skuId, limit });
      res.json(tracking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/forecast-accuracy-tracking/latest/:skuId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const tracking = await storage.getLatestForecastAccuracyBySKU(user.companyId, req.params.skuId);
      res.json(tracking || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/forecast-degradation-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const skuId = req.query.skuId as string | undefined;
      const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
      const severity = req.query.severity as string | undefined;
      const alerts = await storage.getForecastDegradationAlerts(user.companyId, { skuId, resolved, severity });
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/forecast-degradation-alerts/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const alert = await storage.acknowledgeForecastAlert(req.params.id, userId);
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/forecast-degradation-alerts/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const { actionTaken } = req.body;
      if (!actionTaken) {
        return res.status(400).json({ error: "actionTaken is required" });
      }
      const alert = await storage.resolveForecastAlert(req.params.id, actionTaken, userId);
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Allocations
  app.get("/api/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const allocations = await storage.getAllocations(user.companyId);
      res.json(allocations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/allocations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const allocation = await storage.getAllocation(req.params.id);
      if (!allocation) {
        return res.status(404).json({ error: "Allocation not found" });
      }
      if (allocation.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const results = await storage.getAllocationResults(req.params.id);
      res.json({ ...allocation, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Validation schema for direct material requirements
  const directMaterialRequirementSchema = z.object({
    materialId: z.string().min(1, "Material ID is required"),
    quantity: z.number().positive("Quantity must be positive"),
  });

  const allocationRunSchema = z.object({
    budget: z.number().positive("Budget must be positive"),
    name: z.string().optional(),
    budgetDurationValue: z.number().int().positive().optional(),
    budgetDurationUnit: z.enum(["day", "week", "month", "quarter"]).optional(),
    horizonStart: z.string().optional(),
    directMaterialRequirements: z.array(directMaterialRequirementSchema).optional(),
  });

  // Run allocation
  app.post("/api/allocations/run", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      // Validate request body
      const validationResult = allocationRunSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { budget, name, budgetDurationValue, budgetDurationUnit, horizonStart, directMaterialRequirements } = validationResult.data;

      // Fetch company data
      const companyId = user.companyId;
      const skus = await storage.getSkus(companyId);
      const materials = await storage.getMaterials(companyId);
      const suppliers = await storage.getSuppliers(companyId);

      // Get economic regime
      await economics.fetch();
      const signals = economics.signals();

      // Build BOM map
      const bomMap: Record<string, Record<string, number>> = {};
      for (const sku of skus) {
        const boms = await storage.getBomsForSku(sku.id);
        bomMap[sku.id] = {};
        for (const bom of boms) {
          const material = materials.find(m => m.id === bom.materialId);
          if (material) {
            bomMap[sku.id][material.code] = bom.quantityPerUnit;
          }
        }
      }

      // Build material inventory maps
      const onHand: Record<string, number> = {};
      const inbound: Record<string, number> = {};
      for (const mat of materials) {
        onHand[mat.code] = mat.onHand;
        inbound[mat.code] = mat.inbound;
      }

      // Build supplier terms map (both by code and by ID for direct material flow)
      const supplierTerms: Record<string, any> = {};
      const supplierTermsById: Record<string, any> = {};
      for (const supplier of suppliers) {
        const sms = await storage.getSupplierMaterials(supplier.id);
        for (const sm of sms) {
          const material = materials.find(m => m.id === sm.materialId);
          if (material) {
            supplierTerms[material.code] = {
              unit_cost: sm.unitCost,
              lead_time_days: sm.leadTimeDays,
            };
            supplierTermsById[material.id] = {
              unit_cost: sm.unitCost,
              lead_time_days: sm.leadTimeDays,
              materialCode: material.code,
              materialName: material.name,
              unit: material.unit,
            };
          }
        }
      }

      // Check if using direct material requirements mode
      const useDirectMaterials = directMaterialRequirements && Array.isArray(directMaterialRequirements) && directMaterialRequirements.length > 0;

      // Build demand history for forecasting
      const historyBySku: Record<string, number[]> = {};
      for (const sku of skus) {
        const history = await storage.getDemandHistory(sku.id);
        historyBySku[sku.id] = history
          .sort((a, b) => a.period.localeCompare(b.period))
          .map(h => h.units);
      }

      // Forecast demand
      const forecaster = new DemandForecaster(historyBySku);
      const forecastBySku: Record<string, number> = {};
      for (const sku of skus) {
        const forecast = forecaster.forecast(sku.id, 2, economics.regime);
        forecastBySku[sku.id] = forecast.reduce((sum, val) => sum + val, 0);
      }

      // Build priority map
      const priorityBySku: Record<string, number> = {};
      for (const sku of skus) {
        priorityBySku[sku.id] = sku.priority;
      }

      // Run allocation engine (or create simple plan for direct materials)
      let plan: any;
      if (useDirectMaterials) {
        // Direct material mode: create a simplified plan without running allocation engine
        plan = {
          production_targets: {},
          sku_allocation_units: {},
          material_procurement: {},
          policy_knobs: signals,
          kpis: {
            total_production: 0,
            total_material_cost: 0,
            total_skus_planned: 0,
            fill_rate_by_sku: {},
            budget_utilization: 0,
          },
        };
      } else {
        // SKU-based mode: run allocation engine
        const engine = new AllocationEngine(bomMap, onHand, inbound, budget, supplierTerms);
        plan = engine.plan(forecastBySku, signals, priorityBySku);
      }

      // Calculate budget duration in days
      let durationInDays: number | null = null;
      if (budgetDurationValue && budgetDurationUnit) {
        const unitToDays: Record<string, number> = {
          'day': 1,
          'week': 7,
          'month': 30,
          'quarter': 90,
        };
        durationInDays = budgetDurationValue * (unitToDays[budgetDurationUnit] || 1);
      }

      // Pre-calculate total material cost for allocated production
      let totalAllocationCost = 0;
      const startDate = horizonStart ? new Date(horizonStart) : new Date();
      const materialBreakdown: Array<{materialId: string, materialName: string, quantity: number, unitCost: number, totalCost: number}> = [];

      if (useDirectMaterials) {
        // Import materials catalog for auto-creation
        const { getMaterialByCode } = await import("./lib/materialsCatalog");
        
        // Direct materials mode: validate and calculate cost from user-specified materials
        for (const req of directMaterialRequirements) {
          const { materialId, quantity } = req;
          
          // Strategy: 
          // 1. Try to find by UUID (existing company material)
          // 2. If not found, try to find by catalog code in company materials
          // 3. If still not found, auto-create from catalog
          
          let material = materials.find(m => m.id === materialId);
          
          if (!material) {
            // Check if materialId is a catalog code and if company already has this material
            material = materials.find(m => m.code === materialId);
            
            if (!material) {
              // Material doesn't exist in company - try to create from catalog
              const catalogMaterial = getMaterialByCode(materialId);
              if (catalogMaterial) {
                // Auto-create material from catalog
                material = await storage.createMaterial({
                  companyId,
                  code: catalogMaterial.code,
                  name: catalogMaterial.name,
                  unit: catalogMaterial.unit,
                  onHand: 0,
                  inbound: 0,
                });
                
                // Refresh materials list
                materials.push(material);
                
                // Auto-create default supplier if none exists
                let defaultSupplier = suppliers.find(s => s.name === "Default Supplier");
                if (!defaultSupplier) {
                  defaultSupplier = await storage.createSupplier({
                    companyId,
                    name: "Default Supplier",
                    contactEmail: "supplier@example.com",
                  });
                  suppliers.push(defaultSupplier);
                }
                
                // Auto-create supplier pricing using catalog estimated price
                const supplierMaterial = await storage.createSupplierMaterial({
                  supplierId: defaultSupplier.id,
                  materialId: material.id,
                  unitCost: catalogMaterial.estimatedPrice || 10.0,
                  leadTimeDays: 7,
                });
                
                // Add to supplier terms
                supplierTermsById[material.id] = {
                  unit_cost: supplierMaterial.unitCost,
                  lead_time_days: supplierMaterial.leadTimeDays,
                  materialCode: material.code,
                  materialName: material.name,
                  unit: material.unit,
                };
              } else {
                return res.status(400).json({ 
                  error: `Material "${materialId}" not found in catalog. Please select a valid material.` 
                });
              }
            }
          }
          
          // Get pricing (either existing or just created)
          const terms = supplierTermsById[material.id];
          if (!terms) {
            // Fallback: use catalog estimated price if no supplier pricing exists
            const catalogMaterial = getMaterialByCode(material.code);
            const estimatedPrice = catalogMaterial?.estimatedPrice || 10.0;
            
            // Create default supplier and pricing on the fly
            let defaultSupplier = suppliers.find(s => s.name === "Default Supplier");
            if (!defaultSupplier) {
              defaultSupplier = await storage.createSupplier({
                companyId,
                name: "Default Supplier",
                contactEmail: "supplier@example.com",
              });
              suppliers.push(defaultSupplier);
            }
            
            const supplierMaterial = await storage.createSupplierMaterial({
              supplierId: defaultSupplier.id,
              materialId: material.id,
              unitCost: estimatedPrice,
              leadTimeDays: 7,
            });
            
            supplierTermsById[material.id] = {
              unit_cost: supplierMaterial.unitCost,
              lead_time_days: supplierMaterial.leadTimeDays,
              materialCode: material.code,
              materialName: material.name,
              unit: material.unit,
            };
          }
          
          const finalTerms = supplierTermsById[material.id];
          const materialCost = quantity * finalTerms.unit_cost;
          totalAllocationCost += materialCost;
          materialBreakdown.push({
            materialId: material.id,
            materialName: finalTerms.materialName,
            quantity,
            unitCost: finalTerms.unit_cost,
            totalCost: materialCost,
          });
        }
        
        // Validate that total cost is greater than zero
        if (totalAllocationCost === 0) {
          return res.status(400).json({
            error: "Total allocation cost is zero. Please check material quantities and supplier pricing."
          });
        }
        
        // Update plan KPIs with direct material costs
        plan.kpis.total_material_cost = totalAllocationCost;
        plan.kpis.budget_utilization = budget > 0 ? (totalAllocationCost / budget) * 100 : 0;
      } else {
        // SKU-based mode: calculate cost from allocated SKUs
        for (const sku of skus) {
          const allocated = plan.sku_allocation_units[sku.id] || 0;
          if (allocated > 0) {
            let skuMaterialCost = 0;
            const bomEntry = bomMap[sku.id] || {};
            for (const [materialCode, perUnit] of Object.entries(bomEntry)) {
              const terms = supplierTerms[materialCode];
              if (terms) {
                skuMaterialCost += perUnit * terms.unit_cost * allocated;
              }
            }
            totalAllocationCost += skuMaterialCost;
          }
        }
        
        plan.kpis.total_material_cost = totalAllocationCost;
        plan.kpis.budget_utilization = budget > 0 ? (totalAllocationCost / budget) * 100 : 0;
      }

      // Calculate coverage analysis
      const coverageWarnings: string[] = [];
      let coverageData = null;
      if (durationInDays && totalAllocationCost > 0) {
        // Forecast horizon: DemandForecaster uses PERIOD_DAYS (30) * 2 periods = 60 days
        const forecastHorizonDays = 60;
        
        // Calculate burn rate per day based on forecast horizon (independent of requested duration)
        const burnRatePerDay = totalAllocationCost / forecastHorizonDays;
        
        // Calculate how many days the budget can actually cover
        const coverageDays = budget / burnRatePerDay;
        
        // Check if coverage meets requested duration
        const isSufficient = coverageDays >= durationInDays;
        
        if (!isSufficient) {
          const shortfall = (durationInDays * burnRatePerDay) - budget;
          const coveragePercent = (coverageDays / durationInDays) * 100;
          coverageWarnings.push(
            `Budget shortfall: Your $${budget.toLocaleString()} budget covers ${coverageDays.toFixed(0)} days, but you requested ${durationInDays} days (${coveragePercent.toFixed(0)}% coverage). You need an additional $${shortfall.toFixed(0)} to meet your target duration.`
          );
        }

        coverageData = {
          requestedDays: durationInDays,
          budgetCoverageDays: coverageDays,
          isSufficient,
          warnings: coverageWarnings,
          totalBurnRatePerDay: burnRatePerDay,
          totalAllocationCost,
          forecastHorizonDays,
          materialBreakdown: useDirectMaterials ? materialBreakdown : undefined,
        };
      }

      // Save allocation with coverage analysis in KPIs
      const allocation = await storage.createAllocation({
        companyId,
        name: name || `Allocation ${new Date().toISOString()}`,
        budget,
        regime: economics.regime,
        fdr: economics.fdr,
        policyKnobs: plan.policy_knobs as any,
        kpis: {
          ...plan.kpis,
          coverage: coverageData,
        } as any,
        budgetDurationValue: budgetDurationValue || null,
        budgetDurationUnit: budgetDurationUnit || null,
        horizonStart: horizonStart ? new Date(horizonStart) : null,
        directMaterialRequirements: useDirectMaterials ? directMaterialRequirements : null,
      });
      
      await logAudit({ action: "create", entityType: "allocation", entityId: allocation.id, changes: { budget, regime: economics.regime }, req });

      // Save allocation results with runway calculations
      const results = [];
      for (const sku of skus) {
        const planned = plan.production_targets[sku.id] || 0;
        const allocated = plan.sku_allocation_units[sku.id] || 0;
        const fillRate = plan.kpis.fill_rate_by_sku[sku.id] || 0;
        
        // Calculate cost per period and runway if duration is specified
        let estimatedCostPerPeriod: number | null = null;
        let projectedDepletionDate: Date | null = null;
        let daysOfInventory: number | null = null;

        if (durationInDays && allocated > 0) {
          // Calculate material cost for this SKU
          let skuMaterialCost = 0;
          const bomEntry = bomMap[sku.id] || {};
          for (const [materialCode, perUnit] of Object.entries(bomEntry)) {
            const terms = supplierTerms[materialCode];
            if (terms) {
              skuMaterialCost += perUnit * terms.unit_cost * allocated;
            }
          }

          // Burn rate per day
          const burnRatePerDay = skuMaterialCost / durationInDays;
          estimatedCostPerPeriod = burnRatePerDay;

          // Calculate days of inventory based on allocated vs forecasted demand
          const forecastedDemand = forecastBySku[sku.id] || 1;
          if (forecastedDemand > 0) {
            daysOfInventory = (allocated / forecastedDemand) * durationInDays;
          }

          // Project depletion date
          if (burnRatePerDay > 0) {
            const daysUntilDepletion = skuMaterialCost / burnRatePerDay;
            projectedDepletionDate = new Date(startDate.getTime() + daysUntilDepletion * 24 * 60 * 60 * 1000);
          }
        }
        
        results.push({
          allocationId: allocation.id,
          skuId: sku.id,
          plannedUnits: planned,
          allocatedUnits: allocated,
          fillRate: fillRate,
          estimatedCostPerPeriod,
          projectedDepletionDate,
          daysOfInventory,
        });
      }
      await storage.bulkCreateAllocationResults(results);

      const budgetUtilization = plan.kpis.budget_utilization || 0;
      
      webhookService.fireAllocationComplete(
        companyId,
        allocation.id,
        allocation.name,
        totalAllocationCost,
        budgetUtilization,
        plan.kpis.total_production || 0
      ).catch(err => console.error('Webhook error (allocation_complete):', err));

      if (budgetUtilization >= 80) {
        webhookService.fireBudgetAlert(
          companyId,
          totalAllocationCost,
          budget,
          budgetUtilization
        ).catch(err => console.error('Webhook error (budget_alert):', err));
      }

      res.status(201).json({
        allocation,
        plan,
        results,
        warnings: coverageWarnings,
        coverageAnalysis: coverageData,
      });
    } catch (error: any) {
      console.error("Allocation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // AUTOMATED RFQ GENERATION ROUTES
  // ========================================

  // Get all RFQs for company
  app.get("/api/rfqs", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const rfqs = await storage.getRfqs(user.companyId);
      res.json(rfqs);
    } catch (error: any) {
      console.error("Error fetching RFQs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single RFQ by ID
  app.get("/api/rfqs/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const rfq = await storage.getRfq(req.params.id);
      if (!rfq) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      if (rfq.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Also fetch related quotes
      const quotes = await storage.getRfqQuotes(req.params.id);
      res.json({ ...rfq, quotes });
    } catch (error: any) {
      console.error("Error fetching RFQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Identify RFQ opportunities (scan inventory + regime)
  app.get("/api/rfqs/opportunities/scan", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const triggers = await rfqGenerationService.identifyRfqTriggers(user.companyId);
      
      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_scan',
        `Scanned for RFQ opportunities. Found ${triggers.length} materials below reorder point.`,
        { triggerCount: triggers.length }
      );

      res.json(triggers);
    } catch (error: any) {
      console.error("Error scanning for RFQ opportunities:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-generate RFQs from opportunities
  app.post("/api/rfqs/generate", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const results = await rfqGenerationService.autoGenerateRfqs(user.companyId, userId);
      
      const successCount = results.filter(r => r.success).length;
      
      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_auto_generate',
        `Auto-generated ${successCount} RFQs from ${results.length} opportunities.`,
        { results }
      );

      res.json({
        success: true,
        generated: successCount,
        total: results.length,
        results,
      });
    } catch (error: any) {
      console.error("Error auto-generating RFQs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create manual RFQ
  app.post("/api/rfqs", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      // Validate request body
      const validationResult = insertRfqSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }

      const rfqData = {
        ...validationResult.data,
        companyId: user.companyId,
        createdBy: userId,
        isAutoGenerated: 0,
      };

      const rfq = await storage.createRfq(rfqData);
      
      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_create',
        `Created manual RFQ ${rfq.rfqNumber} for material ${rfq.materialId}`,
        { rfqId: rfq.id }
      );

      res.status(201).json(rfq);
    } catch (error: any) {
      console.error("Error creating RFQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update RFQ
  app.patch("/api/rfqs/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const existingRfq = await storage.getRfq(req.params.id);
      if (!existingRfq) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      if (existingRfq.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedRfq = await storage.updateRfq(req.params.id, req.body);
      
      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_update',
        `Updated RFQ ${existingRfq.rfqNumber}`,
        { rfqId: req.params.id, changes: req.body }
      );

      res.json(updatedRfq);
    } catch (error: any) {
      console.error("Error updating RFQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Approve RFQ (change status to pending_approval -> sent)
  app.post("/api/rfqs/:id/approve", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const rfq = await storage.getRfq(req.params.id);
      if (!rfq) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      if (rfq.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedRfq = await storage.updateRfq(req.params.id, {
        status: "sent",
        approvedBy: userId,
        approvedAt: new Date(),
        sentAt: new Date(),
      });

      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_approve',
        `Approved and sent RFQ ${rfq.rfqNumber}`,
        { rfqId: req.params.id }
      );

      res.json(updatedRfq);
    } catch (error: any) {
      console.error("Error approving RFQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete RFQ
  app.delete("/api/rfqs/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const rfq = await storage.getRfq(req.params.id);
      if (!rfq) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      if (rfq.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteRfq(req.params.id);
      
      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_delete',
        `Deleted RFQ ${rfq.rfqNumber}`,
        { rfqId: req.params.id }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting RFQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add quote to RFQ
  app.post("/api/rfqs/:rfqId/quotes", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const rfq = await storage.getRfq(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      if (rfq.companyId !== user.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const validationResult = insertRfqQuoteSchema.safeParse({
        ...req.body,
        rfqId: req.params.rfqId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }

      const quote = await storage.createRfqQuote(validationResult.data);
      
      // Update RFQ quotes count
      await storage.updateRfq(req.params.rfqId, {
        quotesReceived: (rfq.quotesReceived || 0) + 1,
        status: "quotes_received",
      });

      await logAudit(
        storage,
        user.companyId,
        userId,
        'rfq_quote_add',
        `Added quote from supplier ${quote.supplierId} to RFQ ${rfq.rfqNumber}`,
        { rfqId: req.params.rfqId, quoteId: quote.id }
      );

      res.status(201).json(quote);
    } catch (error: any) {
      console.error("Error adding quote to RFQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // COMPLIANCE MANAGEMENT ROUTES
  // ========================================

  // Get all compliance documents
  app.get("/api/compliance/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const documents = await storage.getComplianceDocuments(user.companyId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching compliance documents:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create compliance document
  app.post("/api/compliance/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      // Get current economic regime for context
      await economics.fetch();
      
      const document = await storage.createComplianceDocument({
        ...req.body,
        companyId: user.companyId,
        createdBy: user.id,
        economicRegimeContext: economics.regime,
      });
      
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error creating compliance document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all compliance regulations
  app.get("/api/compliance/regulations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const regulations = await storage.getComplianceRegulations(user.companyId);
      res.json(regulations);
    } catch (error: any) {
      console.error("Error fetching compliance regulations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create compliance regulation
  app.post("/api/compliance/regulations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const regulation = await storage.createComplianceRegulation({
        ...req.body,
        companyId: user.companyId,
      });
      
      res.status(201).json(regulation);
    } catch (error: any) {
      console.error("Error creating compliance regulation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all compliance audits
  app.get("/api/compliance/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const audits = await storage.getComplianceAudits(user.companyId);
      res.json(audits);
    } catch (error: any) {
      console.error("Error fetching compliance audits:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create compliance audit
  app.post("/api/compliance/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      // Get current economic regime and FDR
      await economics.fetch();
      
      const audit = await storage.createComplianceAudit({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
        fdrAtAudit: economics.fdr,
      });
      
      res.status(201).json(audit);
    } catch (error: any) {
      console.error("Error creating compliance audit:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // PRODUCTION KPI ROUTES
  // ========================================

  // Get all production runs
  app.get("/api/production/runs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const runs = await storage.getProductionRuns(user.companyId);
      res.json(runs);
    } catch (error: any) {
      console.error("Error fetching production runs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create production run
  app.post("/api/production/runs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      // Get current economic regime
      await economics.fetch();
      
      const run = await storage.createProductionRun({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
        fdrAtStart: economics.fdr,
      });
      
      res.status(201).json(run);
    } catch (error: any) {
      console.error("Error creating production run:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update production run (e.g., mark as completed)
  app.patch("/api/production/runs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const run = await storage.updateProductionRun(req.params.id, req.body);
      
      // If run is completed, calculate OEE and create production metric
      if (run.status === "completed" && run.endTime) {
        const { generateProductionMetric } = await import("./lib/productionKPIs");
        await economics.fetch();
        
        const metric = generateProductionMetric(
          run,
          user.companyId,
          economics.regime,
          economics.fdr
        );
        
        await storage.createProductionMetric(metric);
      }
      
      res.json(run);
    } catch (error: any) {
      console.error("Error updating production run:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get production metrics with OEE analysis
  app.get("/api/production/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const metrics = await storage.getProductionMetrics(user.companyId);
      
      // Calculate aggregate statistics
      const avgOEE = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.oee || 0), 0) / metrics.length
        : 0;
      
      const avgAvailability = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length
        : 0;
      
      const avgPerformance = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length
        : 0;
      
      const avgQuality = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length
        : 0;

      res.json({
        metrics,
        aggregates: {
          avgOEE: Math.round(avgOEE * 100) / 100,
          avgAvailability: Math.round(avgAvailability * 100) / 100,
          avgPerformance: Math.round(avgPerformance * 100) / 100,
          avgQuality: Math.round(avgQuality * 100) / 100,
          totalRuns: metrics.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching production metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get downtime events
  app.get("/api/production/downtime", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const events = await storage.getDowntimeEvents(user.companyId);
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching downtime events:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create downtime event
  app.post("/api/production/downtime", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      await economics.fetch();
      
      const event = await storage.createDowntimeEvent({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
      });
      
      res.status(201).json(event);
    } catch (error: any) {
      console.error("Error creating downtime event:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get production bottlenecks
  app.get("/api/production/bottlenecks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const bottlenecks = await storage.getProductionBottlenecks(user.companyId);
      res.json(bottlenecks);
    } catch (error: any) {
      console.error("Error fetching production bottlenecks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Detect and create bottlenecks from downtime analysis
  app.post("/api/production/bottlenecks/detect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const downtimeEvents = await storage.getDowntimeEvents(user.companyId);
      const productionRuns = await storage.getProductionRuns(user.companyId);
      
      const { detectBottlenecks } = await import("./lib/productionKPIs");
      const bottlenecks = detectBottlenecks(downtimeEvents, productionRuns);
      
      // Save detected bottlenecks
      const saved = [];
      for (const bottleneck of bottlenecks) {
        const existing = await storage.getProductionBottlenecks(user.companyId);
        const isDuplicate = existing.some(b => 
          b.machineryId === bottleneck.machineryId && b.status === "active"
        );
        
        if (!isDuplicate) {
          saved.push(await storage.createProductionBottleneck(bottleneck));
        }
      }
      
      res.json({ detected: bottlenecks.length, saved: saved.length, bottlenecks: saved });
    } catch (error: any) {
      console.error("Error detecting bottlenecks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // PREDICTIVE MAINTENANCE & IOT SENSORS
  // ========================================

  // Get all equipment sensors for company
  app.get("/api/predictive-maintenance/sensors", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const sensors = await storage.getEquipmentSensors(user.companyId);
      res.json(sensors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create equipment sensor
  app.post("/api/predictive-maintenance/sensors", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertEquipmentSensorSchema } = await import("@shared/schema");
      const sensorData = insertEquipmentSensorSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });

      const sensor = await storage.createEquipmentSensor(sensorData);
      res.status(201).json(sensor);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get sensor readings
  app.get("/api/predictive-maintenance/readings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { sensorId, limit } = req.query;
      if (!sensorId) {
        return res.status(400).json({ error: "sensorId is required" });
      }

      const readings = await storage.getSensorReadings(sensorId as string, limit ? parseInt(limit as string) : 100);
      res.json(readings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create sensor reading
  app.post("/api/predictive-maintenance/readings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertSensorReadingSchema } = await import("@shared/schema");
      const readingData = insertSensorReadingSchema.parse({
        ...req.body,
        timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
      });

      const reading = await storage.createSensorReading(readingData);
      res.status(201).json(reading);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get maintenance alerts
  app.get("/api/predictive-maintenance/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const alerts = await storage.getMaintenanceAlerts(user.companyId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create maintenance alert
  app.post("/api/predictive-maintenance/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      await economics.fetch();
      const { insertMaintenanceAlertSchema } = await import("@shared/schema");
      const alertData = insertMaintenanceAlertSchema.parse({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
        fdrAtAlert: economics.fdr,
      });

      const alert = await storage.createMaintenanceAlert(alertData);
      res.status(201).json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get maintenance predictions
  app.get("/api/predictive-maintenance/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const predictions = await storage.getMaintenancePredictions(user.companyId);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create maintenance prediction
  app.post("/api/predictive-maintenance/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertMaintenancePredictionSchema } = await import("@shared/schema");
      const predictionData = insertMaintenancePredictionSchema.parse({
        ...req.body,
        companyId: user.companyId,
        predictedDate: req.body.predictedDate ? new Date(req.body.predictedDate) : new Date(),
      });

      const prediction = await storage.createMaintenancePrediction(predictionData);
      res.status(201).json(prediction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Acknowledge maintenance alert
  app.patch("/api/predictive-maintenance/alerts/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const alert = await storage.updateMaintenanceAlert(req.params.id, {
        status: "acknowledged",
        acknowledgedAt: new Date(),
      });
      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Resolve maintenance alert
  app.patch("/api/predictive-maintenance/alerts/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const alert = await storage.updateMaintenanceAlert(req.params.id, {
        status: "resolved",
        resolvedAt: new Date(),
      });
      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // AI INVENTORY OPTIMIZATION
  // ========================================

  // Get inventory optimizations
  app.get("/api/inventory-optimization/analysis", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const optimizations = await storage.getInventoryOptimizations(user.companyId);
      res.json(optimizations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create inventory optimization
  app.post("/api/inventory-optimization/analysis", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      await economics.fetch();
      const { insertInventoryOptimizationSchema } = await import("@shared/schema");
      const optimizationData = insertInventoryOptimizationSchema.parse({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
        fdrAtAnalysis: economics.fdr,
      });

      const optimization = await storage.createInventoryOptimization(optimizationData);
      res.status(201).json(optimization);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get demand predictions
  app.get("/api/inventory-optimization/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const predictions = await storage.getDemandPredictions(user.companyId);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create demand prediction
  app.post("/api/inventory-optimization/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      await economics.fetch();
      const { insertDemandPredictionSchema } = await import("@shared/schema");
      const predictionData = insertDemandPredictionSchema.parse({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
        fdrAtForecast: economics.fdr,
      });

      const prediction = await storage.createDemandPrediction(predictionData);
      res.status(201).json(prediction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get inventory recommendations
  app.get("/api/inventory-optimization/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const recommendations = await storage.getInventoryRecommendations(user.companyId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create inventory recommendation
  app.post("/api/inventory-optimization/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      await economics.fetch();
      const { insertInventoryRecommendationSchema } = await import("@shared/schema");
      const recommendationData = insertInventoryRecommendationSchema.parse({
        ...req.body,
        companyId: user.companyId,
        economicRegime: economics.regime,
      });

      const recommendation = await storage.createInventoryRecommendation(recommendationData);
      res.status(201).json(recommendation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Accept inventory recommendation
  app.patch("/api/inventory-optimization/recommendations/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const recommendation = await storage.updateInventoryRecommendation(req.params.id, {
        status: "accepted",
        implementedAt: new Date(),
      });
      res.json(recommendation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reject inventory recommendation
  app.patch("/api/inventory-optimization/recommendations/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const recommendation = await storage.updateInventoryRecommendation(req.params.id, {
        status: "rejected",
      });
      res.json(recommendation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // SUPPLY CHAIN TRACEABILITY
  // ========================================

  // Get material batches
  app.get("/api/traceability/batches", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const batches = await storage.getMaterialBatches(user.companyId);
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create material batch
  app.post("/api/traceability/batches", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertMaterialBatchSchema } = await import("@shared/schema");
      const batchData = insertMaterialBatchSchema.parse({
        ...req.body,
        companyId: user.companyId,
        receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : new Date(),
        expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : null,
        inspectionDate: req.body.inspectionDate ? new Date(req.body.inspectionDate) : null,
      });

      const batch = await storage.createMaterialBatch(batchData);
      res.status(201).json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get traceability events
  app.get("/api/traceability/events", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { batchId } = req.query;
      const events = batchId
        ? await storage.getTraceabilityEventsByBatch(batchId as string)
        : await storage.getTraceabilityEvents(user.companyId);
      
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create traceability event
  app.post("/api/traceability/events", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertTraceabilityEventSchema } = await import("@shared/schema");
      const eventData = insertTraceabilityEventSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });

      const event = await storage.createTraceabilityEvent(eventData);
      res.status(201).json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get supplier chain links
  app.get("/api/traceability/chain-links", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const links = await storage.getSupplierChainLinks(user.companyId);
      res.json(links);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create supplier chain link
  app.post("/api/traceability/chain-links", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertSupplierChainLinkSchema } = await import("@shared/schema");
      const linkData = insertSupplierChainLinkSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });

      const link = await storage.createSupplierChainLink(linkData);
      res.status(201).json(link);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // WORKFORCE SCHEDULING
  // ========================================

  // Get employees
  app.get("/api/workforce/employees", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const employees = await storage.getEmployees(user.companyId);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create employee
  app.post("/api/workforce/employees", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertEmployeeSchema } = await import("@shared/schema");
      const employeeData = insertEmployeeSchema.parse({
        ...req.body,
        companyId: user.companyId,
        hireDate: req.body.hireDate ? new Date(req.body.hireDate) : null,
      });

      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get work shifts
  app.get("/api/workforce/shifts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const shifts = await storage.getWorkShifts(user.companyId);
      res.json(shifts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create work shift
  app.post("/api/workforce/shifts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      await economics.fetch();
      const { insertWorkShiftSchema } = await import("@shared/schema");
      const shiftData = insertWorkShiftSchema.parse({
        ...req.body,
        companyId: user.companyId,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        economicRegime: economics.regime,
        fdrAtScheduling: economics.fdr,
      });

      const shift = await storage.createWorkShift(shiftData);
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get skill requirements
  app.get("/api/workforce/skills", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const skills = await storage.getSkillRequirements(user.companyId);
      res.json(skills);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create skill requirement
  app.post("/api/workforce/skills", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertSkillRequirementSchema } = await import("@shared/schema");
      const skillData = insertSkillRequirementSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });

      const skill = await storage.createSkillRequirement(skillData);
      res.status(201).json(skill);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get staff assignments
  app.get("/api/workforce/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { shiftId } = req.query;
      const assignments = shiftId
        ? await storage.getStaffAssignmentsByShift(shiftId as string)
        : await storage.getStaffAssignments(user.companyId);
      
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create staff assignment
  app.post("/api/workforce/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { insertStaffAssignmentSchema } = await import("@shared/schema");
      const assignmentData = insertStaffAssignmentSchema.parse({
        ...req.body,
        checkInTime: req.body.checkInTime ? new Date(req.body.checkInTime) : null,
        checkOutTime: req.body.checkOutTime ? new Date(req.body.checkOutTime) : null,
      });

      const assignment = await storage.createStaffAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // COMPREHENSIVE EMPLOYEE MANAGEMENT
  // ========================================

  // Get employee payroll information
  app.get("/api/workforce/payroll", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const payroll = await storage.getEmployeePayroll(user.companyId);
      res.json(payroll);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get employee benefits
  app.get("/api/workforce/benefits", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const benefits = await storage.getEmployeeBenefits(user.companyId);
      res.json(benefits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get time off requests
  app.get("/api/workforce/time-off", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const timeOff = await storage.getEmployeeTimeOffRequests(user.companyId);
      res.json(timeOff);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get employee documents
  app.get("/api/workforce/documents", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const documents = await storage.getEmployeeDocuments(user.companyId);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get performance reviews
  app.get("/api/workforce/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const reviews = await storage.getEmployeePerformanceReviews(user.companyId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get emergency contacts
  app.get("/api/workforce/emergency-contacts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const contacts = await storage.getEmployeeEmergencyContacts(user.companyId);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create employee payroll record
  app.post("/api/workforce/payroll", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify employee belongs to user's company
      const employee = await storage.getEmployeeForCompany(req.body.employeeId, user.companyId);
      if (!employee) {
        return res.status(403).json({ error: "Employee not found in your company" });
      }

      const { insertEmployeePayrollSchema } = await import("@shared/schema");
      const payrollData = insertEmployeePayrollSchema.parse(req.body);
      const payroll = await storage.createEmployeePayroll(payrollData);
      res.status(201).json(payroll);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update employee payroll record
  app.patch("/api/workforce/payroll/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify the payroll record belongs to user's company
      const existingPayroll = await storage.getEmployeePayroll(user.companyId);
      if (!existingPayroll.find(p => p.id === req.params.id)) {
        return res.status(403).json({ error: "Payroll record not found in your company" });
      }

      const payroll = await storage.updateEmployeePayroll(req.params.id, req.body);
      if (!payroll) {
        return res.status(404).json({ error: "Payroll record not found" });
      }
      res.json(payroll);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create employee benefits record
  app.post("/api/workforce/benefits", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify employee belongs to user's company
      const employee = await storage.getEmployeeForCompany(req.body.employeeId, user.companyId);
      if (!employee) {
        return res.status(403).json({ error: "Employee not found in your company" });
      }

      const { insertEmployeeBenefitSchema } = await import("@shared/schema");
      const benefitsData = insertEmployeeBenefitSchema.parse(req.body);
      const benefits = await storage.createEmployeeBenefits(benefitsData);
      res.status(201).json(benefits);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update employee benefits record
  app.patch("/api/workforce/benefits/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify the benefits record belongs to user's company
      const existingBenefits = await storage.getEmployeeBenefits(user.companyId);
      if (!existingBenefits.find(b => b.id === req.params.id)) {
        return res.status(403).json({ error: "Benefits record not found in your company" });
      }

      const benefits = await storage.updateEmployeeBenefits(req.params.id, req.body);
      if (!benefits) {
        return res.status(404).json({ error: "Benefits record not found" });
      }
      res.json(benefits);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create time off request
  app.post("/api/workforce/time-off", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify employee belongs to user's company
      const employee = await storage.getEmployeeForCompany(req.body.employeeId, user.companyId);
      if (!employee) {
        return res.status(403).json({ error: "Employee not found in your company" });
      }

      const { insertEmployeeTimeOffSchema } = await import("@shared/schema");
      const timeOffData = insertEmployeeTimeOffSchema.parse({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      const timeOff = await storage.createEmployeeTimeOff(timeOffData);
      res.status(201).json(timeOff);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update time off request (for approvals)
  app.patch("/api/workforce/time-off/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify the time off request belongs to user's company
      const existingTimeOff = await storage.getEmployeeTimeOffRequests(user.companyId);
      if (!existingTimeOff.find(t => t.id === req.params.id)) {
        return res.status(403).json({ error: "Time off request not found in your company" });
      }

      const timeOff = await storage.updateEmployeeTimeOff(req.params.id, req.body);
      if (!timeOff) {
        return res.status(404).json({ error: "Time off request not found" });
      }
      res.json(timeOff);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create employee document
  app.post("/api/workforce/documents", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify employee belongs to user's company
      const employee = await storage.getEmployeeForCompany(req.body.employeeId, user.companyId);
      if (!employee) {
        return res.status(403).json({ error: "Employee not found in your company" });
      }

      const { insertEmployeeDocumentSchema } = await import("@shared/schema");
      const documentData = insertEmployeeDocumentSchema.parse({
        ...req.body,
        expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : null,
      });
      const document = await storage.createEmployeeDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create performance review
  app.post("/api/workforce/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify employee belongs to user's company
      const employee = await storage.getEmployeeForCompany(req.body.employeeId, user.companyId);
      if (!employee) {
        return res.status(403).json({ error: "Employee not found in your company" });
      }

      const { insertEmployeePerformanceReviewSchema } = await import("@shared/schema");
      const reviewData = insertEmployeePerformanceReviewSchema.parse({
        ...req.body,
        reviewDate: new Date(req.body.reviewDate),
        nextReviewDate: req.body.nextReviewDate ? new Date(req.body.nextReviewDate) : null,
      });
      const review = await storage.createEmployeePerformanceReview(reviewData);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update performance review
  app.patch("/api/workforce/reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify the review exists and belongs to user's company
      const existingReviews = await storage.getEmployeePerformanceReviews(user.companyId);
      if (!existingReviews.find(r => r.id === req.params.id)) {
        return res.status(403).json({ error: "Performance review not found in your company" });
      }

      const review = await storage.updateEmployeePerformanceReview(req.params.id, req.body);
      if (!review) {
        return res.status(404).json({ error: "Performance review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create emergency contact
  app.post("/api/workforce/emergency-contacts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify employee belongs to user's company
      const employee = await storage.getEmployeeForCompany(req.body.employeeId, user.companyId);
      if (!employee) {
        return res.status(403).json({ error: "Employee not found in your company" });
      }

      const { insertEmployeeEmergencyContactSchema } = await import("@shared/schema");
      const contactData = insertEmployeeEmergencyContactSchema.parse(req.body);
      const contact = await storage.createEmployeeEmergencyContact(contactData);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update emergency contact
  app.patch("/api/workforce/emergency-contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify the emergency contact belongs to user's company
      const existingContacts = await storage.getEmployeeEmergencyContacts(user.companyId);
      if (!existingContacts.find(c => c.id === req.params.id)) {
        return res.status(403).json({ error: "Emergency contact not found in your company" });
      }

      const contact = await storage.updateEmployeeEmergencyContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================
  // AUTOMATED PURCHASING & INVENTORY MANAGEMENT
  // ========================================

  // Get all purchase orders for company
  app.get("/api/purchase-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const orders = await storage.getPurchaseOrders(user.companyId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get purchase orders by status
  app.get("/api/purchase-orders/status/:status", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const orders = await storage.getPurchaseOrdersByStatus(user.companyId, req.params.status);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single purchase order
  app.get("/api/purchase-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const order = await storage.getPurchaseOrder(req.params.id, user.companyId);
      if (!order) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create purchase order
  app.post("/api/purchase-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify material belongs to company
      const material = await storage.getMaterial(req.body.materialId);
      if (!material || material.companyId !== user.companyId) {
        return res.status(403).json({ error: "Material not found in your company" });
      }

      // Verify supplier belongs to company
      const supplier = await storage.getSupplier(req.body.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(403).json({ error: "Supplier not found in your company" });
      }

      const { insertPurchaseOrderSchema } = await import("@shared/schema");
      const orderData = insertPurchaseOrderSchema.parse({ ...req.body, companyId: user.companyId });
      const order = await storage.createPurchaseOrder(orderData);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update purchase order (e.g., status changes from email integration)
  app.patch("/api/purchase-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify ownership via storage (which now enforces companyId)
      const existingOrder = await storage.getPurchaseOrder(req.params.id, user.companyId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Prevent companyId tampering
      if (req.body.companyId && req.body.companyId !== user.companyId) {
        return res.status(403).json({ error: "Cannot change company ownership" });
      }

      // Verify new material if changing
      if (req.body.materialId && req.body.materialId !== existingOrder.materialId) {
        const material = await storage.getMaterial(req.body.materialId);
        if (!material || material.companyId !== user.companyId) {
          return res.status(403).json({ error: "Material not found in your company" });
        }
      }

      // Verify new supplier if changing
      if (req.body.supplierId && req.body.supplierId !== existingOrder.supplierId) {
        const supplier = await storage.getSupplier(req.body.supplierId);
        if (!supplier || supplier.companyId !== user.companyId) {
          return res.status(403).json({ error: "Supplier not found in your company" });
        }
      }

      const order = await storage.updatePurchaseOrder(req.params.id, user.companyId, req.body);
      if (!order) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete purchase order
  app.delete("/api/purchase-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Storage now enforces company ownership
      await storage.deletePurchaseOrder(req.params.id, user.companyId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get material usage tracking
  app.get("/api/material-usage", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const usage = await storage.getMaterialUsageTracking(user.companyId);
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get material usage by material ID
  app.get("/api/material-usage/material/:materialId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Storage now filters by companyId
      const usage = await storage.getMaterialUsageByMaterial(req.params.materialId, user.companyId);
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get material usage by date range
  app.get("/api/material-usage/range", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const usage = await storage.getMaterialUsageByDateRange(
        user.companyId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create material usage record
  app.post("/api/material-usage", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify material belongs to company
      const material = await storage.getMaterial(req.body.materialId);
      if (!material || material.companyId !== user.companyId) {
        return res.status(403).json({ error: "Material not found in your company" });
      }

      // Verify SKU if provided
      if (req.body.skuId) {
        const sku = await storage.getSku(req.body.skuId);
        if (!sku || sku.companyId !== user.companyId) {
          return res.status(403).json({ error: "SKU not found in your company" });
        }
      }

      // Verify machinery if provided
      if (req.body.machineId) {
        const machine = await storage.getMachine(req.body.machineId);
        if (!machine || machine.companyId !== user.companyId) {
          return res.status(403).json({ error: "Machine not found in your company" });
        }
      }

      // Verify employee if provided
      if (req.body.operatorEmployeeId) {
        const employee = await storage.getEmployeeForCompany(req.body.operatorEmployeeId, user.companyId);
        if (!employee) {
          return res.status(403).json({ error: "Employee not found in your company" });
        }
      }

      const { insertMaterialUsageTrackingSchema } = await import("@shared/schema");
      const usageData = insertMaterialUsageTrackingSchema.parse({ ...req.body, companyId: user.companyId });
      const usage = await storage.createMaterialUsageTracking(usageData);
      res.status(201).json(usage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get procurement schedules
  app.get("/api/procurement-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const schedules = await storage.getProcurementSchedules(user.companyId);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active procurement schedules
  app.get("/api/procurement-schedules/active", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const schedules = await storage.getActiveProcurementSchedules(user.companyId);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create procurement schedule
  app.post("/api/procurement-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify material belongs to company
      const material = await storage.getMaterial(req.body.materialId);
      if (!material || material.companyId !== user.companyId) {
        return res.status(403).json({ error: "Material not found in your company" });
      }

      // Verify supplier belongs to company
      const supplier = await storage.getSupplier(req.body.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(403).json({ error: "Supplier not found in your company" });
      }

      const { insertProcurementScheduleSchema } = await import("@shared/schema");
      const scheduleData = insertProcurementScheduleSchema.parse({ ...req.body, companyId: user.companyId });
      const schedule = await storage.createProcurementSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update procurement schedule
  app.patch("/api/procurement-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify ownership via storage (which now enforces companyId)
      const existingSchedule = await storage.getProcurementSchedule(req.params.id, user.companyId);
      if (!existingSchedule) {
        return res.status(404).json({ error: "Procurement schedule not found" });
      }

      // Prevent companyId tampering
      if (req.body.companyId && req.body.companyId !== user.companyId) {
        return res.status(403).json({ error: "Cannot change company ownership" });
      }

      // Verify new material if changing
      if (req.body.materialId && req.body.materialId !== existingSchedule.materialId) {
        const material = await storage.getMaterial(req.body.materialId);
        if (!material || material.companyId !== user.companyId) {
          return res.status(403).json({ error: "Material not found in your company" });
        }
      }

      // Verify new supplier if changing
      if (req.body.supplierId && req.body.supplierId !== existingSchedule.supplierId) {
        const supplier = await storage.getSupplier(req.body.supplierId);
        if (!supplier || supplier.companyId !== user.companyId) {
          return res.status(403).json({ error: "Supplier not found in your company" });
        }
      }

      const schedule = await storage.updateProcurementSchedule(req.params.id, user.companyId, req.body);
      if (!schedule) {
        return res.status(404).json({ error: "Procurement schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete procurement schedule
  app.delete("/api/procurement-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Storage now enforces company ownership
      await storage.deleteProcurementSchedule(req.params.id, user.companyId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get auto purchase recommendations
  app.get("/api/auto-purchase-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const recommendations = await storage.getAutoPurchaseRecommendations(user.companyId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get auto purchase recommendations by status
  app.get("/api/auto-purchase-recommendations/status/:status", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      const recommendations = await storage.getAutoPurchaseRecommendationsByStatus(user.companyId, req.params.status);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create auto purchase recommendation
  app.post("/api/auto-purchase-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify material belongs to company
      const material = await storage.getMaterial(req.body.materialId);
      if (!material || material.companyId !== user.companyId) {
        return res.status(403).json({ error: "Material not found in your company" });
      }

      // Verify supplier belongs to company
      const supplier = await storage.getSupplier(req.body.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(403).json({ error: "Supplier not found in your company" });
      }

      const { insertAutoPurchaseRecommendationSchema } = await import("@shared/schema");
      const recommendationData = insertAutoPurchaseRecommendationSchema.parse({ ...req.body, companyId: user.companyId });
      const recommendation = await storage.createAutoPurchaseRecommendation(recommendationData);
      res.status(201).json(recommendation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update auto purchase recommendation (e.g., approve/reject/execute)
  app.patch("/api/auto-purchase-recommendations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Verify ownership via storage (which now enforces companyId)
      const existingRecommendation = await storage.getAutoPurchaseRecommendation(req.params.id, user.companyId);
      if (!existingRecommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      // Prevent companyId tampering
      if (req.body.companyId && req.body.companyId !== user.companyId) {
        return res.status(403).json({ error: "Cannot change company ownership" });
      }

      // Verify new material if changing
      if (req.body.materialId && req.body.materialId !== existingRecommendation.materialId) {
        const material = await storage.getMaterial(req.body.materialId);
        if (!material || material.companyId !== user.companyId) {
          return res.status(403).json({ error: "Material not found in your company" });
        }
      }

      // Verify new supplier if changing
      if (req.body.supplierId && req.body.supplierId !== existingRecommendation.supplierId) {
        const supplier = await storage.getSupplier(req.body.supplierId);
        if (!supplier || supplier.companyId !== user.companyId) {
          return res.status(403).json({ error: "Supplier not found in your company" });
        }
      }

      const recommendation = await storage.updateAutoPurchaseRecommendation(req.params.id, user.companyId, req.body);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }
      res.json(recommendation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete auto purchase recommendation
  app.delete("/api/auto-purchase-recommendations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      // Storage now enforces company ownership
      await storage.deleteAutoPurchaseRecommendation(req.params.id, user.companyId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // EXTERNAL API DATA GATHERING
  // ========================================

  // Fetch comprehensive economic data from external APIs
  app.get("/api/external/economic-data", isAuthenticated, async (req: any, res) => {
    try {
      const { fetchComprehensiveEconomicData } = await import("./lib/externalAPIs");
      const data = await fetchComprehensiveEconomicData();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching external economic data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // RESEARCH VALIDATION SYSTEM (NO UI)
  // Background historical backtesting for dual-circuit theory validation
  // ========================================

  // Get historical predictions (for analysis only - not user-facing)
  app.get("/api/research/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const predictions = await storage.getHistoricalPredictions(user.companyId);
      res.json(predictions);
    } catch (error: any) {
      console.error("[Research] Error fetching historical predictions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get historical predictions by date range
  app.get("/api/research/predictions/range", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate required" });
      }

      const predictions = await storage.getHistoricalPredictionsByDateRange(
        user.companyId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(predictions);
    } catch (error: any) {
      console.error("[Research] Error fetching predictions by range:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get prediction accuracy metrics
  app.get("/api/research/accuracy", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      const metrics = await storage.getLatestAccuracyMetrics(user.companyId);
      res.json(metrics || {
        mape: 0,
        directionalAccuracy: 0,
        regimeAccuracy: 0,
        sampleSize: 0,
        message: "No accuracy data available yet - backtesting in progress"
      });
    } catch (error: any) {
      console.error("[Research] Error fetching accuracy metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manually trigger historical backtesting (for testing purposes)
  app.post("/api/research/backtest/trigger", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      console.log("[Research] Manual backtest triggered for company:", user.companyId);
      
      // Import and run backtesting engine
      const { BacktestingEngine, HistoricalDataFetcher } = await import("./lib/dualCircuitResearch");
      
      // Fetch historical data
      const fetcher = new HistoricalDataFetcher();
      const historicalData = await fetcher.buildHistoricalDataset(2020, 2024);
      
      console.log(`[Research] Built dataset with ${historicalData.length} data points`);
      
      // Return status
      res.json({
        message: "Backtesting initiated",
        dataPoints: historicalData.length,
        status: "in_progress",
        note: "This is a background research validation system - results will populate over time"
      });
    } catch (error: any) {
      console.error("[Research] Error triggering backtest:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Comprehensive test - run detailed analysis with 10,000+ predictions and metrics breakdown
  app.get("/api/research/comprehensive-test", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }

      console.log("[Research] Running comprehensive test for company:", user.companyId);
      
      // Import comprehensive test module
      const { runComprehensiveTest, getDatabaseSummary } = await import("./lib/comprehensiveTest");
      
      // Run comprehensive analysis
      const results = await runComprehensiveTest(user.companyId);
      const dbSummary = await getDatabaseSummary(user.companyId);
      
      console.log(`[Research] Comprehensive test complete: ${results.totalPredictions} predictions analyzed`);
      
      res.json({
        ...results,
        databaseSummary: dbSummary,
      });
    } catch (error: any) {
      console.error("[Research] Failed to run comprehensive test:", error);
      res.status(500).json({ 
        message: "Failed to run comprehensive test",
        error: error.message
      });
    }
  });

  // ==================== ENTERPRISE FEATURES: SUPPLY CHAIN NETWORK INTELLIGENCE ====================
  
  // Feature Toggles - Enable/disable optional features
  app.get("/api/features", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const toggles = await storage.getFeatureToggles(user.companyId);
      res.json(toggles);
    } catch (error: any) {
      console.error("Error fetching feature toggles:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/features", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const parsed = insertFeatureToggleSchema.parse({
        ...req.body,
        companyId: user.companyId,
        enabledBy: user.id,
      });
      
      const toggle = await storage.createFeatureToggle(parsed);
      res.json(toggle);
    } catch (error: any) {
      console.error("Error creating feature toggle:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/features/:featureKey", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const { enabled } = req.body;
      const toggle = await storage.updateFeatureToggle(user.companyId, req.params.featureKey, enabled ? 1 : 0);
      res.json(toggle);
    } catch (error: any) {
      console.error("Error updating feature toggle:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Supplier Nodes - Extended supplier information with risk metrics
  app.get("/api/supply-chain/nodes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const { tier, criticality } = req.query;
      
      let nodes;
      if (tier) {
        nodes = await storage.getSupplierNodesByTier(user.companyId, parseInt(tier as string));
      } else if (criticality) {
        nodes = await storage.getSupplierNodesByCriticality(user.companyId, criticality as string);
      } else {
        nodes = await storage.getSupplierNodes(user.companyId);
      }
      
      res.json(nodes);
    } catch (error: any) {
      console.error("Error fetching supplier nodes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/supply-chain/nodes/critical", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const nodes = await storage.getCriticalSupplierNodes(user.companyId);
      res.json(nodes);
    } catch (error: any) {
      console.error("Error fetching critical supplier nodes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/supply-chain/nodes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const node = await storage.getSupplierNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: "Supplier node not found" });
      }
      res.json(node);
    } catch (error: any) {
      console.error("Error fetching supplier node:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/supply-chain/nodes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const parsed = insertSupplierNodeSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      
      const node = await storage.createSupplierNode(parsed);
      res.json(node);
    } catch (error: any) {
      console.error("Error creating supplier node:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/supply-chain/nodes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const node = await storage.updateSupplierNode(req.params.id, req.body);
      if (!node) {
        return res.status(404).json({ error: "Supplier node not found" });
      }
      res.json(node);
    } catch (error: any) {
      console.error("Error updating supplier node:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate risk score for a supplier node
  app.post("/api/supply-chain/nodes/:id/risk-score", isAuthenticated, async (req: any, res) => {
    try {
      const node = await storage.getSupplierNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: "Supplier node not found" });
      }

      const riskInputs: RiskScoreInputs = {
        financialHealthScore: node.financialHealthScore,
        bankruptcyRisk: node.bankruptcyRisk,
        onTimeDeliveryRate: node.onTimeDeliveryRate,
        qualityScore: node.qualityScore,
        capacityUtilization: node.capacityUtilization,
        currentFDR: node.currentFDR,
        tier: node.tier,
        criticality: node.criticality,
      };

      const assessment = calculateSupplierRiskScore(riskInputs);
      
      // Also get regime-aware actions
      const snapshot = await storage.getLatestEconomicSnapshot(node.companyId);
      let actions: string[] = [];
      if (snapshot) {
        actions = generateRegimeAwareActions(snapshot.regime, snapshot.fdr, assessment.riskLevel);
      }

      res.json({
        ...assessment,
        actions,
        node,
      });
    } catch (error: any) {
      console.error("Error calculating risk score:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Supplier Links - Network connections between suppliers
  app.get("/api/supply-chain/links", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const links = await storage.getSupplierLinks(user.companyId);
      res.json(links);
    } catch (error: any) {
      console.error("Error fetching supplier links:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/supply-chain/links/from/:nodeId", isAuthenticated, async (req: any, res) => {
    try {
      const links = await storage.getSupplierLinksFrom(req.params.nodeId);
      res.json(links);
    } catch (error: any) {
      console.error("Error fetching outbound links:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/supply-chain/links/to/:nodeId", isAuthenticated, async (req: any, res) => {
    try {
      const links = await storage.getSupplierLinksTo(req.params.nodeId);
      res.json(links);
    } catch (error: any) {
      console.error("Error fetching inbound links:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/supply-chain/links", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const parsed = insertSupplierLinkSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      
      const link = await storage.createSupplierLink(parsed);
      res.json(link);
    } catch (error: any) {
      console.error("Error creating supplier link:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Supplier Health Metrics - Time-series health data
  app.get("/api/supply-chain/health/:nodeId", isAuthenticated, async (req: any, res) => {
    try {
      const metrics = await storage.getSupplierHealthMetrics(req.params.nodeId);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching health metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/supply-chain/health/:nodeId/latest", isAuthenticated, async (req: any, res) => {
    try {
      const metric = await storage.getLatestSupplierHealthMetric(req.params.nodeId);
      if (!metric) {
        return res.status(404).json({ error: "No health metrics found" });
      }
      res.json(metric);
    } catch (error: any) {
      console.error("Error fetching latest health metric:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/supply-chain/health", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertSupplierHealthMetricsSchema.parse(req.body);
      const metric = await storage.createSupplierHealthMetric(parsed);
      res.json(metric);
    } catch (error: any) {
      console.error("Error creating health metric:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Supplier Risk Alerts - Cascading risk warnings
  app.get("/api/supply-chain/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const { active, severity, nodeId } = req.query;
      
      let alerts;
      if (active === 'true') {
        alerts = await storage.getActiveSupplierRiskAlerts(user.companyId);
      } else if (severity) {
        alerts = await storage.getSupplierRiskAlertsBySeverity(user.companyId, severity as string);
      } else if (nodeId) {
        alerts = await storage.getSupplierRiskAlertsByNode(nodeId as string);
      } else {
        alerts = await storage.getSupplierRiskAlerts(user.companyId);
      }
      
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching risk alerts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/supply-chain/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company" });
      }

      const parsed = insertSupplierRiskAlertSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      
      const alert = await storage.createSupplierRiskAlert(parsed);
      res.json(alert);
    } catch (error: any) {
      console.error("Error creating risk alert:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/supply-chain/alerts/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      const alert = await storage.acknowledgeSupplierRiskAlert(req.params.id, user.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error: any) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/supply-chain/alerts/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      const alert = await storage.resolveSupplierRiskAlert(req.params.id, user.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error: any) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Advanced: Cascading impact analysis for a supplier node
  app.post("/api/supply-chain/nodes/:id/impact-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const node = await storage.getSupplierNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: "Supplier node not found" });
      }

      // Get downstream links
      const downstreamLinks = await storage.getSupplierLinksFrom(node.id);
      
      // Get affected materials and SKUs (simplified - would need more complex logic in production)
      const affectedMaterialIds = downstreamLinks
        .map(link => link.materialId)
        .filter((id): id is string => id !== null);
      
      const affectedSkuIds: string[] = []; // Would need to traverse BOM to find affected SKUs
      
      const analysis = analyzeCascadingImpact(
        node,
        downstreamLinks.length,
        affectedMaterialIds,
        affectedSkuIds,
        1000 // Average material cost placeholder
      );

      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing cascading impact:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Advanced: Alternative supplier recommendations
  app.post("/api/supply-chain/nodes/:id/alternatives", isAuthenticated, async (req: any, res) => {
    try {
      const node = await storage.getSupplierNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: "Supplier node not found" });
      }

      // Get all supplier nodes for this company
      const allNodes = await storage.getSupplierNodes(node.companyId);
      
      // Filter out the failing node
      const alternatives = allNodes.filter(n => n.id !== node.id);
      
      // Score alternatives
      const scoredAlternatives = scoreAlternativeSuppliers(node, alternatives);

      res.json(scoredAlternatives);
    } catch (error: any) {
      console.error("Error finding alternative suppliers:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // AUTOMATED PO EXECUTION ROUTES
  // ============================================================

  const poEngine = new POExecutionEngine(storage);

  // PO Rules CRUD
  app.get("/api/po-rules", isAuthenticated, async (req: any, res) => {
    try {
      const rules = await storage.getPoRules(req.user.companyId);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/po-rules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.getPoRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "PO rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/po-rules", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPoRuleSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
      });
      const rule = await storage.createPoRule(validatedData);
      res.status(201).json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/po-rules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.updatePoRule(req.params.id, req.body);
      if (!rule) {
        return res.status(404).json({ error: "PO rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/po-rules/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deletePoRule(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Evaluate PO rules for a material/context
  app.post("/api/po-rules/evaluate", isAuthenticated, async (req: any, res) => {
    try {
      const context: POGenerationContext = req.body;
      const recommendations = await poEngine.evaluateRules(context, req.user.companyId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Workflow Steps
  app.get("/api/po-workflows", isAuthenticated, async (req: any, res) => {
    try {
      const steps = await storage.getPoWorkflowSteps(req.user.companyId);
      res.json(steps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchase-orders/:id/workflow", isAuthenticated, async (req: any, res) => {
    try {
      const steps = await storage.getPoWorkflowStepsByPO(req.params.id);
      res.json(steps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/po-workflows", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPoWorkflowStepSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
      });
      const step = await storage.createPoWorkflowStep(validatedData);
      res.status(201).json(step);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Generate approval workflow for a PO
  app.post("/api/purchase-orders/workflow/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { poValue, materialId, supplierId } = req.body;
      const workflow = await poEngine.generateApprovalWorkflow(
        poValue,
        materialId,
        supplierId,
        req.user.companyId
      );
      res.json(workflow);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PO Approvals
  app.get("/api/purchase-orders/:id/approvals", isAuthenticated, async (req: any, res) => {
    try {
      const approvals = await storage.getPoApprovals(req.params.id);
      res.json(approvals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/approvals/my-approvals", isAuthenticated, async (req: any, res) => {
    try {
      const approvals = await storage.getPoApprovalsByApprover(req.user.id);
      res.json(approvals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/po-approvals", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPoApprovalSchema.parse({
        ...req.body,
        approverId: req.user.id,
      });
      const approval = await storage.createPoApproval(validatedData);
      res.status(201).json(approval);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Negotiation Playbooks CRUD
  app.get("/api/negotiation-playbooks", isAuthenticated, async (req: any, res) => {
    try {
      const playbooks = await storage.getNegotiationPlaybooks(req.user.companyId);
      res.json(playbooks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/negotiation-playbooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const playbook = await storage.getNegotiationPlaybook(req.params.id);
      if (!playbook) {
        return res.status(404).json({ error: "Playbook not found" });
      }
      res.json(playbook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/negotiation-playbooks/regime/:regime", isAuthenticated, async (req: any, res) => {
    try {
      const playbooks = await storage.getNegotiationPlaybooksByRegime(
        req.user.companyId,
        req.params.regime
      );
      res.json(playbooks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/negotiation-playbooks", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertNegotiationPlaybookSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
      });
      const playbook = await storage.createNegotiationPlaybook(validatedData);
      res.status(201).json(playbook);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/negotiation-playbooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const playbook = await storage.updateNegotiationPlaybook(req.params.id, req.body);
      if (!playbook) {
        return res.status(404).json({ error: "Playbook not found" });
      }
      res.json(playbook);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get recommended playbook based on FDR/regime
  app.post("/api/negotiation-playbooks/recommend", isAuthenticated, async (req: any, res) => {
    try {
      const { fdr, regime } = req.body;
      const playbook = await poEngine.getRecommendedPlaybook(fdr, regime, req.user.companyId);
      res.json(playbook);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ERP Connections CRUD
  app.get("/api/erp-connections", isAuthenticated, async (req: any, res) => {
    try {
      const connections = await storage.getErpConnections(req.user.companyId);
      res.json(connections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/erp-connections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const connection = await storage.getErpConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "ERP connection not found" });
      }
      res.json(connection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/erp-connections", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertErpConnectionSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
      });
      const connection = await storage.createErpConnection(validatedData);
      res.status(201).json(connection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/erp-connections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const connection = await storage.updateErpConnection(req.params.id, req.body);
      if (!connection) {
        return res.status(404).json({ error: "ERP connection not found" });
      }
      res.json(connection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/erp-connections/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteErpConnection(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ERP integration status
  app.get("/api/erp/status", isAuthenticated, async (req: any, res) => {
    try {
      const status = await poEngine.getERPStatus(req.user.companyId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // INDUSTRY DATA CONSORTIUM ROUTES
  // ============================================================

  const consortiumEngine = new IndustryConsortiumEngine(storage);

  // Consortium contributions
  app.get("/api/consortium/contributions", isAuthenticated, async (req: any, res) => {
    try {
      const { industrySector, region, regime } = req.query;
      const contributions = await storage.getConsortiumContributions({ industrySector, region, regime });
      res.json(contributions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/consortium/contributions", isAuthenticated, async (req: any, res) => {
    try {
      // Anonymize company ID
      const anonymousId = consortiumEngine.anonymizeCompanyData(req.user.companyId, req.body);
      
      const validatedData = insertConsortiumContributionSchema.parse({
        ...req.body,
        anonymousId,
      });
      
      const contribution = await storage.createConsortiumContribution(validatedData);
      res.status(201).json(contribution);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Consortium metrics (benchmarks)
  app.get("/api/consortium/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const { regime, industrySector } = req.query;
      if (!regime) {
        return res.status(400).json({ error: "regime parameter is required" });
      }
      const metrics = await storage.getConsortiumMetrics(regime as string, { industrySector: industrySector as string });
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate benchmarks for current company
  app.post("/api/consortium/benchmarks", isAuthenticated, async (req: any, res) => {
    try {
      const { oee, procurementSavings, turnover, regime, industrySector } = req.body;
      const benchmarks = await consortiumEngine.calculateBenchmarks(
        { oee, procurementSavings, turnover },
        regime,
        industrySector
      );
      res.json(benchmarks);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Consortium alerts
  app.get("/api/consortium/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const { severity } = req.query;
      const alerts = await storage.getConsortiumAlerts(severity as string);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Early warning detection
  app.post("/api/consortium/early-warnings", isAuthenticated, async (req: any, res) => {
    try {
      const { regime, industrySector } = req.body;
      const warnings = await consortiumEngine.detectEarlyWarnings(regime, industrySector);
      res.json(warnings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // M&A INTELLIGENCE ROUTES
  // ============================================================

  const maEngine = new MAIntelligenceEngine(storage);

  // M&A targets
  app.get("/api/ma/targets", isAuthenticated, async (req: any, res) => {
    try {
      const targets = await storage.getMaTargets(req.user.companyId);
      res.json(targets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ma/targets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const target = await storage.getMaTarget(req.params.id);
      if (!target || target.companyId !== req.user.companyId) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ma/targets", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMaTargetSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
      });
      
      const target = await storage.createMaTarget(validatedData);
      res.status(201).json(target);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/ma/targets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getMaTarget(req.params.id);
      if (!existing || existing.companyId !== req.user.companyId) {
        return res.status(404).json({ error: "Target not found" });
      }

      const target = await storage.updateMaTarget(req.params.id, req.body);
      res.json(target);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // M&A recommendations
  app.get("/api/ma/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const recommendations = await storage.getMaRecommendations(req.user.companyId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate M&A scoring
  app.post("/api/ma/score", isAuthenticated, async (req: any, res) => {
    try {
      const { targetType, estimatedValue, strategicFitScore, currentFDR, currentRegime } = req.body;
      const scoring = maEngine.generateRecommendation(
        { targetType, estimatedValue, strategicFitScore },
        currentFDR,
        currentRegime
      );
      res.json(scoring);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // SCENARIO PLANNING (OPTIONAL FEATURE)
  // ============================================================

  const scenarioEngine = new ScenarioPlanningEngine(storage);

  // Run scenario simulation
  app.post("/api/scenarios/simulate", isAuthenticated, async (req: any, res) => {
    try {
      const input: ScenarioInput = {
        scenarioName: req.body.scenarioName || 'Unnamed Scenario',
        description: req.body.description,
        fdrDelta: parseFloat(req.body.fdrDelta) || 0,
        newRegime: req.body.newRegime,
        commodityPriceChange: parseFloat(req.body.commodityPriceChange) || 0,
        affectedCommodities: req.body.affectedCommodities,
        demandChange: parseFloat(req.body.demandChange) || 0,
        affectedSKUs: req.body.affectedSKUs,
        durationMonths: parseInt(req.body.durationMonths) || 12,
      };

      const currentContext = {
        currentFDR: parseFloat(req.body.currentFDR) || 1.0,
        currentRegime: req.body.currentRegime || 'Healthy Expansion',
        baseRevenue: parseFloat(req.body.baseRevenue) || 10000000,
        baseCosts: parseFloat(req.body.baseCosts) || 7000000,
        baseMargin: parseFloat(req.body.baseMargin) || 30,
      };

      const result = await scenarioEngine.runScenario(input, currentContext);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Compare multiple scenarios
  app.post("/api/scenarios/compare", isAuthenticated, async (req: any, res) => {
    try {
      const { scenarios } = req.body;
      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        return res.status(400).json({ error: "scenarios array is required" });
      }

      const comparison = await scenarioEngine.compareScenarios(scenarios);
      res.json(comparison);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // GEOPOLITICAL RISK (OPTIONAL FEATURE)
  // ============================================================

  const geoRiskEngine = new GeopoliticalRiskEngine(storage);

  // Assess geopolitical risk
  app.post("/api/geopolitical/assess", isAuthenticated, async (req: any, res) => {
    try {
      const event: GeopoliticalEvent = {
        eventType: req.body.eventType,
        region: req.body.region,
        severity: req.body.severity || 'medium',
        description: req.body.description || '',
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        commoditiesAffected: req.body.commoditiesAffected || [],
        suppliersAffected: req.body.suppliersAffected || [],
      };

      const currentFDR = parseFloat(req.body.currentFDR) || 1.0;
      const assessment = await geoRiskEngine.assessRisk(event, currentFDR);
      
      res.json(assessment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Analyze regional FDR divergence
  app.post("/api/geopolitical/regional-fdr", isAuthenticated, async (req: any, res) => {
    try {
      const { regions, globalFDR } = req.body;
      const analysis = geoRiskEngine.analyzeRegionalFDR(regions || [], globalFDR || 1.0);
      res.json(analysis);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk scenario generation endpoints for stress testing
  app.post('/api/scenarios/bulk-test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "No company associated with user" });
      }

      const count = 1000;
      const results = {
        totalScenarios: count,
        regimeDistribution: {} as Record<string, number>,
        avgConfidence: 0,
        riskLevels: { low: 0, medium: 0, high: 0 },
        avgFinancialImpact: 0,
        scenarios: [] as any[]
      };

      const scenarioEngine = new ScenarioPlanningEngine(storage);
      const eventTypes = ['Supply Chain Disruption', 'Demand Shock', 'Cost Inflation', 'Market Expansion', 'Tech Innovation'];
      
      for (let i = 0; i < count; i++) {
        const fdrDelta = (Math.random() - 0.5) * 0.8;
        const commodityChange = (Math.random() - 0.3) * 100;
        const demandChange = (Math.random() - 0.4) * 80;
        const duration = Math.floor(Math.random() * 24) + 1;
        
        const input: ScenarioInput = {
          scenarioName: `${eventTypes[i % eventTypes.length]} #${i + 1}`,
          fdrDelta,
          commodityPriceChange: commodityChange,
          demandChange,
          durationMonths: duration,
        };

        const currentContext = {
          currentFDR: 1.0,
          currentRegime: 'Healthy Expansion',
          baseRevenue: 10000000,
          baseCosts: 7000000,
          baseMargin: 30,
        };

        const result = await scenarioEngine.runScenario(input, currentContext);
        
        results.regimeDistribution[result.newRegime] = 
          (results.regimeDistribution[result.newRegime] || 0) + 1;
        results.avgConfidence += result.confidence;
        
        const impact = Math.abs(result.revenueImpact);
        if (impact < 1000000) results.riskLevels.low++;
        else if (impact < 3000000) results.riskLevels.medium++;
        else results.riskLevels.high++;
        
        results.avgFinancialImpact += result.revenueImpact;
        
        if (i < 10) results.scenarios.push(result);
      }

      results.avgConfidence = Math.round(results.avgConfidence / count);
      results.avgFinancialImpact = Math.round(results.avgFinancialImpact / count);

      res.json(results);
    } catch (error: any) {
      console.error('Bulk scenario test error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/geopolitical/bulk-test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(403).json({ error: "No company associated with user" });
      }

      const count = 1000;
      const results = {
        totalAssessments: count,
        eventTypeDistribution: {} as Record<string, number>,
        severityDistribution: { low: 0, medium: 0, high: 0 },
        avgRiskScore: 0,
        avgConfidence: 0,
        assessments: [] as any[]
      };

      const geoEngine = new GeopoliticalRiskEngine(storage);
      const eventTypes: Array<'trade_war' | 'sanctions' | 'currency_crisis' | 'political_instability'> = ['trade_war', 'sanctions', 'currency_crisis', 'political_instability'];
      const regions = ['Asia Pacific', 'Europe', 'North America', 'Middle East', 'Latin America', 'Africa'];
      const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      for (let i = 0; i < count; i++) {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        
        const event: GeopoliticalEvent = {
          eventType,
          region,
          severity,
          description: `${eventType} scenario in ${region} with ${severity} severity`,
          commoditiesAffected: [],
          suppliersAffected: [],
          startDate: new Date()
        };

        const currentFDR = 1.0 + (Math.random() - 0.5) * 0.4;
        const assessment = await geoEngine.assessRisk(event, currentFDR);
        
        results.eventTypeDistribution[eventType] = (results.eventTypeDistribution[eventType] || 0) + 1;
        results.severityDistribution[severity] = (results.severityDistribution[severity] || 0) + 1;
        results.avgRiskScore += assessment.exposureScore;
        results.avgConfidence += assessment.confidence;
        
        if (i < 10) results.assessments.push(assessment);
      }

      results.avgRiskScore = Math.round(results.avgRiskScore / count);
      results.avgConfidence = Math.round(results.avgConfidence / count);

      res.json(results);
    } catch (error: any) {
      console.error('Bulk geopolitical test error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // HISTORICAL BACKTESTING (Research Validation)
  // ============================================================

  const { HistoricalBacktestingEngine } = await import("./lib/historicalBacktesting");
  const backtestEngine = new HistoricalBacktestingEngine(storage);

  // Run historical backtest
  app.post("/api/backtest/run", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Create user if doesn't exist (edge case for test environments)
      if (!user) {
        const claims = req.user.claims;
        user = await storage.upsertUser({
          id: userId,
          email: claims.email || `${userId}@example.com`,
          firstName: claims.first_name || 'Test',
          lastName: claims.last_name || 'User',
        });
      }
      
      // Auto-create company if user doesn't have one
      if (!user.companyId) {
        const company = await storage.createCompany({
          name: `${user.firstName || 'User'}'s Company`,
        });
        
        user = await storage.upsertUser({
          ...user,
          companyId: company.id,
        });
      }

      const { startYear, endYear, horizonMonths } = req.body;
      
      console.log('[Backtest] Starting historical validation with real data integration...');
      
      const results = await backtestEngine.runBacktest(
        user.companyId!,
        parseInt(startYear as string) || 2015,
        parseInt(endYear as string) || 2023,
        parseInt(horizonMonths as string) || 6
      );

      // Store results
      await backtestEngine.storeBacktestResults(user.companyId!, results);
      
      console.log('[Backtest] Completed! Results:', {
        totalPredictions: results.totalPredictions,
        mape: results.meanAbsolutePercentageError,
        directionalAccuracy: results.correctDirectionPct,
        regimeAccuracy: results.correctRegimePct
      });

      res.json(results);
    } catch (error: any) {
      console.error('Backtest error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get stored backtest results
  app.get("/api/backtest/results", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Create user if doesn't exist
      if (!user) {
        const claims = req.user.claims;
        user = await storage.upsertUser({
          id: userId,
          email: claims.email || `${userId}@example.com`,
          firstName: claims.first_name || 'Test',
          lastName: claims.last_name || 'User',
        });
      }
      
      // Auto-create company if user doesn't have one
      if (!user.companyId) {
        const company = await storage.createCompany({
          name: `${user.firstName || 'User'}'s Company`,
        });
        
        user = await storage.upsertUser({
          ...user,
          companyId: company.id,
        });
      }

      const results = await storage.getPredictionAccuracyMetrics(user.companyId!);
      res.json(results);
    } catch (error: any) {
      console.error('Get backtest results error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Saved Scenarios & Bookmarks =====
  
  // Get all saved scenarios for company
  app.get("/api/saved-scenarios", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const scenarios = await storage.getSavedScenarios(user.companyId);
      res.json(scenarios);
    } catch (error: any) {
      console.error("Error fetching saved scenarios:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific saved scenario
  app.get("/api/saved-scenarios/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const scenario = await storage.getSavedScenario(req.params.id);
      if (!scenario) {
        return res.status(404).json({ error: "Saved scenario not found" });
      }
      
      if (scenario.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(scenario);
    } catch (error: any) {
      console.error("Error fetching saved scenario:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new saved scenario
  app.post("/api/saved-scenarios", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const { insertSavedScenarioSchema } = await import("@shared/schema");
      const scenarioData = insertSavedScenarioSchema.parse({
        ...req.body,
        companyId: user.companyId,
        userId: user.id,
      });
      
      const scenario = await storage.createSavedScenario(scenarioData);
      res.status(201).json(scenario);
    } catch (error: any) {
      console.error("Error creating saved scenario:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update saved scenario
  app.put("/api/saved-scenarios/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const existingScenario = await storage.getSavedScenario(req.params.id);
      if (!existingScenario) {
        return res.status(404).json({ error: "Saved scenario not found" });
      }
      
      if (existingScenario.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const updated = await storage.updateSavedScenario(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating saved scenario:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete saved scenario
  app.delete("/api/saved-scenarios/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const existingScenario = await storage.getSavedScenario(req.params.id);
      if (!existingScenario) {
        return res.status(404).json({ error: "Saved scenario not found" });
      }
      
      if (existingScenario.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteSavedScenario(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting saved scenario:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all scenario bookmarks for company
  app.get("/api/scenario-bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const bookmarks = await storage.getScenarioBookmarks(user.companyId);
      res.json(bookmarks);
    } catch (error: any) {
      console.error("Error fetching scenario bookmarks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific scenario bookmark
  app.get("/api/scenario-bookmarks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const bookmark = await storage.getScenarioBookmark(req.params.id);
      if (!bookmark) {
        return res.status(404).json({ error: "Scenario bookmark not found" });
      }
      
      if (bookmark.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(bookmark);
    } catch (error: any) {
      console.error("Error fetching scenario bookmark:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new scenario bookmark
  app.post("/api/scenario-bookmarks", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const { insertScenarioBookmarkSchema } = await import("@shared/schema");
      const bookmarkData = insertScenarioBookmarkSchema.parse({
        ...req.body,
        companyId: user.companyId,
        userId: user.id,
      });
      
      const bookmark = await storage.createScenarioBookmark(bookmarkData);
      res.status(201).json(bookmark);
    } catch (error: any) {
      console.error("Error creating scenario bookmark:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update scenario bookmark
  app.put("/api/scenario-bookmarks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const existingBookmark = await storage.getScenarioBookmark(req.params.id);
      if (!existingBookmark) {
        return res.status(404).json({ error: "Scenario bookmark not found" });
      }
      
      if (existingBookmark.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const updated = await storage.updateScenarioBookmark(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating scenario bookmark:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete scenario bookmark
  app.delete("/api/scenario-bookmarks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const existingBookmark = await storage.getScenarioBookmark(req.params.id);
      if (!existingBookmark) {
        return res.status(404).json({ error: "Scenario bookmark not found" });
      }
      
      if (existingBookmark.companyId !== user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteScenarioBookmark(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting scenario bookmark:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== S&OP Workspace =====
  
  // S&OP Scenarios
  app.get("/api/sop/scenarios", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const scenarios = await storage.getSopScenarios(user.companyId);
      res.json(scenarios);
    } catch (error: any) {
      console.error("Error fetching S&OP scenarios:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sop/scenarios/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const scenario = await storage.getSopScenario(req.params.id);
      if (!scenario) return res.status(404).json({ error: "S&OP scenario not found" });
      if (scenario.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      res.json(scenario);
    } catch (error: any) {
      console.error("Error fetching S&OP scenario:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sop/scenarios", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const { insertSopScenarioSchema } = await import("@shared/schema");
      const scenarioData = insertSopScenarioSchema.parse({ ...req.body, companyId: user.companyId, createdBy: user.id });
      
      const scenario = await storage.createSopScenario(scenarioData);
      res.status(201).json(scenario);
    } catch (error: any) {
      console.error("Error creating S&OP scenario:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/sop/scenarios/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopScenario(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP scenario not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const updated = await storage.updateSopScenario(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating S&OP scenario:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sop/scenarios/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopScenario(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP scenario not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const approved = await storage.approveSopScenario(req.params.id, user.id);
      res.json(approved);
    } catch (error: any) {
      console.error("Error approving S&OP scenario:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sop/scenarios/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopScenario(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP scenario not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      await storage.deleteSopScenario(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting S&OP scenario:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // S&OP Gap Analysis
  app.get("/api/sop/gap-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const { scenarioId } = req.query;
      const gaps = scenarioId ? await storage.getSopGapAnalysesByScenario(scenarioId as string) : await storage.getSopGapAnalyses(user.companyId);
      res.json(gaps);
    } catch (error: any) {
      console.error("Error fetching S&OP gap analyses:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sop/gap-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const { insertSopGapAnalysisSchema } = await import("@shared/schema");
      const gapData = insertSopGapAnalysisSchema.parse({ ...req.body, companyId: user.companyId });
      
      const gap = await storage.createSopGapAnalysis(gapData);
      res.status(201).json(gap);
    } catch (error: any) {
      console.error("Error creating S&OP gap analysis:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // S&OP Meeting Notes (Legacy - renamed to avoid conflict with new S&OP workflow meetings)
  app.get("/api/sop/meeting-notes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const meetings = await storage.getSopMeetingNotes(user.companyId);
      res.json(meetings);
    } catch (error: any) {
      console.error("Error fetching S&OP meeting notes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sop/meeting-notes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const { insertSopMeetingNotesSchema } = await import("@shared/schema");
      const meetingData = insertSopMeetingNotesSchema.parse({ ...req.body, companyId: user.companyId, facilitator: user.id });
      
      const meeting = await storage.createSopMeetingNote(meetingData);
      res.status(201).json(meeting);
    } catch (error: any) {
      console.error("Error creating S&OP meeting note:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/sop/meeting-notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopMeetingNote(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP meeting note not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const updated = await storage.updateSopMeetingNote(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating S&OP meeting note:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // S&OP Action Items
  app.get("/api/sop/action-items", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const { meetingId, assignedTo } = req.query;
      let actionItems;
      if (meetingId) actionItems = await storage.getSopActionItemsByMeeting(meetingId as string);
      else if (assignedTo) actionItems = await storage.getSopActionItemsByAssignee(assignedTo as string);
      else actionItems = await storage.getSopActionItems(user.companyId);
      
      res.json(actionItems);
    } catch (error: any) {
      console.error("Error fetching S&OP action items:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sop/action-items", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const { insertSopActionItemSchema } = await import("@shared/schema");
      const actionData = insertSopActionItemSchema.parse({ ...req.body, companyId: user.companyId });
      
      const actionItem = await storage.createSopActionItem(actionData);
      res.status(201).json(actionItem);
    } catch (error: any) {
      console.error("Error creating S&OP action item:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/sop/action-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopActionItem(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP action item not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const updated = await storage.updateSopActionItem(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating S&OP action item:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sop/action-items/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopActionItem(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP action item not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const completed = await storage.completeSopActionItem(req.params.id);
      res.json(completed);
    } catch (error: any) {
      console.error("Error completing S&OP action item:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sop/action-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) return res.status(400).json({ error: "User has no company association" });
      
      const existing = await storage.getSopActionItem(req.params.id);
      if (!existing) return res.status(404).json({ error: "S&OP action item not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      await storage.deleteSopActionItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting S&OP action item:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Smart Alerts & Monitoring =====

  // Get all FDR alerts for company
  app.get("/api/fdr-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const alerts = await storage.getFdrAlerts(user.companyId);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching FDR alerts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new FDR alert
  app.post("/api/fdr-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const { insertFdrAlertSchema } = await import("@shared/schema");
      const alertData = insertFdrAlertSchema.parse({
        ...req.body,
        companyId: user.companyId,
        userId: user.id,
      });
      
      const alert = await storage.createFdrAlert(alertData);
      res.status(201).json(alert);
    } catch (error: any) {
      console.error("Error creating FDR alert:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update FDR alert
  app.put("/api/fdr-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const updated = await storage.updateFdrAlert(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "FDR alert not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating FDR alert:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete FDR alert
  app.delete("/api/fdr-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      await storage.deleteFdrAlert(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting FDR alert:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all commodity price alerts for company
  app.get("/api/commodity-price-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const alerts = await storage.getCommodityPriceAlerts(user.companyId);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching commodity price alerts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new commodity price alert
  app.post("/api/commodity-price-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const { insertCommodityPriceAlertSchema } = await import("@shared/schema");
      const alertData = insertCommodityPriceAlertSchema.parse({
        ...req.body,
        companyId: user.companyId,
        userId: user.id,
      });
      
      const alert = await storage.createCommodityPriceAlert(alertData);
      res.status(201).json(alert);
    } catch (error: any) {
      console.error("Error creating commodity price alert:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update commodity price alert
  app.put("/api/commodity-price-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const updated = await storage.updateCommodityPriceAlert(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Commodity price alert not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating commodity price alert:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete commodity price alert
  app.delete("/api/commodity-price-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      await storage.deleteCommodityPriceAlert(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting commodity price alert:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get alert triggers (recent + unacknowledged)
  app.get("/api/alert-triggers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const triggers = await storage.getAlertTriggers(user.companyId);
      res.json(triggers);
    } catch (error: any) {
      console.error("Error fetching alert triggers:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Acknowledge alert trigger
  app.post("/api/alert-triggers/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const updated = await storage.acknowledgeAlertTrigger(req.params.id, user.id);
      if (!updated) {
        return res.status(404).json({ error: "Alert trigger not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error acknowledging alert trigger:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get regime change notifications
  app.get("/api/regime-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const notifications = await storage.getRegimeNotifications(user.companyId);
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching regime notifications:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Acknowledge regime change notification
  app.post("/api/regime-notifications/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.companyId) {
        return res.status(400).json({ error: "User has no company association" });
      }
      
      const updated = await storage.acknowledgeRegimeNotification(req.params.id, user.id);
      if (!updated) {
        return res.status(404).json({ error: "Regime notification not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error acknowledging regime notification:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Company settings endpoints
  app.get("/api/company/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Auto-create company if user doesn't have one
      if (!user.companyId) {
        const company = await storage.createCompany({
          name: `${user.firstName || 'User'}'s Company`,
        });
        
        user = await storage.upsertUser({
          ...user,
          companyId: company.id,
        });
      }

      const company = await storage.getCompany(user.companyId!);
      res.json(company);
    } catch (error: any) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  // Company Locations
  app.get("/api/company/locations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.companyId) return res.status(400).json({ error: "User has no company" });
      const locations = await storage.getCompanyLocations(user.companyId);
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/company/locations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.companyId) return res.status(400).json({ error: "User has no company" });
      const { insertCompanyLocationSchema } = await import("@shared/schema");
      const locationData = insertCompanyLocationSchema.parse({ ...req.body, companyId: user.companyId });
      const location = await storage.createCompanyLocation(locationData);
      res.status(201).json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/company/locations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.companyId) return res.status(400).json({ error: "User has no company" });
      const location = await storage.getCompanyLocation(req.params.id);
      if (!location || location.companyId !== user.companyId) return res.status(404).json({ error: "Location not found" });
      const updated = await storage.updateCompanyLocation(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/company/locations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.companyId) return res.status(400).json({ error: "User has no company" });
      const location = await storage.getCompanyLocation(req.params.id);
      if (!location || location.companyId !== user.companyId) return res.status(404).json({ error: "Location not found" });
      await storage.deleteCompanyLocation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/company/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Auto-create company if user doesn't have one
      if (!user.companyId) {
        const company = await storage.createCompany({
          name: `${user.firstName || 'User'}'s Company`,
        });
        
        user = await storage.upsertUser({
          ...user,
          companyId: company.id,
        });
      }

      // Validate the request body with the partial insert schema
      const updateSchema = insertCompanySchema.partial();
      const validated = updateSchema.parse(req.body);

      const updated = await storage.updateCompany(user.companyId!, validated);
      await logAudit({ action: "update", entityType: "company_settings", entityId: user.companyId!, changes: validated, req });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating company settings:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // Data export endpoint
  const exportSchema = z.object({
    format: z.enum(['json', 'csv', 'excel']).optional(),
    entities: z.array(z.enum(['skus', 'materials', 'suppliers', 'allocations', 'machinery'])).optional(),
  });

  app.post("/api/data/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      const validationResult = exportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: validationResult.error.errors });
      }

      const { format, entities } = validationResult.data;
      
      const dataExportService = new DataExportService(storage);
      const result = await dataExportService.exportCompanyData(user.companyId, {
        format: format || undefined,
        entities: entities || undefined,
      });

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Data import endpoints
  const upload = multer({ storage: multer.memoryStorage() });

  app.get("/api/data/import/template/:entity", isAuthenticated, async (req: any, res) => {
    try {
      const { entity } = req.params;
      
      if (!['skus', 'materials', 'suppliers'].includes(entity)) {
        return res.status(400).json({ error: "Invalid entity type. Must be 'skus', 'materials', or 'suppliers'" });
      }

      const dataImportService = new DataImportService(storage);
      const template = await dataImportService.generateTemplate(entity as any);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_import_template.csv"`);
      res.send(template);
    } catch (error: any) {
      console.error("Error generating import template:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const importSchema = z.object({
    entity: z.enum(['skus', 'materials', 'suppliers']),
    updateExisting: z.coerce.boolean().optional(),
  });

  app.post("/api/data/import", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.companyId) {
        return res.status(403).json({ error: "User must be associated with a company" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const validationResult = importSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: validationResult.error.errors });
      }

      const { entity, updateExisting } = validationResult.data;
      
      // Reject updateExisting until functionality is implemented
      if (updateExisting) {
        return res.status(400).json({ error: "Update existing records is not yet implemented" });
      }

      const csvContent = req.file.buffer.toString('utf-8');

      const dataImportService = new DataImportService(storage);
      const result = await dataImportService.importFromCSV(
        user.companyId,
        csvContent,
        { entity, updateExisting }
      );

      res.json(result);
    } catch (error: any) {
      console.error("Error importing data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Onboarding endpoints
  app.get("/api/onboarding/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Auto-create company if user doesn't have one
      if (!user.companyId) {
        const company = await storage.createCompany({
          name: `${user.firstName || 'User'}'s Company`,
        });
        
        user = await storage.upsertUser({
          ...user,
          companyId: company.id,
        });
      }

      const companyId = user.companyId!;
      
      // Get company to check profile
      const company = await storage.getCompany(companyId);
      
      // Get SKUs to check if any exist
      const skus = await storage.getSkus(String(companyId));
      
      // Get materials to check if any exist
      const materials = await storage.getMaterials(String(companyId));
      
      // Get suppliers to check if any exist
      const suppliers = await storage.getSuppliers(String(companyId));
      
      // Calculate onboarding status
      const status = {
        hasCompanyProfile: !!(company?.industry && company?.location),
        hasBudget: !!(company?.budget && company?.budget > 0),
        hasSkus: skus.length > 0,
        hasMaterials: materials.length > 0,
        hasSuppliers: suppliers.length > 0,
        hasAlertsConfigured: !!(company?.enableAllocationAlerts || company?.enablePriceAlerts),
      };
      
      res.json(status);
    } catch (error: any) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.companyId) {
        return res.status(400).json({ message: "User has no company association" });
      }

      // Mark onboarding as completed
      const updated = await storage.updateCompany(user.companyId, {
        onboardingCompleted: 1,
      });
      
      res.json({ success: true, company: updated });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  app.get("/api/cache/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const stats = globalCache.getStats();
      res.json({
        ...stats,
        description: "Regime-aware cache with dynamic TTLs based on economic volatility",
        regimeEffects: {
          HEALTHY_EXPANSION: "Longest TTLs (most stable)",
          ASSET_LED_GROWTH: "Medium TTLs (moderate volatility)",
          IMBALANCED_EXCESS: "Short TTLs (high volatility)",
          REAL_ECONOMY_LEAD: "Shortest TTLs (highest volatility)"
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PEER BENCHMARKING (INDUSTRY DATA CONSORTIUM)
  // ==========================================
  
  // Submit benchmark data from company's supplier materials
  app.post("/api/benchmarks/submit", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const validatedData = insertBenchmarkSubmissionSchema.parse({
        ...req.body,
        companyId: user.companyId,
        companyIndustry: company.industry,
        companySize: company.companySize,
        snapshotDate: new Date().toISOString(),
      });

      const submission = await storage.createBenchmarkSubmission(validatedData);

      await logAudit({
        action: "create",
        entityType: "benchmark_submission",
        entityId: submission.id,
        changes: submission,
        req,
      });

      res.json(submission);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get company's benchmark submissions
  app.get("/api/benchmarks/submissions", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const submissions = await storage.getBenchmarkSubmissions(user.companyId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get industry benchmark aggregates for comparison
  app.get("/api/benchmarks/aggregates", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const filters = {
        materialCategory: req.query.materialCategory as string | undefined,
        materialSubcategory: req.query.materialSubcategory as string | undefined,
        industry: req.query.industry as string | undefined,
        companySize: req.query.companySize as string | undefined,
        snapshotMonth: req.query.snapshotMonth as string | undefined,
      };

      const aggregates = await storage.getBenchmarkAggregates(filters);
      res.json(aggregates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get company's benchmark comparisons with insights
  app.get("/api/benchmarks/comparisons", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const comparisons = await storage.getBenchmarkComparisons(user.companyId);
      res.json(comparisons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Compare company costs against industry (generates comparison insights)
  app.post("/api/benchmarks/compare", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get submissions for this company
      const submissions = await storage.getBenchmarkSubmissions(user.companyId);
      
      // For each submission, find matching aggregate and create comparison
      const comparisons = [];
      for (const submission of submissions) {
        const aggregates = await storage.getBenchmarkAggregates({
          materialCategory: submission.materialCategory,
          materialSubcategory: submission.materialSubcategory || undefined,
          industry: company.industry || undefined,
          companySize: company.companySize || undefined,
        });

        if (aggregates.length > 0) {
          const aggregate = aggregates[0]; // Use most recent
          const industryAvg = aggregate.averageCost;
          const companyCost = submission.unitCost;
          const diffPercent = ((companyCost - industryAvg) / industryAvg) * 100;
          const diffAbsolute = companyCost - industryAvg;

          let position = "average";
          if (diffPercent < -10) position = "below_average";
          else if (diffPercent > 10 && diffPercent <= 30) position = "above_average";
          else if (diffPercent > 30) position = "significantly_above";

          // Calculate percentile
          let percentile = 50;
          if (aggregate.p25Cost && companyCost < aggregate.p25Cost) percentile = 25;
          else if (aggregate.p75Cost && companyCost > aggregate.p75Cost) percentile = 75;
          else if (aggregate.p90Cost && companyCost > aggregate.p90Cost) percentile = 90;

          // Calculate potential savings
          const savingsOpportunity = diffPercent > 0
            ? (diffAbsolute * (submission.purchaseVolume || 0))
            : 0;

          const comparison = await storage.createBenchmarkComparison({
            companyId: user.companyId,
            submissionId: submission.id,
            aggregateId: aggregate.id,
            companyCost,
            industryCost: industryAvg,
            costDifferencePercent: diffPercent,
            costDifferenceAbsolute: diffAbsolute,
            companyPercentile: percentile,
            competitivePosition: position,
            savingsOpportunity,
          });

          comparisons.push(comparison);
        }
      }

      await logAudit({
        action: "create",
        entityType: "benchmark_comparison",
        entityId: user.companyId,
        changes: { comparisonsGenerated: comparisons.length },
        req,
      });

      res.json({
        generated: comparisons.length,
        comparisons,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Security Monitoring Endpoints
  app.get("/api/security/events", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const minutes = parseInt(req.query.minutes as string) || 60;
      const events = securityMonitor.getRecentEvents(minutes);

      res.json({
        events,
        timeRange: `Last ${minutes} minutes`,
        totalEvents: events.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/security/summary", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const summary = securityMonitor.getSummary();

      res.json({
        ...summary,
        description: "SOC2-lite security monitoring summary",
        features: {
          encryption: "AES-256-CBC for sensitive data at rest",
          rateLimiting: "100 requests/min global, customizable per endpoint",
          inputSanitization: "XSS and injection prevention",
          sqlInjectionPrevention: "Pattern-based detection and blocking",
          securityHeaders: "CSP, HSTS, X-Frame-Options, etc.",
          auditLogging: "Comprehensive audit trail for all mutations",
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Demand Signal Repository - Sources
  app.get("/api/demand-signals/sources", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const sources = await storage.getDemandSignalSources(user.companyId);
      res.json(sources);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/demand-signals/sources/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const source = await storage.getDemandSignalSource(req.params.id);
      if (!source) return res.status(404).json({ error: "Demand signal source not found" });
      if (source.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      res.json(source);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/demand-signals/sources", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const { insertDemandSignalSourceSchema } = await import("@shared/schema");
      const sourceData = insertDemandSignalSourceSchema.parse({ ...req.body, companyId: user.companyId });
      const source = await storage.createDemandSignalSource(sourceData);
      
      await logAudit({
        action: "create",
        entityType: "demand_signal_source",
        entityId: source.id,
        changes: { name: source.name, sourceType: source.sourceType },
        req,
      });
      
      res.status(201).json(source);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/demand-signals/sources/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getDemandSignalSource(req.params.id);
      if (!existing) return res.status(404).json({ error: "Demand signal source not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const updated = await storage.updateDemandSignalSource(req.params.id, req.body);
      
      await logAudit({
        action: "update",
        entityType: "demand_signal_source",
        entityId: req.params.id,
        changes: req.body,
        req,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/demand-signals/sources/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getDemandSignalSource(req.params.id);
      if (!existing) return res.status(404).json({ error: "Demand signal source not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      await storage.deleteDemandSignalSource(req.params.id);
      
      await logAudit({
        action: "delete",
        entityType: "demand_signal_source",
        entityId: req.params.id,
        req,
      });
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Demand Signal Repository - Signals
  app.get("/api/demand-signals", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const filters: any = {};
      if (req.query.sourceId) filters.sourceId = req.query.sourceId;
      if (req.query.skuId) filters.skuId = req.query.skuId;
      if (req.query.materialId) filters.materialId = req.query.materialId;
      if (req.query.signalType) filters.signalType = req.query.signalType;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate);
      if (req.query.limit) filters.limit = parseInt(req.query.limit);
      
      const signals = await storage.getDemandSignals(user.companyId, filters);
      res.json(signals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/demand-signals/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const signal = await storage.getDemandSignal(req.params.id);
      if (!signal) return res.status(404).json({ error: "Demand signal not found" });
      if (signal.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/demand-signals", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const { insertDemandSignalSchema } = await import("@shared/schema");
      const body = { 
        ...req.body, 
        companyId: user.companyId,
        signalDate: req.body.signalDate ? new Date(req.body.signalDate) : new Date(),
      };
      const signalData = insertDemandSignalSchema.parse(body);
      const signal = await storage.createDemandSignal(signalData);
      
      await logAudit({
        action: "create",
        entityType: "demand_signal",
        entityId: signal.id,
        changes: { signalType: signal.signalType, quantity: signal.quantity },
        req,
      });
      
      res.status(201).json(signal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/demand-signals/batch", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { signals } = req.body;
      if (!Array.isArray(signals)) {
        return res.status(400).json({ error: "signals must be an array" });
      }
      
      const { insertDemandSignalSchema } = await import("@shared/schema");
      const createdSignals = [];
      const errors = [];
      
      for (let i = 0; i < signals.length; i++) {
        try {
          const signalBody = {
            ...signals[i],
            companyId: user.companyId,
            signalDate: signals[i].signalDate ? new Date(signals[i].signalDate) : new Date(),
          };
          const signalData = insertDemandSignalSchema.parse(signalBody);
          const signal = await storage.createDemandSignal(signalData);
          createdSignals.push(signal);
        } catch (e: any) {
          errors.push({ index: i, error: e.message });
        }
      }
      
      if (createdSignals.length > 0) {
        await logAudit({
          action: "create",
          entityType: "demand_signal",
          entityId: user.companyId,
          changes: { count: createdSignals.length, errors: errors.length, batch: true },
          req,
        });
      }
      
      res.status(201).json({ created: createdSignals, errors });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/demand-signals/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getDemandSignal(req.params.id);
      if (!existing) return res.status(404).json({ error: "Demand signal not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      const updated = await storage.updateDemandSignal(req.params.id, req.body);
      
      await logAudit({
        action: "update",
        entityType: "demand_signal",
        entityId: req.params.id,
        changes: req.body,
        req,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/demand-signals/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      const existing = await storage.getDemandSignal(req.params.id);
      if (!existing) return res.status(404).json({ error: "Demand signal not found" });
      if (existing.companyId !== user.companyId) return res.status(403).json({ error: "Forbidden" });
      
      await storage.deleteDemandSignal(req.params.id);
      
      await logAudit({
        action: "delete",
        entityType: "demand_signal",
        entityId: req.params.id,
        req,
      });
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/demand-signals/process", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { signalIds } = req.body;
      if (!Array.isArray(signalIds)) {
        return res.status(400).json({ error: "signalIds must be an array" });
      }
      
      await storage.markDemandSignalsProcessed(signalIds);
      
      await logAudit({
        action: "update",
        entityType: "demand_signal",
        entityId: user.companyId,
        changes: { processedCount: signalIds.length },
        notes: "Marked signals as processed",
        req,
      });
      
      res.json({ processed: signalIds.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Demand Signal Repository - Aggregates
  app.get("/api/demand-signals/aggregates", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const filters: any = {};
      if (req.query.skuId) filters.skuId = req.query.skuId;
      if (req.query.materialId) filters.materialId = req.query.materialId;
      if (req.query.aggregationPeriod) filters.aggregationPeriod = req.query.aggregationPeriod;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate);
      
      const aggregates = await storage.getDemandSignalAggregates(user.companyId, filters);
      res.json(aggregates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Demand Signal Repository - Analytics Summary
  app.get("/api/demand-signals/analytics", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const sources = await storage.getDemandSignalSources(user.companyId);
      const signals = await storage.getDemandSignals(user.companyId, { limit: 1000 });
      
      const totalSources = sources.length;
      const activeSources = sources.filter(s => s.isActive).length;
      const totalSignals = signals.length;
      const unprocessedSignals = signals.filter(s => !s.isProcessed).length;
      
      const signalsByType: Record<string, number> = {};
      const signalsBySource: Record<string, number> = {};
      let totalQuantity = 0;
      let totalConfidence = 0;
      
      for (const signal of signals) {
        signalsByType[signal.signalType] = (signalsByType[signal.signalType] || 0) + 1;
        if (signal.sourceId) {
          signalsBySource[signal.sourceId] = (signalsBySource[signal.sourceId] || 0) + 1;
        }
        totalQuantity += signal.quantity || 0;
        totalConfidence += signal.confidence || 0;
      }
      
      res.json({
        summary: {
          totalSources,
          activeSources,
          totalSignals,
          unprocessedSignals,
          avgConfidence: signals.length > 0 ? totalConfidence / signals.length : 0,
          totalQuantity,
        },
        bySignalType: signalsByType,
        bySource: signalsBySource,
        sources: sources.map(s => ({
          id: s.id,
          name: s.name,
          sourceType: s.sourceType,
          isActive: s.isActive,
          signalCount: signalsBySource[s.id] || 0,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ROI DASHBOARD
  // ============================================================================

  // Get ROI metrics with filters
  app.get("/api/roi/metrics", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const filters: any = {};
      if (req.query.metricType) filters.metricType = req.query.metricType;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate);
      if (req.query.limit) filters.limit = parseInt(req.query.limit);
      
      const metrics = await storage.getRoiMetrics(user.companyId, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create ROI metric
  app.post("/api/roi/metrics", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const metric = await storage.createRoiMetric({
        ...req.body,
        companyId: user.companyId,
      });
      
      await logAudit({
        action: "create",
        entityType: "roi_metric",
        entityId: metric.id,
        changes: req.body,
        notes: `Created ROI metric: ${req.body.metricType}`,
        req,
      });
      
      res.status(201).json(metric);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ROI summary
  app.get("/api/roi/summary", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const periodType = req.query.periodType as string || "all_time";
      const summary = await storage.getRoiSummary(user.companyId, periodType);
      
      // If no summary exists, calculate from metrics
      if (!summary) {
        const metrics = await storage.getRoiMetrics(user.companyId);
        
        let totalProcurementSavings = 0;
        let totalForecastAccuracyImprovement = 0;
        let totalTimeAutomated = 0;
        let procurementCount = 0;
        let forecastCount = 0;
        
        for (const metric of metrics) {
          if (metric.metricType === "procurement_savings") {
            totalProcurementSavings += metric.value || 0;
            procurementCount++;
          } else if (metric.metricType === "forecast_accuracy") {
            totalForecastAccuracyImprovement += metric.value || 0;
            forecastCount++;
          } else if (metric.metricType === "time_saved") {
            totalTimeAutomated += metric.value || 0;
          }
        }
        
        return res.json({
          companyId: user.companyId,
          periodType,
          totalProcurementSavings,
          totalForecastAccuracyImprovement: forecastCount > 0 ? totalForecastAccuracyImprovement / forecastCount : 0,
          totalTimeAutomated,
          avgMapeImprovement: forecastCount > 0 ? totalForecastAccuracyImprovement / forecastCount : 0,
          calculatedAt: new Date(),
        });
      }
      
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ROI dashboard overview (combined data)
  app.get("/api/roi/dashboard", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const [allMetrics, recentMetrics] = await Promise.all([
        storage.getRoiMetrics(user.companyId),
        storage.getRoiMetrics(user.companyId, { limit: 100 }),
      ]);
      
      // Calculate totals by type
      const byType: Record<string, { total: number; count: number; recent: number[] }> = {};
      const bySource: Record<string, number> = {};
      
      for (const metric of allMetrics) {
        if (!byType[metric.metricType]) {
          byType[metric.metricType] = { total: 0, count: 0, recent: [] };
        }
        byType[metric.metricType].total += metric.value || 0;
        byType[metric.metricType].count++;
        
        const source = metric.source || "uncategorized";
        bySource[source] = (bySource[source] || 0) + (metric.value || 0);
      }
      
      // Add recent values for trending
      for (const metric of recentMetrics.slice(0, 10)) {
        if (byType[metric.metricType]) {
          byType[metric.metricType].recent.push(metric.value || 0);
        }
      }
      
      res.json({
        totals: {
          procurementSavings: byType["procurement_savings"]?.total || 0,
          forecastAccuracyImprovement: byType["forecast_accuracy"]?.count > 0 
            ? byType["forecast_accuracy"].total / byType["forecast_accuracy"].count 
            : 0,
          timeSaved: byType["time_saved"]?.total || 0,
          inventoryOptimization: byType["inventory_optimization"]?.total || 0,
        },
        byMetricType: byType,
        bySource,
        recentMetrics: recentMetrics.slice(0, 20),
        metricsCount: allMetrics.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ERP INTEGRATION TEMPLATES
  // ============================================================================

  // Get all ERP integration templates
  app.get("/api/erp/templates", isAuthenticated, rateLimiters.api, async (_req: any, res) => {
    try {
      const templates = await storage.getErpIntegrationTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single ERP template
  app.get("/api/erp/templates/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const template = await storage.getErpIntegrationTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default ERP templates (admin only, or initial setup)
  app.post("/api/erp/templates/seed", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const defaultTemplates = [
        {
          erpName: "sap",
          displayName: "SAP S/4HANA",
          description: "Enterprise-grade ERP integration with SAP S/4HANA for procurement, inventory, and production planning.",
          logoUrl: "/erp-logos/sap.svg",
          supportedModules: ["inventory", "procurement", "production", "finance"],
          dataFlowDirection: "bidirectional" as const,
          connectionType: "api" as const,
          authMethod: "oauth2" as const,
          apiDocumentationUrl: "https://api.sap.com/documentation",
          fieldMappings: {
            materials: { "material_number": "id", "material_description": "name", "base_unit": "unit" },
            purchaseOrders: { "po_number": "poNumber", "vendor": "supplierId", "total": "totalAmount" },
            inventory: { "material": "materialId", "quantity": "quantity", "location": "locationId" }
          },
          sampleConfig: { baseUrl: "https://mycompany.sapbydesign.com/api", clientId: "YOUR_CLIENT_ID" },
          setupInstructions: "## SAP S/4HANA Integration Setup\n\n1. **API Access**: Enable OData APIs in SAP\n2. **OAuth Setup**: Create OAuth client in SAP\n3. **Configure Endpoints**: Set base URL and authentication\n4. **Test Connection**: Verify with a simple data fetch\n\n### Required Permissions\n- Material Management read/write\n- Purchase Order management\n- Inventory visibility",
          isPopular: true,
          sortOrder: 1,
        },
        {
          erpName: "oracle_netsuite",
          displayName: "Oracle NetSuite",
          description: "Cloud-based ERP integration with Oracle NetSuite for full supply chain visibility.",
          logoUrl: "/erp-logos/netsuite.svg",
          supportedModules: ["inventory", "procurement", "sales", "finance"],
          dataFlowDirection: "bidirectional" as const,
          connectionType: "api" as const,
          authMethod: "oauth2" as const,
          apiDocumentationUrl: "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1529090917.html",
          fieldMappings: {
            materials: { "internalId": "id", "itemId": "sku", "displayName": "name" },
            purchaseOrders: { "tranId": "poNumber", "entity": "supplierId", "total": "totalAmount" },
            inventory: { "item": "materialId", "quantityAvailable": "quantity" }
          },
          sampleConfig: { accountId: "YOUR_ACCOUNT_ID", consumerKey: "YOUR_CONSUMER_KEY" },
          setupInstructions: "## Oracle NetSuite Integration Setup\n\n1. **Enable SuiteScript/REST**: Activate RESTlets in NetSuite\n2. **Create Integration Record**: Generate token-based auth credentials\n3. **Map Custom Fields**: Align NetSuite fields with platform schema\n4. **Test Sync**: Run initial data synchronization\n\n### Required Roles\n- Inventory Manager\n- Purchasing Agent",
          isPopular: true,
          sortOrder: 2,
        },
        {
          erpName: "microsoft_dynamics_365",
          displayName: "Microsoft Dynamics 365",
          description: "Seamless integration with Microsoft Dynamics 365 Finance and Supply Chain Management.",
          logoUrl: "/erp-logos/dynamics365.svg",
          supportedModules: ["inventory", "procurement", "production", "finance"],
          dataFlowDirection: "bidirectional" as const,
          connectionType: "api" as const,
          authMethod: "oauth2" as const,
          apiDocumentationUrl: "https://docs.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/",
          fieldMappings: {
            materials: { "ItemId": "id", "ProductName": "name", "InventUnitId": "unit" },
            purchaseOrders: { "PurchId": "poNumber", "OrderVendorAccountNumber": "supplierId", "TotalAmount": "totalAmount" },
            inventory: { "ItemId": "materialId", "AvailablePhysical": "quantity" }
          },
          sampleConfig: { tenantId: "YOUR_TENANT_ID", resourceUrl: "https://yourorg.operations.dynamics.com" },
          setupInstructions: "## Microsoft Dynamics 365 Integration\n\n1. **Azure AD Setup**: Register application in Azure Active Directory\n2. **API Permissions**: Grant Dynamics 365 Finance API access\n3. **Configure Data Entities**: Enable required data entities\n4. **Webhook Setup**: Configure outbound webhooks for real-time sync\n\n### Required Licenses\n- Dynamics 365 Finance\n- Dynamics 365 Supply Chain Management",
          isPopular: true,
          sortOrder: 3,
        },
        {
          erpName: "sage",
          displayName: "Sage X3 / Sage Intacct",
          description: "Integration with Sage business management solutions for mid-market manufacturers.",
          logoUrl: "/erp-logos/sage.svg",
          supportedModules: ["inventory", "procurement", "finance"],
          dataFlowDirection: "bidirectional" as const,
          connectionType: "api" as const,
          authMethod: "api_key" as const,
          apiDocumentationUrl: "https://developer.sage.com/accounting/guides/",
          fieldMappings: {
            materials: { "ITMREF": "id", "ITMDES": "name", "STU": "unit" },
            purchaseOrders: { "POHNUM": "poNumber", "BPSNUM": "supplierId", "TOTAMTATIORD": "totalAmount" },
            inventory: { "ITMREF": "materialId", "QTYSTU": "quantity" }
          },
          sampleConfig: { companyCode: "YOUR_COMPANY", apiKey: "YOUR_API_KEY" },
          setupInstructions: "## Sage Integration Setup\n\n1. **API Activation**: Enable REST API in Sage configuration\n2. **Generate API Key**: Create API credentials\n3. **Field Mapping**: Map Sage fields to platform schema\n4. **Test Connection**: Validate with inventory sync\n\n### Requirements\n- Sage X3 v12+ or Sage Intacct\n- API module license",
          isPopular: false,
          sortOrder: 4,
        },
        {
          erpName: "infor",
          displayName: "Infor CloudSuite",
          description: "Industry-specific ERP integration with Infor CloudSuite for discrete and process manufacturing.",
          logoUrl: "/erp-logos/infor.svg",
          supportedModules: ["inventory", "procurement", "production"],
          dataFlowDirection: "bidirectional" as const,
          connectionType: "api" as const,
          authMethod: "oauth2" as const,
          apiDocumentationUrl: "https://docs.infor.com/",
          fieldMappings: {
            materials: { "item": "id", "description": "name", "uom": "unit" },
            purchaseOrders: { "orderNumber": "poNumber", "vendorNumber": "supplierId", "orderTotal": "totalAmount" },
            inventory: { "itemNumber": "materialId", "quantityOnHand": "quantity" }
          },
          sampleConfig: { tenant: "YOUR_TENANT", ionApiUrl: "https://mingle-ionapi.inforcloudsuite.com" },
          setupInstructions: "## Infor CloudSuite Integration\n\n1. **ION API Gateway**: Configure ION API in Infor OS\n2. **Authorization**: Set up OAuth credentials\n3. **BOD Configuration**: Enable required Business Object Documents\n4. **Data Lake Setup**: Configure Infor Data Lake for analytics\n\n### Supported Solutions\n- Infor CloudSuite Industrial (SyteLine)\n- Infor LN\n- Infor M3",
          isPopular: false,
          sortOrder: 5,
        },
      ];
      
      const created = [];
      for (const template of defaultTemplates) {
        const existing = await storage.getErpIntegrationTemplates();
        const exists = existing.find(t => t.erpName === template.erpName);
        if (!exists) {
          const result = await storage.createErpIntegrationTemplate(template as any);
          created.push(result);
        }
      }
      
      res.json({ seeded: created.length, templates: created });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ERP sync logs for a connection
  app.get("/api/erp/connections/:connectionId/logs", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const logs = await storage.getErpSyncLogs(req.params.connectionId, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PRESCRIPTIVE ACTION PLAYBOOKS
  // ============================================================================

  // Get all playbooks
  app.get("/api/playbooks", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const filters: any = {};
      if (req.query.triggerType) filters.triggerType = req.query.triggerType;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
      
      const playbooks = await storage.getActionPlaybooks(filters);
      res.json(playbooks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single playbook
  app.get("/api/playbooks/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const playbook = await storage.getActionPlaybook(req.params.id);
      if (!playbook) {
        return res.status(404).json({ error: "Playbook not found" });
      }
      res.json(playbook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default playbooks
  app.post("/api/playbooks/seed", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const defaultPlaybooks = [
        {
          name: "Recession Preparation Playbook",
          description: "Actions to take when economic indicators signal transition to recessionary conditions",
          triggerType: "regime_change",
          fromRegime: "expansionary",
          toRegime: "recessionary",
          priority: "critical",
          applicableIndustries: null,
          actions: [
            { id: "1", title: "Review and defer non-essential capital expenditures", description: "Postpone machinery purchases and facility expansions", timeframe: "1 week", department: "Finance" },
            { id: "2", title: "Negotiate extended payment terms with suppliers", description: "Lock in favorable payment terms while suppliers are still flexible", timeframe: "2 weeks", department: "Procurement" },
            { id: "3", title: "Increase safety stock for critical materials", description: "Build inventory buffer for essential production inputs", timeframe: "30 days", department: "Operations" },
            { id: "4", title: "Renegotiate supplier contracts with volume flexibility", description: "Add provisions for demand fluctuation without penalties", timeframe: "45 days", department: "Procurement" },
            { id: "5", title: "Identify alternative lower-cost suppliers", description: "Qualify backup suppliers for cost optimization", timeframe: "60 days", department: "Procurement" },
          ],
          expectedOutcomes: {
            procurementSavings: "8-15%",
            cashFlowImprovement: "20-30%",
            riskReduction: "Significant supply chain resilience improvement"
          },
          isSystemDefault: true,
          isActive: true,
        },
        {
          name: "Expansion Opportunity Playbook",
          description: "Capitalize on favorable economic conditions with strategic investments",
          triggerType: "regime_change",
          fromRegime: "recessionary",
          toRegime: "expansionary",
          priority: "high",
          applicableIndustries: null,
          actions: [
            { id: "1", title: "Lock in long-term supplier contracts at favorable rates", description: "Secure pricing before market rates increase", timeframe: "2 weeks", department: "Procurement" },
            { id: "2", title: "Accelerate planned capital investments", description: "Take advantage of lower equipment costs and available financing", timeframe: "30 days", department: "Finance" },
            { id: "3", title: "Increase production capacity utilization", description: "Ramp up production to meet anticipated demand growth", timeframe: "30 days", department: "Operations" },
            { id: "4", title: "Stockpile raw materials at current prices", description: "Build strategic inventory before inflation increases costs", timeframe: "45 days", department: "Procurement" },
            { id: "5", title: "Review and pursue deferred growth initiatives", description: "Restart projects paused during downturn", timeframe: "60 days", department: "Strategy" },
          ],
          expectedOutcomes: {
            marketShareGain: "5-10%",
            costAdvantage: "10-20% vs delayed action",
            capacityReadiness: "Full utilization ready"
          },
          isSystemDefault: true,
          isActive: true,
        },
        {
          name: "Financial Circuit Leading Playbook",
          description: "When financial markets lead real economy, prepare for delayed real sector impact",
          triggerType: "regime_change",
          fromRegime: "real_economy_lead",
          toRegime: "financial_lead",
          priority: "medium",
          applicableIndustries: null,
          actions: [
            { id: "1", title: "Review commodity hedging positions", description: "Adjust hedging strategy for anticipated price volatility", timeframe: "1 week", department: "Finance" },
            { id: "2", title: "Monitor supplier financial health closely", description: "Increase credit monitoring frequency", timeframe: "2 weeks", department: "Procurement" },
            { id: "3", title: "Prepare for potential demand volatility", description: "Build demand forecasting scenarios for multiple outcomes", timeframe: "30 days", department: "Planning" },
            { id: "4", title: "Secure backup credit facilities", description: "Ensure working capital availability for various scenarios", timeframe: "30 days", department: "Finance" },
          ],
          expectedOutcomes: {
            riskMitigation: "Reduced exposure to market volatility",
            forecastAccuracy: "Improved through scenario planning",
            financialFlexibility: "Enhanced working capital position"
          },
          isSystemDefault: true,
          isActive: true,
        },
        {
          name: "Forecast Degradation Response",
          description: "Actions when demand forecast accuracy degrades significantly",
          triggerType: "forecast_degradation",
          fdrThreshold: 0.3,
          fdrDirection: "above",
          priority: "high",
          applicableIndustries: null,
          actions: [
            { id: "1", title: "Review forecast model inputs", description: "Check for data quality issues or missing signals", timeframe: "1 day", department: "Planning" },
            { id: "2", title: "Trigger model retraining", description: "Initiate automated retraining with recent data", timeframe: "2 days", department: "Data Science" },
            { id: "3", title: "Increase safety stock temporarily", description: "Buffer inventory while forecast accuracy recovers", timeframe: "1 week", department: "Operations" },
            { id: "4", title: "Review external demand signals", description: "Check for market changes not captured in model", timeframe: "1 week", department: "Sales" },
          ],
          expectedOutcomes: {
            forecastRecovery: "MAPE reduction of 20-30%",
            serviceLevel: "Maintained despite degradation",
            modelImprovement: "Continuous learning validated"
          },
          isSystemDefault: true,
          isActive: true,
        },
      ];
      
      const created = [];
      const existing = await storage.getActionPlaybooks();
      
      for (const playbook of defaultPlaybooks) {
        const exists = existing.find(p => p.name === playbook.name);
        if (!exists) {
          const result = await storage.createActionPlaybook(playbook as any);
          created.push(result);
        }
      }
      
      res.json({ seeded: created.length, playbooks: created });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active playbook instances for company
  app.get("/api/playbooks/instances", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const status = req.query.status as string | undefined;
      const instances = await storage.getActivePlaybookInstances(user.companyId, status);
      
      // Enrich with playbook details
      const enriched = await Promise.all(instances.map(async (instance) => {
        const playbook = await storage.getActionPlaybook(instance.playbookId);
        return { ...instance, playbook };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger a playbook manually
  app.post("/api/playbooks/:id/trigger", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const playbook = await storage.getActionPlaybook(req.params.id);
      if (!playbook) {
        return res.status(404).json({ error: "Playbook not found" });
      }
      
      const instance = await storage.createActivePlaybookInstance({
        companyId: user.companyId,
        playbookId: playbook.id,
        triggeredAt: new Date(),
        triggerContext: req.body.triggerContext || { manual: true, triggeredBy: userId },
        status: "active",
        currentActionIndex: 0,
      });
      
      // Create action logs for each action
      const actions = (playbook.actions as any[]) || [];
      for (let i = 0; i < actions.length; i++) {
        await storage.createPlaybookActionLog({
          instanceId: instance.id,
          actionIndex: i,
          actionTitle: actions[i].title,
          status: i === 0 ? "in_progress" : "pending",
        });
      }
      
      await logAudit({
        action: "create",
        entityType: "playbook_instance",
        entityId: instance.id,
        changes: { playbookId: playbook.id, playbookName: playbook.name },
        notes: `Triggered playbook: ${playbook.name}`,
        req,
      });
      
      res.status(201).json({ instance, playbook });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update playbook instance (complete action, dismiss, etc.)
  app.patch("/api/playbooks/instances/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const instance = await storage.getActivePlaybookInstance(req.params.id);
      if (!instance || instance.companyId !== user.companyId) {
        return res.status(404).json({ error: "Instance not found" });
      }
      
      const updated = await storage.updateActivePlaybookInstance(req.params.id, req.body);
      
      await logAudit({
        action: "update",
        entityType: "playbook_instance",
        entityId: req.params.id,
        changes: req.body,
        notes: `Updated playbook instance`,
        req,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete an action in a playbook
  app.post("/api/playbooks/instances/:instanceId/actions/:actionIndex/complete", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const instance = await storage.getActivePlaybookInstance(req.params.instanceId);
      if (!instance || instance.companyId !== user.companyId) {
        return res.status(404).json({ error: "Instance not found" });
      }
      
      const actionLogs = await storage.getPlaybookActionLogs(req.params.instanceId);
      const actionLog = actionLogs.find(a => a.actionIndex === parseInt(req.params.actionIndex));
      
      if (!actionLog) {
        return res.status(404).json({ error: "Action not found" });
      }
      
      // Update current action as completed
      await storage.updatePlaybookActionLog(actionLog.id, {
        status: "completed",
        completedAt: new Date(),
        completedBy: userId,
        notes: req.body.notes,
        evidence: req.body.evidence,
      });
      
      // Start next action if available
      const nextAction = actionLogs.find(a => a.actionIndex === parseInt(req.params.actionIndex) + 1);
      if (nextAction) {
        await storage.updatePlaybookActionLog(nextAction.id, { status: "in_progress", startedAt: new Date() });
        await storage.updateActivePlaybookInstance(req.params.instanceId, {
          currentActionIndex: nextAction.actionIndex,
          status: "in_progress",
        });
      } else {
        // All actions completed
        await storage.updateActivePlaybookInstance(req.params.instanceId, {
          status: "completed",
          completedAt: new Date(),
        });
      }
      
      await logAudit({
        action: "update",
        entityType: "playbook_action",
        entityId: actionLog.id,
        changes: { status: "completed", actionIndex: req.params.actionIndex },
        notes: `Completed playbook action: ${actionLog.actionTitle}`,
        req,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SCENARIO SIMULATIONS (WHAT-IF ANALYSIS) =====
  
  // Get all scenario simulations for company
  app.get("/api/simulations", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulations = await storage.getScenarioSimulations(user.companyId);
      res.json(simulations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single simulation with variants
  app.get("/api/simulations/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getScenarioSimulation(req.params.id);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      const variants = await storage.getScenarioVariants(req.params.id);
      res.json({ ...simulation, variants });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create new simulation
  app.post("/api/simulations", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.createScenarioSimulation({
        companyId: user.companyId,
        createdById: userId,
        name: req.body.name,
        description: req.body.description,
        baseFdrValue: req.body.baseFdrValue || 1.0,
        baseRegime: req.body.baseRegime || "balanced",
        baseCommodityInputs: req.body.baseCommodityInputs,
        status: "draft",
      });
      
      await logAudit({
        action: "create",
        entityType: "scenario_simulation",
        entityId: simulation.id,
        changes: { name: simulation.name },
        notes: `Created what-if simulation: ${simulation.name}`,
        req,
      });
      
      res.status(201).json(simulation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update simulation
  app.patch("/api/simulations/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const existing = await storage.getScenarioSimulation(req.params.id);
      if (!existing || existing.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      const updated = await storage.updateScenarioSimulation(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete simulation
  app.delete("/api/simulations/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const existing = await storage.getScenarioSimulation(req.params.id);
      if (!existing || existing.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      await storage.deleteScenarioSimulation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add variant to simulation
  app.post("/api/simulations/:id/variants", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getScenarioSimulation(req.params.id);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      // Calculate impacts based on variant inputs vs base
      const procurementImpact = calculateProcurementImpact(
        simulation.baseFdrValue,
        req.body.fdrValue,
        simulation.baseRegime,
        req.body.regime
      );
      
      const inventoryImpact = calculateInventoryImpact(
        simulation.baseFdrValue,
        req.body.fdrValue,
        req.body.commodityAdjustments
      );
      
      const budgetImpact = calculateBudgetImpact(
        procurementImpact,
        req.body.commodityAdjustments
      );
      
      const riskScore = calculateVariantRiskScore(
        req.body.fdrValue,
        req.body.regime,
        req.body.commodityAdjustments
      );
      
      const variant = await storage.createScenarioVariant({
        simulationId: req.params.id,
        label: req.body.label,
        fdrValue: req.body.fdrValue,
        regime: req.body.regime,
        commodityAdjustments: req.body.commodityAdjustments,
        procurementImpact,
        inventoryImpact,
        budgetImpact,
        riskScore,
        isBaseline: req.body.isBaseline ? 1 : 0,
        allocationImpact: req.body.allocationImpact,
        forecastImpact: req.body.forecastImpact,
        comparisonMeta: req.body.comparisonMeta,
      });
      
      res.status(201).json(variant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update variant
  app.patch("/api/simulations/:simulationId/variants/:variantId", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getScenarioSimulation(req.params.simulationId);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      const updated = await storage.updateScenarioVariant(req.params.variantId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete variant
  app.delete("/api/simulations/:simulationId/variants/:variantId", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getScenarioSimulation(req.params.simulationId);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      await storage.deleteScenarioVariant(req.params.variantId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Run simulation (calculate all impacts)
  app.post("/api/simulations/:id/run", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getScenarioSimulation(req.params.id);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      await storage.updateScenarioSimulation(req.params.id, { status: "running" });
      
      const variants = await storage.getScenarioVariants(req.params.id);
      
      // Recalculate impacts for each variant
      for (const variant of variants) {
        const procurementImpact = calculateProcurementImpact(
          simulation.baseFdrValue,
          variant.fdrValue,
          simulation.baseRegime,
          variant.regime
        );
        
        const inventoryImpact = calculateInventoryImpact(
          simulation.baseFdrValue,
          variant.fdrValue,
          variant.commodityAdjustments
        );
        
        const budgetImpact = calculateBudgetImpact(
          procurementImpact,
          variant.commodityAdjustments
        );
        
        const riskScore = calculateVariantRiskScore(
          variant.fdrValue,
          variant.regime,
          variant.commodityAdjustments
        );
        
        await storage.updateScenarioVariant(variant.id, {
          procurementImpact,
          inventoryImpact,
          budgetImpact,
          riskScore,
        });
      }
      
      await storage.updateScenarioSimulation(req.params.id, { status: "completed" });
      
      const updatedVariants = await storage.getScenarioVariants(req.params.id);
      res.json({ ...simulation, status: "completed", variants: updatedVariants });
    } catch (error: any) {
      await storage.updateScenarioSimulation(req.params.id, { status: "draft" });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Compare variants side-by-side
  app.get("/api/simulations/:id/compare", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getScenarioSimulation(req.params.id);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      const variants = await storage.getScenarioVariants(req.params.id);
      
      // Build comparison data
      const comparison = {
        simulation,
        variants,
        metrics: {
          procurementImpact: variants.map(v => ({ label: v.label, value: v.procurementImpact })),
          inventoryImpact: variants.map(v => ({ label: v.label, value: v.inventoryImpact })),
          budgetImpact: variants.map(v => ({ label: v.label, value: v.budgetImpact })),
          riskScore: variants.map(v => ({ label: v.label, value: v.riskScore })),
        },
        bestCase: variants.reduce((best, v) => 
          (v.procurementImpact || 0) < (best?.procurementImpact || 0) ? v : best, variants[0]),
        worstCase: variants.reduce((worst, v) => 
          (v.procurementImpact || 0) > (worst?.procurementImpact || 0) ? v : worst, variants[0]),
      };
      
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ===== SUPPLIER RISK SCORING =====
  
  // Get all supplier risk snapshots for company
  app.get("/api/supplier-risk", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const filters: any = { latestOnly: req.query.latestOnly !== "false" };
      if (req.query.supplierId) filters.supplierId = req.query.supplierId;
      if (req.query.regime) filters.regime = req.query.regime;
      if (req.query.riskTier) filters.riskTier = req.query.riskTier;
      
      const snapshots = await storage.getSupplierRiskSnapshots(user.companyId, filters);
      
      // Enrich with supplier details
      const enriched = await Promise.all(snapshots.map(async (snapshot) => {
        const supplier = await storage.getSupplier(snapshot.supplierId);
        return { ...snapshot, supplier };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get risk snapshot for specific supplier
  app.get("/api/supplier-risk/:supplierId", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const supplier = await storage.getSupplier(req.params.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      const snapshot = await storage.getLatestSupplierRiskSnapshot(req.params.supplierId);
      const allSnapshots = await storage.getSupplierRiskSnapshots(user.companyId, { supplierId: req.params.supplierId });
      
      res.json({ 
        current: snapshot, 
        history: allSnapshots, 
        supplier 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Calculate/recalculate risk score for supplier
  app.post("/api/supplier-risk/:supplierId/calculate", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const supplier = await storage.getSupplier(req.params.supplierId);
      if (!supplier || supplier.companyId !== user.companyId) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      // Get current FDR and regime
      const fdrValue = req.body.fdrValue || 1.0;
      const regime = req.body.regime || "balanced";
      const fdrSignalStrength = req.body.fdrSignalStrength || 0.5;
      
      // Calculate risk components
      const financialHealthScore = calculateFinancialHealthScore(supplier, req.body.financialData);
      const geographicRiskScore = calculateGeographicRiskScore(supplier);
      const concentrationRiskScore = await calculateConcentrationRiskScore(supplier, user.companyId);
      const performanceScore = await calculatePerformanceScore(supplier);
      const regimeImpactScore = calculateRegimeImpactScore(regime, fdrValue);
      
      // Calculate base score (before FDR adjustment)
      const baseScore = (
        financialHealthScore * 0.25 +
        geographicRiskScore * 0.15 +
        concentrationRiskScore * 0.20 +
        performanceScore * 0.25 +
        regimeImpactScore * 0.15
      );
      
      // Apply FDR adjustment
      const fdrMultiplier = getFDRRiskMultiplier(fdrValue, regime);
      const adjustedScore = Math.min(100, Math.max(0, baseScore * fdrMultiplier));
      
      // Determine risk tier
      const riskTier = getRiskTier(adjustedScore);
      
      // Generate recommendations based on risk factors
      const riskFactors = {
        financial: { score: financialHealthScore, weight: 0.25 },
        geographic: { score: geographicRiskScore, weight: 0.15 },
        concentration: { score: concentrationRiskScore, weight: 0.20 },
        performance: { score: performanceScore, weight: 0.25 },
        regimeImpact: { score: regimeImpactScore, weight: 0.15 },
      };
      
      const recommendations = generateRiskRecommendations(riskTier, riskFactors, regime);
      
      // Create snapshot
      const snapshot = await storage.createSupplierRiskSnapshot({
        companyId: user.companyId,
        supplierId: req.params.supplierId,
        regime,
        fdrValue,
        fdrSignalStrength,
        baseScore,
        adjustedScore,
        riskTier,
        riskFactors,
        recommendations,
        financialHealthScore,
        geographicRiskScore,
        concentrationRiskScore,
        performanceScore,
        regimeImpactScore,
        nextEvaluationDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      await logAudit({
        action: "create",
        entityType: "supplier_risk_snapshot",
        entityId: snapshot.id,
        changes: { supplierId: req.params.supplierId, adjustedScore, riskTier },
        notes: `Calculated supplier risk: ${supplier.name} - ${riskTier} (${adjustedScore.toFixed(1)})`,
        req,
      });
      
      res.status(201).json({ ...snapshot, supplier });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Bulk calculate risk for all suppliers
  app.post("/api/supplier-risk/calculate-all", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const suppliers = await storage.getSuppliers(user.companyId);
      const fdrValue = req.body.fdrValue || 1.0;
      const regime = req.body.regime || "balanced";
      
      const results = [];
      
      for (const supplier of suppliers) {
        try {
          const financialHealthScore = calculateFinancialHealthScore(supplier, null);
          const geographicRiskScore = calculateGeographicRiskScore(supplier);
          const concentrationRiskScore = await calculateConcentrationRiskScore(supplier, user.companyId);
          const performanceScore = await calculatePerformanceScore(supplier);
          const regimeImpactScore = calculateRegimeImpactScore(regime, fdrValue);
          
          const baseScore = (
            financialHealthScore * 0.25 +
            geographicRiskScore * 0.15 +
            concentrationRiskScore * 0.20 +
            performanceScore * 0.25 +
            regimeImpactScore * 0.15
          );
          
          const fdrMultiplier = getFDRRiskMultiplier(fdrValue, regime);
          const adjustedScore = Math.min(100, Math.max(0, baseScore * fdrMultiplier));
          const riskTier = getRiskTier(adjustedScore);
          
          const riskFactors = {
            financial: { score: financialHealthScore, weight: 0.25 },
            geographic: { score: geographicRiskScore, weight: 0.15 },
            concentration: { score: concentrationRiskScore, weight: 0.20 },
            performance: { score: performanceScore, weight: 0.25 },
            regimeImpact: { score: regimeImpactScore, weight: 0.15 },
          };
          
          const recommendations = generateRiskRecommendations(riskTier, riskFactors, regime);
          
          const snapshot = await storage.createSupplierRiskSnapshot({
            companyId: user.companyId,
            supplierId: supplier.id,
            regime,
            fdrValue,
            fdrSignalStrength: 0.5,
            baseScore,
            adjustedScore,
            riskTier,
            riskFactors,
            recommendations,
            financialHealthScore,
            geographicRiskScore,
            concentrationRiskScore,
            performanceScore,
            regimeImpactScore,
            nextEvaluationDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          
          results.push({ supplier, snapshot, status: "success" });
        } catch (err: any) {
          results.push({ supplier, error: err.message, status: "error" });
        }
      }
      
      const summary = {
        total: suppliers.length,
        successful: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "error").length,
        byTier: {
          low: results.filter(r => r.snapshot?.riskTier === "low").length,
          medium: results.filter(r => r.snapshot?.riskTier === "medium").length,
          high: results.filter(r => r.snapshot?.riskTier === "high").length,
          critical: results.filter(r => r.snapshot?.riskTier === "critical").length,
        },
      };
      
      res.json({ summary, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get risk summary/dashboard data
  app.get("/api/supplier-risk/summary", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const snapshots = await storage.getSupplierRiskSnapshots(user.companyId, { latestOnly: true });
      
      const summary = {
        totalSuppliers: snapshots.length,
        avgRiskScore: snapshots.length > 0 
          ? snapshots.reduce((sum, s) => sum + s.adjustedScore, 0) / snapshots.length 
          : 0,
        byTier: {
          low: snapshots.filter(s => s.riskTier === "low").length,
          medium: snapshots.filter(s => s.riskTier === "medium").length,
          high: snapshots.filter(s => s.riskTier === "high").length,
          critical: snapshots.filter(s => s.riskTier === "critical").length,
        },
        criticalSuppliers: snapshots
          .filter(s => s.riskTier === "critical" || s.riskTier === "high")
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 5),
        recommendations: snapshots
          .filter(s => s.recommendations && Array.isArray(s.recommendations))
          .flatMap(s => (s.recommendations as any[]).map(r => ({ ...r, supplierId: s.supplierId })))
          .slice(0, 10),
      };
      
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // S&OP WORKFLOW ROUTES
  // ============================================

  // --- S&OP Meeting Templates ---
  
  // Get all meeting templates (system + company-specific)
  app.get("/api/sop/templates", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const templates = await storage.getSopMeetingTemplates(user.companyId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single template
  app.get("/api/sop/templates/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const template = await storage.getSopMeetingTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create meeting template
  app.post("/api/sop/templates", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const validatedData = insertSopMeetingTemplateSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      
      const template = await storage.createSopMeetingTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update meeting template
  app.patch("/api/sop/templates/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const template = await storage.updateSopMeetingTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete meeting template
  app.delete("/api/sop/templates/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      await storage.deleteSopMeetingTemplate(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- S&OP Meetings ---
  
  // Get all meetings
  app.get("/api/sop/meetings", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { status, meetingType } = req.query;
      const meetings = await storage.getSopMeetings(user.companyId, { 
        status: status as string, 
        meetingType: meetingType as string 
      });
      res.json(meetings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single meeting with attendees
  app.get("/api/sop/meetings/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const meeting = await storage.getSopMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      const attendees = await storage.getSopMeetingAttendees(meeting.id);
      res.json({ ...meeting, attendees });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create meeting
  app.post("/api/sop/meetings", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Get current regime context
      const latestSnapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      // Parse date strings to Date objects (datetime-local sends strings)
      const scheduledStart = req.body.scheduledStart ? new Date(req.body.scheduledStart) : undefined;
      const scheduledEnd = req.body.scheduledEnd ? new Date(req.body.scheduledEnd) : undefined;
      const planningHorizonStart = req.body.planningHorizonStart ? new Date(req.body.planningHorizonStart) : undefined;
      const planningHorizonEnd = req.body.planningHorizonEnd ? new Date(req.body.planningHorizonEnd) : undefined;
      
      const validatedData = insertSopMeetingSchema.parse({
        ...req.body,
        scheduledStart,
        scheduledEnd,
        planningHorizonStart,
        planningHorizonEnd,
        companyId: user.companyId,
        organizerId: userId,
        regimeAtMeeting: latestSnapshot?.regime,
        fdrAtMeeting: latestSnapshot?.fdr,
      });
      
      const meeting = await storage.createSopMeeting(validatedData);
      res.status(201).json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update meeting
  app.patch("/api/sop/meetings/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const meeting = await storage.updateSopMeeting(req.params.id, req.body);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Start meeting
  app.post("/api/sop/meetings/:id/start", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const meeting = await storage.updateSopMeeting(req.params.id, {
        status: "in_progress",
        actualStart: new Date(),
      });
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // End meeting
  app.post("/api/sop/meetings/:id/end", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const meeting = await storage.updateSopMeeting(req.params.id, {
        status: "completed",
        actualEnd: new Date(),
        notes: req.body.notes,
        decisions: req.body.decisions,
        actionItems: req.body.actionItems,
      });
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete meeting
  app.delete("/api/sop/meetings/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      await storage.deleteSopMeeting(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- Meeting Attendees ---
  
  // Add attendee to meeting
  app.post("/api/sop/meetings/:meetingId/attendees", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const validatedData = insertSopMeetingAttendeeSchema.parse({
        ...req.body,
        meetingId: req.params.meetingId,
      });
      
      const attendee = await storage.createSopMeetingAttendee(validatedData);
      res.status(201).json(attendee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update attendee
  app.patch("/api/sop/attendees/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const attendee = await storage.updateSopMeetingAttendee(req.params.id, req.body);
      if (!attendee) {
        return res.status(404).json({ error: "Attendee not found" });
      }
      res.json(attendee);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Remove attendee
  app.delete("/api/sop/attendees/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      await storage.deleteSopMeetingAttendee(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- S&OP Reconciliation Items ---
  
  // Get reconciliation items
  app.get("/api/sop/reconciliation", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { meetingId, status, priority } = req.query;
      const items = await storage.getSopReconciliationItems(user.companyId, {
        meetingId: meetingId as string,
        status: status as string,
        priority: priority as string,
      });
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single reconciliation item
  app.get("/api/sop/reconciliation/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const item = await storage.getSopReconciliationItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Reconciliation item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create reconciliation item
  app.post("/api/sop/reconciliation", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Get current regime context
      const latestSnapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      const validatedData = insertSopReconciliationItemSchema.parse({
        ...req.body,
        companyId: user.companyId,
        regime: latestSnapshot?.regime,
        fdrValue: latestSnapshot?.fdr,
      });
      
      const item = await storage.createSopReconciliationItem(validatedData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update reconciliation item
  app.patch("/api/sop/reconciliation/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const item = await storage.updateSopReconciliationItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Reconciliation item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete reconciliation item
  app.delete("/api/sop/reconciliation/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      await storage.deleteSopReconciliationItem(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Auto-detect gaps from demand forecasts vs supply
  app.post("/api/sop/reconciliation/detect-gaps", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { periodStart, periodEnd, meetingId } = req.body;
      
      // Get SKUs and their demand forecasts
      const skus = await storage.getSkus(user.companyId);
      const materials = await storage.getMaterials(user.companyId);
      const latestSnapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      const gaps: any[] = [];
      
      // Check each SKU for demand/supply gaps
      for (const sku of skus) {
        const demandHistory = await storage.getDemandHistory(sku.id);
        const avgDemand = demandHistory.length > 0
          ? demandHistory.reduce((sum, d) => sum + d.quantity, 0) / demandHistory.length
          : 0;
        
        // Get BOMs for this SKU
        const boms = await storage.getBomsForSku(sku.id);
        
        for (const bom of boms) {
          const material = materials.find(m => m.id === bom.materialId);
          if (!material) continue;
          
          const requiredQuantity = avgDemand * bom.quantityPerUnit;
          const availableSupply = material.onHand + material.inbound;
          const gap = requiredQuantity - availableSupply;
          
          if (gap > 0) {
            // Calculate gap percentage and cost impact
            const gapPercentage = (gap / requiredQuantity) * 100;
            
            gaps.push({
              itemType: "material",
              itemId: material.id,
              itemName: `${material.name} (for ${sku.name})`,
              periodStart: new Date(periodStart),
              periodEnd: new Date(periodEnd),
              demandQuantity: requiredQuantity,
              supplyQuantity: availableSupply,
              gapQuantity: gap,
              gapPercentage,
              regime: latestSnapshot?.regime,
              fdrValue: latestSnapshot?.fdr,
              priority: gapPercentage > 50 ? "critical" : gapPercentage > 25 ? "high" : "medium",
              meetingId,
            });
          }
        }
      }
      
      // Create reconciliation items for detected gaps
      const createdItems = [];
      for (const gap of gaps) {
        const item = await storage.createSopReconciliationItem({
          ...gap,
          companyId: user.companyId,
        });
        createdItems.push(item);
      }
      
      res.json({
        detected: gaps.length,
        items: createdItems,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- S&OP Approval Chains ---
  
  // Get approval chains
  app.get("/api/sop/approval-chains", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const chains = await storage.getSopApprovalChains(user.companyId);
      
      // Get steps for each chain
      const chainsWithSteps = await Promise.all(
        chains.map(async (chain) => {
          const steps = await storage.getSopApprovalSteps(chain.id);
          return { ...chain, steps };
        })
      );
      
      res.json(chainsWithSteps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single approval chain
  app.get("/api/sop/approval-chains/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const chain = await storage.getSopApprovalChain(req.params.id);
      if (!chain) {
        return res.status(404).json({ error: "Approval chain not found" });
      }
      
      const steps = await storage.getSopApprovalSteps(chain.id);
      res.json({ ...chain, steps });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create approval chain
  app.post("/api/sop/approval-chains", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { steps, ...chainData } = req.body;
      
      const validatedData = insertSopApprovalChainSchema.parse({
        ...chainData,
        companyId: user.companyId,
      });
      
      const chain = await storage.createSopApprovalChain(validatedData);
      
      // Create steps if provided
      const createdSteps = [];
      if (steps && Array.isArray(steps)) {
        for (let i = 0; i < steps.length; i++) {
          const stepData = insertSopApprovalStepSchema.parse({
            ...steps[i],
            chainId: chain.id,
            stepOrder: i + 1,
          });
          const step = await storage.createSopApprovalStep(stepData);
          createdSteps.push(step);
        }
      }
      
      res.status(201).json({ ...chain, steps: createdSteps });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update approval chain
  app.patch("/api/sop/approval-chains/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const chain = await storage.updateSopApprovalChain(req.params.id, req.body);
      if (!chain) {
        return res.status(404).json({ error: "Approval chain not found" });
      }
      res.json(chain);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete approval chain
  app.delete("/api/sop/approval-chains/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      await storage.deleteSopApprovalChain(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- S&OP Approval Requests ---
  
  // Get approval requests
  app.get("/api/sop/approvals", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const { status } = req.query;
      const requests = await storage.getSopApprovalRequests(user.companyId, {
        status: status as string,
      });
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single approval request with actions
  app.get("/api/sop/approvals/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const request = await storage.getSopApprovalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      
      const actions = await storage.getSopApprovalActions(request.id);
      const chain = await storage.getSopApprovalChain(request.chainId);
      const steps = chain ? await storage.getSopApprovalSteps(chain.id) : [];
      
      res.json({ ...request, actions, chain: { ...chain, steps } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create approval request
  app.post("/api/sop/approvals", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Get current regime context
      const latestSnapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      const validatedData = insertSopApprovalRequestSchema.parse({
        ...req.body,
        companyId: user.companyId,
        requesterId: userId,
        regime: latestSnapshot?.regime,
        fdrValue: latestSnapshot?.fdr,
      });
      
      const request = await storage.createSopApprovalRequest(validatedData);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Take action on approval request (approve/reject/delegate)
  app.post("/api/sop/approvals/:id/action", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { action, comments, delegatedTo } = req.body;
      
      const request = await storage.getSopApprovalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      
      // Get current step
      const steps = await storage.getSopApprovalSteps(request.chainId);
      const currentStep = steps.find(s => s.stepOrder === request.currentStepOrder);
      
      if (!currentStep) {
        return res.status(400).json({ error: "Invalid approval step" });
      }
      
      // Record the action
      const actionData = insertSopApprovalActionSchema.parse({
        requestId: request.id,
        stepId: currentStep.id,
        approverId: userId,
        action,
        comments,
        delegatedTo,
      });
      
      await storage.createSopApprovalAction(actionData);
      
      // Update request based on action
      let updateData: any = {};
      
      if (action === "approved") {
        // Check if this is the last step
        const nextStep = steps.find(s => s.stepOrder === (request.currentStepOrder || 0) + 1);
        
        if (nextStep) {
          // Move to next step
          updateData = {
            currentStepOrder: nextStep.stepOrder,
            status: "in_progress",
          };
        } else {
          // Final approval
          updateData = {
            status: "approved",
            finalDecision: "approved",
            finalDecisionBy: userId,
            finalDecisionAt: new Date(),
          };
        }
      } else if (action === "rejected") {
        updateData = {
          status: "rejected",
          finalDecision: "rejected",
          finalDecisionBy: userId,
          finalDecisionAt: new Date(),
          finalDecisionNotes: comments,
        };
      }
      
      const updatedRequest = await storage.updateSopApprovalRequest(request.id, updateData);
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get S&OP dashboard summary
  app.get("/api/sop/dashboard", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Get upcoming meetings
      const meetings = await storage.getSopMeetings(user.companyId);
      const upcomingMeetings = meetings.filter(m => 
        m.status === "scheduled" && new Date(m.scheduledStart) > new Date()
      ).slice(0, 5);
      
      const inProgressMeetings = meetings.filter(m => m.status === "in_progress");
      
      // Get open reconciliation items
      const reconciliationItems = await storage.getSopReconciliationItems(user.companyId, { status: "open" });
      const criticalGaps = reconciliationItems.filter(i => i.priority === "critical" || i.priority === "high");
      
      // Get pending approvals
      const approvals = await storage.getSopApprovalRequests(user.companyId, { status: "pending" });
      
      // Get current economic context
      const latestSnapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      res.json({
        meetings: {
          upcoming: upcomingMeetings.length,
          inProgress: inProgressMeetings.length,
          thisWeek: meetings.filter(m => {
            const meetingDate = new Date(m.scheduledStart);
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return meetingDate >= now && meetingDate <= weekFromNow;
          }).length,
          nextMeeting: upcomingMeetings[0] || null,
        },
        reconciliation: {
          openItems: reconciliationItems.length,
          criticalGaps: criticalGaps.length,
          byPriority: {
            critical: reconciliationItems.filter(i => i.priority === "critical").length,
            high: reconciliationItems.filter(i => i.priority === "high").length,
            medium: reconciliationItems.filter(i => i.priority === "medium").length,
            low: reconciliationItems.filter(i => i.priority === "low").length,
          },
        },
        approvals: {
          pending: approvals.length,
          urgent: approvals.filter(a => a.priority === "urgent" || a.priority === "high").length,
        },
        regime: {
          current: latestSnapshot?.regime || "Unknown",
          fdr: latestSnapshot?.fdr || 1.0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =====================================
  // DIGITAL TWIN API ROUTES
  // =====================================
  
  // Digital Twin - Data Feeds
  app.get("/api/digital-twin/data-feeds", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const feeds = await storage.getDigitalTwinDataFeeds(user.companyId);
      res.json(feeds);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/digital-twin/data-feeds", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const validated = insertDigitalTwinDataFeedSchema.parse({
        ...req.body,
        companyId: user.companyId,
      });
      
      const feed = await storage.createDigitalTwinDataFeed(validated);
      res.json(feed);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.patch("/api/digital-twin/data-feeds/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Verify ownership before updating
      const existing = await storage.getDigitalTwinDataFeed(req.params.id);
      if (!existing || existing.companyId !== user.companyId) {
        return res.status(404).json({ error: "Data feed not found" });
      }
      
      // Validate the update data
      const { name, feedType, sourceUrl, refreshInterval, status, connectionConfig, fieldMappings } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (feedType !== undefined) updateData.feedType = feedType;
      if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
      if (refreshInterval !== undefined) updateData.refreshInterval = refreshInterval;
      if (status !== undefined) updateData.status = status;
      if (connectionConfig !== undefined) updateData.connectionConfig = connectionConfig;
      if (fieldMappings !== undefined) updateData.fieldMappings = fieldMappings;
      
      const feed = await storage.updateDigitalTwinDataFeed(req.params.id, updateData);
      res.json(feed);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.delete("/api/digital-twin/data-feeds/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Verify ownership before deleting
      const existing = await storage.getDigitalTwinDataFeed(req.params.id);
      if (!existing || existing.companyId !== user.companyId) {
        return res.status(404).json({ error: "Data feed not found" });
      }
      
      await storage.deleteDigitalTwinDataFeed(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Digital Twin - Snapshots (Live State)
  app.get("/api/digital-twin/snapshots", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const snapshots = await storage.getDigitalTwinSnapshots(user.companyId, limit);
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/digital-twin/snapshots/latest", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const snapshot = await storage.getLatestDigitalTwinSnapshot(user.companyId);
      res.json(snapshot || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Capture a new snapshot (aggregates current state)
  app.post("/api/digital-twin/snapshots/capture", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Gather current state from all sources
      const [skus, materials, suppliers, machinery, allocations, rfqs] = await Promise.all([
        storage.getSkus(user.companyId),
        storage.getMaterials(user.companyId),
        storage.getSuppliers(user.companyId),
        storage.getMachinery(user.companyId),
        storage.getAllocations(user.companyId),
        storage.getRfqs(user.companyId),
      ]);
      
      // Get economic regime
      let economicRegime = "UNKNOWN";
      let fdrValue = 1.0;
      let regimeIntensity = 50;
      try {
        const regimeData = await economics.getCurrentRegime();
        economicRegime = regimeData.regime;
        fdrValue = regimeData.fdr;
        regimeIntensity = regimeData.intensity || 50;
      } catch (e) {
        // Use defaults if economics API fails
      }
      
      // Calculate inventory metrics
      const totalInventoryValue = materials.reduce((sum, m) => sum + (m.onHand * (m.unitCost || 0)), 0);
      const totalInventoryUnits = materials.reduce((sum, m) => sum + m.onHand, 0);
      
      // Calculate production metrics
      const activeMachinery = machinery.filter(m => m.status === "operational" || m.status === "running");
      const avgOee = activeMachinery.length > 0 
        ? activeMachinery.reduce((sum, m) => sum + (m.operatingEfficiency || 0), 0) / activeMachinery.length
        : 0;
      
      // Create snapshot
      const snapshotData = {
        companyId: user.companyId,
        snapshotType: req.body.snapshotType || "full",
        totalInventoryValue,
        totalInventoryUnits,
        activeSkuCount: skus.length,
        activeMaterialCount: materials.length,
        activeSupplierCount: suppliers.length,
        openOrderCount: allocations.filter(a => a.status === "pending").length,
        pendingRfqCount: rfqs.filter(r => r.status === "pending" || r.status === "sent").length,
        activeMachineryCount: activeMachinery.length,
        oeeScore: avgOee,
        economicRegime,
        fdrValue,
        regimeIntensity,
        inventoryState: materials.map(m => ({ id: m.id, name: m.name, onHand: m.onHand, reorderPoint: m.reorderPoint })),
        productionState: machinery.map(m => ({ id: m.id, name: m.name, status: m.status, efficiency: m.operatingEfficiency })),
        supplyState: suppliers.map(s => ({ id: s.id, name: s.name, leadTime: s.leadTime })),
        activeAlertCount: 0,
        criticalAlertCount: 0,
      };
      
      const snapshot = await storage.createDigitalTwinSnapshot(snapshotData);
      res.json(snapshot);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Digital Twin - Natural Language Queries
  app.get("/api/digital-twin/queries", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const queries = await storage.getDigitalTwinQueries(user.companyId, limit);
      res.json(queries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/digital-twin/queries", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const startTime = Date.now();
      const { queryText, queryType = "insight" } = req.body;
      
      if (!queryText) {
        return res.status(400).json({ error: "Query text is required" });
      }
      
      // Parse query intent and generate response
      const parsedIntent = parseQueryIntent(queryText);
      const response = await generateQueryResponse(user.companyId, queryText, parsedIntent);
      
      const processingTime = Date.now() - startTime;
      
      const queryData = {
        companyId: user.companyId,
        userId,
        queryText,
        queryType,
        parsedIntent,
        targetEntities: parsedIntent.entities,
        responseType: response.type,
        responseText: response.text,
        responseData: response.data,
        processingTime,
        dataSourcesUsed: response.sources,
        confidence: response.confidence,
      };
      
      const query = await storage.createDigitalTwinQuery(queryData);
      res.json(query);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Digital Twin - Simulations (What-If Scenarios)
  app.get("/api/digital-twin/simulations", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulations = await storage.getDigitalTwinSimulations(user.companyId);
      res.json(simulations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/digital-twin/simulations/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getDigitalTwinSimulation(req.params.id);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      res.json(simulation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/digital-twin/simulations", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const validated = insertDigitalTwinSimulationSchema.parse({
        ...req.body,
        companyId: user.companyId,
        userId,
        status: "draft",
      });
      
      const simulation = await storage.createDigitalTwinSimulation(validated);
      res.json(simulation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Run a simulation
  app.post("/api/digital-twin/simulations/:id/run", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const simulation = await storage.getDigitalTwinSimulation(req.params.id);
      if (!simulation || simulation.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      // Mark as running
      await storage.updateDigitalTwinSimulation(simulation.id, {
        status: "running",
        startedAt: new Date(),
      });
      
      const startTime = Date.now();
      
      // Run the simulation based on scenario parameters
      const results = await runDigitalTwinSimulation(user.companyId, simulation);
      
      const executionTime = Date.now() - startTime;
      
      // Update with results
      const updated = await storage.updateDigitalTwinSimulation(simulation.id, {
        status: "completed",
        completedAt: new Date(),
        executionTime,
        results,
        totalCostImpact: results.costImpact?.total || 0,
        riskScore: results.riskScore || 0,
        confidenceLevel: results.confidence || 0.8,
        keyFindings: results.keyFindings || [],
        recommendations: results.recommendations || [],
      });
      
      res.json(updated);
    } catch (error: any) {
      // Mark as failed
      await storage.updateDigitalTwinSimulation(req.params.id, {
        status: "failed",
      });
      res.status(400).json({ error: error.message });
    }
  });
  
  app.delete("/api/digital-twin/simulations/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Verify ownership before deleting
      const existing = await storage.getDigitalTwinSimulation(req.params.id);
      if (!existing || existing.companyId !== user.companyId) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      
      await storage.deleteDigitalTwinSimulation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Digital Twin - Alerts
  app.get("/api/digital-twin/alerts", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.severity) filters.severity = req.query.severity;
      if (req.query.category) filters.category = req.query.category;
      
      const alerts = await storage.getDigitalTwinAlerts(user.companyId, filters);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/digital-twin/alerts/:id", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Verify ownership before updating
      const existing = await storage.getDigitalTwinAlert(req.params.id);
      if (!existing || existing.companyId !== user.companyId) {
        return res.status(404).json({ error: "Alert not found" });
      }
      
      const { status, resolution } = req.body;
      
      // Validate status
      const validStatuses = ["active", "acknowledged", "investigating", "resolved", "dismissed"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updates: any = { status };
      if (status === "acknowledged") {
        updates.acknowledgedAt = new Date();
        updates.acknowledgedBy = userId;
      } else if (status === "resolved") {
        updates.resolvedAt = new Date();
        updates.resolvedBy = userId;
        updates.resolution = resolution;
      }
      
      const alert = await storage.updateDigitalTwinAlert(req.params.id, updates);
      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Digital Twin - Metrics
  app.get("/api/digital-twin/metrics", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      const filters: any = {};
      if (req.query.metricName) filters.metricName = req.query.metricName;
      if (req.query.category) filters.category = req.query.category;
      
      const metrics = await storage.getDigitalTwinMetrics(user.companyId, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Digital Twin - Dashboard Summary
  app.get("/api/digital-twin/dashboard", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }
      
      // Get latest snapshot
      const latestSnapshot = await storage.getLatestDigitalTwinSnapshot(user.companyId);
      
      // Get active alerts
      const activeAlerts = await storage.getDigitalTwinAlerts(user.companyId, { status: "active" });
      const criticalAlerts = activeAlerts.filter(a => a.severity === "critical" || a.severity === "emergency");
      
      // Get data feeds status
      const dataFeeds = await storage.getDigitalTwinDataFeeds(user.companyId);
      const activeFeedsCount = dataFeeds.filter(f => f.status === "active").length;
      const errorFeedsCount = dataFeeds.filter(f => f.status === "error").length;
      
      // Get recent simulations
      const simulations = await storage.getDigitalTwinSimulations(user.companyId);
      const recentSimulations = simulations.slice(0, 5);
      
      // Get recent queries
      const queries = await storage.getDigitalTwinQueries(user.companyId, 10);
      
      // Get current economic regime
      let currentRegime = latestSnapshot?.economicRegime || "UNKNOWN";
      let fdr = latestSnapshot?.fdrValue || 1.0;
      try {
        const regimeData = await economics.getCurrentRegime();
        currentRegime = regimeData.regime;
        fdr = regimeData.fdr;
      } catch (e) {
        // Use snapshot data
      }
      
      res.json({
        lastUpdated: latestSnapshot?.capturedAt || null,
        state: {
          inventoryValue: latestSnapshot?.totalInventoryValue || 0,
          inventoryUnits: latestSnapshot?.totalInventoryUnits || 0,
          activeSkus: latestSnapshot?.activeSkuCount || 0,
          activeMaterials: latestSnapshot?.activeMaterialCount || 0,
          activeSuppliers: latestSnapshot?.activeSupplierCount || 0,
          activeMachinery: latestSnapshot?.activeMachineryCount || 0,
          oee: latestSnapshot?.oeeScore || 0,
        },
        alerts: {
          total: activeAlerts.length,
          critical: criticalAlerts.length,
          byCategory: {
            inventory: activeAlerts.filter(a => a.category === "inventory").length,
            production: activeAlerts.filter(a => a.category === "production").length,
            supply: activeAlerts.filter(a => a.category === "supply").length,
            demand: activeAlerts.filter(a => a.category === "demand").length,
          },
        },
        dataFeeds: {
          total: dataFeeds.length,
          active: activeFeedsCount,
          errors: errorFeedsCount,
        },
        regime: {
          current: currentRegime,
          fdr,
        },
        recentSimulations,
        recentQueries: queries,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  
  setupWebSocket(httpServer);
  
  app.get("/api/websocket/status", isAuthenticated, (_req, res) => {
    res.json({
      connected: getConnectedClientCount(),
      status: 'active',
    });
  });
  
  return httpServer;
}

// Helper function to parse natural language query intent
function parseQueryIntent(queryText: string): { intent: string; entities: string[]; timeRange?: any } {
  const text = queryText.toLowerCase();
  let intent = "general";
  const entities: string[] = [];
  
  // Detect intent
  if (text.includes("forecast") || text.includes("predict") || text.includes("will")) {
    intent = "prediction";
  } else if (text.includes("compare") || text.includes("versus") || text.includes("vs")) {
    intent = "comparison";
  } else if (text.includes("why") || text.includes("explain") || text.includes("cause")) {
    intent = "analysis";
  } else if (text.includes("what if") || text.includes("simulate") || text.includes("scenario")) {
    intent = "what_if";
  } else if (text.includes("optimize") || text.includes("improve") || text.includes("reduce")) {
    intent = "optimization";
  } else if (text.includes("alert") || text.includes("warning") || text.includes("issue")) {
    intent = "alert";
  }
  
  // Detect entities
  if (text.includes("inventory") || text.includes("stock")) entities.push("inventory");
  if (text.includes("production") || text.includes("manufacture")) entities.push("production");
  if (text.includes("supplier") || text.includes("vendor")) entities.push("supplier");
  if (text.includes("demand") || text.includes("order") || text.includes("sales")) entities.push("demand");
  if (text.includes("material") || text.includes("raw")) entities.push("material");
  if (text.includes("machine") || text.includes("equipment")) entities.push("machinery");
  if (text.includes("cost") || text.includes("price") || text.includes("budget")) entities.push("financial");
  
  // Default to all entities if none detected
  if (entities.length === 0) {
    entities.push("inventory", "production", "demand");
  }
  
  return { intent, entities };
}

// Helper function to generate query response
async function generateQueryResponse(companyId: string, queryText: string, intent: any): Promise<{
  type: string;
  text: string;
  data: any;
  sources: string[];
  confidence: number;
}> {
  const sources: string[] = [];
  let responseType = "text";
  let responseText = "";
  let responseData: any = {};
  let confidence = 0.85;
  
  // Gather relevant data based on entities
  const [materials, skus, suppliers, machinery] = await Promise.all([
    storage.getMaterials(companyId),
    storage.getSkus(companyId),
    storage.getSuppliers(companyId),
    storage.getMachinery(companyId),
  ]);
  
  sources.push("inventory", "skus", "suppliers", "machinery");
  
  // Generate response based on intent
  if (intent.intent === "prediction") {
    responseType = "chart";
    responseText = `Based on current trends, I project the following: `;
    
    // Simple demand trend analysis
    const totalInventory = materials.reduce((sum, m) => sum + m.onHand, 0);
    const avgReorderPoint = materials.reduce((sum, m) => sum + (m.reorderPoint || 0), 0) / (materials.length || 1);
    
    responseText += `Current inventory levels are at ${totalInventory.toLocaleString()} units. `;
    responseText += `With average reorder points at ${Math.round(avgReorderPoint)} units, you have approximately ${Math.round(totalInventory / avgReorderPoint)} cycles of stock on hand.`;
    
    responseData = {
      inventoryTrend: [
        { period: "Current", value: totalInventory },
        { period: "+1 Week", value: Math.round(totalInventory * 0.92) },
        { period: "+2 Weeks", value: Math.round(totalInventory * 0.84) },
        { period: "+1 Month", value: Math.round(totalInventory * 0.68) },
      ],
    };
  } else if (intent.intent === "optimization") {
    responseType = "recommendation";
    
    // Find optimization opportunities
    const lowStockMaterials = materials.filter(m => m.onHand < (m.reorderPoint || 0));
    const overstockedMaterials = materials.filter(m => m.onHand > (m.reorderPoint || 0) * 3);
    
    responseText = `Optimization Analysis: `;
    responseText += `${lowStockMaterials.length} materials are below reorder point. `;
    responseText += `${overstockedMaterials.length} materials appear overstocked. `;
    
    responseData = {
      recommendations: [
        { action: "Reorder", count: lowStockMaterials.length, priority: "high" },
        { action: "Review Safety Stock", count: overstockedMaterials.length, priority: "medium" },
      ],
      lowStockItems: lowStockMaterials.slice(0, 5).map(m => ({ name: m.name, onHand: m.onHand, reorderPoint: m.reorderPoint })),
    };
    confidence = 0.9;
  } else if (intent.intent === "analysis") {
    responseType = "table";
    
    responseText = `Here's an analysis of your current state: `;
    responseText += `You have ${materials.length} materials, ${skus.length} SKUs, ${suppliers.length} suppliers, and ${machinery.length} machines.`;
    
    responseData = {
      summary: {
        materials: materials.length,
        skus: skus.length,
        suppliers: suppliers.length,
        machinery: machinery.length,
        totalInventoryValue: materials.reduce((sum, m) => sum + (m.onHand * (m.unitCost || 0)), 0),
      },
    };
  } else {
    // General insight
    responseType = "text";
    
    const totalValue = materials.reduce((sum, m) => sum + (m.onHand * (m.unitCost || 0)), 0);
    const activeMachines = machinery.filter(m => m.status === "operational" || m.status === "running").length;
    
    responseText = `Your digital twin shows: `;
    responseText += `$${totalValue.toLocaleString()} in inventory across ${materials.length} materials. `;
    responseText += `${activeMachines} of ${machinery.length} machines are operational. `;
    responseText += `${suppliers.length} active suppliers in your network.`;
    
    responseData = {
      metrics: {
        inventoryValue: totalValue,
        activeMaterials: materials.length,
        activeSuppliers: suppliers.length,
        operationalMachines: activeMachines,
      },
    };
  }
  
  return { type: responseType, text: responseText, data: responseData, sources, confidence };
}

// Helper function to run simulation
async function runDigitalTwinSimulation(companyId: string, simulation: any): Promise<any> {
  const params = simulation.scenarioParams || {};
  const horizonDays = simulation.horizonDays || 90;
  
  // Get current state
  const [materials, suppliers, machinery] = await Promise.all([
    storage.getMaterials(companyId),
    storage.getSuppliers(companyId),
    storage.getMachinery(companyId),
  ]);
  
  // Calculate impacts based on scenario type
  let costImpact = { total: 0, breakdown: {} as any };
  let riskScore = 50;
  let keyFindings: string[] = [];
  let recommendations: any[] = [];
  const timeline: any[] = [];
  
  if (simulation.simulationType === "demand_shock") {
    const demandChange = params.demandChange?.percentage || 20;
    const direction = demandChange > 0 ? "increase" : "decrease";
    
    // Simulate demand change impact
    const inventoryImpact = materials.reduce((sum, m) => sum + (m.onHand * m.unitCost * Math.abs(demandChange) / 100), 0);
    costImpact.total = inventoryImpact;
    costImpact.breakdown = { inventory: inventoryImpact };
    
    riskScore = Math.min(100, Math.abs(demandChange) * 2);
    
    keyFindings = [
      `A ${Math.abs(demandChange)}% demand ${direction} would impact inventory by $${inventoryImpact.toLocaleString()}`,
      `${Math.round(materials.length * Math.abs(demandChange) / 100)} materials would require reorder adjustments`,
    ];
    
    recommendations = [
      { action: "Adjust safety stock levels", priority: "high", expectedSavings: inventoryImpact * 0.1 },
      { action: "Negotiate flexible supplier contracts", priority: "medium" },
    ];
    
  } else if (simulation.simulationType === "supply_disruption") {
    const disruptionDays = params.supplyDisruption?.delayDays || 14;
    
    // Calculate disruption impact
    const affectedMaterials = materials.filter(m => m.onHand < (m.reorderPoint || 0) * 2);
    const disruptionCost = affectedMaterials.reduce((sum, m) => sum + (m.reorderPoint || 0) * (m.unitCost || 0) * 0.5, 0);
    
    costImpact.total = disruptionCost;
    costImpact.breakdown = { expediting: disruptionCost * 0.4, stockouts: disruptionCost * 0.6 };
    
    riskScore = Math.min(100, disruptionDays * 4);
    
    keyFindings = [
      `A ${disruptionDays}-day supply disruption would cost approximately $${disruptionCost.toLocaleString()}`,
      `${affectedMaterials.length} materials are vulnerable to stockouts`,
    ];
    
    recommendations = [
      { action: "Build strategic buffer inventory", priority: "critical" },
      { action: "Identify alternative suppliers", priority: "high" },
      { action: "Implement dual-sourcing strategy", priority: "medium" },
    ];
    
  } else if (simulation.simulationType === "price_change") {
    const priceChange = params.priceChange?.priceChangePercent || 10;
    
    // Calculate price change impact
    const totalInventoryCost = materials.reduce((sum, m) => sum + (m.onHand * (m.unitCost || 0)), 0);
    const priceImpact = totalInventoryCost * priceChange / 100;
    
    costImpact.total = priceImpact;
    costImpact.breakdown = { direct: priceImpact * 0.8, indirect: priceImpact * 0.2 };
    
    riskScore = Math.min(100, Math.abs(priceChange) * 3);
    
    keyFindings = [
      `A ${priceChange}% price ${priceChange > 0 ? "increase" : "decrease"} would impact costs by $${Math.abs(priceImpact).toLocaleString()}`,
    ];
    
    recommendations = priceChange > 0 ? [
      { action: "Lock in current prices with long-term contracts", priority: "high" },
      { action: "Explore substitute materials", priority: "medium" },
    ] : [
      { action: "Increase strategic inventory purchases", priority: "high" },
      { action: "Renegotiate existing contracts", priority: "medium" },
    ];
    
  } else if (simulation.simulationType === "regime_shift") {
    const targetRegime = params.regimeShift?.targetRegime || "IMBALANCED_EXCESS";
    const signals = calculateSignalsForRegime(targetRegime);
    
    riskScore = targetRegime === "IMBALANCED_EXCESS" ? 80 : targetRegime === "ASSET_LED_GROWTH" ? 60 : 40;
    
    keyFindings = [
      `A shift to ${targetRegime} regime would trigger ${signals.length} policy signal changes`,
      `Procurement strategy should shift to: ${signals.find(s => s.type === "procurement")?.action || "review"}`,
    ];
    
    recommendations = signals.map(s => ({
      action: s.description,
      priority: s.type === "procurement" ? "high" : "medium",
      category: s.type,
    }));
  }
  
  // Generate timeline
  for (let day = 0; day <= horizonDays; day += Math.ceil(horizonDays / 10)) {
    timeline.push({
      day,
      cumulativeImpact: costImpact.total * (day / horizonDays),
      riskLevel: Math.min(100, riskScore * (0.5 + (day / horizonDays) * 0.5)),
    });
  }
  
  return {
    costImpact,
    riskScore,
    confidence: 0.85,
    keyFindings,
    recommendations,
    timeline,
    inventoryImpact: { affected: materials.filter(m => m.onHand < (m.reorderPoint || 0)).length },
    productionImpact: { capacityUtilization: machinery.filter(m => m.status === "operational").length / (machinery.length || 1) * 100 },
  };
}
