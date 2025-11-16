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

  // SPECIALTY HIGH-PERFORMANCE POLYMERS
  const peek = await storage.createMaterial({
    companyId,
    code: "POLY-PEEK",
    name: "PEEK (Polyetheretherketone)",
    unit: "kg",
    onHand: 500,
    inbound: 200,
  });

  const pvdf = await storage.createMaterial({
    companyId,
    code: "POLY-PVDF",
    name: "PVDF (Polyvinylidene Fluoride)",
    unit: "kg",
    onHand: 600,
    inbound: 250,
  });

  const ptfe = await storage.createMaterial({
    companyId,
    code: "POLY-PTFE",
    name: "PTFE (Teflon)",
    unit: "kg",
    onHand: 800,
    inbound: 300,
  });

  const pi = await storage.createMaterial({
    companyId,
    code: "POLY-PI",
    name: "Polyimide (Kapton)",
    unit: "kg",
    onHand: 400,
    inbound: 150,
  });

  const pps = await storage.createMaterial({
    companyId,
    code: "POLY-PPS",
    name: "PPS (Polyphenylene Sulfide)",
    unit: "kg",
    onHand: 550,
    inbound: 200,
  });

  const psu = await storage.createMaterial({
    companyId,
    code: "POLY-PSU",
    name: "Polysulfone",
    unit: "kg",
    onHand: 450,
    inbound: 180,
  });

  const pei = await storage.createMaterial({
    companyId,
    code: "POLY-PEI",
    name: "PEI (Ultem)",
    unit: "kg",
    onHand: 350,
    inbound: 140,
  });

  // PRECIOUS METALS
  const gold = await storage.createMaterial({
    companyId,
    code: "PM-AU",
    name: "Gold",
    unit: "oz",
    onHand: 100,
    inbound: 20,
  });

  const silver = await storage.createMaterial({
    companyId,
    code: "PM-AG",
    name: "Silver",
    unit: "oz",
    onHand: 1000,
    inbound: 300,
  });

  const platinum = await storage.createMaterial({
    companyId,
    code: "PM-PT",
    name: "Platinum",
    unit: "oz",
    onHand: 50,
    inbound: 15,
  });

  const palladium = await storage.createMaterial({
    companyId,
    code: "PM-PD",
    name: "Palladium",
    unit: "oz",
    onHand: 80,
    inbound: 25,
  });

  const rhodium = await storage.createMaterial({
    companyId,
    code: "PM-RH",
    name: "Rhodium",
    unit: "oz",
    onHand: 10,
    inbound: 3,
  });

  const iridium = await storage.createMaterial({
    companyId,
    code: "PM-IR",
    name: "Iridium",
    unit: "oz",
    onHand: 12,
    inbound: 4,
  });

  // RARE EARTH METALS
  const neodymium = await storage.createMaterial({
    companyId,
    code: "RE-ND",
    name: "Neodymium",
    unit: "kg",
    onHand: 200,
    inbound: 50,
  });

  const dysprosium = await storage.createMaterial({
    companyId,
    code: "RE-DY",
    name: "Dysprosium",
    unit: "kg",
    onHand: 80,
    inbound: 20,
  });

  const lanthanum = await storage.createMaterial({
    companyId,
    code: "RE-LA",
    name: "Lanthanum",
    unit: "kg",
    onHand: 300,
    inbound: 100,
  });

  const cerium = await storage.createMaterial({
    companyId,
    code: "RE-CE",
    name: "Cerium",
    unit: "kg",
    onHand: 400,
    inbound: 120,
  });

  const praseodymium = await storage.createMaterial({
    companyId,
    code: "RE-PR",
    name: "Praseodymium",
    unit: "kg",
    onHand: 150,
    inbound: 40,
  });

  const europium = await storage.createMaterial({
    companyId,
    code: "RE-EU",
    name: "Europium",
    unit: "kg",
    onHand: 30,
    inbound: 10,
  });

  const terbium = await storage.createMaterial({
    companyId,
    code: "RE-TB",
    name: "Terbium",
    unit: "kg",
    onHand: 40,
    inbound: 12,
  });

  const yttrium = await storage.createMaterial({
    companyId,
    code: "RE-Y",
    name: "Yttrium",
    unit: "kg",
    onHand: 250,
    inbound: 80,
  });

  // SPECIALTY ALLOYS & SUPERALLOYS
  const inconel = await storage.createMaterial({
    companyId,
    code: "ALLOY-IN625",
    name: "Inconel 625",
    unit: "kg",
    onHand: 600,
    inbound: 200,
  });

  const hastelloy = await storage.createMaterial({
    companyId,
    code: "ALLOY-HC276",
    name: "Hastelloy C-276",
    unit: "kg",
    onHand: 400,
    inbound: 150,
  });

  const monel = await storage.createMaterial({
    companyId,
    code: "ALLOY-M400",
    name: "Monel 400",
    unit: "kg",
    onHand: 500,
    inbound: 180,
  });

  const waspaloy = await storage.createMaterial({
    companyId,
    code: "ALLOY-WASP",
    name: "Waspaloy",
    unit: "kg",
    onHand: 300,
    inbound: 100,
  });

  const cobaltChrome = await storage.createMaterial({
    companyId,
    code: "ALLOY-COCO",
    name: "Cobalt-Chrome (Stellite)",
    unit: "kg",
    onHand: 350,
    inbound: 120,
  });

  // SEMICONDUCTOR MATERIALS
  const silicon = await storage.createMaterial({
    companyId,
    code: "SEMI-SI",
    name: "Silicon Wafer",
    unit: "piece",
    onHand: 1000,
    inbound: 500,
  });

  const galliumArsenide = await storage.createMaterial({
    companyId,
    code: "SEMI-GAAS",
    name: "Gallium Arsenide",
    unit: "kg",
    onHand: 50,
    inbound: 20,
  });

  const germanium = await storage.createMaterial({
    companyId,
    code: "SEMI-GE",
    name: "Germanium",
    unit: "kg",
    onHand: 100,
    inbound: 30,
  });

  const galliumNitride = await storage.createMaterial({
    companyId,
    code: "SEMI-GAN",
    name: "Gallium Nitride",
    unit: "kg",
    onHand: 80,
    inbound: 25,
  });

  const indiumTinOxide = await storage.createMaterial({
    companyId,
    code: "SEMI-ITO",
    name: "Indium Tin Oxide",
    unit: "kg",
    onHand: 120,
    inbound: 40,
  });

  // BATTERY & ENERGY STORAGE MATERIALS
  const lithiumCarbonate = await storage.createMaterial({
    companyId,
    code: "BATT-LI2CO3",
    name: "Lithium Carbonate",
    unit: "kg",
    onHand: 5000,
    inbound: 2000,
  });

  const lithiumHydroxide = await storage.createMaterial({
    companyId,
    code: "BATT-LIOH",
    name: "Lithium Hydroxide",
    unit: "kg",
    onHand: 4000,
    inbound: 1500,
  });

  const cobaltOxide = await storage.createMaterial({
    companyId,
    code: "BATT-CO3O4",
    name: "Cobalt Oxide",
    unit: "kg",
    onHand: 2000,
    inbound: 800,
  });

  const graphiteAnode = await storage.createMaterial({
    companyId,
    code: "BATT-GRAPH",
    name: "Battery-Grade Graphite",
    unit: "kg",
    onHand: 8000,
    inbound: 3000,
  });

  const nickelSulfate = await storage.createMaterial({
    companyId,
    code: "BATT-NISO4",
    name: "Nickel Sulfate",
    unit: "kg",
    onHand: 6000,
    inbound: 2500,
  });

  const manganeseSulfate = await storage.createMaterial({
    companyId,
    code: "BATT-MNSO4",
    name: "Manganese Sulfate",
    unit: "kg",
    onHand: 3000,
    inbound: 1200,
  });

  // ADVANCED CERAMICS
  const aluminaAdvanced = await storage.createMaterial({
    companyId,
    code: "CER-AL2O3",
    name: "Advanced Alumina (99.9%)",
    unit: "kg",
    onHand: 2000,
    inbound: 800,
  });

  const zirconia = await storage.createMaterial({
    companyId,
    code: "CER-ZRO2",
    name: "Zirconia (Yttria-Stabilized)",
    unit: "kg",
    onHand: 1500,
    inbound: 600,
  });

  const siliconCarbide = await storage.createMaterial({
    companyId,
    code: "CER-SIC",
    name: "Silicon Carbide",
    unit: "kg",
    onHand: 2500,
    inbound: 1000,
  });

  const siliconNitride = await storage.createMaterial({
    companyId,
    code: "CER-SI3N4",
    name: "Silicon Nitride",
    unit: "kg",
    onHand: 1200,
    inbound: 500,
  });

  const boronCarbide = await storage.createMaterial({
    companyId,
    code: "CER-B4C",
    name: "Boron Carbide",
    unit: "kg",
    onHand: 800,
    inbound: 300,
  });

  // INDUSTRIAL CHEMICALS (EXPANDED)
  const sulfuricAcid = await storage.createMaterial({
    companyId,
    code: "CHEM-H2SO4",
    name: "Sulfuric Acid (98%)",
    unit: "L",
    onHand: 10000,
    inbound: 4000,
  });

  const hydrochloricAcid = await storage.createMaterial({
    companyId,
    code: "CHEM-HCL",
    name: "Hydrochloric Acid",
    unit: "L",
    onHand: 8000,
    inbound: 3000,
  });

  const sodiumHydroxide = await storage.createMaterial({
    companyId,
    code: "CHEM-NAOH",
    name: "Sodium Hydroxide (Caustic Soda)",
    unit: "kg",
    onHand: 12000,
    inbound: 5000,
  });

  const ammonia = await storage.createMaterial({
    companyId,
    code: "CHEM-NH3",
    name: "Ammonia",
    unit: "kg",
    onHand: 7000,
    inbound: 3000,
  });

  const methanol = await storage.createMaterial({
    companyId,
    code: "CHEM-MEOH",
    name: "Methanol",
    unit: "L",
    onHand: 6000,
    inbound: 2500,
  });

  const ethanol = await storage.createMaterial({
    companyId,
    code: "CHEM-ETOH",
    name: "Ethanol (Industrial)",
    unit: "L",
    onHand: 8000,
    inbound: 3500,
  });

  const acetone = await storage.createMaterial({
    companyId,
    code: "CHEM-ACE",
    name: "Acetone",
    unit: "L",
    onHand: 5000,
    inbound: 2000,
  });

  const toluene = await storage.createMaterial({
    companyId,
    code: "CHEM-TOL",
    name: "Toluene",
    unit: "L",
    onHand: 4500,
    inbound: 1800,
  });

  // SPECIALTY METALS (MINOR/TECHNOLOGY METALS)
  const indium = await storage.createMaterial({
    companyId,
    code: "TECH-IN",
    name: "Indium",
    unit: "kg",
    onHand: 40,
    inbound: 15,
  });

  const tellurium = await storage.createMaterial({
    companyId,
    code: "TECH-TE",
    name: "Tellurium",
    unit: "kg",
    onHand: 30,
    inbound: 10,
  });

  const selenium = await storage.createMaterial({
    companyId,
    code: "TECH-SE",
    name: "Selenium",
    unit: "kg",
    onHand: 60,
    inbound: 20,
  });

  const bismuth = await storage.createMaterial({
    companyId,
    code: "TECH-BI",
    name: "Bismuth",
    unit: "kg",
    onHand: 150,
    inbound: 50,
  });

  const antimony = await storage.createMaterial({
    companyId,
    code: "TECH-SB",
    name: "Antimony",
    unit: "kg",
    onHand: 200,
    inbound: 70,
  });

  const molybdenum = await storage.createMaterial({
    companyId,
    code: "TECH-MO",
    name: "Molybdenum",
    unit: "kg",
    onHand: 500,
    inbound: 200,
  });

  const tungsten = await storage.createMaterial({
    companyId,
    code: "TECH-W",
    name: "Tungsten",
    unit: "kg",
    onHand: 600,
    inbound: 250,
  });

  const vanadium = await storage.createMaterial({
    companyId,
    code: "TECH-V",
    name: "Vanadium",
    unit: "kg",
    onHand: 400,
    inbound: 150,
  });

  const tantalum = await storage.createMaterial({
    companyId,
    code: "TECH-TA",
    name: "Tantalum",
    unit: "kg",
    onHand: 100,
    inbound: 35,
  });

  const niobium = await storage.createMaterial({
    companyId,
    code: "TECH-NB",
    name: "Niobium",
    unit: "kg",
    onHand: 120,
    inbound: 40,
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

  // Specialty Polymers
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: peek.id,
    unitCost: 125.0,
    leadTimeDays: 35,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: pvdf.id,
    unitCost: 45.0,
    leadTimeDays: 28,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: ptfe.id,
    unitCost: 38.0,
    leadTimeDays: 21,
  });

  // Precious Metals
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: gold.id,
    unitCost: 2050.0,
    leadTimeDays: 7,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: silver.id,
    unitCost: 24.5,
    leadTimeDays: 7,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: platinum.id,
    unitCost: 980.0,
    leadTimeDays: 14,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: palladium.id,
    unitCost: 1050.0,
    leadTimeDays: 14,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: rhodium.id,
    unitCost: 4800.0,
    leadTimeDays: 21,
  });

  // Rare Earth Metals
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: neodymium.id,
    unitCost: 85.0,
    leadTimeDays: 42,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: dysprosium.id,
    unitCost: 420.0,
    leadTimeDays: 45,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: lanthanum.id,
    unitCost: 12.5,
    leadTimeDays: 35,
  });

  // Specialty Alloys
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: inconel.id,
    unitCost: 55.0,
    leadTimeDays: 35,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: hastelloy.id,
    unitCost: 72.0,
    leadTimeDays: 40,
  });

  // Battery Materials
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: lithiumCarbonate.id,
    unitCost: 18.5,
    leadTimeDays: 28,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: cobaltOxide.id,
    unitCost: 35.0,
    leadTimeDays: 30,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: graphiteAnode.id,
    unitCost: 12.0,
    leadTimeDays: 21,
  });

  // Semiconductor Materials
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: silicon.id,
    unitCost: 8.5,
    leadTimeDays: 28,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: galliumArsenide.id,
    unitCost: 450.0,
    leadTimeDays: 35,
  });

  // Technology Metals
  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: indium.id,
    unitCost: 280.0,
    leadTimeDays: 30,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: tungsten.id,
    unitCost: 42.0,
    leadTimeDays: 35,
  });

  await storage.createSupplierMaterial({
    supplierId: supplier.id,
    materialId: tantalum.id,
    unitCost: 350.0,
    leadTimeDays: 40,
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

  console.log("Seed data created successfully with 110+ tradeable commodity materials!");
  return {
    companyId,
    materials: [
      // Base Metals
      steel, stainlessSteel, aluminum, copper, nickel, titanium, zinc, brass, bronze, magnesium,
      // Plastics & Polymers
      abs, pet, hdpe, ldpe, pvc, polycarbonate, nylon, polypropylene, acrylic,
      // Specialty High-Performance Polymers
      peek, pvdf, ptfe, pi, pps, psu, pei,
      // Composites
      carbonFiber, fiberglass, kevlar,
      // Rubber
      naturalRubber, syntheticRubber, silicone,
      // Textiles
      cotton, polyester, kevlarFabric,
      // Wood & Paper
      plywood, mdf, cardboard,
      // Glass & Ceramics
      glass, ceramicTile,
      // Advanced Ceramics
      aluminaAdvanced, zirconia, siliconCarbide, siliconNitride, boronCarbide,
      // Chemicals & Adhesives
      epoxy, polyurethane, solvent, lubricant,
      // Industrial Chemicals (Expanded)
      sulfuricAcid, hydrochloricAcid, sodiumHydroxide, ammonia, methanol, ethanol, acetone, toluene,
      // Electronics
      pcb, wire, connectors,
      // Packaging
      bubble, foam,
      // Precious Metals
      gold, silver, platinum, palladium, rhodium, iridium,
      // Rare Earth Metals
      neodymium, dysprosium, lanthanum, cerium, praseodymium, europium, terbium, yttrium,
      // Specialty Alloys & Superalloys
      inconel, hastelloy, monel, waspaloy, cobaltChrome,
      // Semiconductor Materials
      silicon, galliumArsenide, germanium, galliumNitride, indiumTinOxide,
      // Battery & Energy Storage Materials
      lithiumCarbonate, lithiumHydroxide, cobaltOxide, graphiteAnode, nickelSulfate, manganeseSulfate,
      // Technology Metals
      indium, tellurium, selenium, bismuth, antimony, molybdenum, tungsten, vanadium, tantalum, niobium
    ],
    skus: [skuA, skuB, skuC],
    supplier,
  };
}
