import { db } from "@db";
import { eq, and, sql, desc, inArray, gte, lte, lt } from "drizzle-orm";
import type { 
  User, InsertUser, UpsertUser, Company, InsertCompany,
  CompanyLocation, InsertCompanyLocation, UpdateCompanyLocation,
  Sku, InsertSku,
  Material, InsertMaterial, Bom, InsertBom, Supplier, InsertSupplier,
  SupplierMaterial, InsertSupplierMaterial, DemandHistory, InsertDemandHistory,
  Allocation, InsertAllocation, AllocationResult, InsertAllocationResult,
  PriceAlert, InsertPriceAlert, Machinery, InsertMachinery,
  MaintenanceRecord, InsertMaintenanceRecord,
  ComplianceDocument, InsertComplianceDocument,
  ComplianceAudit, InsertComplianceAudit,
  AuditFinding, InsertAuditFinding,
  AuditChecklistTemplate, InsertAuditChecklistTemplate,
  ComplianceCalendarEvent, InsertComplianceCalendarEvent,
  EmployeeTrainingRecord, InsertEmployeeTrainingRecord,
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
  MultiHorizonForecast, InsertMultiHorizonForecast,
  ForecastAccuracyTracking, InsertForecastAccuracyTracking,
  ForecastDegradationAlert, InsertForecastDegradationAlert,
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
  WorkforcePrediction, InsertWorkforcePrediction,
  FeatureToggle, InsertFeatureToggle,
  SupplierNode, InsertSupplierNode,
  SupplierLink, InsertSupplierLink,
  SupplierHealthMetrics, InsertSupplierHealthMetrics,
  SupplierRiskAlert, InsertSupplierRiskAlert,
  PoRule, InsertPoRule,
  PoWorkflowStep, InsertPoWorkflowStep,
  PoApproval, InsertPoApproval,
  NegotiationPlaybook, InsertNegotiationPlaybook,
  ErpConnection, InsertErpConnection,
  ConsortiumContribution, InsertConsortiumContribution,
  ConsortiumMetrics, InsertConsortiumMetrics,
  ConsortiumAlert, InsertConsortiumAlert,
  MaTarget, InsertMaTarget,
  MaRecommendation, InsertMaRecommendation,
  SavedScenario, InsertSavedScenario,
  ScenarioBookmark, InsertScenarioBookmark,
  FdrAlert, InsertFdrAlert,
  CommodityPriceAlert, InsertCommodityPriceAlert,
  AlertTrigger, InsertAlertTrigger,
  RegimeChangeNotification, InsertRegimeChangeNotification,
  AuditLog, InsertAuditLog,
  Role, InsertRole,
  Permission, InsertPermission,
  RolePermission, InsertRolePermission,
  UserRoleAssignment, InsertUserRoleAssignment,
  SopScenario, InsertSopScenario,
  SopGapAnalysis, InsertSopGapAnalysis,
  SopMeetingNotes, InsertSopMeetingNotes,
  SopActionItem, InsertSopActionItem,
  Rfq, InsertRfq,
  RfqQuote, InsertRfqQuote,
  BenchmarkSubmission, InsertBenchmarkSubmission,
  BenchmarkAggregate, InsertBenchmarkAggregate,
  BenchmarkComparison, InsertBenchmarkComparison,
  DemandSignalSource, InsertDemandSignalSource,
  DemandSignal, InsertDemandSignal,
  DemandSignalAggregate, InsertDemandSignalAggregate,
  RoiMetric, InsertRoiMetric,
  RoiSummary, InsertRoiSummary,
  ErpIntegrationTemplate, InsertErpIntegrationTemplate,
  ErpSyncLog, InsertErpSyncLog,
  ActionPlaybook, InsertActionPlaybook,
  ActivePlaybookInstance, InsertActivePlaybookInstance,
  PlaybookActionLog, InsertPlaybookActionLog,
  ScenarioSimulation, InsertScenarioSimulation,
  ScenarioVariant, InsertScenarioVariant,
  SupplierRiskSnapshot, InsertSupplierRiskSnapshot,
  SopMeetingTemplate, InsertSopMeetingTemplate,
  SopMeeting, InsertSopMeeting,
  SopMeetingAttendee, InsertSopMeetingAttendee,
  SopReconciliationItem, InsertSopReconciliationItem,
  SopApprovalChain, InsertSopApprovalChain,
  SopApprovalStep, InsertSopApprovalStep,
  SopApprovalRequest, InsertSopApprovalRequest,
  SopApprovalAction, InsertSopApprovalAction,
  DigitalTwinDataFeed, InsertDigitalTwinDataFeed,
  DigitalTwinSnapshot, InsertDigitalTwinSnapshot,
  DigitalTwinQuery, InsertDigitalTwinQuery,
  DigitalTwinSimulation, InsertDigitalTwinSimulation,
  DigitalTwinAlert, InsertDigitalTwinAlert,
  DigitalTwinMetric, InsertDigitalTwinMetric,
  SupplierTier, InsertSupplierTier,
  SupplierRelationship, InsertSupplierRelationship,
  SupplierRegionRisk, InsertSupplierRegionRisk,
  SupplierTierAlert, InsertSupplierTierAlert,
  ActivityLog, InsertActivityLog,
  UserNotificationPreferences, InsertUserNotificationPreferences,
  EmployeeSkillCertification, InsertEmployeeSkillCertification,
  WeeklySchedule, InsertWeeklySchedule,
  ShiftAssignment, InsertShiftAssignment,
  AiAutomationRule, InsertAiAutomationRule,
  AiAgent, InsertAiAgent
} from "@shared/schema";
import { 
  users, companies, companyLocations, skus, materials, boms, suppliers, supplierMaterials,
  demandHistory, allocations, allocationResults, priceAlerts, machinery, maintenanceRecords,
  complianceDocuments, complianceAudits, complianceRegulations,
  auditFindings, auditChecklistTemplates, complianceCalendarEvents, employeeTrainingRecords,
  productionRuns, productionMetrics, downtimeEvents, productionBottlenecks,
  equipmentSensors, sensorReadings, maintenanceAlerts, maintenancePredictions,
  inventoryOptimizations, demandPredictions, inventoryRecommendations,
  multiHorizonForecasts, forecastAccuracyTracking, forecastDegradationAlerts,
  materialBatches, traceabilityEvents, supplierChainLinks,
  employees, workShifts, skillRequirements, staffAssignments,
  employeePayroll, employeeBenefits, employeeTimeOff, employeePtoBalances,
  employeeDocuments, employeePerformanceReviews, employeeEmergencyContacts,
  purchaseOrders, materialUsageTracking, procurementSchedules, autoPurchaseRecommendations,
  economicSnapshots, historicalPredictions, predictionAccuracyMetrics,
  modelComparisons, machineryPredictions, workforcePredictions,
  featureToggles, supplierNodes, supplierLinks, supplierHealthMetrics, supplierRiskAlerts,
  poRules, poWorkflowSteps, poApprovals, negotiationPlaybooks, erpConnections,
  consortiumContributions, consortiumMetrics, consortiumAlerts,
  maTargets, maRecommendations,
  savedScenarios, scenarioBookmarks, fdrAlerts, commodityPriceAlerts, alertTriggers, regimeChangeNotifications,
  auditLogs,
  roles, permissions, rolePermissions, userRoleAssignments,
  sopScenarios, sopGapAnalysis, sopMeetingNotes, sopActionItems,
  rfqs, rfqQuotes,
  benchmarkSubmissions, benchmarkAggregates, benchmarkComparisons,
  demandSignalSources, demandSignals, demandSignalAggregates,
  roiMetrics, roiSummary, erpIntegrationTemplates, erpSyncLogs,
  actionPlaybooks, activePlaybookInstances, playbookActionLogs,
  scenarioSimulations, scenarioVariants, supplierRiskSnapshots,
  sopMeetingTemplates, sopMeetings, sopMeetingAttendees,
  sopReconciliationItems, sopApprovalChains, sopApprovalSteps,
  sopApprovalRequests, sopApprovalActions,
  digitalTwinDataFeeds, digitalTwinSnapshots, digitalTwinQueries,
  digitalTwinSimulations, digitalTwinAlerts, digitalTwinMetrics,
  supplierTiers, supplierRelationships, supplierRegionRisks, supplierTierAlerts,
  activityLogs, userNotificationPreferences,
  employeeSkillCertifications, weeklySchedules, shiftAssignments,
  aiAutomationRules, aiAgents
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Companies
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;
  
  // Company Locations
  getCompanyLocations(companyId: string): Promise<CompanyLocation[]>;
  getCompanyLocation(id: string): Promise<CompanyLocation | undefined>;
  createCompanyLocation(location: InsertCompanyLocation): Promise<CompanyLocation>;
  updateCompanyLocation(id: string, updates: UpdateCompanyLocation): Promise<CompanyLocation>;
  deleteCompanyLocation(id: string): Promise<void>;
  
  // Sessions (for WebSocket authentication)
  getSessionById(sessionId: string): Promise<any | undefined>;
  
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
  getAllBomsForCompany(companyId: string): Promise<Bom[]>;
  createBom(bom: InsertBom): Promise<Bom>;
  deleteBom(skuId: string, materialId: string): Promise<void>;
  
  // Suppliers
  getSuppliers(companyId: string): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  
  // Supplier Materials
  getSupplierMaterials(supplierId: string): Promise<SupplierMaterial[]>;
  getAllSupplierMaterialsForCompany(companyId: string): Promise<SupplierMaterial[]>;
  createSupplierMaterial(sm: InsertSupplierMaterial): Promise<SupplierMaterial>;
  
  // Demand History
  getDemandHistory(skuId: string): Promise<DemandHistory[]>;
  getAllDemandHistoryForCompany(companyId: string): Promise<DemandHistory[]>;
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
  
  // RFQs (Request for Quotations)
  getRfqs(companyId: string): Promise<Rfq[]>;
  getRfq(id: string): Promise<Rfq | undefined>;
  createRfq(rfq: InsertRfq): Promise<Rfq>;
  updateRfq(id: string, rfq: Partial<InsertRfq>): Promise<Rfq | undefined>;
  deleteRfq(id: string): Promise<void>;
  
  // RFQ Quotes
  getRfqQuotes(rfqId: string): Promise<RfqQuote[]>;
  createRfqQuote(quote: InsertRfqQuote): Promise<RfqQuote>;
  
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
  
  // Audit Findings
  getAuditFindings(companyId: string): Promise<AuditFinding[]>;
  getAuditFindingsByAudit(auditId: string): Promise<AuditFinding[]>;
  createAuditFinding(finding: InsertAuditFinding): Promise<AuditFinding>;
  updateAuditFinding(id: string, finding: Partial<InsertAuditFinding>): Promise<AuditFinding | undefined>;
  
  // Audit Checklist Templates
  getAuditChecklistTemplates(companyId: string): Promise<AuditChecklistTemplate[]>;
  getSystemChecklistTemplates(): Promise<AuditChecklistTemplate[]>;
  createAuditChecklistTemplate(template: InsertAuditChecklistTemplate): Promise<AuditChecklistTemplate>;
  
  // Compliance Calendar Events
  getComplianceCalendarEvents(companyId: string): Promise<ComplianceCalendarEvent[]>;
  createComplianceCalendarEvent(event: InsertComplianceCalendarEvent): Promise<ComplianceCalendarEvent>;
  updateComplianceCalendarEvent(id: string, event: Partial<InsertComplianceCalendarEvent>): Promise<ComplianceCalendarEvent | undefined>;
  
  // Employee Training Records
  getEmployeeTrainingRecords(companyId: string): Promise<EmployeeTrainingRecord[]>;
  createEmployeeTrainingRecord(record: InsertEmployeeTrainingRecord): Promise<EmployeeTrainingRecord>;
  updateEmployeeTrainingRecord(id: string, record: Partial<InsertEmployeeTrainingRecord>): Promise<EmployeeTrainingRecord | undefined>;
  
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
  
  // Multi-Horizon Forecasting
  getMultiHorizonForecasts(companyId: string, options?: { skuId?: string; horizonDays?: number }): Promise<MultiHorizonForecast[]>;
  createMultiHorizonForecast(forecast: InsertMultiHorizonForecast): Promise<MultiHorizonForecast>;
  createMultiHorizonForecasts(forecasts: InsertMultiHorizonForecast[]): Promise<MultiHorizonForecast[]>;
  updateMultiHorizonForecast(id: string, forecast: Partial<InsertMultiHorizonForecast>): Promise<MultiHorizonForecast>;
  getMultiHorizonForecastComparison(companyId: string, skuId: string): Promise<Array<{
    horizonDays: number;
    avgPredictedDemand: number | null;
    avgActualDemand: number | null;
    avgAccuracy: number | null;
    forecastCount: number;
  }>>;
  
  // Forecast Accuracy
  getForecastAccuracyMetrics(companyId: string): Promise<{
    overallMape: number | null;
    bias: number | null;
    totalPredictions: number;
    predictionsWithActuals: number;
    avgPredicted: number | null;
    avgActual: number | null;
    // Enhanced metrics
    trackingSignal: number | null;
    theilsU: number | null;
    directionalAccuracy: number | null;
    confidenceHitRate: number | null;
    mae: number | null;
    rmse: number | null;
  }>;
  getForecastAccuracyByPeriod(companyId: string): Promise<Array<{
    period: string;
    mape: number | null;
    bias: number | null;
    totalPredicted: number | null;
    totalActual: number | null;
    count: number;
  }>>;
  getForecastAccuracyBySku(companyId: string): Promise<Array<{
    skuId: string | null;
    skuName: string | null;
    mape: number | null;
    bias: number | null;
    totalPredicted: number | null;
    totalActual: number | null;
    count: number;
  }>>;
  getPredictionsWithActuals(companyId: string, limit?: number): Promise<DemandPrediction[]>;
  
  // Forecast Accuracy Tracking & Monitoring
  getForecastAccuracyTracking(companyId: string, options?: { skuId?: string; limit?: number }): Promise<ForecastAccuracyTracking[]>;
  getLatestForecastAccuracyBySKU(companyId: string, skuId: string): Promise<ForecastAccuracyTracking | undefined>;
  createForecastAccuracyTracking(tracking: InsertForecastAccuracyTracking): Promise<ForecastAccuracyTracking>;
  
  getForecastDegradationAlerts(companyId: string, options?: { skuId?: string; resolved?: boolean; severity?: string }): Promise<ForecastDegradationAlert[]>;
  createForecastDegradationAlert(alert: InsertForecastDegradationAlert): Promise<ForecastDegradationAlert>;
  acknowledgeForecastAlert(id: string, userId: string): Promise<ForecastDegradationAlert>;
  resolveForecastAlert(id: string, actionTaken: string, userId: string): Promise<ForecastDegradationAlert>;
  
  // Supply Chain Traceability
  getMaterialBatches(companyId: string): Promise<MaterialBatch[]>;
  createMaterialBatch(batch: InsertMaterialBatch): Promise<MaterialBatch>;
  getTraceabilityEvents(companyId: string): Promise<TraceabilityEvent[]>;
  getTraceabilityEventsByBatch(batchId: string): Promise<TraceabilityEvent[]>;
  createTraceabilityEvent(event: InsertTraceabilityEvent): Promise<TraceabilityEvent>;
  getSupplierChainLinks(companyId: string): Promise<SupplierChainLink[]>;
  createSupplierChainLink(link: InsertSupplierChainLink): Promise<SupplierChainLink>;
  
  // Multi-Tier Supplier Mapping
  getSupplierTiers(companyId: string): Promise<SupplierTier[]>;
  getSupplierTier(id: string): Promise<SupplierTier | undefined>;
  getSupplierTierBySupplier(supplierId: string): Promise<SupplierTier | undefined>;
  createSupplierTier(tier: InsertSupplierTier): Promise<SupplierTier>;
  updateSupplierTier(id: string, tier: Partial<InsertSupplierTier>): Promise<SupplierTier | undefined>;
  deleteSupplierTier(id: string): Promise<void>;
  
  getSupplierRelationships(companyId: string): Promise<SupplierRelationship[]>;
  getSupplierRelationship(id: string): Promise<SupplierRelationship | undefined>;
  getSupplierRelationshipsByParent(parentSupplierId: string): Promise<SupplierRelationship[]>;
  getSupplierRelationshipsByChild(childSupplierId: string): Promise<SupplierRelationship[]>;
  createSupplierRelationship(relationship: InsertSupplierRelationship): Promise<SupplierRelationship>;
  updateSupplierRelationship(id: string, relationship: Partial<InsertSupplierRelationship>): Promise<SupplierRelationship | undefined>;
  deleteSupplierRelationship(id: string): Promise<void>;
  
  getSupplierRegionRisks(companyId?: string): Promise<SupplierRegionRisk[]>;
  getSupplierRegionRisk(id: string): Promise<SupplierRegionRisk | undefined>;
  getSupplierRegionRiskByCountry(country: string): Promise<SupplierRegionRisk[]>;
  createSupplierRegionRisk(risk: InsertSupplierRegionRisk): Promise<SupplierRegionRisk>;
  updateSupplierRegionRisk(id: string, risk: Partial<InsertSupplierRegionRisk>): Promise<SupplierRegionRisk | undefined>;
  deleteSupplierRegionRisk(id: string): Promise<void>;
  
  getSupplierTierAlerts(companyId: string): Promise<SupplierTierAlert[]>;
  getSupplierTierAlert(id: string): Promise<SupplierTierAlert | undefined>;
  getActiveSupplierTierAlerts(companyId: string): Promise<SupplierTierAlert[]>;
  createSupplierTierAlert(alert: InsertSupplierTierAlert): Promise<SupplierTierAlert>;
  updateSupplierTierAlert(id: string, alert: Partial<InsertSupplierTierAlert>): Promise<SupplierTierAlert | undefined>;
  acknowledgeSupplierTierAlert(id: string, userId: string): Promise<SupplierTierAlert | undefined>;
  resolveSupplierTierAlert(id: string, userId: string, resolution: string): Promise<SupplierTierAlert | undefined>;
  
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
  
  // Employee Skill Certifications (Skills Matrix)
  getEmployeeSkillCertifications(companyId: string): Promise<EmployeeSkillCertification[]>;
  getEmployeeSkillCertificationsByEmployee(employeeId: string): Promise<EmployeeSkillCertification[]>;
  createEmployeeSkillCertification(cert: InsertEmployeeSkillCertification): Promise<EmployeeSkillCertification>;
  updateEmployeeSkillCertification(id: string, cert: Partial<InsertEmployeeSkillCertification>): Promise<EmployeeSkillCertification | undefined>;
  deleteEmployeeSkillCertification(id: string): Promise<void>;
  
  // Shift Assignments (Schedule Builder)
  getShiftAssignments(companyId: string): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByDate(companyId: string, date: Date): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByEmployee(employeeId: string): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByWeek(companyId: string, weekStart: Date): Promise<ShiftAssignment[]>;
  createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment>;
  updateShiftAssignment(id: string, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment | undefined>;
  deleteShiftAssignment(id: string): Promise<void>;
  
  // Weekly Schedules
  getWeeklySchedules(companyId: string): Promise<WeeklySchedule[]>;
  getWeeklySchedule(id: string): Promise<WeeklySchedule | undefined>;
  createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule>;
  
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
  getEconomicSnapshotHistory(companyId: string, limit?: number): Promise<EconomicSnapshot[]>;
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
  
  // ==================== ENTERPRISE FEATURES ====================
  
  // Feature Toggles (for optional features)
  getFeatureToggles(companyId: string): Promise<FeatureToggle[]>;
  getFeatureToggle(companyId: string, featureKey: string): Promise<FeatureToggle | undefined>;
  createFeatureToggle(toggle: InsertFeatureToggle): Promise<FeatureToggle>;
  updateFeatureToggle(companyId: string, featureKey: string, enabled: number): Promise<FeatureToggle | undefined>;
  
  // Supply Chain Network Intelligence - Supplier Nodes
  getSupplierNodes(companyId: string): Promise<SupplierNode[]>;
  getSupplierNode(id: string): Promise<SupplierNode | undefined>;
  getSupplierNodesByTier(companyId: string, tier: number): Promise<SupplierNode[]>;
  getSupplierNodesByCriticality(companyId: string, criticality: string): Promise<SupplierNode[]>;
  getCriticalSupplierNodes(companyId: string): Promise<SupplierNode[]>;
  createSupplierNode(node: InsertSupplierNode): Promise<SupplierNode>;
  updateSupplierNode(id: string, node: Partial<InsertSupplierNode>): Promise<SupplierNode | undefined>;
  
  // Supply Chain Network Intelligence - Supplier Links
  getSupplierLinks(companyId: string): Promise<SupplierLink[]>;
  getSupplierLinksFrom(nodeId: string): Promise<SupplierLink[]>;
  getSupplierLinksTo(nodeId: string): Promise<SupplierLink[]>;
  createSupplierLink(link: InsertSupplierLink): Promise<SupplierLink>;
  
  // Supply Chain Network Intelligence - Health Metrics
  getSupplierHealthMetrics(nodeId: string): Promise<SupplierHealthMetrics[]>;
  getLatestSupplierHealthMetric(nodeId: string): Promise<SupplierHealthMetrics | undefined>;
  createSupplierHealthMetric(metric: InsertSupplierHealthMetrics): Promise<SupplierHealthMetrics>;
  
  // Supply Chain Network Intelligence - Risk Alerts
  getSupplierRiskAlerts(companyId: string): Promise<SupplierRiskAlert[]>;
  getActiveSupplierRiskAlerts(companyId: string): Promise<SupplierRiskAlert[]>;
  getSupplierRiskAlertsByNode(nodeId: string): Promise<SupplierRiskAlert[]>;
  getSupplierRiskAlertsBySeverity(companyId: string, severity: string): Promise<SupplierRiskAlert[]>;
  createSupplierRiskAlert(alert: InsertSupplierRiskAlert): Promise<SupplierRiskAlert>;
  acknowledgeSupplierRiskAlert(id: string, userId: string): Promise<SupplierRiskAlert | undefined>;
  resolveSupplierRiskAlert(id: string, userId: string): Promise<SupplierRiskAlert | undefined>;
  
  // Automated PO Execution - PO Rules
  getPoRules(companyId: string): Promise<PoRule[]>;
  getPoRule(id: string): Promise<PoRule | undefined>;
  getEnabledPoRules(companyId: string): Promise<PoRule[]>;
  getPoRulesByMaterial(materialId: string): Promise<PoRule[]>;
  createPoRule(rule: InsertPoRule): Promise<PoRule>;
  updatePoRule(id: string, rule: Partial<InsertPoRule>): Promise<PoRule | undefined>;
  deletePoRule(id: string): Promise<void>;
  
  // Automated PO Execution - Workflow Steps
  getPoWorkflowSteps(companyId: string): Promise<PoWorkflowStep[]>;
  getPoWorkflowStepsByPO(purchaseOrderId: string): Promise<PoWorkflowStep[]>;
  createPoWorkflowStep(step: InsertPoWorkflowStep): Promise<PoWorkflowStep>;
  updatePoWorkflowStep(id: string, step: Partial<InsertPoWorkflowStep>): Promise<PoWorkflowStep | undefined>;
  
  // Automated PO Execution - Approvals
  getPoApprovals(purchaseOrderId: string): Promise<PoApproval[]>;
  getPoApprovalsByApprover(approverId: string): Promise<PoApproval[]>;
  createPoApproval(approval: InsertPoApproval): Promise<PoApproval>;
  
  // Automated PO Execution - Negotiation Playbooks
  getNegotiationPlaybooks(companyId: string): Promise<NegotiationPlaybook[]>;
  getNegotiationPlaybooksByRegime(companyId: string, regime: string): Promise<NegotiationPlaybook[]>;
  getNegotiationPlaybook(id: string): Promise<NegotiationPlaybook | undefined>;
  createNegotiationPlaybook(playbook: InsertNegotiationPlaybook): Promise<NegotiationPlaybook>;
  updateNegotiationPlaybook(id: string, playbook: Partial<InsertNegotiationPlaybook>): Promise<NegotiationPlaybook | undefined>;
  
  // Automated PO Execution - ERP Connections
  getErpConnections(companyId: string): Promise<ErpConnection[]>;
  getErpConnection(id: string): Promise<ErpConnection | undefined>;
  getActiveErpConnection(companyId: string): Promise<ErpConnection | undefined>;
  createErpConnection(connection: InsertErpConnection): Promise<ErpConnection>;
  updateErpConnection(id: string, connection: Partial<InsertErpConnection>): Promise<ErpConnection | undefined>;
  deleteErpConnection(id: string): Promise<void>;
  
  // AI Agents
  getAiAgents(companyId: string): Promise<AiAgent[]>;
  getAiAgent(id: string): Promise<AiAgent | undefined>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: string, agent: Partial<InsertAiAgent>): Promise<AiAgent | undefined>;
  deleteAiAgent(id: string): Promise<void>;
  
  // AI Automation Rules
  getAiAutomationRules(companyId: string): Promise<AiAutomationRule[]>;
  getAiAutomationRule(id: string): Promise<AiAutomationRule | undefined>;
  getAiAutomationRulesByAgent(agentId: string): Promise<AiAutomationRule[]>;
  createAiAutomationRule(rule: InsertAiAutomationRule): Promise<AiAutomationRule>;
  updateAiAutomationRule(id: string, rule: Partial<InsertAiAutomationRule>): Promise<AiAutomationRule | undefined>;
  deleteAiAutomationRule(id: string): Promise<void>;
  
  // Industry Data Consortium
  getConsortiumContributions(filters?: { industrySector?: string; region?: string; regime?: string }): Promise<ConsortiumContribution[]>;
  createConsortiumContribution(contribution: InsertConsortiumContribution): Promise<ConsortiumContribution>;
  getConsortiumMetrics(regime: string, filters?: { industrySector?: string }): Promise<ConsortiumMetrics[]>;
  createConsortiumMetrics(metrics: InsertConsortiumMetrics): Promise<ConsortiumMetrics>;
  getConsortiumAlerts(severity?: string): Promise<ConsortiumAlert[]>;
  createConsortiumAlert(alert: InsertConsortiumAlert): Promise<ConsortiumAlert>;
  
  // M&A Intelligence
  getMaTargets(companyId: string): Promise<MaTarget[]>;
  getMaTarget(id: string): Promise<MaTarget | undefined>;
  createMaTarget(target: InsertMaTarget): Promise<MaTarget>;
  updateMaTarget(id: string, target: Partial<InsertMaTarget>): Promise<MaTarget | undefined>;
  getMaRecommendations(companyId: string): Promise<MaRecommendation[]>;
  createMaRecommendation(recommendation: InsertMaRecommendation): Promise<MaRecommendation>;
  
  // Saved Scenarios & Bookmarks
  getSavedScenarios(companyId: string): Promise<SavedScenario[]>;
  getSavedScenario(id: string): Promise<SavedScenario | undefined>;
  createSavedScenario(scenario: InsertSavedScenario): Promise<SavedScenario>;
  updateSavedScenario(id: string, scenario: Partial<InsertSavedScenario>): Promise<SavedScenario | undefined>;
  deleteSavedScenario(id: string): Promise<void>;
  
  getScenarioBookmarks(companyId: string): Promise<ScenarioBookmark[]>;
  getScenarioBookmark(id: string): Promise<ScenarioBookmark | undefined>;
  createScenarioBookmark(bookmark: InsertScenarioBookmark): Promise<ScenarioBookmark>;
  updateScenarioBookmark(id: string, bookmark: Partial<InsertScenarioBookmark>): Promise<ScenarioBookmark | undefined>;
  deleteScenarioBookmark(id: string): Promise<void>;
  
  // S&OP Workspace - Scenarios
  getSopScenarios(companyId: string): Promise<SopScenario[]>;
  getSopScenario(id: string): Promise<SopScenario | undefined>;
  createSopScenario(scenario: InsertSopScenario): Promise<SopScenario>;
  updateSopScenario(id: string, scenario: Partial<InsertSopScenario>): Promise<SopScenario | undefined>;
  deleteSopScenario(id: string): Promise<void>;
  approveSopScenario(id: string, approvedBy: string): Promise<SopScenario | undefined>;
  
  // S&OP Workspace - Gap Analysis
  getSopGapAnalyses(companyId: string): Promise<SopGapAnalysis[]>;
  getSopGapAnalysesByScenario(scenarioId: string): Promise<SopGapAnalysis[]>;
  getSopGapAnalysis(id: string): Promise<SopGapAnalysis | undefined>;
  createSopGapAnalysis(gapAnalysis: InsertSopGapAnalysis): Promise<SopGapAnalysis>;
  updateSopGapAnalysis(id: string, gapAnalysis: Partial<InsertSopGapAnalysis>): Promise<SopGapAnalysis | undefined>;
  deleteSopGapAnalysis(id: string): Promise<void>;
  
  // S&OP Workspace - Meeting Notes
  getSopMeetingNotes(companyId: string): Promise<SopMeetingNotes[]>;
  getSopMeetingNote(id: string): Promise<SopMeetingNotes | undefined>;
  createSopMeetingNote(meetingNote: InsertSopMeetingNotes): Promise<SopMeetingNotes>;
  updateSopMeetingNote(id: string, meetingNote: Partial<InsertSopMeetingNotes>): Promise<SopMeetingNotes | undefined>;
  deleteSopMeetingNote(id: string): Promise<void>;
  
  // S&OP Workspace - Action Items
  getSopActionItems(companyId: string): Promise<SopActionItem[]>;
  getSopActionItemsByMeeting(meetingId: string): Promise<SopActionItem[]>;
  getSopActionItemsByAssignee(assignedTo: string): Promise<SopActionItem[]>;
  getSopActionItem(id: string): Promise<SopActionItem | undefined>;
  createSopActionItem(actionItem: InsertSopActionItem): Promise<SopActionItem>;
  updateSopActionItem(id: string, actionItem: Partial<InsertSopActionItem>): Promise<SopActionItem | undefined>;
  completeSopActionItem(id: string): Promise<SopActionItem | undefined>;
  deleteSopActionItem(id: string): Promise<void>;
  
  // Smart Alerts & Monitoring
  getFdrAlerts(companyId: string): Promise<FdrAlert[]>;
  createFdrAlert(alert: InsertFdrAlert): Promise<FdrAlert>;
  updateFdrAlert(id: string, alert: Partial<InsertFdrAlert>): Promise<FdrAlert | undefined>;
  deleteFdrAlert(id: string): Promise<void>;
  
  getCommodityPriceAlerts(companyId: string): Promise<CommodityPriceAlert[]>;
  createCommodityPriceAlert(alert: InsertCommodityPriceAlert): Promise<CommodityPriceAlert>;
  updateCommodityPriceAlert(id: string, alert: Partial<InsertCommodityPriceAlert>): Promise<CommodityPriceAlert | undefined>;
  deleteCommodityPriceAlert(id: string): Promise<void>;
  
  getAlertTriggers(companyId: string): Promise<AlertTrigger[]>;
  getUnacknowledgedAlertTriggers(companyId: string): Promise<AlertTrigger[]>;
  createAlertTrigger(trigger: InsertAlertTrigger): Promise<AlertTrigger>;
  acknowledgeAlertTrigger(id: string, userId: string): Promise<AlertTrigger | undefined>;
  
  getRegimeNotifications(companyId: string): Promise<RegimeChangeNotification[]>;
  getUnacknowledgedRegimeNotifications(companyId: string): Promise<RegimeChangeNotification[]>;
  createRegimeNotification(notification: InsertRegimeChangeNotification): Promise<RegimeChangeNotification>;
  acknowledgeRegimeNotification(id: string, userId: string): Promise<RegimeChangeNotification | undefined>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: string, limit?: number): Promise<AuditLog[]>;
  getAuditLogsByEntity(companyId: string, entityType: string, entityId?: string): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: string, limit?: number): Promise<AuditLog[]>;
  
  // RBAC - Roles
  getRoles(companyId: string): Promise<Role[]>;
  getRole(roleId: string, companyId: string): Promise<Role | undefined>;
  getRoleByName(companyId: string, name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(roleId: string, companyId: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(roleId: string, companyId: string): Promise<void>;
  
  // RBAC - Role Permissions
  getRolePermissions(roleId: string, companyId: string): Promise<Permission[]>;
  assignPermissionToRole(roleId: string, permissionId: string, companyId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string, companyId: string): Promise<void>;
  
  // RBAC - User Role Assignments
  getUserRoles(userId: string, companyId: string): Promise<Role[]>;
  assignRoleToUser(userId: string, roleId: string, companyId: string, assignedBy: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  getUsersWithRole(roleId: string): Promise<User[]>;
  
  // RBAC - Permissions
  getAllPermissions(): Promise<Permission[]>;
  getPermission(permissionId: string): Promise<Permission | undefined>;
  
  // Peer Benchmarking (Industry Data Consortium)
  createBenchmarkSubmission(submission: InsertBenchmarkSubmission): Promise<BenchmarkSubmission>;
  getBenchmarkSubmissions(companyId: string): Promise<BenchmarkSubmission[]>;
  getBenchmarkAggregates(filters: {
    materialCategory?: string;
    materialSubcategory?: string;
    industry?: string;
    companySize?: string;
    snapshotMonth?: string;
  }): Promise<BenchmarkAggregate[]>;
  createBenchmarkAggregate(aggregate: InsertBenchmarkAggregate): Promise<BenchmarkAggregate>;
  updateBenchmarkAggregate(id: string, aggregate: Partial<InsertBenchmarkAggregate>): Promise<BenchmarkAggregate | undefined>;
  upsertBenchmarkAggregate(aggregate: InsertBenchmarkAggregate): Promise<BenchmarkAggregate>;
  getBenchmarkComparisons(companyId: string): Promise<BenchmarkComparison[]>;
  createBenchmarkComparison(comparison: InsertBenchmarkComparison): Promise<BenchmarkComparison>;
  
  // Demand Signal Repository
  createDemandSignalSource(source: InsertDemandSignalSource): Promise<DemandSignalSource>;
  getDemandSignalSources(companyId: string): Promise<DemandSignalSource[]>;
  getDemandSignalSource(id: string): Promise<DemandSignalSource | undefined>;
  updateDemandSignalSource(id: string, source: Partial<InsertDemandSignalSource>): Promise<DemandSignalSource | undefined>;
  deleteDemandSignalSource(id: string): Promise<void>;
  
  createDemandSignal(signal: InsertDemandSignal): Promise<DemandSignal>;
  getDemandSignals(companyId: string, filters?: { 
    sourceId?: string; 
    skuId?: string; 
    materialId?: string; 
    signalType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<DemandSignal[]>;
  getDemandSignal(id: string): Promise<DemandSignal | undefined>;
  updateDemandSignal(id: string, signal: Partial<InsertDemandSignal>): Promise<DemandSignal | undefined>;
  deleteDemandSignal(id: string): Promise<void>;
  markDemandSignalsProcessed(signalIds: string[]): Promise<void>;
  
  getDemandSignalAggregates(companyId: string, filters?: {
    skuId?: string;
    materialId?: string;
    aggregationPeriod?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<DemandSignalAggregate[]>;
  createDemandSignalAggregate(aggregate: InsertDemandSignalAggregate): Promise<DemandSignalAggregate>;
  upsertDemandSignalAggregate(aggregate: InsertDemandSignalAggregate): Promise<DemandSignalAggregate>;
  
  // Utility
  getAllCompanyIds(): Promise<string[]>;
  
  // ROI Metrics
  getRoiMetrics(companyId: string, filters?: {
    metricType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<RoiMetric[]>;
  createRoiMetric(metric: InsertRoiMetric): Promise<RoiMetric>;
  getRoiSummary(companyId: string, periodType?: string): Promise<RoiSummary | undefined>;
  upsertRoiSummary(summary: InsertRoiSummary): Promise<RoiSummary>;
  
  // ERP Integration Templates
  getErpIntegrationTemplates(): Promise<ErpIntegrationTemplate[]>;
  getErpIntegrationTemplate(id: string): Promise<ErpIntegrationTemplate | undefined>;
  createErpIntegrationTemplate(template: InsertErpIntegrationTemplate): Promise<ErpIntegrationTemplate>;
  updateErpIntegrationTemplate(id: string, template: Partial<InsertErpIntegrationTemplate>): Promise<ErpIntegrationTemplate | undefined>;
  
  // ERP Sync Logs
  getErpSyncLogs(connectionId: string, limit?: number): Promise<ErpSyncLog[]>;
  createErpSyncLog(log: InsertErpSyncLog): Promise<ErpSyncLog>;
  updateErpSyncLog(id: string, log: Partial<InsertErpSyncLog>): Promise<ErpSyncLog | undefined>;
  
  // Action Playbooks
  getActionPlaybooks(filters?: { triggerType?: string; isActive?: boolean }): Promise<ActionPlaybook[]>;
  getActionPlaybook(id: string): Promise<ActionPlaybook | undefined>;
  createActionPlaybook(playbook: InsertActionPlaybook): Promise<ActionPlaybook>;
  updateActionPlaybook(id: string, playbook: Partial<InsertActionPlaybook>): Promise<ActionPlaybook | undefined>;
  
  // Active Playbook Instances
  getActivePlaybookInstances(companyId: string, status?: string): Promise<ActivePlaybookInstance[]>;
  getActivePlaybookInstance(id: string): Promise<ActivePlaybookInstance | undefined>;
  createActivePlaybookInstance(instance: InsertActivePlaybookInstance): Promise<ActivePlaybookInstance>;
  updateActivePlaybookInstance(id: string, instance: Partial<InsertActivePlaybookInstance>): Promise<ActivePlaybookInstance | undefined>;
  
  // Playbook Action Logs
  getPlaybookActionLogs(instanceId: string): Promise<PlaybookActionLog[]>;
  createPlaybookActionLog(log: InsertPlaybookActionLog): Promise<PlaybookActionLog>;
  updatePlaybookActionLog(id: string, log: Partial<InsertPlaybookActionLog>): Promise<PlaybookActionLog | undefined>;
  
  // Scenario Simulations (What-If Analysis)
  getScenarioSimulations(companyId: string): Promise<ScenarioSimulation[]>;
  getScenarioSimulation(id: string): Promise<ScenarioSimulation | undefined>;
  createScenarioSimulation(simulation: InsertScenarioSimulation): Promise<ScenarioSimulation>;
  updateScenarioSimulation(id: string, simulation: Partial<InsertScenarioSimulation>): Promise<ScenarioSimulation | undefined>;
  deleteScenarioSimulation(id: string): Promise<void>;
  
  // Scenario Variants
  getScenarioVariants(simulationId: string): Promise<ScenarioVariant[]>;
  getScenarioVariant(id: string): Promise<ScenarioVariant | undefined>;
  createScenarioVariant(variant: InsertScenarioVariant): Promise<ScenarioVariant>;
  updateScenarioVariant(id: string, variant: Partial<InsertScenarioVariant>): Promise<ScenarioVariant | undefined>;
  deleteScenarioVariant(id: string): Promise<void>;
  
  // Supplier Risk Scoring
  getSupplierRiskSnapshots(companyId: string, filters?: { supplierId?: string; regime?: string; riskTier?: string; latestOnly?: boolean }): Promise<SupplierRiskSnapshot[]>;
  getSupplierRiskSnapshot(id: string): Promise<SupplierRiskSnapshot | undefined>;
  getLatestSupplierRiskSnapshot(supplierId: string): Promise<SupplierRiskSnapshot | undefined>;
  createSupplierRiskSnapshot(snapshot: InsertSupplierRiskSnapshot): Promise<SupplierRiskSnapshot>;
  updateSupplierRiskSnapshot(id: string, snapshot: Partial<InsertSupplierRiskSnapshot>): Promise<SupplierRiskSnapshot | undefined>;
  
  // S&OP Meeting Templates
  getSopMeetingTemplates(companyId?: string): Promise<SopMeetingTemplate[]>;
  getSopMeetingTemplate(id: string): Promise<SopMeetingTemplate | undefined>;
  createSopMeetingTemplate(template: InsertSopMeetingTemplate): Promise<SopMeetingTemplate>;
  updateSopMeetingTemplate(id: string, template: Partial<InsertSopMeetingTemplate>): Promise<SopMeetingTemplate | undefined>;
  deleteSopMeetingTemplate(id: string): Promise<void>;
  
  // S&OP Meetings
  getSopMeetings(companyId: string, filters?: { status?: string; meetingType?: string }): Promise<SopMeeting[]>;
  getSopMeeting(id: string): Promise<SopMeeting | undefined>;
  createSopMeeting(meeting: InsertSopMeeting): Promise<SopMeeting>;
  updateSopMeeting(id: string, meeting: Partial<InsertSopMeeting>): Promise<SopMeeting | undefined>;
  deleteSopMeeting(id: string): Promise<void>;
  
  // S&OP Meeting Attendees
  getSopMeetingAttendees(meetingId: string): Promise<SopMeetingAttendee[]>;
  createSopMeetingAttendee(attendee: InsertSopMeetingAttendee): Promise<SopMeetingAttendee>;
  updateSopMeetingAttendee(id: string, attendee: Partial<InsertSopMeetingAttendee>): Promise<SopMeetingAttendee | undefined>;
  deleteSopMeetingAttendee(id: string): Promise<void>;
  
  // S&OP Reconciliation Items
  getSopReconciliationItems(companyId: string, filters?: { meetingId?: string; status?: string; priority?: string }): Promise<SopReconciliationItem[]>;
  getSopReconciliationItem(id: string): Promise<SopReconciliationItem | undefined>;
  createSopReconciliationItem(item: InsertSopReconciliationItem): Promise<SopReconciliationItem>;
  updateSopReconciliationItem(id: string, item: Partial<InsertSopReconciliationItem>): Promise<SopReconciliationItem | undefined>;
  deleteSopReconciliationItem(id: string): Promise<void>;
  
  // S&OP Approval Chains
  getSopApprovalChains(companyId: string): Promise<SopApprovalChain[]>;
  getSopApprovalChain(id: string): Promise<SopApprovalChain | undefined>;
  createSopApprovalChain(chain: InsertSopApprovalChain): Promise<SopApprovalChain>;
  updateSopApprovalChain(id: string, chain: Partial<InsertSopApprovalChain>): Promise<SopApprovalChain | undefined>;
  deleteSopApprovalChain(id: string): Promise<void>;
  
  // S&OP Approval Steps
  getSopApprovalSteps(chainId: string): Promise<SopApprovalStep[]>;
  createSopApprovalStep(step: InsertSopApprovalStep): Promise<SopApprovalStep>;
  updateSopApprovalStep(id: string, step: Partial<InsertSopApprovalStep>): Promise<SopApprovalStep | undefined>;
  deleteSopApprovalStep(id: string): Promise<void>;
  
  // S&OP Approval Requests
  getSopApprovalRequests(companyId: string, filters?: { status?: string; requesterId?: string }): Promise<SopApprovalRequest[]>;
  getSopApprovalRequest(id: string): Promise<SopApprovalRequest | undefined>;
  createSopApprovalRequest(request: InsertSopApprovalRequest): Promise<SopApprovalRequest>;
  updateSopApprovalRequest(id: string, request: Partial<InsertSopApprovalRequest>): Promise<SopApprovalRequest | undefined>;
  
  // S&OP Approval Actions
  getSopApprovalActions(requestId: string): Promise<SopApprovalAction[]>;
  createSopApprovalAction(action: InsertSopApprovalAction): Promise<SopApprovalAction>;
  
  // Digital Twin - Data Feeds
  getDigitalTwinDataFeeds(companyId: string): Promise<DigitalTwinDataFeed[]>;
  getDigitalTwinDataFeed(id: string): Promise<DigitalTwinDataFeed | undefined>;
  createDigitalTwinDataFeed(feed: InsertDigitalTwinDataFeed): Promise<DigitalTwinDataFeed>;
  updateDigitalTwinDataFeed(id: string, feed: Partial<InsertDigitalTwinDataFeed>): Promise<DigitalTwinDataFeed | undefined>;
  deleteDigitalTwinDataFeed(id: string): Promise<void>;
  
  // Digital Twin - Snapshots
  getDigitalTwinSnapshots(companyId: string, limit?: number): Promise<DigitalTwinSnapshot[]>;
  getDigitalTwinSnapshot(id: string): Promise<DigitalTwinSnapshot | undefined>;
  getLatestDigitalTwinSnapshot(companyId: string): Promise<DigitalTwinSnapshot | undefined>;
  createDigitalTwinSnapshot(snapshot: InsertDigitalTwinSnapshot): Promise<DigitalTwinSnapshot>;
  
  // Digital Twin - Queries
  getDigitalTwinQueries(companyId: string, limit?: number): Promise<DigitalTwinQuery[]>;
  getDigitalTwinQuery(id: string): Promise<DigitalTwinQuery | undefined>;
  createDigitalTwinQuery(query: InsertDigitalTwinQuery): Promise<DigitalTwinQuery>;
  updateDigitalTwinQuery(id: string, query: Partial<InsertDigitalTwinQuery>): Promise<DigitalTwinQuery | undefined>;
  
  // Digital Twin - Simulations
  getDigitalTwinSimulations(companyId: string): Promise<DigitalTwinSimulation[]>;
  getDigitalTwinSimulation(id: string): Promise<DigitalTwinSimulation | undefined>;
  createDigitalTwinSimulation(simulation: InsertDigitalTwinSimulation): Promise<DigitalTwinSimulation>;
  updateDigitalTwinSimulation(id: string, simulation: Partial<InsertDigitalTwinSimulation>): Promise<DigitalTwinSimulation | undefined>;
  deleteDigitalTwinSimulation(id: string): Promise<void>;
  
  // Digital Twin - Alerts
  getDigitalTwinAlerts(companyId: string, filters?: { status?: string; severity?: string; category?: string }): Promise<DigitalTwinAlert[]>;
  getDigitalTwinAlert(id: string): Promise<DigitalTwinAlert | undefined>;
  createDigitalTwinAlert(alert: InsertDigitalTwinAlert): Promise<DigitalTwinAlert>;
  updateDigitalTwinAlert(id: string, alert: Partial<InsertDigitalTwinAlert>): Promise<DigitalTwinAlert | undefined>;
  
  // Digital Twin - Metrics
  getDigitalTwinMetrics(companyId: string, filters?: { metricName?: string; category?: string; startDate?: Date; endDate?: Date }): Promise<DigitalTwinMetric[]>;
  createDigitalTwinMetric(metric: InsertDigitalTwinMetric): Promise<DigitalTwinMetric>;
  createDigitalTwinMetricsBatch(metrics: InsertDigitalTwinMetric[]): Promise<DigitalTwinMetric[]>;
  
  // Activity Logs
  getActivityLogs(companyId: string, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // User Notification Preferences
  getUserNotificationPreferences(userId: string, companyId: string): Promise<UserNotificationPreferences | undefined>;
  upsertUserNotificationPreferences(prefs: InsertUserNotificationPreferences): Promise<UserNotificationPreferences>;
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

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email already exists (different from id conflict)
    if (userData.email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail.length > 0 && existingByEmail[0].id !== userData.id) {
        // User with this email exists but has a different ID - update the existing user
        const [updated] = await db
          .update(users)
          .set({
            ...userData,
            id: existingByEmail[0].id, // Keep the existing ID
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail[0].id))
          .returning();
        return updated;
      }
    }
    
    // Standard upsert on id
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

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const updateData: any = {};
    
    // Company Profile
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.industry !== undefined) updateData.industry = updates.industry;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.companySize !== undefined) updateData.companySize = updates.companySize;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    // Budget Configuration
    if (updates.annualBudget !== undefined) updateData.annualBudget = updates.annualBudget;
    if (updates.currentBudgetSpent !== undefined) updateData.currentBudgetSpent = updates.currentBudgetSpent;
    if (updates.budgetPeriod !== undefined) updateData.budgetPeriod = updates.budgetPeriod;
    if (updates.budgetStartDate !== undefined) updateData.budgetStartDate = updates.budgetStartDate;
    if (updates.budgetEndDate !== undefined) updateData.budgetEndDate = updates.budgetEndDate;
    if (updates.budgetResetDate !== undefined) updateData.budgetResetDate = updates.budgetResetDate;
    // Economic Policy Preferences
    if (updates.fdrThresholdLow !== undefined) updateData.fdrThresholdLow = updates.fdrThresholdLow;
    if (updates.fdrThresholdMid !== undefined) updateData.fdrThresholdMid = updates.fdrThresholdMid;
    if (updates.fdrThresholdHigh !== undefined) updateData.fdrThresholdHigh = updates.fdrThresholdHigh;
    if (updates.defaultProcurementPolicy !== undefined) updateData.defaultProcurementPolicy = updates.defaultProcurementPolicy;
    // Alert & Notification Preferences
    if (updates.alertEmail !== undefined) updateData.alertEmail = updates.alertEmail;
    if (updates.enableRegimeAlerts !== undefined) updateData.enableRegimeAlerts = updates.enableRegimeAlerts;
    if (updates.enableBudgetAlerts !== undefined) updateData.enableBudgetAlerts = updates.enableBudgetAlerts;
    if (updates.budgetAlertThreshold !== undefined) updateData.budgetAlertThreshold = updates.budgetAlertThreshold;
    if (updates.enableAllocationAlerts !== undefined) updateData.enableAllocationAlerts = updates.enableAllocationAlerts;
    if (updates.enablePriceAlerts !== undefined) updateData.enablePriceAlerts = updates.enablePriceAlerts;
    // Email Processing & Forwarding
    if (updates.emailForwardingEnabled !== undefined) updateData.emailForwardingEnabled = updates.emailForwardingEnabled;
    if (updates.emailForwardingAddress !== undefined) updateData.emailForwardingAddress = updates.emailForwardingAddress;
    if (updates.emailProcessingConsent !== undefined) updateData.emailProcessingConsent = updates.emailProcessingConsent;
    if (updates.emailRetentionDays !== undefined) updateData.emailRetentionDays = updates.emailRetentionDays;
    if (updates.emailAutoTagging !== undefined) updateData.emailAutoTagging = updates.emailAutoTagging;
    // AI & Chatbot Settings
    if (updates.aiChatbotEnabled !== undefined) updateData.aiChatbotEnabled = updates.aiChatbotEnabled;
    if (updates.aiDataAccessConsent !== undefined) updateData.aiDataAccessConsent = updates.aiDataAccessConsent;
    if (updates.aiCanAccessFinancials !== undefined) updateData.aiCanAccessFinancials = updates.aiCanAccessFinancials;
    if (updates.aiCanAccessSupplierData !== undefined) updateData.aiCanAccessSupplierData = updates.aiCanAccessSupplierData;
    if (updates.aiCanAccessAllocations !== undefined) updateData.aiCanAccessAllocations = updates.aiCanAccessAllocations;
    if (updates.aiCanAccessEmails !== undefined) updateData.aiCanAccessEmails = updates.aiCanAccessEmails;
    // Integration & API Settings
    if (updates.apiAccessEnabled !== undefined) updateData.apiAccessEnabled = updates.apiAccessEnabled;
    if (updates.apiKey !== undefined) updateData.apiKey = updates.apiKey;
    if (updates.webhookUrl !== undefined) updateData.webhookUrl = updates.webhookUrl;
    if (updates.webhookEvents !== undefined) updateData.webhookEvents = updates.webhookEvents;
    // Data & Privacy Settings
    if (updates.dataRetentionPolicy !== undefined) updateData.dataRetentionPolicy = updates.dataRetentionPolicy;
    if (updates.anonymizeOldData !== undefined) updateData.anonymizeOldData = updates.anonymizeOldData;
    if (updates.exportDataFormat !== undefined) updateData.exportDataFormat = updates.exportDataFormat;
    // Company Branding
    if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;
    if (updates.primaryColor !== undefined) updateData.primaryColor = updates.primaryColor;
    // Onboarding & Feature Flags
    if (updates.onboardingCompleted !== undefined) updateData.onboardingCompleted = updates.onboardingCompleted;
    if (updates.showOnboardingHints !== undefined) updateData.showOnboardingHints = updates.showOnboardingHints;
    // Slack Integration
    if (updates.slackWebhookUrl !== undefined) updateData.slackWebhookUrl = updates.slackWebhookUrl;
    if (updates.slackDefaultChannel !== undefined) updateData.slackDefaultChannel = updates.slackDefaultChannel;
    if (updates.slackEnabled !== undefined) updateData.slackEnabled = updates.slackEnabled;
    // Twilio Integration
    if (updates.twilioEnabled !== undefined) updateData.twilioEnabled = updates.twilioEnabled;
    if (updates.twilioAlertPhone !== undefined) updateData.twilioAlertPhone = updates.twilioAlertPhone;
    // HubSpot Integration
    if (updates.hubspotAccessToken !== undefined) updateData.hubspotAccessToken = updates.hubspotAccessToken;
    if (updates.hubspotRefreshToken !== undefined) updateData.hubspotRefreshToken = updates.hubspotRefreshToken;
    if (updates.hubspotEnabled !== undefined) updateData.hubspotEnabled = updates.hubspotEnabled;

    const [updated] = await db.update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  // Company Locations methods
  async getCompanyLocations(companyId: string): Promise<CompanyLocation[]> {
    return db.select().from(companyLocations).where(eq(companyLocations.companyId, companyId)).orderBy(desc(companyLocations.isPrimary), companyLocations.name);
  }

  async getCompanyLocation(id: string): Promise<CompanyLocation | undefined> {
    const [location] = await db.select().from(companyLocations).where(eq(companyLocations.id, id));
    return location;
  }

  async createCompanyLocation(insertLocation: InsertCompanyLocation): Promise<CompanyLocation> {
    const [location] = await db.insert(companyLocations).values(insertLocation).returning();
    return location;
  }

  async updateCompanyLocation(id: string, updates: UpdateCompanyLocation): Promise<CompanyLocation> {
    const [location] = await db.update(companyLocations).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(companyLocations.id, id)).returning();
    return location;
  }

  async deleteCompanyLocation(id: string): Promise<void> {
    await db.delete(companyLocations).where(eq(companyLocations.id, id));
  }
  
  async getSessionById(sessionId: string): Promise<any | undefined> {
    try {
      // Query the sessions table directly (created by connect-pg-simple)
      const result = await db.execute(
        sql`SELECT sess FROM sessions WHERE sid = ${sessionId}`
      );
      
      if (result.rows && result.rows.length > 0) {
        return (result.rows[0] as any).sess;
      }
      return undefined;
    } catch (error) {
      console.error('[Storage] Failed to get session:', error);
      return undefined;
    }
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

  async getAllBomsForCompany(companyId: string): Promise<Bom[]> {
    const companySkus = await db.select({ id: skus.id }).from(skus).where(eq(skus.companyId, companyId));
    if (companySkus.length === 0) return [];
    const skuIds = companySkus.map(s => s.id);
    return db.select().from(boms).where(inArray(boms.skuId, skuIds));
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

  async getAllSupplierMaterialsForCompany(companyId: string): Promise<SupplierMaterial[]> {
    const companySuppliers = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.companyId, companyId));
    if (companySuppliers.length === 0) return [];
    const supplierIds = companySuppliers.map(s => s.id);
    return db.select().from(supplierMaterials).where(inArray(supplierMaterials.supplierId, supplierIds));
  }

  async createSupplierMaterial(insertSm: InsertSupplierMaterial): Promise<SupplierMaterial> {
    const [sm] = await db.insert(supplierMaterials).values(insertSm).returning();
    return sm;
  }

  async getDemandHistory(skuId: string): Promise<DemandHistory[]> {
    return db.select().from(demandHistory).where(eq(demandHistory.skuId, skuId));
  }

  async getAllDemandHistoryForCompany(companyId: string): Promise<DemandHistory[]> {
    const companySkus = await db.select({ id: skus.id }).from(skus).where(eq(skus.companyId, companyId));
    if (companySkus.length === 0) return [];
    const skuIds = companySkus.map(s => s.id);
    return db.select().from(demandHistory).where(inArray(demandHistory.skuId, skuIds));
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

  // RFQ methods
  async getRfqs(companyId: string): Promise<Rfq[]> {
    return db.select().from(rfqs).where(eq(rfqs.companyId, companyId)).orderBy(desc(rfqs.createdAt));
  }

  async getRfq(id: string): Promise<Rfq | undefined> {
    const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, id));
    return rfq;
  }

  async createRfq(insertRfq: InsertRfq): Promise<Rfq> {
    const [rfq] = await db.insert(rfqs).values(insertRfq).returning();
    return rfq;
  }

  async updateRfq(id: string, updateData: Partial<InsertRfq>): Promise<Rfq | undefined> {
    const [rfq] = await db.update(rfqs)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(rfqs.id, id))
      .returning();
    return rfq;
  }

  async deleteRfq(id: string): Promise<void> {
    await db.delete(rfqs).where(eq(rfqs.id, id));
  }

  // RFQ Quote methods
  async getRfqQuotes(rfqId: string): Promise<RfqQuote[]> {
    return db.select().from(rfqQuotes).where(eq(rfqQuotes.rfqId, rfqId)).orderBy(desc(rfqQuotes.receivedAt));
  }

  async createRfqQuote(insertQuote: InsertRfqQuote): Promise<RfqQuote> {
    const [quote] = await db.insert(rfqQuotes).values(insertQuote).returning();
    return quote;
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

  // Audit Finding methods
  async getAuditFindings(companyId: string): Promise<AuditFinding[]> {
    return db.select().from(auditFindings).where(eq(auditFindings.companyId, companyId));
  }

  async getAuditFindingsByAudit(auditId: string): Promise<AuditFinding[]> {
    return db.select().from(auditFindings).where(eq(auditFindings.auditId, auditId));
  }

  async createAuditFinding(insertFinding: InsertAuditFinding): Promise<AuditFinding> {
    const [finding] = await db.insert(auditFindings).values(insertFinding).returning();
    return finding;
  }

  async updateAuditFinding(id: string, updateData: Partial<InsertAuditFinding>): Promise<AuditFinding | undefined> {
    const [finding] = await db.update(auditFindings).set({ ...updateData, updatedAt: new Date() }).where(eq(auditFindings.id, id)).returning();
    return finding;
  }

  // Audit Checklist Template methods
  async getAuditChecklistTemplates(companyId: string): Promise<AuditChecklistTemplate[]> {
    return db.select().from(auditChecklistTemplates).where(
      sql`${auditChecklistTemplates.companyId} = ${companyId} OR ${auditChecklistTemplates.isSystemTemplate} = true`
    );
  }

  async getSystemChecklistTemplates(): Promise<AuditChecklistTemplate[]> {
    return db.select().from(auditChecklistTemplates).where(eq(auditChecklistTemplates.isSystemTemplate, true));
  }

  async createAuditChecklistTemplate(insertTemplate: InsertAuditChecklistTemplate): Promise<AuditChecklistTemplate> {
    const [template] = await db.insert(auditChecklistTemplates).values(insertTemplate).returning();
    return template;
  }

  // Compliance Calendar Event methods
  async getComplianceCalendarEvents(companyId: string): Promise<ComplianceCalendarEvent[]> {
    return db.select().from(complianceCalendarEvents).where(eq(complianceCalendarEvents.companyId, companyId));
  }

  async createComplianceCalendarEvent(insertEvent: InsertComplianceCalendarEvent): Promise<ComplianceCalendarEvent> {
    const [event] = await db.insert(complianceCalendarEvents).values(insertEvent).returning();
    return event;
  }

  async updateComplianceCalendarEvent(id: string, updateData: Partial<InsertComplianceCalendarEvent>): Promise<ComplianceCalendarEvent | undefined> {
    const [event] = await db.update(complianceCalendarEvents).set({ ...updateData, updatedAt: new Date() }).where(eq(complianceCalendarEvents.id, id)).returning();
    return event;
  }

  // Employee Training Record methods
  async getEmployeeTrainingRecords(companyId: string): Promise<EmployeeTrainingRecord[]> {
    return db.select().from(employeeTrainingRecords).where(eq(employeeTrainingRecords.companyId, companyId));
  }

  async createEmployeeTrainingRecord(insertRecord: InsertEmployeeTrainingRecord): Promise<EmployeeTrainingRecord> {
    const [record] = await db.insert(employeeTrainingRecords).values(insertRecord).returning();
    return record;
  }

  async updateEmployeeTrainingRecord(id: string, updateData: Partial<InsertEmployeeTrainingRecord>): Promise<EmployeeTrainingRecord | undefined> {
    const [record] = await db.update(employeeTrainingRecords).set({ ...updateData, updatedAt: new Date() }).where(eq(employeeTrainingRecords.id, id)).returning();
    return record;
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

  // Multi-Horizon Forecasting methods
  async getMultiHorizonForecasts(companyId: string, options?: { skuId?: string; horizonDays?: number }): Promise<MultiHorizonForecast[]> {
    let query = db.select().from(multiHorizonForecasts).where(eq(multiHorizonForecasts.companyId, companyId)).$dynamic();
    
    if (options?.skuId) {
      query = query.where(eq(multiHorizonForecasts.skuId, options.skuId));
    }
    
    if (options?.horizonDays !== undefined) {
      query = query.where(eq(multiHorizonForecasts.horizonDays, options.horizonDays));
    }
    
    return query.orderBy(desc(multiHorizonForecasts.createdAt));
  }

  async createMultiHorizonForecast(insertForecast: InsertMultiHorizonForecast): Promise<MultiHorizonForecast> {
    const [forecast] = await db.insert(multiHorizonForecasts).values(insertForecast).returning();
    return forecast;
  }

  async createMultiHorizonForecasts(insertForecasts: InsertMultiHorizonForecast[]): Promise<MultiHorizonForecast[]> {
    return db.insert(multiHorizonForecasts).values(insertForecasts).returning();
  }

  async updateMultiHorizonForecast(id: string, updates: Partial<InsertMultiHorizonForecast>): Promise<MultiHorizonForecast> {
    const [forecast] = await db.update(multiHorizonForecasts).set(updates).where(eq(multiHorizonForecasts.id, id)).returning();
    return forecast;
  }

  async getMultiHorizonForecastComparison(companyId: string, skuId: string) {
    const result = await db
      .select({
        horizonDays: multiHorizonForecasts.horizonDays,
        avgPredictedDemand: sql<number>`AVG(${multiHorizonForecasts.predictedDemand})`,
        avgActualDemand: sql<number>`AVG(${multiHorizonForecasts.actualDemand})`,
        avgAccuracy: sql<number>`AVG(${multiHorizonForecasts.accuracy})`,
        forecastCount: sql<number>`COUNT(*)::int`,
      })
      .from(multiHorizonForecasts)
      .where(and(
        eq(multiHorizonForecasts.companyId, companyId),
        eq(multiHorizonForecasts.skuId, skuId)
      ))
      .groupBy(multiHorizonForecasts.horizonDays)
      .orderBy(multiHorizonForecasts.horizonDays);

    return result;
  }

  // Forecast Accuracy methods
  async getForecastAccuracyMetrics(companyId: string) {
    // Get basic metrics from demand predictions
    const basicResult = await db
      .select({
        totalPredictions: sql<number>`COUNT(*)::int`,
        predictionsWithActuals: sql<number>`COUNT(CASE WHEN ${demandPredictions.actualDemand} IS NOT NULL THEN 1 END)::int`,
        avgPredicted: sql<number>`AVG(${demandPredictions.predictedDemand})`,
        avgActual: sql<number>`AVG(${demandPredictions.actualDemand})`,
        overallMape: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL AND ${demandPredictions.actualDemand} > 0 
              THEN ABS((${demandPredictions.actualDemand} - ${demandPredictions.predictedDemand}) / ${demandPredictions.actualDemand}) * 100
            END
          )`,
        bias: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL 
              THEN (${demandPredictions.predictedDemand} - ${demandPredictions.actualDemand})
            END
          )`,
        mae: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL 
              THEN ABS(${demandPredictions.predictedDemand} - ${demandPredictions.actualDemand})
            END
          )`,
        rmse: sql<number>`
          SQRT(AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL 
              THEN POWER(${demandPredictions.predictedDemand} - ${demandPredictions.actualDemand}, 2)
            END
          ))`
      })
      .from(demandPredictions)
      .where(eq(demandPredictions.companyId, companyId));

    // Get enhanced metrics from forecast accuracy tracking (most recent per SKU, then averaged)
    const enhancedResult = await db
      .select({
        avgTrackingSignal: sql<number>`AVG(${forecastAccuracyTracking.trackingSignal})`,
        avgTheilsU: sql<number>`AVG(${forecastAccuracyTracking.theilsU})`,
        avgDirectionalAccuracy: sql<number>`AVG(${forecastAccuracyTracking.directionalAccuracy})`,
        avgConfidenceHitRate: sql<number>`AVG(${forecastAccuracyTracking.confidenceHitRate})`
      })
      .from(forecastAccuracyTracking)
      .where(eq(forecastAccuracyTracking.companyId, companyId));
    
    const basic = basicResult[0];
    const enhanced = enhancedResult[0];
    
    return {
      ...basic,
      trackingSignal: enhanced?.avgTrackingSignal ?? null,
      theilsU: enhanced?.avgTheilsU ?? null,
      directionalAccuracy: enhanced?.avgDirectionalAccuracy ?? null,
      confidenceHitRate: enhanced?.avgConfidenceHitRate ?? null
    };
  }

  async getForecastAccuracyByPeriod(companyId: string) {
    return db
      .select({
        period: demandPredictions.forecastPeriod,
        count: sql<number>`COUNT(*)::int`,
        totalPredicted: sql<number>`SUM(${demandPredictions.predictedDemand})`,
        totalActual: sql<number>`SUM(${demandPredictions.actualDemand})`,
        mape: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL AND ${demandPredictions.actualDemand} > 0 
              THEN ABS((${demandPredictions.actualDemand} - ${demandPredictions.predictedDemand}) / ${demandPredictions.actualDemand}) * 100
            END
          )`,
        bias: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL 
              THEN (${demandPredictions.predictedDemand} - ${demandPredictions.actualDemand})
            END
          )`
      })
      .from(demandPredictions)
      .where(and(
        eq(demandPredictions.companyId, companyId),
        sql`${demandPredictions.actualDemand} IS NOT NULL`
      ))
      .groupBy(demandPredictions.forecastPeriod)
      .orderBy(demandPredictions.forecastPeriod);
  }

  async getForecastAccuracyBySku(companyId: string) {
    return db
      .select({
        skuId: demandPredictions.skuId,
        skuName: skus.name,
        count: sql<number>`COUNT(*)::int`,
        totalPredicted: sql<number>`SUM(${demandPredictions.predictedDemand})`,
        totalActual: sql<number>`SUM(${demandPredictions.actualDemand})`,
        mape: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL AND ${demandPredictions.actualDemand} > 0 
              THEN ABS((${demandPredictions.actualDemand} - ${demandPredictions.predictedDemand}) / ${demandPredictions.actualDemand}) * 100
            END
          )`,
        bias: sql<number>`
          AVG(
            CASE 
              WHEN ${demandPredictions.actualDemand} IS NOT NULL 
              THEN (${demandPredictions.predictedDemand} - ${demandPredictions.actualDemand})
            END
          )`
      })
      .from(demandPredictions)
      .leftJoin(skus, eq(demandPredictions.skuId, skus.id))
      .where(and(
        eq(demandPredictions.companyId, companyId),
        sql`${demandPredictions.actualDemand} IS NOT NULL`
      ))
      .groupBy(demandPredictions.skuId, skus.name)
      .orderBy(sql`AVG(CASE WHEN ${demandPredictions.actualDemand} IS NOT NULL AND ${demandPredictions.actualDemand} > 0 THEN ABS((${demandPredictions.actualDemand} - ${demandPredictions.predictedDemand}) / ${demandPredictions.actualDemand}) * 100 END) DESC NULLS LAST`);
  }

  async getPredictionsWithActuals(companyId: string, limit: number = 100): Promise<DemandPrediction[]> {
    return db
      .select()
      .from(demandPredictions)
      .where(and(
        eq(demandPredictions.companyId, companyId),
        sql`${demandPredictions.actualDemand} IS NOT NULL`
      ))
      .orderBy(desc(demandPredictions.createdAt))
      .limit(limit);
  }

  // Forecast Accuracy Tracking & Monitoring methods
  async getForecastAccuracyTracking(companyId: string, options?: { skuId?: string; limit?: number }): Promise<ForecastAccuracyTracking[]> {
    let query = db.select().from(forecastAccuracyTracking)
      .where(eq(forecastAccuracyTracking.companyId, companyId))
      .$dynamic();
    
    if (options?.skuId) {
      query = query.where(eq(forecastAccuracyTracking.skuId, options.skuId));
    }
    
    query = query.orderBy(desc(forecastAccuracyTracking.measurementDate));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return query;
  }

  async getLatestForecastAccuracyBySKU(companyId: string, skuId: string): Promise<ForecastAccuracyTracking | undefined> {
    const results = await db.select().from(forecastAccuracyTracking)
      .where(and(
        eq(forecastAccuracyTracking.companyId, companyId),
        eq(forecastAccuracyTracking.skuId, skuId)
      ))
      .orderBy(desc(forecastAccuracyTracking.measurementDate))
      .limit(1);
    
    return results[0];
  }

  async createForecastAccuracyTracking(tracking: InsertForecastAccuracyTracking): Promise<ForecastAccuracyTracking> {
    const [result] = await db.insert(forecastAccuracyTracking).values(tracking).returning();
    return result;
  }

  async getForecastDegradationAlerts(companyId: string, options?: { skuId?: string; resolved?: boolean; severity?: string }): Promise<ForecastDegradationAlert[]> {
    let query = db.select().from(forecastDegradationAlerts)
      .where(eq(forecastDegradationAlerts.companyId, companyId))
      .$dynamic();
    
    if (options?.skuId) {
      query = query.where(eq(forecastDegradationAlerts.skuId, options.skuId));
    }
    
    if (options?.resolved !== undefined) {
      query = query.where(eq(forecastDegradationAlerts.resolved, options.resolved ? 1 : 0));
    }
    
    if (options?.severity) {
      query = query.where(eq(forecastDegradationAlerts.severity, options.severity));
    }
    
    query = query.orderBy(desc(forecastDegradationAlerts.triggeredAt));
    
    return query;
  }

  async createForecastDegradationAlert(alert: InsertForecastDegradationAlert): Promise<ForecastDegradationAlert> {
    const [result] = await db.insert(forecastDegradationAlerts).values(alert).returning();
    return result;
  }

  async acknowledgeForecastAlert(id: string, userId: string): Promise<ForecastDegradationAlert> {
    const [result] = await db.update(forecastDegradationAlerts)
      .set({
        acknowledged: 1,
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      })
      .where(eq(forecastDegradationAlerts.id, id))
      .returning();
    return result;
  }

  async resolveForecastAlert(id: string, actionTaken: string, userId: string): Promise<ForecastDegradationAlert> {
    const [result] = await db.update(forecastDegradationAlerts)
      .set({
        resolved: 1,
        resolvedAt: new Date(),
        actionTaken,
        actionTakenAt: new Date(),
        actionTakenBy: userId
      })
      .where(eq(forecastDegradationAlerts.id, id))
      .returning();
    return result;
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

  // Multi-Tier Supplier Mapping methods
  async getSupplierTiers(companyId: string): Promise<SupplierTier[]> {
    return db.select().from(supplierTiers).where(eq(supplierTiers.companyId, companyId));
  }

  async getSupplierTier(id: string): Promise<SupplierTier | undefined> {
    const [tier] = await db.select().from(supplierTiers).where(eq(supplierTiers.id, id));
    return tier;
  }

  async getSupplierTierBySupplier(supplierId: string): Promise<SupplierTier | undefined> {
    const [tier] = await db.select().from(supplierTiers).where(eq(supplierTiers.supplierId, supplierId));
    return tier;
  }

  async createSupplierTier(insertTier: InsertSupplierTier): Promise<SupplierTier> {
    const [tier] = await db.insert(supplierTiers).values(insertTier).returning();
    return tier;
  }

  async updateSupplierTier(id: string, tier: Partial<InsertSupplierTier>): Promise<SupplierTier | undefined> {
    const [updated] = await db.update(supplierTiers).set({ ...tier, updatedAt: new Date() }).where(eq(supplierTiers.id, id)).returning();
    return updated;
  }

  async deleteSupplierTier(id: string): Promise<void> {
    await db.delete(supplierTiers).where(eq(supplierTiers.id, id));
  }

  async getSupplierRelationships(companyId: string): Promise<SupplierRelationship[]> {
    return db.select().from(supplierRelationships).where(eq(supplierRelationships.companyId, companyId));
  }

  async getSupplierRelationship(id: string): Promise<SupplierRelationship | undefined> {
    const [rel] = await db.select().from(supplierRelationships).where(eq(supplierRelationships.id, id));
    return rel;
  }

  async getSupplierRelationshipsByParent(parentSupplierId: string): Promise<SupplierRelationship[]> {
    return db.select().from(supplierRelationships).where(eq(supplierRelationships.parentSupplierId, parentSupplierId));
  }

  async getSupplierRelationshipsByChild(childSupplierId: string): Promise<SupplierRelationship[]> {
    return db.select().from(supplierRelationships).where(eq(supplierRelationships.childSupplierId, childSupplierId));
  }

  async createSupplierRelationship(insertRel: InsertSupplierRelationship): Promise<SupplierRelationship> {
    const [rel] = await db.insert(supplierRelationships).values(insertRel).returning();
    return rel;
  }

  async updateSupplierRelationship(id: string, rel: Partial<InsertSupplierRelationship>): Promise<SupplierRelationship | undefined> {
    const [updated] = await db.update(supplierRelationships).set({ ...rel, updatedAt: new Date() }).where(eq(supplierRelationships.id, id)).returning();
    return updated;
  }

  async deleteSupplierRelationship(id: string): Promise<void> {
    await db.delete(supplierRelationships).where(eq(supplierRelationships.id, id));
  }

  async getSupplierRegionRisks(companyId?: string): Promise<SupplierRegionRisk[]> {
    if (companyId) {
      return db.select().from(supplierRegionRisks).where(eq(supplierRegionRisks.companyId, companyId));
    }
    return db.select().from(supplierRegionRisks);
  }

  async getSupplierRegionRisk(id: string): Promise<SupplierRegionRisk | undefined> {
    const [risk] = await db.select().from(supplierRegionRisks).where(eq(supplierRegionRisks.id, id));
    return risk;
  }

  async getSupplierRegionRiskByCountry(country: string): Promise<SupplierRegionRisk[]> {
    return db.select().from(supplierRegionRisks).where(eq(supplierRegionRisks.country, country));
  }

  async createSupplierRegionRisk(insertRisk: InsertSupplierRegionRisk): Promise<SupplierRegionRisk> {
    const [risk] = await db.insert(supplierRegionRisks).values(insertRisk).returning();
    return risk;
  }

  async updateSupplierRegionRisk(id: string, risk: Partial<InsertSupplierRegionRisk>): Promise<SupplierRegionRisk | undefined> {
    const [updated] = await db.update(supplierRegionRisks).set({ ...risk, lastUpdated: new Date() }).where(eq(supplierRegionRisks.id, id)).returning();
    return updated;
  }

  async deleteSupplierRegionRisk(id: string): Promise<void> {
    await db.delete(supplierRegionRisks).where(eq(supplierRegionRisks.id, id));
  }

  async getSupplierTierAlerts(companyId: string): Promise<SupplierTierAlert[]> {
    return db.select().from(supplierTierAlerts).where(eq(supplierTierAlerts.companyId, companyId)).orderBy(desc(supplierTierAlerts.createdAt));
  }

  async getSupplierTierAlert(id: string): Promise<SupplierTierAlert | undefined> {
    const [alert] = await db.select().from(supplierTierAlerts).where(eq(supplierTierAlerts.id, id));
    return alert;
  }

  async getActiveSupplierTierAlerts(companyId: string): Promise<SupplierTierAlert[]> {
    return db.select().from(supplierTierAlerts).where(and(eq(supplierTierAlerts.companyId, companyId), eq(supplierTierAlerts.status, "active"))).orderBy(desc(supplierTierAlerts.createdAt));
  }

  async createSupplierTierAlert(insertAlert: InsertSupplierTierAlert): Promise<SupplierTierAlert> {
    const [alert] = await db.insert(supplierTierAlerts).values(insertAlert).returning();
    return alert;
  }

  async updateSupplierTierAlert(id: string, alert: Partial<InsertSupplierTierAlert>): Promise<SupplierTierAlert | undefined> {
    const [updated] = await db.update(supplierTierAlerts).set({ ...alert, updatedAt: new Date() }).where(eq(supplierTierAlerts.id, id)).returning();
    return updated;
  }

  async acknowledgeSupplierTierAlert(id: string, userId: string): Promise<SupplierTierAlert | undefined> {
    const [updated] = await db.update(supplierTierAlerts).set({ status: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: userId, updatedAt: new Date() }).where(eq(supplierTierAlerts.id, id)).returning();
    return updated;
  }

  async resolveSupplierTierAlert(id: string, userId: string, resolution: string): Promise<SupplierTierAlert | undefined> {
    const [updated] = await db.update(supplierTierAlerts).set({ status: "resolved", resolvedAt: new Date(), resolvedBy: userId, resolution, updatedAt: new Date() }).where(eq(supplierTierAlerts.id, id)).returning();
    return updated;
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

  // Employee Skill Certifications (Skills Matrix) methods
  async getEmployeeSkillCertifications(companyId: string): Promise<EmployeeSkillCertification[]> {
    return db.select().from(employeeSkillCertifications).where(eq(employeeSkillCertifications.companyId, companyId));
  }

  async getEmployeeSkillCertificationsByEmployee(employeeId: string): Promise<EmployeeSkillCertification[]> {
    return db.select().from(employeeSkillCertifications).where(eq(employeeSkillCertifications.employeeId, employeeId));
  }

  async createEmployeeSkillCertification(insertCert: InsertEmployeeSkillCertification): Promise<EmployeeSkillCertification> {
    const [cert] = await db.insert(employeeSkillCertifications).values(insertCert).returning();
    return cert;
  }

  async updateEmployeeSkillCertification(id: string, updateData: Partial<InsertEmployeeSkillCertification>): Promise<EmployeeSkillCertification | undefined> {
    const [cert] = await db.update(employeeSkillCertifications).set({ ...updateData, updatedAt: new Date() }).where(eq(employeeSkillCertifications.id, id)).returning();
    return cert;
  }

  async deleteEmployeeSkillCertification(id: string): Promise<void> {
    await db.delete(employeeSkillCertifications).where(eq(employeeSkillCertifications.id, id));
  }

  // Shift Assignments (Schedule Builder) methods
  async getShiftAssignments(companyId: string): Promise<ShiftAssignment[]> {
    return db.select().from(shiftAssignments).where(eq(shiftAssignments.companyId, companyId)).orderBy(desc(shiftAssignments.shiftDate));
  }

  async getShiftAssignmentsByDate(companyId: string, date: Date): Promise<ShiftAssignment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return db.select().from(shiftAssignments).where(
      and(
        eq(shiftAssignments.companyId, companyId),
        gte(shiftAssignments.shiftDate, startOfDay),
        lte(shiftAssignments.shiftDate, endOfDay)
      )
    );
  }

  async getShiftAssignmentsByEmployee(employeeId: string): Promise<ShiftAssignment[]> {
    return db.select().from(shiftAssignments).where(eq(shiftAssignments.employeeId, employeeId)).orderBy(desc(shiftAssignments.shiftDate));
  }

  async getShiftAssignmentsByWeek(companyId: string, weekStart: Date): Promise<ShiftAssignment[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return db.select().from(shiftAssignments).where(
      and(
        eq(shiftAssignments.companyId, companyId),
        gte(shiftAssignments.shiftDate, weekStart),
        lt(shiftAssignments.shiftDate, weekEnd)
      )
    );
  }

  async createShiftAssignment(insertAssignment: InsertShiftAssignment): Promise<ShiftAssignment> {
    const [assignment] = await db.insert(shiftAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async updateShiftAssignment(id: string, updateData: Partial<InsertShiftAssignment>): Promise<ShiftAssignment | undefined> {
    const [assignment] = await db.update(shiftAssignments).set({ ...updateData, updatedAt: new Date() }).where(eq(shiftAssignments.id, id)).returning();
    return assignment;
  }

  async deleteShiftAssignment(id: string): Promise<void> {
    await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
  }

  // Weekly Schedules methods
  async getWeeklySchedules(companyId: string): Promise<WeeklySchedule[]> {
    return db.select().from(weeklySchedules).where(eq(weeklySchedules.companyId, companyId)).orderBy(desc(weeklySchedules.weekStartDate));
  }

  async getWeeklySchedule(id: string): Promise<WeeklySchedule | undefined> {
    const [schedule] = await db.select().from(weeklySchedules).where(eq(weeklySchedules.id, id));
    return schedule;
  }

  async createWeeklySchedule(insertSchedule: InsertWeeklySchedule): Promise<WeeklySchedule> {
    const [schedule] = await db.insert(weeklySchedules).values(insertSchedule).returning();
    return schedule;
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

  async getEconomicSnapshotHistory(companyId: string, limit: number = 100): Promise<EconomicSnapshot[]> {
    return await db.select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(sql`${economicSnapshots.timestamp} DESC`)
      .limit(limit);
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

  // ==================== ENTERPRISE FEATURES IMPLEMENTATIONS ====================
  
  // Feature Toggles
  async getFeatureToggles(companyId: string): Promise<FeatureToggle[]> {
    return await db.select().from(featureToggles).where(eq(featureToggles.companyId, companyId));
  }

  async getFeatureToggle(companyId: string, featureKey: string): Promise<FeatureToggle | undefined> {
    const [toggle] = await db.select().from(featureToggles)
      .where(and(eq(featureToggles.companyId, companyId), eq(featureToggles.featureKey, featureKey)));
    return toggle;
  }

  async createFeatureToggle(insertToggle: InsertFeatureToggle): Promise<FeatureToggle> {
    const [toggle] = await db.insert(featureToggles).values(insertToggle).returning();
    return toggle;
  }

  async updateFeatureToggle(companyId: string, featureKey: string, enabled: number): Promise<FeatureToggle | undefined> {
    const [toggle] = await db.update(featureToggles)
      .set({ 
        enabled, 
        enabledAt: enabled === 1 ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(and(eq(featureToggles.companyId, companyId), eq(featureToggles.featureKey, featureKey)))
      .returning();
    return toggle;
  }

  // Supply Chain Network Intelligence - Supplier Nodes
  async getSupplierNodes(companyId: string): Promise<SupplierNode[]> {
    return await db.select().from(supplierNodes).where(eq(supplierNodes.companyId, companyId));
  }

  async getSupplierNode(id: string): Promise<SupplierNode | undefined> {
    const [node] = await db.select().from(supplierNodes).where(eq(supplierNodes.id, id));
    return node;
  }

  async getSupplierNodesByTier(companyId: string, tier: number): Promise<SupplierNode[]> {
    return await db.select().from(supplierNodes)
      .where(and(eq(supplierNodes.companyId, companyId), eq(supplierNodes.tier, tier)));
  }

  async getSupplierNodesByCriticality(companyId: string, criticality: string): Promise<SupplierNode[]> {
    return await db.select().from(supplierNodes)
      .where(and(eq(supplierNodes.companyId, companyId), eq(supplierNodes.criticality, criticality)));
  }

  async getCriticalSupplierNodes(companyId: string): Promise<SupplierNode[]> {
    return await db.select().from(supplierNodes)
      .where(and(
        eq(supplierNodes.companyId, companyId),
        sql`${supplierNodes.criticality} IN ('high', 'critical')`
      ));
  }

  async createSupplierNode(insertNode: InsertSupplierNode): Promise<SupplierNode> {
    const [node] = await db.insert(supplierNodes).values(insertNode).returning();
    return node;
  }

  async updateSupplierNode(id: string, nodeUpdate: Partial<InsertSupplierNode>): Promise<SupplierNode | undefined> {
    const [node] = await db.update(supplierNodes)
      .set({ ...nodeUpdate, updatedAt: new Date() })
      .where(eq(supplierNodes.id, id))
      .returning();
    return node;
  }

  // Supply Chain Network Intelligence - Supplier Links
  async getSupplierLinks(companyId: string): Promise<SupplierLink[]> {
    return await db.select().from(supplierLinks).where(eq(supplierLinks.companyId, companyId));
  }

  async getSupplierLinksFrom(nodeId: string): Promise<SupplierLink[]> {
    return await db.select().from(supplierLinks).where(eq(supplierLinks.fromNodeId, nodeId));
  }

  async getSupplierLinksTo(nodeId: string): Promise<SupplierLink[]> {
    return await db.select().from(supplierLinks).where(eq(supplierLinks.toNodeId, nodeId));
  }

  async createSupplierLink(insertLink: InsertSupplierLink): Promise<SupplierLink> {
    const [link] = await db.insert(supplierLinks).values(insertLink).returning();
    return link;
  }

  // Supply Chain Network Intelligence - Health Metrics
  async getSupplierHealthMetrics(nodeId: string): Promise<SupplierHealthMetrics[]> {
    return await db.select().from(supplierHealthMetrics)
      .where(eq(supplierHealthMetrics.supplierNodeId, nodeId))
      .orderBy(sql`${supplierHealthMetrics.timestamp} DESC`);
  }

  async getLatestSupplierHealthMetric(nodeId: string): Promise<SupplierHealthMetrics | undefined> {
    const [metric] = await db.select().from(supplierHealthMetrics)
      .where(eq(supplierHealthMetrics.supplierNodeId, nodeId))
      .orderBy(sql`${supplierHealthMetrics.timestamp} DESC`)
      .limit(1);
    return metric;
  }

  async createSupplierHealthMetric(insertMetric: InsertSupplierHealthMetrics): Promise<SupplierHealthMetrics> {
    const [metric] = await db.insert(supplierHealthMetrics).values(insertMetric).returning();
    return metric;
  }

  // Supply Chain Network Intelligence - Risk Alerts
  async getSupplierRiskAlerts(companyId: string): Promise<SupplierRiskAlert[]> {
    return await db.select().from(supplierRiskAlerts)
      .where(eq(supplierRiskAlerts.companyId, companyId))
      .orderBy(sql`${supplierRiskAlerts.createdAt} DESC`);
  }

  async getActiveSupplierRiskAlerts(companyId: string): Promise<SupplierRiskAlert[]> {
    return await db.select().from(supplierRiskAlerts)
      .where(and(
        eq(supplierRiskAlerts.companyId, companyId),
        sql`${supplierRiskAlerts.resolvedAt} IS NULL`
      ))
      .orderBy(sql`${supplierRiskAlerts.createdAt} DESC`);
  }

  async getSupplierRiskAlertsByNode(nodeId: string): Promise<SupplierRiskAlert[]> {
    return await db.select().from(supplierRiskAlerts)
      .where(eq(supplierRiskAlerts.supplierNodeId, nodeId))
      .orderBy(sql`${supplierRiskAlerts.createdAt} DESC`);
  }

  async getSupplierRiskAlertsBySeverity(companyId: string, severity: string): Promise<SupplierRiskAlert[]> {
    return await db.select().from(supplierRiskAlerts)
      .where(and(
        eq(supplierRiskAlerts.companyId, companyId),
        eq(supplierRiskAlerts.severity, severity)
      ))
      .orderBy(sql`${supplierRiskAlerts.createdAt} DESC`);
  }

  async createSupplierRiskAlert(insertAlert: InsertSupplierRiskAlert): Promise<SupplierRiskAlert> {
    const [alert] = await db.insert(supplierRiskAlerts).values(insertAlert).returning();
    return alert;
  }

  async acknowledgeSupplierRiskAlert(id: string, userId: string): Promise<SupplierRiskAlert | undefined> {
    const [alert] = await db.update(supplierRiskAlerts)
      .set({ acknowledgedAt: new Date(), acknowledgedBy: userId })
      .where(eq(supplierRiskAlerts.id, id))
      .returning();
    return alert;
  }

  async resolveSupplierRiskAlert(id: string, userId: string): Promise<SupplierRiskAlert | undefined> {
    const [alert] = await db.update(supplierRiskAlerts)
      .set({ resolvedAt: new Date(), resolvedBy: userId })
      .where(eq(supplierRiskAlerts.id, id))
      .returning();
    return alert;
  }

  // Automated PO Execution - PO Rules
  async getPoRules(companyId: string): Promise<PoRule[]> {
    return await db.select().from(poRules).where(eq(poRules.companyId, companyId));
  }

  async getPoRule(id: string): Promise<PoRule | undefined> {
    const [rule] = await db.select().from(poRules).where(eq(poRules.id, id));
    return rule;
  }

  async getEnabledPoRules(companyId: string): Promise<PoRule[]> {
    return await db.select().from(poRules)
      .where(and(eq(poRules.companyId, companyId), eq(poRules.enabled, 1)))
      .orderBy(sql`${poRules.priority} DESC`);
  }

  async getPoRulesByMaterial(materialId: string): Promise<PoRule[]> {
    return await db.select().from(poRules).where(eq(poRules.materialId, materialId));
  }

  async createPoRule(insertRule: InsertPoRule): Promise<PoRule> {
    const [rule] = await db.insert(poRules).values(insertRule).returning();
    return rule;
  }

  async updatePoRule(id: string, ruleUpdate: Partial<InsertPoRule>): Promise<PoRule | undefined> {
    const [rule] = await db.update(poRules)
      .set({ ...ruleUpdate, updatedAt: new Date() })
      .where(eq(poRules.id, id))
      .returning();
    return rule;
  }

  async deletePoRule(id: string): Promise<void> {
    await db.delete(poRules).where(eq(poRules.id, id));
  }

  // Automated PO Execution - Workflow Steps
  async getPoWorkflowSteps(purchaseOrderId: string): Promise<PoWorkflowStep[]> {
    return await db.select().from(poWorkflowSteps)
      .where(eq(poWorkflowSteps.purchaseOrderId, purchaseOrderId))
      .orderBy(sql`${poWorkflowSteps.stepNumber} ASC`);
  }

  async getPoWorkflowStepsByPO(purchaseOrderId: string): Promise<PoWorkflowStep[]> {
    return await db.select().from(poWorkflowSteps)
      .where(eq(poWorkflowSteps.purchaseOrderId, purchaseOrderId))
      .orderBy(sql`${poWorkflowSteps.stepNumber} ASC`);
  }

  async createPoWorkflowStep(insertStep: InsertPoWorkflowStep): Promise<PoWorkflowStep> {
    const [step] = await db.insert(poWorkflowSteps).values(insertStep).returning();
    return step;
  }

  async updatePoWorkflowStep(id: string, stepUpdate: Partial<InsertPoWorkflowStep>): Promise<PoWorkflowStep | undefined> {
    const [step] = await db.update(poWorkflowSteps)
      .set(stepUpdate)
      .where(eq(poWorkflowSteps.id, id))
      .returning();
    return step;
  }

  // Automated PO Execution - Approvals
  async getPoApprovals(purchaseOrderId: string): Promise<PoApproval[]> {
    return await db.select().from(poApprovals)
      .where(eq(poApprovals.purchaseOrderId, purchaseOrderId))
      .orderBy(sql`${poApprovals.createdAt} DESC`);
  }

  async getPoApprovalsByApprover(approverId: string): Promise<PoApproval[]> {
    return await db.select().from(poApprovals)
      .where(eq(poApprovals.approverId, approverId))
      .orderBy(sql`${poApprovals.createdAt} DESC`);
  }

  async createPoApproval(insertApproval: InsertPoApproval): Promise<PoApproval> {
    const [approval] = await db.insert(poApprovals).values(insertApproval).returning();
    return approval;
  }

  // Automated PO Execution - Negotiation Playbooks
  async getNegotiationPlaybooks(companyId: string): Promise<NegotiationPlaybook[]> {
    return await db.select().from(negotiationPlaybooks).where(eq(negotiationPlaybooks.companyId, companyId));
  }

  async getNegotiationPlaybooksByRegime(companyId: string, regime: string): Promise<NegotiationPlaybook[]> {
    return await db.select().from(negotiationPlaybooks)
      .where(and(eq(negotiationPlaybooks.companyId, companyId), eq(negotiationPlaybooks.regime, regime)));
  }

  async getNegotiationPlaybook(id: string): Promise<NegotiationPlaybook | undefined> {
    const [playbook] = await db.select().from(negotiationPlaybooks).where(eq(negotiationPlaybooks.id, id));
    return playbook;
  }

  async createNegotiationPlaybook(insertPlaybook: InsertNegotiationPlaybook): Promise<NegotiationPlaybook> {
    const [playbook] = await db.insert(negotiationPlaybooks).values(insertPlaybook).returning();
    return playbook;
  }

  async updateNegotiationPlaybook(id: string, playbookUpdate: Partial<InsertNegotiationPlaybook>): Promise<NegotiationPlaybook | undefined> {
    const [playbook] = await db.update(negotiationPlaybooks)
      .set({ ...playbookUpdate, updatedAt: new Date() })
      .where(eq(negotiationPlaybooks.id, id))
      .returning();
    return playbook;
  }

  // Automated PO Execution - ERP Connections
  async getErpConnections(companyId: string): Promise<ErpConnection[]> {
    return await db.select().from(erpConnections).where(eq(erpConnections.companyId, companyId));
  }

  async getErpConnection(id: string): Promise<ErpConnection | undefined> {
    const [connection] = await db.select().from(erpConnections).where(eq(erpConnections.id, id));
    return connection;
  }

  async getActiveErpConnection(companyId: string): Promise<ErpConnection | undefined> {
    const [connection] = await db.select().from(erpConnections)
      .where(and(eq(erpConnections.companyId, companyId), eq(erpConnections.status, 'active')))
      .limit(1);
    return connection;
  }

  async createErpConnection(insertConnection: InsertErpConnection): Promise<ErpConnection> {
    const [connection] = await db.insert(erpConnections).values(insertConnection).returning();
    return connection;
  }

  async updateErpConnection(id: string, connectionUpdate: Partial<InsertErpConnection>): Promise<ErpConnection | undefined> {
    const [connection] = await db.update(erpConnections)
      .set({ ...connectionUpdate, updatedAt: new Date() })
      .where(eq(erpConnections.id, id))
      .returning();
    return connection;
  }

  async deleteErpConnection(id: string): Promise<void> {
    await db.delete(erpConnections).where(eq(erpConnections.id, id));
  }

  // AI Agents
  async getAiAgents(companyId: string): Promise<AiAgent[]> {
    return await db.select().from(aiAgents).where(eq(aiAgents.companyId, companyId));
  }

  async getAiAgent(id: string): Promise<AiAgent | undefined> {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
    return agent;
  }

  async createAiAgent(agent: InsertAiAgent): Promise<AiAgent> {
    const [created] = await db.insert(aiAgents).values(agent).returning();
    return created;
  }

  async updateAiAgent(id: string, agentUpdate: Partial<InsertAiAgent>): Promise<AiAgent | undefined> {
    const [agent] = await db.update(aiAgents)
      .set({ ...agentUpdate, updatedAt: new Date() })
      .where(eq(aiAgents.id, id))
      .returning();
    return agent;
  }

  async deleteAiAgent(id: string): Promise<void> {
    await db.delete(aiAgents).where(eq(aiAgents.id, id));
  }

  // AI Automation Rules
  async getAiAutomationRules(companyId: string): Promise<AiAutomationRule[]> {
    return await db.select().from(aiAutomationRules).where(eq(aiAutomationRules.companyId, companyId));
  }

  async getAiAutomationRule(id: string): Promise<AiAutomationRule | undefined> {
    const [rule] = await db.select().from(aiAutomationRules).where(eq(aiAutomationRules.id, id));
    return rule;
  }

  async getAiAutomationRulesByAgent(agentId: string): Promise<AiAutomationRule[]> {
    return await db.select().from(aiAutomationRules).where(eq(aiAutomationRules.agentId, agentId));
  }

  async createAiAutomationRule(rule: InsertAiAutomationRule): Promise<AiAutomationRule> {
    const [created] = await db.insert(aiAutomationRules).values(rule).returning();
    return created;
  }

  async updateAiAutomationRule(id: string, ruleUpdate: Partial<InsertAiAutomationRule>): Promise<AiAutomationRule | undefined> {
    const [rule] = await db.update(aiAutomationRules)
      .set({ ...ruleUpdate, updatedAt: new Date() })
      .where(eq(aiAutomationRules.id, id))
      .returning();
    return rule;
  }

  async deleteAiAutomationRule(id: string): Promise<void> {
    await db.delete(aiAutomationRules).where(eq(aiAutomationRules.id, id));
  }

  // Industry Data Consortium
  async getConsortiumContributions(filters?: { industrySector?: string; region?: string; regime?: string }): Promise<ConsortiumContribution[]> {
    let query = db.select().from(consortiumContributions);
    
    const conditions = [];
    if (filters?.industrySector) conditions.push(eq(consortiumContributions.industrySector, filters.industrySector));
    if (filters?.region) conditions.push(eq(consortiumContributions.region, filters.region));
    if (filters?.regime) conditions.push(eq(consortiumContributions.regime, filters.regime));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(sql`${consortiumContributions.contributionDate} DESC`).limit(100);
  }

  async createConsortiumContribution(insertContribution: InsertConsortiumContribution): Promise<ConsortiumContribution> {
    const [contribution] = await db.insert(consortiumContributions).values(insertContribution).returning();
    return contribution;
  }

  async getConsortiumMetrics(regime: string, filters?: { industrySector?: string }): Promise<ConsortiumMetrics[]> {
    const conditions = [eq(consortiumMetrics.regime, regime)];
    if (filters?.industrySector) {
      conditions.push(eq(consortiumMetrics.industrySector, filters.industrySector));
    }
    
    return await db.select().from(consortiumMetrics)
      .where(and(...conditions))
      .orderBy(sql`${consortiumMetrics.metricDate} DESC`);
  }

  async createConsortiumMetrics(insertMetrics: InsertConsortiumMetrics): Promise<ConsortiumMetrics> {
    const [metrics] = await db.insert(consortiumMetrics).values(insertMetrics).returning();
    return metrics;
  }

  async getConsortiumAlerts(severity?: string): Promise<ConsortiumAlert[]> {
    if (severity) {
      return await db.select().from(consortiumAlerts)
        .where(eq(consortiumAlerts.severity, severity))
        .orderBy(sql`${consortiumAlerts.alertDate} DESC`);
    }
    return await db.select().from(consortiumAlerts)
      .orderBy(sql`${consortiumAlerts.alertDate} DESC`);
  }

  async createConsortiumAlert(insertAlert: InsertConsortiumAlert): Promise<ConsortiumAlert> {
    const [alert] = await db.insert(consortiumAlerts).values(insertAlert).returning();
    return alert;
  }

  // M&A Intelligence
  async getMaTargets(companyId: string): Promise<MaTarget[]> {
    return await db.select().from(maTargets)
      .where(eq(maTargets.companyId, companyId))
      .orderBy(sql`${maTargets.timingScore} DESC`);
  }

  async getMaTarget(id: string): Promise<MaTarget | undefined> {
    const [target] = await db.select().from(maTargets).where(eq(maTargets.id, id));
    return target;
  }

  async createMaTarget(insertTarget: InsertMaTarget): Promise<MaTarget> {
    const [target] = await db.insert(maTargets).values(insertTarget).returning();
    return target;
  }

  async updateMaTarget(id: string, targetUpdate: Partial<InsertMaTarget>): Promise<MaTarget | undefined> {
    const [target] = await db.update(maTargets)
      .set({ ...targetUpdate, updatedAt: new Date() })
      .where(eq(maTargets.id, id))
      .returning();
    return target;
  }

  async getMaRecommendations(companyId: string): Promise<MaRecommendation[]> {
    return await db.select().from(maRecommendations)
      .where(eq(maRecommendations.companyId, companyId))
      .orderBy(sql`${maRecommendations.createdAt} DESC`);
  }

  async createMaRecommendation(insertRecommendation: InsertMaRecommendation): Promise<MaRecommendation> {
    const [recommendation] = await db.insert(maRecommendations).values(insertRecommendation).returning();
    return recommendation;
  }

  // Saved Scenarios & Bookmarks
  async getSavedScenarios(companyId: string): Promise<SavedScenario[]> {
    return await db.select().from(savedScenarios)
      .where(eq(savedScenarios.companyId, companyId))
      .orderBy(sql`${savedScenarios.createdAt} DESC`);
  }

  async getSavedScenario(id: string): Promise<SavedScenario | undefined> {
    const [scenario] = await db.select().from(savedScenarios).where(eq(savedScenarios.id, id));
    return scenario;
  }

  async createSavedScenario(insertScenario: InsertSavedScenario): Promise<SavedScenario> {
    const [scenario] = await db.insert(savedScenarios).values(insertScenario).returning();
    return scenario;
  }

  async updateSavedScenario(id: string, scenarioUpdate: Partial<InsertSavedScenario>): Promise<SavedScenario | undefined> {
    const [scenario] = await db.update(savedScenarios)
      .set({ ...scenarioUpdate, updatedAt: new Date() })
      .where(eq(savedScenarios.id, id))
      .returning();
    return scenario;
  }

  async deleteSavedScenario(id: string): Promise<void> {
    await db.delete(savedScenarios).where(eq(savedScenarios.id, id));
  }

  async getScenarioBookmarks(companyId: string): Promise<ScenarioBookmark[]> {
    return await db.select().from(scenarioBookmarks)
      .where(eq(scenarioBookmarks.companyId, companyId))
      .orderBy(sql`${scenarioBookmarks.createdAt} DESC`);
  }

  async getScenarioBookmark(id: string): Promise<ScenarioBookmark | undefined> {
    const [bookmark] = await db.select().from(scenarioBookmarks).where(eq(scenarioBookmarks.id, id));
    return bookmark;
  }

  async createScenarioBookmark(insertBookmark: InsertScenarioBookmark): Promise<ScenarioBookmark> {
    const [bookmark] = await db.insert(scenarioBookmarks).values(insertBookmark).returning();
    return bookmark;
  }

  async updateScenarioBookmark(id: string, bookmarkUpdate: Partial<InsertScenarioBookmark>): Promise<ScenarioBookmark | undefined> {
    const [bookmark] = await db.update(scenarioBookmarks)
      .set(bookmarkUpdate)
      .where(eq(scenarioBookmarks.id, id))
      .returning();
    return bookmark;
  }

  async deleteScenarioBookmark(id: string): Promise<void> {
    await db.delete(scenarioBookmarks).where(eq(scenarioBookmarks.id, id));
  }

  // S&OP Workspace - Scenarios
  async getSopScenarios(companyId: string): Promise<SopScenario[]> {
    return await db.select().from(sopScenarios)
      .where(eq(sopScenarios.companyId, companyId))
      .orderBy(sql`${sopScenarios.createdAt} DESC`);
  }

  async getSopScenario(id: string): Promise<SopScenario | undefined> {
    const [scenario] = await db.select().from(sopScenarios).where(eq(sopScenarios.id, id));
    return scenario;
  }

  async createSopScenario(insertScenario: InsertSopScenario): Promise<SopScenario> {
    const [scenario] = await db.insert(sopScenarios).values(insertScenario).returning();
    return scenario;
  }

  async updateSopScenario(id: string, scenarioUpdate: Partial<InsertSopScenario>): Promise<SopScenario | undefined> {
    const [scenario] = await db.update(sopScenarios)
      .set({ ...scenarioUpdate, updatedAt: sql`NOW()` })
      .where(eq(sopScenarios.id, id))
      .returning();
    return scenario;
  }

  async deleteSopScenario(id: string): Promise<void> {
    await db.delete(sopScenarios).where(eq(sopScenarios.id, id));
  }

  async approveSopScenario(id: string, approvedBy: string): Promise<SopScenario | undefined> {
    const [scenario] = await db.update(sopScenarios)
      .set({ 
        status: 'active',
        approvedBy,
        approvedAt: sql`NOW()`,
        updatedAt: sql`NOW()`
      })
      .where(eq(sopScenarios.id, id))
      .returning();
    return scenario;
  }

  // S&OP Workspace - Gap Analysis
  async getSopGapAnalyses(companyId: string): Promise<SopGapAnalysis[]> {
    return await db.select().from(sopGapAnalysis)
      .where(eq(sopGapAnalysis.companyId, companyId))
      .orderBy(sql`${sopGapAnalysis.periodStart} DESC`);
  }

  async getSopGapAnalysesByScenario(scenarioId: string): Promise<SopGapAnalysis[]> {
    return await db.select().from(sopGapAnalysis)
      .where(eq(sopGapAnalysis.scenarioId, scenarioId))
      .orderBy(sql`${sopGapAnalysis.periodStart} ASC`);
  }

  async getSopGapAnalysis(id: string): Promise<SopGapAnalysis | undefined> {
    const [gap] = await db.select().from(sopGapAnalysis).where(eq(sopGapAnalysis.id, id));
    return gap;
  }

  async createSopGapAnalysis(insertGap: InsertSopGapAnalysis): Promise<SopGapAnalysis> {
    const [gap] = await db.insert(sopGapAnalysis).values(insertGap).returning();
    return gap;
  }

  async updateSopGapAnalysis(id: string, gapUpdate: Partial<InsertSopGapAnalysis>): Promise<SopGapAnalysis | undefined> {
    const [gap] = await db.update(sopGapAnalysis)
      .set(gapUpdate)
      .where(eq(sopGapAnalysis.id, id))
      .returning();
    return gap;
  }

  async deleteSopGapAnalysis(id: string): Promise<void> {
    await db.delete(sopGapAnalysis).where(eq(sopGapAnalysis.id, id));
  }

  // S&OP Workspace - Meeting Notes
  async getSopMeetingNotes(companyId: string): Promise<SopMeetingNotes[]> {
    return await db.select().from(sopMeetingNotes)
      .where(eq(sopMeetingNotes.companyId, companyId))
      .orderBy(sql`${sopMeetingNotes.meetingDate} DESC`);
  }

  async getSopMeetingNote(id: string): Promise<SopMeetingNotes | undefined> {
    const [note] = await db.select().from(sopMeetingNotes).where(eq(sopMeetingNotes.id, id));
    return note;
  }

  async createSopMeetingNote(insertNote: InsertSopMeetingNotes): Promise<SopMeetingNotes> {
    const [note] = await db.insert(sopMeetingNotes).values(insertNote).returning();
    return note;
  }

  async updateSopMeetingNote(id: string, noteUpdate: Partial<InsertSopMeetingNotes>): Promise<SopMeetingNotes | undefined> {
    const [note] = await db.update(sopMeetingNotes)
      .set({ ...noteUpdate, updatedAt: sql`NOW()` })
      .where(eq(sopMeetingNotes.id, id))
      .returning();
    return note;
  }

  async deleteSopMeetingNote(id: string): Promise<void> {
    await db.delete(sopMeetingNotes).where(eq(sopMeetingNotes.id, id));
  }

  // S&OP Workspace - Action Items
  async getSopActionItems(companyId: string): Promise<SopActionItem[]> {
    return await db.select().from(sopActionItems)
      .where(eq(sopActionItems.companyId, companyId))
      .orderBy(sql`${sopActionItems.dueDate} ASC NULLS LAST`);
  }

  async getSopActionItemsByMeeting(meetingId: string): Promise<SopActionItem[]> {
    return await db.select().from(sopActionItems)
      .where(eq(sopActionItems.meetingId, meetingId))
      .orderBy(sql`${sopActionItems.createdAt} DESC`);
  }

  async getSopActionItemsByAssignee(assignedTo: string): Promise<SopActionItem[]> {
    return await db.select().from(sopActionItems)
      .where(eq(sopActionItems.assignedTo, assignedTo))
      .orderBy(sql`${sopActionItems.dueDate} ASC NULLS LAST`);
  }

  async getSopActionItem(id: string): Promise<SopActionItem | undefined> {
    const [item] = await db.select().from(sopActionItems).where(eq(sopActionItems.id, id));
    return item;
  }

  async createSopActionItem(insertItem: InsertSopActionItem): Promise<SopActionItem> {
    const [item] = await db.insert(sopActionItems).values(insertItem).returning();
    return item;
  }

  async updateSopActionItem(id: string, itemUpdate: Partial<InsertSopActionItem>): Promise<SopActionItem | undefined> {
    const [item] = await db.update(sopActionItems)
      .set({ ...itemUpdate, updatedAt: sql`NOW()` })
      .where(eq(sopActionItems.id, id))
      .returning();
    return item;
  }

  async completeSopActionItem(id: string): Promise<SopActionItem | undefined> {
    const [item] = await db.update(sopActionItems)
      .set({ 
        status: 'completed',
        progress: 100,
        completedAt: sql`NOW()`,
        updatedAt: sql`NOW()`
      })
      .where(eq(sopActionItems.id, id))
      .returning();
    return item;
  }

  async deleteSopActionItem(id: string): Promise<void> {
    await db.delete(sopActionItems).where(eq(sopActionItems.id, id));
  }

  // Smart Alerts & Monitoring
  async getFdrAlerts(companyId: string): Promise<FdrAlert[]> {
    return await db.select().from(fdrAlerts)
      .where(eq(fdrAlerts.companyId, companyId))
      .orderBy(sql`${fdrAlerts.createdAt} DESC`);
  }

  async createFdrAlert(insertAlert: InsertFdrAlert): Promise<FdrAlert> {
    const [alert] = await db.insert(fdrAlerts).values(insertAlert).returning();
    return alert;
  }

  async updateFdrAlert(id: string, alertUpdate: Partial<InsertFdrAlert>): Promise<FdrAlert | undefined> {
    const [alert] = await db.update(fdrAlerts)
      .set(alertUpdate)
      .where(eq(fdrAlerts.id, id))
      .returning();
    return alert;
  }

  async deleteFdrAlert(id: string): Promise<void> {
    await db.delete(fdrAlerts).where(eq(fdrAlerts.id, id));
  }

  async getCommodityPriceAlerts(companyId: string): Promise<CommodityPriceAlert[]> {
    return await db.select().from(commodityPriceAlerts)
      .where(eq(commodityPriceAlerts.companyId, companyId))
      .orderBy(sql`${commodityPriceAlerts.createdAt} DESC`);
  }

  async createCommodityPriceAlert(insertAlert: InsertCommodityPriceAlert): Promise<CommodityPriceAlert> {
    const [alert] = await db.insert(commodityPriceAlerts).values(insertAlert).returning();
    return alert;
  }

  async updateCommodityPriceAlert(id: string, alertUpdate: Partial<InsertCommodityPriceAlert>): Promise<CommodityPriceAlert | undefined> {
    const [alert] = await db.update(commodityPriceAlerts)
      .set(alertUpdate)
      .where(eq(commodityPriceAlerts.id, id))
      .returning();
    return alert;
  }

  async deleteCommodityPriceAlert(id: string): Promise<void> {
    await db.delete(commodityPriceAlerts).where(eq(commodityPriceAlerts.id, id));
  }

  async getAlertTriggers(companyId: string): Promise<AlertTrigger[]> {
    return await db.select().from(alertTriggers)
      .where(eq(alertTriggers.companyId, companyId))
      .orderBy(sql`${alertTriggers.triggeredAt} DESC`)
      .limit(100);
  }

  async getUnacknowledgedAlertTriggers(companyId: string): Promise<AlertTrigger[]> {
    return await db.select().from(alertTriggers)
      .where(and(eq(alertTriggers.companyId, companyId), eq(alertTriggers.acknowledged, 0)))
      .orderBy(sql`${alertTriggers.triggeredAt} DESC`);
  }

  async createAlertTrigger(insertTrigger: InsertAlertTrigger): Promise<AlertTrigger> {
    const [trigger] = await db.insert(alertTriggers).values(insertTrigger).returning();
    return trigger;
  }

  async acknowledgeAlertTrigger(id: string, userId: string): Promise<AlertTrigger | undefined> {
    const [trigger] = await db.update(alertTriggers)
      .set({ 
        acknowledged: 1, 
        acknowledgedBy: userId, 
        acknowledgedAt: new Date() 
      })
      .where(eq(alertTriggers.id, id))
      .returning();
    return trigger;
  }

  async getRegimeNotifications(companyId: string): Promise<RegimeChangeNotification[]> {
    return await db.select().from(regimeChangeNotifications)
      .where(eq(regimeChangeNotifications.companyId, companyId))
      .orderBy(sql`${regimeChangeNotifications.timestamp} DESC`)
      .limit(50);
  }

  async getUnacknowledgedRegimeNotifications(companyId: string): Promise<RegimeChangeNotification[]> {
    return await db.select().from(regimeChangeNotifications)
      .where(and(eq(regimeChangeNotifications.companyId, companyId), eq(regimeChangeNotifications.acknowledged, 0)))
      .orderBy(sql`${regimeChangeNotifications.timestamp} DESC`);
  }

  async createRegimeNotification(insertNotification: InsertRegimeChangeNotification): Promise<RegimeChangeNotification> {
    const [notification] = await db.insert(regimeChangeNotifications).values(insertNotification).returning();
    return notification;
  }

  async acknowledgeRegimeNotification(id: string, userId: string): Promise<RegimeChangeNotification | undefined> {
    const [notification] = await db.update(regimeChangeNotifications)
      .set({ 
        acknowledged: 1, 
        acknowledgedBy: userId, 
        acknowledgedAt: new Date() 
      })
      .where(eq(regimeChangeNotifications.id, id))
      .returning();
    return notification;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(companyId: string, limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async getAuditLogsByEntity(companyId: string, entityType: string, entityId?: string): Promise<AuditLog[]> {
    const conditions = [
      eq(auditLogs.companyId, companyId),
      eq(auditLogs.entityType, entityType)
    ];
    
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }
    
    return await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(100);
  }

  async getAuditLogsByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  // Peer Benchmarking (Industry Data Consortium)
  async createBenchmarkSubmission(submission: InsertBenchmarkSubmission): Promise<BenchmarkSubmission> {
    const [result] = await db.insert(benchmarkSubmissions).values(submission).returning();
    return result;
  }

  async getBenchmarkSubmissions(companyId: string): Promise<BenchmarkSubmission[]> {
    return await db
      .select()
      .from(benchmarkSubmissions)
      .where(eq(benchmarkSubmissions.companyId, companyId))
      .orderBy(desc(benchmarkSubmissions.snapshotDate));
  }

  async getBenchmarkAggregates(filters: {
    materialCategory?: string;
    materialSubcategory?: string;
    industry?: string;
    companySize?: string;
    snapshotMonth?: string;
  }): Promise<BenchmarkAggregate[]> {
    const conditions: any[] = [eq(benchmarkAggregates.isPublished, 1)];
    
    if (filters.materialCategory) {
      conditions.push(eq(benchmarkAggregates.materialCategory, filters.materialCategory));
    }
    if (filters.materialSubcategory) {
      conditions.push(eq(benchmarkAggregates.materialSubcategory, filters.materialSubcategory));
    }
    if (filters.industry) {
      conditions.push(eq(benchmarkAggregates.industry, filters.industry));
    }
    if (filters.companySize) {
      conditions.push(eq(benchmarkAggregates.companySize, filters.companySize));
    }
    if (filters.snapshotMonth) {
      conditions.push(eq(benchmarkAggregates.snapshotMonth, filters.snapshotMonth));
    }
    
    return await db
      .select()
      .from(benchmarkAggregates)
      .where(and(...conditions))
      .orderBy(desc(benchmarkAggregates.snapshotMonth));
  }

  async createBenchmarkAggregate(aggregate: InsertBenchmarkAggregate): Promise<BenchmarkAggregate> {
    const [result] = await db.insert(benchmarkAggregates).values(aggregate).returning();
    return result;
  }

  async updateBenchmarkAggregate(id: string, aggregateData: Partial<InsertBenchmarkAggregate>): Promise<BenchmarkAggregate | undefined> {
    const [result] = await db
      .update(benchmarkAggregates)
      .set(aggregateData)
      .where(eq(benchmarkAggregates.id, id))
      .returning();
    return result;
  }

  async upsertBenchmarkAggregate(aggregate: InsertBenchmarkAggregate): Promise<BenchmarkAggregate> {
    // Upsert based on unique constraint: material + segmentation + snapshot month
    const [result] = await db
      .insert(benchmarkAggregates)
      .values(aggregate)
      .onConflictDoUpdate({
        target: [
          benchmarkAggregates.materialCategory,
          benchmarkAggregates.materialSubcategory,
          benchmarkAggregates.materialName,
          benchmarkAggregates.unit,
          benchmarkAggregates.industry,
          benchmarkAggregates.companySize,
          benchmarkAggregates.region,
          benchmarkAggregates.snapshotMonth,
        ],
        set: {
          participantCount: aggregate.participantCount,
          averageCost: aggregate.averageCost,
          medianCost: aggregate.medianCost,
          minCost: aggregate.minCost,
          maxCost: aggregate.maxCost,
          standardDeviation: aggregate.standardDeviation,
          p25Cost: aggregate.p25Cost,
          p75Cost: aggregate.p75Cost,
          p90Cost: aggregate.p90Cost,
          volumeWeightedAvgCost: aggregate.volumeWeightedAvgCost,
          totalVolume: aggregate.totalVolume,
          dataQualityScore: aggregate.dataQualityScore,
          isPublished: aggregate.isPublished,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getBenchmarkComparisons(companyId: string): Promise<BenchmarkComparison[]> {
    return await db
      .select()
      .from(benchmarkComparisons)
      .where(eq(benchmarkComparisons.companyId, companyId))
      .orderBy(desc(benchmarkComparisons.comparisonDate));
  }

  async createBenchmarkComparison(comparison: InsertBenchmarkComparison): Promise<BenchmarkComparison> {
    const [result] = await db.insert(benchmarkComparisons).values(comparison).returning();
    return result;
  }

  // Demand Signal Repository - Sources
  async createDemandSignalSource(source: InsertDemandSignalSource): Promise<DemandSignalSource> {
    const [result] = await db.insert(demandSignalSources).values(source).returning();
    return result;
  }

  async getDemandSignalSources(companyId: string): Promise<DemandSignalSource[]> {
    return await db
      .select()
      .from(demandSignalSources)
      .where(eq(demandSignalSources.companyId, companyId))
      .orderBy(desc(demandSignalSources.createdAt));
  }

  async getDemandSignalSource(id: string): Promise<DemandSignalSource | undefined> {
    const [source] = await db.select().from(demandSignalSources).where(eq(demandSignalSources.id, id));
    return source;
  }

  async updateDemandSignalSource(id: string, source: Partial<InsertDemandSignalSource>): Promise<DemandSignalSource | undefined> {
    const [result] = await db
      .update(demandSignalSources)
      .set({ ...source, updatedAt: new Date() })
      .where(eq(demandSignalSources.id, id))
      .returning();
    return result;
  }

  async deleteDemandSignalSource(id: string): Promise<void> {
    await db.delete(demandSignalSources).where(eq(demandSignalSources.id, id));
  }

  // Demand Signal Repository - Signals
  async createDemandSignal(signal: InsertDemandSignal): Promise<DemandSignal> {
    const [result] = await db.insert(demandSignals).values(signal).returning();
    return result;
  }

  async getDemandSignals(companyId: string, filters?: { 
    sourceId?: string; 
    skuId?: string; 
    materialId?: string; 
    signalType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<DemandSignal[]> {
    const conditions = [eq(demandSignals.companyId, companyId)];
    
    if (filters?.sourceId) {
      conditions.push(eq(demandSignals.sourceId, filters.sourceId));
    }
    if (filters?.skuId) {
      conditions.push(eq(demandSignals.skuId, filters.skuId));
    }
    if (filters?.materialId) {
      conditions.push(eq(demandSignals.materialId, filters.materialId));
    }
    if (filters?.signalType) {
      conditions.push(eq(demandSignals.signalType, filters.signalType));
    }
    if (filters?.startDate) {
      conditions.push(sql`${demandSignals.signalDate} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${demandSignals.signalDate} <= ${filters.endDate}`);
    }
    
    let query = db
      .select()
      .from(demandSignals)
      .where(and(...conditions))
      .orderBy(desc(demandSignals.signalDate));
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return await query;
  }

  async getDemandSignal(id: string): Promise<DemandSignal | undefined> {
    const [signal] = await db.select().from(demandSignals).where(eq(demandSignals.id, id));
    return signal;
  }

  async updateDemandSignal(id: string, signal: Partial<InsertDemandSignal>): Promise<DemandSignal | undefined> {
    const [result] = await db
      .update(demandSignals)
      .set({ ...signal, updatedAt: new Date() })
      .where(eq(demandSignals.id, id))
      .returning();
    return result;
  }

  async deleteDemandSignal(id: string): Promise<void> {
    await db.delete(demandSignals).where(eq(demandSignals.id, id));
  }

  async markDemandSignalsProcessed(signalIds: string[]): Promise<void> {
    if (signalIds.length === 0) return;
    
    await db
      .update(demandSignals)
      .set({ isProcessed: true, processedAt: new Date(), updatedAt: new Date() })
      .where(sql`${demandSignals.id} IN (${sql.join(signalIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // Demand Signal Repository - Aggregates
  async getDemandSignalAggregates(companyId: string, filters?: {
    skuId?: string;
    materialId?: string;
    aggregationPeriod?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<DemandSignalAggregate[]> {
    const conditions = [eq(demandSignalAggregates.companyId, companyId)];
    
    if (filters?.skuId) {
      conditions.push(eq(demandSignalAggregates.skuId, filters.skuId));
    }
    if (filters?.materialId) {
      conditions.push(eq(demandSignalAggregates.materialId, filters.materialId));
    }
    if (filters?.aggregationPeriod) {
      conditions.push(eq(demandSignalAggregates.aggregationPeriod, filters.aggregationPeriod));
    }
    if (filters?.startDate) {
      conditions.push(sql`${demandSignalAggregates.periodStart} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${demandSignalAggregates.periodEnd} <= ${filters.endDate}`);
    }
    
    return await db
      .select()
      .from(demandSignalAggregates)
      .where(and(...conditions))
      .orderBy(desc(demandSignalAggregates.periodStart));
  }

  async createDemandSignalAggregate(aggregate: InsertDemandSignalAggregate): Promise<DemandSignalAggregate> {
    const [result] = await db.insert(demandSignalAggregates).values(aggregate).returning();
    return result;
  }

  async upsertDemandSignalAggregate(aggregate: InsertDemandSignalAggregate): Promise<DemandSignalAggregate> {
    const [result] = await db
      .insert(demandSignalAggregates)
      .values(aggregate)
      .onConflictDoUpdate({
        target: [
          demandSignalAggregates.companyId,
          demandSignalAggregates.skuId,
          demandSignalAggregates.aggregationPeriod,
          demandSignalAggregates.periodStart,
        ],
        set: {
          totalSignals: aggregate.totalSignals,
          totalQuantity: aggregate.totalQuantity,
          avgConfidence: aggregate.avgConfidence,
          bySignalType: aggregate.bySignalType,
          byChannel: aggregate.byChannel,
          byRegion: aggregate.byRegion,
          trendDirection: aggregate.trendDirection,
          trendStrength: aggregate.trendStrength,
          volatility: aggregate.volatility,
          economicRegime: aggregate.economicRegime,
          fdrAtAggregate: aggregate.fdrAtAggregate,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getAllCompanyIds(): Promise<string[]> {
    const result = await db.select({ id: companies.id }).from(companies);
    return result.map(r => r.id);
  }
  
  // RBAC - Roles
  async getRoles(companyId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.companyId, companyId));
  }
  
  async getRole(roleId: string, companyId: string): Promise<Role | undefined> {
    // Enforce tenant isolation - only return role if it belongs to the company
    const [role] = await db.select().from(roles).where(
      and(eq(roles.id, roleId), eq(roles.companyId, companyId))
    );
    return role;
  }
  
  async getRoleByName(companyId: string, name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(
      and(eq(roles.companyId, companyId), eq(roles.name, name))
    );
    return role;
  }
  
  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }
  
  async updateRole(roleId: string, companyId: string, roleData: Partial<InsertRole>): Promise<Role | undefined> {
    // Prevent companyId from being changed and verify role belongs to company
    const { companyId: _, ...safeData } = roleData as any;
    const [role] = await db.update(roles)
      .set(safeData)
      .where(and(eq(roles.id, roleId), eq(roles.companyId, companyId)))
      .returning();
    return role;
  }
  
  async deleteRole(roleId: string, companyId: string): Promise<void> {
    // Verify role belongs to company before deleting
    await db.delete(roles).where(and(eq(roles.id, roleId), eq(roles.companyId, companyId)));
  }
  
  // RBAC - Role Permissions
  async getRolePermissions(roleId: string, companyId: string): Promise<Permission[]> {
    // Enforce tenant isolation - verify role belongs to company before returning permissions
    const result = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
        category: permissions.category,
        createdAt: permissions.createdAt,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(roles.companyId, companyId)
      ));
    return result;
  }
  
  async assignPermissionToRole(roleId: string, permissionId: string, companyId: string): Promise<void> {
    // Verify role belongs to company before assigning permission
    const role = await this.getRole(roleId, companyId);
    if (!role) {
      throw new Error("Role not found or access denied");
    }
    await db.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing();
  }
  
  async removePermissionFromRole(roleId: string, permissionId: string, companyId: string): Promise<void> {
    // Verify role belongs to company before removing permission
    const role = await this.getRole(roleId, companyId);
    if (!role) {
      throw new Error("Role not found or access denied");
    }
    await db.delete(rolePermissions).where(
      and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      )
    );
  }
  
  // RBAC - User Role Assignments
  async getUserRoles(userId: string, companyId: string): Promise<Role[]> {
    const result = await db
      .select({
        id: roles.id,
        companyId: roles.companyId,
        name: roles.name,
        description: roles.description,
        isDefault: roles.isDefault,
        createdAt: roles.createdAt,
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.companyId, companyId)
      ));
    return result;
  }
  
  async assignRoleToUser(userId: string, roleId: string, companyId: string, assignedBy: string): Promise<void> {
    await db.insert(userRoleAssignments).values({
      userId,
      roleId,
      companyId,
      assignedBy,
    }).onConflictDoNothing();
  }
  
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await db.delete(userRoleAssignments).where(
      and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.roleId, roleId)
      )
    );
  }
  
  async getUsersWithRole(roleId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        companyId: users.companyId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(userRoleAssignments)
      .innerJoin(users, eq(userRoleAssignments.userId, users.id))
      .where(eq(userRoleAssignments.roleId, roleId));
    return result;
  }
  
  // RBAC - Permissions
  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions);
  }
  
  async getPermission(permissionId: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, permissionId));
    return permission;
  }
  
  // ROI Metrics
  async getRoiMetrics(companyId: string, filters?: {
    metricType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<RoiMetric[]> {
    let conditions = [eq(roiMetrics.companyId, companyId)];
    
    if (filters?.metricType) {
      conditions.push(eq(roiMetrics.metricType, filters.metricType));
    }
    
    const query = db.select().from(roiMetrics)
      .where(and(...conditions))
      .orderBy(desc(roiMetrics.periodStart));
    
    if (filters?.limit) {
      return query.limit(filters.limit);
    }
    return query;
  }
  
  async createRoiMetric(metric: InsertRoiMetric): Promise<RoiMetric> {
    const [result] = await db.insert(roiMetrics).values(metric).returning();
    return result;
  }
  
  async getRoiSummary(companyId: string, periodType?: string): Promise<RoiSummary | undefined> {
    const conditions = [eq(roiSummary.companyId, companyId)];
    if (periodType) {
      conditions.push(eq(roiSummary.periodType, periodType));
    }
    const [result] = await db.select().from(roiSummary)
      .where(and(...conditions))
      .orderBy(desc(roiSummary.updatedAt))
      .limit(1);
    return result;
  }
  
  async upsertRoiSummary(summary: InsertRoiSummary): Promise<RoiSummary> {
    const [result] = await db.insert(roiSummary)
      .values(summary)
      .onConflictDoUpdate({
        target: [roiSummary.companyId, roiSummary.periodType],
        set: {
          ...summary,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
  
  // ERP Integration Templates
  async getErpIntegrationTemplates(): Promise<ErpIntegrationTemplate[]> {
    return db.select().from(erpIntegrationTemplates)
      .where(eq(erpIntegrationTemplates.isActive, true))
      .orderBy(erpIntegrationTemplates.sortOrder);
  }
  
  async getErpIntegrationTemplate(id: string): Promise<ErpIntegrationTemplate | undefined> {
    const [result] = await db.select().from(erpIntegrationTemplates)
      .where(eq(erpIntegrationTemplates.id, id));
    return result;
  }
  
  async createErpIntegrationTemplate(template: InsertErpIntegrationTemplate): Promise<ErpIntegrationTemplate> {
    const [result] = await db.insert(erpIntegrationTemplates).values(template).returning();
    return result;
  }
  
  async updateErpIntegrationTemplate(id: string, template: Partial<InsertErpIntegrationTemplate>): Promise<ErpIntegrationTemplate | undefined> {
    const [result] = await db.update(erpIntegrationTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(erpIntegrationTemplates.id, id))
      .returning();
    return result;
  }
  
  // ERP Sync Logs
  async getErpSyncLogs(connectionId: string, limit?: number): Promise<ErpSyncLog[]> {
    const query = db.select().from(erpSyncLogs)
      .where(eq(erpSyncLogs.connectionId, connectionId))
      .orderBy(desc(erpSyncLogs.startedAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }
  
  async createErpSyncLog(log: InsertErpSyncLog): Promise<ErpSyncLog> {
    const [result] = await db.insert(erpSyncLogs).values(log).returning();
    return result;
  }
  
  async updateErpSyncLog(id: string, log: Partial<InsertErpSyncLog>): Promise<ErpSyncLog | undefined> {
    const [result] = await db.update(erpSyncLogs)
      .set(log)
      .where(eq(erpSyncLogs.id, id))
      .returning();
    return result;
  }
  
  // Action Playbooks
  async getActionPlaybooks(filters?: { triggerType?: string; isActive?: boolean }): Promise<ActionPlaybook[]> {
    let conditions: any[] = [];
    
    if (filters?.triggerType) {
      conditions.push(eq(actionPlaybooks.triggerType, filters.triggerType));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(actionPlaybooks.isActive, filters.isActive));
    }
    
    if (conditions.length === 0) {
      return db.select().from(actionPlaybooks);
    }
    return db.select().from(actionPlaybooks).where(and(...conditions));
  }
  
  async getActionPlaybook(id: string): Promise<ActionPlaybook | undefined> {
    const [result] = await db.select().from(actionPlaybooks)
      .where(eq(actionPlaybooks.id, id));
    return result;
  }
  
  async createActionPlaybook(playbook: InsertActionPlaybook): Promise<ActionPlaybook> {
    const [result] = await db.insert(actionPlaybooks).values(playbook).returning();
    return result;
  }
  
  async updateActionPlaybook(id: string, playbook: Partial<InsertActionPlaybook>): Promise<ActionPlaybook | undefined> {
    const [result] = await db.update(actionPlaybooks)
      .set({ ...playbook, updatedAt: new Date() })
      .where(eq(actionPlaybooks.id, id))
      .returning();
    return result;
  }
  
  // Active Playbook Instances
  async getActivePlaybookInstances(companyId: string, status?: string): Promise<ActivePlaybookInstance[]> {
    let conditions = [eq(activePlaybookInstances.companyId, companyId)];
    
    if (status) {
      conditions.push(eq(activePlaybookInstances.status, status));
    }
    
    return db.select().from(activePlaybookInstances)
      .where(and(...conditions))
      .orderBy(desc(activePlaybookInstances.triggeredAt));
  }
  
  async getActivePlaybookInstance(id: string): Promise<ActivePlaybookInstance | undefined> {
    const [result] = await db.select().from(activePlaybookInstances)
      .where(eq(activePlaybookInstances.id, id));
    return result;
  }
  
  async createActivePlaybookInstance(instance: InsertActivePlaybookInstance): Promise<ActivePlaybookInstance> {
    const [result] = await db.insert(activePlaybookInstances).values(instance).returning();
    return result;
  }
  
  async updateActivePlaybookInstance(id: string, instance: Partial<InsertActivePlaybookInstance>): Promise<ActivePlaybookInstance | undefined> {
    const [result] = await db.update(activePlaybookInstances)
      .set({ ...instance, updatedAt: new Date() })
      .where(eq(activePlaybookInstances.id, id))
      .returning();
    return result;
  }
  
  // Playbook Action Logs
  async getPlaybookActionLogs(instanceId: string): Promise<PlaybookActionLog[]> {
    return db.select().from(playbookActionLogs)
      .where(eq(playbookActionLogs.instanceId, instanceId))
      .orderBy(playbookActionLogs.actionIndex);
  }
  
  async createPlaybookActionLog(log: InsertPlaybookActionLog): Promise<PlaybookActionLog> {
    const [result] = await db.insert(playbookActionLogs).values(log).returning();
    return result;
  }
  
  async updatePlaybookActionLog(id: string, log: Partial<InsertPlaybookActionLog>): Promise<PlaybookActionLog | undefined> {
    const [result] = await db.update(playbookActionLogs)
      .set(log)
      .where(eq(playbookActionLogs.id, id))
      .returning();
    return result;
  }
  
  // Scenario Simulations (What-If Analysis)
  async getScenarioSimulations(companyId: string): Promise<ScenarioSimulation[]> {
    return db.select().from(scenarioSimulations)
      .where(eq(scenarioSimulations.companyId, companyId))
      .orderBy(desc(scenarioSimulations.createdAt));
  }
  
  async getScenarioSimulation(id: string): Promise<ScenarioSimulation | undefined> {
    const [result] = await db.select().from(scenarioSimulations)
      .where(eq(scenarioSimulations.id, id));
    return result;
  }
  
  async createScenarioSimulation(simulation: InsertScenarioSimulation): Promise<ScenarioSimulation> {
    const [result] = await db.insert(scenarioSimulations).values(simulation).returning();
    return result;
  }
  
  async updateScenarioSimulation(id: string, simulation: Partial<InsertScenarioSimulation>): Promise<ScenarioSimulation | undefined> {
    const [result] = await db.update(scenarioSimulations)
      .set({ ...simulation, updatedAt: new Date() })
      .where(eq(scenarioSimulations.id, id))
      .returning();
    return result;
  }
  
  async deleteScenarioSimulation(id: string): Promise<void> {
    await db.delete(scenarioSimulations).where(eq(scenarioSimulations.id, id));
  }
  
  // Scenario Variants
  async getScenarioVariants(simulationId: string): Promise<ScenarioVariant[]> {
    return db.select().from(scenarioVariants)
      .where(eq(scenarioVariants.simulationId, simulationId))
      .orderBy(scenarioVariants.createdAt);
  }
  
  async getScenarioVariant(id: string): Promise<ScenarioVariant | undefined> {
    const [result] = await db.select().from(scenarioVariants)
      .where(eq(scenarioVariants.id, id));
    return result;
  }
  
  async createScenarioVariant(variant: InsertScenarioVariant): Promise<ScenarioVariant> {
    const [result] = await db.insert(scenarioVariants).values(variant).returning();
    return result;
  }
  
  async updateScenarioVariant(id: string, variant: Partial<InsertScenarioVariant>): Promise<ScenarioVariant | undefined> {
    const [result] = await db.update(scenarioVariants)
      .set(variant)
      .where(eq(scenarioVariants.id, id))
      .returning();
    return result;
  }
  
  async deleteScenarioVariant(id: string): Promise<void> {
    await db.delete(scenarioVariants).where(eq(scenarioVariants.id, id));
  }
  
  // Supplier Risk Scoring
  async getSupplierRiskSnapshots(
    companyId: string, 
    filters?: { supplierId?: string; regime?: string; riskTier?: string; latestOnly?: boolean }
  ): Promise<SupplierRiskSnapshot[]> {
    let conditions = [eq(supplierRiskSnapshots.companyId, companyId)];
    
    if (filters?.supplierId) {
      conditions.push(eq(supplierRiskSnapshots.supplierId, filters.supplierId));
    }
    if (filters?.regime) {
      conditions.push(eq(supplierRiskSnapshots.regime, filters.regime));
    }
    if (filters?.riskTier) {
      conditions.push(eq(supplierRiskSnapshots.riskTier, filters.riskTier));
    }
    if (filters?.latestOnly) {
      conditions.push(eq(supplierRiskSnapshots.isLatest, 1));
    }
    
    return db.select().from(supplierRiskSnapshots)
      .where(and(...conditions))
      .orderBy(desc(supplierRiskSnapshots.evaluatedAt));
  }
  
  async getSupplierRiskSnapshot(id: string): Promise<SupplierRiskSnapshot | undefined> {
    const [result] = await db.select().from(supplierRiskSnapshots)
      .where(eq(supplierRiskSnapshots.id, id));
    return result;
  }
  
  async getLatestSupplierRiskSnapshot(supplierId: string): Promise<SupplierRiskSnapshot | undefined> {
    const [result] = await db.select().from(supplierRiskSnapshots)
      .where(and(
        eq(supplierRiskSnapshots.supplierId, supplierId),
        eq(supplierRiskSnapshots.isLatest, 1)
      ));
    return result;
  }
  
  async createSupplierRiskSnapshot(snapshot: InsertSupplierRiskSnapshot): Promise<SupplierRiskSnapshot> {
    // Mark previous snapshots as not latest
    if (snapshot.supplierId) {
      await db.update(supplierRiskSnapshots)
        .set({ isLatest: 0 })
        .where(eq(supplierRiskSnapshots.supplierId, snapshot.supplierId));
    }
    
    const [result] = await db.insert(supplierRiskSnapshots)
      .values({ ...snapshot, isLatest: 1 })
      .returning();
    return result;
  }
  
  async updateSupplierRiskSnapshot(id: string, snapshot: Partial<InsertSupplierRiskSnapshot>): Promise<SupplierRiskSnapshot | undefined> {
    const [result] = await db.update(supplierRiskSnapshots)
      .set(snapshot)
      .where(eq(supplierRiskSnapshots.id, id))
      .returning();
    return result;
  }
  
  // S&OP Meeting Templates
  async getSopMeetingTemplates(companyId?: string): Promise<SopMeetingTemplate[]> {
    if (companyId) {
      return db.select().from(sopMeetingTemplates)
        .where(
          sql`${sopMeetingTemplates.companyId} = ${companyId} OR ${sopMeetingTemplates.companyId} IS NULL`
        )
        .orderBy(sopMeetingTemplates.meetingType);
    }
    return db.select().from(sopMeetingTemplates)
      .where(sql`${sopMeetingTemplates.companyId} IS NULL`)
      .orderBy(sopMeetingTemplates.meetingType);
  }
  
  async getSopMeetingTemplate(id: string): Promise<SopMeetingTemplate | undefined> {
    const [result] = await db.select().from(sopMeetingTemplates)
      .where(eq(sopMeetingTemplates.id, id));
    return result;
  }
  
  async createSopMeetingTemplate(template: InsertSopMeetingTemplate): Promise<SopMeetingTemplate> {
    const [result] = await db.insert(sopMeetingTemplates).values(template).returning();
    return result;
  }
  
  async updateSopMeetingTemplate(id: string, template: Partial<InsertSopMeetingTemplate>): Promise<SopMeetingTemplate | undefined> {
    const [result] = await db.update(sopMeetingTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(sopMeetingTemplates.id, id))
      .returning();
    return result;
  }
  
  async deleteSopMeetingTemplate(id: string): Promise<void> {
    await db.delete(sopMeetingTemplates).where(eq(sopMeetingTemplates.id, id));
  }
  
  // S&OP Meetings
  async getSopMeetings(companyId: string, filters?: { status?: string; meetingType?: string }): Promise<SopMeeting[]> {
    let conditions = [eq(sopMeetings.companyId, companyId)];
    
    if (filters?.status) {
      conditions.push(eq(sopMeetings.status, filters.status));
    }
    if (filters?.meetingType) {
      conditions.push(eq(sopMeetings.meetingType, filters.meetingType));
    }
    
    return db.select().from(sopMeetings)
      .where(and(...conditions))
      .orderBy(desc(sopMeetings.scheduledStart));
  }
  
  async getSopMeeting(id: string): Promise<SopMeeting | undefined> {
    const [result] = await db.select().from(sopMeetings)
      .where(eq(sopMeetings.id, id));
    return result;
  }
  
  async createSopMeeting(meeting: InsertSopMeeting): Promise<SopMeeting> {
    const [result] = await db.insert(sopMeetings).values(meeting).returning();
    return result;
  }
  
  async updateSopMeeting(id: string, meeting: Partial<InsertSopMeeting>): Promise<SopMeeting | undefined> {
    const [result] = await db.update(sopMeetings)
      .set({ ...meeting, updatedAt: new Date() })
      .where(eq(sopMeetings.id, id))
      .returning();
    return result;
  }
  
  async deleteSopMeeting(id: string): Promise<void> {
    await db.delete(sopMeetings).where(eq(sopMeetings.id, id));
  }
  
  // S&OP Meeting Attendees
  async getSopMeetingAttendees(meetingId: string): Promise<SopMeetingAttendee[]> {
    return db.select().from(sopMeetingAttendees)
      .where(eq(sopMeetingAttendees.meetingId, meetingId));
  }
  
  async createSopMeetingAttendee(attendee: InsertSopMeetingAttendee): Promise<SopMeetingAttendee> {
    const [result] = await db.insert(sopMeetingAttendees).values(attendee).returning();
    return result;
  }
  
  async updateSopMeetingAttendee(id: string, attendee: Partial<InsertSopMeetingAttendee>): Promise<SopMeetingAttendee | undefined> {
    const [result] = await db.update(sopMeetingAttendees)
      .set(attendee)
      .where(eq(sopMeetingAttendees.id, id))
      .returning();
    return result;
  }
  
  async deleteSopMeetingAttendee(id: string): Promise<void> {
    await db.delete(sopMeetingAttendees).where(eq(sopMeetingAttendees.id, id));
  }
  
  // S&OP Reconciliation Items
  async getSopReconciliationItems(companyId: string, filters?: { meetingId?: string; status?: string; priority?: string }): Promise<SopReconciliationItem[]> {
    let conditions = [eq(sopReconciliationItems.companyId, companyId)];
    
    if (filters?.meetingId) {
      conditions.push(eq(sopReconciliationItems.meetingId, filters.meetingId));
    }
    if (filters?.status) {
      conditions.push(eq(sopReconciliationItems.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(sopReconciliationItems.priority, filters.priority));
    }
    
    return db.select().from(sopReconciliationItems)
      .where(and(...conditions))
      .orderBy(desc(sopReconciliationItems.createdAt));
  }
  
  async getSopReconciliationItem(id: string): Promise<SopReconciliationItem | undefined> {
    const [result] = await db.select().from(sopReconciliationItems)
      .where(eq(sopReconciliationItems.id, id));
    return result;
  }
  
  async createSopReconciliationItem(item: InsertSopReconciliationItem): Promise<SopReconciliationItem> {
    const [result] = await db.insert(sopReconciliationItems).values(item).returning();
    return result;
  }
  
  async updateSopReconciliationItem(id: string, item: Partial<InsertSopReconciliationItem>): Promise<SopReconciliationItem | undefined> {
    const [result] = await db.update(sopReconciliationItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(sopReconciliationItems.id, id))
      .returning();
    return result;
  }
  
  async deleteSopReconciliationItem(id: string): Promise<void> {
    await db.delete(sopReconciliationItems).where(eq(sopReconciliationItems.id, id));
  }
  
  // S&OP Approval Chains
  async getSopApprovalChains(companyId: string): Promise<SopApprovalChain[]> {
    return db.select().from(sopApprovalChains)
      .where(eq(sopApprovalChains.companyId, companyId))
      .orderBy(sopApprovalChains.name);
  }
  
  async getSopApprovalChain(id: string): Promise<SopApprovalChain | undefined> {
    const [result] = await db.select().from(sopApprovalChains)
      .where(eq(sopApprovalChains.id, id));
    return result;
  }
  
  async createSopApprovalChain(chain: InsertSopApprovalChain): Promise<SopApprovalChain> {
    const [result] = await db.insert(sopApprovalChains).values(chain).returning();
    return result;
  }
  
  async updateSopApprovalChain(id: string, chain: Partial<InsertSopApprovalChain>): Promise<SopApprovalChain | undefined> {
    const [result] = await db.update(sopApprovalChains)
      .set({ ...chain, updatedAt: new Date() })
      .where(eq(sopApprovalChains.id, id))
      .returning();
    return result;
  }
  
  async deleteSopApprovalChain(id: string): Promise<void> {
    await db.delete(sopApprovalChains).where(eq(sopApprovalChains.id, id));
  }
  
  // S&OP Approval Steps
  async getSopApprovalSteps(chainId: string): Promise<SopApprovalStep[]> {
    return db.select().from(sopApprovalSteps)
      .where(eq(sopApprovalSteps.chainId, chainId))
      .orderBy(sopApprovalSteps.stepOrder);
  }
  
  async createSopApprovalStep(step: InsertSopApprovalStep): Promise<SopApprovalStep> {
    const [result] = await db.insert(sopApprovalSteps).values(step).returning();
    return result;
  }
  
  async updateSopApprovalStep(id: string, step: Partial<InsertSopApprovalStep>): Promise<SopApprovalStep | undefined> {
    const [result] = await db.update(sopApprovalSteps)
      .set(step)
      .where(eq(sopApprovalSteps.id, id))
      .returning();
    return result;
  }
  
  async deleteSopApprovalStep(id: string): Promise<void> {
    await db.delete(sopApprovalSteps).where(eq(sopApprovalSteps.id, id));
  }
  
  // S&OP Approval Requests
  async getSopApprovalRequests(companyId: string, filters?: { status?: string; requesterId?: string }): Promise<SopApprovalRequest[]> {
    let conditions = [eq(sopApprovalRequests.companyId, companyId)];
    
    if (filters?.status) {
      conditions.push(eq(sopApprovalRequests.status, filters.status));
    }
    if (filters?.requesterId) {
      conditions.push(eq(sopApprovalRequests.requesterId, filters.requesterId));
    }
    
    return db.select().from(sopApprovalRequests)
      .where(and(...conditions))
      .orderBy(desc(sopApprovalRequests.createdAt));
  }
  
  async getSopApprovalRequest(id: string): Promise<SopApprovalRequest | undefined> {
    const [result] = await db.select().from(sopApprovalRequests)
      .where(eq(sopApprovalRequests.id, id));
    return result;
  }
  
  async createSopApprovalRequest(request: InsertSopApprovalRequest): Promise<SopApprovalRequest> {
    const [result] = await db.insert(sopApprovalRequests).values(request).returning();
    return result;
  }
  
  async updateSopApprovalRequest(id: string, request: Partial<InsertSopApprovalRequest>): Promise<SopApprovalRequest | undefined> {
    const [result] = await db.update(sopApprovalRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(sopApprovalRequests.id, id))
      .returning();
    return result;
  }
  
  // S&OP Approval Actions
  async getSopApprovalActions(requestId: string): Promise<SopApprovalAction[]> {
    return db.select().from(sopApprovalActions)
      .where(eq(sopApprovalActions.requestId, requestId))
      .orderBy(sopApprovalActions.createdAt);
  }
  
  async createSopApprovalAction(action: InsertSopApprovalAction): Promise<SopApprovalAction> {
    const [result] = await db.insert(sopApprovalActions).values(action).returning();
    return result;
  }
  
  // Digital Twin - Data Feeds
  async getDigitalTwinDataFeeds(companyId: string): Promise<DigitalTwinDataFeed[]> {
    return db.select().from(digitalTwinDataFeeds)
      .where(eq(digitalTwinDataFeeds.companyId, companyId))
      .orderBy(desc(digitalTwinDataFeeds.createdAt));
  }
  
  async getDigitalTwinDataFeed(id: string): Promise<DigitalTwinDataFeed | undefined> {
    const [result] = await db.select().from(digitalTwinDataFeeds)
      .where(eq(digitalTwinDataFeeds.id, id));
    return result;
  }
  
  async createDigitalTwinDataFeed(feed: InsertDigitalTwinDataFeed): Promise<DigitalTwinDataFeed> {
    const [result] = await db.insert(digitalTwinDataFeeds).values(feed).returning();
    return result;
  }
  
  async updateDigitalTwinDataFeed(id: string, feed: Partial<InsertDigitalTwinDataFeed>): Promise<DigitalTwinDataFeed | undefined> {
    const [result] = await db.update(digitalTwinDataFeeds)
      .set({ ...feed, updatedAt: new Date() })
      .where(eq(digitalTwinDataFeeds.id, id))
      .returning();
    return result;
  }
  
  async deleteDigitalTwinDataFeed(id: string): Promise<void> {
    await db.delete(digitalTwinDataFeeds).where(eq(digitalTwinDataFeeds.id, id));
  }
  
  // Digital Twin - Snapshots
  async getDigitalTwinSnapshots(companyId: string, limit: number = 100): Promise<DigitalTwinSnapshot[]> {
    return db.select().from(digitalTwinSnapshots)
      .where(eq(digitalTwinSnapshots.companyId, companyId))
      .orderBy(desc(digitalTwinSnapshots.capturedAt))
      .limit(limit);
  }
  
  async getDigitalTwinSnapshot(id: string): Promise<DigitalTwinSnapshot | undefined> {
    const [result] = await db.select().from(digitalTwinSnapshots)
      .where(eq(digitalTwinSnapshots.id, id));
    return result;
  }
  
  async getLatestDigitalTwinSnapshot(companyId: string): Promise<DigitalTwinSnapshot | undefined> {
    const [result] = await db.select().from(digitalTwinSnapshots)
      .where(eq(digitalTwinSnapshots.companyId, companyId))
      .orderBy(desc(digitalTwinSnapshots.capturedAt))
      .limit(1);
    return result;
  }
  
  async createDigitalTwinSnapshot(snapshot: InsertDigitalTwinSnapshot): Promise<DigitalTwinSnapshot> {
    const [result] = await db.insert(digitalTwinSnapshots).values(snapshot).returning();
    return result;
  }
  
  // Digital Twin - Queries
  async getDigitalTwinQueries(companyId: string, limit: number = 50): Promise<DigitalTwinQuery[]> {
    return db.select().from(digitalTwinQueries)
      .where(eq(digitalTwinQueries.companyId, companyId))
      .orderBy(desc(digitalTwinQueries.createdAt))
      .limit(limit);
  }
  
  async getDigitalTwinQuery(id: string): Promise<DigitalTwinQuery | undefined> {
    const [result] = await db.select().from(digitalTwinQueries)
      .where(eq(digitalTwinQueries.id, id));
    return result;
  }
  
  async createDigitalTwinQuery(query: InsertDigitalTwinQuery): Promise<DigitalTwinQuery> {
    const [result] = await db.insert(digitalTwinQueries).values(query).returning();
    return result;
  }
  
  async updateDigitalTwinQuery(id: string, query: Partial<InsertDigitalTwinQuery>): Promise<DigitalTwinQuery | undefined> {
    const [result] = await db.update(digitalTwinQueries)
      .set(query)
      .where(eq(digitalTwinQueries.id, id))
      .returning();
    return result;
  }
  
  // Digital Twin - Simulations
  async getDigitalTwinSimulations(companyId: string): Promise<DigitalTwinSimulation[]> {
    return db.select().from(digitalTwinSimulations)
      .where(eq(digitalTwinSimulations.companyId, companyId))
      .orderBy(desc(digitalTwinSimulations.createdAt));
  }
  
  async getDigitalTwinSimulation(id: string): Promise<DigitalTwinSimulation | undefined> {
    const [result] = await db.select().from(digitalTwinSimulations)
      .where(eq(digitalTwinSimulations.id, id));
    return result;
  }
  
  async createDigitalTwinSimulation(simulation: InsertDigitalTwinSimulation): Promise<DigitalTwinSimulation> {
    const [result] = await db.insert(digitalTwinSimulations).values(simulation).returning();
    return result;
  }
  
  async updateDigitalTwinSimulation(id: string, simulation: Partial<InsertDigitalTwinSimulation>): Promise<DigitalTwinSimulation | undefined> {
    const [result] = await db.update(digitalTwinSimulations)
      .set({ ...simulation, updatedAt: new Date() })
      .where(eq(digitalTwinSimulations.id, id))
      .returning();
    return result;
  }
  
  async deleteDigitalTwinSimulation(id: string): Promise<void> {
    await db.delete(digitalTwinSimulations).where(eq(digitalTwinSimulations.id, id));
  }
  
  // Digital Twin - Alerts
  async getDigitalTwinAlerts(companyId: string, filters?: { status?: string; severity?: string; category?: string }): Promise<DigitalTwinAlert[]> {
    let conditions = [eq(digitalTwinAlerts.companyId, companyId)];
    
    if (filters?.status) {
      conditions.push(eq(digitalTwinAlerts.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(digitalTwinAlerts.severity, filters.severity));
    }
    if (filters?.category) {
      conditions.push(eq(digitalTwinAlerts.category, filters.category));
    }
    
    return db.select().from(digitalTwinAlerts)
      .where(and(...conditions))
      .orderBy(desc(digitalTwinAlerts.detectedAt));
  }
  
  async getDigitalTwinAlert(id: string): Promise<DigitalTwinAlert | undefined> {
    const [result] = await db.select().from(digitalTwinAlerts)
      .where(eq(digitalTwinAlerts.id, id));
    return result;
  }
  
  async createDigitalTwinAlert(alert: InsertDigitalTwinAlert): Promise<DigitalTwinAlert> {
    const [result] = await db.insert(digitalTwinAlerts).values(alert).returning();
    return result;
  }
  
  async updateDigitalTwinAlert(id: string, alert: Partial<InsertDigitalTwinAlert>): Promise<DigitalTwinAlert | undefined> {
    const [result] = await db.update(digitalTwinAlerts)
      .set({ ...alert, updatedAt: new Date() })
      .where(eq(digitalTwinAlerts.id, id))
      .returning();
    return result;
  }
  
  // Digital Twin - Metrics
  async getDigitalTwinMetrics(companyId: string, filters?: { metricName?: string; category?: string; startDate?: Date; endDate?: Date }): Promise<DigitalTwinMetric[]> {
    let conditions = [eq(digitalTwinMetrics.companyId, companyId)];
    
    if (filters?.metricName) {
      conditions.push(eq(digitalTwinMetrics.metricName, filters.metricName));
    }
    if (filters?.category) {
      conditions.push(eq(digitalTwinMetrics.metricCategory, filters.category));
    }
    
    return db.select().from(digitalTwinMetrics)
      .where(and(...conditions))
      .orderBy(desc(digitalTwinMetrics.recordedAt))
      .limit(1000);
  }
  
  async createDigitalTwinMetric(metric: InsertDigitalTwinMetric): Promise<DigitalTwinMetric> {
    const [result] = await db.insert(digitalTwinMetrics).values(metric).returning();
    return result;
  }
  
  async createDigitalTwinMetricsBatch(metrics: InsertDigitalTwinMetric[]): Promise<DigitalTwinMetric[]> {
    if (metrics.length === 0) return [];
    return db.insert(digitalTwinMetrics).values(metrics).returning();
  }
  
  // Activity Logs
  async getActivityLogs(companyId: string, limit: number = 20): Promise<ActivityLog[]> {
    return db.select().from(activityLogs)
      .where(eq(activityLogs.companyId, companyId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }
  
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }
  
  // User Notification Preferences
  async getUserNotificationPreferences(userId: string, companyId: string): Promise<UserNotificationPreferences | undefined> {
    const [result] = await db.select().from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.companyId, companyId)
      ));
    return result;
  }
  
  async upsertUserNotificationPreferences(prefs: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    const existing = await this.getUserNotificationPreferences(prefs.userId, prefs.companyId);
    
    if (existing) {
      const [updated] = await db.update(userNotificationPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(userNotificationPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userNotificationPreferences).values(prefs).returning();
      return created;
    }
  }
}

export const storage = new DbStorage();
