import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

interface WooCommerceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WooCommerceConfigDialog({ open, onOpenChange }: WooCommerceConfigDialogProps) {
  const { toast } = useToast();
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncCustomers, setSyncCustomers] = useState(false);
  const [syncInventory, setSyncInventory] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestConnection = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      await apiRequest("POST", "/api/integrations/woocommerce/test", { storeUrl, consumerKey, consumerSecret });
      setTestSuccess(true);
      toast({
        title: "Connection successful",
        description: "WooCommerce store connection verified",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Please check your credentials and store URL",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/woocommerce/configure", {
        storeUrl,
        consumerKey,
        consumerSecret,
        syncOptions: { orders: syncOrders, products: syncProducts, customers: syncCustomers, inventory: syncInventory },
      });
      toast({
        title: "Integration configured",
        description: "WooCommerce integration is now active",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Configuration failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure WooCommerce</DialogTitle>
          <DialogDescription>
            Connect your WooCommerce store to sync orders, products, and inventory for demand planning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="store-url">Store URL *</Label>
            <Input
              id="store-url"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://yourstore.com"
              data-testid="input-woo-store-url"
            />
            <p className="text-xs text-muted-foreground">Your WordPress site URL with WooCommerce installed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumer-key">Consumer Key *</Label>
            <Input
              id="consumer-key"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              data-testid="input-woo-consumer-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumer-secret">Consumer Secret *</Label>
            <Input
              id="consumer-secret"
              type="password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              data-testid="input-woo-consumer-secret"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-orders" className="text-sm font-normal">Sync orders</Label>
              <Switch id="sync-orders" checked={syncOrders} onCheckedChange={setSyncOrders} data-testid="switch-sync-orders" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-products" className="text-sm font-normal">Sync products</Label>
              <Switch id="sync-products" checked={syncProducts} onCheckedChange={setSyncProducts} data-testid="switch-sync-products" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-inventory" className="text-sm font-normal">Sync inventory</Label>
              <Switch id="sync-inventory" checked={syncInventory} onCheckedChange={setSyncInventory} data-testid="switch-sync-inventory" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-customers" className="text-sm font-normal">Sync customer data</Label>
              <Switch id="sync-customers" checked={syncCustomers} onCheckedChange={setSyncCustomers} data-testid="switch-sync-customers" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !storeUrl || !consumerKey || !consumerSecret}
              data-testid="button-test-woo"
            >
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : testSuccess ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : null}
              {testSuccess ? "Connected" : "Test Connection"}
            </Button>
            <a
              href="https://woocommerce.com/document/woocommerce-rest-api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              API documentation <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-woo">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !storeUrl || !consumerKey || !consumerSecret} data-testid="button-save-woo">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
