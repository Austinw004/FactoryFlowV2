import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  Bot, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Package,
  BarChart2,
  Plus,
  FileText,
  Building2,
  Mail,
  Scale,
  Search,
  Trash2,
  Edit,
  MoreHorizontal,
  Users,
  Boxes,
} from "lucide-react";
import type { Supplier, Material } from "@shared/schema";
import { InfoTooltip } from "@/components/InfoTooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreateMaterialDialog } from "@/components/CreateMaterialDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Procurement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Tab and filter state
  const [activeTab, setActiveTab] = useState("overview");
  const [materialSearch, setMaterialSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

  // Dialog visibility states
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'supplier' | 'material'; id: string; name: string } | null>(null);

  // Supplier form state (matches schema: name, contactEmail)
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactEmail: "",
  });

  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      contactEmail: "",
    });
  };

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ["/api/economics/regime"],
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: typeof supplierForm) => {
      const res = await apiRequest("POST", "/api/suppliers", {
        name: data.name,
        contactEmail: data.contactEmail || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Supplier added", description: "Your new supplier has been added to your network." });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowAddSupplierDialog(false);
      resetSupplierForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add supplier", 
        description: error.message || "Could not add the supplier.",
        variant: "destructive" 
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Supplier removed", description: "The supplier has been removed from your network." });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove supplier", 
        description: error.message || "Could not remove the supplier.",
        variant: "destructive" 
      });
    },
  });

  // Delete material mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/materials/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Material removed", description: "The material has been removed from inventory." });
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setShowDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove material", 
        description: error.message || "Could not remove the material.",
        variant: "destructive" 
      });
    },
  });

  const generateRfqMutation = useMutation({
    mutationFn: (materialId: string) => apiRequest("POST", `/api/rfqs/generate`, { materialId }),
    onSuccess: () => {
      toast({
        title: "RFQ Generated",
        description: "A request for quotation has been created and sent to suppliers.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rfqs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "RFQ Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingSuppliers || isLoadingMaterials) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const getProcurementSignal = () => {
    if (!regime) return null;
    
    const fdr = regime.fdr || 0;
    
    if (fdr > 2.5) {
      return {
        action: "Hold",
        description: "High market divergence - defer non-critical procurement",
        variant: "destructive" as const,
        icon: AlertCircle,
      };
    } else if (fdr > 1.5) {
      return {
        action: "Caution",
        description: "Moderate divergence - selective procurement only",
        variant: "secondary" as const,
        icon: TrendingUp,
      };
    } else {
      return {
        action: "Buy",
        description: "Favorable conditions - opportunistic procurement",
        variant: "default" as const,
        icon: TrendingDown,
      };
    }
  };

  const signal = getProcurementSignal();

  const goToAgenticAI = () => {
    navigate("/agentic-ai");
  };

  const getLowStockMaterials = () => {
    if (!materials) return [];
    return materials.filter(m => {
      const safetyLevel = 10;
      return m.onHand < safetyLevel;
    });
  };

  const getAIRecommendations = () => {
    const lowStock = getLowStockMaterials();
    const recommendations: Array<{
      type: 'warning' | 'opportunity' | 'action';
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    if (lowStock.length > 0) {
      recommendations.push({
        type: 'warning',
        title: `${lowStock.length} materials below safety stock`,
        description: `Consider reordering ${lowStock.map(m => m.name).slice(0, 3).join(', ')}${lowStock.length > 3 ? ` and ${lowStock.length - 3} more` : ''}`,
        priority: 'high',
      });
    }

    if (signal?.action === 'Buy') {
      recommendations.push({
        type: 'opportunity',
        title: 'Favorable buying conditions',
        description: 'Market conditions suggest good timing for bulk procurement to lock in lower prices',
        priority: 'medium',
      });
    }

    if (signal?.action === 'Hold') {
      recommendations.push({
        type: 'action',
        title: 'Defer non-critical orders',
        description: 'High market divergence detected. Consider postponing non-essential procurement',
        priority: 'high',
      });
    }

    if (suppliers && suppliers.length < 3) {
      recommendations.push({
        type: 'warning',
        title: 'Low supplier diversification',
        description: 'Consider adding more suppliers to reduce supply chain risk',
        priority: 'medium',
      });
    }

    return recommendations;
  };

  const recommendations = getAIRecommendations();
  const lowStockMaterials = getLowStockMaterials();

  // Filter materials and suppliers based on search
  const filteredMaterials = materials?.filter(m => 
    m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    m.code.toLowerCase().includes(materialSearch.toLowerCase())
  ) || [];

  const filteredSuppliers = suppliers?.filter(s => 
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.contactEmail && s.contactEmail.toLowerCase().includes(supplierSearch.toLowerCase()))
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-procurement">
            Procurement
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage suppliers, materials, and procurement timing with AI-powered insights
          </p>
        </div>
        <Button
          onClick={() => goToAgenticAI()}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="button-procurement-ai-assistant"
        >
          <Bot className="h-4 w-4 mr-2" />
          Ask AI Assistant
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover-elevate" 
          onClick={() => setActiveTab("materials")}
          data-testid="card-total-materials"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Click to manage inventory</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover-elevate ${lowStockMaterials.length > 0 ? 'border-yellow-500/50' : ''}`}
          onClick={() => setActiveTab("materials")}
          data-testid="card-low-stock-count"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockMaterials.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockMaterials.length > 0 ? 'text-yellow-600' : ''}`}>
              {lowStockMaterials.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {lowStockMaterials.length > 0 ? 'Action needed' : 'All stock healthy'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => setActiveTab("suppliers")}
          data-testid="card-active-suppliers"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Click to manage network</p>
          </CardContent>
        </Card>

        <Card data-testid="card-market-signal">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Market Signal
              <InfoTooltip term="marketSignal" />
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={signal?.variant || 'secondary'} data-testid="badge-market-signal">
                {signal?.action || 'Unknown'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatRegimeName(regime?.regime || "") || "Analyzing..."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations - Collapsible */}
      {recommendations.length > 0 && (
        <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-background" data-testid="card-ai-recommendations">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Insights
                <Badge variant="secondary" className="ml-1">{recommendations.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToAgenticAI()} data-testid="button-more-insights">
                More insights
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recommendations.slice(0, 3).map((rec, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 min-w-[280px] flex-shrink-0"
                  data-testid={`recommendation-${index}`}
                >
                  {rec.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
                  {rec.type === 'opportunity' && <Zap className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />}
                  {rec.type === 'action' && <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{rec.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2" data-testid="tab-materials">
            <Boxes className="h-4 w-4" />
            <span className="hidden sm:inline">Materials</span>
            {lowStockMaterials.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500">
                {lowStockMaterials.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2" data-testid="tab-suppliers">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Suppliers</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("materials")}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Material Inventory</h3>
                  <p className="text-sm text-muted-foreground">
                    {materials?.length || 0} materials tracked, {lowStockMaterials.length} need attention
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("suppliers")}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Supplier Network</h3>
                  <p className="text-sm text-muted-foreground">
                    {suppliers?.length || 0} active suppliers in your network
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Market Conditions */}
          {signal && (
            <Card data-testid="card-procurement-signal">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <signal.icon className="h-4 w-4" />
                  Current Market Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={signal.variant} className="text-sm px-3 py-1" data-testid="badge-signal-action">
                      {signal.action}
                    </Badge>
                    <span className="text-sm" data-testid="text-signal-description">
                      {signal.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground sm:ml-auto">
                    <span>FDR: <span className="font-medium text-foreground">{regime?.fdr?.toFixed(2) || "0.00"}</span></span>
                    <span>Regime: <span className="font-medium text-foreground">{formatRegimeName(regime?.regime || "") || "Unknown"}</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Materials Quick View */}
          {lowStockMaterials.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Low Stock Materials
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("materials")} data-testid="button-view-all-low-stock">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockMaterials.slice(0, 3).map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{material.name}</p>
                        <p className="text-xs text-muted-foreground">{material.code}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-yellow-600 font-medium">{material.onHand} {material.unit}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => generateRfqMutation.mutate(material.id)}
                          disabled={generateRfqMutation.isPending}
                          data-testid={`button-quick-rfq-${material.id}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          RFQ
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          {/* Materials Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials by name or code..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="pl-9"
                data-testid="input-material-search"
              />
            </div>
            <Button onClick={() => setShowAddMaterialDialog(true)} data-testid="button-add-material">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </div>

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <Card className="border-dashed" data-testid="card-no-materials">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {materials?.length === 0 ? "No materials yet" : "No matching materials"}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                  {materials?.length === 0 
                    ? "Add the raw materials you purchase to track inventory, get low-stock alerts, and optimize ordering."
                    : "Try adjusting your search terms to find what you're looking for."}
                </p>
                {materials?.length === 0 && (
                  <Button onClick={() => setShowAddMaterialDialog(true)} data-testid="button-add-first-material">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Material
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((material) => {
                const isLowStock = material.onHand < 10;
                return (
                  <Card 
                    key={material.id} 
                    className={`${isLowStock ? "border-yellow-500/50" : ""}`}
                    data-testid={`card-material-${material.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{material.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs">{material.code}</span>
                            {isLowStock && (
                              <Badge variant="secondary" className="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 text-xs">
                                Low Stock
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-material-menu-${material.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => generateRfqMutation.mutate(material.id)}
                              data-testid={`menu-item-rfq-${material.id}`}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Request Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setShowDeleteConfirm({ type: 'material', id: material.id, name: material.name })}
                              data-testid={`menu-item-delete-material-${material.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className={`text-lg font-bold ${isLowStock ? 'text-yellow-600' : ''}`}>{material.onHand}</p>
                          <p className="text-xs text-muted-foreground">On Hand</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-bold">{material.inbound || 0}</p>
                          <p className="text-xs text-muted-foreground">Inbound</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-bold text-muted-foreground">{material.unit}</p>
                          <p className="text-xs text-muted-foreground">Unit</p>
                        </div>
                      </div>
                      {isLowStock && (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => generateRfqMutation.mutate(material.id)}
                          disabled={generateRfqMutation.isPending}
                          data-testid={`button-request-quote-${material.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Request Quote
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          {/* Suppliers Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name or email..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="pl-9"
                data-testid="input-supplier-search"
              />
            </div>
            <Button onClick={() => setShowAddSupplierDialog(true)} data-testid="button-add-supplier">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          {/* Suppliers Grid */}
          {filteredSuppliers.length === 0 ? (
            <Card className="border-dashed" data-testid="card-no-suppliers">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {suppliers?.length === 0 ? "No suppliers yet" : "No matching suppliers"}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                  {suppliers?.length === 0 
                    ? "Add your suppliers to track orders, monitor risk, and generate RFQs automatically."
                    : "Try adjusting your search terms to find what you're looking for."}
                </p>
                {suppliers?.length === 0 && (
                  <Button onClick={() => setShowAddSupplierDialog(true)} data-testid="button-add-first-supplier">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Supplier
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover-elevate" data-testid={`card-supplier-${supplier.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{supplier.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {supplier.contactEmail || "No email"}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-supplier-menu-${supplier.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => setShowDeleteConfirm({ type: 'supplier', id: supplier.id, name: supplier.name })}
                            data-testid={`menu-item-delete-supplier-${supplier.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-add-supplier">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Add New Supplier
            </DialogTitle>
            <DialogDescription>
              Add a supplier to your network. You can send them RFQs and track orders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Supplier Name *</Label>
              <Input
                id="supplier-name"
                placeholder="e.g., Acme Industrial Supply"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                data-testid="input-supplier-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-email" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Contact Email
              </Label>
              <Input
                id="supplier-email"
                type="email"
                placeholder="contact@supplier.com"
                value={supplierForm.contactEmail}
                onChange={(e) => setSupplierForm({ ...supplierForm, contactEmail: e.target.value })}
                data-testid="input-supplier-email"
              />
              <p className="text-xs text-muted-foreground">Used for RFQ requests and order communications</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowAddSupplierDialog(false); resetSupplierForm(); }}
              data-testid="button-cancel-supplier"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createSupplierMutation.mutate(supplierForm)}
              disabled={supplierForm.name.trim() === "" || createSupplierMutation.isPending}
              data-testid="button-save-supplier"
            >
              {createSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog - Uses shared component with Browse Commodities feature */}
      <CreateMaterialDialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {showDeleteConfirm?.type === 'supplier' ? 'Supplier' : 'Material'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showDeleteConfirm?.type === 'supplier') {
                  deleteSupplierMutation.mutate(showDeleteConfirm.id);
                } else if (showDeleteConfirm?.type === 'material') {
                  deleteMaterialMutation.mutate(showDeleteConfirm.id);
                }
              }}
              disabled={deleteSupplierMutation.isPending || deleteMaterialMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {(deleteSupplierMutation.isPending || deleteMaterialMutation.isPending) ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
