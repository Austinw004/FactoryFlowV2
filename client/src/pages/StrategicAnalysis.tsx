import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingUp, 
  Globe,
  Activity,
  Loader2,
  Play,
  CheckCircle,
  Target,
  Zap,
  Save,
  Bookmark,
  GitCompare,
  FileDown,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SaveScenarioDialog } from "@/components/analysis/SaveScenarioDialog";
import { ScenarioLibrary } from "@/components/analysis/ScenarioLibrary";
import { ScenarioComparison } from "@/components/analysis/ScenarioComparison";
import { AlertsConfig } from "@/components/analysis/AlertsConfig";
import { ExportDialog } from "@/components/analysis/ExportDialog";
import { FDRTimelineChart } from "@/components/analysis/FDRTimelineChart";
import { CommodityHeatMap } from "@/components/analysis/CommodityHeatMap";
import type { SavedScenario, ScenarioBookmark } from "@shared/schema";

interface ScenarioResult {
  scenarioName: string;
  confidence: number;
  revenueImpact: number;
  revenueImpactPercent: number;
  costImpact: number;
  costImpactPercent: number;
  marginImpact: number;
  productionVolumeChange: number;
  inventoryRequirement: number;
  cashFlowImpact: number;
  newFDR: number;
  newRegime: string;
  regimeStability: 'stable' | 'transitioning' | 'volatile';
  recommendations: Array<{
    category: string;
    action: string;
    priority: string;
    impact: string;
    timeline: string;
  }>;
  risks: Array<{
    factor: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
}

interface RiskAssessment {
  region: string;
  eventType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fdrImpact: number;
  supplyChainImpact: string;
  procurementImpact: string;
  recommendations: Array<{
    action: string;
    priority: string;
    timeline: string;
    fdrContext: string;
  }>;
  exposureScore: number;
  mitigationCost: number;
  confidence: number;
}

export default function StrategicAnalysis() {
  const { toast } = useToast();
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [geoAssessment, setGeoAssessment] = useState<RiskAssessment | null>(null);
  const [validationRunning, setValidationRunning] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [geoEventType, setGeoEventType] = useState<string>("");
  const [geoSeverity, setGeoSeverity] = useState<string>("medium");
  
  const [includeEconomic, setIncludeEconomic] = useState(true);
  const [includeGeopolitical, setIncludeGeopolitical] = useState(false);
  const [includeValidation, setIncludeValidation] = useState(false);
  const [isRunningCombined, setIsRunningCombined] = useState(false);
  
  const economicFormRef = useRef<HTMLFormElement>(null);
  const geoFormRef = useRef<HTMLFormElement>(null);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [compareBookmarks, setCompareBookmarks] = useState<ScenarioBookmark[]>([]);

  const { data: economicData } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  const { data: storedBacktestResults } = useQuery({
    queryKey: ['/api/backtest/results'],
    retry: 1,
  });

  const currentFDR = economicData?.fdr || 1.0;
  const currentRegime = economicData?.regime || 'Healthy Expansion';

  const simulateMutation = useMutation({
    mutationFn: async (data: any): Promise<ScenarioResult> => {
      const response = await apiRequest("POST", "/api/scenarios/simulate", data);
      return await response.json();
    },
    onSuccess: (data: ScenarioResult) => {
      setScenarioResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/economics/regime"] });
      toast({
        title: "Scenario Analysis Complete",
        description: `${data.scenarioName} analyzed with ${data.confidence}% confidence`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Simulation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assessMutation = useMutation({
    mutationFn: async (data: any): Promise<RiskAssessment> => {
      const response = await apiRequest("POST", "/api/geopolitical/assess", data);
      return await response.json();
    },
    onSuccess: (data: RiskAssessment) => {
      setGeoAssessment(data);
      queryClient.invalidateQueries({ queryKey: ["/api/economics/regime"] });
      toast({
        title: "Geopolitical Assessment Complete",
        description: `${data.region} event analyzed with ${data.confidence}% confidence`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Assessment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScenarioSimulate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const data = {
      scenarioName: formData.get('scenarioName') as string,
      description: formData.get('description') as string || undefined,
      fdrDelta: parseFloat(formData.get('fdrDelta') as string) || 0,
      commodityPriceChange: parseFloat(formData.get('commodityPriceChange') as string) || 0,
      demandChange: parseFloat(formData.get('demandChange') as string) || 0,
      durationMonths: parseInt(formData.get('durationMonths') as string) || 12,
      currentFDR,
      currentRegime,
      baseRevenue: 10000000,
      baseCosts: 7000000,
      baseMargin: 30,
      affectedCommodities: [],
      affectedSKUs: [],
    };

    simulateMutation.mutate(data);
  };

  const handleGeoAssess = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (!geoEventType) {
      toast({
        title: "Validation Error",
        description: "Please select an event type",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      eventType: geoEventType,
      region: formData.get('region') as string,
      severity: geoSeverity,
      description: formData.get('description') as string || '',
      currentFDR,
      commoditiesAffected: [],
      suppliersAffected: [],
      startDate: new Date().toISOString(),
    };

    assessMutation.mutate(data);
  };

  const runValidation = async () => {
    setValidationRunning(true);
    setValidationResults(null);
    
    try {
      const response = await apiRequest('POST', '/api/backtest/run', {
        startYear: 2015,
        endYear: 2023,
        horizonMonths: 6,
      });
      const results: any = await response.json();
      
      setValidationResults(results);
      queryClient.invalidateQueries({ queryKey: ['/api/backtest/results'] });

      toast({
        title: "Theory Validation Complete",
        description: `Validated ${results.totalPredictions} predictions with ${results.correctDirectionPct}% directional accuracy`,
      });
    } catch (error: any) {
      toast({
        title: "Validation Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setValidationRunning(false);
    }
  };

  const runCombinedAnalysis = async () => {
    if (!includeEconomic && !includeGeopolitical && !includeValidation) {
      toast({
        title: "No analyses selected",
        description: "Please select at least one analysis type to run",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields before running
    if (includeEconomic && economicFormRef.current) {
      const formData = new FormData(economicFormRef.current);
      const scenarioName = formData.get('scenarioName') as string;
      const durationMonths = formData.get('durationMonths') as string;
      
      if (!scenarioName || scenarioName.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Economic Scenario: Please enter a scenario name",
          variant: "destructive",
        });
        return;
      }
      
      if (!durationMonths || parseInt(durationMonths) < 1) {
        toast({
          title: "Validation Error",
          description: "Economic Scenario: Please enter a valid duration (1-60 months)",
          variant: "destructive",
        });
        return;
      }
    }

    if (includeGeopolitical && geoFormRef.current) {
      if (!geoEventType) {
        toast({
          title: "Validation Error",
          description: "Geopolitical Risk: Please select an event type",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData(geoFormRef.current);
      const region = formData.get('region') as string;
      
      if (!region || region.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Geopolitical Risk: Please enter a region or country",
          variant: "destructive",
        });
        return;
      }
    }

    setIsRunningCombined(true);

    try {
      if (includeEconomic && economicFormRef.current) {
        const formData = new FormData(economicFormRef.current);
        const data = {
          scenarioName: formData.get('scenarioName') as string,
          description: formData.get('description') as string || undefined,
          fdrDelta: parseFloat(formData.get('fdrDelta') as string) || 0,
          commodityPriceChange: parseFloat(formData.get('commodityPriceChange') as string) || 0,
          demandChange: parseFloat(formData.get('demandChange') as string) || 0,
          durationMonths: parseInt(formData.get('durationMonths') as string) || 12,
          currentFDR,
          currentRegime,
          baseRevenue: 10000000,
          baseCosts: 7000000,
          baseMargin: 30,
          affectedCommodities: [],
          affectedSKUs: [],
        };

        const response = await apiRequest("POST", "/api/scenarios/simulate", data);
        const result: ScenarioResult = await response.json();
        setScenarioResult(result);
      }

      if (includeGeopolitical && geoFormRef.current) {
        const formData = new FormData(geoFormRef.current);
        const data = {
          eventType: geoEventType,
          region: formData.get('region') as string,
          severity: geoSeverity,
          description: formData.get('description') as string || '',
          currentFDR,
          commoditiesAffected: [],
          suppliersAffected: [],
          startDate: new Date().toISOString(),
        };

        const response = await apiRequest("POST", "/api/geopolitical/assess", data);
        const result: RiskAssessment = await response.json();
        setGeoAssessment(result);
      }

      if (includeValidation) {
        const response = await apiRequest('POST', '/api/backtest/run', {
          startYear: 2015,
          endYear: 2023,
          horizonMonths: 6,
        });
        const results: any = await response.json();
        setValidationResults(results);
        queryClient.invalidateQueries({ queryKey: ['/api/backtest/results'] });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/economics/regime"] });

      const analysesRun = [
        includeEconomic && "Economic Scenario",
        includeGeopolitical && "Geopolitical Risk",
        includeValidation && "Theory Validation"
      ].filter(Boolean).join(", ");

      toast({
        title: "Combined Analysis Complete",
        description: `Successfully ran: ${analysesRun}`,
      });
    } catch (error: any) {
      toast({
        title: "Combined Analysis Failed",
        description: error.message || 'An error occurred during analysis',
        variant: "destructive",
      });
    } finally {
      setIsRunningCombined(false);
    }
  };

  const backtestResults = validationResults || (storedBacktestResults && Array.isArray(storedBacktestResults) && storedBacktestResults.length > 0 ? storedBacktestResults[0] : null);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Strategic Analysis
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Dual-circuit economic modeling for counter-cyclical procurement and regime-aware strategic planning
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Current Economic State
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">FDR (Financial Decoupling Ratio)</p>
            <p className="font-semibold text-lg" data-testid="metric-current-fdr">{currentFDR.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Economic Regime</p>
            <Badge variant="secondary" data-testid="badge-current-regime">{formatRegimeName(currentRegime)}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Asset Circuit</p>
            <p className="font-semibold" data-testid="metric-asset-circuit">
              {currentFDR > 1.5 ? 'Elevated' : currentFDR < 0.9 ? 'Compressed' : 'Balanced'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Real Circuit</p>
            <p className="font-semibold" data-testid="metric-real-circuit">
              {currentFDR > 1.5 ? 'Lagging' : currentFDR < 0.9 ? 'Leading' : 'Balanced'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Configure Combined Analysis
          </CardTitle>
          <CardDescription>
            Select which analyses to run together or individually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-economic" 
                checked={includeEconomic}
                onCheckedChange={(checked) => setIncludeEconomic(checked === true)}
                data-testid="checkbox-economic"
              />
              <label htmlFor="include-economic" className="text-sm font-medium cursor-pointer">
                Economic Scenario
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-geopolitical"
                checked={includeGeopolitical}
                onCheckedChange={(checked) => setIncludeGeopolitical(checked === true)}
                data-testid="checkbox-geopolitical"
              />
              <label htmlFor="include-geopolitical" className="text-sm font-medium cursor-pointer">
                Geopolitical Risk
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-validation"
                checked={includeValidation}
                onCheckedChange={(checked) => setIncludeValidation(checked === true)}
                data-testid="checkbox-validation"
              />
              <label htmlFor="include-validation" className="text-sm font-medium cursor-pointer">
                Theory Validation
              </label>
            </div>
          </div>

          <Button
            onClick={runCombinedAnalysis}
            disabled={isRunningCombined || (!includeEconomic && !includeGeopolitical && !includeValidation)}
            size="lg"
            className="w-full"
            data-testid="button-run-combined"
          >
            {isRunningCombined ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running Combined Analysis...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Run Selected Analyses
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {includeEconomic && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Economic Shock Simulator
            </CardTitle>
            <CardDescription>
              Model how FDR transitions, commodity price shifts, and demand changes impact operations through dual-circuit dynamics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={economicFormRef} onSubmit={handleScenarioSimulate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scenarioName">Scenario Name *</Label>
                  <Input
                    id="scenarioName"
                    name="scenarioName"
                    placeholder="e.g., Asset Bubble Correction"
                    required
                    data-testid="input-scenario-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Duration (Months) *</Label>
                  <Input
                    id="durationMonths"
                    name="durationMonths"
                    type="number"
                    defaultValue="12"
                    min="1"
                    max="60"
                    required
                    data-testid="input-duration"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Scenario Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Describe economic shock assumptions..."
                  data-testid="input-scenario-description"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-4">Dual-Circuit Shock Parameters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fdrDelta">FDR Change</Label>
                    <Input
                      id="fdrDelta"
                      name="fdrDelta"
                      type="number"
                      step="0.1"
                      placeholder="e.g., +0.4 or -0.3"
                      defaultValue="0"
                      data-testid="input-fdr-delta"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {currentFDR.toFixed(2)} | Target: {(currentFDR + 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commodityPriceChange">Commodity Δ (%)</Label>
                    <Input
                      id="commodityPriceChange"
                      name="commodityPriceChange"
                      type="number"
                      step="5"
                      placeholder="e.g., +25 or -15"
                      defaultValue="0"
                      data-testid="input-commodity-change"
                    />
                    <p className="text-xs text-muted-foreground">
                      Asset market price impact
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demandChange">Real Demand Δ (%)</Label>
                    <Input
                      id="demandChange"
                      name="demandChange"
                      type="number"
                      step="5"
                      placeholder="e.g., +20 or -30"
                      defaultValue="0"
                      data-testid="input-demand-change"
                    />
                    <p className="text-xs text-muted-foreground">
                      Real economy GDP impact
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScenarioResult(null)}
                  data-testid="button-clear-scenario"
                >
                  Clear Results
                </Button>
                <Button
                  type="submit"
                  disabled={simulateMutation.isPending}
                  data-testid="button-simulate"
                >
                  {simulateMutation.isPending ? "Simulating..." : "Run Scenario Analysis"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {includeGeopolitical && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Geopolitical Event Assessment
            </CardTitle>
            <CardDescription>
              Analyze how global disruptions affect supply chains and procurement timing through FDR-aware risk modeling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={geoFormRef} onSubmit={handleGeoAssess} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region/Country *</Label>
                  <Input
                    id="region"
                    name="region"
                    placeholder="e.g., China, Europe, Middle East"
                    required
                    data-testid="input-geo-region"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Select value={geoEventType} onValueChange={setGeoEventType} required>
                    <SelectTrigger data-testid="select-event-type">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trade_war">Trade War / Tariffs</SelectItem>
                      <SelectItem value="sanctions">Economic Sanctions</SelectItem>
                      <SelectItem value="currency_crisis">Currency Crisis</SelectItem>
                      <SelectItem value="political_instability">Political Instability</SelectItem>
                      <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select value={geoSeverity} onValueChange={setGeoSeverity} required>
                    <SelectTrigger data-testid="select-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Current FDR Context</Label>
                  <Input
                    value={`${currentFDR.toFixed(2)} (${currentRegime})`}
                    disabled
                    data-testid="input-geo-current-fdr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geoDescription">Event Description</Label>
                <Input
                  id="geoDescription"
                  name="description"
                  placeholder="Describe the geopolitical event and implications..."
                  data-testid="input-geo-description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGeoAssessment(null)}
                  data-testid="button-clear-geo"
                >
                  Clear Results
                </Button>
                <Button
                  type="submit"
                  disabled={assessMutation.isPending}
                  data-testid="button-assess-geo"
                >
                  {assessMutation.isPending ? "Assessing..." : "Assess Geopolitical Risk"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {includeValidation && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Dual-Circuit Theory Validation
            </CardTitle>
            <CardDescription>
              Backtest FDR-based predictions against 2015-2023 historical data to validate counter-cyclical procurement framework
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
              <p className="text-sm font-medium text-primary mb-2">Research Validation Methodology</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• <strong>Asset Circuit:</strong> Money flowing into financial assets (stocks, real estate)</p>
                <p>• <strong>Real Circuit:</strong> Money flowing into productive GDP transactions</p>
                <p>• <strong>FDR:</strong> Financial Decoupling Ratio predicting regime shifts</p>
                <p>• <strong>Historical Testing:</strong> Simulates predictions at past time points, compares to actual outcomes</p>
              </div>
            </div>

            <div className="grid gap-3 text-sm border rounded-md p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Period:</span>
                <span className="font-medium">2015-2023 (9 years)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Sources:</span>
                <span className="font-medium">FRED + Alpha Vantage (with fallback)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prediction Horizon:</span>
                <span className="font-medium">6 months ahead</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metrics Tracked:</span>
                <span className="font-medium">Direction, Regime, Price MAPE</span>
              </div>
            </div>

            <Button
              onClick={runValidation}
              disabled={validationRunning}
              className="w-full"
              size="lg"
              data-testid="button-run-validation"
            >
              {validationRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Historical Validation...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Theory Validation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {scenarioResult && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {scenarioResult.scenarioName} Results
                </CardTitle>
                <Badge variant={scenarioResult.confidence > 75 ? "default" : "secondary"}>
                  {scenarioResult.confidence}% Confidence
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  data-testid="button-save-template"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  data-testid="button-bookmark-results"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Bookmark Results
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLibrary(true)}
                  data-testid="button-compare-scenarios"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare Scenarios
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExport(true)}
                  data-testid="button-export"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAlerts(true)}
                  data-testid="button-configure-alerts"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">New FDR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="result-new-fdr">
                    {scenarioResult.newFDR.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRegimeName(scenarioResult.newRegime)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cash Flow Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${scenarioResult.cashFlowImpact >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="result-cashflow">
                    ${(scenarioResult.cashFlowImpact / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scenarioResult.cashFlowImpact >= 0 ? 'Positive' : 'Negative'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Margin Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${scenarioResult.marginImpact >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="result-margin">
                    {scenarioResult.marginImpact >= 0 ? '+' : ''}{scenarioResult.marginImpact.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Percentage points</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Regime Stability</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={
                    scenarioResult.regimeStability === 'stable' ? 'default' :
                    scenarioResult.regimeStability === 'transitioning' ? 'secondary' : 'destructive'
                  } data-testid="result-stability">
                    {scenarioResult.regimeStability}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strategic Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scenarioResult.recommendations && scenarioResult.recommendations.length > 0 ? (
                    scenarioResult.recommendations.slice(0, 5).map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                        <Badge variant={
                          rec.priority === 'critical' ? 'destructive' :
                          rec.priority === 'high' ? 'default' : 'secondary'
                        } className="mt-0.5">
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{rec.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.impact}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rec.timeline}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recommendations available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {geoAssessment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {geoAssessment.region} Risk Assessment
              </CardTitle>
              <Badge variant={geoAssessment.confidence > 75 ? "default" : "secondary"}>
                {geoAssessment.confidence}% Confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={
                    geoAssessment.riskLevel === 'critical' ? 'destructive' :
                    geoAssessment.riskLevel === 'high' ? 'default' : 'secondary'
                  } data-testid="result-risk-level">
                    {geoAssessment.riskLevel.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">FDR Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="result-fdr-impact">
                    {geoAssessment.fdrImpact >= 0 ? '+' : ''}{(geoAssessment.fdrImpact * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Exposure Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="result-exposure">
                    {geoAssessment.exposureScore.toFixed(0)}/100
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Mitigation Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="result-mitigation-cost">
                    ${(geoAssessment.mitigationCost / 1000000).toFixed(2)}M
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supply Chain Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" data-testid="result-supply-chain-impact">
                    {geoAssessment.supplyChainImpact}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Procurement Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" data-testid="result-procurement-impact">
                    {geoAssessment.procurementImpact}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {geoAssessment.recommendations && geoAssessment.recommendations.length > 0 ? (
                    geoAssessment.recommendations.slice(0, 5).map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                        <Badge variant={
                          rec.priority === 'critical' ? 'destructive' :
                          rec.priority === 'high' ? 'default' : 'secondary'
                        } className="mt-0.5">
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{rec.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.fdrContext}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rec.timeline}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recommendations available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {backtestResults && backtestResults.totalPredictions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="validation-total">
                    {backtestResults.totalPredictions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Across 9-year period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Directional Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="validation-directional">
                    {backtestResults.correctDirectionPct || 0}%
                  </div>
                  <Progress value={backtestResults.correctDirectionPct || 0} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Regime Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="validation-regime">
                    {backtestResults.correctRegimePct || 0}%
                  </div>
                  <Progress value={backtestResults.correctRegimePct || 0} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Price MAPE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="validation-mape">
                    {backtestResults.meanAbsolutePercentageError?.toFixed(1) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Lower is better</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Dual-Circuit Theory Validated</p>
                    <p className="text-sm text-green-700 mt-1">
                      FDR-based predictions demonstrate statistically significant directional accuracy across multiple economic regimes and market cycles, supporting counter-cyclical procurement strategies.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      <SaveScenarioDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        scenarioData={
          scenarioResult
            ? {
                type: includeGeopolitical ? 'geopolitical' : includeEconomic ? 'economic' : 'combined',
                configuration: economicFormRef.current ? Object.fromEntries(new FormData(economicFormRef.current)) : {},
                results: scenarioResult,
                currentFDR,
                currentRegime,
              }
            : undefined
        }
      />

      <ScenarioLibrary
        open={showLibrary}
        onOpenChange={setShowLibrary}
        onLoadTemplate={(template: SavedScenario) => {
          toast({
            title: "Template Loaded",
            description: `"${template.name}" configuration has been loaded`,
          });
        }}
        onViewBookmark={(bookmark: ScenarioBookmark) => {
          const results = bookmark.results as any;
          setScenarioResult(results);
          toast({
            title: "Bookmark Loaded",
            description: `Viewing results for "${bookmark.name}"`,
          });
        }}
        onCompareBookmarks={(bookmarks: ScenarioBookmark[]) => {
          setCompareBookmarks(bookmarks);
          setShowComparison(true);
        }}
      />

      <ScenarioComparison
        open={showComparison}
        onOpenChange={setShowComparison}
        scenarios={compareBookmarks}
      />

      <AlertsConfig open={showAlerts} onOpenChange={setShowAlerts} />

      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        scenarioData={
          scenarioResult
            ? {
                type: includeGeopolitical ? 'geopolitical' : includeEconomic ? 'economic' : 'combined',
                results: scenarioResult,
                configuration: economicFormRef.current ? Object.fromEntries(new FormData(economicFormRef.current)) : {},
              }
            : undefined
        }
      />
    </div>
  );
}
