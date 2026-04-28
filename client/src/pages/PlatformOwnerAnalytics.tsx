import { useQuery } from "@tanstack/react-query";
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
  BarChart3,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Package,
  Truck,
  DollarSign,
  Target,
  Shield,
  Database,
  LineChart,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface PlatformMetrics {
  overview: {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    activeUsers: number;
    totalMRR: number;
    growthRate: number;
  };
  usage: {
    totalRfqs: number;
    totalAllocations: number;
    totalForecasts: number;
    totalSuppliers: number;
    totalMaterials: number;
  };
  trends: {
    companiesThisMonth: number;
    companiesLastMonth: number;
    usersThisMonth: number;
    usersLastMonth: number;
  };
  industries: Record<string, number>;
  companySizes: Record<string, number>;
}

interface MaterialTrend {
  category: string;
  companiesTracking: number;
  demandTrend: "up" | "down" | "stable";
  avgGrowth: number;
}

interface SupplierIntel {
  region: string;
  category: string;
  avgLeadTime: number;
  avgOnTimeRate: number;
  riskScore: number;
  supplierCount: number;
}

interface FeatureUsage {
  feature: string;
  usageCount: number;
  uniqueCompanies: number;
  trend: "growing" | "declining" | "stable";
}

interface CompanyDetail {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  createdAt: string;
  userCount: number;
  status: string;
}

