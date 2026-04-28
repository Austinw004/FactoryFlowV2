import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle2, TrendingUp, Target, Activity, AlertTriangle, Database, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function HistoricalBacktesting() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [latestResults, setLatestResults] = useState<any>(null);

  // Fetch stored backtest results with error handling
  const { data: storedResults, refetch, error: queryError } = useQuery({
    queryKey: ['/api/backtest/results'],
    retry: 1,
  });

  const runBacktest = async () => {
    setRunning(true);
    setLatestResults(null); // Clear previous results
    
    try {
      const response = await apiRequest('POST', '/api/backtest/run', {
        startYear: 2015,
        endYear: 2023,
        horizonMonths: 6,
      });

      // Parse JSON from response
      const results: any = await response.json();
      
      setLatestResults(results);
      await refetch();

      toast({
        title: "Backtest Complete!",
        description: `Validated ${results.totalPredictions} predictions with ${results.correctDirectionPct}% directional accuracy`,
      });
    } catch (error: any) {
      toast({
        title: "Backtest Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  // Safely extract results with proper fallback and type coercion
  let results = null;
  try {
    const rawResults = latestResults || (storedResults && Array.isArray(storedResults) && storedResults.length > 0 ? storedResults[0] : null);
    
    // Ensure numeric fields are actually numbers (defensive programming against string conversion)
    if (rawResults && rawResults.totalPredictions) {
      results = {
        ...rawResults,
        totalPredictions: Number(rawResults.totalPredictions),
        correctDirectionPct: Number(rawResults.correctDirectionPct || 0),
        correctRegimePct: Number(rawResults.correctRegimePct || 0),
        meanAbsolutePercentageError: Number(rawResults.meanAbsolutePercentageError || 0),
      };
    }

  } catch (e) {
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
<p className="text-muted-foreground">
          Validate dual-circuit economic theory by testing predictions against 2015-2023 historical data
        </p>
      </div>

      {/* Run Backtest Card */}
      <Card>
        <CardHeader>
          <CardTitle>Run Historical Validation</CardTitle>
          <CardDescription>
            Test the FDR-based prediction system against 9 years of real historical economic data
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="bg-muted/50 border border-muted-foreground/20 rounded-md p-3 mb-2">
            <p className="text-sm font-medium mb-1">Data Sources</p>
            <p className="text-xs text-muted-foreground">
              Configured to use FRED (Federal Reserve) and Alpha Vantage APIs when available.
              Falls back to deterministic historical data if live APIs are unavailable.
              Data source will be shown in results.
            </p>
          </div>
          
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Test Period:</span>
              <span className="font-medium">2015-2023 (9 years)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Sources:</span>
              <span className="font-medium">FRED + Alpha Vantage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prediction Horizon:</span>
              <span className="font-medium">6 months ahead</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prediction Types:</span>
              <span className="font-medium">Commodity Prices + Economic Regimes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sample Size:</span>
              <span className="font-medium">~100 predictions per category</span>
            </div>
          </div>

          <Button
            onClick={runBacktest}
            disabled={running}
            className="w-full"
            size="lg"
            data-testid="button-run-backtest"
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running Historical Validation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Run Backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono whitespace-pre-wrap max-h-96 overflow-auto">
            <div>Latest Results: {latestResults ? 'Present' : 'Null'}</div>
            <div>Stored Results: {storedResults ? (Array.isArray(storedResults) ? `Array(${storedResults.length})` : 'Object') : 'Null'}</div>
            <div>Final Results: {results ? 'Present' : 'Null'}</div>
            <div>Has Total: {results?.totalPredictions || 'No'}</div>
            {results && <div className="mt-2">Results Object Keys: {Object.keys(results).join(', ')}</div>}
            {results && <div className="mt-2">Results JSON: {JSON.stringify(results, null, 2).substring(0, 500)}</div>}
          </CardContent>
        </Card>
      )}

      {/* Query Error Display */}
      {queryError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">Error loading results: {(queryError as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && results.totalPredictions > 0 && (
        <>
          {/* Data Source & Disclaimer Banner */}
          <Card className={results.dataSource === 'synthetic' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'border-green-500 bg-green-50 dark:bg-green-950/20'}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                {results.dataSource === 'synthetic' ? (
                  <AlertTriangle className="h-5 w-5 text-signal flex-shrink-0 mt-0.5" />
                ) : (
                  <Database className="h-5 w-5 text-good flex-shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Data Source:</span>
                    <Badge 
                      variant={results.dataSource === 'synthetic' ? 'secondary' : 'default'}
                      data-testid="badge-data-source"
                    >
                      {results.dataSource === 'real_api' ? (
                        <><Wifi className="h-3 w-3 mr-1" /> Real API Data</>
                      ) : (
                        <><Database className="h-3 w-3 mr-1" /> Synthetic/Fallback</>
                      )}
                    </Badge>
                  </div>
                  {results.dataSource === 'real_api' ? (
                    <p className="text-sm text-good">
                      Results based on real historical data from FRED and Alpha Vantage APIs.
                    </p>
                  ) : (
                    <p className="text-sm text-signal" data-testid="text-data-warning">
                      {results.dataSourceWarning || 'Results based on synthetic/fallback data. For research and testing purposes only.'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-results-disclaimer">
                    Results based on {results.totalPredictions} predictions from 2015-2023 test period.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-predictions">{results.totalPredictions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across 2015-2023 period
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-directional-accuracy">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Directional Accuracy</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-directional-accuracy">{results.correctDirectionPct || 0}%</div>
                <Progress value={results.correctDirectionPct || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="card-regime-accuracy">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regime Accuracy</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-regime-accuracy">{results.correctRegimePct || 0}%</div>
                <Progress value={results.correctRegimePct || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="card-price-mape">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Price MAPE</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-price-mape">{results.commodityPriceMAPE || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Mean Absolute % Error
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Prediction Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Predictions by Type</CardTitle>
                <CardDescription>Distribution across prediction categories</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Commodity Prices</span>
                  <Badge variant="secondary">{results.predictionsByType?.commodityPrice || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Economic Regimes</span>
                  <Badge variant="secondary">{results.predictionsByType?.economicRegime || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recessions</span>
                  <Badge variant="secondary">{results.predictionsByType?.recession || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Accuracy by Regime */}
            <Card>
              <CardHeader>
                <CardTitle>Accuracy by Economic Regime</CardTitle>
                <CardDescription>Performance across different market conditions</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Healthy Expansion</span>
                    <span className="text-sm font-medium">{results.accuracyByRegime?.healthyExpansion || 0}%</span>
                  </div>
                  <Progress value={results.accuracyByRegime?.healthyExpansion || 0} className="h-2" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Asset-Led Growth</span>
                    <span className="text-sm font-medium">{results.accuracyByRegime?.assetLedGrowth || 0}%</span>
                  </div>
                  <Progress value={results.accuracyByRegime?.assetLedGrowth || 0} className="h-2" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Imbalanced Excess</span>
                    <span className="text-sm font-medium">{results.accuracyByRegime?.imbalancedExcess || 0}%</span>
                  </div>
                  <Progress value={results.accuracyByRegime?.imbalancedExcess || 0} className="h-2" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Real Economy Lead</span>
                    <span className="text-sm font-medium">{results.accuracyByRegime?.realEconomyLead || 0}%</span>
                  </div>
                  <Progress value={results.accuracyByRegime?.realEconomyLead || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle>Interpretation & Validation</CardTitle>
              <CardDescription>What these results mean for the dual-circuit economic framework</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-sm">Overall Performance</h3>
                <p className="text-sm text-muted-foreground">
                  {results.correctDirectionPct >= 70 
                    ? `Strong result - ${results.correctDirectionPct}% directional accuracy exceeds the 50% random baseline by ${(results.correctDirectionPct - 50).toFixed(0)} percentage points.`
                    : results.correctDirectionPct >= 60
                    ? `Moderate result - ${results.correctDirectionPct}% accuracy shows some predictive signal above 50% baseline, but further validation is recommended.`
                    : `Weak result - ${results.correctDirectionPct}% accuracy is close to 50% random chance. Model calibration may be needed.`}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-sm">Regime Classification</h3>
                <p className="text-sm text-muted-foreground">
                  {results.correctRegimePct >= 65
                    ? `The four-regime framework achieved ${results.correctRegimePct}% accuracy in categorizing economic conditions.`
                    : `${results.correctRegimePct}% regime accuracy - boundaries may need adjustment based on historical patterns.`}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-sm">Price Forecasting</h3>
                <p className="text-sm text-muted-foreground">
                  {results.commodityPriceMAPE <= 15
                    ? `${results.commodityPriceMAPE}% MAPE - competitive accuracy for commodity price forecasting.`
                    : results.commodityPriceMAPE <= 25
                    ? `${results.commodityPriceMAPE}% MAPE - acceptable for 6-month commodity forecasts.`
                    : `${results.commodityPriceMAPE}% MAPE - higher than typical; volatility challenges in the test period may be a factor.`}
                </p>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold text-sm mb-2">Statistical Context</h3>
                <p className="text-sm text-muted-foreground">
                  With {results.totalPredictions} predictions tested against 2015-2023 data
                  {results.dataSource === 'synthetic' && ' (synthetic fallback data)'}
                  {results.dataSource === 'real_api' && ' (real FRED/Alpha Vantage data)'}
                  , these results provide {results.totalPredictions >= 100 ? 'a reasonable sample size' : 'a limited sample size'} for evaluation.
                  {results.correctDirectionPct >= 60 
                    ? ` The ${results.correctDirectionPct}% directional accuracy exceeds the 50% random baseline.`
                    : ` The ${results.correctDirectionPct}% directional accuracy is close to random chance (50%), suggesting further calibration may be needed.`
                  }
                </p>
                {results.dataSource === 'synthetic' && (
                  <p className="text-sm text-signal mt-2">
                    Note: These results use synthetic fallback data and should not be treated as verified performance metrics.
                  </p>
                )}
              </div>
              
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                <h3 className="font-semibold text-sm mb-2">Private Research Data</h3>
                <p className="text-sm text-muted-foreground">
                  Validation results are stored in your private database and are not shared externally.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!results && !storedResults && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No backtest results available yet.<br />
              Click "Run Backtest" to validate the dual-circuit economic theory.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
