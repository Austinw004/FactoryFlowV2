import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertTriangle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function GeopoliticalRisk() {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  const { data: economicData } = useQuery<{ fdr?: number }>({
    queryKey: ["/api/economics/regime"],
  });

  const currentFDR = (economicData as any)?.fdr || 1.0;

  const assessMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/geopolitical/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to assess risk");
      return await response.json();
    },
    onSuccess: (data: RiskAssessment) => {
      setAssessment(data);
      toast({
        title: "Risk assessment complete",
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

  const handleAssess = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const data = {
      eventType: formData.get('eventType') as string,
      region: formData.get('region') as string,
      severity: formData.get('severity') as string || 'medium',
      description: formData.get('description') as string || '',
      currentFDR,
      commoditiesAffected: [],
      suppliersAffected: [],
      startDate: new Date().toISOString(),
    };

    assessMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
<p className="text-muted-foreground" data-testid="text-page-description">
          Track global events and their impact on supply chains with FDR-aware analysis
        </p>
      </div>

      <Tabs defaultValue="assess">
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="assess" data-testid="tab-assess">
            Risk Assessment
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results" disabled={!assessment}>
            Results {assessment && `(${assessment.region})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assess" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geopolitical Event Assessment</CardTitle>
              <CardDescription>
                Model how global events affect your supply chain and procurement strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssess} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Region/Country *</Label>
                    <Input
                      id="region"
                      name="region"
                      placeholder="e.g., China, Europe, Middle East"
                      required
                      data-testid="input-region"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type *</Label>
                    <Select name="eventType" required>
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
                    <Select name="severity" defaultValue="medium" required>
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
                    <Label>Current FDR</Label>
                    <Input
                      value={currentFDR.toFixed(2)}
                      disabled
                      data-testid="input-current-fdr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Event Description (Optional)</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Describe the geopolitical event..."
                    data-testid="input-description"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAssessment(null)}
                    data-testid="button-clear"
                  >
                    Clear Results
                  </Button>
                  <Button
                    type="submit"
                    disabled={assessMutation.isPending}
                    data-testid="button-assess"
                  >
                    {assessMutation.isPending ? "Assessing..." : "Assess Risk"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {assessment && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="card-risk-level">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${
                      assessment.riskLevel === 'critical' ? 'text-red-600' :
                      assessment.riskLevel === 'high' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`} />
                  </CardHeader>
                  <CardContent>
                    <Badge variant={
                      assessment.riskLevel === 'critical' ? 'destructive' : 'default'
                    } className="mb-2">
                      {assessment.riskLevel.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      FDR Impact: {(assessment.fdrImpact * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-exposure">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Exposure Score</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{assessment.exposureScore}/100</div>
                    <p className="text-xs text-muted-foreground">
                      How much you're affected
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-mitigation-cost">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mitigation Cost</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${(assessment.mitigationCost / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Estimated to mitigate
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-confidence">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confidence</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{assessment.confidence}%</div>
                    <p className="text-xs text-muted-foreground">
                      Assessment reliability
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Supply Chain Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {assessment.supplyChainImpact}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Procurement Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {assessment.procurementImpact}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>FDR-Aware Recommendations</CardTitle>
                  <CardDescription>
                    Actions prioritized with dual-circuit economic context
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {assessment.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg" data-testid={`rec-${idx}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={rec.priority === 'critical' ? 'destructive' : 'default'}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{rec.action}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Timeline: {rec.timeline}
                          </p>
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            <span className="font-medium">FDR Context: </span>
                            {rec.fdrContext}
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
