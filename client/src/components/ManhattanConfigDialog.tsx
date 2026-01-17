import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Warehouse, Loader2 } from "lucide-react";

interface ManhattanConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManhattanConfigDialog({ open, onOpenChange }: ManhattanConfigDialogProps) {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/manhattan/test", {
        serverUrl,
        username,
        password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Manhattan WMS credentials verified" });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/manhattan/configure", {
        serverUrl,
        username,
        password,
        warehouseId,
        syncOptions: { syncInventory, syncOrders },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Manhattan WMS configured", description: "Integration saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Configuration failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-orange-500" />
            Configure Manhattan WMS
          </DialogTitle>
          <DialogDescription>
            Connect to Manhattan WMS for real-time warehouse visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manhattan-url">Server URL</Label>
            <Input
              id="manhattan-url"
              placeholder="https://your-wms-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              data-testid="input-manhattan-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manhattan-username">Username</Label>
            <Input
              id="manhattan-username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-manhattan-username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manhattan-password">Password</Label>
            <Input
              id="manhattan-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-manhattan-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manhattan-warehouse">Warehouse ID (Optional)</Label>
            <Input
              id="manhattan-warehouse"
              placeholder="Enter default warehouse ID"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              data-testid="input-manhattan-warehouse"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="manhattan-inventory">Sync inventory</Label>
            <Switch
              id="manhattan-inventory"
              checked={syncInventory}
              onCheckedChange={setSyncInventory}
              data-testid="switch-manhattan-inventory"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="manhattan-orders">Sync orders</Label>
            <Switch
              id="manhattan-orders"
              checked={syncOrders}
              onCheckedChange={setSyncOrders}
              data-testid="switch-manhattan-orders"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!serverUrl || !username || !password || testMutation.isPending}
            data-testid="button-manhattan-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!serverUrl || !username || !password || saveMutation.isPending}
            data-testid="button-manhattan-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
