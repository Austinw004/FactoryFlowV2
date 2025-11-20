import { db } from "@db";
import { eq, and, sql } from "drizzle-orm";
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
  StaffAssignment, InsertStaffAssignment,
  EmployeePayroll, InsertEmployeePayroll,
  EmployeeBenefit, InsertEmployeeBenefit,
  EmployeeTimeOff, InsertEmployeeTimeOff,
  EmployeePtoBalance, InsertEmployeePtoBalance,
  EmployeeDocument, InsertEmployeeDocument,
  EmployeePerformanceReview, InsertEmployeePerformanceReview,
  EmployeeEmergencyContact, InsertEmployeeEmergencyContact,
  PurchaseOrder, InsertPurchaseOrder, UpdatePurchaseOrder,
  MaterialUsageTracking, InsertMaterialUsageTracking,
  ProcurementSchedule, InsertProcurementSchedule,
  AutoPurchaseRecommendation, InsertAutoPurchaseRecommendation,
  EconomicSnapshot, InsertEconomicSnapshot,
  HistoricalPrediction, InsertHistoricalPrediction,
  PredictionAccuracyMetrics, InsertPredictionAccuracyMetrics,
  ModelComparison, InsertModelComparison,
  MachineryPrediction, InsertMachineryPrediction,
  WorkforcePrediction, InsertWorkforcePrediction
} from "@shared/schema";
import { 
  users, companies, skus, materials, boms, suppliers, supplierMaterials,
  demandHistory, allocations, allocationResults, priceAlerts, machinery, maintenanceRecords,
  complianceDocuments, complianceAudits, complianceRegulations,
  productionRuns, productionMetrics, downtimeEvents, productionBottlenecks,
  equipmentSensors, sensorReadings, maintenanceAlerts, maintenancePredictions,
  inventoryOptimizations, demandPredictions, inventoryRecommendations,
  materialBatches, traceabilityEvents, supplierChainLinks,
  employees, workShifts, skillRequirements, staffAssignments,
  employeePayroll, employeeBenefits, employeeTimeOff, employeePtoBalances,
  employeeDocuments, employeePerformanceReviews, employeeEmergencyContacts,
  purchaseOrders, materialUsageTracking, procurementSchedules, autoPurchaseRecommendations,
  economicSnapshots, historicalPredictions, predictionAccuracyMetrics,
  modelComparisons, machineryPredictions, workforcePredictions
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
  getEmployeeForCompany(employeeId: string, companyId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getWorkShifts(companyId: string): Promise<WorkShift[]>;
  createWorkShift(shift: InsertWorkShift): Promise<WorkShift>;
  getSkillRequirements(companyId: string): Promise<SkillRequirement[]>;
  createSkillRequirement(requirement: InsertSkillRequirement): Promise<SkillRequirement>;
  getStaffAssignments(companyId: string): Promise<StaffAssignment[]>;
  getStaffAssignmentsByShift(shiftId: string): Promise<StaffAssignment[]>;
  createStaffAssignment(assignment: InsertStaffAssignment): Promise<StaffAssignment>;
  
  // Employee Payroll
  getEmployeePayroll(companyId: string): Promise<EmployeePayroll[]>;
  getEmployeePayrollByEmployee(employeeId: string): Promise<EmployeePayroll | undefined>;
  createEmployeePayroll(payroll: InsertEmployeePayroll): Promise<EmployeePayroll>;
  updateEmployeePayroll(id: string, payroll: Partial<InsertEmployeePayroll>): Promise<EmployeePayroll | undefined>;
  
  // Employee Benefits
  getEmployeeBenefits(companyId: string): Promise<EmployeeBenefit[]>;
  getEmployeeBenefitsByEmployee(employeeId: string): Promise<EmployeeBenefit | undefined>;
  createEmployeeBenefits(benefits: InsertEmployeeBenefit): Promise<EmployeeBenefit>;
  updateEmployeeBenefits(id: string, benefits: Partial<InsertEmployeeBenefit>): Promise<EmployeeBenefit | undefined>;
  
  // Employee Time Off
  getEmployeeTimeOffRequests(companyId: string): Promise<EmployeeTimeOff[]>;
  getEmployeeTimeOffByEmployee(employeeId: string): Promise<EmployeeTimeOff[]>;
  createEmployeeTimeOff(timeOff: InsertEmployeeTimeOff): Promise<EmployeeTimeOff>;
  updateEmployeeTimeOff(id: string, timeOff: Partial<InsertEmployeeTimeOff>): Promise<EmployeeTimeOff | undefined>;
  
  // Employee PTO Balances
  getEmployeePtoBalances(companyId: string): Promise<EmployeePtoBalance[]>;
  getEmployeePtoBalanceByEmployee(employeeId: string): Promise<EmployeePtoBalance | undefined>;
  createEmployeePtoBalance(balance: InsertEmployeePtoBalance): Promise<EmployeePtoBalance>;
  updateEmployeePtoBalance(id: string, balance: Partial<InsertEmployeePtoBalance>): Promise<EmployeePtoBalance | undefined>;
  
  // Employee Documents
  getEmployeeDocuments(companyId: string): Promise<EmployeeDocument[]>;
  getEmployeeDocumentsByEmployee(employeeId: string): Promise<EmployeeDocument[]>;
  createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument>;
  updateEmployeeDocument(id: string, document: Partial<InsertEmployeeDocument>): Promise<EmployeeDocument | undefined>;
  
  // Employee Performance Reviews
  getEmployeePerformanceReviews(companyId: string): Promise<EmployeePerformanceReview[]>;
  getEmployeePerformanceReviewsByEmployee(employeeId: string): Promise<EmployeePerformanceReview[]>;
  createEmployeePerformanceReview(review: InsertEmployeePerformanceReview): Promise<EmployeePerformanceReview>;
  updateEmployeePerformanceReview(id: string, review: Partial<InsertEmployeePerformanceReview>): Promise<EmployeePerformanceReview | undefined>;
  
  // Employee Emergency Contacts
  getEmployeeEmergencyContacts(companyId: string): Promise<EmployeeEmergencyContact[]>;
  getEmployeeEmergencyContactsByEmployee(employeeId: string): Promise<EmployeeEmergencyContact[]>;
  createEmployeeEmergencyContact(contact: InsertEmployeeEmergencyContact): Promise<EmployeeEmergencyContact>;
  updateEmployeeEmergencyContact(id: string, contact: Partial<InsertEmployeeEmergencyContact>): Promise<EmployeeEmergencyContact | undefined>;
  
  // Purchase Orders
  getPurchaseOrders(companyId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByStatus(companyId: string, status: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string, companyId: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, companyId: string, order: UpdatePurchaseOrder): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string, companyId: string): Promise<void>;
  
  // Material Usage Tracking
  getMaterialUsageTracking(companyId: string): Promise<MaterialUsageTracking[]>;
  getMaterialUsageByMaterial(materialId: string, companyId: string): Promise<MaterialUsageTracking[]>;
  getMaterialUsageByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<MaterialUsageTracking[]>;
  createMaterialUsageTracking(usage: InsertMaterialUsageTracking): Promise<MaterialUsageTracking>;
  
  // Procurement Schedules
  getProcurementSchedules(companyId: string): Promise<ProcurementSchedule[]>;
  getActiveProcurementSchedules(companyId: string): Promise<ProcurementSchedule[]>;
  getProcurementSchedule(id: string, companyId: string): Promise<ProcurementSchedule | undefined>;
  createProcurementSchedule(schedule: InsertProcurementSchedule): Promise<ProcurementSchedule>;
  updateProcurementSchedule(id: string, companyId: string, schedule: Partial<InsertProcurementSchedule>): Promise<ProcurementSchedule | undefined>;
  deleteProcurementSchedule(id: string, companyId: string): Promise<void>;
  
  // Auto Purchase Recommendations
  getAutoPurchaseRecommendations(companyId: string): Promise<AutoPurchaseRecommendation[]>;
  getAutoPurchaseRecommendationsByStatus(companyId: string, status: string): Promise<AutoPurchaseRecommendation[]>;
  getAutoPurchaseRecommendation(id: string, companyId: string): Promise<AutoPurchaseRecommendation | undefined>;
  createAutoPurchaseRecommendation(recommendation: InsertAutoPurchaseRecommendation): Promise<AutoPurchaseRecommendation>;
  updateAutoPurchaseRecommendation(id: string, companyId: string, recommendation: Partial<InsertAutoPurchaseRecommendation>): Promise<AutoPurchaseRecommendation | undefined>;
  deleteAutoPurchaseRecommendation(id: string, companyId: string): Promise<void>;
  
  // Economic Snapshots
  getLatestEconomicSnapshot(companyId: string): Promise<EconomicSnapshot | undefined>;
  createEconomicSnapshot(snapshot: InsertEconomicSnapshot): Promise<EconomicSnapshot>;
  
  // Research Validation System (Historical Predictions & Backtesting - NOT USER-FACING)
  getHistoricalPredictions(companyId: string): Promise<HistoricalPrediction[]>;
  getHistoricalPredictionsByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<HistoricalPrediction[]>;
  getHistoricalPredictionsByType(companyId: string, predictionType: string): Promise<HistoricalPrediction[]>;
  createHistoricalPrediction(prediction: InsertHistoricalPrediction): Promise<HistoricalPrediction>;
  updateHistoricalPredictionActuals(id: string, actualValue: number, actualRegime: string, actualDirection: string): Promise<HistoricalPrediction | undefined>;
  
  getPredictionAccuracyMetrics(companyId: string): Promise<PredictionAccuracyMetrics[]>;
  getLatestAccuracyMetrics(companyId: string): Promise<PredictionAccuracyMetrics | undefined>;
  createPredictionAccuracyMetrics(metrics: InsertPredictionAccuracyMetrics): Promise<PredictionAccuracyMetrics>;
  
  // Model Comparisons (Dual-Circuit vs Baselines)
  insertModelComparison(comparison: InsertModelComparison): Promise<ModelComparison>;
  
  // Machinery Performance Validation
  insertMachineryPrediction(prediction: InsertMachineryPrediction): Promise<MachineryPrediction>;
  
  // Workforce Economics Validation
  insertWorkforcePrediction(prediction: InsertWorkforcePrediction): Promise<WorkforcePrediction>;
  
  // Utility
  getAllCompanyIds(): Promise<string[]>;
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

  async getEmployeeForCompany(employeeId: string, companyId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId)));
    return employee;
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

  // Employee Payroll methods
  async getEmployeePayroll(companyId: string): Promise<EmployeePayroll[]> {
    const results = await db
      .select()
      .from(employeePayroll)
      .innerJoin(employees, eq(employeePayroll.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_payroll);
  }

  async getEmployeePayrollByEmployee(employeeId: string): Promise<EmployeePayroll | undefined> {
    const [payroll] = await db.select().from(employeePayroll).where(eq(employeePayroll.employeeId, employeeId));
    return payroll;
  }

  async createEmployeePayroll(insertPayroll: InsertEmployeePayroll): Promise<EmployeePayroll> {
    const [payroll] = await db.insert(employeePayroll).values(insertPayroll).returning();
    return payroll;
  }

  async updateEmployeePayroll(id: string, updateData: Partial<InsertEmployeePayroll>): Promise<EmployeePayroll | undefined> {
    const [payroll] = await db.update(employeePayroll).set(updateData).where(eq(employeePayroll.id, id)).returning();
    return payroll;
  }

  // Employee Benefits methods
  async getEmployeeBenefits(companyId: string): Promise<EmployeeBenefit[]> {
    const results = await db
      .select()
      .from(employeeBenefits)
      .innerJoin(employees, eq(employeeBenefits.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_benefits);
  }

  async getEmployeeBenefitsByEmployee(employeeId: string): Promise<EmployeeBenefit | undefined> {
    const [benefits] = await db.select().from(employeeBenefits).where(eq(employeeBenefits.employeeId, employeeId));
    return benefits;
  }

  async createEmployeeBenefits(insertBenefits: InsertEmployeeBenefit): Promise<EmployeeBenefit> {
    const [benefits] = await db.insert(employeeBenefits).values(insertBenefits).returning();
    return benefits;
  }

  async updateEmployeeBenefits(id: string, updateData: Partial<InsertEmployeeBenefit>): Promise<EmployeeBenefit | undefined> {
    const [benefits] = await db.update(employeeBenefits).set(updateData).where(eq(employeeBenefits.id, id)).returning();
    return benefits;
  }

  // Employee Time Off methods
  async getEmployeeTimeOffRequests(companyId: string): Promise<EmployeeTimeOff[]> {
    const results = await db
      .select()
      .from(employeeTimeOff)
      .innerJoin(employees, eq(employeeTimeOff.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_time_off);
  }

  async getEmployeeTimeOffByEmployee(employeeId: string): Promise<EmployeeTimeOff[]> {
    return db.select().from(employeeTimeOff).where(eq(employeeTimeOff.employeeId, employeeId));
  }

  async createEmployeeTimeOff(insertTimeOff: InsertEmployeeTimeOff): Promise<EmployeeTimeOff> {
    const [timeOff] = await db.insert(employeeTimeOff).values(insertTimeOff).returning();
    return timeOff;
  }

  async updateEmployeeTimeOff(id: string, updateData: Partial<InsertEmployeeTimeOff>): Promise<EmployeeTimeOff | undefined> {
    const [timeOff] = await db.update(employeeTimeOff).set(updateData).where(eq(employeeTimeOff.id, id)).returning();
    return timeOff;
  }

  // Employee PTO Balance methods
  async getEmployeePtoBalances(companyId: string): Promise<EmployeePtoBalance[]> {
    const results = await db
      .select()
      .from(employeePtoBalances)
      .innerJoin(employees, eq(employeePtoBalances.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_pto_balances);
  }

  async getEmployeePtoBalanceByEmployee(employeeId: string): Promise<EmployeePtoBalance | undefined> {
    const [balance] = await db.select().from(employeePtoBalances).where(eq(employeePtoBalances.employeeId, employeeId));
    return balance;
  }

  async createEmployeePtoBalance(insertBalance: InsertEmployeePtoBalance): Promise<EmployeePtoBalance> {
    const [balance] = await db.insert(employeePtoBalances).values(insertBalance).returning();
    return balance;
  }

  async updateEmployeePtoBalance(id: string, updateData: Partial<InsertEmployeePtoBalance>): Promise<EmployeePtoBalance | undefined> {
    const [balance] = await db.update(employeePtoBalances).set(updateData).where(eq(employeePtoBalances.id, id)).returning();
    return balance;
  }

  // Employee Documents methods
  async getEmployeeDocuments(companyId: string): Promise<EmployeeDocument[]> {
    const results = await db
      .select()
      .from(employeeDocuments)
      .innerJoin(employees, eq(employeeDocuments.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_documents);
  }

  async getEmployeeDocumentsByEmployee(employeeId: string): Promise<EmployeeDocument[]> {
    return db.select().from(employeeDocuments).where(eq(employeeDocuments.employeeId, employeeId));
  }

  async createEmployeeDocument(insertDocument: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const [document] = await db.insert(employeeDocuments).values(insertDocument).returning();
    return document;
  }

  async updateEmployeeDocument(id: string, updateData: Partial<InsertEmployeeDocument>): Promise<EmployeeDocument | undefined> {
    const [document] = await db.update(employeeDocuments).set(updateData).where(eq(employeeDocuments.id, id)).returning();
    return document;
  }

  // Employee Performance Review methods
  async getEmployeePerformanceReviews(companyId: string): Promise<EmployeePerformanceReview[]> {
    const results = await db
      .select()
      .from(employeePerformanceReviews)
      .innerJoin(employees, eq(employeePerformanceReviews.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_performance_reviews);
  }

  async getEmployeePerformanceReviewsByEmployee(employeeId: string): Promise<EmployeePerformanceReview[]> {
    return db.select().from(employeePerformanceReviews).where(eq(employeePerformanceReviews.employeeId, employeeId));
  }

  async createEmployeePerformanceReview(insertReview: InsertEmployeePerformanceReview): Promise<EmployeePerformanceReview> {
    const [review] = await db.insert(employeePerformanceReviews).values(insertReview).returning();
    return review;
  }

  async updateEmployeePerformanceReview(id: string, updateData: Partial<InsertEmployeePerformanceReview>): Promise<EmployeePerformanceReview | undefined> {
    const [review] = await db.update(employeePerformanceReviews).set(updateData).where(eq(employeePerformanceReviews.id, id)).returning();
    return review;
  }

  // Employee Emergency Contact methods
  async getEmployeeEmergencyContacts(companyId: string): Promise<EmployeeEmergencyContact[]> {
    const results = await db
      .select()
      .from(employeeEmergencyContacts)
      .innerJoin(employees, eq(employeeEmergencyContacts.employeeId, employees.id))
      .where(eq(employees.companyId, companyId));
    return results.map(r => r.employee_emergency_contacts);
  }

  async getEmployeeEmergencyContactsByEmployee(employeeId: string): Promise<EmployeeEmergencyContact[]> {
    return db.select().from(employeeEmergencyContacts).where(eq(employeeEmergencyContacts.employeeId, employeeId));
  }

  async createEmployeeEmergencyContact(insertContact: InsertEmployeeEmergencyContact): Promise<EmployeeEmergencyContact> {
    const [contact] = await db.insert(employeeEmergencyContacts).values(insertContact).returning();
    return contact;
  }

  async updateEmployeeEmergencyContact(id: string, updateData: Partial<InsertEmployeeEmergencyContact>): Promise<EmployeeEmergencyContact | undefined> {
    const [contact] = await db.update(employeeEmergencyContacts).set(updateData).where(eq(employeeEmergencyContacts.id, id)).returning();
    return contact;
  }

  // Purchase Order methods
  async getPurchaseOrders(companyId: string): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId));
  }

  async getPurchaseOrdersByStatus(companyId: string, status: string): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders).where(
      and(eq(purchaseOrders.companyId, companyId), eq(purchaseOrders.status, status))
    );
  }

  async getPurchaseOrder(id: string, companyId: string): Promise<PurchaseOrder | undefined> {
    const [order] = await db.select().from(purchaseOrders).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId))
    );
    return order;
  }

  async createPurchaseOrder(insertOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [order] = await db.insert(purchaseOrders).values(insertOrder).returning();
    return order;
  }

  async updatePurchaseOrder(id: string, companyId: string, updateData: UpdatePurchaseOrder): Promise<PurchaseOrder | undefined> {
    const [order] = await db.update(purchaseOrders).set(updateData).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId))
    ).returning();
    return order;
  }

  async deletePurchaseOrder(id: string, companyId: string): Promise<void> {
    await db.delete(purchaseOrders).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId))
    );
  }

  // Material Usage Tracking methods
  async getMaterialUsageTracking(companyId: string): Promise<MaterialUsageTracking[]> {
    return db.select().from(materialUsageTracking).where(eq(materialUsageTracking.companyId, companyId));
  }

  async getMaterialUsageByMaterial(materialId: string, companyId: string): Promise<MaterialUsageTracking[]> {
    return db.select().from(materialUsageTracking).where(
      and(eq(materialUsageTracking.materialId, materialId), eq(materialUsageTracking.companyId, companyId))
    );
  }

  async getMaterialUsageByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<MaterialUsageTracking[]> {
    return db.select().from(materialUsageTracking).where(
      and(
        eq(materialUsageTracking.companyId, companyId),
        sql`${materialUsageTracking.usageDate} >= ${startDate}`,
        sql`${materialUsageTracking.usageDate} <= ${endDate}`
      )
    );
  }

  async createMaterialUsageTracking(insertUsage: InsertMaterialUsageTracking): Promise<MaterialUsageTracking> {
    const [usage] = await db.insert(materialUsageTracking).values(insertUsage).returning();
    return usage;
  }

  // Procurement Schedule methods
  async getProcurementSchedules(companyId: string): Promise<ProcurementSchedule[]> {
    return db.select().from(procurementSchedules).where(eq(procurementSchedules.companyId, companyId));
  }

  async getActiveProcurementSchedules(companyId: string): Promise<ProcurementSchedule[]> {
    return db.select().from(procurementSchedules).where(
      and(eq(procurementSchedules.companyId, companyId), eq(procurementSchedules.isActive, "active"))
    );
  }

  async getProcurementSchedule(id: string, companyId: string): Promise<ProcurementSchedule | undefined> {
    const [schedule] = await db.select().from(procurementSchedules).where(
      and(eq(procurementSchedules.id, id), eq(procurementSchedules.companyId, companyId))
    );
    return schedule;
  }

  async createProcurementSchedule(insertSchedule: InsertProcurementSchedule): Promise<ProcurementSchedule> {
    const [schedule] = await db.insert(procurementSchedules).values(insertSchedule).returning();
    return schedule;
  }

  async updateProcurementSchedule(id: string, companyId: string, updateData: Partial<InsertProcurementSchedule>): Promise<ProcurementSchedule | undefined> {
    const [schedule] = await db.update(procurementSchedules).set(updateData).where(
      and(eq(procurementSchedules.id, id), eq(procurementSchedules.companyId, companyId))
    ).returning();
    return schedule;
  }

  async deleteProcurementSchedule(id: string, companyId: string): Promise<void> {
    await db.delete(procurementSchedules).where(
      and(eq(procurementSchedules.id, id), eq(procurementSchedules.companyId, companyId))
    );
  }

  // Auto Purchase Recommendation methods
  async getAutoPurchaseRecommendations(companyId: string): Promise<AutoPurchaseRecommendation[]> {
    return db.select().from(autoPurchaseRecommendations).where(eq(autoPurchaseRecommendations.companyId, companyId));
  }

  async getAutoPurchaseRecommendationsByStatus(companyId: string, status: string): Promise<AutoPurchaseRecommendation[]> {
    return db.select().from(autoPurchaseRecommendations).where(
      and(eq(autoPurchaseRecommendations.companyId, companyId), eq(autoPurchaseRecommendations.status, status))
    );
  }

  async getAutoPurchaseRecommendation(id: string, companyId: string): Promise<AutoPurchaseRecommendation | undefined> {
    const [recommendation] = await db.select().from(autoPurchaseRecommendations).where(
      and(eq(autoPurchaseRecommendations.id, id), eq(autoPurchaseRecommendations.companyId, companyId))
    );
    return recommendation;
  }

  async createAutoPurchaseRecommendation(insertRecommendation: InsertAutoPurchaseRecommendation): Promise<AutoPurchaseRecommendation> {
    const [recommendation] = await db.insert(autoPurchaseRecommendations).values(insertRecommendation).returning();
    return recommendation;
  }

  async updateAutoPurchaseRecommendation(id: string, companyId: string, updateData: Partial<InsertAutoPurchaseRecommendation>): Promise<AutoPurchaseRecommendation | undefined> {
    const [recommendation] = await db.update(autoPurchaseRecommendations).set(updateData).where(
      and(eq(autoPurchaseRecommendations.id, id), eq(autoPurchaseRecommendations.companyId, companyId))
    ).returning();
    return recommendation;
  }

  async deleteAutoPurchaseRecommendation(id: string, companyId: string): Promise<void> {
    await db.delete(autoPurchaseRecommendations).where(
      and(eq(autoPurchaseRecommendations.id, id), eq(autoPurchaseRecommendations.companyId, companyId))
    );
  }

  // Economic Snapshot methods
  async getLatestEconomicSnapshot(companyId: string): Promise<EconomicSnapshot | undefined> {
    const [snapshot] = await db.select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(sql`${economicSnapshots.timestamp} DESC`)
      .limit(1);
    return snapshot;
  }

  async createEconomicSnapshot(insertSnapshot: InsertEconomicSnapshot): Promise<EconomicSnapshot> {
    const [snapshot] = await db.insert(economicSnapshots).values(insertSnapshot).returning();
    return snapshot;
  }

  // Research Validation System methods (Historical Predictions & Backtesting)
  async getHistoricalPredictions(companyId: string): Promise<HistoricalPrediction[]> {
    return await db.select()
      .from(historicalPredictions)
      .where(eq(historicalPredictions.companyId, companyId))
      .orderBy(sql`${historicalPredictions.predictionDate} DESC`);
  }

  async getHistoricalPredictionsByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<HistoricalPrediction[]> {
    return await db.select()
      .from(historicalPredictions)
      .where(
        and(
          eq(historicalPredictions.companyId, companyId),
          sql`${historicalPredictions.predictionDate} >= ${startDate}`,
          sql`${historicalPredictions.predictionDate} <= ${endDate}`
        )
      )
      .orderBy(sql`${historicalPredictions.predictionDate} DESC`);
  }

  async getHistoricalPredictionsByType(companyId: string, predictionType: string): Promise<HistoricalPrediction[]> {
    return await db.select()
      .from(historicalPredictions)
      .where(
        and(
          eq(historicalPredictions.companyId, companyId),
          eq(historicalPredictions.predictionType, predictionType)
        )
      )
      .orderBy(sql`${historicalPredictions.predictionDate} DESC`);
  }

  async createHistoricalPrediction(insertPrediction: InsertHistoricalPrediction): Promise<HistoricalPrediction> {
    const [prediction] = await db.insert(historicalPredictions).values(insertPrediction).returning();
    return prediction;
  }

  async updateHistoricalPredictionActuals(
    id: string,
    actualValue: number,
    actualRegime: string,
    actualDirection: string
  ): Promise<HistoricalPrediction | undefined> {
    // Calculate accuracy metrics
    const [existing] = await db.select()
      .from(historicalPredictions)
      .where(eq(historicalPredictions.id, id));
    
    if (!existing) return undefined;

    const absoluteError = existing.predictedValue !== null ? Math.abs(existing.predictedValue - actualValue) : null;
    const percentageError = existing.predictedValue !== null && actualValue !== 0 ? ((existing.predictedValue - actualValue) / actualValue) * 100 : null;
    const directionalAccuracy = existing.predictedDirection === actualDirection ? 1 : 0;
    const regimeAccuracy = existing.predictedRegime === actualRegime ? 1 : 0;

    const [prediction] = await db.update(historicalPredictions)
      .set({
        actualValue,
        actualRegime,
        actualDirection,
        absoluteError,
        percentageError,
        directionalAccuracy,
        regimeAccuracy
      })
      .where(eq(historicalPredictions.id, id))
      .returning();
    
    return prediction;
  }

  async getPredictionAccuracyMetrics(companyId: string): Promise<PredictionAccuracyMetrics[]> {
    return await db.select()
      .from(predictionAccuracyMetrics)
      .where(eq(predictionAccuracyMetrics.companyId, companyId))
      .orderBy(sql`${predictionAccuracyMetrics.periodStart} DESC`);
  }

  async getLatestAccuracyMetrics(companyId: string): Promise<PredictionAccuracyMetrics | undefined> {
    const [metrics] = await db.select()
      .from(predictionAccuracyMetrics)
      .where(eq(predictionAccuracyMetrics.companyId, companyId))
      .orderBy(sql`${predictionAccuracyMetrics.periodStart} DESC`)
      .limit(1);
    return metrics;
  }

  async createPredictionAccuracyMetrics(insertMetrics: InsertPredictionAccuracyMetrics): Promise<PredictionAccuracyMetrics> {
    const [metrics] = await db.insert(predictionAccuracyMetrics).values(insertMetrics).returning();
    return metrics;
  }

  // Utility methods
  async getAllCompanyIds(): Promise<string[]> {
    const result = await db.select({ id: companies.id }).from(companies);
    return result.map(r => r.id);
  }

  // Model Comparisons (Dual-Circuit vs Baselines)
  async insertModelComparison(insertComparison: InsertModelComparison): Promise<ModelComparison> {
    const [comparison] = await db.insert(modelComparisons).values(insertComparison).returning();
    return comparison;
  }

  // Machinery Performance Validation
  async insertMachineryPrediction(insertPrediction: InsertMachineryPrediction): Promise<MachineryPrediction> {
    const [prediction] = await db.insert(machineryPredictions).values(insertPrediction).returning();
    return prediction;
  }

  // Workforce Economics Validation
  async insertWorkforcePrediction(insertPrediction: InsertWorkforcePrediction): Promise<WorkforcePrediction> {
    const [prediction] = await db.insert(workforcePredictions).values(insertPrediction).returning();
    return prediction;
  }
}

export const storage = new DbStorage();
