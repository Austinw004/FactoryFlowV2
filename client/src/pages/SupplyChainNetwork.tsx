import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Shield, AlertCircle, CheckCircle2, Network } from "lucide-react";
import type { SupplierNode, SupplierRiskAlert } from "@shared/schema";

export default function SupplyChainNetwork() {
  const [selectedNode, setSelectedNode] = useState<SupplierNode | null>(null);

  const { data: nodes = [], isLoading: nodesLoading } = useQuery<SupplierNode[]>({
    queryKey: ['/api/supply-chain/nodes'],
  });

  const { data: criticalNodes = [] } = useQuery<SupplierNode[]>({
    queryKey: ['/api/supply-chain/nodes/critical'],
  });

  const { data: activeAlerts = [] } = useQuery<SupplierRiskAlert[]>({
    queryKey: ['/api/supply-chain/alerts'],
    queryFn: () => fetch('/api/supply-chain/alerts?active=true').then(r => r.json()),
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) =>
      fetch(`/api/supply-chain/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain/alerts'] });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: (alertId: string) =>
      fetch(`/api/supply-chain/alerts/${alertId}/resolve`, {
        method: 'PUT',
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain/alerts'] });
    },
  });

  const getCriticalityColor = (criticality: string) => {
    const colors = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colors[criticality as keyof typeof colors] || 'bg-gray-500';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getHealthIcon = (score?: number | null) => {
    if (!score) return <Activity className="w-4 h-4 text-gray-400" data-testid="icon-health-unknown" />;
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-good" data-testid="icon-health-good" />;
    if (score >= 50) return <Activity className="w-4 h-4 text-signal" data-testid="icon-health-moderate" />;
    return <TrendingDown className="w-4 h-4 text-bad" data-testid="icon-health-poor" />;
  };

  const statsCards = [
    {
      title: "Total Suppliers",
      value: nodes.length,
      icon: Network,
      color: "text-blue-500",
      testId: "stat-total-suppliers",
    },
    {
      title: "Critical Suppliers",
      value: criticalNodes.length,
      icon: Shield,
      color: "text-red-500",
      testId: "stat-critical-suppliers",
    },
    {
      title: "Active Alerts",
      value: activeAlerts.length,
      icon: AlertTriangle,
      color: "text-orange-500",
      testId: "stat-active-alerts",
    },
    {
      title: "Avg Health Score",
      value: nodes.length > 0
        ? Math.round(nodes.reduce((sum, n) => sum + (n.financialHealthScore || 50), 0) / nodes.length)
        : 0,
      icon: Activity,
      color: "text-green-500",
      testId: "stat-avg-health",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
<p className="text-muted-foreground">FDR-aware supplier risk monitoring and network analysis</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={stat.testId}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Risk Alerts {activeAlerts.length > 0 && `(${activeAlerts.length})`}
          </TabsTrigger>
          <TabsTrigger value="critical" data-testid="tab-critical">Critical Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Network</CardTitle>
              <CardDescription>All suppliers with health and risk metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {nodesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
              ) : nodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No supplier nodes found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Criticality</TableHead>
                        <TableHead>Health Score</TableHead>
                        <TableHead>Bankruptcy Risk</TableHead>
                        <TableHead>On-Time %</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Region</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nodes.map((node) => (
                        <TableRow 
                          key={node.id} 
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedNode(node)}
                          data-testid={`row-supplier-${node.id}`}
                        >
                          <TableCell className="font-medium" data-testid={`text-supplier-name-${node.id}`}>
                            <div className="flex items-center gap-2">
                              {getHealthIcon(node.financialHealthScore)}
                              <span>Supplier {node.supplierId.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-tier-${node.id}`}>Tier {node.tier}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getCriticalityColor(node.criticality)}`} />
                              <span className="capitalize" data-testid={`text-criticality-${node.id}`}>{node.criticality}</span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-health-score-${node.id}`}>
                            {node.financialHealthScore?.toFixed(0) || 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`text-bankruptcy-risk-${node.id}`}>
                            <Badge variant={node.bankruptcyRisk && node.bankruptcyRisk > 50 ? "destructive" : "secondary"}>
                              {node.bankruptcyRisk?.toFixed(0) || 'N/A'}%
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-delivery-rate-${node.id}`}>
                            {node.onTimeDeliveryRate?.toFixed(0) || 'N/A'}%
                          </TableCell>
                          <TableCell data-testid={`text-quality-score-${node.id}`}>
                            {node.qualityScore?.toFixed(0) || 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`text-region-${node.id}`}>
                            {node.region || 'Unknown'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-good mb-4" />
                  <h3 className="text-lg font-semibold">No Active Alerts</h3>
                  <p className="text-muted-foreground">All suppliers are operating within normal parameters</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} data-testid={`card-alert-${alert.id}`}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-signal flex-shrink-0" />
                          <CardTitle className="text-lg" data-testid={`text-alert-title-${alert.id}`}>{alert.title}</CardTitle>
                        </div>
                        <Badge className={getSeverityColor(alert.severity)} data-testid={`badge-severity-${alert.id}`}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="ml-2" data-testid={`badge-type-${alert.id}`}>
                          {alert.alertType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!alert.acknowledgedAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert.mutate(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                            data-testid={`button-acknowledge-${alert.id}`}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => resolveAlert.mutate(alert.id)}
                          disabled={resolveAlert.isPending}
                          data-testid={`button-resolve-${alert.id}`}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground" data-testid={`text-description-${alert.id}`}>{alert.description}</p>
                    
                    {alert.recommendedAction && (
                      <div className="bg-muted/15 dark:bg-muted/15 p-4 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2">Recommended Action</h4>
                        <p className="text-sm" data-testid={`text-action-${alert.id}`}>{alert.recommendedAction}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {alert.fdr && (
                        <div>
                          <span className="text-muted-foreground">FDR:</span>
                          <span className="ml-2 font-medium" data-testid={`text-fdr-${alert.id}`}>{alert.fdr.toFixed(2)}</span>
                        </div>
                      )}
                      {alert.regime && (
                        <div>
                          <span className="text-muted-foreground">Regime:</span>
                          <span className="ml-2 font-medium" data-testid={`text-regime-${alert.id}`}>{formatRegimeName(alert.regime)}</span>
                        </div>
                      )}
                      {alert.riskScore && (
                        <div>
                          <span className="text-muted-foreground">Risk Score:</span>
                          <span className="ml-2 font-medium" data-testid={`text-risk-score-${alert.id}`}>{alert.riskScore.toFixed(0)}</span>
                        </div>
                      )}
                      {alert.downstreamRisk && (
                        <div>
                          <span className="text-muted-foreground">Downstream Risk:</span>
                          <span className="ml-2 font-medium" data-testid={`text-downstream-${alert.id}`}>{alert.downstreamRisk.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>

                    {alert.estimatedImpact && (
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Estimated Impact: </span>
                        <span className="text-sm font-semibold text-bad" data-testid={`text-impact-${alert.id}`}>
                          ${alert.estimatedImpact.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical Suppliers</CardTitle>
              <CardDescription>High and critical priority suppliers requiring close monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              {criticalNodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No critical suppliers found</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {criticalNodes.map((node) => (
                    <Card key={node.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedNode(node)} data-testid={`card-critical-${node.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base" data-testid={`text-critical-name-${node.id}`}>
                              Supplier {node.supplierId.slice(0, 8)}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">Tier {node.tier}</Badge>
                              <Badge className={getCriticalityColor(node.criticality) + ' text-white'}>
                                {node.criticality}
                              </Badge>
                            </div>
                          </div>
                          {getHealthIcon(node.financialHealthScore)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Health:</span>
                          <span className="font-medium">{node.financialHealthScore?.toFixed(0) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bankruptcy Risk:</span>
                          <span className="font-medium text-bad">{node.bankruptcyRisk?.toFixed(0) || 'N/A'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivery:</span>
                          <span className="font-medium">{node.onTimeDeliveryRate?.toFixed(0) || 'N/A'}%</span>
                        </div>
                        {node.region && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Region:</span>
                            <span className="font-medium">{node.region}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
