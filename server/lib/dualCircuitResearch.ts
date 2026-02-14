/**
 * Dual-Circuit Economic Research & Validation System
 * 
 * This module implements the theoretical framework from "Strategic Integration of Dual Money Flows"
 * paper to validate the Augmented Dual-Circuit Model through historical backtesting from 2000 AD onwards.
 * 
 * Core Concepts from Paper:
 * - Real Economy Circuit: Mr*Vr = Pr*Y (money for GDP transactions)
 * - Asset Market Circuit: Ma*Va = Pa*A (money for financial assets)
 * - Financial Decoupling Ratio (FDR) = (Ma Growth * Va) / (Mr Growth * Vr)
 * - Four economic regimes based on FDR thresholds
 * 
 * This is a RESEARCH VALIDATION SYSTEM - not user-facing functionality.
 */

import axios from 'axios';
import { classifyRegimeFromFDR } from './regimeConstants';

// ============================================================================
// TYPES & INTERFACES (Based on Paper Section 2)
// ============================================================================

export type EconomicRegime = 
  | 'HEALTHY_EXPANSION'      // FDR < 1.2: Balanced growth
  | 'ASSET_LED_GROWTH'       // 1.2 ≤ FDR < 1.8: Asset prices rising faster
  | 'IMBALANCED_EXCESS'      // 1.8 ≤ FDR < 2.5: Bubble conditions
  | 'REAL_ECONOMY_LEAD';     // FDR ≥ 2.5: Counter-cyclical opportunity

export interface DualCircuitState {
  // Real Economy Circuit
  mr: number;           // Money allocated to real transactions
  vr: number;           // Velocity of real transaction money
  pr: number;           // Price level of goods/services
  y: number;            // Real output (GDP)
  
  // Asset Market Circuit
  ma: number;           // Money allocated to asset transactions
  va: number;           // Velocity of asset transaction money
  pa: number;           // Price level of existing assets
  a: number;            // Quantity of asset transactions
  
  // Growth rates (year-over-year)
  mrGrowth: number;     // Real economy money growth
  maGrowth: number;     // Asset market money growth
  
  // Key metric
  fdr: number;          // Financial Decoupling Ratio
  regime: EconomicRegime;
}

export interface HistoricalDataPoint {
  date: Date;
  
  // Real Economy Indicators (Paper Section 3, Table 1)
  gdpReal: number;              // Real GDP (Y)
  gdpNominal: number;           // Nominal GDP (Pr * Y)
  cpi: number;                  // Consumer Price Index (Pr)
  m2: number;                   // M2 money supply (proxy for Mr)
  businessCredit: number;       // Business loans (productive credit)
  
  // Asset Market Indicators
  sp500: number;                // Stock market index (Pa proxy)
  housingPriceIndex: number;    // Case-Shiller home prices (Pa asset)
  mortgageDebt: number;         // Mortgage credit (asset financing)
  marginDebt: number;           // Stock margin loans (asset financing)
  
  // Calculated values
  state: DualCircuitState;
}

export interface PricePrediction {
  predictionDate: Date;
  targetDate: Date;
  horizonDays: number;
  
  commodity: string;
  currentPrice: number;
  predictedPrice: number;
  predictedDirection: 'up' | 'down' | 'stable';
  confidence: number;
  
  // Economic context
  fdr: number;
  regime: EconomicRegime;
  reasoning: string;
}

export interface RegimePrediction {
  predictionDate: Date;
  targetDate: Date;
  
  currentRegime: EconomicRegime;
  predictedRegime: EconomicRegime;
  currentFDR: number;
  predictedFDR: number;
  
  confidenc: number;
  trendingDirection: 'stable' | 'rising_fdr' | 'falling_fdr';
  bubbleRisk: number; // 0-1 scale
  recessionRisk: number; // 0-1 scale
}

// ============================================================================
// FDR CALCULATION ENGINE (Paper Section 2.3)
// ============================================================================

export class DualCircuitEngine {
  
  /**
   * Calculate Financial Decoupling Ratio (FDR)
   * 
   * From paper: "The most critical metric for predicting regime change is the 
   * Financial Decoupling Ratio (FDR): FDR = (Growth in Ma × Va) / (Growth in Mr × Vr)"
   * 
   * High FDR indicates money flowing disproportionately into asset markets
   * relative to the real economy, signaling potential bubble conditions.
   */
  static calculateFDR(
    mrGrowth: number,    // Real economy money growth rate
    maGrowth: number,    // Asset market money growth rate
    vr: number,          // Real economy velocity
    va: number           // Asset market velocity
  ): number {
    // Prevent division by zero
    const denominator = mrGrowth * vr;
    if (denominator === 0 || mrGrowth <= 0) {
      return 1.0; // Neutral FDR when real economy isn't growing
    }
    
    const numerator = maGrowth * va;
    const fdr = numerator / denominator;
    
    // Clamp to reasonable range [0.1, 10.0]
    return Math.max(0.1, Math.min(10.0, fdr));
  }
  
