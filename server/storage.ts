import { db } from "@db";
import { eq, and } from "drizzle-orm";
import type { 
  User, InsertUser, UpsertUser, Company, InsertCompany, Sku, InsertSku,
  Material, InsertMaterial, Bom, InsertBom, Supplier, InsertSupplier,
  SupplierMaterial, InsertSupplierMaterial, DemandHistory, InsertDemandHistory,
  Allocation, InsertAllocation, AllocationResult, InsertAllocationResult,
  PriceAlert, InsertPriceAlert, Machinery, InsertMachinery,
  MaintenanceRecord, InsertMaintenanceRecord,
  ComplianceDocument, InsertComplianceDocument,
  ComplianceAudit, InsertComplianceAudit,
  ProductionRun, InsertProductionRun,
  ProductionMetric, InsertProductionMetric,
  DowntimeEvent, InsertDowntimeEvent,
  ProductionBottleneck, InsertProductionBottleneck,
  EquipmentSensor, InsertEquipmentSensor,
  SensorReading, InsertSensorReading,
  MaintenanceAlert, InsertMaintenanceAlert,
  MaintenancePrediction, InsertMaintenancePrediction,
  InventoryOptimization, InsertInventoryOptimization,
  DemandPrediction, InsertDemandPrediction,
  InventoryRecommendation, InsertInventoryRecommendation,
  MaterialBatch, InsertMaterialBatch,
  TraceabilityEvent, InsertTraceabilityEvent,
  SupplierChainLink, InsertSupplierChainLink,
  Employee, InsertEmployee,
  WorkShift, InsertWorkShift,
  SkillRequirement, InsertSkillRequirement,
  StaffAssignment, InsertStaffAssignment
} from "@shared/schema";
import { 
  users, companies, skus, materials, boms, suppliers, supplierMaterials,
  demandHistory, allocations, allocationResults, priceAlerts, machinery, maintenanceRecords,
  complianceDocuments, complianceAudits, complianceRegulations,
  productionRuns, productionMetrics, downtimeEvents, productionBottlenecks,
  equipmentSensors, sensorReadings, maintenanceAlerts, maintenancePredictions,
  inventoryOptimizations, demandPredictions, inventoryRecommendations,
  materialBatches, traceabilityEvents, supplierChainLinks,
  employees, workShifts, skillRequirements, staffAssignments
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Companies
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // SKUs
  getSkus(companyId: string): Promise<Sku[]>;
  getSku(id: string): Promise<Sku | undefined>;
  createSku(sku: InsertSku): Promise<Sku>;
  updateSku(id: string, sku: Partial<InsertSku>): Promise<Sku | undefined>;
  deleteSku(id: string): Promise<void>;
  
  // Materials
  getMaterials(companyId: string): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: string): Promise<void>;
  
  // BOMs
  getBomsForSku(skuId: string): Promise<Bom[]>;
  createBom(bom: InsertBom): Promise<Bom>;
  deleteBom(skuId: string, materialId: string): Promise<void>;
  
  // Suppliers
  getSuppliers(companyId: string): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  
  // Supplier Materials
  getSupplierMaterials(supplierId: string): Promise<SupplierMaterial[]>;
  createSupplierMaterial(sm: InsertSupplierMaterial): Promise<SupplierMaterial>;
  
  // Demand History
  getDemandHistory(skuId: string): Promise<DemandHistory[]>;
  createDemandHistory(dh: InsertDemandHistory): Promise<DemandHistory>;
  bulkCreateDemandHistory(dhs: InsertDemandHistory[]): Promise<void>;
  
  // Allocations
  getAllocations(companyId: string): Promise<Allocation[]>;
  getAllocation(id: string): Promise<Allocation | undefined>;
  createAllocation(allocation: InsertAllocation): Promise<Allocation>;
  
  // Allocation Results
  getAllocationResults(allocationId: string): Promise<AllocationResult[]>;
  createAllocationResult(result: InsertAllocationResult): Promise<AllocationResult>;
  bulkCreateAllocationResults(results: InsertAllocationResult[]): Promise<void>;
  
  // Price Alerts
  getPriceAlerts(companyId: string): Promise<PriceAlert[]>;
  getPriceAlert(id: string): Promise<PriceAlert | undefined>;
  getActivePriceAlerts(): Promise<PriceAlert[]>;
  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  updatePriceAlert(id: string, alert: Partial<InsertPriceAlert>): Promise<PriceAlert | undefined>;
  deletePriceAlert(id: string): Promise<void>;
  
  // Machinery
  getMachinery(companyId: string): Promise<Machinery[]>;
  getMachine(id: string): Promise<Machinery | undefined>;
  createMachine(machine: InsertMachinery): Promise<Machinery>;
  updateMachine(id: string, machine: Partial<InsertMachinery>): Promise<Machinery | undefined>;
  deleteMachine(id: string): Promise<void>;
  
  // Maintenance Records
  getMaintenanceRecords(machineryId: string): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  
  // Compliance Documents
  getComplianceDocuments(companyId: string): Promise<ComplianceDocument[]>;
  createComplianceDocument(doc: InsertComplianceDocument): Promise<ComplianceDocument>;
  
  // Compliance Regulations
  getComplianceRegulations(companyId: string): Promise<any[]>;
  createComplianceRegulation(regulation: any): Promise<any>;
  
  // Compliance Audits
  getComplianceAudits(companyId: string): Promise<ComplianceAudit[]>;
  createComplianceAudit(audit: InsertComplianceAudit): Promise<ComplianceAudit>;
  
  // Production Runs
  getProductionRuns(companyId: string): Promise<ProductionRun[]>;
  createProductionRun(run: InsertProductionRun): Promise<ProductionRun>;
  updateProductionRun(id: string, run: Partial<InsertProductionRun>): Promise<ProductionRun>;
  
  // Production Metrics
  getProductionMetrics(companyId: string): Promise<ProductionMetric[]>;
  createProductionMetric(metric: InsertProductionMetric): Promise<ProductionMetric>;
  
  // Downtime Events
  getDowntimeEvents(companyId: string): Promise<DowntimeEvent[]>;
  createDowntimeEvent(event: InsertDowntimeEvent): Promise<DowntimeEvent>;
  
  // Production Bottlenecks
  getProductionBottlenecks(companyId: string): Promise<ProductionBottleneck[]>;
  createProductionBottleneck(bottleneck: InsertProductionBottleneck): Promise<ProductionBottleneck>;
  
  // Predictive Maintenance & IoT Sensors
  getEquipmentSensors(companyId: string): Promise<EquipmentSensor[]>;
  getEquipmentSensorsByMachinery(machineryId: string): Promise<EquipmentSensor[]>;
  createEquipmentSensor(sensor: InsertEquipmentSensor): Promise<EquipmentSensor>;
  getSensorReadings(sensorId: string, limit?: number): Promise<SensorReading[]>;
  createSensorReading(reading: InsertSensorReading): Promise<SensorReading>;
  getMaintenanceAlerts(companyId: string): Promise<MaintenanceAlert[]>;
  createMaintenanceAlert(alert: InsertMaintenanceAlert): Promise<MaintenanceAlert>;
  getMaintenancePredictions(companyId: string): Promise<MaintenancePrediction[]>;
  createMaintenancePrediction(prediction: InsertMaintenancePrediction): Promise<MaintenancePrediction>;
  
  // AI Inventory Optimization
  getInventoryOptimizations(companyId: string): Promise<InventoryOptimization[]>;
  createInventoryOptimization(optimization: InsertInventoryOptimization): Promise<InventoryOptimization>;
  getDemandPredictions(companyId: string): Promise<DemandPrediction[]>;
  createDemandPrediction(prediction: InsertDemandPrediction): Promise<DemandPrediction>;
  getInventoryRecommendations(companyId: string): Promise<InventoryRecommendation[]>;
  createInventoryRecommendation(recommendation: InsertInventoryRecommendation): Promise<InventoryRecommendation>;
  
  // Supply Chain Traceability
  getMaterialBatches(companyId: string): Promise<MaterialBatch[]>;
  createMaterialBatch(batch: InsertMaterialBatch): Promise<MaterialBatch>;
  getTraceabilityEvents(companyId: string): Promise<TraceabilityEvent[]>;
  getTraceabilityEventsByBatch(batchId: string): Promise<TraceabilityEvent[]>;
  createTraceabilityEvent(event: InsertTraceabilityEvent): Promise<TraceabilityEvent>;
  getSupplierChainLinks(companyId: string): Promise<SupplierChainLink[]>;
  createSupplierChainLink(link: InsertSupplierChainLink): Promise<SupplierChainLink>;
  
  // Workforce Scheduling
  getEmployees(companyId: string): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getWorkShifts(companyId: string): Promise<WorkShift[]>;
  createWorkShift(shift: InsertWorkShift): Promise<WorkShift>;
  getSkillRequirements(companyId: string): Promise<SkillRequirement[]>;
  createSkillRequirement(requirement: InsertSkillRequirement): Promise<SkillRequirement>;
  getStaffAssignments(companyId: string): Promise<StaffAssignment[]>;
  getStaffAssignmentsByShift(shiftId: string): Promise<StaffAssignment[]>;
  createStaffAssignment(assignment: InsertStaffAssignment): Promise<StaffAssignment>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async getSkus(companyId: string): Promise<Sku[]> {
    return db.select().from(skus).where(eq(skus.companyId, companyId));
  }

  async getSku(id: string): Promise<Sku | undefined> {
    const [sku] = await db.select().from(skus).where(eq(skus.id, id));
    return sku;
  }

  async createSku(insertSku: InsertSku): Promise<Sku> {
    const [sku] = await db.insert(skus).values(insertSku).returning();
    return sku;
  }

  async updateSku(id: string, updateData: Partial<InsertSku>): Promise<Sku | undefined> {
    const [sku] = await db.update(skus).set(updateData).where(eq(skus.id, id)).returning();
    return sku;
  }

  async deleteSku(id: string): Promise<void> {
    await db.delete(skus).where(eq(skus.id, id));
  }

  async getMaterials(companyId: string): Promise<Material[]> {
    return db.select().from(materials).where(eq(materials.companyId, companyId));
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db.insert(materials).values(insertMaterial).returning();
    return material;
  }

  async updateMaterial(id: string, updateData: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [material] = await db.update(materials).set(updateData).where(eq(materials.id, id)).returning();
    return material;
  }

  async deleteMaterial(id: string): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  async getBomsForSku(skuId: string): Promise<Bom[]> {
    return db.select().from(boms).where(eq(boms.skuId, skuId));
  }

  async createBom(insertBom: InsertBom): Promise<Bom> {
    const [bom] = await db.insert(boms).values(insertBom).returning();
    return bom;
  }

  async deleteBom(skuId: string, materialId: string): Promise<void> {
    await db.delete(boms).where(and(eq(boms.skuId, skuId), eq(boms.materialId, materialId)));
  }

  async getSuppliers(companyId: string): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async getSupplierMaterials(supplierId: string): Promise<SupplierMaterial[]> {
    return db.select().from(supplierMaterials).where(eq(supplierMaterials.supplierId, supplierId));
  }

  async createSupplierMaterial(insertSm: InsertSupplierMaterial): Promise<SupplierMaterial> {
    const [sm] = await db.insert(supplierMaterials).values(insertSm).returning();
    return sm;
  }

  async getDemandHistory(skuId: string): Promise<DemandHistory[]> {
    return db.select().from(demandHistory).where(eq(demandHistory.skuId, skuId));
  }

  async createDemandHistory(insertDh: InsertDemandHistory): Promise<DemandHistory> {
    const [dh] = await db.insert(demandHistory).values(insertDh).returning();
    return dh;
  }

  async bulkCreateDemandHistory(dhs: InsertDemandHistory[]): Promise<void> {
    if (dhs.length > 0) {
      await db.insert(demandHistory).values(dhs);
    }
  }

  async getAllocations(companyId: string): Promise<Allocation[]> {
    return db.select().from(allocations).where(eq(allocations.companyId, companyId)).orderBy(allocations.createdAt);
  }

  async getAllocation(id: string): Promise<Allocation | undefined> {
    const [allocation] = await db.select().from(allocations).where(eq(allocations.id, id));
    return allocation;
  }

  async createAllocation(insertAllocation: InsertAllocation): Promise<Allocation> {
    const [allocation] = await db.insert(allocations).values(insertAllocation).returning();
    return allocation;
  }

  async getAllocationResults(allocationId: string): Promise<AllocationResult[]> {
    return db.select().from(allocationResults).where(eq(allocationResults.allocationId, allocationId));
  }

  async createAllocationResult(insertResult: InsertAllocationResult): Promise<AllocationResult> {
    const [result] = await db.insert(allocationResults).values(insertResult).returning();
    return result;
  }

  async bulkCreateAllocationResults(results: InsertAllocationResult[]): Promise<void> {
    if (results.length > 0) {
      await db.insert(allocationResults).values(results);
    }
  }

  // Price Alert methods
  async getPriceAlerts(companyId: string): Promise<PriceAlert[]> {
    return db.select().from(priceAlerts).where(eq(priceAlerts.companyId, companyId));
  }

  async getPriceAlert(id: string): Promise<PriceAlert | undefined> {
    const [alert] = await db.select().from(priceAlerts).where(eq(priceAlerts.id, id));
    return alert;
  }

  async getActivePriceAlerts(): Promise<PriceAlert[]> {
    return db.select().from(priceAlerts).where(eq(priceAlerts.isActive, 1));
  }

  async createPriceAlert(insertAlert: InsertPriceAlert): Promise<PriceAlert> {
    const [alert] = await db.insert(priceAlerts).values(insertAlert).returning();
    return alert;
  }

  async updatePriceAlert(id: string, updateData: Partial<InsertPriceAlert>): Promise<PriceAlert | undefined> {
    const [alert] = await db.update(priceAlerts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(priceAlerts.id, id))
      .returning();
    return alert;
  }

  async deletePriceAlert(id: string): Promise<void> {
    await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
  }

  // Machinery methods
  async getMachinery(companyId: string): Promise<Machinery[]> {
    return db.select().from(machinery).where(eq(machinery.companyId, companyId));
  }

  async getMachine(id: string): Promise<Machinery | undefined> {
    const [machine] = await db.select().from(machinery).where(eq(machinery.id, id));
    return machine;
  }

  async createMachine(insertMachine: InsertMachinery): Promise<Machinery> {
    const [machine] = await db.insert(machinery).values(insertMachine).returning();
    return machine;
  }

  async updateMachine(id: string, updateData: Partial<InsertMachinery>): Promise<Machinery | undefined> {
    const [machine] = await db.update(machinery)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(machinery.id, id))
      .returning();
    return machine;
  }

  async deleteMachine(id: string): Promise<void> {
    await db.delete(machinery).where(eq(machinery.id, id));
  }

  // Maintenance Record methods
  async getMaintenanceRecords(machineryId: string): Promise<MaintenanceRecord[]> {
    return db.select().from(maintenanceRecords).where(eq(maintenanceRecords.machineryId, machineryId));
  }

  async createMaintenanceRecord(insertRecord: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [record] = await db.insert(maintenanceRecords).values(insertRecord).returning();
    return record;
  }

  // Compliance Document methods
  async getComplianceDocuments(companyId: string): Promise<ComplianceDocument[]> {
    return db.select().from(complianceDocuments).where(eq(complianceDocuments.companyId, companyId));
  }

  async createComplianceDocument(insertDoc: InsertComplianceDocument): Promise<ComplianceDocument> {
    const [doc] = await db.insert(complianceDocuments).values(insertDoc).returning();
    return doc;
  }

  // Compliance Regulation methods
  async getComplianceRegulations(companyId: string): Promise<any[]> {
    return db.select().from(complianceRegulations).where(eq(complianceRegulations.companyId, companyId));
  }

  async createComplianceRegulation(insertReg: any): Promise<any> {
    const [regulation] = await db.insert(complianceRegulations).values(insertReg).returning();
    return regulation;
  }

  // Compliance Audit methods
  async getComplianceAudits(companyId: string): Promise<ComplianceAudit[]> {
    return db.select().from(complianceAudits).where(eq(complianceAudits.companyId, companyId));
  }

  async createComplianceAudit(insertAudit: InsertComplianceAudit): Promise<ComplianceAudit> {
    const [audit] = await db.insert(complianceAudits).values(insertAudit).returning();
    return audit;
  }

  // Production Run methods
  async getProductionRuns(companyId: string): Promise<ProductionRun[]> {
    return db.select().from(productionRuns).where(eq(productionRuns.companyId, companyId));
  }

  async createProductionRun(insertRun: InsertProductionRun): Promise<ProductionRun> {
    const [run] = await db.insert(productionRuns).values(insertRun).returning();
    return run;
  }

  async updateProductionRun(id: string, updateData: Partial<InsertProductionRun>): Promise<ProductionRun> {
    const [run] = await db.update(productionRuns).set(updateData).where(eq(productionRuns.id, id)).returning();
    return run;
  }

  // Production Metric methods
  async getProductionMetrics(companyId: string): Promise<ProductionMetric[]> {
    return db.select().from(productionMetrics).where(eq(productionMetrics.companyId, companyId));
  }

  async createProductionMetric(insertMetric: InsertProductionMetric): Promise<ProductionMetric> {
    const [metric] = await db.insert(productionMetrics).values(insertMetric).returning();
    return metric;
  }

  // Downtime Event methods
  async getDowntimeEvents(companyId: string): Promise<DowntimeEvent[]> {
    return db.select().from(downtimeEvents).where(eq(downtimeEvents.companyId, companyId));
  }

  async createDowntimeEvent(insertEvent: InsertDowntimeEvent): Promise<DowntimeEvent> {
    const [event] = await db.insert(downtimeEvents).values(insertEvent).returning();
    return event;
  }

  // Production Bottleneck methods
  async getProductionBottlenecks(companyId: string): Promise<ProductionBottleneck[]> {
    return db.select().from(productionBottlenecks).where(eq(productionBottlenecks.companyId, companyId));
  }

  async createProductionBottleneck(insertBottleneck: InsertProductionBottleneck): Promise<ProductionBottleneck> {
    const [bottleneck] = await db.insert(productionBottlenecks).values(insertBottleneck).returning();
    return bottleneck;
  }

  // Predictive Maintenance & IoT Sensors methods
  async getEquipmentSensors(companyId: string): Promise<EquipmentSensor[]> {
    return db.select().from(equipmentSensors).where(eq(equipmentSensors.companyId, companyId));
  }

  async getEquipmentSensorsByMachinery(machineryId: string): Promise<EquipmentSensor[]> {
    return db.select().from(equipmentSensors).where(eq(equipmentSensors.machineryId, machineryId));
  }

  async createEquipmentSensor(insertSensor: InsertEquipmentSensor): Promise<EquipmentSensor> {
    const [sensor] = await db.insert(equipmentSensors).values(insertSensor).returning();
    return sensor;
  }

  async getSensorReadings(sensorId: string, limit: number = 100): Promise<SensorReading[]> {
    return db.select().from(sensorReadings).where(eq(sensorReadings.sensorId, sensorId)).limit(limit);
  }

  async createSensorReading(insertReading: InsertSensorReading): Promise<SensorReading> {
    const [reading] = await db.insert(sensorReadings).values(insertReading).returning();
    return reading;
  }

  async getMaintenanceAlerts(companyId: string): Promise<MaintenanceAlert[]> {
    return db.select().from(maintenanceAlerts).where(eq(maintenanceAlerts.companyId, companyId));
  }

  async createMaintenanceAlert(insertAlert: InsertMaintenanceAlert): Promise<MaintenanceAlert> {
    const [alert] = await db.insert(maintenanceAlerts).values(insertAlert).returning();
    return alert;
  }

  async getMaintenancePredictions(companyId: string): Promise<MaintenancePrediction[]> {
    return db.select().from(maintenancePredictions).where(eq(maintenancePredictions.companyId, companyId));
  }

  async createMaintenancePrediction(insertPrediction: InsertMaintenancePrediction): Promise<MaintenancePrediction> {
    const [prediction] = await db.insert(maintenancePredictions).values(insertPrediction).returning();
    return prediction;
  }

  async updateMaintenanceAlert(id: string, updates: Partial<MaintenanceAlert>): Promise<MaintenanceAlert> {
    const [alert] = await db.update(maintenanceAlerts).set(updates).where(eq(maintenanceAlerts.id, id)).returning();
    return alert;
  }

  // AI Inventory Optimization methods
  async getInventoryOptimizations(companyId: string): Promise<InventoryOptimization[]> {
    return db.select().from(inventoryOptimizations).where(eq(inventoryOptimizations.companyId, companyId));
  }

  async createInventoryOptimization(insertOptimization: InsertInventoryOptimization): Promise<InventoryOptimization> {
    const [optimization] = await db.insert(inventoryOptimizations).values(insertOptimization).returning();
    return optimization;
  }

  async getDemandPredictions(companyId: string): Promise<DemandPrediction[]> {
    return db.select().from(demandPredictions).where(eq(demandPredictions.companyId, companyId));
  }

  async createDemandPrediction(insertPrediction: InsertDemandPrediction): Promise<DemandPrediction> {
    const [prediction] = await db.insert(demandPredictions).values(insertPrediction).returning();
    return prediction;
  }

  async getInventoryRecommendations(companyId: string): Promise<InventoryRecommendation[]> {
    return db.select().from(inventoryRecommendations).where(eq(inventoryRecommendations.companyId, companyId));
  }

  async createInventoryRecommendation(insertRecommendation: InsertInventoryRecommendation): Promise<InventoryRecommendation> {
    const [recommendation] = await db.insert(inventoryRecommendations).values(insertRecommendation).returning();
    return recommendation;
  }

  async updateInventoryRecommendation(id: string, updates: Partial<InventoryRecommendation>): Promise<InventoryRecommendation> {
    const [recommendation] = await db.update(inventoryRecommendations).set(updates).where(eq(inventoryRecommendations.id, id)).returning();
    return recommendation;
  }

  // Supply Chain Traceability methods
  async getMaterialBatches(companyId: string): Promise<MaterialBatch[]> {
    return db.select().from(materialBatches).where(eq(materialBatches.companyId, companyId));
  }

  async createMaterialBatch(insertBatch: InsertMaterialBatch): Promise<MaterialBatch> {
    const [batch] = await db.insert(materialBatches).values(insertBatch).returning();
    return batch;
  }

  async getTraceabilityEvents(companyId: string): Promise<TraceabilityEvent[]> {
    return db.select().from(traceabilityEvents).where(eq(traceabilityEvents.companyId, companyId));
  }

  async getTraceabilityEventsByBatch(batchId: string): Promise<TraceabilityEvent[]> {
    return db.select().from(traceabilityEvents).where(eq(traceabilityEvents.batchId, batchId));
  }

  async createTraceabilityEvent(insertEvent: InsertTraceabilityEvent): Promise<TraceabilityEvent> {
    const [event] = await db.insert(traceabilityEvents).values(insertEvent).returning();
    return event;
  }

  async getSupplierChainLinks(companyId: string): Promise<SupplierChainLink[]> {
    return db.select().from(supplierChainLinks).where(eq(supplierChainLinks.companyId, companyId));
  }

  async createSupplierChainLink(insertLink: InsertSupplierChainLink): Promise<SupplierChainLink> {
    const [link] = await db.insert(supplierChainLinks).values(insertLink).returning();
    return link;
  }

  // Workforce Scheduling methods
  async getEmployees(companyId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.companyId, companyId));
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(insertEmployee).returning();
    return employee;
  }

  async getWorkShifts(companyId: string): Promise<WorkShift[]> {
    return db.select().from(workShifts).where(eq(workShifts.companyId, companyId));
  }

  async createWorkShift(insertShift: InsertWorkShift): Promise<WorkShift> {
    const [shift] = await db.insert(workShifts).values(insertShift).returning();
    return shift;
  }

  async getSkillRequirements(companyId: string): Promise<SkillRequirement[]> {
    return db.select().from(skillRequirements).where(eq(skillRequirements.companyId, companyId));
  }

  async createSkillRequirement(insertRequirement: InsertSkillRequirement): Promise<SkillRequirement> {
    const [requirement] = await db.insert(skillRequirements).values(insertRequirement).returning();
    return requirement;
  }

  async getStaffAssignments(companyId: string): Promise<StaffAssignment[]> {
    const results = await db
      .select()
      .from(staffAssignments)
      .innerJoin(workShifts, eq(staffAssignments.shiftId, workShifts.id))
      .where(eq(workShifts.companyId, companyId));
    return results.map(r => r.staff_assignments);
  }

  async getStaffAssignmentsByShift(shiftId: string): Promise<StaffAssignment[]> {
    return db.select().from(staffAssignments).where(eq(staffAssignments.shiftId, shiftId));
  }

  async createStaffAssignment(insertAssignment: InsertStaffAssignment): Promise<StaffAssignment> {
    const [assignment] = await db.insert(staffAssignments).values(insertAssignment).returning();
    return assignment;
  }
}

export const storage = new DbStorage();
