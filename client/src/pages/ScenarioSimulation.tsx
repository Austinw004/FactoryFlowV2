import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Beaker,
  Plus,
  Play,
  GitCompare,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Package,
  Target,
  Trash2,
  BarChart3,
  Activity,
  ArrowRight,
  ChevronRight,
  Info,
  Edit
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
} from "recharts";

interface ScenarioVariant {
  id: string;
  simulationId: string;
  label: string;
  fdrValue: number;
  regime: string;
  commodityAdjustments?: Record<string, number>;
  procurementImpact?: number;
  inventoryImpact?: number;
  budgetImpact?: number;
  riskScore?: number;
  isBaseline?: number;
  createdAt: string;
}

interface ScenarioSimulation {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  baseFdrValue: number;
  baseRegime: string;
  baseCommodityInputs?: Record<string, number>;
  status: string;
  createdAt: string;
  variants?: ScenarioVariant[];
}

interface ComparisonData {
  simulation: ScenarioSimulation;
  variants: ScenarioVariant[];
  metrics: {
    procurementImpact: { label: string; value: number | null }[];
    inventoryImpact: { label: string; value: number | null }[];
    budgetImpact: { label: string; value: number | null }[];
    riskScore: { label: string; value: number | null }[];
  };
  bestCase: ScenarioVariant;
  worstCase: ScenarioVariant;
}

const REGIME_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "HEALTHY_EXPANSION", label: "Healthy Expansion" },
  { value: "ASSET_LED_GROWTH", label: "Asset-Led Growth" },
  { value: "IMBALANCED_EXCESS", label: "Imbalanced Excess" },
  { value: "REAL_ECONOMY_LEAD", label: "Real Economy Lead" },
];

const REGIME_COLORS: Record<string, string> = {
  balanced: "bg-gray-600",
  HEALTHY_EXPANSION: "bg-green-600",
  ASSET_LED_GROWTH: "bg-yellow-600",
  IMBALANCED_EXCESS: "bg-red-600",
  REAL_ECONOMY_LEAD: "bg-blue-600",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <Beaker className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Simulations Yet</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Create "what-if" economic scenarios to understand how changes in FDR, 
          economic regime, or commodity prices would impact your procurement, 
          inventory, and budget.
        </p>
        <Button onClick={onCreateNew} data-testid="button-create-first-simulation">
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Simulation
        </Button>
      </div>
    </div>
  );
}

