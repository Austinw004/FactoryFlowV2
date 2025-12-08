import { INDUSTRY_CONFIGS, getIndustryConfig, IndustryConfig } from "@shared/industryConfig";

export interface IndustryRecommendations {
  industry: string;
  config: IndustryConfig;
  dashboardInsights: DashboardInsight[];
  suggestedCommodities: CommoditySuggestion[];
  aiContextHints: string[];
  quickActions: QuickAction[];
}

export interface DashboardInsight {
  id: string;
  title: string;
  description: string;
  type: "kpi" | "risk" | "opportunity" | "tip";
  priority: number;
}

export interface CommoditySuggestion {
  name: string;
  reason: string;
  relevance: "high" | "medium" | "low";
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  action: string;
  priority: number;
}

export function getIndustryRecommendations(
  industry: string | null | undefined,
  companyData?: { 
    hasSkus?: boolean; 
    hasMaterials?: boolean; 
    hasSuppliers?: boolean;
    materialCount?: number;
    supplierCount?: number;
    skuCount?: number;
  }
): IndustryRecommendations {
  const config = getIndustryConfig(industry);
  
  const dashboardInsights = generateDashboardInsights(config, companyData);
  const suggestedCommodities = generateCommoditySuggestions(config);
  const quickActions = generateQuickActions(config, companyData);
  
  return {
    industry: config.industry,
    config,
    dashboardInsights,
    suggestedCommodities,
    aiContextHints: config.aiContextHints,
    quickActions,
  };
}

function generateDashboardInsights(
  config: IndustryConfig,
  companyData?: { hasSkus?: boolean; hasMaterials?: boolean; hasSuppliers?: boolean }
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  
  if (config.typicalKPIs.length > 0) {
    insights.push({
      id: "kpi-focus",
      title: `Key KPIs for ${config.industry}`,
      description: `Focus on tracking: ${config.typicalKPIs.slice(0, 3).join(", ")}`,
      type: "kpi",
      priority: 1,
    });
  }
  
  if (config.riskFactors.length > 0) {
    insights.push({
      id: "risk-awareness",
      title: "Industry Risk Factors",
      description: `Monitor these key risks: ${config.riskFactors.slice(0, 2).join(", ")}`,
      type: "risk",
      priority: 2,
    });
  }
  
  if (config.seasonalPatterns.length > 0) {
    insights.push({
      id: "seasonal-pattern",
      title: "Seasonal Considerations",
      description: config.seasonalPatterns[0],
      type: "tip",
      priority: 3,
    });
  }
  
  if (config.procurementFocus.length > 0) {
    insights.push({
      id: "procurement-focus",
      title: "Procurement Strategy",
      description: `Prioritize: ${config.procurementFocus.slice(0, 2).join(", ")}`,
      type: "opportunity",
      priority: 4,
    });
  }
  
  if (!companyData?.hasSuppliers) {
    insights.push({
      id: "add-suppliers",
      title: "Add Your Suppliers",
      description: "Track supplier performance and manage risk by adding your supplier network",
      type: "tip",
      priority: 5,
    });
  }
  
  if (!companyData?.hasMaterials) {
    insights.push({
      id: "add-materials",
      title: "Set Up Materials Catalog",
      description: "Add your key materials to track costs and monitor commodity prices",
      type: "tip",
      priority: 6,
    });
  }
  
  return insights.sort((a, b) => a.priority - b.priority);
}

function generateCommoditySuggestions(config: IndustryConfig): CommoditySuggestion[] {
  return config.relevantCommodities.map((commodity, index) => ({
    name: commodity,
    reason: `Commonly used in ${config.industry} manufacturing`,
    relevance: index < 3 ? "high" : index < 6 ? "medium" : "low",
  }));
}

function generateQuickActions(
  config: IndustryConfig,
  companyData?: { 
    hasSkus?: boolean; 
    hasMaterials?: boolean; 
    hasSuppliers?: boolean;
    materialCount?: number;
  }
): QuickAction[] {
  const actions: QuickAction[] = [];
  
  if (!companyData?.hasSkus) {
    actions.push({
      id: "create-sku",
      label: "Add Your First Product",
      description: "Start tracking demand for your products",
      action: "create-sku",
      priority: 1,
    });
  }
  
  if (!companyData?.hasMaterials) {
    actions.push({
      id: "create-material",
      label: "Add Key Materials",
      description: `Add materials like ${config.keyMaterials.slice(0, 2).join(", ")}`,
      action: "create-material",
      priority: 2,
    });
  }
  
  if (!companyData?.hasSuppliers) {
    actions.push({
      id: "create-supplier",
      label: "Add Suppliers",
      description: "Track and manage your supplier relationships",
      action: "create-supplier",
      priority: 3,
    });
  }
  
  actions.push({
    id: "setup-watchlist",
    label: "Configure Commodity Watchlist",
    description: `Monitor ${config.relevantCommodities.slice(0, 3).join(", ")} prices`,
    action: "setup-watchlist",
    priority: 4,
  });
  
  actions.push({
    id: "view-regime",
    label: "Check Economic Regime",
    description: "See current market conditions and timing signals",
    action: "view-regime",
    priority: 5,
  });
  
  return actions.sort((a, b) => a.priority - b.priority);
}