  /**
   * Determine economic regime based on FDR thresholds
   * 
   * Paper Section 4.1: "Four distinct economic regimes emerge from this framework"
   */
  static determineRegime(fdr: number): EconomicRegime {
    return classifyRegimeFromFDR(fdr) as EconomicRegime;
  }
  
  /**
   * Calculate velocity from money supply and transactions
   * V = (P * T) / M
   */
  static calculateVelocity(
    priceLevel: number,
    transactions: number,
    moneySupply: number
  ): number {
    if (moneySupply === 0) return 1.0;
    return (priceLevel * transactions) / moneySupply;
  }
  
  /**
   * Construct dual-circuit state from raw economic indicators
   * 
   * This maps real-world data to the theoretical framework
   */
  static constructDualCircuitState(data: HistoricalDataPoint): DualCircuitState {
    // Real Economy: Mr is approximated by M2 money supply
    // Vr calculated from GDP and M2
    const mr = data.m2;
    const vr = this.calculateVelocity(data.cpi, data.gdpReal, data.m2);
    
    // Asset Market: Ma is mortgage + margin debt (asset financing)
    // Va calculated from asset prices and asset money
    const ma = data.mortgageDebt + data.marginDebt;
    const assetTransactionValue = data.sp500 * 1000 + data.housingPriceIndex * 1000; // Scaled proxy
    const va = ma > 0 ? assetTransactionValue / ma : 1.0;
    
    // Growth rates (year-over-year) - would be calculated from previous period
    const mrGrowth = 0.03; // Placeholder - actual implementation uses historical comparison
    const maGrowth = 0.08; // Placeholder
    
    const fdr = this.calculateFDR(mrGrowth, maGrowth, vr, va);
    const regime = this.determineRegime(fdr);
    
    return {
      mr,
      vr,
      pr: data.cpi,
      y: data.gdpReal,
      ma,
      va,
      pa: data.sp500, // Using S&P 500 as asset price proxy
      a: assetTransactionValue,
      mrGrowth,
      maGrowth,
      fdr,
      regime
    };
  }
}

// ============================================================================
// HISTORICAL DATA FETCHER (FREE TIER APIs)
// ============================================================================

export class HistoricalDataFetcher {
  private fredApiKey: string;
  private alphaVantageKey: string;
  
  constructor(fredKey?: string, avKey?: string) {
    // FRED is unlimited free tier
    this.fredApiKey = fredKey || process.env.FRED_API_KEY || '';
    // Alpha Vantage has 25 requests/day limit
    this.alphaVantageKey = avKey || process.env.ALPHA_VANTAGE_API_KEY || '';
  }
  
  /**
   * Fetch historical GDP data from FRED
   * Series ID: GDP (Nominal), GDPC1 (Real)
   */
  async fetchGDP(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await axios.get('https://api.stlouisfed.org/fred/series/observations', {
        params: {
          series_id: 'GDP',
          api_key: this.fredApiKey,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate
        },
        timeout: 10000
      });
      
      return response.data.observations || [];
    } catch (error) {
      console.error('[Historical Data] Failed to fetch GDP:', error);
      return [];
    }
  }
  
  /**
   * Fetch M2 Money Supply from FRED
   * Series ID: M2SL (M2 Money Stock)
   */
  async fetchM2(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await axios.get('https://api.stlouisfed.org/fred/series/observations', {
        params: {
          series_id: 'M2SL',
          api_key: this.fredApiKey,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate
        },
        timeout: 10000
      });
      
      return response.data.observations || [];
    } catch (error) {
      console.error('[Historical Data] Failed to fetch M2:', error);
      return [];
    }
  }
  
  /**
   * Fetch S&P 500 historical data
   */
  async fetchSP500(startDate: string, endDate: string): Promise<any[]> {
    try {
      // Using Alpha Vantage TIME_SERIES_MONTHLY for historical stock data
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'TIME_SERIES_MONTHLY',
          symbol: 'SPY', // S&P 500 ETF as proxy
          apikey: this.alphaVantageKey,
          datatype: 'json'
        },
        timeout: 10000
      });
      
      return response.data['Monthly Time Series'] || [];
    } catch (error) {
      console.error('[Historical Data] Failed to fetch S&P 500:', error);
      return [];
    }
  }
  
  /**
   * Fetch CPI (Consumer Price Index) from FRED
   * Series ID: CPIAUCSL
   */
  async fetchCPI(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await axios.get('https://api.stlouisfed.org/fred/series/observations', {
        params: {
          series_id: 'CPIAUCSL',
          api_key: this.fredApiKey,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate
        },
        timeout: 10000
      });
      
      return response.data.observations || [];
    } catch (error) {
      console.error('[Historical Data] Failed to fetch CPI:', error);
      return [];
    }
  }
  
  /**
   * Construct complete historical dataset from 2000 onwards
   * This is the foundation for all backtesting
   */
  async buildHistoricalDataset(
    startYear: number = 2000,
    endYear: number = new Date().getFullYear()
  ): Promise<HistoricalDataPoint[]> {
    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;
    
    console.log(`[Research] Building historical dataset: ${startDate} to ${endDate}`);
    
    // Fetch all data series in parallel
    const [gdpData, m2Data, sp500Data, cpiData] = await Promise.all([
      this.fetchGDP(startDate, endDate),
      this.fetchM2(startDate, endDate),
      this.fetchSP500(startDate, endDate),
      this.fetchCPI(startDate, endDate)
    ]);
    
    // Transform and merge data points
    // This is simplified - production version would properly align time series
    const dataset: HistoricalDataPoint[] = [];
    
    // For now, return empty dataset - full implementation requires data alignment logic
    console.log(`[Research] Fetched ${gdpData.length} GDP points, ${m2Data.length} M2 points`);
    
    return dataset;
  }
}

