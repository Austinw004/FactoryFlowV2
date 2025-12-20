import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { Supplier, Material } from "@shared/schema";
import { InfoTooltip } from "@/components/InfoTooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Procurement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ["/api/economics/regime"],
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
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-procurement">
            Procurement Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Counter-cyclical procurement strategy based on economic indicators
          </p>
        </div>
        <Button
          onClick={() => goToAgenticAI()}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="button-procurement-ai-assistant"
        >
          <Bot className="h-4 w-4 mr-2" />
          Ask AI About Procurement
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-materials">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Tracked in system</p>
          </CardContent>
        </Card>

        <Card data-testid="card-low-stock-count">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockMaterials.length}</div>
            <p className="text-xs text-muted-foreground">Below safety stock</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-suppliers">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">In network</p>
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
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              FDR: {regime?.fdr?.toFixed(2) || 'N/A'}
              <InfoTooltip term="fdr" />
            </p>
          </CardContent>
        </Card>
      </div>

      {recommendations.length > 0 && (
        <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-background" data-testid="card-ai-recommendations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Procurement Insights
            </CardTitle>
            <CardDescription>
              Recommendations based on current inventory levels and market conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                data-testid={`recommendation-${index}`}
              >
                {rec.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                {rec.type === 'opportunity' && <Zap className="h-5 w-5 text-green-500 mt-0.5" />}
                {rec.type === 'action' && <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{rec.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => goToAgenticAI()}
                  data-testid={`button-recommendation-action-${index}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="pt-2 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => goToAgenticAI()}
                data-testid="button-get-more-insights"
              >
                <Bot className="h-4 w-4 mr-2" />
                Get More AI Insights
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {signal && (
        <Card data-testid="card-procurement-signal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <signal.icon className="h-5 w-5" />
              Procurement Signal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={signal.variant} data-testid="badge-signal-action">
                {signal.action}
              </Badge>
              <span className="text-sm" data-testid="text-signal-description">
                {signal.description}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Current FDR: <span className="font-semibold">{regime?.fdr?.toFixed(2) || "0.00"}</span> | 
              Regime: <span className="font-semibold">{formatRegimeName(regime?.regime || "") || "Unknown"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Suppliers</h2>
        {!suppliers || suppliers.length === 0 ? (
          <Card className="border-dashed" data-testid="card-no-suppliers">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No suppliers yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Add your suppliers to track orders, monitor risk, and generate RFQs automatically.
              </p>
              <Button onClick={() => navigate("/configuration")} data-testid="button-add-suppliers">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Supplier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} data-testid={`card-supplier-${supplier.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  <CardDescription>Supplier Information</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Contact: {supplier.contactEmail || "No email on file"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Material Inventory</h2>
        {!materials || materials.length === 0 ? (
          <Card className="border-dashed" data-testid="card-no-materials">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No materials yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Add the raw materials you purchase to track inventory, get low-stock alerts, and optimize ordering.
              </p>
              <Button onClick={() => navigate("/configuration")} data-testid="button-add-materials">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Material
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => {
              const isLowStock = material.onHand < 10;
              return (
                <Card 
                  key={material.id} 
                  className={isLowStock ? "border-yellow-500/50" : ""}
                  data-testid={`card-material-${material.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{material.name}</CardTitle>
                      {isLowStock && (
                        <Badge variant="secondary" className="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{material.unit}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">On Hand:</span>
                        <span className={`font-semibold ${isLowStock ? 'text-yellow-600' : ''}`}>{material.onHand}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Inbound:</span>
                        <span className="font-semibold">{material.inbound || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Code:</span>
                        <span className="font-semibold">{material.code}</span>
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
      </div>
    </div>
  );
}