export function getAISystemPromptEnhancements(industry: string | null | undefined): string {
  const config = getIndustryConfig(industry);
  
  return `
The user's company operates in the ${config.industry} industry. Keep these context points in mind:

Industry-Specific Context:
${config.aiContextHints.map((hint, i) => `${i + 1}. ${hint}`).join("\n")}

Key Commodities for This Industry: ${config.relevantCommodities.slice(0, 5).join(", ")}

Typical Materials: ${config.keyMaterials.slice(0, 5).join(", ")}

Important KPIs: ${config.typicalKPIs.join(", ")}

Key Risk Factors: ${config.riskFactors.join(", ")}

Procurement Focus Areas: ${config.procurementFocus.join(", ")}

When providing advice, tailor your responses to the specific challenges and opportunities in ${config.industry} manufacturing.
`.trim();
}

export function getOnboardingSuggestions(industry: string | null | undefined): {
  suggestedMaterials: string[];
  suggestedCommodities: string[];
  suggestedKPIs: string[];
  industryTips: string[];
} {
  const config = getIndustryConfig(industry);
  
  return {
    suggestedMaterials: config.keyMaterials.slice(0, 5),
    suggestedCommodities: config.relevantCommodities.slice(0, 7),
    suggestedKPIs: config.typicalKPIs,
    industryTips: config.aiContextHints,
  };
}

export function listAvailableIndustries(): string[] {
  return Object.keys(INDUSTRY_CONFIGS);
}

export interface PreconfigurationResult {
  materialsCreated: number;
  materialCodes: string[];
  industryConfig: IndustryConfig;
}

export function getIndustryMaterialsToCreate(industry: string | null | undefined): Array<{
  name: string;
  code: string;
  description: string;
  category: string;
  unit: string;
}> {
  const config = getIndustryConfig(industry);
  
  const materialsData = config.keyMaterials.slice(0, 5).map((materialName, index) => {
    const normalizedCode = materialName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 12);
    
    return {
      name: materialName,
      code: `${normalizedCode}-${String(index + 1).padStart(3, "0")}`,
      description: `${materialName} for ${config.industry} manufacturing`,
      category: config.industry,
      unit: getMaterialUnit(materialName),
    };
  });
  
  return materialsData;
}

function getMaterialUnit(materialName: string): string {
  const lowerName = materialName.toLowerCase();
  
  if (lowerName.includes("steel") || lowerName.includes("aluminum") || 
      lowerName.includes("copper") || lowerName.includes("metal") ||
      lowerName.includes("titanium") || lowerName.includes("alloy")) {
    return "kg";
  }
  if (lowerName.includes("plastic") || lowerName.includes("resin") || 
      lowerName.includes("polymer") || lowerName.includes("abs") ||
      lowerName.includes("polypropylene")) {
    return "kg";
  }
  if (lowerName.includes("chip") || lowerName.includes("component") ||
      lowerName.includes("pcb") || lowerName.includes("sensor") ||
      lowerName.includes("capacitor") || lowerName.includes("resistor")) {
    return "units";
  }
  if (lowerName.includes("fabric") || lowerName.includes("textile") ||
      lowerName.includes("cotton") || lowerName.includes("nylon")) {
    return "meters";
  }
  if (lowerName.includes("chemical") || lowerName.includes("solvent") ||
      lowerName.includes("adhesive") || lowerName.includes("catalyst")) {
    return "liters";
  }
  if (lowerName.includes("glass") || lowerName.includes("ceramic")) {
    return "sq m";
  }
  
  return "units";
}

export async function preconfigurePlatformForIndustry(
  companyId: string,
  industry: string | null | undefined,
  storage: any
): Promise<PreconfigurationResult> {
  const config = getIndustryConfig(industry);
  const materialsToCreate = getIndustryMaterialsToCreate(industry);
  
  const createdMaterialCodes: string[] = [];
  
  // Get existing materials to avoid duplicates
  const existingMaterials = await storage.getMaterials(companyId);
  const existingCodes = new Set(existingMaterials.map((m: any) => m.code));
  
  for (const materialData of materialsToCreate) {
    try {
      if (!existingCodes.has(materialData.code)) {
        await storage.createMaterial({
          ...materialData,
          companyId,
          onHand: 0,
          onOrder: 0,
          reorderPoint: 100,
          leadTime: 14,
        });
        createdMaterialCodes.push(materialData.code);
        console.log(`[Onboarding] Created material ${materialData.code} for company ${companyId}`);
      }
    } catch (error) {
      console.error(`[Onboarding] Failed to create material ${materialData.code}:`, error);
    }
  }
  
  console.log(`[Onboarding] Pre-configured ${createdMaterialCodes.length} materials for ${config.industry} industry`);
  
  return {
    materialsCreated: createdMaterialCodes.length,
    materialCodes: createdMaterialCodes,
    industryConfig: config,
  };
}
