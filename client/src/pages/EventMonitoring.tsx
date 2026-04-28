import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Globe, 
  TrendingDown,
  Ship,
  Scale,
  CloudLightning,
  FileText,
  Package,
  Users,
  DollarSign,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Activity,
  MapPin
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsAlert {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relevanceScore: number;
  companyRelevanceScore?: number;
  relevanceReasons?: string[];
  isDirectlyRelevant?: boolean;
  affectedRegions: string[];
  affectedCommodities: string[];
  keywords: string[];
  fdrImpact?: number;
  fdrContext?: string;
  recommendations?: Array<{
    action: string;
    priority: string;
    timeline: string;
    fdrContext: string;
  }>;
  riskLevel?: string;
}

interface AlertsResponse {
  alerts: NewsAlert[];
  total: number;
  lastUpdated: string;
  categories: Array<{ id: string; label: string }>;
  companyContext?: {
    industry?: string;
    materialsTracked: number;
    regionsMonitored: number;
  };
  // Data source transparency - Integration Integrity Mandate
  dataSource?: 'newsapi' | 'unavailable';
  unavailableReason?: string;
}

interface SummaryResponse {
  totalAlerts: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
  topCommoditiesAffected: string[];
  averageRelevanceScore: number;
  criticalAlerts: NewsAlert[];
  lastUpdated: string;
}

const categoryIcons: Record<string, typeof Ship> = {
  port_closure: Ship,
  trade_dispute: Scale,
  natural_disaster: CloudLightning,
  regulatory_change: FileText,
  supplier_distress: TrendingDown,
  supply_chain_disruption: Package,
  commodity_shortage: Package,
  labor_strike: Users,
  geopolitical_tension: Globe,
  economic_crisis: DollarSign
};

const categoryLabels: Record<string, string> = {
  port_closure: 'Port Closure',
  trade_dispute: 'Trade Dispute',
  natural_disaster: 'Natural Disaster',
  regulatory_change: 'Regulatory Change',
  supplier_distress: 'Supplier Distress',
  supply_chain_disruption: 'Supply Chain',
  commodity_shortage: 'Commodity Shortage',
  labor_strike: 'Labor Strike',
  geopolitical_tension: 'Geopolitical',
  economic_crisis: 'Economic Crisis'
};

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  low: 'bg-green-500/15 text-green-700 border-green-500/30'
};

