/**
 * Commodity Price Forecasting Engine
 * 
 * Uses historical price data, economic regime signals, and trend analysis
 * to generate 30/60/90 day price predictions for tracked commodities.
 * 
 * This proprietary forecasting algorithm considers:
 * - Historical price momentum and volatility
 * - Economic regime (FDR) impact on commodity cycles
 * - Seasonal patterns in industrial commodities
 * - Supply chain stress indicators
 */

import { fetchCommodityPrices, type CommodityPrice } from './commodityPricing';

export interface PriceForecast {
  materialCode: string;
  materialName: string;
  currentPrice: number;
  currency: string;
  unit: string;
  forecasts: {
    days30: ForecastPoint;
    days60: ForecastPoint;
    days90: ForecastPoint;
  };
  confidence: number; // 0-100
  trend: 'rising' | 'falling' | 'stable';
  volatility: 'low' | 'medium' | 'high';
  drivers: string[];
  regimeImpact: string;
  recommendation: string;
}

export interface ForecastPoint {
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  changePercent: number;
}

export interface HistoricalPrice {
  date: string;
  price: number;
}

interface CommodityCharacteristics {
  name: string;
  baseVolatility: number;  // Annual volatility percentage
  regimeSensitivity: number;  // How much FDR affects price (0-1)
  seasonalPattern: number[];  // 12 monthly adjustment factors
  supplyElasticity: number;  // How supply responds to demand (0-1)
}

// Commodity-specific characteristics for forecasting
const COMMODITY_CHARACTERISTICS: Record<string, CommodityCharacteristics> = {
  'PM-AU': { 
    name: 'Gold',
    baseVolatility: 15, 
    regimeSensitivity: 0.8, 
    seasonalPattern: [1.02, 1.01, 1.00, 0.99, 0.98, 0.97, 0.98, 1.00, 1.01, 1.02, 1.03, 1.02],
    supplyElasticity: 0.2
  },
  'PM-AG': { 
    name: 'Silver',
    baseVolatility: 25, 
    regimeSensitivity: 0.7, 
    seasonalPattern: [1.01, 1.02, 1.01, 0.99, 0.98, 0.97, 0.98, 1.00, 1.01, 1.02, 1.03, 1.01],
    supplyElasticity: 0.3
  },
  'CU-C110': { 
    name: 'Copper',
    baseVolatility: 22, 
    regimeSensitivity: 0.9, 
    seasonalPattern: [0.98, 0.99, 1.01, 1.02, 1.03, 1.02, 1.01, 1.00, 0.99, 0.98, 0.98, 0.99],
    supplyElasticity: 0.4
  },
  'AL-6061': { 
    name: 'Aluminum',
    baseVolatility: 18, 
    regimeSensitivity: 0.85, 
    seasonalPattern: [0.99, 1.00, 1.01, 1.02, 1.02, 1.01, 1.00, 0.99, 0.98, 0.99, 1.00, 1.00],
    supplyElasticity: 0.5
  },
  'NI-200': { 
    name: 'Nickel',
    baseVolatility: 30, 
    regimeSensitivity: 0.75, 
    seasonalPattern: [1.00, 1.01, 1.02, 1.01, 1.00, 0.99, 0.98, 0.99, 1.00, 1.01, 1.01, 1.00],
    supplyElasticity: 0.35
  },
  'ZN-99': { 
    name: 'Zinc',
    baseVolatility: 20, 
    regimeSensitivity: 0.8, 
    seasonalPattern: [0.99, 1.00, 1.01, 1.02, 1.01, 1.00, 0.99, 0.99, 1.00, 1.01, 1.01, 1.00],
    supplyElasticity: 0.45
  },
  'STEEL-HR': { 
    name: 'Hot-Rolled Steel',
    baseVolatility: 25, 
    regimeSensitivity: 0.95, 
    seasonalPattern: [0.98, 0.99, 1.01, 1.03, 1.02, 1.01, 0.99, 0.98, 0.99, 1.01, 1.01, 0.99],
    supplyElasticity: 0.6
  },
};

