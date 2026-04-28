import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Database, Loader2 } from "lucide-react";

interface AirtableConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AirtableConfigDialog({ open, onOpenChange }: AirtableConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [baseId, setBaseId] = useState("");
  const [defaultTableId, setDefaultTableId] = useState("");
  const [syncRecords, setSyncRecords] = useState(true);
  const [enableWebhooks, setEnableWebhooks] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/airtable/test", {
        apiKey,
        baseId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Airtable API credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/airtable/configure", {
        apiKey,
        baseId,
        defaultTableId,
        syncOptions: { syncRecords, enableWebhooks },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Airtable configured", description: "Integration saved successfully" });
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
            <Database className="h-5 w-5 text-signal" />
            Configure Airtable
          </DialogTitle>
          <DialogDescription>
            Connect Airtable for flexible data management and collaboration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="airtable-api-key">Personal Access Token</Label>
            <Input
              id="airtable-api-key"
              type="password"
              placeholder="Enter your Airtable personal access token"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-airtable-api-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="airtable-base">Base ID</Label>
            <Input
              id="airtable-base"
              placeholder="e.g., appXXXXXXXXXXXXXX"
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              data-testid="input-airtable-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="airtable-table">Default Table ID (Optional)</Label>
            <Input
              id="airtable-table"
              placeholder="e.g., tblXXXXXXXXXXXXXX"
              value={defaultTableId}
              onChange={(e) => setDefaultTableId(e.target.value)}
              data-testid="input-airtable-table"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="airtable-records">Sync records</Label>
            <Switch
              id="airtable-records"
              checked={syncRecords}
              onCheckedChange={setSyncRecords}
              data-testid="switch-airtable-records"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="airtable-webhooks">Enable webhooks</Label>
            <Switch
              id="airtable-webhooks"
              checked={enableWebhooks}
              onCheckedChange={setEnableWebhooks}
              data-testid="switch-airtable-webhooks"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!apiKey || !baseId || testMutation.isPending}
            data-testid="button-airtable-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !baseId || saveMutation.isPending}
            data-testid="button-airtable-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
