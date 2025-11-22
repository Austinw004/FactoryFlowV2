import axios from 'axios';

/**
 * Real Historical Data Integration
 * Fetches actual economic data from FRED and Alpha Vantage APIs
 * to support legitimate historical backtesting validation.
 * 
 * IMPORTANT: This is for PRIVATE SaaS company use only.
 * Do NOT publish research results or validation data publicly.
 */

interface FREDSeriesData {
  date: string;
  value: string;
}

interface FREDResponse {
  observations: FREDSeriesData[];
}

interface AlphaVantageTimeSeriesData {
  [date: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}

interface HistoricalDataPoint {
  date: Date;
  m2MoneySupply: number;
  gdp: number;
  industrialProduction: number;
  unemployment: number;
  sp500: number;
  commodityPrices: {
    copper: number;
    aluminum: number;
    steel: number;
  };
}

export class RealHistoricalDataFetcher {
  private fredApiKey: string;
  private alphaVantageApiKey: string;
  private baseUrlFRED = 'https://api.stlouisfed.org/fred/series/observations';
  private baseUrlAlphaVantage = 'https://www.alphavantage.co/query';

  constructor() {
    this.fredApiKey = process.env.FRED_API_KEY || '';
    this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY || '';

    if (!this.fredApiKey || !this.alphaVantageApiKey) {
      throw new Error('Missing required API keys: FRED_API_KEY and/or ALPHA_VANTAGE_API_KEY');
    }
  }

