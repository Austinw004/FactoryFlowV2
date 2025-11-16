import { storage } from "./storage";

export async function seedData(companyId: string) {
  console.log("Seeding data for company:", companyId);

  // Create materials
  const steel = await storage.createMaterial({
    companyId,
    code: "steel",
    name: "Steel",
    unit: "kg",
    onHand: 10000,
    inbound: 4000,
  });

  const aluminum = await storage.createMaterial({
    companyId,
    code: "aluminum",
    name: "Aluminum",
    unit: "kg",
    onHand: 8000,
    inbound: 2000,
  });

  const polymer = await storage.createMaterial({
    companyId,
    code: "polymer",
    name: "Polymer",
    unit: "kg",
    onHand: 15000,
    inbound: 5000,
  });

  // Create SKUs
  const skuA = await storage.createSku({
    companyId,
    code: "SKU_A",
    name: "Product A",
    priority: 1.0,
  });

  const skuB = await storage.createSku({
    companyId,
    code: "SKU_B",
    name: "Product B",
    priority: 0.8,
  });

  const skuC = await storage.createSku({
    companyId,
    code: "SKU_C",
    name: "Product C",
    priority: 1.2,
  });

  // Create BOMs
  await storage.createBom({
    skuId: skuA.id,
    materialId: steel.id,
    quantityPerUnit: 3,
  });

  await storage.createBom({
    skuId: skuA.id,
    materialId: aluminum.id,
    quantityPerUnit: 2,
  });

  await storage.createBom({
    skuId: skuA.id,
    materialId: polymer.id,
    quantityPerUnit: 1,
  });

  await storage.createBom({
    skuId: skuB.id,
    materialId: steel.id,
    quantityPerUnit: 1,
  });

  await storage.createBom({
    skuId: skuB.id,
    materialId: polymer.id,
    quantityPerUnit: 4,
  });

  await storage.createBom({
    skuId: skuC.id,
    materialId: aluminum.id,
    quantityPerUnit: 5,
  });

  await storage.createBom({
    skuId: skuC.id,
    materialId: polymer.id,
    quantityPerUnit: 2,
  });

  // Create supplier
  const supplier = await storage.createSupplier({
    companyId,
    name: "Global Materials Inc",
    contactEmail: "sales@globalmaterials.com",
  });

  // Create supplier materials
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: steel.id,
    unitCost: 2.5,
    leadTimeDays: 21,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: aluminum.id,
    unitCost: 3.75,
    leadTimeDays: 14,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: polymer.id,
    unitCost: 1.2,
    leadTimeDays: 7,
  });

  // Create demand history (12 months of historical data)
  const months = [
    "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
    "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12"
  ];

  const skuAHistory = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155];
  const skuBHistory = [200, 195, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250];
  const skuCHistory = [150, 155, 160, 158, 165, 170, 175, 180, 185, 190, 195, 200];

  const demandHistoryItems = [];
  for (let i = 0; i < months.length; i++) {
    demandHistoryItems.push(
      { skuId: skuA.id, period: months[i], units: skuAHistory[i] },
      { skuId: skuB.id, period: months[i], units: skuBHistory[i] },
      { skuId: skuC.id, period: months[i], units: skuCHistory[i] }
    );
  }

  await storage.bulkCreateDemandHistory(demandHistoryItems);

  console.log("Seed data created successfully!");
  return {
    companyId,
    materials: [steel, aluminum, polymer],
    skus: [skuA, skuB, skuC],
    supplier,
  };
}
