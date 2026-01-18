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

interface JaggaerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JaggaerConfigDialog({ open, onOpenChange }: JaggaerConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [syncRequisitions, setSyncRequisitions] = useState(true);
  const [syncSuppliers, setSyncSuppliers] = useState(true);
  const [syncContracts, setSyncContracts] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/jaggaer/test", {
        instanceUrl,
        apiKey,
        apiSecret
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "Jaggaer connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to Jaggaer", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/jaggaer/configure", {
        instanceUrl,
        apiKey,
        apiSecret,
        syncOptions: { syncRequisitions, syncSuppliers, syncContracts }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "Jaggaer integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = instanceUrl && apiKey && apiSecret;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Jaggaer</DialogTitle>
          <DialogDescription>
            Connect to Jaggaer for source-to-pay and procurement automation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jaggaer-url">Instance URL</Label>
            <Input
              id="jaggaer-url"
              data-testid="input-jaggaer-url"
              placeholder="https://company.jaggaer.com"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jaggaer-key">API Key</Label>
            <Input
              id="jaggaer-key"
              data-testid="input-jaggaer-key"
              placeholder="API key from Jaggaer"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jaggaer-secret">API Secret</Label>
            <Input
              id="jaggaer-secret"
              data-testid="input-jaggaer-secret"
              type="password"
              placeholder="API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-reqs" className="text-sm font-normal">Requisitions & POs</Label>
              <Switch id="sync-reqs" checked={syncRequisitions} onCheckedChange={setSyncRequisitions} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-suppliers" className="text-sm font-normal">Supplier Data</Label>
              <Switch id="sync-suppliers" checked={syncSuppliers} onCheckedChange={setSyncSuppliers} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-contracts" className="text-sm font-normal">Contracts</Label>
              <Switch id="sync-contracts" checked={syncContracts} onCheckedChange={setSyncContracts} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-jaggaer-test"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : testMutation.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              ) : testMutation.isError ? (
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
              ) : null}
              Test Connection
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!isFormValid || saveMutation.isPending}
              className="flex-1"
              data-testid="button-jaggaer-save"
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
