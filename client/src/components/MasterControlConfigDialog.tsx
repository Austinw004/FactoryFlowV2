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

interface MasterControlConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MasterControlConfigDialog({ open, onOpenChange }: MasterControlConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [syncDocuments, setSyncDocuments] = useState(true);
  const [syncDeviations, setSyncDeviations] = useState(true);
  const [syncTraining, setSyncTraining] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/mastercontrol/test", {
        instanceUrl,
        apiKey,
        apiSecret
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "MasterControl connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to MasterControl", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/mastercontrol/configure", {
        instanceUrl,
        apiKey,
        apiSecret,
        syncOptions: { syncDocuments, syncDeviations, syncTraining }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "MasterControl integration configured successfully" });
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
          <DialogTitle>Configure MasterControl</DialogTitle>
          <DialogDescription>
            Connect to MasterControl for quality management and regulatory compliance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mc-url">Instance URL</Label>
            <Input
              id="mc-url"
              data-testid="input-mastercontrol-url"
              placeholder="https://company.mastercontrol.com"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mc-key">API Key</Label>
            <Input
              id="mc-key"
              data-testid="input-mastercontrol-key"
              placeholder="API key from MasterControl"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mc-secret">API Secret</Label>
            <Input
              id="mc-secret"
              data-testid="input-mastercontrol-secret"
              type="password"
              placeholder="API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-docs" className="text-sm font-normal">Document Control</Label>
              <Switch id="sync-docs" checked={syncDocuments} onCheckedChange={setSyncDocuments} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-deviations" className="text-sm font-normal">Deviations & CAPA</Label>
              <Switch id="sync-deviations" checked={syncDeviations} onCheckedChange={setSyncDeviations} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-training" className="text-sm font-normal">Training Records</Label>
              <Switch id="sync-training" checked={syncTraining} onCheckedChange={setSyncTraining} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-mastercontrol-test"
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
              data-testid="button-mastercontrol-save"
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
