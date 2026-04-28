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

interface AribaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AribaConfigDialog({ open, onOpenChange }: AribaConfigDialogProps) {
  const { toast } = useToast();
  const [realm, setRealm] = useState("");
  const [applicationKey, setApplicationKey] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [syncSuppliers, setSyncSuppliers] = useState(true);
  const [syncRFQs, setSyncRFQs] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/ariba/test", {
        realm,
        applicationKey,
        sharedSecret,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "SAP Ariba credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/ariba/configure", {
        realm,
        applicationKey,
        sharedSecret,
        syncOptions: { syncSuppliers, syncRFQs },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "SAP Ariba configured", description: "Integration saved successfully" });
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
            Configure SAP Ariba
          </DialogTitle>
          <DialogDescription>
            Connect to SAP Ariba for procurement network integration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ariba-realm">Realm</Label>
            <Input
              id="ariba-realm"
              placeholder="Enter your Ariba realm"
              value={realm}
              onChange={(e) => setRealm(e.target.value)}
              data-testid="input-ariba-realm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ariba-app-key">Application Key</Label>
            <Input
              id="ariba-app-key"
              type="password"
              placeholder="Enter your application key"
              value={applicationKey}
              onChange={(e) => setApplicationKey(e.target.value)}
              data-testid="input-ariba-app-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ariba-secret">Shared Secret</Label>
            <Input
              id="ariba-secret"
              type="password"
              placeholder="Enter your shared secret"
              value={sharedSecret}
              onChange={(e) => setSharedSecret(e.target.value)}
              data-testid="input-ariba-secret"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ariba-suppliers">Sync suppliers</Label>
            <Switch
              id="ariba-suppliers"
              checked={syncSuppliers}
              onCheckedChange={setSyncSuppliers}
              data-testid="switch-ariba-suppliers"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ariba-rfqs">Sync RFQs</Label>
            <Switch
              id="ariba-rfqs"
              checked={syncRFQs}
              onCheckedChange={setSyncRFQs}
              data-testid="switch-ariba-rfqs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!realm || !applicationKey || !sharedSecret || testMutation.isPending}
            data-testid="button-ariba-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!realm || !applicationKey || !sharedSecret || saveMutation.isPending}
            data-testid="button-ariba-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
