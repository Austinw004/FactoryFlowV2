import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, AlertCircle, Package, Layers, BookOpen, TrendingUp, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Sku, Material } from "@shared/schema";

export default function Configuration() {
  const { data: skus, isLoading: isLoadingSkus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

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

      <Card className="border-primary/20" data-testid="card-platform-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6" />
            How This Platform Works
          </CardTitle>
          <CardDescription>
            Understanding dual-circuit economics and your competitive manufacturing advantage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Our Unique Financial Outlook
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Traditional economic analysis treats financial markets and the real economy as a unified system. 
                This is fundamentally wrong. <strong className="text-foreground">Financial markets and the real economy operate as two distinct circuits</strong> that can—and often do—diverge dramatically.
              </p>
              <p>
                The <strong className="text-foreground">Financial-to-Real Divergence (FDR) ratio</strong> measures this disconnect by comparing:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Financial Circuit:</strong> Asset price appreciation (S&P 500, margin debt expansion)</li>
                <li><strong className="text-foreground">Real Circuit:</strong> Manufacturing activity (PMI), core inflation, commercial lending</li>
              </ul>
              <p>
                When FDR rises above 3.0, financial assets are detaching from productive economic reality. 
                When FDR falls below 1.0, the real economy is outpacing speculative financial activity. 
                This creates <strong className="text-foreground">four distinct economic regimes</strong>, each requiring radically different manufacturing strategies.
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3">The Four Economic Regimes</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-primary mb-2">1. Healthy Expansion (FDR 0.8-1.5)</h4>
                <p className="text-sm text-muted-foreground">
                  Financial and real circuits aligned. Normal growth conditions. 
                  <strong className="text-foreground"> Strategy:</strong> Steady capacity expansion, balanced procurement.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-orange-600 mb-2">2. Asset-Led Growth (FDR 1.5-3.0)</h4>
                <p className="text-sm text-muted-foreground">
                  Financial circuit pulling ahead. Credit flowing but manufacturing not yet inflated. 
                  <strong className="text-foreground"> Strategy:</strong> Aggressive material stockpiling before price surge.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-destructive mb-2">3. Imbalanced Excess (FDR &gt; 3.0)</h4>
                <p className="text-sm text-muted-foreground">
                  Dangerous financial bubble. Asset prices divorced from fundamentals. 
                  <strong className="text-foreground"> Strategy:</strong> Defensive posture—reduce inventory, delay capex, preserve cash.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-green-600 mb-2">4. Real Economy Lead (FDR &lt; 0.8)</h4>
                <p className="text-sm text-muted-foreground">
                  Manufacturing recovering faster than finance. Demand returning, assets cheap. 
                  <strong className="text-foreground"> Strategy:</strong> Counter-cyclical procurement—buy aggressively while competitors hesitate.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Your Competitive Manufacturing Advantage
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Most manufacturing companies react to economic cycles after they happen. They buy materials when demand surges (paying peak prices) 
                and slash inventory when demand falls (missing recovery opportunities). <strong className="text-foreground">This platform lets you act before the cycle turns.</strong>
              </p>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-foreground">Here's How You Win:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span><strong className="text-foreground">Regime-Aware Forecasting:</strong> Demand predictions automatically adjust based on FDR. In Imbalanced Excess, the system reduces forecasts by 15-30% before your competitors see demand collapse.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span><strong className="text-foreground">Counter-Cyclical Procurement:</strong> When FDR signals Real Economy Lead, procurement signals tell you exactly when to buy materials at depressed prices—while competitors are still paralyzed by fear.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span><strong className="text-foreground">Constraint-Based Allocation:</strong> The allocation engine optimizes material distribution across SKUs using your bill of materials, priorities, and real-time inventory—maximizing fill rates and minimizing waste.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">4.</span>
                    <span><strong className="text-foreground">Policy Automation:</strong> Each regime generates specific policy signals (inventory buffers, credit terms, capex gates) that translate economic intelligence into actionable manufacturing decisions.</span>
                  </li>
                </ul>
              </div>

              <p>
                The result? <strong className="text-foreground">You lock in material cost advantages during downturns, avoid overproduction during bubbles, and maintain optimal inventory through full cycles.</strong> 
                While competitors swing between feast and famine, you operate with consistent efficiency and superior margins.
              </p>
              
              <p className="text-sm italic border-l-2 border-primary pl-4">
                "This isn't about predicting the future—it's about recognizing the present regime and acting accordingly. 
                The dual-circuit framework gives manufacturers the same structural advantage that macro hedge funds have used for decades."
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3">Platform Components Explained</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Dashboard</h4>
                <p>Real-time FDR score, current regime status, and key manufacturing KPIs at a glance.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Forecasting</h4>
                <p>SKU demand predictions adjusted by regime multipliers. Shows historical vs. predicted demand with regime context.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Allocation</h4>
                <p>Constraint-based optimization that allocates materials across SKUs considering BOM requirements, priorities, inventory, and budget limits.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Procurement</h4>
                <p>Supplier management and counter-cyclical procurement signals based on FDR thresholds. Tells you when to buy or hold.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Reports</h4>
                <p>Historical allocation analysis, fill rate tracking, and manufacturing intelligence analytics.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Configuration</h4>
                <p>SKU priorities, material inventory, and this comprehensive platform guide.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
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

        <Card data-testid="card-material-config">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Material Configuration
            </CardTitle>
            <CardDescription>Raw materials and inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!materials || materials.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No materials configured. Use the seed data button on the dashboard to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                    data-testid={`material-item-${material.id}`}
                  >
                    <div>
                      <div className="font-medium" data-testid={`text-material-name-${material.id}`}>
                        {material.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        On Hand: {material.onHand} {material.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Code: {material.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
