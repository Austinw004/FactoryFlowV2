import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/humanizeError";

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

export default function ScenarioPlanning() {
  const { toast } = useToast();
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const { data: economicData } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  const currentFDR = economicData?.fdr || 1.0;
  const currentRegime = economicData?.regime || 'Healthy Expansion';

  const simulateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/scenarios/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to simulate scenario");
      return await response.json();
    },
    onSuccess: (data: ScenarioResult) => {
      setResult(data);
      toast({
        title: "Scenario simulation complete",
        description: `${data.scenarioName} analyzed with ${data.confidence}% confidence`,
      });
    },
    onError: (error: unknown) => {
      toast({
        ...humanizeError(error, "Simulation failed"),
        variant: "destructive",
      });
    },
  });

  const handleSimulate = (event: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Scenario Planning
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          FDR-aware regime transition modeling and what-if analysis
        </p>
      </div>

      <Tabs defaultValue="simulator">
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="simulator" data-testid="tab-simulator">
            Scenario Simulator
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results" disabled={!result}>
            Results {result && `(${result.scenarioName})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>What-If Scenario Builder</CardTitle>
              <CardDescription>
                Model how FDR changes, commodity shocks, and demand shifts impact your operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSimulate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenarioName">Scenario Name *</Label>
                    <Input
                      id="scenarioName"
                      name="scenarioName"
                      placeholder="e.g., Trade War Impact"
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
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Describe the scenario assumptions..."
                    data-testid="input-description"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4">Economic Shock Parameters</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fdrDelta">FDR Change</Label>
                      <Input
                        id="fdrDelta"
                        name="fdrDelta"
                        type="number"
                        step="0.1"
                        placeholder="e.g., +0.3 or -0.2"
                        defaultValue="0"
                        data-testid="input-fdr-delta"
                      />
                      <p className="text-xs text-muted-foreground">
                        Current FDR: {currentFDR.toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commodityPriceChange">Commodity Price Change (%)</Label>
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
                        Applies to all materials
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="demandChange">Demand Change (%)</Label>
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
                        Applies to all SKUs
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResult(null)}
                    data-testid="button-clear"
                  >
                    Clear Results
                  </Button>
                  <Button
                    type="submit"
                    disabled={simulateMutation.isPending}
                    data-testid="button-simulate"
                  >
                    {simulateMutation.isPending ? "Simulating..." : "Run Simulation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {result && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="card-cash-flow-impact">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cash Flow Impact</CardTitle>
                    {result.cashFlowImpact >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${result.cashFlowImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(result.cashFlowImpact / 1000000).toFixed(2)}M
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Net impact on cash
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-new-regime">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Regime</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Badge variant="default" className="mb-2">{result.newRegime}</Badge>
                    <p className="text-xs text-muted-foreground">
                      FDR: {result.newFDR.toFixed(2)} ({result.regimeStability})
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-margin-impact">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margin Impact</CardTitle>
                    {result.marginImpact >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${result.marginImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.marginImpact >= 0 ? '+' : ''}{result.marginImpact.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentage point change
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-confidence">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confidence</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.confidence}%</div>
                    <p className="text-xs text-muted-foreground">
                      Scenario reliability
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Regime-Aware Recommendations</CardTitle>
                  <CardDescription>
                    Actions prioritized by FDR context and impact
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg" data-testid={`rec-${idx}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={rec.priority === 'critical' ? 'destructive' : 'default'}>
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline">{rec.category}</Badge>
                          </div>
                          <h4 className="font-medium">{rec.action}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Impact: {rec.impact} • Timeline: {rec.timeline}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Factors</CardTitle>
                  <CardDescription>
                    Identified risks and mitigation strategies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg" data-testid={`risk-${idx}`}>
                        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium">{risk.factor}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Probability: {risk.probability}%</span>
                            <span>Impact: {risk.impact}%</span>
                          </div>
                          <p className="text-sm mt-2">
                            <span className="font-medium">Mitigation: </span>
                            {risk.mitigation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
