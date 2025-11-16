import { storage } from "./storage";

export async function seedData(companyId: string) {
  console.log("Seeding data for company:", companyId);

  // Create comprehensive materials database
  
  // METALS
  const steel = await storage.createMaterial({
    companyId,
    code: "STEEL-CS",
    name: "Carbon Steel",
    unit: "kg",
    onHand: 10000,
    inbound: 4000,
  });

  const stainlessSteel = await storage.createMaterial({
    companyId,
    code: "STEEL-SS304",
    name: "Stainless Steel 304",
    unit: "kg",
    onHand: 5000,
    inbound: 2000,
  });

  const aluminum = await storage.createMaterial({
    companyId,
    code: "AL-6061",
    name: "Aluminum 6061",
    unit: "kg",
    onHand: 8000,
    inbound: 2000,
  });

  const copper = await storage.createMaterial({
    companyId,
    code: "CU-C110",
    name: "Copper",
    unit: "kg",
    onHand: 3000,
    inbound: 1000,
  });

  const nickel = await storage.createMaterial({
    companyId,
    code: "NI-200",
    name: "Nickel",
    unit: "kg",
    onHand: 1500,
    inbound: 500,
  });

  const titanium = await storage.createMaterial({
    companyId,
    code: "TI-GR5",
    name: "Titanium Grade 5",
    unit: "kg",
    onHand: 800,
    inbound: 200,
  });

  const zinc = await storage.createMaterial({
    companyId,
    code: "ZN-99",
    name: "Zinc",
    unit: "kg",
    onHand: 4000,
    inbound: 1500,
  });

  const brass = await storage.createMaterial({
    companyId,
    code: "BRASS-C360",
    name: "Brass",
    unit: "kg",
    onHand: 2500,
    inbound: 800,
  });

  const bronze = await storage.createMaterial({
    companyId,
    code: "BRONZE-C932",
    name: "Bronze",
    unit: "kg",
    onHand: 2000,
    inbound: 600,
  });

  const magnesium = await storage.createMaterial({
    companyId,
    code: "MG-AZ31",
    name: "Magnesium Alloy",
    unit: "kg",
    onHand: 1200,
    inbound: 400,
  });

  // PLASTICS & POLYMERS
  const abs = await storage.createMaterial({
    companyId,
    code: "PLAST-ABS",
    name: "ABS Plastic",
    unit: "kg",
    onHand: 12000,
    inbound: 4000,
  });

  const pet = await storage.createMaterial({
    companyId,
    code: "PLAST-PET",
    name: "PET (Polyethylene Terephthalate)",
    unit: "kg",
    onHand: 9000,
    inbound: 3000,
  });

  const hdpe = await storage.createMaterial({
    companyId,
    code: "PLAST-HDPE",
    name: "HDPE (High-Density Polyethylene)",
    unit: "kg",
    onHand: 11000,
    inbound: 3500,
  });

  const ldpe = await storage.createMaterial({
    companyId,
    code: "PLAST-LDPE",
    name: "LDPE (Low-Density Polyethylene)",
    unit: "kg",
    onHand: 8000,
    inbound: 2500,
  });

  const pvc = await storage.createMaterial({
    companyId,
    code: "PLAST-PVC",
    name: "PVC (Polyvinyl Chloride)",
    unit: "kg",
    onHand: 10000,
    inbound: 3000,
  });

  const polycarbonate = await storage.createMaterial({
    companyId,
    code: "PLAST-PC",
    name: "Polycarbonate",
    unit: "kg",
    onHand: 6000,
    inbound: 2000,
  });

  const nylon = await storage.createMaterial({
    companyId,
    code: "PLAST-PA6",
    name: "Nylon (PA6)",
    unit: "kg",
    onHand: 7000,
    inbound: 2200,
  });

  const polypropylene = await storage.createMaterial({
    companyId,
    code: "PLAST-PP",
    name: "Polypropylene",
    unit: "kg",
    onHand: 13000,
    inbound: 4000,
  });

  const acrylic = await storage.createMaterial({
    companyId,
    code: "PLAST-PMMA",
    name: "Acrylic (PMMA)",
    unit: "kg",
    onHand: 5000,
    inbound: 1500,
  });

  // COMPOSITES
  const carbonFiber = await storage.createMaterial({
    companyId,
    code: "COMP-CF",
    name: "Carbon Fiber",
    unit: "kg",
    onHand: 2000,
    inbound: 800,
  });

  const fiberglass = await storage.createMaterial({
    companyId,
    code: "COMP-FG",
    name: "Fiberglass",
    unit: "kg",
    onHand: 4500,
    inbound: 1500,
  });

  const kevlar = await storage.createMaterial({
    companyId,
    code: "COMP-KEV",
    name: "Kevlar",
    unit: "kg",
    onHand: 1000,
    inbound: 300,
  });

  // RUBBER MATERIALS
  const naturalRubber = await storage.createMaterial({
    companyId,
    code: "RUB-NR",
    name: "Natural Rubber",
    unit: "kg",
    onHand: 6000,
    inbound: 2000,
  });

  const syntheticRubber = await storage.createMaterial({
    companyId,
    code: "RUB-SBR",
    name: "Synthetic Rubber (SBR)",
    unit: "kg",
    onHand: 7000,
    inbound: 2200,
  });

  const silicone = await storage.createMaterial({
    companyId,
    code: "RUB-SI",
    name: "Silicone Rubber",
    unit: "kg",
    onHand: 3500,
    inbound: 1000,
  });

  // TEXTILES
  const cotton = await storage.createMaterial({
    companyId,
    code: "TEXT-COT",
    name: "Cotton Fabric",
    unit: "m",
    onHand: 15000,
    inbound: 5000,
  });

  const polyester = await storage.createMaterial({
    companyId,
    code: "TEXT-PES",
    name: "Polyester Fabric",
    unit: "m",
    onHand: 18000,
    inbound: 6000,
  });

  const kevlarFabric = await storage.createMaterial({
    companyId,
    code: "TEXT-KEV",
    name: "Kevlar Fabric",
    unit: "m",
    onHand: 2000,
    inbound: 500,
  });

  // WOOD & PAPER
  const plywood = await storage.createMaterial({
    companyId,
    code: "WOOD-PLY",
    name: "Plywood",
    unit: "sheet",
    onHand: 500,
    inbound: 200,
  });

  const mdf = await storage.createMaterial({
    companyId,
    code: "WOOD-MDF",
    name: "MDF (Medium Density Fiberboard)",
    unit: "sheet",
    onHand: 600,
    inbound: 250,
  });

  const cardboard = await storage.createMaterial({
    companyId,
    code: "PAPER-CB",
    name: "Corrugated Cardboard",
    unit: "sheet",
    onHand: 2000,
    inbound: 800,
  });

  // GLASS & CERAMICS
  const glass = await storage.createMaterial({
    companyId,
    code: "GLASS-FL",
    name: "Float Glass",
    unit: "kg",
    onHand: 4000,
    inbound: 1200,
  });

  const ceramicTile = await storage.createMaterial({
    companyId,
    code: "CER-TILE",
    name: "Ceramic Tile",
    unit: "piece",
    onHand: 10000,
    inbound: 3000,
  });

  // CHEMICALS & ADHESIVES
  const epoxy = await storage.createMaterial({
    companyId,
    code: "CHEM-EPX",
    name: "Epoxy Resin",
    unit: "L",
    onHand: 800,
    inbound: 300,
  });

  const polyurethane = await storage.createMaterial({
    companyId,
    code: "CHEM-PU",
    name: "Polyurethane Adhesive",
    unit: "L",
    onHand: 1000,
    inbound: 350,
  });

  const solvent = await storage.createMaterial({
    companyId,
    code: "CHEM-SOL",
    name: "Industrial Solvent",
    unit: "L",
    onHand: 2000,
    inbound: 600,
  });

  const lubricant = await storage.createMaterial({
    companyId,
    code: "CHEM-LUB",
    name: "Industrial Lubricant",
    unit: "L",
    onHand: 1500,
    inbound: 500,
  });

  // ELECTRONIC COMPONENTS
  const pcb = await storage.createMaterial({
    companyId,
    code: "ELEC-PCB",
    name: "Printed Circuit Board",
    unit: "piece",
    onHand: 5000,
    inbound: 2000,
  });

  const wire = await storage.createMaterial({
    companyId,
    code: "ELEC-WIRE",
    name: "Copper Wire",
    unit: "m",
    onHand: 50000,
    inbound: 15000,
  });

  const connectors = await storage.createMaterial({
    companyId,
    code: "ELEC-CONN",
    name: "Electrical Connectors",
    unit: "piece",
    onHand: 20000,
    inbound: 5000,
  });

  // PACKAGING MATERIALS
  const bubble = await storage.createMaterial({
    companyId,
    code: "PKG-BUBBLE",
    name: "Bubble Wrap",
    unit: "m",
    onHand: 5000,
    inbound: 2000,
  });

  const foam = await storage.createMaterial({
    companyId,
    code: "PKG-FOAM",
    name: "Foam Padding",
    unit: "kg",
    onHand: 3000,
    inbound: 1000,
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
    materialId: abs.id,
    quantityPerUnit: 1,
  });

  await storage.createBom({
    skuId: skuA.id,
    materialId: copper.id,
    quantityPerUnit: 0.5,
  });

  await storage.createBom({
    skuId: skuB.id,
    materialId: stainlessSteel.id,
    quantityPerUnit: 2,
  });

  await storage.createBom({
    skuId: skuB.id,
    materialId: polypropylene.id,
    quantityPerUnit: 4,
  });

  await storage.createBom({
    skuId: skuB.id,
    materialId: naturalRubber.id,
    quantityPerUnit: 1,
  });

  await storage.createBom({
    skuId: skuC.id,
    materialId: aluminum.id,
    quantityPerUnit: 5,
  });

  await storage.createBom({
    skuId: skuC.id,
    materialId: hdpe.id,
    quantityPerUnit: 2,
  });

  await storage.createBom({
    skuId: skuC.id,
    materialId: pcb.id,
    quantityPerUnit: 1,
  });

  // Create supplier
  const supplier = await storage.createSupplier({
    companyId,
    name: "Global Materials Inc",
    contactEmail: "sales@globalmaterials.com",
  });

  // Create supplier materials (sampling across categories)
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: steel.id,
    unitCost: 2.5,
    leadTimeDays: 21,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: stainlessSteel.id,
    unitCost: 4.8,
    leadTimeDays: 28,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: aluminum.id,
    unitCost: 3.75,
    leadTimeDays: 14,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: copper.id,
    unitCost: 8.5,
    leadTimeDays: 18,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: nickel.id,
    unitCost: 15.2,
    leadTimeDays: 35,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: titanium.id,
    unitCost: 28.5,
    leadTimeDays: 45,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: abs.id,
    unitCost: 1.8,
    leadTimeDays: 7,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: hdpe.id,
    unitCost: 1.2,
    leadTimeDays: 7,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: polypropylene.id,
    unitCost: 1.1,
    leadTimeDays: 7,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: carbonFiber.id,
    unitCost: 45.0,
    leadTimeDays: 30,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: naturalRubber.id,
    unitCost: 2.2,
    leadTimeDays: 14,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: pcb.id,
    unitCost: 5.5,
    leadTimeDays: 21,
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

  console.log("Seed data created successfully with comprehensive materials database!");
  return {
    companyId,
    materials: [steel, stainlessSteel, aluminum, copper, nickel, titanium, zinc, brass, bronze, magnesium,
                abs, pet, hdpe, ldpe, pvc, polycarbonate, nylon, polypropylene, acrylic,
                carbonFiber, fiberglass, kevlar,
                naturalRubber, syntheticRubber, silicone,
                cotton, polyester, kevlarFabric,
                plywood, mdf, cardboard,
                glass, ceramicTile,
                epoxy, polyurethane, solvent, lubricant,
                pcb, wire, connectors,
                bubble, foam],
    skus: [skuA, skuB, skuC],
    supplier,
  };
}
