import { getRegimeBadge } from "@/components/RegimeBadge";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  Gauge,
  BarChart3,
  Zap,
  PlayCircle,
  PauseCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function ProductionKPIs() {
  const { toast } = useToast();
  const [openRunDialog, setOpenRunDialog] = useState(false);

  // Fetch production runs
  const { data: productionRuns = [] as any[], isLoading: runsLoading } = useQuery<any[]>({
    queryKey: ["/api/production/runs"],
  });

  // Fetch current regime
  const { data: regime } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  // Create production run mutation
  const createRunMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("POST", "/api/production/runs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/runs"] });
      toast({ title: "Production run created successfully" });
      setOpenRunDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to create production run", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateRun = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plannedUnits = parseInt(formData.get("plannedUnits") as string);
    const producedUnits = parseInt(formData.get("producedUnits") as string);
    const defectUnits = parseInt(formData.get("defectUnits") as string);
    const plannedDuration = parseInt(formData.get("plannedDuration") as string);
    const downtimeMinutes = parseInt(formData.get("downtimeMinutes") as string);
    const targetCycleTime = parseFloat(formData.get("targetCycleTime") as string);

    createRunMutation.mutate({
      productLine: formData.get("productLine"),
      startTime: new Date(formData.get("startTime") as string).toISOString(),
      endTime: new Date(formData.get("endTime") as string).toISOString(),
      plannedUnits,
      producedUnits,
      defectUnits,
      plannedDuration,
      downtimeMinutes,
      targetCycleTime,
      notes: formData.get("notes") || null,
    });
  };

  const calculateOEE = (run: any) => {
    const actualOperatingTime = run.plannedDuration - run.downtimeMinutes;
    const availability = run.plannedDuration > 0 ? (actualOperatingTime / run.plannedDuration) * 100 : 0;
    
    const theoreticalMax = run.targetCycleTime > 0 
      ? (actualOperatingTime * 60) / run.targetCycleTime 
      : run.producedUnits;
    const performance = theoreticalMax > 0 ? (run.producedUnits / theoreticalMax) * 100 : 0;
    
    const goodUnits = run.producedUnits - run.defectUnits;
    const quality = run.producedUnits > 0 ? (goodUnits / run.producedUnits) * 100 : 0;
    
    const oee = (availability * performance * quality) / 10000;
    
    return { oee, availability, performance, quality };
  };

  // OEE badge — palette-aligned (good/bone/signal/bad) instead of the
  // rainbow bg-green-600 / bg-blue-600 / bg-yellow-600 / destructive.
  // Same threshold semantics: World Class >=85, Good >=75, Fair >=60, Poor below.
  const getOEEBadge = (oee: number) => {
    const v = oee.toFixed(1);
    if (oee >= 85) return <Badge variant="outline" className="bg-good/20 text-good border-good/30">World Class ({v}%)</Badge>;
    if (oee >= 75) return <Badge variant="outline" className="bg-bone/10 text-bone border-bone/20">Good ({v}%)</Badge>;
    if (oee >= 60) return <Badge variant="outline" className="bg-signal/20 text-signal border-signal/30">Fair ({v}%)</Badge>;
    return <Badge variant="outline" className="bg-bad/20 text-bad border-bad/30">Poor ({v}%)</Badge>;
  };

  // Regime badge logic moved to @/components/RegimeBadge — single source
  // of truth across the app, palette-aligned (good/signal/bad/bone tones
  // instead of bg-green-600 / bg-orange-600 / bg-red-600 / bg-blue-600).

  // Calculate aggregate stats
  const aggregateStats = productionRuns.reduce((acc: any, run: any) => {
    const metrics = calculateOEE(run);
    return {
      totalRuns: acc.totalRuns + 1,
      totalUnits: acc.totalUnits + run.producedUnits,
      totalDefects: acc.totalDefects + run.defectUnits,
      totalDowntime: acc.totalDowntime + run.downtimeMinutes,
      avgOEE: acc.avgOEE + metrics.oee,
      avgAvailability: acc.avgAvailability + metrics.availability,
      avgPerformance: acc.avgPerformance + metrics.performance,
      avgQuality: acc.avgQuality + metrics.quality,
    };
  }, { 
    totalRuns: 0, 
    totalUnits: 0, 
    totalDefects: 0, 
    totalDowntime: 0,
    avgOEE: 0,
    avgAvailability: 0,
    avgPerformance: 0,
    avgQuality: 0,
  });

  if (aggregateStats.totalRuns > 0) {
    aggregateStats.avgOEE /= aggregateStats.totalRuns;
    aggregateStats.avgAvailability /= aggregateStats.totalRuns;
    aggregateStats.avgPerformance /= aggregateStats.totalRuns;
    aggregateStats.avgQuality /= aggregateStats.totalRuns;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
<p className="text-muted-foreground mt-1">
            Real-time OEE tracking, bottleneck detection, and regime-aware production intelligence
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average OEE</CardDescription>
            <CardTitle className="text-3xl">
              {aggregateStats.avgOEE.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={aggregateStats.avgOEE} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {aggregateStats.avgOEE >= 85 ? "World Class" : aggregateStats.avgOEE >= 60 ? "Above Average" : "Needs Improvement"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Availability</CardDescription>
            <CardTitle className="text-3xl">
              {aggregateStats.avgAvailability.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={aggregateStats.avgAvailability} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {aggregateStats.totalDowntime.toFixed(0)} min total downtime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Performance</CardDescription>
            <CardTitle className="text-3xl">
              {aggregateStats.avgPerformance.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={aggregateStats.avgPerformance} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {aggregateStats.totalUnits} units produced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Quality</CardDescription>
            <CardTitle className="text-3xl">
              {aggregateStats.avgQuality.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={aggregateStats.avgQuality} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {aggregateStats.totalDefects} defects total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runs" data-testid="tab-runs">
            <PlayCircle className="h-4 w-4 mr-2" />
            Production Runs
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Regime Insights
          </TabsTrigger>
          <TabsTrigger value="guide" data-testid="tab-guide">
            <BarChart3 className="h-4 w-4 mr-2" />
            OEE Guide
          </TabsTrigger>
        </TabsList>

        {/* Production Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Production Runs</h2>
            <Dialog open={openRunDialog} onOpenChange={setOpenRunDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-run">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Log Production Run
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Log Production Run</DialogTitle>
                  <DialogDescription>
                    Record production metrics for OEE calculation
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateRun}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="col-span-2">
                      <Label htmlFor="productLine">Product Line</Label>
                      <Input 
                        id="productLine" 
                        name="productLine" 
                        placeholder="Assembly Line A" 
                        required 
                        data-testid="input-product-line"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input 
                        id="startTime" 
                        name="startTime" 
                        type="datetime-local"
                        required 
                        data-testid="input-start-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input 
                        id="endTime" 
                        name="endTime" 
                        type="datetime-local"
                        required 
                        data-testid="input-end-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plannedUnits">Planned Units</Label>
                      <Input 
                        id="plannedUnits" 
                        name="plannedUnits" 
                        type="number"
                        placeholder="1000"
                        required 
                        data-testid="input-planned-units"
                      />
                    </div>
                    <div>
                      <Label htmlFor="producedUnits">Produced Units</Label>
                      <Input 
                        id="producedUnits" 
                        name="producedUnits" 
                        type="number"
                        placeholder="950"
                        required 
                        data-testid="input-produced-units"
                      />
                    </div>
                    <div>
                      <Label htmlFor="defectUnits">Defect Units</Label>
                      <Input 
                        id="defectUnits" 
                        name="defectUnits" 
                        type="number"
                        placeholder="25"
                        defaultValue="0"
                        required 
                        data-testid="input-defect-units"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plannedDuration">Planned Duration (minutes)</Label>
                      <Input 
                        id="plannedDuration" 
                        name="plannedDuration" 
                        type="number"
                        placeholder="480"
                        required 
                        data-testid="input-planned-duration"
                      />
                    </div>
                    <div>
                      <Label htmlFor="downtimeMinutes">Downtime (minutes)</Label>
                      <Input 
                        id="downtimeMinutes" 
                        name="downtimeMinutes" 
                        type="number"
                        placeholder="45"
                        defaultValue="0"
                        required 
                        data-testid="input-downtime"
                      />
                    </div>
                    <div>
                      <Label htmlFor="targetCycleTime">Target Cycle Time (seconds/unit)</Label>
                      <Input 
                        id="targetCycleTime" 
                        name="targetCycleTime" 
                        type="number"
                        step="0.1"
                        placeholder="30.0"
                        required 
                        data-testid="input-cycle-time"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea 
                        id="notes" 
                        name="notes" 
                        placeholder="Production notes, issues encountered, etc."
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createRunMutation.isPending} data-testid="button-submit-run">
                      {createRunMutation.isPending ? "Logging..." : "Log Production Run"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {runsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading production runs...</div>
          ) : productionRuns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No production runs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Log your first production run to start tracking OEE
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {productionRuns.map((run: any) => {
                const metrics = calculateOEE(run);
                return (
                  <Card key={run.id} className="hover-elevate" data-testid={`card-run-${run.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Gauge className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{run.productLine}</CardTitle>
                            {getOEEBadge(metrics.oee)}
                          </div>
                          <CardDescription>
                            {run.startTime && format(new Date(run.startTime), "MMM d, yyyy h:mm a")} 
                            {run.endTime && ` - ${format(new Date(run.endTime), "h:mm a")}`}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-primary">
                            {metrics.oee.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Overall OEE</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Availability</div>
                          <div className="text-xl font-semibold">{metrics.availability.toFixed(1)}%</div>
                          <Progress value={metrics.availability} className="h-1 mt-1" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Performance</div>
                          <div className="text-xl font-semibold">{metrics.performance.toFixed(1)}%</div>
                          <Progress value={metrics.performance} className="h-1 mt-1" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Quality</div>
                          <div className="text-xl font-semibold">{metrics.quality.toFixed(1)}%</div>
                          <Progress value={metrics.quality} className="h-1 mt-1" />
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Planned</div>
                          <div className="font-semibold">{run.plannedUnits} units</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Produced</div>
                          <div className="font-semibold">{run.producedUnits} units</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Defects</div>
                          <div className="font-semibold text-destructive">{run.defectUnits} units</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Downtime</div>
                          <div className="font-semibold">{run.downtimeMinutes} min</div>
                        </div>
                      </div>

                      {run.notes && (
                        <>
                          <Separator />
                          <div>
                            <div className="text-sm font-medium mb-1">Notes</div>
                            <p className="text-sm text-muted-foreground">{run.notes}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Regime Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <h2 className="text-xl font-semibold">Regime-Aware Production Strategy</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Current Regime Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {regime && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Economic Regime:</span>
                      {getRegimeBadge(regime.regime)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">FDR Score:</span>
                      <span className="text-xl font-bold">{regime.fdr.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Production Strategy:</p>
                      {regime.regime === "HEALTHY_EXPANSION" && (
                        <div className="bg-good/15 dark:bg-green-950 p-3 rounded-lg border border-good/30 dark:border-good/30">
                          <p className="text-green-900 dark:text-green-100">
                            <strong>Optimize for Growth:</strong> Invest in capacity expansion and automation. Focus on scaling production to meet increasing demand while maintaining quality standards.
                          </p>
                        </div>
                      )}
                      {regime.regime === "ASSET_LED_GROWTH" && (
                        <div className="bg-signal/15 dark:bg-orange-950 p-3 rounded-lg border border-signal/30 dark:border-signal/30">
                          <p className="text-orange-900 dark:text-orange-100">
                            <strong>Balance Expansion with Efficiency:</strong> Focus on productivity improvements over capacity additions. Optimize existing lines before adding new equipment.
                          </p>
                        </div>
                      )}
                      {regime.regime === "IMBALANCED_EXCESS" && (
                        <div className="bg-bad/15 dark:bg-red-950 p-3 rounded-lg border border-bad/30 dark:border-bad/30">
                          <p className="text-red-900 dark:text-red-100">
                            <strong>Defensive Posture:</strong> Reduce production costs and improve margins. Delay non-critical capex. Focus on operational efficiency and waste reduction.
                          </p>
                        </div>
                      )}
                      {regime.regime === "REAL_ECONOMY_LEAD" && (
                        <div className="bg-muted/15 dark:bg-blue-950 p-3 rounded-lg border border-muted/30 dark:border-muted/30">
                          <p className="text-blue-900 dark:text-blue-100">
                            <strong>Capitalize on Growth:</strong> Increase capacity to meet demand surge. Lock in favorable supplier contracts. This is the time to invest aggressively in production capability.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Performance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aggregateStats.avgOEE < 60 && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-destructive">Low OEE Detected</p>
                      <p className="text-muted-foreground">
                        Average OEE is {aggregateStats.avgOEE.toFixed(1)}%, below the 60% threshold. Investigate downtime and quality issues.
                      </p>
                    </div>
                  </div>
                )}
                {aggregateStats.avgAvailability < 80 && (
                  <div className="flex items-start gap-2 p-3 bg-signal/15 dark:bg-yellow-950 border border-signal/30 dark:border-signal/30 rounded-lg">
                    <Clock className="h-5 w-5 text-signal flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-900 dark:text-yellow-100">High Downtime</p>
                      <p className="text-muted-foreground">
                        Availability is {aggregateStats.avgAvailability.toFixed(1)}%. Review maintenance schedules and breakdown patterns.
                      </p>
                    </div>
                  </div>
                )}
                {aggregateStats.avgQuality < 95 && (
                  <div className="flex items-start gap-2 p-3 bg-signal/15 dark:bg-orange-950 border border-signal/30 dark:border-signal/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-signal flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-orange-900 dark:text-orange-100">Quality Concerns</p>
                      <p className="text-muted-foreground">
                        Quality rate is {aggregateStats.avgQuality.toFixed(1)}%. Investigate defect causes and implement corrective actions.
                      </p>
                    </div>
                  </div>
                )}
                {aggregateStats.avgOEE >= 85 && (
                  <div className="flex items-start gap-2 p-3 bg-good/15 dark:bg-green-950 border border-good/30 dark:border-good/30 rounded-lg">
                    <Zap className="h-5 w-5 text-good flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-900 dark:text-green-100">World-Class Performance</p>
                      <p className="text-muted-foreground">
                        Excellent work! OEE is at {aggregateStats.avgOEE.toFixed(1)}%, in world-class territory. Maintain current standards.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OEE Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Understanding OEE (Overall Equipment Effectiveness)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">The OEE Formula</h3>
                <p className="font-mono text-sm mb-3">OEE = Availability × Performance × Quality</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Availability</strong> = (Operating Time / Planned Time) × 100
                    <p className="text-muted-foreground ml-4">Measures equipment uptime vs. planned production time</p>
                  </div>
                  <div>
                    <strong>Performance</strong> = (Actual Production / Theoretical Max Production) × 100
                    <p className="text-muted-foreground ml-4">Measures speed efficiency against ideal cycle time</p>
                  </div>
                  <div>
                    <strong>Quality</strong> = (Good Units / Total Units) × 100
                    <p className="text-muted-foreground ml-4">Measures first-pass yield without defects</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">OEE Benchmarks</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-good/15 dark:bg-green-950 rounded">
                    <span className="font-medium">World Class</span>
                    <Badge className="bg-green-600">85%+</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/15 dark:bg-blue-950 rounded">
                    <span className="font-medium">Good</span>
                    <Badge className="bg-blue-600">75-85%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-signal/15 dark:bg-yellow-950 rounded">
                    <span className="font-medium">Fair / Typical</span>
                    <Badge className="bg-yellow-600">60-75%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-bad/15 dark:bg-red-950 rounded">
                    <span className="font-medium">Poor / Needs Improvement</span>
                    <Badge variant="destructive">&lt;60%</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">How to Improve OEE</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Reduce Downtime:</strong> Implement preventive maintenance, reduce changeover times, minimize unplanned breakdowns</li>
                  <li><strong className="text-foreground">Increase Speed:</strong> Eliminate minor stoppages, optimize cycle times, train operators on efficiency</li>
                  <li><strong className="text-foreground">Improve Quality:</strong> Reduce defects through process control, better materials, operator training</li>
                  <li><strong className="text-foreground">Track & Analyze:</strong> Consistent data collection reveals patterns and bottlenecks</li>
                  <li><strong className="text-foreground">Regime Alignment:</strong> Adjust improvement priorities based on economic conditions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
