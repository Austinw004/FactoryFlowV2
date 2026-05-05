import { storage as globalStorage } from '../storage';
import type { IStorage } from '../storage';
import crypto from 'crypto';

export interface BenchmarkData {
  myPerformance: number;
  industryMedian: number;
  industryP25: number;
  industryP75: number;
  percentileRank: number; // 0-100
  gap: number; // How far from median
}

export interface AnonymizedData {
  anonymousId: string;
  aggregatedData: any;
  privacyPreserved: boolean;
}

export class IndustryConsortiumEngine {
  constructor(private storage: IStorage) {}

  /**
   * Anonymize company data for consortium contribution
   */
  anonymizeCompanyData(companyId: string, data: any): string {
    // Create one-way hash of company ID - cannot be reversed
    return crypto.createHash('sha256').update(companyId + process.env.SESSION_SECRET).digest('hex');
  }

  /**
   * Calculate benchmarks comparing company to industry peers
   */
  async calculateBenchmarks(
    myMetrics: {
      oee?: number;
      procurementSavings?: number;
      turnover?: number;
    },
    regime: string,
    industrySector?: string
  ): Promise<{
    oee?: BenchmarkData;
    procurementSavings?: BenchmarkData;
    turnover?: BenchmarkData;
  }> {
    const metrics = await this.storage.getConsortiumMetrics(regime, { industrySector });
    
    if (metrics.length === 0) {
      return {}; // No benchmark data available
    }

    const latestMetrics = metrics[0]; // Most recent
    const benchmarks: any = {};

    if (myMetrics.oee !== undefined && latestMetrics.medianOEE) {
      benchmarks.oee = {
        myPerformance: myMetrics.oee,
        industryMedian: latestMetrics.medianOEE,
        industryP25: latestMetrics.p25OEE || latestMetrics.medianOEE,
        industryP75: latestMetrics.p75OEE || latestMetrics.medianOEE,
        percentileRank: this.calculatePercentile(
          myMetrics.oee,
          latestMetrics.p25OEE || 0,
          latestMetrics.medianOEE,
          latestMetrics.p75OEE || 100
        ),
        gap: myMetrics.oee - latestMetrics.medianOEE,
      };
    }

    if (myMetrics.procurementSavings !== undefined && latestMetrics.avgProcurementSavings) {
      benchmarks.procurementSavings = {
        myPerformance: myMetrics.procurementSavings,
        industryMedian: latestMetrics.avgProcurementSavings,
        industryP25: latestMetrics.avgProcurementSavings * 0.7, // Estimated
        industryP75: latestMetrics.avgProcurementSavings * 1.3, // Estimated
        percentileRank: this.calculatePercentile(
          myMetrics.procurementSavings,
          latestMetrics.avgProcurementSavings * 0.7,
          latestMetrics.avgProcurementSavings,
          latestMetrics.avgProcurementSavings * 1.3
        ),
        gap: myMetrics.procurementSavings - latestMetrics.avgProcurementSavings,
      };
    }

    if (myMetrics.turnover !== undefined && latestMetrics.medianTurnover) {
      benchmarks.turnover = {
        myPerformance: myMetrics.turnover,
        industryMedian: latestMetrics.medianTurnover,
        industryP25: latestMetrics.p25Turnover || latestMetrics.medianTurnover,
        industryP75: latestMetrics.p75Turnover || latestMetrics.medianTurnover,
        percentileRank: this.calculatePercentile(
          myMetrics.turnover,
          latestMetrics.p75Turnover || 0,
          latestMetrics.medianTurnover,
          latestMetrics.p25Turnover || 100,
          true // Lower is better for turnover
        ),
        gap: myMetrics.turnover - latestMetrics.medianTurnover,
      };
    }

    return benchmarks;
  }

  /**
   * Calculate percentile rank (0-100)
   */
  private calculatePercentile(
    value: number,
    p25: number,
    median: number,
    p75: number,
    lowerIsBetter = false
  ): number {
    let percentile: number;

    if (value <= p25) {
      percentile = 25 * (value / p25);
    } else if (value <= median) {
      percentile = 25 + 25 * ((value - p25) / (median - p25));
    } else if (value <= p75) {
      percentile = 50 + 25 * ((value - median) / (p75 - median));
    } else {
      percentile = 75 + 25 * Math.min(1, (value - p75) / (p75 - median));
    }

    // Invert if lower is better (e.g., turnover)
    return lowerIsBetter ? 100 - percentile : percentile;
  }

