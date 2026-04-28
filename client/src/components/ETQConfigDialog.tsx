import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileCheck, Loader2 } from "lucide-react";

interface ETQConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ETQConfigDialog({ open, onOpenChange }: ETQConfigDialogProps) {
  const { toast } = useToast();
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [syncCAPA, setSyncCAPA] = useState(true);
  const [syncAudits, setSyncAudits] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/etq/test", {
        instanceUrl,
        apiKey,
        apiSecret,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "ETQ Reliance credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/etq/configure", {
        instanceUrl,
        apiKey,
        apiSecret,
        syncOptions: { syncCAPA, syncAudits },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "ETQ Reliance configured", description: "Integration saved successfully" });
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
            <FileCheck className="h-5 w-5 text-good" />
            Configure ETQ Reliance
          </DialogTitle>
          <DialogDescription>
            Connect to ETQ Reliance for quality management data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="etq-url">Instance URL</Label>
            <Input
              id="etq-url"
              placeholder="https://your-company.etq.com"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              data-testid="input-etq-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etq-api-key">API Key</Label>
            <Input
              id="etq-api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-etq-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etq-api-secret">API Secret</Label>
            <Input
              id="etq-api-secret"
              type="password"
              placeholder="Enter your API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              data-testid="input-etq-api-secret"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="etq-capa">Sync CAPA data</Label>
            <Switch
              id="etq-capa"
              checked={syncCAPA}
              onCheckedChange={setSyncCAPA}
              data-testid="switch-etq-capa"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="etq-audits">Sync audit data</Label>
            <Switch
              id="etq-audits"
              checked={syncAudits}
              onCheckedChange={setSyncAudits}
              data-testid="switch-etq-audits"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!instanceUrl || !apiKey || !apiSecret || testMutation.isPending}
            data-testid="button-etq-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!instanceUrl || !apiKey || !apiSecret || saveMutation.isPending}
            data-testid="button-etq-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
