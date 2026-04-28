import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  LineChart,
  Target,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface OptimizationItem {
  id: string;
  materialId: string;
  forecastAccuracy: number;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  economicOrderQty: number;
}

interface PredictionItem {
  id: string;
  materialId: string;
  predictedDemand: number;
  confidence: number;
  horizon: string;
}

interface RecommendationItem {
  id: string;
  materialId: string;
  type: string;
  priority: string;
  status: string;
  estimatedSavings: number;
  description: string;
}

interface MaterialItem {
  id: string;
  name: string;
  code: string;
}

interface RegimeData {
  regime: string;
  fdr: number;
}

export default function InventoryOptimization() {
  const { toast } = useToast();

  const { data: optimizations = [], isLoading: optLoading } = useQuery<OptimizationItem[]>({
    queryKey: ["/api/inventory-optimization/analysis"],
  });

  const { data: predictions = [], isLoading: predLoading } = useQuery<PredictionItem[]>({
    queryKey: ["/api/inventory-optimization/predictions"],
  });

  const { data: recommendations = [], isLoading: recsLoading } = useQuery<RecommendationItem[]>({
    queryKey: ["/api/inventory-optimization/recommendations"],
  });

  const { data: materials = [] } = useQuery<MaterialItem[]>({
    queryKey: ["/api/materials"],
  });

  const { data: regime } = useQuery<RegimeData>({
    queryKey: ["/api/economics/regime"],
  });

  const acceptRecommendationMutation = useMutation({
    mutationFn: async (recId: string) => 
      apiRequest("PATCH", `/api/inventory-optimization/recommendations/${recId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-optimization/recommendations"] });
      toast({ title: "Recommendation accepted" });
    },
  });

  const rejectRecommendationMutation = useMutation({
    mutationFn: async (recId: string) => 
      apiRequest("PATCH", `/api/inventory-optimization/recommendations/${recId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-optimization/recommendations"] });
      toast({ title: "Recommendation rejected" });
    },
  });

  const getRegimeBadge = (regimeName: string) => {
    const regimeConfig = {
      HEALTHY_EXPANSION: { className: "bg-green-600", label: "Healthy Expansion" },
      ASSET_LED_GROWTH: { className: "bg-orange-600", label: "Asset-Led Growth" },
      IMBALANCED_EXCESS: { className: "bg-red-600", label: "Imbalanced Excess" },
      REAL_ECONOMY_LEAD: { className: "bg-blue-600", label: "Real Economy Lead" },
    };
    const config = regimeConfig[regimeName as keyof typeof regimeConfig] || { className: "", label: regimeName };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: "destructive" | "default" | "secondary"; label: string; className?: string }> = {
      critical: { variant: "destructive", label: "Critical" },
      high: { variant: "destructive", label: "High", className: "bg-orange-600" },
      medium: { variant: "default", label: "Medium", className: "bg-yellow-600" },
      low: { variant: "secondary", label: "Low" },
    };
    const c = config[priority] || config.medium;
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const materialsAnalyzed = optimizations.length;
  const avgForecastAccuracy = optimizations.length > 0
    ? optimizations.reduce((acc: number, o: any) => acc + (o.forecastAccuracy || 0), 0) / optimizations.length
    : 0;
  const potentialSavings = recommendations
    .filter((r: any) => r.status === "pending")
    .reduce((acc: number, r: any) => acc + (r.estimatedSavings || 0), 0);

  const getRegimeProcurementGuidance = () => {
    if (!regime) return null;
    const guidance: Record<string, string> = {
      HEALTHY_EXPANSION: "Lock in prices now. Demand is rising, and supplier capacity is expanding. Buy ahead.",
      ASSET_LED_GROWTH: "Exercise caution. Asset prices are inflated. Focus on just-in-time procurement.",
      IMBALANCED_EXCESS: "Counter-cyclical opportunity! Prices are favorable. Build safety stock strategically.",
      REAL_ECONOMY_LEAD: "Secure supply chains. Real demand is strong. Prioritize availability over cost.",
    };
    return guidance[regime.regime] || "Adjust procurement strategy based on regime changes.";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
<p className="text-muted-foreground mt-1">
            ML demand forecasting, optimal stock levels, and regime-aware procurement recommendations
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-fdr">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Materials Analyzed</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-materials-analyzed">
              {materialsAnalyzed}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {materials.length} total materials in catalog
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Forecast Accuracy</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-forecast-accuracy">
              {avgForecastAccuracy.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={avgForecastAccuracy} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Potential Savings</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-potential-savings">
              ${potentialSavings.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {recommendations.filter((r: any) => r.status === "pending").length} pending recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {regime && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Regime-Aware Procurement Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{getRegimeProcurementGuidance()}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            <Package className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">
            <LineChart className="h-4 w-4 mr-2" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">
            <TrendingUp className="h-4 w-4 mr-2" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Optimization Analysis</CardTitle>
              <CardDescription>
                AI-powered analysis of optimal stock levels, reorder points, and safety stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Optimal Stock</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Safety Stock</TableHead>
                    <TableHead>EOQ</TableHead>
                    <TableHead>Stockout Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : optimizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No optimization data available. Run analysis to see recommendations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    optimizations.map((opt: any) => {
                      const material = materials.find((m: any) => m.id === opt.materialId);
                      return (
                        <TableRow key={opt.id} data-testid={`row-optimization-${opt.id}`}>
                          <TableCell className="font-medium">{material?.name || opt.materialId}</TableCell>
                          <TableCell>{opt.currentStock.toFixed(0)}</TableCell>
                          <TableCell className="font-medium text-green-600 dark:text-green-400">
                            {opt.optimalStock.toFixed(0)}
                          </TableCell>
                          <TableCell>{opt.reorderPoint.toFixed(0)}</TableCell>
                          <TableCell>{opt.safetyStock.toFixed(0)}</TableCell>
                          <TableCell>{opt.economicOrderQuantity?.toFixed(0) || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={opt.stockoutRisk || 0} className="h-2 w-16" />
                              <span className="text-sm">{opt.stockoutRisk?.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demand Forecasts</CardTitle>
              <CardDescription>
                ML-based demand predictions with confidence intervals and external factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material/SKU</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Predicted Demand</TableHead>
                    <TableHead>Confidence Interval</TableHead>
                    <TableHead>Seasonality</TableHead>
                    <TableHead>ML Model</TableHead>
                    <TableHead>Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : predictions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No demand predictions available. Models are training on historical data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    predictions.map((pred: any) => {
                      const material = materials.find((m: any) => m.id === pred.materialId);
                      return (
                        <TableRow key={pred.id} data-testid={`row-prediction-${pred.id}`}>
                          <TableCell className="font-medium">{material?.name || 'SKU'}</TableCell>
                          <TableCell>{pred.forecastPeriod}</TableCell>
                          <TableCell className="font-bold">{pred.predictedDemand.toFixed(0)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            [{pred.lowerBound?.toFixed(0)} - {pred.upperBound?.toFixed(0)}]
                          </TableCell>
                          <TableCell>{pred.seasonalityFactor?.toFixed(2) || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pred.mlModel}</Badge>
                          </TableCell>
                          <TableCell>
                            {pred.accuracy ? (
                              <Badge className={pred.accuracy >= 90 ? "bg-green-600" : pred.accuracy >= 75 ? "bg-yellow-600" : ""}>
                                {pred.accuracy.toFixed(1)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {predictions.some((p: any) => p.externalFactors) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">External Economic Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Forecasts incorporate macroeconomic signals, commodity prices, and FDR regime dynamics
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recsLoading ? (
            <Card><CardContent className="p-6">Loading recommendations...</CardContent></Card>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No recommendations at this time. AI is analyzing inventory patterns.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec: any) => (
                <Card key={rec.id} data-testid={`card-recommendation-${rec.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg capitalize">
                            {rec.recommendationType.replace(/_/g, ' ')}
                          </CardTitle>
                          {getPriorityBadge(rec.priority)}
                        </div>
                        <CardDescription>{rec.reasoning}</CardDescription>
                      </div>
                      <Badge 
                        variant={rec.status === "pending" ? "default" : rec.status === "accepted" ? "default" : "secondary"}
                        className={rec.status === "accepted" ? "bg-green-600" : ""}
                      >
                        {rec.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {rec.estimatedSavings && (
                        <div>
                          <div className="text-muted-foreground">Estimated Savings</div>
                          <div className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {rec.estimatedSavings.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {rec.estimatedRisk && (
                        <div>
                          <div className="text-muted-foreground">Risk Level</div>
                          <div className="font-medium">{rec.estimatedRisk}</div>
                        </div>
                      )}
                      {rec.affectedMaterials && (
                        <div>
                          <div className="text-muted-foreground">Affected Materials</div>
                          <div className="font-medium">{rec.affectedMaterials.length} materials</div>
                        </div>
                      )}
                    </div>

                    {rec.recommendedState && (
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-sm font-medium mb-1">Recommended Action</div>
                        <div className="text-xs">
                          {typeof rec.recommendedState === 'string' 
                            ? rec.recommendedState 
                            : JSON.stringify(rec.recommendedState, null, 2)}
                        </div>
                      </div>
                    )}

                    {rec.status === "pending" && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => acceptRecommendationMutation.mutate(rec.id)}
                          data-testid={`button-accept-${rec.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => rejectRecommendationMutation.mutate(rec.id)}
                          data-testid={`button-reject-${rec.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