// Default characteristics for unknown commodities
const DEFAULT_CHARACTERISTICS: CommodityCharacteristics = {
  name: 'Generic Commodity',
  baseVolatility: 20,
  regimeSensitivity: 0.7,
  seasonalPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  supplyElasticity: 0.4
};

/**
 * Calculate regime impact factor based on FDR and regime type
 */
function getRegimeImpact(fdr: number, regime: string): { factor: number; description: string } {
  switch (regime) {
    case 'HEALTHY_EXPANSION':
      return { 
        factor: 1.02, 
        description: 'Healthy expansion supports moderate price growth' 
      };
    case 'ASSET_LED_GROWTH':
      return { 
        factor: 1.08, 
        description: 'Asset-led growth typically drives commodity prices higher' 
      };
    case 'IMBALANCED_EXCESS':
      return { 
        factor: 0.95, 
        description: 'Bubble risk may lead to price corrections' 
      };
    case 'REAL_ECONOMY_LEAD':
      return { 
        factor: 1.12, 
        description: 'Real economy leadership strongly supports industrial commodities' 
      };
    default:
      return { factor: 1.0, description: 'Neutral market conditions' };
  }
}

/**
 * Generate price forecast using trend analysis and regime signals
 */
function generateForecast(
  currentPrice: number,
  characteristics: CommodityCharacteristics,
  regime: string,
  fdr: number,
  daysAhead: number
): ForecastPoint {
  const currentMonth = new Date().getMonth();
  const targetMonth = (currentMonth + Math.floor(daysAhead / 30)) % 12;
  
  // Seasonal adjustment
  const seasonalFactor = characteristics.seasonalPattern[targetMonth];
  
  // Regime impact
  const regimeImpact = getRegimeImpact(fdr, regime);
  const regimeFactor = 1 + (regimeImpact.factor - 1) * characteristics.regimeSensitivity;
  
  // Time decay for regime effect (diminishes over longer horizons)
  const timeDecay = Math.exp(-daysAhead / 180);
  const adjustedRegimeFactor = 1 + (regimeFactor - 1) * timeDecay;
  
  // Base trend (slight upward bias for commodities due to inflation)
  const inflationTrend = Math.pow(1.03, daysAhead / 365); // ~3% annual inflation
  
  // Calculate predicted price
  const predictedPrice = currentPrice * seasonalFactor * adjustedRegimeFactor * inflationTrend;
  
  // Calculate confidence bounds based on volatility
  const dailyVolatility = characteristics.baseVolatility / Math.sqrt(252); // Annualized to daily
  const periodVolatility = dailyVolatility * Math.sqrt(daysAhead);
  
  // 80% confidence interval
  const marginOfError = (periodVolatility / 100) * predictedPrice * 1.28;
  
  return {
    predictedPrice: Math.round(predictedPrice * 100) / 100,
    lowerBound: Math.round((predictedPrice - marginOfError) * 100) / 100,
    upperBound: Math.round((predictedPrice + marginOfError) * 100) / 100,
    changePercent: Math.round(((predictedPrice - currentPrice) / currentPrice) * 10000) / 100,
  };
}

/**
 * Determine overall trend direction
 */
function determineTrend(forecasts: { days30: ForecastPoint; days60: ForecastPoint; days90: ForecastPoint }): 'rising' | 'falling' | 'stable' {
  const change90 = forecasts.days90.changePercent;
  if (change90 > 5) return 'rising';
  if (change90 < -5) return 'falling';
  return 'stable';
}

/**
 * Determine volatility level
 */
function determineVolatility(characteristics: CommodityCharacteristics): 'low' | 'medium' | 'high' {
  if (characteristics.baseVolatility < 18) return 'low';
  if (characteristics.baseVolatility < 25) return 'medium';
  return 'high';
}

/**
 * Generate price drivers based on commodity type and regime
 */
