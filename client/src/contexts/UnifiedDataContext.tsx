import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface RegimeData {
  regime: string;
  fdr: number;
  transitionProbability: number;
  procurementSignal: string;
}

interface InventoryMetrics {
  totalSkus: number;
  lowStockCount: number;
  averageStockLevel: number;
  totalValue: number;
}

interface SupplierMetrics {
  totalSuppliers: number;
  atRiskCount: number;
  preferredCount: number;
}

interface CommodityMetrics {
  tracked: number;
  rising: number;
  falling: number;
  stable: number;
}

interface ForecastMetrics {
  averageMape: number;
  modelsRetrained: number;
  skusCovered: number;
}

interface UnifiedData {
  regime: RegimeData | null;
  inventory: InventoryMetrics;
  suppliers: SupplierMetrics;
  commodities: CommodityMetrics;
  forecasts: ForecastMetrics;
  isLoading: boolean;
  lastUpdated: Date | null;
}

const defaultData: UnifiedData = {
  regime: null,
  inventory: { totalSkus: 0, lowStockCount: 0, averageStockLevel: 0, totalValue: 0 },
  suppliers: { totalSuppliers: 0, atRiskCount: 0, preferredCount: 0 },
  commodities: { tracked: 0, rising: 0, falling: 0, stable: 0 },
  forecasts: { averageMape: 0, modelsRetrained: 0, skusCovered: 0 },
  isLoading: true,
  lastUpdated: null,
};

const UnifiedDataContext = createContext<UnifiedData>(defaultData);

export function UnifiedDataProvider({ children }: { children: React.ReactNode }) {
  const { data: regimeData, isLoading: regimeLoading } = useQuery<any>({
    queryKey: ['/api/economic-snapshot'],
    refetchInterval: 60000,
  });

  const { data: skusData, isLoading: skusLoading } = useQuery<any[]>({
    queryKey: ['/api/skus'],
    refetchInterval: 120000,
  });

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    refetchInterval: 120000,
  });

  const { data: commoditiesData, isLoading: commoditiesLoading } = useQuery<any[]>({
    queryKey: ['/api/commodities/prices'],
    refetchInterval: 300000,
  });

  const { data: forecastsData, isLoading: forecastsLoading } = useQuery<any>({
    queryKey: ['/api/forecast-accuracy/summary'],
    refetchInterval: 300000,
  });

  const unifiedData = useMemo<UnifiedData>(() => {
    const isLoading = regimeLoading || skusLoading || suppliersLoading || commoditiesLoading || forecastsLoading;
    
    const skus = skusData || [];
    const suppliers = suppliersData || [];
    const commodities = commoditiesData || [];
    
    const lowStockSkus = skus.filter((s: any) => {
      const current = Number(s.currentStock) || 0;
      const safety = Number(s.safetyStock) || 0;
      return current <= safety * 1.2;
    });
    
    const atRiskSuppliers = suppliers.filter((s: any) => {
      const riskScore = Number(s.riskScore) || 0;
      return riskScore > 60;
    });
    
    const preferredSuppliers = suppliers.filter((s: any) => s.status === 'preferred');
    
    const risingCommodities = commodities.filter((c: any) => {
      const change = Number(c.priceChange24h) || 0;
      return change > 2;
    });
    
    const fallingCommodities = commodities.filter((c: any) => {
      const change = Number(c.priceChange24h) || 0;
      return change < -2;
    });

    return {
      regime: regimeData ? {
        regime: regimeData.regime || 'UNKNOWN',
        fdr: regimeData.fdr || 0,
        transitionProbability: regimeData.transitionProbability || 0,
        procurementSignal: regimeData.procurementSignal || 'HOLD',
      } : null,
      inventory: {
        totalSkus: skus.length,
        lowStockCount: lowStockSkus.length,
        averageStockLevel: skus.length > 0 
          ? skus.reduce((sum: number, s: any) => sum + (Number(s.currentStock) || 0), 0) / skus.length 
          : 0,
        totalValue: skus.reduce((sum: number, s: any) => sum + ((Number(s.currentStock) || 0) * (Number(s.unitCost) || 0)), 0),
      },
      suppliers: {
        totalSuppliers: suppliers.length,
        atRiskCount: atRiskSuppliers.length,
        preferredCount: preferredSuppliers.length,
      },
      commodities: {
        tracked: commodities.length,
        rising: risingCommodities.length,
        falling: fallingCommodities.length,
        stable: commodities.length - risingCommodities.length - fallingCommodities.length,
      },
      forecasts: {
        averageMape: forecastsData?.averageMape || 0,
        modelsRetrained: forecastsData?.retrainedCount || 0,
        skusCovered: forecastsData?.skusCovered || 0,
      },
      isLoading,
      lastUpdated: new Date(),
    };
  }, [regimeData, skusData, suppliersData, commoditiesData, forecastsData, 
      regimeLoading, skusLoading, suppliersLoading, commoditiesLoading, forecastsLoading]);

  return (
    <UnifiedDataContext.Provider value={unifiedData}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

export function useUnifiedData() {
  return useContext(UnifiedDataContext);
}

export function formatRegimeForDisplay(regime: string): string {
  if (!regime) return 'Unknown';
  return regime
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getRegimeColor(regime: string): string {
  const normalized = regime?.toUpperCase() || '';
  if (normalized.includes('EXPANSION') || normalized.includes('GROWTH')) {
    return 'text-green-600 dark:text-green-400';
  }
  if (normalized.includes('CONTRACTION') || normalized.includes('RECESSION')) {
    return 'text-red-600 dark:text-red-400';
  }
  if (normalized.includes('TRANSITION') || normalized.includes('IMBALANCED')) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  return 'text-muted-foreground';
}

export function getProcurementSignalColor(signal: string): string {
  const normalized = signal?.toUpperCase() || '';
  if (normalized === 'BUY' || normalized === 'ACCELERATE') {
    return 'text-green-600 dark:text-green-400';
  }
  if (normalized === 'HOLD' || normalized === 'CAUTION') {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  if (normalized === 'DEFER' || normalized === 'REDUCE') {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-muted-foreground';
}