  /**
   * Fetch FRED economic indicator data
   */
  private async fetchFREDSeries(
    seriesId: string,
    startDate: string,
    endDate: string
  ): Promise<FREDSeriesData[]> {
    try {
      console.log(`[RealHistoricalData] Fetching FRED series: ${seriesId} (${startDate} to ${endDate})`);
      
      const response = await axios.get<FREDResponse>(this.baseUrlFRED, {
        params: {
          series_id: seriesId,
          api_key: this.fredApiKey,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate,
          sort_order: 'asc',
        },
        timeout: 30000,
      });

      if (!response.data.observations || response.data.observations.length === 0) {
        console.warn(`[RealHistoricalData] No observations returned for ${seriesId}`);
        return [];
      }

      console.log(`[RealHistoricalData] ✓ Fetched ${response.data.observations.length} observations for ${seriesId}`);
      return response.data.observations;
    } catch (error: any) {
      console.error(`[RealHistoricalData] ✗ Error fetching FRED series ${seriesId}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw new Error(`Failed to fetch ${seriesId} from FRED API: ${error.message}`);
    }
  }

  /**
   * Fetch Alpha Vantage market data
   */
  private async fetchAlphaVantageTimeSeries(
    symbol: string,
    outputSize: 'compact' | 'full' = 'full'
  ): Promise<AlphaVantageTimeSeriesData> {
    try {
      console.log(`[RealHistoricalData] Fetching Alpha Vantage data for: ${symbol}`);
      
      // Rate limit: 25 requests/day for free tier
      await this.delay(1000); // 1 second delay between calls

      const response = await axios.get(this.baseUrlAlphaVantage, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol,
          apikey: this.alphaVantageApiKey,
          outputsize: outputSize,
        },
        timeout: 30000,
      });

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        console.error(`[RealHistoricalData] ✗ No time series in response for ${symbol}:`, response.data);
        throw new Error(`No time series data for ${symbol}`);
      }

      const dateCount = Object.keys(timeSeries).length;
      console.log(`[RealHistoricalData] ✓ Fetched ${dateCount} daily data points for ${symbol}`);
      return timeSeries;
    } catch (error: any) {
      console.error(`[RealHistoricalData] ✗ Error fetching Alpha Vantage data for ${symbol}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to fetch ${symbol} from Alpha Vantage API: ${error.message}`);
    }
  }

  /**
   * Simple delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch comprehensive historical data for 2015-2023
   * Returns monthly data points with all required economic indicators
   */
  async fetchHistoricalData(
    startYear: number = 2015,
    endYear: number = 2023
  ): Promise<HistoricalDataPoint[]> {
    console.log(`[RealHistoricalData] Fetching data for ${startYear}-${endYear}...`);

    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;

    try {
      // Fetch economic indicators from FRED (parallel)
      const [m2Data, gdpData, indProdData, unempData] = await Promise.all([
        this.fetchFREDSeries('M2SL', startDate, endDate),         // M2 Money Supply
        this.fetchFREDSeries('GDP', startDate, endDate),          // GDP
        this.fetchFREDSeries('INDPRO', startDate, endDate),       // Industrial Production
        this.fetchFREDSeries('UNRATE', startDate, endDate),       // Unemployment Rate
      ]);

      console.log(`[RealHistoricalData] Fetched ${m2Data.length} M2 observations`);
      console.log(`[RealHistoricalData] Fetched ${gdpData.length} GDP observations`);
      console.log(`[RealHistoricalData] Fetched ${indProdData.length} Industrial Production observations`);
      console.log(`[RealHistoricalData] Fetched ${unempData.length} Unemployment observations`);

      // Fetch market data from Alpha Vantage
      console.log('[RealHistoricalData] Fetching S&P 500 data from Alpha Vantage...');
      const sp500Data = await this.fetchAlphaVantageTimeSeries('SPY');

      // For commodity prices, we'll use a simplified approach with Copper ETF (CPER)
      // In production, you'd fetch actual commodity futures data
      console.log('[RealHistoricalData] Fetching commodity proxy data...');
      const copperData = await this.fetchAlphaVantageTimeSeries('CPER');

      // Combine data by month
      const dataByMonth = new Map<string, Partial<HistoricalDataPoint>>();

      // Process M2 (monthly data)
      m2Data.forEach(obs => {
        if (obs.value !== '.') {
          const monthKey = obs.date.substring(0, 7); // YYYY-MM
          if (!dataByMonth.has(monthKey)) {
            dataByMonth.set(monthKey, { date: new Date(obs.date) });
          }
          dataByMonth.get(monthKey)!.m2MoneySupply = parseFloat(obs.value);
        }
      });

      // Process GDP (quarterly data - fill months)
      gdpData.forEach(obs => {
        if (obs.value !== '.') {
          const monthKey = obs.date.substring(0, 7);
          const gdpValue = parseFloat(obs.value);
          
          // Fill all months in this quarter with GDP value
          const date = new Date(obs.date);
          const quarter = Math.floor(date.getMonth() / 3);
          const year = date.getFullYear();
          
          for (let m = 0; m < 3; m++) {
            const month = quarter * 3 + m;
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (dataByMonth.has(key)) {
              dataByMonth.get(key)!.gdp = gdpValue;
            }
          }
        }
      });

      // Process Industrial Production (monthly data)
      indProdData.forEach(obs => {
        if (obs.value !== '.') {
          const monthKey = obs.date.substring(0, 7);
          if (dataByMonth.has(monthKey)) {
            dataByMonth.get(monthKey)!.industrialProduction = parseFloat(obs.value);
          }
        }
      });

      // Process Unemployment (monthly data)
      unempData.forEach(obs => {
        if (obs.value !== '.') {
          const monthKey = obs.date.substring(0, 7);
          if (dataByMonth.has(monthKey)) {
            dataByMonth.get(monthKey)!.unemployment = parseFloat(obs.value);
          }
        }
      });

      // Process S&P 500 (daily data - take month-end close)
      Object.entries(sp500Data).forEach(([date, values]) => {
        const monthKey = date.substring(0, 7);
        if (dataByMonth.has(monthKey)) {
          const closePrice = parseFloat(values['4. close']);
          
          // Update if this is a later date in the month (closer to month-end)
          const existing = dataByMonth.get(monthKey)!.sp500;
          if (!existing || date > (dataByMonth.get(monthKey)!.date?.toISOString().substring(0, 10) || '')) {
            dataByMonth.get(monthKey)!.sp500 = closePrice;
          }
        }
      });

      // Process Copper proxy (daily data - take month-end close)
      Object.entries(copperData).forEach(([date, values]) => {
        const monthKey = date.substring(0, 7);
        if (dataByMonth.has(monthKey)) {
          const closePrice = parseFloat(values['4. close']);
          
          if (!dataByMonth.get(monthKey)!.commodityPrices) {
            dataByMonth.get(monthKey)!.commodityPrices = {
              copper: closePrice,
              aluminum: closePrice * 0.85, // Approximation
              steel: closePrice * 0.60,    // Approximation
            };
          }
        }
      });

      // Convert to array and filter out incomplete data points
      const historicalData: HistoricalDataPoint[] = [];
      
      dataByMonth.forEach((data, monthKey) => {
        if (
          data.m2MoneySupply &&
          data.gdp &&
          data.industrialProduction &&
          data.unemployment !== undefined &&
          data.sp500 &&
          data.commodityPrices
        ) {
          historicalData.push(data as HistoricalDataPoint);
        }
      });

      // Sort by date
      historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());

      console.log(`[RealHistoricalData] Compiled ${historicalData.length} complete monthly data points`);

      return historicalData;

    } catch (error: any) {
      console.error('[RealHistoricalData] Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Calculate FDR (Financial-to-Real Divergence) from historical data
   * FDR = (Ma * Va) / (Mr * Vr)
   * where Ma = money supply, Va = asset velocity (proxy: S&P 500 turnover)
   *       Mr = real economy money, Vr = real velocity (proxy: industrial production)
   */
  calculateFDR(dataPoint: HistoricalDataPoint): number {
    // Financial circuit: M2 * normalized S&P 500 price
    const Ma = dataPoint.m2MoneySupply / 1000; // Normalize (billions)
    const Va = dataPoint.sp500 / 100; // Normalize

    // Real circuit: GDP * normalized industrial production
    const Mr = dataPoint.gdp / 1000; // Normalize (billions)
    const Vr = dataPoint.industrialProduction / 100; // Normalize

    const fdr = (Ma * Va) / (Mr * Vr);
    return fdr;
  }

  /**
   * Determine economic regime based on FDR and other indicators
   */
  determineRegime(fdr: number, dataPoint: HistoricalDataPoint): string {
    const unemploymentLow = dataPoint.unemployment < 5.0;
    const industrialProductionGrowing = true; // Would need to compare to previous month

    if (fdr < 1.1 && unemploymentLow) {
      return 'Healthy Expansion';
    } else if (fdr >= 1.1 && fdr < 1.3) {
      return 'Asset-Led Growth';
    } else if (fdr >= 1.3 && fdr < 1.5) {
      return 'Imbalanced Excess';
    } else {
      return 'Real Economy Lead';
    }
  }
}
