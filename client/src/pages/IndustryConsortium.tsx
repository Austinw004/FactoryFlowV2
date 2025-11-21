import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Users, AlertCircle, BarChart3, Shield } from "lucide-react";
import type { ConsortiumAlert, ConsortiumMetrics } from "@shared/schema";

interface BenchmarkData {
  myPerformance: number;
  industryMedian: number;
  percentileRank: number;
  gap: number;
}

export default function IndustryConsortium() {
  // Fetch consortium alerts
  const { data: alerts = [] } = useQuery<ConsortiumAlert[]>({
    queryKey: ["/api/consortium/alerts"],
  });

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Industry Data Consortium
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Anonymous peer benchmarking and early warning system powered by collective intelligence
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-privacy-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="gap-1" data-testid="badge-privacy-protected">
              Protected
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              All data cryptographically anonymized
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-consortium-size">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consortium Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-consortium-count">
              150+
            </div>
            <p className="text-xs text-muted-foreground">
              Contributing manufacturers
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-alerts-count">
              {alerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {criticalAlerts.length} critical, {warningAlerts.length} warnings
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-benchmarking-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benchmarking</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" data-testid="badge-benchmarking-active">
              Active
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Real-time peer comparisons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="benchmarks">
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="benchmarks" data-testid="tab-benchmarks">
            Peer Benchmarks
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Early Warnings ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            Privacy & Opt-In
          </TabsTrigger>
        </TabsList>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarking</CardTitle>
              <CardDescription>
                Compare your performance to industry peers with complete anonymity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sample Benchmark Display */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Overall Equipment Effectiveness (OEE)</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your performance vs industry median
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">82.5%</div>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      +5.2% vs peers
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Procurement Savings</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cost reduction vs market prices
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">8.3%</div>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      Top 25th percentile
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Workforce Turnover</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Annual employee turnover rate
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">12.1%</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Minus className="h-4 w-4" />
                      At industry median
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full" data-testid="button-refresh-benchmarks">
                  Refresh Benchmarks
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active alerts</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  The consortium will notify you when early warning signals are detected
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} data-testid={`card-alert-${alert.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base">{alert.title}</CardTitle>
                          <Badge 
                            variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'default' : 'secondary'}
                            data-testid={`badge-alert-severity-${alert.id}`}
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <CardDescription>{alert.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alert.peerAction && (
                        <div>
                          <span className="text-sm font-medium">Peer Action: </span>
                          <span className="text-sm text-muted-foreground">{alert.peerAction}</span>
                        </div>
                      )}
                      {alert.recommendedAction && (
                        <div>
                          <span className="text-sm font-medium">Recommended: </span>
                          <span className="text-sm text-muted-foreground">{alert.recommendedAction}</span>
                        </div>
                      )}
                      {alert.signalStrength && (
                        <div>
                          <span className="text-sm font-medium">Confidence: </span>
                          <span className="text-sm text-muted-foreground">{alert.signalStrength}%</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data Protection</CardTitle>
              <CardDescription>
                How your data is anonymized and protected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Cryptographic Anonymization</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your company ID is hashed using SHA-256 - mathematically impossible to reverse-engineer
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Aggregate-Only Data</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Only aggregated metrics are shared - no individual company data is ever exposed
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Opt-In Control</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      You control what data you contribute and can opt out at any time
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Data Retention</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      All contributed data is automatically deleted after 2 years
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Contribution Status</h4>
                    <p className="text-sm text-muted-foreground">
                      Currently opted in and contributing
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
