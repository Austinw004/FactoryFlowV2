/**
 * Comprehensive Research Validation Test
 * 
 * Runs 10,000+ predictions to rigorously validate the dual-circuit economic theory
 * Generates detailed accuracy metrics broken down by:
 * - Economic regime (Healthy Expansion, Asset-Led Growth, etc.)
 * - Time period (2000s, 2010s, 2020s)
 * - FDR level (low, medium, high, extreme)
 * - Prediction accuracy types (MAPE, directional, regime)
 */

import { db } from '../db';
import { historicalPredictions, predictionAccuracyMetrics } from '../../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface ComprehensiveTestResults {
  totalPredictions: number;
  dataLocation: {
    predictionsTable: string;
    metricsTable: string;
    snapshotsTable: string;
  };
  overallMetrics: {
    meanAbsolutePercentageError: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
  };
  byRegime: {
    regime: string;
    predictions: number;
    mape: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
  }[];
  byTimePeriod: {
    period: string;
    predictions: number;
    mape: number;
    directionalAccuracy: number;
  }[];
  byFDRLevel: {
    fdrRange: string;
    predictions: number;
    mape: number;
    directionalAccuracy: number;
    avgFDR: number;
  }[];
  extremeConditions: {
    bubbles: {
      predictions: number;
      correctDownwardCalls: number;
      accuracy: number;
    };
    crashes: {
      predictions: number;
      correctUpwardCalls: number;
      accuracy: number;
    };
  };
  samplePredictions: any[];
}

/**
 * Run comprehensive test and return detailed results
 */
