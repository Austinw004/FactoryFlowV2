import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Loader2 } from "lucide-react";

interface SAPConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SAPConfigDialog({ open, onOpenChange }: SAPConfigDialogProps) {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [client, setClient] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncMaterials, setSyncMaterials] = useState(true);
  const [syncPurchaseOrders, setSyncPurchaseOrders] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/sap/test", {
        serverUrl,
        client,
        username,
        password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "SAP S/4HANA credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/sap/configure", {
        serverUrl,
        client,
        username,
        password,
        syncOptions: { syncMaterials, syncPurchaseOrders },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "SAP S/4HANA configured", description: "Integration saved successfully" });
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
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Configure SAP S/4HANA
          </DialogTitle>
          <DialogDescription>
            Connect to SAP S/4HANA for enterprise resource planning integration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sap-url">Server URL</Label>
            <Input
              id="sap-url"
              placeholder="https://your-sap-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              data-testid="input-sap-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sap-client">Client</Label>
            <Input
              id="sap-client"
              placeholder="e.g., 100"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              data-testid="input-sap-client"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sap-username">Username</Label>
            <Input
              id="sap-username"
              placeholder="Enter your SAP username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-sap-username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sap-password">Password</Label>
            <Input
              id="sap-password"
              type="password"
              placeholder="Enter your SAP password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-sap-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sap-materials">Sync material master</Label>
            <Switch
              id="sap-materials"
              checked={syncMaterials}
              onCheckedChange={setSyncMaterials}
              data-testid="switch-sap-materials"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sap-po">Sync purchase orders</Label>
            <Switch
              id="sap-po"
              checked={syncPurchaseOrders}
              onCheckedChange={setSyncPurchaseOrders}
              data-testid="switch-sap-po"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!serverUrl || !client || !username || !password || testMutation.isPending}
            data-testid="button-sap-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!serverUrl || !client || !username || !password || saveMutation.isPending}
            data-testid="button-sap-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
