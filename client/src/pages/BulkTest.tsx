import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BulkTest() {
  const { toast } = useToast();
  const [scenarioResults, setScenarioResults] = useState<any>(null);
  const [geoResults, setGeoResults] = useState<any>(null);
  const [loading, setLoading] = useState<{ scenarios: boolean; geo: boolean }>({
    scenarios: false,
    geo: false,
  });

  const runScenarioTest = async () => {
    setLoading((prev) => ({ ...prev, scenarios: true }));
    try {
      const response = await fetch("/api/scenarios/bulk-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("Failed to run scenario test");
      
      const data = await response.json();
      setScenarioResults(data);
      
      toast({
        title: "Scenario Test Complete!",
        description: `Ran ${data.totalScenarios} scenarios with ${data.avgConfidence}% avg confidence`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, scenarios: false }));
    }
  };

  const runGeoTest = async () => {
    setLoading((prev) => ({ ...prev, geo: true }));
    try {
      const response = await fetch("/api/geopolitical/bulk-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("Failed to run geopolitical test");
      
      const data = await response.json();
      setGeoResults(data);
      
      toast({
        title: "Geopolitical Test Complete!",
        description: `Ran ${data.totalAssessments} assessments with ${data.avgConfidence}% avg confidence`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, geo: false }));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Bulk Feature Testing</h1>
        <p className="text-muted-foreground">
          Run 1,000 scenarios in each enterprise feature to validate performance and accuracy
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scenario Planning Test */}
        <Card>
          <CardHeader>
            <CardTitle>Scenario Planning Test</CardTitle>
            <CardDescription>Generate and analyze 1,000 economic scenarios</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={runScenarioTest}
              disabled={loading.scenarios}
              className="w-full"
              data-testid="button-run-scenario-test"
            >
              {loading.scenarios ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running 1,000 Scenarios...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Scenario Test
                </>
              )}
            </Button>

            {scenarioResults && (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">
                    {scenarioResults.totalScenarios} Scenarios Complete
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Confidence</span>
                    <Badge variant="secondary">{scenarioResults.avgConfidence}%</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Financial Impact</span>
                    <Badge variant="secondary">
                      ${(scenarioResults.avgFinancialImpact / 1000000).toFixed(2)}M
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Risk Distribution</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="w-full justify-center">
                          Low
                        </Badge>
                        <span className="text-xs">{scenarioResults.riskLevels.low}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="w-full justify-center">
                          Medium
                        </Badge>
                        <span className="text-xs">{scenarioResults.riskLevels.medium}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="w-full justify-center">
                          High
                        </Badge>
                        <span className="text-xs">{scenarioResults.riskLevels.high}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Regime Distribution</span>
                    {Object.entries(scenarioResults.regimeDistribution).map(([regime, count]) => (
                      <div key={regime} className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{regime}</span>
                        <span className="text-xs font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geopolitical Risk Test */}
        <Card>
          <CardHeader>
            <CardTitle>Geopolitical Risk Test</CardTitle>
            <CardDescription>Generate and assess 1,000 geopolitical events</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={runGeoTest}
              disabled={loading.geo}
              className="w-full"
              data-testid="button-run-geo-test"
            >
              {loading.geo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running 1,000 Assessments...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Geopolitical Test
                </>
              )}
            </Button>

            {geoResults && (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">
                    {geoResults.totalAssessments} Assessments Complete
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Confidence</span>
                    <Badge variant="secondary">{geoResults.avgConfidence}%</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Risk Score</span>
                    <Badge variant="secondary">{geoResults.avgRiskScore}/100</Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Severity Distribution</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="w-full justify-center">
                          Low
                        </Badge>
                        <span className="text-xs">{geoResults.severityDistribution.low}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="w-full justify-center">
                          Medium
                        </Badge>
                        <span className="text-xs">{geoResults.severityDistribution.medium}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="w-full justify-center">
                          High
                        </Badge>
                        <span className="text-xs">{geoResults.severityDistribution.high}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Event Type Distribution</span>
                    {Object.entries(geoResults.eventTypeDistribution).map(([eventType, count]) => (
                      <div key={eventType} className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{eventType}</span>
                        <span className="text-xs font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(scenarioResults || geoResults) && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Results</CardTitle>
            <CardDescription>First 10 results from each test</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {scenarioResults?.scenarios && scenarioResults.scenarios.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Scenario Planning Samples</h3>
                <div className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  <pre>{JSON.stringify(scenarioResults.scenarios.slice(0, 3), null, 2)}</pre>
                </div>
              </div>
            )}

            {geoResults?.assessments && geoResults.assessments.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Geopolitical Risk Samples</h3>
                <div className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  <pre>{JSON.stringify(geoResults.assessments.slice(0, 3), null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
