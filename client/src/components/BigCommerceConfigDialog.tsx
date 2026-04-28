import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, ShoppingBag } from "lucide-react";

interface BigCommerceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BigCommerceConfigDialog({ open, onOpenChange }: BigCommerceConfigDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    storeHash: "",
    accessToken: "",
    clientId: "",
    clientSecret: "",
    syncOrders: true,
    syncProducts: true,
    syncCustomers: false,
    syncInventory: true,
  });

  const handleTestConnection = async () => {
    if (!config.storeHash || !config.accessToken) {
      toast({
        title: "Missing credentials",
        description: "Please enter store hash and access token",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);
    try {
      const response = await apiRequest("POST", "/api/integrations/bigcommerce/test", {
        storeHash: config.storeHash,
        accessToken: config.accessToken,
      });
      const data = await response.json();
      if (data.success) {
        setTestSuccess(true);
        toast({
          title: "Connection successful",
          description: data.message || "BigCommerce store connection verified",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message || "Could not connect to BigCommerce",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to BigCommerce",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/bigcommerce/configure", {
        ...config,
        enabled: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "Configuration saved",
        description: "BigCommerce integration has been configured",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-bigcommerce-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-purple-500" />
            Configure BigCommerce
          </DialogTitle>
          <DialogDescription>
            Connect your BigCommerce store to sync orders and inventory for demand forecasting.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storeHash">Store Hash</Label>
              <Input
                id="storeHash"
                data-testid="input-store-hash"
                placeholder="abc123xyz"
                value={config.storeHash}
                onChange={(e) => setConfig({ ...config, storeHash: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                data-testid="input-access-token"
                type="password"
                placeholder="Your API access token"
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID (Optional)</Label>
              <Input
                id="clientId"
                data-testid="input-client-id"
                placeholder="OAuth client ID"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret (Optional)</Label>
              <Input
                id="clientSecret"
                data-testid="input-client-secret"
                type="password"
                placeholder="OAuth client secret"
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Data Sync Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="syncOrders" className="text-sm">Orders</Label>
                <Switch
                  id="syncOrders"
                  data-testid="switch-orders"
                  checked={config.syncOrders}
                  onCheckedChange={(checked) => setConfig({ ...config, syncOrders: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncProducts" className="text-sm">Products</Label>
                <Switch
                  id="syncProducts"
                  data-testid="switch-products"
                  checked={config.syncProducts}
                  onCheckedChange={(checked) => setConfig({ ...config, syncProducts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncCustomers" className="text-sm">Customers</Label>
                <Switch
                  id="syncCustomers"
                  data-testid="switch-customers"
                  checked={config.syncCustomers}
                  onCheckedChange={(checked) => setConfig({ ...config, syncCustomers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="syncInventory" className="text-sm">Inventory</Label>
                <Switch
                  id="syncInventory"
                  data-testid="switch-inventory"
                  checked={config.syncInventory}
                  onCheckedChange={(checked) => setConfig({ ...config, syncInventory: checked })}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            data-testid="button-test-connection"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : testSuccess ? (
              <CheckCircle className="h-4 w-4 mr-2 text-good" />
            ) : null}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
