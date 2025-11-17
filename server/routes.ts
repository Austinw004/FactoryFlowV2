import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { DualCircuitEconomics } from "./lib/economics";
import { DemandForecaster } from "./lib/forecasting";
import { AllocationEngine } from "./lib/allocation";
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

  const httpServer = createServer(app);
  return httpServer;
}
