/**
 * External API Integrations for Manufacturing Intelligence
 * Continuously gathers economic indicators, market data, and industry metrics
 * Aligns with dual-circuit economic theory (FDR-based regime analysis)
 */

import axios from "axios";

// ========================================
// ECONOMIC INDICATORS APIs
// ========================================

/**
 * FRED (Federal Reserve Economic Data)
 * 800K+ economic time series - FREE, UNLIMITED
 */
export async function fetchFREDData(seriesId: string, apiKey?: string): Promise<any> {
  const key = apiKey || process.env.FRED_API_KEY || "demo_key";
  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations`,
      {
        params: {
          series_id: seriesId,
          api_key: key,
          file_type: "json",
          limit: 100,
          sort_order: "desc",
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(`FRED API error for ${seriesId}:`, error.message);
    return null;
  }
}

/**
 * Alpha Vantage - Economic Indicators + Market Sentiment
 * 25 requests/day FREE
 */
export async function fetchAlphaVantageEconomic(
  indicator: string,
  apiKey?: string
): Promise<any> {
  const key = apiKey || process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;
  
  try {
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: indicator, // REAL_GDP, UNEMPLOYMENT, CPI, etc.
        apikey: key,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error(`Alpha Vantage error for ${indicator}:`, error.message);
    return null;
  }
}

/**
 * Alpha Vantage - Market News & Sentiment Analysis
 */
export async function fetchAlphaVantageSentiment(
  tickers?: string,
  topics?: string,
  apiKey?: string
): Promise<any> {
  const key = apiKey || process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;
  
  try {
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "NEWS_SENTIMENT",
        tickers,
        topics, // e.g., "technology", "manufacturing", "economy_macro"
        apikey: key,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error("Alpha Vantage Sentiment error:", error.message);
    return null;
  }
}

/**
 * World Bank API - Global Development Indicators
 * UNLIMITED, NO AUTH REQUIRED
 */
export async function fetchWorldBankData(
  indicator: string,
  country: string = "USA"
): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}`,
      {
        params: {
          format: "json",
          per_page: 50,
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(`World Bank error for ${indicator}:`, error.message);
    return null;
  }
}

/**
 * DBnomics - Aggregated Economic Data from 82 providers
 * UNLIMITED, NO AUTH
 */
export async function fetchDBnomicsData(
  provider: string,
  dataset: string,
  series: string
): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.db.nomics.world/v22/series/${provider}/${dataset}/${series}`,
      {
        params: {
          observations: 1,
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(`DBnomics error for ${provider}/${dataset}/${series}:`, error.message);
    return null;
  }
}

/**
 * Trading Economics - 196 Countries, 300+ Indicators
 * LIMITED FREE TIER
 */
export async function fetchTradingEconomicsData(
  country: string,
  indicator: string,
  apiKey?: string
): Promise<any> {
  const key = apiKey || process.env.TRADING_ECONOMICS_API_KEY;
  if (!key) return null;
  
  try {
    const response = await axios.get(
      `https://api.tradingeconomics.com/country/${country}/${indicator}`,
      {
        params: {
          c: key,
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(`Trading Economics error for ${country}/${indicator}:`, error.message);
    return null;
  }
}

/**
 * News API - News Aggregation for Sentiment Analysis
 * 100 requests/day FREE
 */
export async function fetchNewsData(
  query: string,
  apiKey?: string
): Promise<any> {
  const key = apiKey || process.env.NEWS_API_KEY;
  if (!key) return null;
  
  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: query,
        apiKey: key,
        sortBy: "publishedAt",
        pageSize: 20,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error(`News API error for "${query}":`, error.message);
    return null;
  }
}

// ========================================
// DATA AGGREGATION FUNCTIONS
// ========================================

/**
 * Fetch comprehensive economic indicators for dual-circuit analysis
 */