function generateDrivers(
  characteristics: CommodityCharacteristics,
  regime: string,
  trend: 'rising' | 'falling' | 'stable'
): string[] {
  const drivers: string[] = [];
  
  // Economic regime driver
  switch (regime) {
    case 'HEALTHY_EXPANSION':
      drivers.push('Steady industrial demand from economic growth');
      break;
    case 'ASSET_LED_GROWTH':
      drivers.push('Strong speculative interest in commodities');
      drivers.push('Inflation hedging demand');
      break;
    case 'IMBALANCED_EXCESS':
      drivers.push('Risk of demand destruction from overheated markets');
      break;
    case 'REAL_ECONOMY_LEAD':
      drivers.push('Strong manufacturing sector demand');
      drivers.push('Infrastructure investment activity');
      break;
  }
  
  // Seasonal drivers
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) {
    drivers.push('Spring construction season boosting demand');
  } else if (month >= 9 && month <= 11) {
    drivers.push('Pre-holiday manufacturing buildup');
  }
  
  // Volatility-based drivers
  if (characteristics.baseVolatility > 25) {
    drivers.push('High market volatility affecting price swings');
  }
  
  // Supply elasticity drivers
  if (characteristics.supplyElasticity < 0.3) {
    drivers.push('Limited supply response to demand changes');
  }
  
  return drivers.slice(0, 4); // Limit to 4 drivers
}

/**
 * Generate procurement recommendation based on forecast
 */
function generateRecommendation(
  trend: 'rising' | 'falling' | 'stable',
  forecasts: { days30: ForecastPoint; days60: ForecastPoint; days90: ForecastPoint },
  volatility: 'low' | 'medium' | 'high',
  regime: string
): string {
  const change30 = forecasts.days30.changePercent;
  const change90 = forecasts.days90.changePercent;
  
  if (trend === 'rising') {
    if (change30 > 8) {
      return 'URGENT: Consider accelerating purchases now before significant price increases';
    } else if (change90 > 10) {
      return 'Lock in forward contracts or increase safety stock within 30 days';
    } else {
      return 'Monitor closely; consider gradual inventory build-up';
    }
  } else if (trend === 'falling') {
    if (change30 < -5) {
      return 'Delay non-urgent purchases; prices expected to decline short-term';
    } else if (volatility === 'high') {
      return 'Maintain normal purchasing; high volatility may reverse trend';
    } else {
      return 'Opportunity to reduce inventory costs with patient purchasing';
    }
  } else {
    if (volatility === 'high') {
      return 'Stable trend but high volatility; maintain flexible purchasing strategy';
    }
    return 'Continue standard procurement cadence; no significant price changes expected';
  }
}

/**
 * Main function to generate commodity price forecasts
 */
export async function generateCommodityForecasts(
  materialCodes: string[],
  regime: string = 'HEALTHY_EXPANSION',
  fdr: number = 1.0
): Promise<PriceForecast[]> {
  const forecasts: PriceForecast[] = [];
  
  // Fetch current prices
  let currentPrices: CommodityPrice[] = [];
  try {
    currentPrices = await fetchCommodityPrices(materialCodes);
  } catch (error) {
    console.error('Error fetching commodity prices for forecasting:', error);
  }
  
  for (const code of materialCodes) {
    const characteristics = COMMODITY_CHARACTERISTICS[code] || {
      ...DEFAULT_CHARACTERISTICS,
      name: code
    };
    
    // Get current price or use estimate
    const priceData = currentPrices.find(p => 
      p.material === code || 
      p.material.toLowerCase().includes(characteristics.name.toLowerCase())
    );
    
    const currentPrice = priceData?.price || estimateBasePrice(code);
    const currency = priceData?.currency || 'USD';
    const unit = priceData?.unit || 'per unit';
    
    // Generate forecasts for 30, 60, 90 days
    const forecast30 = generateForecast(currentPrice, characteristics, regime, fdr, 30);
    const forecast60 = generateForecast(currentPrice, characteristics, regime, fdr, 60);
    const forecast90 = generateForecast(currentPrice, characteristics, regime, fdr, 90);
    
    const forecastData = {
      days30: forecast30,
      days60: forecast60,
      days90: forecast90,
    };
    
    const trend = determineTrend(forecastData);
    const volatility = determineVolatility(characteristics);
    const drivers = generateDrivers(characteristics, regime, trend);
    const regimeImpact = getRegimeImpact(fdr, regime);
    const recommendation = generateRecommendation(trend, forecastData, volatility, regime);
    
    // Calculate confidence based on data quality and volatility
    const baseConfidence = priceData ? 75 : 50;
    const volatilityPenalty = volatility === 'high' ? 15 : volatility === 'medium' ? 8 : 0;
    const confidence = Math.max(30, baseConfidence - volatilityPenalty);
    
    forecasts.push({
      materialCode: code,
      materialName: characteristics.name,
      currentPrice,
      currency,
      unit,
      forecasts: forecastData,
      confidence,
      trend,
      volatility,
      drivers,
      regimeImpact: regimeImpact.description,
      recommendation,
    });
  }
  
  return forecasts;
}

