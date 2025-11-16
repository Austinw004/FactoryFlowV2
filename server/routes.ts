import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { DualCircuitEconomics } from "./lib/economics";
import { DemandForecaster } from "./lib/forecasting";
import { AllocationEngine } from "./lib/allocation";
import {
  insertSkuSchema,
  updateSkuSchema,
  insertMaterialSchema,
  updateMaterialSchema,
  insertBomSchema,
  insertSupplierSchema,
  insertSupplierMaterialSchema,
  insertDemandHistorySchema,
} from "@shared/schema";

const economics = new DualCircuitEconomics();

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

  // Economic regime endpoint (public for now)
  app.get("/api/economics/regime", async (_req, res) => {
    try {
      await economics.fetch();
      res.json({
        regime: economics.regime,
        fdr: economics.fdr,
        data: economics.data,
        signals: economics.signals(),
      });
    } catch (error: any) {
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

  // Run allocation
  app.post("/api/allocations/run", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.companyId) {
        return res.status(400).json({ error: "User not associated with a company" });
      }

      const { budget, name, budgetDurationValue, budgetDurationUnit, horizonStart } = req.body;
      
      if (!budget) {
        return res.status(400).json({ error: "budget is required" });
      }

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

      // Build supplier terms map
      const supplierTerms: Record<string, any> = {};
      for (const supplier of suppliers) {
        const sms = await storage.getSupplierMaterials(supplier.id);
        for (const sm of sms) {
          const material = materials.find(m => m.id === sm.materialId);
          if (material) {
            supplierTerms[material.code] = {
              unit_cost: sm.unitCost,
              lead_time_days: sm.leadTimeDays,
            };
          }
        }
      }

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

      // Run allocation engine
      const engine = new AllocationEngine(bomMap, onHand, inbound, budget, supplierTerms);
      const plan = engine.plan(forecastBySku, signals, priorityBySku);

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

  const httpServer = createServer(app);
  return httpServer;
}