  /**
   * Detect early warning signals from consortium data
   */
  async detectEarlyWarnings(
    currentRegime: string,
    industrySector?: string
  ): Promise<Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    peerAction: string;
    confidence: number;
  }>> {
    const warnings: Array<any> = [];

    // Get recent contributions
    const contributions = await this.storage.getConsortiumContributions({
      industrySector,
      regime: currentRegime,
    });

    if (contributions.length < 10) {
      return warnings; // Not enough data
    }

    // Analyze procurement behavior
    const recentSavings = contributions.slice(0, 20).map(c => c.avgProcurementSavings).filter(s => s !== null);
    if (recentSavings.length > 0) {
      const avgSavings = recentSavings.reduce((a, b) => a + (b || 0), 0) / recentSavings.length;
      
      if (avgSavings > 10) {
        warnings.push({
          type: 'procurement_opportunity',
          severity: 'info' as const,
          message: `Peers achieving ${avgSavings.toFixed(1)}% procurement savings in current regime`,
          peerAction: 'Aggressive negotiation and counter-cyclical buying',
          confidence: 75,
        });
      }
    }

    // Analyze OEE trends
    const recentOEE = contributions.slice(0, 20).map(c => c.avgOEE).filter(o => o !== null);
    if (recentOEE.length > 0) {
      const avgOEE = recentOEE.reduce((a, b) => a + (b || 0), 0) / recentOEE.length;
      
      if (avgOEE < 70) {
        warnings.push({
          type: 'performance_decline',
          severity: 'warning' as const,
          message: `Industry OEE declining to ${avgOEE.toFixed(1)}% - production challenges ahead`,
          peerAction: 'Increasing maintenance budgets and training',
          confidence: 80,
        });
      }
    }

    return warnings;
  }

  /**
   * Generate aggregated metrics from contributions (run periodically)
   */
  async aggregateMetrics(regime: string, industrySector?: string): Promise<void> {
    const contributions = await this.storage.getConsortiumContributions({
      regime,
      industrySector,
    });

    if (contributions.length < 5) {
      return; // Not enough data to aggregate
    }

    const oeeValues = contributions.map(c => c.avgOEE).filter(v => v !== null) as number[];
    const procurementSavings = contributions.map(c => c.avgProcurementSavings).filter(v => v !== null) as number[];
    const turnoverValues = contributions.map(c => c.avgTurnover).filter(v => v !== null) as number[];

    const metrics = {
      metricDate: new Date(),
      industrySector,
      companySize: null,
      region: null,
      regime,
      contributorCount: contributions.length,
      medianOEE: this.median(oeeValues),
      p25OEE: this.percentile(oeeValues, 25),
      p75OEE: this.percentile(oeeValues, 75),
      avgProcurementSavings: this.avg(procurementSavings),
      medianTurnover: this.median(turnoverValues),
      p25Turnover: this.percentile(turnoverValues, 25),
      p75Turnover: this.percentile(turnoverValues, 75),
      topDecileProcurementSavings: this.percentile(procurementSavings, 90),
      topDecileOEE: this.percentile(oeeValues, 90),
      topDecileTurnover: this.percentile(turnoverValues, 10), // Lower is better
      medianCommodityPrice: null,
      p25CommodityPrice: null,
      p75CommodityPrice: null,
    };

    await this.storage.createConsortiumMetrics(metrics);
  }

  private median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private percentile(values: number[], p: number): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private avg(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const metrics = await this.storage.getConsortiumMetrics('expansion', {});
      console.log('[IndustryConsortium] Connection test successful');
      return { success: true, message: `Industry consortium connected with ${metrics.length} metrics available` };
    } catch (error: any) {
      console.error('[IndustryConsortium] Connection test failed:', error.message);
      return { success: false, message: error.message };
    }
  }

  async syncBenchmarkDataAsDemandSignals(companyId: string, regime: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const metrics = await this.storage.getConsortiumMetrics(regime, {});
      
      for (const metric of metrics.slice(0, 10)) {
        try {
          await globalStorage.createDemandSignal({
            companyId,
            signalType: 'benchmark_data',
            signalDate: new Date(),
            quantity: metric.contributorCount || 1,
            unit: 'contributors',
            channel: 'industry_consortium',
            confidence: Math.min(100, (metric.contributorCount || 1) * 10),
            priority: 'low',
            attributes: {
              source: 'industry_consortium',
              regime: metric.regime,
              industrySector: metric.industrySector,
              medianOEE: metric.medianOEE,
              avgProcurementSavings: metric.avgProcurementSavings,
              medianTurnover: metric.medianTurnover
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Metric ${metric.id}: ${err.message}`);
        }
      }

      console.log(`[IndustryConsortium] Synced ${synced} benchmark metrics as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[IndustryConsortium] Benchmark sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