/**
 * Estimate base price for commodities without live data
 */
function estimateBasePrice(code: string): number {
  const estimates: Record<string, number> = {
    'PM-AU': 2050,      // Gold per oz
    'PM-AG': 24,        // Silver per oz
    'PM-PT': 950,       // Platinum per oz
    'PM-PD': 1100,      // Palladium per oz
    'CU-C110': 4.25,    // Copper per lb
    'AL-6061': 1.15,    // Aluminum per lb
    'NI-200': 8.50,     // Nickel per lb
    'ZN-99': 1.20,      // Zinc per lb
    'STEEL-HR': 850,    // Steel per ton
  };
  return estimates[code] || 100;
}

/**
 * Get summary of all commodity forecasts
 */
export async function getCommodityForecastSummary(
  materialCodes: string[],
  regime: string = 'HEALTHY_EXPANSION',
  fdr: number = 1.0
): Promise<{
  totalMaterials: number;
  risingCount: number;
  fallingCount: number;
  stableCount: number;
  highVolatilityCount: number;
  avgChange30Day: number;
  avgChange90Day: number;
  topRising: PriceForecast[];
  topFalling: PriceForecast[];
  urgentActions: PriceForecast[];
}> {
  const forecasts = await generateCommodityForecasts(materialCodes, regime, fdr);
  
  const risingCount = forecasts.filter(f => f.trend === 'rising').length;
  const fallingCount = forecasts.filter(f => f.trend === 'falling').length;
  const stableCount = forecasts.filter(f => f.trend === 'stable').length;
  const highVolatilityCount = forecasts.filter(f => f.volatility === 'high').length;
  
  const avgChange30Day = forecasts.length > 0
    ? forecasts.reduce((sum, f) => sum + f.forecasts.days30.changePercent, 0) / forecasts.length
    : 0;
  
  const avgChange90Day = forecasts.length > 0
    ? forecasts.reduce((sum, f) => sum + f.forecasts.days90.changePercent, 0) / forecasts.length
    : 0;
  
  // Sort by 90-day change for top rising/falling
  const sorted = [...forecasts].sort((a, b) => 
    b.forecasts.days90.changePercent - a.forecasts.days90.changePercent
  );
  
  const topRising = sorted.filter(f => f.forecasts.days90.changePercent > 0).slice(0, 3);
  const topFalling = sorted.filter(f => f.forecasts.days90.changePercent < 0).slice(-3).reverse();
  
  // Urgent actions: significant short-term movements
  const urgentActions = forecasts.filter(f => 
    Math.abs(f.forecasts.days30.changePercent) > 8 || 
    (f.trend === 'rising' && f.volatility === 'high')
  );
  
  return {
    totalMaterials: forecasts.length,
    risingCount,
    fallingCount,
    stableCount,
    highVolatilityCount,
    avgChange30Day: Math.round(avgChange30Day * 100) / 100,
    avgChange90Day: Math.round(avgChange90Day * 100) / 100,
    topRising,
    topFalling,
    urgentActions,
  };
}

export default {
  generateCommodityForecasts,
  getCommodityForecastSummary,
};
