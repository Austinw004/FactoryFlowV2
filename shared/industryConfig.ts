export interface IndustryConfig {
  industry: string;
  relevantCommodities: string[];
  keyMaterials: string[];
  typicalKPIs: string[];
  riskFactors: string[];
  seasonalPatterns: string[];
  procurementFocus: string[];
  aiContextHints: string[];
}

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  "Aerospace & Defense": {
    industry: "Aerospace & Defense",
    relevantCommodities: ["Aluminum", "Titanium", "Steel", "Nickel", "Copper", "Rare Earth Elements", "Carbon Fiber"],
    keyMaterials: ["Titanium alloys", "Aluminum sheet", "High-strength steel", "Composites", "Avionics components"],
    typicalKPIs: ["First-pass yield", "On-time delivery", "Supplier quality rating", "Cycle time", "Inventory turns"],
    riskFactors: ["Defense contract changes", "Export regulations", "Long lead times", "Supplier concentration"],
    seasonalPatterns: ["Government fiscal year (Oct-Sept)", "Defense budget cycles"],
    procurementFocus: ["Long-term contracts", "Dual sourcing for critical components", "Mil-spec compliance"],
    aiContextHints: [
      "Focus on quality certifications (AS9100, NADCAP)",
      "Long production cycles typical (18-36 months)",
      "Emphasis on traceability and documentation",
      "ITAR/EAR compliance considerations"
    ]
  },
  "Automotive": {
    industry: "Automotive",
    relevantCommodities: ["Steel", "Aluminum", "Rubber", "Platinum", "Palladium", "Copper", "Lithium", "Cobalt"],
    keyMaterials: ["Steel coils", "Aluminum castings", "Rubber compounds", "Plastics", "Electronic components", "Batteries"],
    typicalKPIs: ["OEE", "PPM defects", "Line efficiency", "Inventory days", "Supplier on-time delivery"],
    riskFactors: ["Chip shortages", "Raw material volatility", "Consumer demand shifts", "EV transition"],
    seasonalPatterns: ["Model year changeovers", "Summer shutdowns", "Holiday production adjustments"],
    procurementFocus: ["JIT delivery", "Volume pricing", "Tier 1 supplier management", "EV battery materials"],
    aiContextHints: [
      "Tight JIT schedules require 99%+ supplier reliability",
      "Platform-based manufacturing (shared components)",
      "EV transition creating new material requirements",
      "Focus on semiconductor and battery supply security"
    ]
  },
  "Chemicals": {
    industry: "Chemicals",
    relevantCommodities: ["Natural Gas", "Crude Oil", "Ethylene", "Propylene", "Benzene", "Methanol", "Ammonia"],
    keyMaterials: ["Petrochemical feedstocks", "Catalysts", "Specialty chemicals", "Industrial gases"],
    typicalKPIs: ["Yield rate", "Energy efficiency", "Batch cycle time", "Waste reduction", "Capacity utilization"],
    riskFactors: ["Energy price volatility", "Environmental regulations", "Feedstock availability", "Safety incidents"],
    seasonalPatterns: ["Agricultural chemical demand (spring)", "Construction season (summer)"],
    procurementFocus: ["Energy hedging", "Feedstock contracts", "Catalyst management", "Safety compliance"],
    aiContextHints: [
      "Continuous process manufacturing with high capital intensity",
      "Energy costs often 40-60% of production cost",
      "Strict environmental and safety regulations",
      "Bulk commodity purchasing with hedging strategies"
    ]
  },
  "Consumer Goods": {
    industry: "Consumer Goods",
    relevantCommodities: ["Aluminum", "Steel", "Plastics", "Paper/Pulp", "Cotton", "Sugar", "Palm Oil"],
    keyMaterials: ["Packaging materials", "Raw ingredients", "Plastics", "Metals for packaging"],
    typicalKPIs: ["Fill rate", "Inventory turns", "SKU proliferation", "Promotional effectiveness", "OTIF"],
    riskFactors: ["Consumer preference shifts", "Retailer demands", "Commodity price swings", "Packaging regulations"],
    seasonalPatterns: ["Holiday peaks (Q4)", "Back-to-school (Aug-Sept)", "Promotional cycles"],
    procurementFocus: ["Packaging optimization", "Private label sourcing", "Promotional inventory", "Sustainability"],
    aiContextHints: [
      "High SKU counts with frequent new product launches",
      "Retailer-driven demand forecasting critical",
      "Promotional lift modeling important",
      "Sustainability and packaging reduction focus"
    ]
  },
  "Electronics": {
    industry: "Electronics",
    relevantCommodities: ["Copper", "Gold", "Silver", "Palladium", "Rare Earth Elements", "Silicon", "Tin"],
    keyMaterials: ["Semiconductors", "PCBs", "Displays", "Connectors", "Passive components", "Batteries"],
    typicalKPIs: ["First-pass yield", "Test coverage", "Component obsolescence", "Lead time", "Quality PPM"],
    riskFactors: ["Chip shortages", "Component obsolescence", "Tariffs", "Rapid technology changes"],
    seasonalPatterns: ["Consumer electronics holiday (Q4)", "New product launch cycles", "Back-to-school"],
    procurementFocus: ["Component availability", "Obsolescence management", "Last-time buys", "Alternative sourcing"],
    aiContextHints: [
      "Component lead times highly variable (weeks to months)",
      "Design-for-supply-chain critical",
      "Active component lifecycle management needed",
      "Frequent BOM changes and new product introductions"
    ]
  },
  "Food & Beverage": {
    industry: "Food & Beverage",
    relevantCommodities: ["Wheat", "Corn", "Sugar", "Coffee", "Cocoa", "Palm Oil", "Soybean", "Dairy"],
    keyMaterials: ["Agricultural commodities", "Packaging", "Ingredients", "Flavors", "Preservatives"],
    typicalKPIs: ["Yield rate", "Food safety incidents", "Shelf life", "Waste percentage", "Fill rate"],
    riskFactors: ["Crop failures", "Weather", "Food safety recalls", "Consumer health trends", "Regulation changes"],
    seasonalPatterns: ["Harvest cycles", "Holiday demand spikes", "Summer beverage peaks"],
    procurementFocus: ["Commodity hedging", "Supplier food safety audits", "Freshness requirements", "Traceability"],
    aiContextHints: [
      "Perishability drives inventory and logistics decisions",
      "Commodity hedging critical for margin protection",
      "Strict food safety (FSMA, GFSI) requirements",
      "Clean label and health trends driving reformulation"
    ]
  },
  "Industrial Equipment": {
    industry: "Industrial Equipment",
    relevantCommodities: ["Steel", "Aluminum", "Copper", "Zinc", "Iron Ore", "Nickel"],
    keyMaterials: ["Steel plates", "Castings", "Motors", "Bearings", "Hydraulics", "Electronics"],
    typicalKPIs: ["On-time delivery", "Quote-to-order ratio", "Warranty claims", "Capacity utilization", "Backlog"],
    riskFactors: ["Economic cycles", "Capital spending cuts", "Long lead times", "Skilled labor shortage"],
    seasonalPatterns: ["Capital budgeting cycles", "Trade show timing", "End of fiscal year orders"],
    procurementFocus: ["Long-lead components", "Castings and forgings", "Motor and drive systems", "Configured products"],
    aiContextHints: [
      "Engineer-to-order or configure-to-order common",
      "Long production cycles (weeks to months)",
      "Aftermarket/spare parts business significant",
      "Heavy industry economic cycles impact demand"
    ]
  },
  "Medical Devices": {
    industry: "Medical Devices",
    relevantCommodities: ["Titanium", "Stainless Steel", "Platinum", "Cobalt", "Plastics", "Silicone"],
    keyMaterials: ["Biocompatible metals", "Medical-grade plastics", "Electronics", "Sensors", "Sterile packaging"],
    typicalKPIs: ["First-pass yield", "Complaint rate", "Regulatory submission time", "Sterilization yield", "Lot traceability"],
    riskFactors: ["FDA regulations", "Reimbursement changes", "Hospital consolidation", "Supplier qualification"],
    seasonalPatterns: ["Hospital budget cycles (Q4)", "Surgical procedure seasonality"],
    procurementFocus: ["Validated suppliers", "Material traceability", "Sterilization services", "Packaging validation"],
    aiContextHints: [
      "Strict FDA 21 CFR Part 820 compliance required",
      "Supplier validation and qualification critical",
      "Change control processes extensive",
      "UDI and traceability requirements"
    ]
  },
  "Metals & Mining": {
    industry: "Metals & Mining",
    relevantCommodities: ["Iron Ore", "Copper", "Gold", "Silver", "Zinc", "Nickel", "Coal", "Aluminum"],
    keyMaterials: ["Mining equipment", "Chemicals (flotation)", "Energy", "Explosives", "Wear parts"],
    typicalKPIs: ["Recovery rate", "Cost per ton", "Equipment availability", "Safety incidents", "Grade control"],
    riskFactors: ["Commodity price cycles", "Environmental regulations", "Political/country risk", "Energy costs"],
    seasonalPatterns: ["Weather-dependent operations", "Commodity price cycles"],
    procurementFocus: ["Equipment maintenance", "Energy contracts", "Consumables optimization", "Capital equipment"],
    aiContextHints: [
      "Highly capital-intensive with long project timelines",
      "Commodity price volatility drives profitability",
      "Environmental and safety regulations critical",
      "Remote location logistics challenges"
    ]
  },
  "Pharmaceuticals": {
    industry: "Pharmaceuticals",
    relevantCommodities: ["Specialty Chemicals", "Solvents", "Catalysts", "Packaging Materials"],
    keyMaterials: ["APIs (Active Pharmaceutical Ingredients)", "Excipients", "Packaging", "Vials", "Syringes"],
    typicalKPIs: ["Batch yield", "Right-first-time", "Deviation rate", "Release time", "Inventory accuracy"],
    riskFactors: ["API supplier concentration", "Regulatory inspections", "Patent cliffs", "Cold chain logistics"],
    seasonalPatterns: ["Flu season (vaccines)", "Allergy season"],
    procurementFocus: ["API dual sourcing", "Validated suppliers", "Cold chain", "Packaging security"],
    aiContextHints: [
      "cGMP compliance drives all operations",
      "Validated supplier base with change control",
      "Serialization and track-and-trace required",
      "Long regulatory approval cycles"
    ]
  },
  "Plastics & Rubber": {
    industry: "Plastics & Rubber",
    relevantCommodities: ["Crude Oil", "Natural Gas", "Ethylene", "Propylene", "Styrene", "Rubber"],
    keyMaterials: ["Polymer resins", "Additives", "Colorants", "Molds and tooling"],
    typicalKPIs: ["Scrap rate", "Machine utilization", "Cycle time", "Color consistency", "Mold changeover time"],
    riskFactors: ["Resin price volatility", "Oil price dependency", "Sustainability pressure", "Recycling mandates"],
    seasonalPatterns: ["Automotive production schedules", "Construction season"],
    procurementFocus: ["Resin contracts", "Colorant consistency", "Recycled content sourcing", "Mold maintenance"],
    aiContextHints: [
      "Resin prices closely tied to oil/gas markets",
      "Increasing focus on recycled content and sustainability",
      "Custom molding requires close customer collaboration",
      "Color matching and consistency critical for quality"
    ]
  },
  "Semiconductors": {
    industry: "Semiconductors",
    relevantCommodities: ["Silicon", "Gold", "Copper", "Rare Earth Elements", "Specialty Gases", "Chemicals"],
    keyMaterials: ["Silicon wafers", "Photoresists", "Specialty gases", "Chemicals", "Lead frames"],
    typicalKPIs: ["Die yield", "Wafer throughput", "Defect density", "Cycle time", "Equipment uptime"],
    riskFactors: ["Technology obsolescence", "Fab capacity", "Geopolitical tensions", "IP protection"],
    seasonalPatterns: ["Consumer electronics cycles", "Data center build-outs"],
    procurementFocus: ["Wafer supply agreements", "Equipment maintenance", "Ultra-pure materials", "IP protection"],
    aiContextHints: [
      "Extremely high capital intensity ($10B+ fabs)",
      "Long production cycles (12+ weeks wafer to ship)",
      "Ultra-clean manufacturing environment required",
      "Technology node transitions drive capex cycles"
    ]
  },
  "Textiles": {
    industry: "Textiles",
    relevantCommodities: ["Cotton", "Wool", "Polyester", "Nylon", "Dyes", "Chemicals"],
    keyMaterials: ["Natural fibers", "Synthetic yarns", "Dyes and chemicals", "Finishing agents"],
    typicalKPIs: ["Yield rate", "Color consistency", "Defect rate", "Lead time", "Sustainability metrics"],
    riskFactors: ["Cotton price volatility", "Fast fashion trends", "Labor practices scrutiny", "Water usage"],
    seasonalPatterns: ["Fashion seasons (Spring/Fall)", "Holiday retail preparation"],
    procurementFocus: ["Fiber sourcing", "Sustainable materials", "Dye and chemical management", "Labor compliance"],
    aiContextHints: [
      "Fast fashion drives short lead times",
      "Sustainability and ethical sourcing increasingly important",
      "Water and chemical usage under scrutiny",
      "Complex global supply chains typical"
    ]
  },
  "Other Manufacturing": {
    industry: "Other Manufacturing",
    relevantCommodities: ["Steel", "Aluminum", "Copper", "Plastics", "Energy"],
    keyMaterials: ["Raw materials", "Components", "Packaging", "Consumables"],
    typicalKPIs: ["OEE", "On-time delivery", "Quality rate", "Inventory turns", "Lead time"],
    riskFactors: ["Supply chain disruptions", "Economic cycles", "Raw material costs", "Labor availability"],
    seasonalPatterns: ["Economic cycles", "Customer demand patterns"],
    procurementFocus: ["Supplier diversification", "Cost optimization", "Quality management", "Delivery reliability"],
    aiContextHints: [
      "Focus on operational efficiency and quality",
      "Supplier relationship management important",
      "Continuous improvement methodologies",
      "Cost competitiveness critical"
    ]
  }
};

export function getIndustryConfig(industry: string | null | undefined): IndustryConfig {
  if (!industry) {
    return INDUSTRY_CONFIGS["Other Manufacturing"];
  }
  return INDUSTRY_CONFIGS[industry] || INDUSTRY_CONFIGS["Other Manufacturing"];
}

export function getRelevantCommoditiesForIndustry(industry: string | null | undefined): string[] {
  return getIndustryConfig(industry).relevantCommodities;
}

export function getAIContextForIndustry(industry: string | null | undefined): string[] {
  return getIndustryConfig(industry).aiContextHints;
}