export default function PlatformOwnerAnalytics() {
  const { toast } = useToast();

  const { data: accessCheck, isLoading: checkingAccess } = useQuery<{ isPlatformAdmin: boolean }>({
    queryKey: ["/api/platform/check-access"],
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<PlatformMetrics>({
    queryKey: ["/api/platform/metrics"],
    enabled: accessCheck?.isPlatformAdmin,
  });

  const { data: materialTrends = [], isLoading: trendsLoading } = useQuery<MaterialTrend[]>({
    queryKey: ["/api/platform/materials/trends"],
    enabled: accessCheck?.isPlatformAdmin,
  });

  const { data: supplierIntel = [], isLoading: intelLoading } = useQuery<SupplierIntel[]>({
    queryKey: ["/api/platform/suppliers/intelligence"],
    enabled: accessCheck?.isPlatformAdmin,
  });

  const { data: featureUsage = [], isLoading: usageLoading } = useQuery<FeatureUsage[]>({
    queryKey: ["/api/platform/features/usage"],
    enabled: accessCheck?.isPlatformAdmin,
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<CompanyDetail[]>({
    queryKey: ["/api/platform/companies"],
    enabled: accessCheck?.isPlatformAdmin,
  });

  const handleExport = async (dataType: string, formatType: "json" | "csv") => {
    try {
      const response = await fetch(`/api/platform/export/${dataType}?format=${formatType}`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `platform_${dataType}_export.${formatType}`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: `Exported ${dataType} as ${formatType.toUpperCase()}` });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/platform"] });
    refetchMetrics();
    toast({ title: "Refreshing platform data..." });
  };

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!accessCheck?.isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-6 w-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Platform Owner Analytics is restricted to platform administrators only. 
              This data is confidential and not available to customer accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === "up" || trend === "growing") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down" || trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-yellow-600" />;
  };

  const getRiskBadge = (score: number) => {
    if (score <= 3) return <Badge className="bg-green-600">Low Risk</Badge>;
    if (score <= 6) return <Badge className="bg-yellow-600">Medium Risk</Badge>;
    return <Badge variant="destructive">High Risk</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
<p className="text-muted-foreground mt-1">
            Cross-customer intelligence and platform-wide insights (Owner Only)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            <Shield className="h-3 w-3 mr-1" />
            Platform Owner
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh-owner">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Companies</p>
                    <p className="text-3xl font-bold" data-testid="text-owner-total-companies">{metrics.overview.totalCompanies}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.overview.activeCompanies} active (30d)
                    </p>
                  </div>
                  <Building2 className="h-10 w-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold" data-testid="text-owner-total-users">{metrics.overview.totalUsers}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.overview.activeUsers} active (30d)
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Est. MRR</p>
                    <p className="text-3xl font-bold" data-testid="text-owner-mrr">
                      ${(metrics.overview.totalMRR / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {metrics.overview.growthRate.toFixed(1)}% growth
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Platform Activity</p>
                    <p className="text-3xl font-bold" data-testid="text-owner-activity">
                      {metrics.usage.totalRfqs + metrics.usage.totalAllocations}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      RFQs + Allocations
                    </p>
                  </div>
                  <Activity className="h-10 w-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.usage.totalMaterials}</p>
                    <p className="text-sm text-muted-foreground">Materials Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Truck className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.usage.totalSuppliers}</p>
                    <p className="text-sm text-muted-foreground">Suppliers Monitored</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <LineChart className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.usage.totalForecasts}</p>
                    <p className="text-sm text-muted-foreground">Forecasts Generated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="companies" data-testid="tab-owner-companies">Customer Companies</TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-owner-materials">Material Trends</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-owner-suppliers">Supplier Intelligence</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-owner-features">Feature Usage</TabsTrigger>
          <TabsTrigger value="exports" data-testid="tab-owner-exports">Data Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Customer Companies
              </CardTitle>
              <CardDescription>
                All platform customers with activity metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="h-40 bg-muted animate-pulse rounded" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.industry || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.companySize || "Unknown"}</Badge>
                        </TableCell>
                        <TableCell>{company.userCount}</TableCell>
                        <TableCell>
                          <Badge className={company.status === "active" ? "bg-green-600" : "bg-yellow-600"}>
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {company.createdAt ? format(new Date(company.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Cross-Platform Material Trends
              </CardTitle>
              <CardDescription>
                Aggregated demand patterns across all customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-40 bg-muted animate-pulse rounded" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Category</TableHead>
                      <TableHead>Companies Tracking</TableHead>
                      <TableHead>Demand Trend</TableHead>
                      <TableHead>Avg Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialTrends.map((trend, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{trend.category}</TableCell>
                        <TableCell>{trend.companiesTracking}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(trend.demandTrend)}
                            <span className="capitalize">{trend.demandTrend}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={trend.avgGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                            {trend.avgGrowth >= 0 ? "+" : ""}{trend.avgGrowth.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Supplier Intelligence Network
              </CardTitle>
              <CardDescription>
                Aggregated supplier performance across all customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {intelLoading ? (
                <div className="h-40 bg-muted animate-pulse rounded" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier/Region</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Avg Lead Time</TableHead>
                      <TableHead>On-Time Rate</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierIntel.map((intel, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{intel.region}</TableCell>
                        <TableCell>{intel.category}</TableCell>
                        <TableCell>{intel.avgLeadTime.toFixed(0)} days</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={intel.avgOnTimeRate * 100} className="w-16 h-2" />
                            <span>{(intel.avgOnTimeRate * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getRiskBadge(intel.riskScore)}</TableCell>
                        <TableCell>{intel.supplierCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Feature Adoption & Usage
              </CardTitle>
              <CardDescription>
                Track which features are most valuable to customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="h-40 bg-muted animate-pulse rounded" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Usage Count (30d)</TableHead>
                      <TableHead>Unique Companies</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureUsage.map((usage, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium capitalize">
                          {usage.feature.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>{usage.usageCount.toLocaleString()}</TableCell>
                        <TableCell>{usage.uniqueCompanies}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(usage.trend)}
                            <span className="capitalize">{usage.trend}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Exports for Analysis
              </CardTitle>
              <CardDescription>
                Export platform data for your data science team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-dashed">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-semibold">Company Data</h4>
                        <p className="text-sm text-muted-foreground">Customer profiles and metrics</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExport("companies", "json")} data-testid="button-export-companies-json">
                          JSON
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("companies", "csv")} data-testid="button-export-companies-csv">
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-semibold">Material Trends</h4>
                        <p className="text-sm text-muted-foreground">Cross-platform demand patterns</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExport("materials", "json")} data-testid="button-export-materials-json">
                          JSON
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("materials", "csv")} data-testid="button-export-materials-csv">
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-semibold">Supplier Intelligence</h4>
                        <p className="text-sm text-muted-foreground">Aggregated supplier performance</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExport("suppliers", "json")} data-testid="button-export-suppliers-json">
                          JSON
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("suppliers", "csv")} data-testid="button-export-suppliers-csv">
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-semibold">Feature Usage</h4>
                        <p className="text-sm text-muted-foreground">Feature adoption analytics</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExport("features", "json")} data-testid="button-export-features-json">
                          JSON
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("features", "csv")} data-testid="button-export-features-csv">
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  API Access for Data Scientists
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Your data science team can access these endpoints directly:
                </p>
                <ul className="text-sm font-mono mt-2 space-y-1 text-muted-foreground">
                  <li>GET /api/platform/metrics</li>
                  <li>GET /api/platform/materials/trends</li>
                  <li>GET /api/platform/suppliers/intelligence</li>
                  <li>GET /api/platform/features/usage</li>
                  <li>GET /api/platform/companies</li>
                  <li>GET /api/platform/export/:dataType?format=json|csv</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
