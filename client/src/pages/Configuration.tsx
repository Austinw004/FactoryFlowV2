import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, AlertCircle, Package } from "lucide-react";
import type { Sku, Material } from "@shared/schema";

export default function Configuration() {

  const { data: skus, isLoading: isLoadingSkus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  // Materials are still loaded in the system but not displayed in UI
  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  if (isLoadingSkus || isLoadingMaterials) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-configuration">
          Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage SKUs, materials, and system settings
        </p>
      </div>

      <Card data-testid="card-sku-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            SKU Configuration
          </CardTitle>
          <CardDescription>Product SKUs and their priorities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!skus || skus.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No SKUs configured. Use the seed data button on the dashboard to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {skus.map((sku) => (
                <div
                  key={sku.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`sku-item-${sku.id}`}
                >
                  <div>
                    <div className="font-medium" data-testid={`text-sku-name-${sku.id}`}>
                      {sku.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Priority: {sku.priority}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-system-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Platform configuration and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total SKUs:</span>
            <span className="font-semibold" data-testid="text-total-skus">
              {skus?.length || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Materials:</span>
            <span className="font-semibold" data-testid="text-total-materials">
              {materials?.length || 0}
            </span>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This platform uses dual-circuit economic intelligence to optimize manufacturing allocation decisions.
              Commodity trading capabilities enabled with real-time pricing for 110+ materials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
