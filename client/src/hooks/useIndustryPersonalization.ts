import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

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

export interface IndustryRecommendations {
  industry: string;
  config: IndustryConfig;
  dashboardInsights: DashboardInsight[];
  suggestedCommodities: CommoditySuggestion[];
  aiContextHints: string[];
  quickActions: QuickAction[];
  companyName?: string;
  companySize?: string;
}

export function useIndustryPersonalization() {
  const { user } = useAuth();
  
  const { data, isLoading, error, refetch } = useQuery<IndustryRecommendations>({
    queryKey: ["/api/company/industry-recommendations"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  return {
    recommendations: data,
    industry: data?.industry || "Other Manufacturing",
    config: data?.config,
    dashboardInsights: data?.dashboardInsights || [],
    suggestedCommodities: data?.suggestedCommodities || [],
    aiContextHints: data?.aiContextHints || [],
    quickActions: data?.quickActions || [],
    companyName: data?.companyName,
    companySize: data?.companySize,
    isLoading,
    error,
    refetch,
  };
}

export function useHighRelevanceCommodities() {
  const { suggestedCommodities } = useIndustryPersonalization();
  return suggestedCommodities.filter(c => c.relevance === "high");
}

export function useDashboardInsights() {
  const { dashboardInsights } = useIndustryPersonalization();
  return dashboardInsights;
}

export function useAIContextHints() {
  const { aiContextHints, industry, config } = useIndustryPersonalization();
  return { aiContextHints, industry, config };
}
