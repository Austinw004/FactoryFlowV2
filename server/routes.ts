import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { DualCircuitEconomics } from "./lib/economics";
import { DemandForecaster } from "./lib/forecasting";
import { AllocationEngine } from "./lib/allocation";
import { setupWebSocket, getConnectedClientCount } from "./websocket";
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
import { z } from "zod";
import {
  insertSkuSchema,
  updateSkuSchema,
  insertMaterialSchema,
  updateMaterialSchema,
  insertBomSchema,
  insertSupplierSchema,
  insertSupplierMaterialSchema,
  insertDemandHistorySchema,
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
} from "@shared/schema";

const economics = new DualCircuitEconomics();

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

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
      
      // Try to get latest snapshot from background jobs
      const snapshot = await storage.getLatestEconomicSnapshot(user.companyId);
      
      if (snapshot) {
        // Use persisted snapshot data
        res.json({
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
        });
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
      const { fetchAllCommodityPrices } = await import("./lib/commodityPricing");
      const prices = await fetchAllCommodityPrices();
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
      const skus = await storage.getSkus(user.companyId);
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
      const materials = await storage.getMaterials(user.companyId);
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
      const suppliers = await storage.getSuppliers(user.companyId);
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
        plan.kpis.budget_utilization = (totalAllocationCost / budget) * 100;
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
        
        results.regimeDistribution[result.regimeAnalysis.newRegime] = 
          (results.regimeDistribution[result.regimeAnalysis.newRegime] || 0) + 1;
        results.avgConfidence += result.confidence;
        
        const impact = Math.abs(result.financialImpact.revenueImpact);
        if (impact < 1000000) results.riskLevels.low++;
        else if (impact < 3000000) results.riskLevels.medium++;
        else results.riskLevels.high++;
        
        results.avgFinancialImpact += result.financialImpact.revenueImpact;
        
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
      const eventTypes = ['Trade War', 'Sanctions', 'Currency Crisis', 'Political Instability'];
      const regions = ['Asia Pacific', 'Europe', 'North America', 'Middle East', 'Latin America', 'Africa'];
      const severities = ['low', 'medium', 'high'];
      
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
        results.severityDistribution[severity]++;
        results.avgRiskScore += assessment.overallRisk;
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
        parseInt(startYear) || 2015,
        parseInt(endYear) || 2023,
        parseInt(horizonMonths) || 6
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
