import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

interface AmazonSellerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AmazonSellerConfigDialog({ open, onOpenChange }: AmazonSellerConfigDialogProps) {
  const { toast } = useToast();
  const [sellerId, setSellerId] = useState("");
  const [mwsAuthToken, setMwsAuthToken] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncFba, setSyncFba] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestConnection = async () => {
    if (!sellerId || !accessKeyId || !secretAccessKey) {
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
      await apiRequest("POST", "/api/integrations/amazon-seller/test", { sellerId, mwsAuthToken, accessKeyId, secretAccessKey, marketplace });
      setTestSuccess(true);
      toast({
        title: "Connection successful",
        description: "Amazon Seller Central credentials verified",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!sellerId || !accessKeyId || !secretAccessKey) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/integrations/amazon-seller/configure", {
        sellerId,
        mwsAuthToken,
        accessKeyId,
        secretAccessKey,
        marketplace,
        syncOptions: { orders: syncOrders, inventory: syncInventory, fba: syncFba },
      });
      toast({
        title: "Integration configured",
        description: "Amazon Seller Central integration is now active",
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
          <DialogTitle>Configure Amazon Seller Central</DialogTitle>
          <DialogDescription>
            Connect your Amazon Seller account to sync orders, inventory, and FBA data for demand forecasting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="seller-id">Seller ID *</Label>
            <Input
              id="seller-id"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              placeholder="A1B2C3D4E5F6G7"
              data-testid="input-amazon-seller-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-key">AWS Access Key ID *</Label>
            <Input
              id="access-key"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              data-testid="input-amazon-access-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">AWS Secret Access Key *</Label>
            <Input
              id="secret-key"
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              data-testid="input-amazon-secret-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mws-token">MWS Auth Token (optional)</Label>
            <Input
              id="mws-token"
              value={mwsAuthToken}
              onChange={(e) => setMwsAuthToken(e.target.value)}
              placeholder="amzn.mws.xxx-xxx-xxx"
              data-testid="input-amazon-mws-token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace">Marketplace</Label>
            <Select value={marketplace} onValueChange={setMarketplace}>
              <SelectTrigger data-testid="select-amazon-marketplace">
                <SelectValue placeholder="Select marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US" data-testid="option-amazon-marketplace-us">United States</SelectItem>
                <SelectItem value="CA" data-testid="option-amazon-marketplace-ca">Canada</SelectItem>
                <SelectItem value="MX" data-testid="option-amazon-marketplace-mx">Mexico</SelectItem>
                <SelectItem value="UK" data-testid="option-amazon-marketplace-uk">United Kingdom</SelectItem>
                <SelectItem value="DE" data-testid="option-amazon-marketplace-de">Germany</SelectItem>
                <SelectItem value="FR" data-testid="option-amazon-marketplace-fr">France</SelectItem>
                <SelectItem value="JP" data-testid="option-amazon-marketplace-jp">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-orders" className="text-sm font-normal">Sync orders</Label>
              <Switch id="sync-orders" checked={syncOrders} onCheckedChange={setSyncOrders} data-testid="switch-sync-orders" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-inventory" className="text-sm font-normal">Sync inventory levels</Label>
              <Switch id="sync-inventory" checked={syncInventory} onCheckedChange={setSyncInventory} data-testid="switch-sync-inventory" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-fba" className="text-sm font-normal">Sync FBA data</Label>
              <Switch id="sync-fba" checked={syncFba} onCheckedChange={setSyncFba} data-testid="switch-sync-fba" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !sellerId || !accessKeyId || !secretAccessKey}
              data-testid="button-test-amazon"
            >
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : testSuccess ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : null}
              {testSuccess ? "Connected" : "Test Connection"}
            </Button>
            <a
              href="https://sellercentral.amazon.com/apps/authorize/consent"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Get credentials <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-amazon">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !sellerId || !accessKeyId || !secretAccessKey} data-testid="button-save-amazon">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
