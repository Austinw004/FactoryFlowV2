import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building,
  MapPin,
  DollarSign,
  Users,
  Activity,
  Target,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { format } from "date-fns";

interface RiskFactors {
  financial: { score: number; weight: number };
  geographic: { score: number; weight: number };
  concentration: { score: number; weight: number };
  performance: { score: number; weight: number };
  regimeImpact: { score: number; weight: number };
}

interface Recommendation {
  priority: string;
  action: string;
  rationale: string;
  timeframe: string;
}

interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface SupplierRiskSnapshot {
  id: string;
  companyId: string;
  supplierId: string;
  regime: string;
  fdrValue: number;
  fdrSignalStrength?: number;
  baseScore: number;
  adjustedScore: number;
  riskTier: string;
  riskFactors?: RiskFactors;
  recommendations?: Recommendation[];
  financialHealthScore?: number;
  geographicRiskScore?: number;
  concentrationRiskScore?: number;
  performanceScore?: number;
  regimeImpactScore?: number;
  nextEvaluationDue?: string;
  createdAt: string;
  supplier?: Supplier;
}

interface RiskSummary {
  totalSuppliers: number;
  avgRiskScore: number;
  byTier: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  criticalSuppliers: SupplierRiskSnapshot[];
  recommendations: (Recommendation & { supplierId: string })[];
}

const TIER_COLORS: Record<string, string> = {
  low: "bg-green-600",
  medium: "bg-yellow-600",
  high: "bg-orange-600",
  critical: "bg-red-600",
};

const TIER_LABELS: Record<string, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  critical: "Critical Risk",
};

const CHART_COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-3))", "hsl(var(--destructive))"];

const REGIME_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "HEALTHY_EXPANSION", label: "Healthy Expansion" },
  { value: "ASSET_LED_GROWTH", label: "Asset-Led Growth" },
  { value: "IMBALANCED_EXCESS", label: "Imbalanced Excess" },
  { value: "REAL_ECONOMY_LEAD", label: "Real Economy Lead" },
];

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ onCalculate }: { onCalculate: () => void }) {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Risk Data Available</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Calculate risk scores for your suppliers based on financial health, 
          geographic factors, concentration risk, and current economic regime.
        </p>
        <Button onClick={onCalculate} data-testid="button-calculate-all-risk">
          <RefreshCw className="h-4 w-4 mr-2" />
          Calculate Risk Scores
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card data-testid={`card-summary-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-bad" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-good" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RiskTierPieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SupplierRiskRow({
  snapshot,
  onViewDetails,
}: {
  snapshot: SupplierRiskSnapshot;
  onViewDetails: (snapshot: SupplierRiskSnapshot) => void;
}) {
  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-orange-600";
    if (score >= 25) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <TableRow 
      className="cursor-pointer hover-elevate"
      onClick={() => onViewDetails(snapshot)}
      data-testid={`row-supplier-${snapshot.supplierId}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          {snapshot.supplier?.name || snapshot.supplierId}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={TIER_COLORS[snapshot.riskTier]}>
          {TIER_LABELS[snapshot.riskTier]}
        </Badge>
      </TableCell>
      <TableCell className={getRiskColor(snapshot.adjustedScore)}>
        <ShadcnTooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <span className="font-semibold">{snapshot.adjustedScore.toFixed(0)}</span>
              <Progress 
                value={snapshot.adjustedScore} 
                className="w-16 h-2"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="p-3">
            <p className="text-xs font-medium mb-1">Risk Score Thresholds</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-green-600">Low:</span><span>0-24</span>
              <span className="text-yellow-600">Medium:</span><span>25-49</span>
              <span className="text-orange-600">High:</span><span>50-74</span>
              <span className="text-red-600">Critical:</span><span>75+</span>
            </div>
          </TooltipContent>
        </ShadcnTooltip>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {snapshot.regime ? REGIME_OPTIONS.find(r => r.value === snapshot.regime)?.label || snapshot.regime : 'N/A'}
      </TableCell>
      <TableCell>
        {snapshot.recommendations && snapshot.recommendations.length > 0 ? (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {snapshot.recommendations.length} action{snapshot.recommendations.length !== 1 ? 's' : ''}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(snapshot.createdAt), "MMM d, yyyy")}
      </TableCell>
    </TableRow>
  );
}

