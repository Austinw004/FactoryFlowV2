/**
 * Master Materials Catalog
 * Comprehensive list of 110+ tradeable commodities for manufacturing
 * This catalog is independent of company-specific materials
 */

export interface CatalogMaterial {
  code: string;
  name: string;
  unit: string;
  category: string;
  estimatedPrice?: number; // USD per unit (fallback if no supplier pricing)
}

export const MASTER_MATERIALS_CATALOG: CatalogMaterial[] = [
  // METALS (Base & Structural)
  { code: "STEEL-CS", name: "Carbon Steel", unit: "kg", category: "Metals", estimatedPrice: 2.5 },
  { code: "STEEL-SS304", name: "Stainless Steel 304", unit: "kg", category: "Metals", estimatedPrice: 5.0 },
  { code: "AL-6061", name: "Aluminum 6061", unit: "kg", category: "Metals", estimatedPrice: 3.5 },
  { code: "CU-C110", name: "Copper", unit: "kg", category: "Metals", estimatedPrice: 9.5 },
  { code: "NI-200", name: "Nickel", unit: "kg", category: "Metals", estimatedPrice: 18.0 },
  { code: "TI-GR5", name: "Titanium Grade 5", unit: "kg", category: "Metals", estimatedPrice: 35.0 },
  { code: "ZN-99", name: "Zinc", unit: "kg", category: "Metals", estimatedPrice: 3.0 },
  { code: "BRASS-C360", name: "Brass", unit: "kg", category: "Metals", estimatedPrice: 7.0 },
  { code: "BRONZE-C932", name: "Bronze", unit: "kg", category: "Metals", estimatedPrice: 8.0 },
  { code: "MG-AZ31", name: "Magnesium Alloy", unit: "kg", category: "Metals", estimatedPrice: 4.5 },
  
  // PLASTICS & POLYMERS (Common)
  { code: "PLAST-ABS", name: "ABS Plastic", unit: "kg", category: "Plastics", estimatedPrice: 2.8 },
  { code: "PLAST-PET", name: "PET (Polyethylene Terephthalate)", unit: "kg", category: "Plastics", estimatedPrice: 1.5 },
  { code: "PLAST-HDPE", name: "HDPE (High-Density Polyethylene)", unit: "kg", category: "Plastics", estimatedPrice: 1.8 },
  { code: "PLAST-LDPE", name: "LDPE (Low-Density Polyethylene)", unit: "kg", category: "Plastics", estimatedPrice: 1.6 },
  { code: "PLAST-PVC", name: "PVC (Polyvinyl Chloride)", unit: "kg", category: "Plastics", estimatedPrice: 1.4 },
  { code: "PLAST-PC", name: "Polycarbonate", unit: "kg", category: "Plastics", estimatedPrice: 3.5 },
  { code: "PLAST-PA6", name: "Nylon (PA6)", unit: "kg", category: "Plastics", estimatedPrice: 4.0 },
  { code: "PLAST-PP", name: "Polypropylene", unit: "kg", category: "Plastics", estimatedPrice: 1.7 },
  { code: "PLAST-PMMA", name: "Acrylic (PMMA)", unit: "kg", category: "Plastics", estimatedPrice: 3.2 },
  
  // COMPOSITES
  { code: "COMP-CF", name: "Carbon Fiber", unit: "kg", category: "Composites", estimatedPrice: 25.0 },
  { code: "COMP-FG", name: "Fiberglass", unit: "kg", category: "Composites", estimatedPrice: 3.5 },
  { code: "COMP-KEV", name: "Kevlar", unit: "kg", category: "Composites", estimatedPrice: 45.0 },
  
  // RUBBER MATERIALS
  { code: "RUB-NR", name: "Natural Rubber", unit: "kg", category: "Rubber", estimatedPrice: 2.2 },
  { code: "RUB-SBR", name: "Synthetic Rubber (SBR)", unit: "kg", category: "Rubber", estimatedPrice: 2.5 },
  { code: "RUB-SI", name: "Silicone Rubber", unit: "kg", category: "Rubber", estimatedPrice: 6.0 },
  
  // TEXTILES
  { code: "TEXT-COT", name: "Cotton Fabric", unit: "m", category: "Textiles", estimatedPrice: 5.0 },
  { code: "TEXT-PES", name: "Polyester Fabric", unit: "m", category: "Textiles", estimatedPrice: 4.0 },
  { code: "TEXT-KEV", name: "Kevlar Fabric", unit: "m", category: "Textiles", estimatedPrice: 35.0 },
  
  // WOOD & PAPER
  { code: "WOOD-PLY", name: "Plywood", unit: "sheet", category: "Wood", estimatedPrice: 45.0 },
  { code: "WOOD-MDF", name: "MDF (Medium Density Fiberboard)", unit: "sheet", category: "Wood", estimatedPrice: 25.0 },
  { code: "PAPER-CB", name: "Corrugated Cardboard", unit: "sheet", category: "Paper", estimatedPrice: 1.5 },
  
  // GLASS & CERAMICS
  { code: "GLASS-FL", name: "Float Glass", unit: "kg", category: "Glass", estimatedPrice: 2.0 },
  { code: "CER-TILE", name: "Ceramic Tile", unit: "piece", category: "Ceramics", estimatedPrice: 5.0 },
  { code: "CER-ALU", name: "Alumina Ceramic", unit: "kg", category: "Ceramics", estimatedPrice: 12.0 },
  { code: "CER-ZIR", name: "Zirconia Ceramic", unit: "kg", category: "Ceramics", estimatedPrice: 35.0 },
  { code: "CER-SIC", name: "Silicon Carbide", unit: "kg", category: "Ceramics", estimatedPrice: 18.0 },
  
  // CHEMICALS & ADHESIVES
  { code: "CHEM-EPX", name: "Epoxy Resin", unit: "L", category: "Chemicals", estimatedPrice: 25.0 },
  { code: "CHEM-PU", name: "Polyurethane Adhesive", unit: "L", category: "Chemicals", estimatedPrice: 20.0 },
  { code: "CHEM-SOL", name: "Industrial Solvent", unit: "L", category: "Chemicals", estimatedPrice: 8.0 },
  { code: "CHEM-LUB", name: "Industrial Lubricant", unit: "L", category: "Chemicals", estimatedPrice: 12.0 },
  
  // ELECTRONIC COMPONENTS
  { code: "ELEC-PCB", name: "Printed Circuit Board", unit: "piece", category: "Electronics", estimatedPrice: 15.0 },
  { code: "ELEC-WIRE", name: "Copper Wire", unit: "m", category: "Electronics", estimatedPrice: 2.0 },
  { code: "ELEC-CONN", name: "Electrical Connectors", unit: "piece", category: "Electronics", estimatedPrice: 0.5 },
  
  // PACKAGING MATERIALS
  { code: "PKG-BUBBLE", name: "Bubble Wrap", unit: "m", category: "Packaging", estimatedPrice: 0.5 },
  { code: "PKG-FOAM", name: "Foam Padding", unit: "kg", category: "Packaging", estimatedPrice: 3.0 },
  
  // SPECIALTY HIGH-PERFORMANCE POLYMERS
  { code: "POLY-PEEK", name: "PEEK (Polyetheretherketone)", unit: "kg", category: "Specialty Polymers", estimatedPrice: 85.0 },
  { code: "POLY-PVDF", name: "PVDF (Polyvinylidene Fluoride)", unit: "kg", category: "Specialty Polymers", estimatedPrice: 45.0 },
  { code: "POLY-PTFE", name: "PTFE (Teflon)", unit: "kg", category: "Specialty Polymers", estimatedPrice: 25.0 },
  { code: "POLY-PI", name: "Polyimide (Kapton)", unit: "kg", category: "Specialty Polymers", estimatedPrice: 95.0 },
  { code: "POLY-PPS", name: "PPS (Polyphenylene Sulfide)", unit: "kg", category: "Specialty Polymers", estimatedPrice: 55.0 },
  { code: "POLY-PSU", name: "Polysulfone", unit: "kg", category: "Specialty Polymers", estimatedPrice: 65.0 },
  { code: "POLY-PEI", name: "PEI (Ultem)", unit: "kg", category: "Specialty Polymers", estimatedPrice: 75.0 },
  
  // PRECIOUS METALS
  { code: "PM-AU", name: "Gold", unit: "oz", category: "Precious Metals", estimatedPrice: 2000.0 },
  { code: "PM-AG", name: "Silver", unit: "oz", category: "Precious Metals", estimatedPrice: 25.0 },
  { code: "PM-PT", name: "Platinum", unit: "oz", category: "Precious Metals", estimatedPrice: 1000.0 },
  { code: "PM-PD", name: "Palladium", unit: "oz", category: "Precious Metals", estimatedPrice: 1100.0 },
  { code: "PM-RH", name: "Rhodium", unit: "oz", category: "Precious Metals", estimatedPrice: 4500.0 },
  { code: "PM-IR", name: "Iridium", unit: "oz", category: "Precious Metals", estimatedPrice: 1500.0 },
  
  // RARE EARTH METALS
  { code: "RE-ND", name: "Neodymium", unit: "kg", category: "Rare Earths", estimatedPrice: 75.0 },
  { code: "RE-DY", name: "Dysprosium", unit: "kg", category: "Rare Earths", estimatedPrice: 350.0 },
  { code: "RE-LA", name: "Lanthanum", unit: "kg", category: "Rare Earths", estimatedPrice: 5.0 },
  { code: "RE-CE", name: "Cerium", unit: "kg", category: "Rare Earths", estimatedPrice: 4.0 },
  { code: "RE-PR", name: "Praseodymium", unit: "kg", category: "Rare Earths", estimatedPrice: 70.0 },
  { code: "RE-SM", name: "Samarium", unit: "kg", category: "Rare Earths", estimatedPrice: 12.0 },
  { code: "RE-EU", name: "Europium", unit: "kg", category: "Rare Earths", estimatedPrice: 350.0 },
  { code: "RE-GD", name: "Gadolinium", unit: "kg", category: "Rare Earths", estimatedPrice: 45.0 },
  { code: "RE-TB", name: "Terbium", unit: "kg", category: "Rare Earths", estimatedPrice: 900.0 },
  { code: "RE-HO", name: "Holmium", unit: "kg", category: "Rare Earths", estimatedPrice: 95.0 },
  { code: "RE-ER", name: "Erbium", unit: "kg", category: "Rare Earths", estimatedPrice: 80.0 },
  { code: "RE-TM", name: "Thulium", unit: "kg", category: "Rare Earths", estimatedPrice: 950.0 },
  { code: "RE-YB", name: "Ytterbium", unit: "kg", category: "Rare Earths", estimatedPrice: 30.0 },
  { code: "RE-LU", name: "Lutetium", unit: "kg", category: "Rare Earths", estimatedPrice: 850.0 },
  { code: "RE-Y", name: "Yttrium", unit: "kg", category: "Rare Earths", estimatedPrice: 25.0 },
  { code: "RE-SC", name: "Scandium", unit: "kg", category: "Rare Earths", estimatedPrice: 3500.0 },
  
  // BATTERY & ENERGY MATERIALS
  { code: "BAT-LI", name: "Lithium Carbonate", unit: "kg", category: "Battery Materials", estimatedPrice: 15.0 },
  { code: "BAT-CO", name: "Cobalt", unit: "kg", category: "Battery Materials", estimatedPrice: 35.0 },
  { code: "BAT-GRAPH", name: "Graphite", unit: "kg", category: "Battery Materials", estimatedPrice: 1.5 },
  { code: "BAT-MN", name: "Manganese", unit: "kg", category: "Battery Materials", estimatedPrice: 2.5 },
  
  // ADVANCED CERAMICS
  { code: "CER-BN", name: "Boron Nitride", unit: "kg", category: "Advanced Ceramics", estimatedPrice: 45.0 },
  { code: "CER-AIN", name: "Aluminum Nitride", unit: "kg", category: "Advanced Ceramics", estimatedPrice: 55.0 },
  { code: "CER-TIN", name: "Titanium Nitride", unit: "kg", category: "Advanced Ceramics", estimatedPrice: 40.0 },
  { code: "CER-B4C", name: "Boron Carbide", unit: "kg", category: "Advanced Ceramics", estimatedPrice: 65.0 },
  
  // SEMICONDUCTOR MATERIALS
  { code: "SEMI-SI", name: "Silicon Wafer", unit: "piece", category: "Semiconductors", estimatedPrice: 350.0 },
  { code: "SEMI-GAAS", name: "Gallium Arsenide", unit: "kg", category: "Semiconductors", estimatedPrice: 450.0 },
  { code: "SEMI-GAN", name: "Gallium Nitride", unit: "kg", category: "Semiconductors", estimatedPrice: 800.0 },
  { code: "SEMI-GE", name: "Germanium", unit: "kg", category: "Semiconductors", estimatedPrice: 1200.0 },
  { code: "SEMI-TE", name: "Tellurium", unit: "kg", category: "Semiconductors", estimatedPrice: 75.0 },
  
  // CONSTRUCTION MATERIALS
  { code: "CONST-CONC", name: "Concrete Mix", unit: "kg", category: "Construction", estimatedPrice: 0.15 },
  { code: "CONST-REBAR", name: "Steel Rebar", unit: "kg", category: "Construction", estimatedPrice: 0.8 },
  { code: "CONST-GRAVEL", name: "Gravel", unit: "kg", category: "Construction", estimatedPrice: 0.05 },
  { code: "CONST-SAND", name: "Sand", unit: "kg", category: "Construction", estimatedPrice: 0.03 },
  
  // OPTICAL MATERIALS
  { code: "OPT-QUARTZ", name: "Quartz Glass", unit: "kg", category: "Optical", estimatedPrice: 25.0 },
  { code: "OPT-SAPPH", name: "Sapphire", unit: "kg", category: "Optical", estimatedPrice: 450.0 },
  { code: "OPT-FIBER", name: "Optical Fiber", unit: "m", category: "Optical", estimatedPrice: 2.5 },
  
  // MAGNETIC MATERIALS
  { code: "MAG-NDFEB", name: "Neodymium Magnet", unit: "kg", category: "Magnetic", estimatedPrice: 85.0 },
  { code: "MAG-FERRO", name: "Ferrite Magnet", unit: "kg", category: "Magnetic", estimatedPrice: 4.5 },
  { code: "MAG-SMCO", name: "Samarium Cobalt Magnet", unit: "kg", category: "Magnetic", estimatedPrice: 150.0 },
  
  // SPECIALTY ALLOYS
  { code: "ALLOY-INCO", name: "Inconel", unit: "kg", category: "Specialty Alloys", estimatedPrice: 45.0 },
  { code: "ALLOY-HAST", name: "Hastelloy", unit: "kg", category: "Specialty Alloys", estimatedPrice: 55.0 },
  { code: "ALLOY-MONO", name: "Monel", unit: "kg", category: "Specialty Alloys", estimatedPrice: 35.0 },
  { code: "ALLOY-NITI", name: "Nitinol (Shape Memory Alloy)", unit: "kg", category: "Specialty Alloys", estimatedPrice: 250.0 },
];

/**
 * Get material from catalog by code
 */
export function getMaterialByCode(code: string): CatalogMaterial | undefined {
  return MASTER_MATERIALS_CATALOG.find(m => m.code === code);
}

/**
 * Search materials by name or code
 */
export function searchMaterials(query: string): CatalogMaterial[] {
  const lowerQuery = query.toLowerCase();
  return MASTER_MATERIALS_CATALOG.filter(
    m => 
      m.name.toLowerCase().includes(lowerQuery) ||
      m.code.toLowerCase().includes(lowerQuery) ||
      m.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all materials in a category
 */
export function getMaterialsByCategory(category: string): CatalogMaterial[] {
  return MASTER_MATERIALS_CATALOG.filter(m => m.category === category);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(MASTER_MATERIALS_CATALOG.map(m => m.category));
  return Array.from(categories).sort();
}
