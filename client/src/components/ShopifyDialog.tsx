import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, ShoppingCart, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShopifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const syncedDataTypes = [
  { id: "orders", name: "Orders", description: "Sync order data as demand signals" },
  { id: "products", name: "Products", description: "Sync product catalog with SKUs" },
  { id: "inventory", name: "Inventory", description: "Real-time inventory levels" },
  { id: "customers", name: "Customers", description: "Customer data for demand analysis" },
];

const webhookEvents = [
  { event: "orders/create", description: "New order placed" },
  { event: "orders/fulfilled", description: "Order fulfilled" },
  { event: "products/update", description: "Product updated" },
  { event: "inventory_levels/update", description: "Inventory changed" },
];

export function ShopifyDialog({ open, onOpenChange }: ShopifyDialogProps) {
  const { toast } = useToast();
  const [shopDomain, setShopDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${baseUrl}/api/webhooks/inbound/shopify`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const configureMutation = useMutation({
    mutationFn: async (data: { shopDomain: string; apiKey: string; apiSecret: string; syncOptions: any }) => {
      const res = await apiRequest("POST", "/api/integrations/shopify/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Shopify Configured",
        description: "Your Shopify integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Shopify configuration.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!shopDomain) {
      toast({
        title: "Missing Shop Domain",
        description: "Please enter your Shopify store domain.",
        variant: "destructive",
      });
      return;
    }
    configureMutation.mutate({
      shopDomain,
      apiKey,
      apiSecret,
      syncOptions: { syncOrders, syncProducts, syncInventory },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#96BF48]" />
            Shopify Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Shopify store to sync orders as demand signals and manage inventory.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="setup" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" data-testid="tab-shopify-setup">
              Setup
            </TabsTrigger>
            <TabsTrigger value="webhooks" data-testid="tab-shopify-webhooks">
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-shopify-data">
              Data Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-green-500/10 p-3 text-sm">
                  <p className="font-medium text-green-600 dark:text-green-400">Connect Your Shopify Store</p>
                  <p className="text-muted-foreground mt-1">
                    Enter your store details to enable bi-directional data sync.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shop-domain">Store Domain</Label>
                  <Input
                    id="shop-domain"
                    data-testid="input-shopify-domain"
                    placeholder="your-store.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key (Optional)</Label>
                  <Input
                    id="api-key"
                    data-testid="input-shopify-api-key"
                    placeholder="shpat_xxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for pulling data. Leave empty to use webhooks only.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-secret">Webhook Shared Secret</Label>
                  <Input
                    id="api-secret"
                    data-testid="input-shopify-secret"
                    type="password"
                    placeholder="shpss_xxxxx"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to verify webhook authenticity. Found in Shopify Admin &rarr; Settings &rarr; Notifications.
                  </p>
                </div>

                <div className="pt-2">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href="https://shopify.dev/docs/apps/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Shopify API Documentation
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-blue-500/10 p-3 text-sm">
                  <p className="font-medium text-blue-600 dark:text-blue-400">Webhook Configuration</p>
                  <p className="text-muted-foreground mt-1">
                    Add this URL to your Shopify webhooks to receive real-time updates.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="font-mono text-sm"
                      data-testid="input-shopify-webhook-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Supported Webhook Events</Label>
                  <div className="space-y-2">
                    {webhookEvents.map((evt) => (
                      <Card key={evt.event}>
                        <CardHeader className="py-2 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-mono">{evt.event}</CardTitle>
                            <Badge variant="outline" className="text-xs">Supported</Badge>
                          </div>
                          <CardDescription className="text-xs">{evt.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium mb-2">Setup Instructions</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to Shopify Admin &rarr; Settings &rarr; Notifications</li>
                    <li>Scroll down to Webhooks section</li>
                    <li>Click "Create webhook"</li>
                    <li>Select event (e.g., Order creation)</li>
                    <li>Paste the webhook URL above</li>
                    <li>Select JSON format and save</li>
                  </ol>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-amber-500/10 p-3 text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Data Sync Options</p>
                  <p className="text-muted-foreground mt-1">
                    Choose which data types to sync between Shopify and Prescient Labs.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label>Orders</Label>
                      <p className="text-xs text-muted-foreground">Import orders as demand signals</p>
                    </div>
                    <Switch
                      data-testid="switch-shopify-orders"
                      checked={syncOrders}
                      onCheckedChange={setSyncOrders}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label>Products</Label>
                      <p className="text-xs text-muted-foreground">Sync product catalog with SKUs</p>
                    </div>
                    <Switch
                      data-testid="switch-shopify-products"
                      checked={syncProducts}
                      onCheckedChange={setSyncProducts}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label>Inventory</Label>
                      <p className="text-xs text-muted-foreground">Real-time inventory updates</p>
                    </div>
                    <Switch
                      data-testid="switch-shopify-inventory"
                      checked={syncInventory}
                      onCheckedChange={setSyncInventory}
                    />
                  </div>
                </div>

                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Data Flow
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Shopify orders become demand signals for forecasting. Inventory levels sync bi-directionally for accurate availability.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending || !shopDomain}
            data-testid="button-save-shopify"
          >
            {configureMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