// ============================================================================
// BACKTESTING ENGINE (Paper Validation)
// ============================================================================

export class BacktestingEngine {
  
  /**
   * Simulate making a prediction at a historical point in time
   * 
   * This is the core of the research validation - we "time travel" to 
   * a historical date, use only data available at that time, make a
   * prediction, then compare to what actually happened.
   */
  static async simulatePredictionAtDate(
    predictionDate: Date,
    horizonDays: number,
    historicalData: HistoricalDataPoint[]
  ): Promise<PricePrediction | null> {
    // Filter data to only include what was available at prediction date
    const availableData = historicalData.filter(d => d.date <= predictionDate);
    
    if (availableData.length < 12) {
      return null; // Need at least 12 months of history
    }
    
    // Get current state at prediction date
    const currentState = availableData[availableData.length - 1].state;
    const targetDate = new Date(predictionDate);
    targetDate.setDate(targetDate.getDate() + horizonDays);
    
    // Make prediction based on regime and FDR trend
    // This implements the paper's counter-cyclical procurement strategy
    const prediction = this.makePredictionFromState(
      currentState,
      predictionDate,
      targetDate,
      'Aluminum' // Example commodity
    );
    
    return prediction;
  }
  
  /**
   * Generate price prediction based on dual-circuit state
   * 
   * Paper Section 5: "Strategic Implications for Manufacturing"
   * - High FDR (bubble conditions): Expect price corrections downward
   * - Low FDR (real economy lead): Expect price increases as demand grows
   */
  private static makePredictionFromState(
    state: DualCircuitState,
    predictionDate: Date,
    targetDate: Date,
    commodity: string
  ): PricePrediction {
    const currentPrice = 100; // Placeholder
    let predictedPrice = currentPrice;
    let direction: 'up' | 'down' | 'stable' = 'stable';
    let reasoning = '';
    
    // Apply regime-specific prediction logic from paper
    switch (state.regime) {
      case 'HEALTHY_EXPANSION':
        // Balanced growth - prices follow fundamentals
        predictedPrice = currentPrice * 1.02; // Modest increase
        direction = 'up';
        reasoning = 'Balanced growth regime: Real economy and asset markets aligned';
        break;
        
      case 'ASSET_LED_GROWTH':
        // Asset bubble forming - commodity prices may inflate
        predictedPrice = currentPrice * 1.05;
        direction = 'up';
        reasoning = 'Asset-led growth: Wealth effects driving commodity demand';
        break;
        
      case 'IMBALANCED_EXCESS':
        // Bubble conditions - expect correction
        predictedPrice = currentPrice * 0.92;
        direction = 'down';
        reasoning = 'Bubble conditions (FDR > 1.8): Expect price corrections';
        break;
        
      case 'REAL_ECONOMY_LEAD':
        // Counter-cyclical opportunity - buy low
        predictedPrice = currentPrice * 1.10;
        direction = 'up';
        reasoning = 'Real economy lead: Counter-cyclical buying opportunity';
        break;
    }
    
    const horizonDays = Math.round((targetDate.getTime() - predictionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      predictionDate,
      targetDate,
      horizonDays,
      commodity,
      currentPrice,
      predictedPrice,
      predictedDirection: direction,
      confidence: 0.75,
      fdr: state.fdr,
      regime: state.regime,
      reasoning
    };
  }
  
  /**
   * Calculate accuracy metrics for a set of predictions
   * 
   * Returns MAPE (Mean Absolute Percentage Error) and directional accuracy
   */
  static calculateAccuracyMetrics(predictions: any[]): {
    mape: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
    sampleSize: number;
  } {
    if (predictions.length === 0) {
      return { mape: 0, directionalAccuracy: 0, regimeAccuracy: 0, sampleSize: 0 };
    }
    
    let totalPercentageError = 0;
    let correctDirections = 0;
    let correctRegimes = 0;
    
    for (const pred of predictions) {
      if (pred.actualValue && pred.predictedValue) {
        const error = Math.abs((pred.predictedValue - pred.actualValue) / pred.actualValue);
        totalPercentageError += error;
      }
      
      if (pred.directionalAccuracy === 1) {
        correctDirections++;
      }
      
      if (pred.regimeAccuracy === 1) {
        correctRegimes++;
      }
    }
    
    return {
      mape: (totalPercentageError / predictions.length) * 100,
      directionalAccuracy: (correctDirections / predictions.length) * 100,
      regimeAccuracy: (correctRegimes / predictions.length) * 100,
      sampleSize: predictions.length
    };
  }
}
