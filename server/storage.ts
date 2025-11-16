import { db } from "@db";
import { eq, and } from "drizzle-orm";
import type { 
  User, InsertUser, UpsertUser, Company, InsertCompany, Sku, InsertSku,
  Material, InsertMaterial, Bom, InsertBom, Supplier, InsertSupplier,
  SupplierMaterial, InsertSupplierMaterial, DemandHistory, InsertDemandHistory,
  Allocation, InsertAllocation, AllocationResult, InsertAllocationResult,
  PriceAlert, InsertPriceAlert
} from "@shared/schema";
import { 
  users, companies, skus, materials, boms, suppliers, supplierMaterials,
  demandHistory, allocations, allocationResults, priceAlerts
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
}

export const storage = new DbStorage();
