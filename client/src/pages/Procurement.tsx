import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import type { Supplier, Material } from "@shared/schema";

export default function Procurement() {
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ["/api/economics/regime"],
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-procurement">
          Procurement Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Counter-cyclical procurement strategy based on economic indicators
        </p>
      </div>

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
              Regime: <span className="font-semibold">{regime?.regime || "Unknown"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Suppliers</h2>
        {!suppliers || suppliers.length === 0 ? (
          <Alert data-testid="alert-no-suppliers">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No suppliers configured. Add suppliers in the Configuration page.
            </AlertDescription>
          </Alert>
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
          <Alert data-testid="alert-no-materials">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No materials configured. Add materials in the Configuration page.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <Card key={material.id} data-testid={`card-material-${material.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{material.name}</CardTitle>
                  <CardDescription>{material.unit}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">On Hand:</span>
                    <span className="font-semibold">{material.onHand}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Inbound:</span>
                    <span className="font-semibold">{material.inbound || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Code:</span>
                    <span className="font-semibold">{material.code}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
