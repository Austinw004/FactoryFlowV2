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

interface SAPEWMConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SAPEWMConfigDialog({ open, onOpenChange }: SAPEWMConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [serverUrl, setServerUrl] = useState("");
  const [client, setClient] = useState("");
  const [warehouseNumber, setWarehouseNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncTasks, setSyncTasks] = useState(true);
  const [syncDeliveries, setSyncDeliveries] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sap-ewm/test", {
        serverUrl,
        client,
        warehouseNumber,
        username,
        password
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "SAP EWM connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to SAP EWM", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sap-ewm/configure", {
        serverUrl,
        client,
        warehouseNumber,
        username,
        password,
        syncOptions: { syncInventory, syncTasks, syncDeliveries }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "SAP EWM integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = serverUrl && client && warehouseNumber && username && password;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure SAP EWM</DialogTitle>
          <DialogDescription>
            Connect to SAP Extended Warehouse Management for advanced logistics operations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ewm-url">Server URL</Label>
            <Input
              id="ewm-url"
              data-testid="input-ewm-url"
              placeholder="https://sap-ewm.company.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ewm-client">Client</Label>
            <Input
              id="ewm-client"
              data-testid="input-ewm-client"
              placeholder="100"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ewm-warehouse">Warehouse Number</Label>
            <Input
              id="ewm-warehouse"
              data-testid="input-ewm-warehouse"
              placeholder="WH01"
              value={warehouseNumber}
              onChange={(e) => setWarehouseNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ewm-username">Username</Label>
            <Input
              id="ewm-username"
              data-testid="input-ewm-username"
              placeholder="SAP username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ewm-password">Password</Label>
            <Input
              id="ewm-password"
              data-testid="input-ewm-password"
              type="password"
              placeholder="SAP password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-inv" className="text-sm font-normal">Inventory & Stock</Label>
              <Switch id="sync-inv" checked={syncInventory} onCheckedChange={setSyncInventory} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-tasks" className="text-sm font-normal">Warehouse Tasks</Label>
              <Switch id="sync-tasks" checked={syncTasks} onCheckedChange={setSyncTasks} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-deliveries" className="text-sm font-normal">Inbound/Outbound Deliveries</Label>
              <Switch id="sync-deliveries" checked={syncDeliveries} onCheckedChange={setSyncDeliveries} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-ewm-test"
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
              data-testid="button-ewm-save"
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
