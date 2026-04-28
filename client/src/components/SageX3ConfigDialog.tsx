import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface SageX3ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SageX3ConfigDialog({ open, onOpenChange }: SageX3ConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [serverUrl, setServerUrl] = useState("");
  const [folder, setFolder] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncPurchaseOrders, setSyncPurchaseOrders] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sage-x3/test", {
        serverUrl,
        folder,
        username,
        password
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "Sage X3 connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to Sage X3", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sage-x3/configure", {
        serverUrl,
        folder,
        username,
        password,
        syncOptions: { syncProducts, syncPurchaseOrders, syncInventory }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "Sage X3 integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = serverUrl && folder && username && password;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Sage X3</DialogTitle>
          <DialogDescription>
            Connect to Sage X3 ERP for product management and inventory synchronization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sage-url">Server URL</Label>
            <Input
              id="sage-url"
              data-testid="input-sage-url"
              placeholder="https://your-sage-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sage-folder">Folder</Label>
            <Input
              id="sage-folder"
              data-testid="input-sage-folder"
              placeholder="SEED"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sage-username">Username</Label>
            <Input
              id="sage-username"
              data-testid="input-sage-username"
              placeholder="API username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sage-password">Password</Label>
            <Input
              id="sage-password"
              data-testid="input-sage-password"
              type="password"
              placeholder="API password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-products" className="text-sm font-normal">Products & Items</Label>
              <Switch id="sync-products" checked={syncProducts} onCheckedChange={setSyncProducts} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-po" className="text-sm font-normal">Purchase Orders</Label>
              <Switch id="sync-po" checked={syncPurchaseOrders} onCheckedChange={setSyncPurchaseOrders} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-inventory" className="text-sm font-normal">Inventory Levels</Label>
              <Switch id="sync-inventory" checked={syncInventory} onCheckedChange={setSyncInventory} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-sage-test"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : testMutation.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-good" />
              ) : testMutation.isError ? (
                <XCircle className="h-4 w-4 mr-2 text-bad" />
              ) : null}
              Test Connection
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!isFormValid || saveMutation.isPending}
              className="flex-1"
              data-testid="button-sage-save"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