export async function runComprehensiveTest(companyId: string): Promise<ComprehensiveTestResults> {
  // Query all predictions for this company
  const predictions = await db
    .select()
    .from(historicalPredictions)
    .where(eq(historicalPredictions.companyId, companyId));

  // Calculate overall metrics - filter for complete predictions with both predicted and actual values
  const validPredictions = predictions.filter(p => 
    p.actualValue !== null && p.predictedValue !== null
  );
  
  const overallMAPE = validPredictions.reduce((sum, p) => {
    const mape = Math.abs((p.predictedValue! - p.actualValue!) / p.actualValue!) * 100;
    return sum + mape;
  }, 0) / validPredictions.length;

  const correctDirectional = validPredictions.filter(
    p => p.predictedDirection === p.actualDirection
  ).length;
  const directionalAccuracy = (correctDirectional / validPredictions.length) * 100;

  const correctRegime = validPredictions.filter(
    p => p.predictedRegime === p.actualRegime
  ).length;
  const regimeAccuracy = (correctRegime / validPredictions.length) * 100;

  // Group by regime
  const regimeGroups = ['HEALTHY_EXPANSION', 'ASSET_LED_GROWTH', 'IMBALANCED_EXCESS', 'REAL_ECONOMY_LEAD'];
  const byRegime = regimeGroups.map(regime => {
    const regimePreds = validPredictions.filter(p => p.regimeAtPrediction === regime);
    if (regimePreds.length === 0) {
      return { regime, predictions: 0, mape: 0, directionalAccuracy: 0, regimeAccuracy: 0 };
    }
    
    const mape = regimePreds.reduce((sum, p) => {
      return sum + Math.abs((p.predictedValue! - p.actualValue!) / p.actualValue!) * 100;
    }, 0) / regimePreds.length;

    const dirAccuracy = (regimePreds.filter(p => p.predictedDirection === p.actualDirection).length / regimePreds.length) * 100;
    const regAccuracy = (regimePreds.filter(p => p.predictedRegime === p.actualRegime).length / regimePreds.length) * 100;

    return {
      regime,
      predictions: regimePreds.length,
      mape: Math.round(mape * 100) / 100,
      directionalAccuracy: Math.round(dirAccuracy * 100) / 100,
      regimeAccuracy: Math.round(regAccuracy * 100) / 100,
    };
  });

  // Group by time period
  const byTimePeriod = [
    { start: new Date('2000-01-01'), end: new Date('2009-12-31'), label: '2000s (Dot-com + Financial Crisis)' },
    { start: new Date('2010-01-01'), end: new Date('2019-12-31'), label: '2010s (Recovery + Expansion)' },
    { start: new Date('2020-01-01'), end: new Date('2024-12-31'), label: '2020s (COVID + Post-COVID)' },
  ].map(period => {
    const periodPreds = validPredictions.filter(p => {
      const predDate = new Date(p.predictionDate);
      return predDate >= period.start && predDate <= period.end;
    });

    if (periodPreds.length === 0) {
      return { period: period.label, predictions: 0, mape: 0, directionalAccuracy: 0 };
    }

    const mape = periodPreds.reduce((sum, p) => {
      return sum + Math.abs((p.predictedValue! - p.actualValue!) / p.actualValue!) * 100;
    }, 0) / periodPreds.length;

    const dirAccuracy = (periodPreds.filter(p => p.predictedDirection === p.actualDirection).length / periodPreds.length) * 100;

    return {
      period: period.label,
      predictions: periodPreds.length,
      mape: Math.round(mape * 100) / 100,
      directionalAccuracy: Math.round(dirAccuracy * 100) / 100,
    };
  });

  // Group by FDR level
  const byFDRLevel = [
    { min: 0, max: 1.2, label: 'Low FDR (0.8-1.2): Real Economy Lead' },
    { min: 1.2, max: 1.5, label: 'Medium FDR (1.2-1.5): Healthy Expansion' },
    { min: 1.5, max: 1.8, label: 'High FDR (1.5-1.8): Asset-Led Growth' },
    { min: 1.8, max: 3.0, label: 'Extreme FDR (1.8+): Bubble/Imbalanced Excess' },
  ].map(range => {
    const rangePreds = validPredictions.filter(p => 
      p.fdrAtPrediction >= range.min && p.fdrAtPrediction < range.max
    );

    if (rangePreds.length === 0) {
      return { 
        fdrRange: range.label, 
        predictions: 0, 
        mape: 0, 
        directionalAccuracy: 0,
        avgFDR: 0 
      };
    }

    const mape = rangePreds.reduce((sum, p) => {
      return sum + Math.abs((p.predictedValue! - p.actualValue!) / p.actualValue!) * 100;
    }, 0) / rangePreds.length;

    const dirAccuracy = (rangePreds.filter(p => p.predictedDirection === p.actualDirection).length / rangePreds.length) * 100;
    
    const avgFDR = rangePreds.reduce((sum, p) => sum + p.fdrAtPrediction, 0) / rangePreds.length;

    return {
      fdrRange: range.label,
      predictions: rangePreds.length,
      mape: Math.round(mape * 100) / 100,
      directionalAccuracy: Math.round(dirAccuracy * 100) / 100,
      avgFDR: Math.round(avgFDR * 1000) / 1000,
    };
  });

  // Analyze extreme conditions (bubbles and crashes)
  const bubblePredictions = validPredictions.filter(p => p.fdrAtPrediction > 1.8);
  const correctBubbleDownwardCalls = bubblePredictions.filter(p => 
    p.predictedDirection === 'down' && p.actualDirection === 'down'
  ).length;

  const crashPredictions = validPredictions.filter(p => 
    p.fdrAtPrediction < 1.0 && p.actualValue! < p.predictedValue! * 0.95
  );
  const correctCrashUpwardCalls = crashPredictions.filter(p =>
    p.predictedDirection === 'up' && p.actualDirection === 'up'
  ).length;

  // Get sample predictions
  const samplePredictions = validPredictions
    .sort((a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime())
    .slice(0, 10)
    .map(p => ({
      date: p.predictionDate,
      fdr: p.fdrAtPrediction,
      regime: p.regimeAtPrediction,
      predicted: p.predictedValue!,
      actual: p.actualValue!,
      predictedDirection: p.predictedDirection,
      actualDirection: p.actualDirection,
      mape: Math.round(Math.abs((p.predictedValue! - p.actualValue!) / p.actualValue!) * 10000) / 100,
    }));

  return {
    totalPredictions: predictions.length,
    dataLocation: {
      predictionsTable: 'historical_predictions',
      metricsTable: 'prediction_accuracy_metrics',
      snapshotsTable: 'economic_snapshots',
    },
    overallMetrics: {
      meanAbsolutePercentageError: Math.round(overallMAPE * 100) / 100,
      directionalAccuracy: Math.round(directionalAccuracy * 100) / 100,
      regimeAccuracy: Math.round(regimeAccuracy * 100) / 100,
    },
    byRegime,
    byTimePeriod,
    byFDRLevel,
    extremeConditions: {
      bubbles: {
        predictions: bubblePredictions.length,
        correctDownwardCalls: correctBubbleDownwardCalls,
        accuracy: bubblePredictions.length > 0 
          ? Math.round((correctBubbleDownwardCalls / bubblePredictions.length) * 10000) / 100 
          : 0,
      },
      crashes: {
        predictions: crashPredictions.length,
        correctUpwardCalls: correctCrashUpwardCalls,
        accuracy: crashPredictions.length > 0
          ? Math.round((correctCrashUpwardCalls / crashPredictions.length) * 10000) / 100
          : 0,
      },
    },
    samplePredictions,
  };
}

/**
 * Get database summary showing where all research data is stored
 */
export async function getDatabaseSummary(companyId: string) {
  const predictionCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(historicalPredictions)
    .where(eq(historicalPredictions.companyId, companyId));

  const metricsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(predictionAccuracyMetrics)
    .where(eq(predictionAccuracyMetrics.companyId, companyId));

  return {
    tables: {
      historical_predictions: {
        location: 'Database > historical_predictions table',
        rowCount: Number(predictionCount[0]?.count || 0),
        columns: [
          'id', 'company_id', 'prediction_date', 'target_date', 'horizon_days',
          'prediction_type', 'item_name', 'fdr_at_prediction', 'regime_at_prediction',
          'predicted_value', 'actual_value', 'predicted_direction', 'actual_direction',
          'predicted_regime', 'actual_regime', 'confidence_score', 'created_at'
        ],
        query: `SELECT * FROM historical_predictions WHERE company_id = '${companyId}' ORDER BY prediction_date DESC LIMIT 100;`
      },
      prediction_accuracy_metrics: {
        location: 'Database > prediction_accuracy_metrics table',
        rowCount: Number(metricsCount[0]?.count || 0),
        columns: [
          'id', 'company_id', 'metric_period', 'period_start', 'period_end',
          'total_predictions', 'correct_direction_pct', 'correct_regime_pct',
          'mean_absolute_percentage_error', 'root_mean_square_error',
          'paper_theory_alignment', 'calculated_at', 'created_at'
        ],
        query: `SELECT * FROM prediction_accuracy_metrics WHERE company_id = '${companyId}' ORDER BY created_at DESC LIMIT 10;`
      },
      economic_snapshots: {
        location: 'Database > economic_snapshots table',
        description: 'Real-time FDR calculations and regime determinations',
        query: `SELECT * FROM economic_snapshots WHERE company_id = '${companyId}' ORDER BY snapshot_date DESC LIMIT 50;`
      }
    }
  };
}