function CreateSimulationDialog({ 
  open, 
  onOpenChange, 
  onCreated 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseFdrValue, setBaseFdrValue] = useState(1.0);
  const [baseRegime, setBaseRegime] = useState("balanced");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/simulations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations"] });
      toast({ title: "Simulation created", description: "Your new scenario simulation is ready." });
      onOpenChange(false);
      onCreated();
      setName("");
      setDescription("");
      setBaseFdrValue(1.0);
      setBaseRegime("balanced");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a simulation name.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name, description, baseFdrValue, baseRegime });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create What-If Simulation</DialogTitle>
          <DialogDescription>
            Define the baseline economic conditions to compare against different scenarios.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Simulation Name</Label>
            <Input
              id="name"
              placeholder="e.g., Q1 2025 Procurement Planning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-simulation-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of this simulation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-simulation-description"
            />
          </div>
          <div className="space-y-2">
            <Label>Baseline FDR Value: {baseFdrValue.toFixed(2)}</Label>
            <Slider
              value={[baseFdrValue]}
              onValueChange={([val]) => setBaseFdrValue(val)}
              min={0.5}
              max={2.0}
              step={0.1}
              data-testid="slider-base-fdr"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5 (Favorable)</span>
              <span>1.0 (Balanced)</span>
              <span>2.0 (Risky)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Baseline Economic Regime</Label>
            <Select value={baseRegime} onValueChange={setBaseRegime}>
              <SelectTrigger data-testid="select-base-regime">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-create-simulation">
            {createMutation.isPending ? "Creating..." : "Create Simulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVariantDialog({ 
  simulation, 
  open, 
  onOpenChange 
}: { 
  simulation: ScenarioSimulation;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [fdrValue, setFdrValue] = useState(simulation.baseFdrValue ?? 1.0);
  const [regime, setRegime] = useState(simulation.baseRegime ?? "balanced");
  const [commodityAdjustments, setCommodityAdjustments] = useState<Record<string, number>>({});
  const [newCommodity, setNewCommodity] = useState("");
  const [newAdjustment, setNewAdjustment] = useState(0);
  
  // Reset form values when dialog opens with fresh simulation data
  const resetFormValues = () => {
    setLabel("");
    setFdrValue(simulation.baseFdrValue ?? 1.0);
    setRegime(simulation.baseRegime ?? "balanced");
    setCommodityAdjustments({});
    setNewCommodity("");
    setNewAdjustment(0);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/simulations/${simulation.id}/variants`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations", simulation.id] });
      toast({ title: "Variant added", description: "The scenario variant has been created." });
      onOpenChange(false);
      resetFormValues();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddCommodity = () => {
    if (newCommodity.trim()) {
      setCommodityAdjustments({ ...commodityAdjustments, [newCommodity]: newAdjustment });
      setNewCommodity("");
      setNewAdjustment(0);
    }
  };

  const handleCreate = () => {
    if (!label.trim()) {
      toast({ title: "Label required", description: "Please enter a variant label.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ label, fdrValue, regime, commodityAdjustments });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Scenario Variant</DialogTitle>
          <DialogDescription>
            Define a "what-if" scenario with different economic conditions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="label">Variant Label</Label>
            <Input
              id="label"
              placeholder="e.g., Recession Scenario"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              data-testid="input-variant-label"
            />
          </div>
          <div className="space-y-2">
            <Label>FDR Value: {fdrValue.toFixed(2)}</Label>
            <Slider
              value={[fdrValue]}
              onValueChange={([val]) => {
                setFdrValue(val);
              }}
              min={0.5}
              max={2.0}
              step={0.1}
              data-testid="slider-variant-fdr"
            />
          </div>
          <div className="space-y-2">
            <Label>Economic Regime</Label>
            <Select value={regime} onValueChange={(val) => {
              setRegime(val);
            }}>
              <SelectTrigger data-testid="select-variant-regime">
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
            <Label>Commodity Price Adjustments (%)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Commodity (e.g., Steel)"
                value={newCommodity}
                onChange={(e) => setNewCommodity(e.target.value)}
                className="flex-1"
                data-testid="input-commodity-name"
              />
              <Input
                type="number"
                placeholder="%"
                value={newAdjustment}
                onChange={(e) => setNewAdjustment(Number(e.target.value))}
                className="w-20"
                data-testid="input-commodity-adjustment"
              />
              <Button variant="outline" size="icon" onClick={handleAddCommodity}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {Object.entries(commodityAdjustments).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(commodityAdjustments).map(([commodity, adj]) => (
                  <Badge 
                    key={commodity} 
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      const { [commodity]: _, ...rest } = commodityAdjustments;
                      setCommodityAdjustments(rest);
                    }}
                  >
                    {commodity}: {adj > 0 ? '+' : ''}{adj}%
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-variant">
            {createMutation.isPending ? "Adding..." : "Add Variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimulationCard({ 
  simulation,
  onSelect
}: { 
  simulation: ScenarioSimulation;
  onSelect: (id: string) => void;
}) {
  const { toast } = useToast();
  const variantCount = simulation.variants?.length || 0;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/simulations/${simulation.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations"] });
      toast({ title: "Simulation deleted" });
    },
  });

  return (
    <Card 
      className="hover-elevate cursor-pointer" 
      onClick={() => onSelect(simulation.id)}
      data-testid={`card-simulation-${simulation.id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Beaker className="h-4 w-4 text-primary" />
            {simulation.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {simulation.description || "No description"}
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            deleteMutation.mutate();
          }}
          data-testid={`button-delete-simulation-${simulation.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={REGIME_COLORS[simulation.baseRegime]}>
            {REGIME_OPTIONS.find(o => o.value === simulation.baseRegime)?.label || simulation.baseRegime}
          </Badge>
          <Badge variant="outline">FDR: {simulation.baseFdrValue.toFixed(2)}</Badge>
          <Badge variant="secondary">{variantCount} variant{variantCount !== 1 ? 's' : ''}</Badge>
          <Badge variant={simulation.status === 'completed' ? 'default' : 'outline'}>
            {simulation.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <span>Click to view details</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function SimulationDetail({ 
  simulationId,
  onBack 
}: { 
  simulationId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [addVariantOpen, setAddVariantOpen] = useState(false);

  const { data: simulation, isLoading } = useQuery<ScenarioSimulation>({
    queryKey: ["/api/simulations", simulationId],
    enabled: !!simulationId,
  });

  const { data: comparison } = useQuery<ComparisonData>({
    queryKey: ["/api/simulations", simulationId, "compare"],
    enabled: !!simulationId,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/simulations/${simulationId}/run`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations", simulationId] });
      toast({ title: "Simulation complete", description: "All variant impacts have been calculated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!simulation) {
    return (
      <div className="p-6 text-center">
        <p>Simulation not found.</p>
        <Button variant="ghost" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  const variants = simulation.variants || [];
  const hasVariants = variants.length > 0;

  const impactChartData = variants.map((v, i) => ({
    name: v.label,
    procurement: v.procurementImpact || 0,
    inventory: v.inventoryImpact || 0,
    budget: v.budgetImpact || 0,
    risk: v.riskScore || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const radarData = [
    { metric: 'Procurement', ...Object.fromEntries(variants.map(v => [v.label, Math.abs(v.procurementImpact || 0)])) },
    { metric: 'Inventory', ...Object.fromEntries(variants.map(v => [v.label, Math.abs(v.inventoryImpact || 0)])) },
    { metric: 'Budget', ...Object.fromEntries(variants.map(v => [v.label, Math.abs(v.budgetImpact || 0)])) },
    { metric: 'Risk', ...Object.fromEntries(variants.map(v => [v.label, v.riskScore || 0])) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Simulations
          </Button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Beaker className="h-6 w-6 text-primary" />
            {simulation.name}
          </h1>
          <p className="text-muted-foreground">{simulation.description}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setAddVariantOpen(true)}
            data-testid="button-open-add-variant"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
          <Button 
            onClick={() => runMutation.mutate()}
            disabled={!hasVariants || runMutation.isPending}
            data-testid="button-run-simulation"
          >
            <Play className="h-4 w-4 mr-2" />
            {runMutation.isPending ? "Running..." : "Run Simulation"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={REGIME_COLORS[simulation.baseRegime]}>
          Baseline: {REGIME_OPTIONS.find(o => o.value === simulation.baseRegime)?.label}
        </Badge>
        <Badge variant="outline">Base FDR: {simulation.baseFdrValue.toFixed(2)}</Badge>
        <Badge variant={simulation.status === 'completed' ? 'default' : 'secondary'}>
          Status: {simulation.status}
        </Badge>
      </div>

      {!hasVariants ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <GitCompare className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Variants Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add scenario variants to compare different economic conditions.
            </p>
            <Button onClick={() => setAddVariantOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Variant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="variants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="variants" data-testid="tab-variants">Variants</TabsTrigger>
            <TabsTrigger value="comparison" data-testid="tab-comparison">Impact Comparison</TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="variants" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {variants.map((variant) => (
                <VariantCard key={variant.id} variant={variant} simulationId={simulationId} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Impact by Variant
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impactChartData}>
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="procurement" fill={CHART_COLORS[0]} name="Procurement" />
                      <Bar dataKey="budget" fill={CHART_COLORS[1]} name="Budget" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Risk Score by Variant
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impactChartData} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} fontSize={12} />
                      <YAxis type="category" dataKey="name" fontSize={12} width={80} />
                      <Tooltip />
                      <Bar dataKey="risk" name="Risk Score">
                        {impactChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.risk >= 75 ? 'hsl(var(--destructive))' : 
                                  entry.risk >= 50 ? 'hsl(var(--chart-4))' : 
                                  'hsl(var(--chart-2))'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {variants.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Multi-Dimension Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" fontSize={12} />
                      <PolarRadiusAxis fontSize={10} />
                      {variants.slice(0, 5).map((v, i) => (
                        <Radar
                          key={v.id}
                          name={v.label}
                          dataKey={v.label}
                          stroke={CHART_COLORS[i]}
                          fill={CHART_COLORS[i]}
                          fillOpacity={0.2}
                        />
                      ))}
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {comparison && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        Best Case Scenario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comparison.bestCase && (
                        <div className="space-y-2">
                          <p className="font-semibold">{comparison.bestCase.label}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Procurement Impact: {comparison.bestCase.procurementImpact?.toFixed(1)}%</p>
                            <p>Budget Impact: {comparison.bestCase.budgetImpact?.toFixed(1)}%</p>
                            <p>Risk Score: {comparison.bestCase.riskScore}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        Worst Case Scenario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comparison.worstCase && (
                        <div className="space-y-2">
                          <p className="font-semibold">{comparison.worstCase.label}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Procurement Impact: {comparison.worstCase.procurementImpact?.toFixed(1)}%</p>
                            <p>Budget Impact: {comparison.worstCase.budgetImpact?.toFixed(1)}%</p>
                            <p>Risk Score: {comparison.worstCase.riskScore}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
                        <span>
                          {variants.filter(v => (v.riskScore || 0) >= 50).length} of {variants.length} variants 
                          present elevated risk levels requiring mitigation strategies.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 mt-0.5 text-green-600" />
                        <span>
                          Procurement cost variation ranges from 
                          {' '}{Math.min(...variants.map(v => v.procurementImpact || 0)).toFixed(1)}% to 
                          {' '}{Math.max(...variants.map(v => v.procurementImpact || 0)).toFixed(1)}% across scenarios.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Package className="h-4 w-4 mt-0.5 text-blue-600" />
                        <span>
                          Inventory strategy recommendations vary significantly - consider regime-specific policies.
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <AddVariantDialog 
        simulation={simulation} 
        open={addVariantOpen} 
        onOpenChange={setAddVariantOpen} 
      />
    </div>
  );
}

function VariantCard({ 
  variant,
  simulationId 
}: { 
  variant: ScenarioVariant;
  simulationId: string;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/simulations/${simulationId}/variants/${variant.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations", simulationId] });
      toast({ title: "Variant deleted" });
    },
  });

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-orange-600";
    if (score >= 25) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card data-testid={`card-variant-${variant.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-base">{variant.label}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={REGIME_COLORS[variant.regime]} variant="secondary">
              {REGIME_OPTIONS.find(o => o.value === variant.regime)?.label || variant.regime}
            </Badge>
            <Badge variant="outline">FDR: {variant.fdrValue.toFixed(2)}</Badge>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => deleteMutation.mutate()}
          data-testid={`button-delete-variant-${variant.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Procurement</p>
            <p className={`font-medium ${(variant.procurementImpact || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {(variant.procurementImpact || 0) > 0 ? '+' : ''}{(variant.procurementImpact || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Budget</p>
            <p className={`font-medium ${(variant.budgetImpact || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {(variant.budgetImpact || 0) > 0 ? '+' : ''}{(variant.budgetImpact || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Inventory</p>
            <p className="font-medium">
              {(variant.inventoryImpact || 0) > 0 ? '+' : ''}{(variant.inventoryImpact || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Risk Score</p>
            <p className={`font-medium ${getRiskColor(variant.riskScore || 0)}`}>
              {variant.riskScore || 0}/100
            </p>
          </div>
        </div>
        
        {variant.commodityAdjustments && Object.keys(variant.commodityAdjustments).length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Commodity Adjustments</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(variant.commodityAdjustments).map(([commodity, adj]) => (
                <Badge key={commodity} variant="outline" className="text-xs">
                  {commodity}: {(adj as number) > 0 ? '+' : ''}{adj}%
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ScenarioSimulation() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState<string | null>(null);

  const { data: simulations, isLoading } = useQuery<ScenarioSimulation[]>({
    queryKey: ["/api/simulations"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (selectedSimulation) {
    return (
      <SimulationDetail 
        simulationId={selectedSimulation} 
        onBack={() => setSelectedSimulation(null)} 
      />
    );
  }

  if (!simulations || simulations.length === 0) {
    return (
      <>
        <EmptyState onCreateNew={() => setCreateDialogOpen(true)} />
        <CreateSimulationDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onCreated={() => {}}
        />
      </>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Beaker className="h-6 w-6 text-primary" />
            Scenario Simulation
          </h1>
          <p className="text-muted-foreground">
            Run "what-if" analyses to understand how economic changes impact procurement, inventory, and budget.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-simulation">
          <Plus className="h-4 w-4 mr-2" />
          New Simulation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {simulations.map((simulation) => (
          <SimulationCard 
            key={simulation.id} 
            simulation={simulation}
            onSelect={setSelectedSimulation}
          />
        ))}
      </div>

      <CreateSimulationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onCreated={() => {}}
      />
    </div>
  );
}