function SupplierDetailDialog({
  snapshot,
  open,
  onOpenChange,
}: {
  snapshot: SupplierRiskSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!snapshot) return null;

  const riskFactors = snapshot.riskFactors || {
    financial: { score: snapshot.financialHealthScore || 0, weight: 0.25 },
    geographic: { score: snapshot.geographicRiskScore || 0, weight: 0.15 },
    concentration: { score: snapshot.concentrationRiskScore || 0, weight: 0.20 },
    performance: { score: snapshot.performanceScore || 0, weight: 0.25 },
    regimeImpact: { score: snapshot.regimeImpactScore || 0, weight: 0.15 },
  };

  const radarData = [
    { metric: 'Financial', value: riskFactors.financial.score, fullMark: 100 },
    { metric: 'Geographic', value: riskFactors.geographic.score, fullMark: 100 },
    { metric: 'Concentration', value: riskFactors.concentration.score, fullMark: 100 },
    { metric: 'Performance', value: 100 - riskFactors.performance.score, fullMark: 100 },
    { metric: 'Regime Impact', value: riskFactors.regimeImpact.score, fullMark: 100 },
  ];

  const barData = Object.entries(riskFactors).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    score: val.score,
    weight: val.weight * 100,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {snapshot.supplier?.name || "Supplier"} Risk Details
          </DialogTitle>
          <DialogDescription>
            Detailed risk analysis based on FDR signals and economic regime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Risk Score</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{snapshot.adjustedScore.toFixed(0)}</span>
                <Badge className={TIER_COLORS[snapshot.riskTier]}>
                  {TIER_LABELS[snapshot.riskTier]}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Economic Regime</p>
              <p className="font-medium">
                {REGIME_OPTIONS.find(r => r.value === snapshot.regime)?.label || snapshot.regime}
              </p>
              <p className="text-xs text-muted-foreground">FDR: {snapshot.fdrValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Risk Factor Analysis</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" fontSize={10} />
                    <PolarRadiusAxis domain={[0, 100]} fontSize={8} />
                    <Radar
                      name="Risk"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.4}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Factor Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} fontSize={10} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="score" fill="hsl(var(--primary))" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {snapshot.recommendations && snapshot.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-signal" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {snapshot.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge 
                        variant={rec.priority === 'urgent' ? 'destructive' : 
                                 rec.priority === 'high' ? 'default' : 'secondary'}
                      >
                        {rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {rec.timeframe}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last evaluated: {format(new Date(snapshot.createdAt), "MMM d, yyyy HH:mm")}
            </div>
            {snapshot.nextEvaluationDue && (
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Next evaluation: {format(new Date(snapshot.nextEvaluationDue), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalculateRiskDialog({
  open,
  onOpenChange,
  onCalculated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCalculated: () => void;
}) {
  const { toast } = useToast();
  const [regime, setRegime] = useState("balanced");
  const [fdrValue, setFdrValue] = useState(1.0);

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/supplier-risk/calculate-all", { regime, fdrValue });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-risk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-risk/summary"] });
      toast({ 
        title: "Risk scores calculated", 
        description: `Successfully evaluated ${data.summary.successful} suppliers.` 
      });
      onOpenChange(false);
      onCalculated();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calculate Supplier Risk Scores</DialogTitle>
          <DialogDescription>
            Evaluate all suppliers using current FDR signals and economic regime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Economic Regime</label>
            <Select value={regime} onValueChange={setRegime}>
              <SelectTrigger data-testid="select-calc-regime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">FDR Value: {fdrValue.toFixed(2)}</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={fdrValue}
              onChange={(e) => setFdrValue(parseFloat(e.target.value))}
              className="w-full"
              data-testid="slider-calc-fdr"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5 (Favorable)</span>
              <span>2.0 (Risky)</span>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              This will recalculate risk scores for all suppliers based on the 
              selected economic conditions. Previous snapshots will be preserved for history.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => calculateMutation.mutate()} 
            disabled={calculateMutation.isPending}
            data-testid="button-run-calculation"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
            {calculateMutation.isPending ? "Calculating..." : "Calculate All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierRisk() {
  const [selectedSnapshot, setSelectedSnapshot] = useState<SupplierRiskSnapshot | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>("all");

  const { data: snapshots, isLoading: snapshotsLoading } = useQuery<SupplierRiskSnapshot[]>({
    queryKey: ["/api/supplier-risk"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<RiskSummary>({
    queryKey: ["/api/supplier-risk/summary"],
  });

  const isLoading = snapshotsLoading || summaryLoading;

  const handleViewDetails = (snapshot: SupplierRiskSnapshot) => {
    setSelectedSnapshot(snapshot);
    setDetailDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <>
        <EmptyState onCalculate={() => setCalculateDialogOpen(true)} />
        <CalculateRiskDialog 
          open={calculateDialogOpen}
          onOpenChange={setCalculateDialogOpen}
          onCalculated={() => {}}
        />
      </>
    );
  }

  const filteredSnapshots = tierFilter === "all" 
    ? snapshots 
    : snapshots.filter(s => s.riskTier === tierFilter);

  const pieData = summary ? [
    { name: 'Low', value: summary.byTier.low },
    { name: 'Medium', value: summary.byTier.medium },
    { name: 'High', value: summary.byTier.high },
    { name: 'Critical', value: summary.byTier.critical },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Supplier Risk Scoring
          </h1>
          <p className="text-muted-foreground">
            FDR-aware risk assessment for your supplier network.
          </p>
        </div>
        <Button onClick={() => setCalculateDialogOpen(true)} data-testid="button-recalculate-risk">
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalculate Scores
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Suppliers"
            value={summary.totalSuppliers}
            icon={Building}
          />
          <SummaryCard
            title="Avg Risk Score"
            value={summary.avgRiskScore.toFixed(0)}
            description={summary.avgRiskScore >= 50 ? "Elevated risk level" : "Acceptable risk level"}
            trend={summary.avgRiskScore >= 50 ? "up" : "down"}
            icon={Target}
          />
          <SummaryCard
            title="Critical Suppliers"
            value={summary.byTier.critical}
            description={summary.byTier.critical > 0 ? "Requires immediate attention" : "No critical risks"}
            trend={summary.byTier.critical > 0 ? "up" : "neutral"}
            icon={AlertTriangle}
          />
          <SummaryCard
            title="High Risk"
            value={summary.byTier.high}
            icon={Activity}
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">All Suppliers</TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">Recommended Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {pieData.length > 0 ? (
                  <RiskTierPieChart data={pieData} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4 text-muted-foreground" data-testid="empty-risk-tiers">
                    <PieChartIcon className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">Risk tiers will appear here</p>
                    <p className="text-xs mt-1">Run a risk evaluation from the Calculate Risk button above to score your suppliers across Critical / High / Medium / Low tiers.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-bad" />
                  Critical Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.criticalSuppliers && summary.criticalSuppliers.length > 0 ? (
                  <div className="space-y-3">
                    {summary.criticalSuppliers.map((s) => (
                      <div 
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg cursor-pointer hover-elevate"
                        onClick={() => handleViewDetails(s)}
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-bad" />
                          <span className="font-medium">{s.supplier?.name || s.supplierId}</span>
                        </div>
                        <span className="font-bold text-red-600">{s.adjustedScore.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground py-8">
                    <div className="text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-good" />
                      <p>No critical suppliers</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Risk Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshots.slice(0, 10)}>
                  <XAxis 
                    dataKey={(d) => d.supplier?.name?.substring(0, 10) || d.supplierId.substring(0, 8)} 
                    fontSize={10}
                  />
                  <YAxis domain={[0, 100]} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="adjustedScore" name="Risk Score">
                    {snapshots.slice(0, 10).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.riskTier === 'critical' ? 'hsl(var(--destructive))' :
                              entry.riskTier === 'high' ? 'hsl(var(--chart-3))' :
                              entry.riskTier === 'medium' ? 'hsl(var(--chart-4))' :
                              'hsl(var(--chart-2))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-48" data-testid="select-tier-filter">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredSnapshots.length} of {snapshots.length} suppliers
            </span>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Risk Tier</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Evaluated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSnapshots.map((snapshot) => (
                  <SupplierRiskRow 
                    key={snapshot.id} 
                    snapshot={snapshot}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {summary?.recommendations && summary.recommendations.length > 0 ? (
            <div className="space-y-3">
              {summary.recommendations.map((rec, i) => (
                <Card key={i} className="hover-elevate">
                  <CardContent className="flex items-start gap-4 py-4">
                    <Badge 
                      variant={rec.priority === 'urgent' ? 'destructive' : 
                               rec.priority === 'high' ? 'default' : 'secondary'}
                    >
                      {rec.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">{rec.action}</p>
                      <p className="text-sm text-muted-foreground mt-1">{rec.rationale}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rec.timeframe}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-good mb-4" />
                <h3 className="font-semibold mb-2">No Immediate Actions Required</h3>
                <p className="text-muted-foreground">
                  All suppliers are within acceptable risk thresholds.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SupplierDetailDialog
        snapshot={selectedSnapshot}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      <CalculateRiskDialog
        open={calculateDialogOpen}
        onOpenChange={setCalculateDialogOpen}
        onCalculated={() => {}}
      />
    </div>
  );
}
