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
    // Extract latest values from time series
    const sp500Latest = economicData.financial_circuit?.sp500?.observations?.[0]?.value;
    const gdpLatest = economicData.real_circuit?.real_gdp?.observations?.[0]?.value;
    const industrialProdLatest = economicData.real_circuit?.industrial_production?.observations?.[0]?.value;

    if (!sp500Latest || !gdpLatest || !industrialProdLatest) {
      return null;
    }

    // Simple FDR calculation: (Financial Growth Rate) / (Real Economy Growth Rate)
    // In practice, use more sophisticated calculations with growth rates
    const financialIndex = parseFloat(sp500Latest);
    const realIndex = (parseFloat(gdpLatest) + parseFloat(industrialProdLatest)) / 2;

    const fdr = financialIndex / realIndex;
    return fdr;
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

  // Regime classification based on FDR thresholds (align with existing system)
  if (fdr < 2.0) {
    return "HEALTHY_EXPANSION";
  } else if (fdr >= 2.0 && fdr < 4.0) {
    return "ASSET_LED_GROWTH";
  } else if (fdr >= 4.0 && fdr < 8.0) {
    return "IMBALANCED_EXCESS";
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