export default function EventMonitoring() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<NewsAlert | null>(null);

  const { data: economicData } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  const currentFDR = economicData?.fdr || 1.0;

  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<AlertsResponse>({
    queryKey: ["/api/news/alerts", categoryFilter, severityFilter, currentFDR],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('fdr', currentFDR.toString());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      const res = await fetch(`/api/news/alerts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryResponse>({
    queryKey: ["/api/news/summary", currentFDR],
    queryFn: async () => {
      const res = await fetch(`/api/news/summary?fdr=${currentFDR}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const alerts = alertsData?.alerts || [];
  const categories = alertsData?.categories || [];
  const companyContext = alertsData?.companyContext;
  const directlyRelevantCount = alerts.filter(a => a.isDirectlyRelevant).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
<p className="text-muted-foreground" data-testid="text-page-description">
              Real-time supply chain intelligence with FDR-aware analysis
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetchAlerts()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>


      {companyContext && (companyContext.materialsTracked > 0 || companyContext.regionsMonitored > 0 || companyContext.industry) && (
        <Card className="border-primary/20 bg-primary/5" data-testid="card-company-context">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-medium">Personalized for your operations:</span>
                </div>
                {companyContext.industry && (
                  <span className="text-muted-foreground">
                    Industry: <span className="font-medium text-foreground">{companyContext.industry}</span>
                  </span>
                )}
                {companyContext.materialsTracked > 0 && (
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{companyContext.materialsTracked}</span> materials tracked
                  </span>
                )}
                {companyContext.regionsMonitored > 0 && (
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{companyContext.regionsMonitored}</span> supplier regions
                  </span>
                )}
              </div>
              {directlyRelevantCount > 0 && (
                <Badge className="bg-primary text-primary-foreground">
                  {directlyRelevantCount} events directly affect you
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card data-testid="card-total-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">Active monitoring events</p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-bad" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-bad">{summary?.bySeverity?.critical || 0}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>

        <Card data-testid="card-high-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-signal" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-signal">{summary?.bySeverity?.high || 0}</div>
            <p className="text-xs text-muted-foreground">Significant impact expected</p>
          </CardContent>
        </Card>

        <Card data-testid="card-regions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regions Affected</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(summary?.byRegion || {}).length}</div>
            <p className="text-xs text-muted-foreground">Geographic areas impacted</p>
          </CardContent>
        </Card>

        <Card data-testid="card-relevance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Relevance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.averageRelevanceScore || 0}%</div>
            <p className="text-xs text-muted-foreground">Supply chain relevance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList data-testid="tabs-main">
          <TabsTrigger value="alerts" data-testid="tab-alerts">Live Alerts</TabsTrigger>
          <TabsTrigger value="critical" data-testid="tab-critical">Critical Events</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">Impact Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-severity">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground">
              {alerts.length} alerts found
            </div>
          </div>

          {alertsLoading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alertsData?.dataSource === 'unavailable' ? (
            <Card className="border-amber-500/30 bg-amber-500/5" data-testid="card-data-unavailable">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center gap-4">
                  <AlertTriangle className="h-12 w-12 text-signal" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Event Monitoring Initializing</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      {alertsData.unavailableReason || 'Real-time news data is currently unavailable.'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This system only displays verified, real news from authenticated sources. 
                    No fabricated or simulated data is shown.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : alerts.length === 0 ? (
            <Card data-testid="card-no-alerts">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center gap-4">
                  <Activity className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No Alerts Found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No supply chain alerts match your current filters.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {alerts.map((alert) => {
                const IconComponent = categoryIcons[alert.category] || AlertTriangle;
                return (
                  <Card 
                    key={alert.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                    data-testid={`card-alert-${alert.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${severityColors[alert.severity]}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base line-clamp-2">{alert.title}</CardTitle>
                              {alert.isDirectlyRelevant && (
                                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs shrink-0">
                                  Relevant to You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {categoryLabels[alert.category] || alert.category}
                              </Badge>
                              <Badge className={severityColors[alert.severity]}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            {alert.relevanceReasons && alert.relevanceReasons.length > 0 && (
                              <div className="mt-2 text-xs text-primary font-medium">
                                {alert.relevanceReasons[0]}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {alert.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(alert.affectedRegions || (alert as any).regions || []).slice(0, 3).map((region: string) => (
                          <Badge key={region} variant="secondary" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {region}
                          </Badge>
                        ))}
                        {(alert.affectedCommodities || (alert as any).commodities || []).slice(0, 2).map((commodity: string) => (
                          <Badge key={commodity} variant="secondary" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {commodity}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {alert.sourceUrl && alert.sourceUrl !== '#' ? (
                          <a 
                            href={alert.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`link-source-${alert.id}`}
                          >
                            {alert.source}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span>{alert.source}</span>
                        )}
                        <span>{formatDistanceToNow(new Date(alert.publishedAt), { addSuffix: true })}</span>
                      </div>
                      {alert.fdrImpact && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <span className="font-medium">FDR Impact:</span> {(alert.fdrImpact * 100).toFixed(1)}%
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical & High Priority Events</CardTitle>
              <CardDescription>
                Events requiring immediate attention and strategic response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : summary?.criticalAlerts && summary.criticalAlerts.length > 0 ? (
                <div className="space-y-4">
                  {summary.criticalAlerts.map((alert) => {
                    const IconComponent = categoryIcons[alert.category] || AlertTriangle;
                    return (
                      <div 
                        key={alert.id} 
                        className="flex items-start gap-4 p-4 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => setSelectedAlert(alert)}
                        data-testid={`critical-alert-${alert.id}`}
                      >
                        <div className={`p-3 rounded-lg ${severityColors[alert.severity]}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={severityColors[alert.severity]}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {alert.affectedRegions.map((region) => (
                              <Badge key={region} variant="outline" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                          </div>
                          {alert.fdrContext && (
                            <p className="text-sm mt-3 p-2 bg-muted rounded">
                              <span className="font-medium">FDR Analysis: </span>
                              {alert.fdrContext}
                            </p>
                          )}
                          {alert.recommendations && alert.recommendations.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <h5 className="text-sm font-medium">Recommended Actions:</h5>
                              {alert.recommendations.slice(0, 2).map((rec, idx) => (
                                <div key={idx} className="text-sm pl-4 border-l-2 border-primary/30">
                                  <p className="font-medium">{rec.action}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Timeline: {rec.timeline} | Priority: {rec.priority}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No critical alerts at this time
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Events by Category</CardTitle>
                <CardDescription>Distribution of supply chain events by type</CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.byCategory && Object.keys(summary.byCategory).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(summary.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, count]) => {
                        const IconComponent = categoryIcons[category] || AlertTriangle;
                        const maxCount = Math.max(...Object.values(summary.byCategory));
                        const percentage = (count / maxCount) * 100;
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{categoryLabels[category] || category}</span>
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Regions affected by current events</CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.byRegion && Object.keys(summary.byRegion).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(summary.byRegion)
                      .sort((a, b) => b[1] - a[1])
                      .map(([region, count]) => {
                        const maxCount = Math.max(...Object.values(summary.byRegion));
                        const percentage = (count / maxCount) * 100;
                        return (
                          <div key={region} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{region}</span>
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-muted rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No region data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Top Commodities at Risk</CardTitle>
                <CardDescription>Materials most frequently affected by current events</CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.topCommoditiesAffected && summary.topCommoditiesAffected.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {summary.topCommoditiesAffected.map((commodity, idx) => (
                      <Badge 
                        key={commodity} 
                        variant={idx === 0 ? "default" : "secondary"}
                        className="text-sm py-1 px-3"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        {commodity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No commodity data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selectedAlert && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAlert(null)}
        >
          <Card 
            className="max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={severityColors[selectedAlert.severity]}>
                      {selectedAlert.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {categoryLabels[selectedAlert.category] || selectedAlert.category}
                    </Badge>
                  </div>
                  <CardTitle>{selectedAlert.title}</CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-1 flex-wrap">
                    {selectedAlert.sourceUrl && selectedAlert.sourceUrl !== '#' ? (
                      <a 
                        href={selectedAlert.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        data-testid="link-modal-source"
                      >
                        {selectedAlert.source}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{selectedAlert.source}</span>
                    )}
                    <span>• {formatDistanceToNow(new Date(selectedAlert.publishedAt), { addSuffix: true })}</span>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAlert(null)} data-testid="button-close-modal">
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{selectedAlert.description}</p>
              
              <div className="flex flex-wrap gap-2">
                {selectedAlert.affectedRegions.map((region) => (
                  <Badge key={region} variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    {region}
                  </Badge>
                ))}
                {selectedAlert.affectedCommodities.map((commodity) => (
                  <Badge key={commodity} variant="secondary">
                    <Package className="h-3 w-3 mr-1" />
                    {commodity}
                  </Badge>
                ))}
              </div>

              {selectedAlert.fdrImpact && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-1">FDR Impact Assessment</h4>
                  <p className="text-sm">
                    Expected FDR change: <span className="font-bold">{(selectedAlert.fdrImpact * 100).toFixed(1)}%</span>
                  </p>
                  {selectedAlert.fdrContext && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedAlert.fdrContext}</p>
                  )}
                </div>
              )}

              {selectedAlert.recommendations && selectedAlert.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">FDR-Aware Recommendations</h4>
                  <div className="space-y-3">
                    {selectedAlert.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={rec.priority === 'critical' ? 'destructive' : rec.priority === 'high' ? 'default' : 'secondary'}>
                            {rec.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{rec.timeline}</span>
                        </div>
                        <p className="text-sm font-medium">{rec.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.fdrContext}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedAlert(null)} data-testid="button-close-details">
                  Close
                </Button>
                {selectedAlert.sourceUrl && selectedAlert.sourceUrl !== '#' && (
                  <Button variant="default" asChild data-testid="button-view-source">
                    <a href={selectedAlert.sourceUrl} target="_blank" rel="noopener noreferrer">
                      View Source <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