export async function fetchComprehensiveEconomicData(): Promise<any> {
  console.log("📊 Fetching comprehensive economic data...");
  
  const results: any = {
    timestamp: new Date().toISOString(),
    financial_circuit: {},
    real_circuit: {},
    manufacturing: {},
    sentiment: {},
  };

  // FINANCIAL CIRCUIT INDICATORS
  try {
    // Stock market indices (S&P 500)
    const sp500 = await fetchFREDData("SP500");
    results.financial_circuit.sp500 = sp500;

    // 10-Year Treasury Yield
    const treasury10y = await fetchFREDData("DGS10");
    results.financial_circuit.treasury_10y = treasury10y;

    // Federal Funds Rate
    const fedFunds = await fetchFREDData("FEDFUNDS");
    results.financial_circuit.fed_funds_rate = fedFunds;

    // Total Credit to Private Non-Financial Sector
    const privateCredit = await fetchFREDData("QUSPAMUSDA");
    results.financial_circuit.private_credit = privateCredit;
  } catch (error) {
    console.error("Error fetching financial circuit data:", error);
  }

  // REAL ECONOMY CIRCUIT INDICATORS
  try {
    // Real GDP
    const gdp = await fetchFREDData("GDPC1");
    results.real_circuit.real_gdp = gdp;

    // Industrial Production Index
    const industrialProd = await fetchFREDData("INDPRO");
    results.real_circuit.industrial_production = industrialProd;

    // Manufacturing Capacity Utilization
    const capacityUtil = await fetchFREDData("MCUMFN");
    results.real_circuit.capacity_utilization = capacityUtil;

    // Unemployment Rate
    const unemployment = await fetchFREDData("UNRATE");
    results.real_circuit.unemployment = unemployment;

    // Consumer Price Index
    const cpi = await fetchFREDData("CPIAUCSL");
    results.real_circuit.cpi = cpi;
  } catch (error) {
    console.error("Error fetching real circuit data:", error);
  }

  // MANUFACTURING SPECIFIC INDICATORS
  try {
    // ISM Manufacturing PMI
    const ismPMI = await fetchFREDData("MANEMP");
    results.manufacturing.ism_pmi = ismPMI;

    // Manufacturers New Orders
    const newOrders = await fetchFREDData("AMTMNO");
    results.manufacturing.new_orders = newOrders;

    // Manufacturing Employment
    const mfgEmployment = await fetchFREDData("MANEMP");
    results.manufacturing.employment = mfgEmployment;

    // Durable Goods Orders
    const durableGoods = await fetchFREDData("DGORDER");
    results.manufacturing.durable_goods = durableGoods;
  } catch (error) {
    console.error("Error fetching manufacturing data:", error);
  }

  // MARKET SENTIMENT (if API key available)
  try {
    const sentiment = await fetchAlphaVantageSentiment(
      undefined,
      "manufacturing,economy_macro,industrial"
    );
    results.sentiment.news = sentiment;
  } catch (error) {
    console.error("Error fetching sentiment data:", error);
  }

  return results;
}

/**
 * Calculate Financial-to-Real Divergence (FDR) from external data
 * Aligns with dual-circuit economic theory
 */
export function calculateFDRFromExternalData(economicData: any): number | null {
  try {
    // Extract latest and previous values from time series for growth calculation
    const sp500Obs = economicData.financial_circuit?.sp500?.observations || [];
    const gdpObs = economicData.real_circuit?.real_gdp?.observations || [];
    const indProdObs = economicData.real_circuit?.industrial_production?.observations || [];

    if (sp500Obs.length < 2 || gdpObs.length < 2 || indProdObs.length < 2) {
      return null;
    }

    // Calculate growth rates for dual-circuit FDR formula
    // Financial Circuit: S&P 500 growth as proxy for asset market activity (Ma * Va)
    const sp500Current = parseFloat(sp500Obs[0].value);
    const sp500Previous = parseFloat(sp500Obs[1].value);
    const sp500Growth = sp500Previous > 0 ? (sp500Current - sp500Previous) / sp500Previous : 0.02;
    
    // Real Circuit: GDP + Industrial Production growth as proxy for real economy (Mr * Vr)
    const gdpCurrent = parseFloat(gdpObs[0].value);
    const gdpPrevious = parseFloat(gdpObs[1].value);
    const gdpGrowth = gdpPrevious > 0 ? (gdpCurrent - gdpPrevious) / gdpPrevious : 0.02;
    
    const indProdCurrent = parseFloat(indProdObs[0].value);
    const indProdPrevious = parseFloat(indProdObs[1].value);
    const indProdGrowth = indProdPrevious > 0 ? (indProdCurrent - indProdPrevious) / indProdPrevious : 0.02;
    
    // FDR = (Asset Market Growth) / (Real Economy Growth)
    const financialGrowth = sp500Growth;
    const realGrowth = (gdpGrowth + indProdGrowth) / 2;
    
    // Calculate FDR with safeguards - prevent division by zero or extreme values
    // Return neutral FDR=1.0 for near-zero or negative real growth
    if (realGrowth <= 0.0001) {
      return 1.0;
    }
    
    const fdr = financialGrowth / realGrowth;
    
    // Clamp to reasonable range [0.2, 5.0] as per dual-circuit theory
    // This ensures FDR stays within interpretable bounds for regime classification
    return Math.max(0.2, Math.min(5.0, fdr));
  } catch (error) {
    console.error("Error calculating FDR:", error);
    return null;
  }
}

/**
 * Determine economic regime from external data
 */
export function determineEconomicRegimeFromData(economicData: any): string {
  const fdr = calculateFDRFromExternalData(economicData);
  
  if (fdr === null) {
    return "UNKNOWN";
  }

  // Regime classification based on FDR thresholds (aligned with dual-circuit theory)
  // FDR = Financial Growth / Real Growth ratio
  if (fdr >= 1.5) {
    return "IMBALANCED_EXCESS";
  } else if (fdr >= 1.0) {
    return "ASSET_LED_GROWTH";
  } else if (fdr >= 0.5) {
    return "HEALTHY_EXPANSION";
  } else {
    return "REAL_ECONOMY_LEAD";
  }
}

/**
 * Extract manufacturing insights from external data
 */
export function extractManufacturingInsights(economicData: any): any {
  return {
    pmi: economicData.manufacturing?.ism_pmi?.observations?.[0]?.value || null,
    newOrders: economicData.manufacturing?.new_orders?.observations?.[0]?.value || null,
    employment: economicData.manufacturing?.employment?.observations?.[0]?.value || null,
    durableGoods: economicData.manufacturing?.durable_goods?.observations?.[0]?.value || null,
    capacityUtilization: economicData.real_circuit?.capacity_utilization?.observations?.[0]?.value || null,
  };
}
