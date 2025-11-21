import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, Building2, Clock } from "lucide-react";
import type { MaTarget, MaRecommendation } from "@shared/schema";

export default function MAIntelligence() {
  const { data: targets = [] } = useQuery<MaTarget[]>({
    queryKey: ["/api/ma/targets"],
  });

  const { data: recommendations = [] } = useQuery<MaRecommendation[]>({
    queryKey: ["/api/ma/recommendations"],
  });

  const acquisitions = targets.filter(t => t.targetType === 'acquisition');
  const divestitures = targets.filter(t => t.targetType === 'divestiture');
  const topTargets = targets.filter(t => (t.timingScore || 0) >= 80);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          M&A Intelligence
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          FDR-based acquisition targeting and optimal deal timing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-targets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-targets-count">
              {targets.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {acquisitions.length} acquisitions, {divestitures.length} divestitures
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-hot-opportunities">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-hot-count">
              {topTargets.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Timing score ≥ 80
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-recommendations">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recommendations-count">
              {recommendations.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active recommendations
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-regime-timing">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regime Timing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" data-testid="badge-timing-status">
              Favorable
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Current economic regime
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="targets">
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="targets" data-testid="tab-targets">
            Target Explorer ({targets.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">
            Recommendations ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="valuation" data-testid="tab-valuation">
            Valuation Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-4">
          {targets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No M&A targets yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Add acquisition or divestiture targets to analyze timing and valuations
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {targets.map((target) => (
                <Card key={target.id} data-testid={`card-target-${target.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base">{target.targetName}</CardTitle>
                          <Badge 
                            variant={target.targetType === 'acquisition' ? 'default' : 'secondary'}
                            data-testid={`badge-target-type-${target.id}`}
                          >
                            {target.targetType}
                          </Badge>
                          {target.status && (
                            <Badge variant="outline" data-testid={`badge-target-status-${target.id}`}>
                              {target.status}
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {target.targetIndustry && `${target.targetIndustry} • `}
                          {target.targetRevenue && `$${(target.targetRevenue / 1_000_000).toFixed(1)}M revenue`}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium mb-1">Timing Score</div>
                        <div className="text-2xl font-bold">
                          {target.timingScore?.toFixed(0) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {target.estimatedValue && (
                        <div>
                          <div className="text-sm text-muted-foreground">Market Value</div>
                          <div className="text-lg font-semibold">
                            ${(target.estimatedValue / 1_000_000).toFixed(1)}M
                          </div>
                        </div>
                      )}
                      {target.fdrAdjustedValue && (
                        <div>
                          <div className="text-sm text-muted-foreground">FDR-Adjusted</div>
                          <div className="text-lg font-semibold">
                            ${(target.fdrAdjustedValue / 1_000_000).toFixed(1)}M
                          </div>
                        </div>
                      )}
                      {target.strategicFitScore && (
                        <div>
                          <div className="text-sm text-muted-foreground">Strategic Fit</div>
                          <div className="text-lg font-semibold">
                            {target.strategicFitScore.toFixed(0)}/100
                          </div>
                        </div>
                      )}
                      {target.optimalRegimeForDeal && (
                        <div>
                          <div className="text-sm text-muted-foreground">Optimal Regime</div>
                          <div className="text-sm font-medium">
                            {target.optimalRegimeForDeal}
                          </div>
                        </div>
                      )}
                    </div>
                    {target.timingRationale && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-1">Timing Rationale</div>
                        <div className="text-sm text-muted-foreground">
                          {target.timingRationale}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  M&A recommendations will appear here based on current economic conditions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <Card key={rec.id} data-testid={`card-recommendation-${rec.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base">{rec.title}</CardTitle>
                          <Badge 
                            variant={rec.recommendationType === 'buy_now' || rec.recommendationType === 'sell_now' ? 'default' : 'secondary'}
                            data-testid={`badge-rec-type-${rec.id}`}
                          >
                            {rec.recommendationType}
                          </Badge>
                        </div>
                        <CardDescription>{rec.summary}</CardDescription>
                      </div>
                      {rec.confidence && (
                        <div className="text-right">
                          <div className="text-sm font-medium mb-1">Confidence</div>
                          <div className="text-2xl font-bold">{rec.confidence.toFixed(0)}%</div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {rec.detailedRationale && (
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {rec.detailedRationale}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FDR-Based Valuation Calculator</CardTitle>
              <CardDescription>
                Adjust valuations based on economic regime and FDR context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The valuation calculator uses the current FDR (Financial-to-Real Divergence) ratio to adjust M&A valuations:
                </p>
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  <li><strong>Imbalanced Excess:</strong> Apply 15% discount for acquisitions (asset bubble)</li>
                  <li><strong>Real Economy Lead:</strong> Apply 10% discount (good buying opportunity)</li>
                  <li><strong>Asset-Led Growth:</strong> Apply 15% premium (assets expensive)</li>
                  <li><strong>Healthy Expansion:</strong> Use market valuations (balanced conditions)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Add M&A targets to see FDR-adjusted valuations and timing recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
