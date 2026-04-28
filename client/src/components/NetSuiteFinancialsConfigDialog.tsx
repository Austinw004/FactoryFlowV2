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

interface NetSuiteFinancialsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NetSuiteFinancialsConfigDialog({ open, onOpenChange }: NetSuiteFinancialsConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [accountId, setAccountId] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");
  const [syncJournals, setSyncJournals] = useState(true);
  const [syncBudgets, setSyncBudgets] = useState(true);
  const [syncReports, setSyncReports] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/netsuite-financials/test", {
        accountId,
        consumerKey,
        consumerSecret,
        tokenId,
        tokenSecret
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: "NetSuite Financials connection verified" });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Could not connect to NetSuite", variant: "destructive" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/netsuite-financials/configure", {
        accountId,
        consumerKey,
        consumerSecret,
        tokenId,
        tokenSecret,
        syncOptions: { syncJournals, syncBudgets, syncReports }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "NetSuite Financials integration configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save configuration", variant: "destructive" });
    }
  });

  const isFormValid = accountId && consumerKey && consumerSecret && tokenId && tokenSecret;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure NetSuite Financials</DialogTitle>
          <DialogDescription>
            Connect to Oracle NetSuite for financial management and reporting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ns-account">Account ID</Label>
            <Input
              id="ns-account"
              data-testid="input-netsuite-account"
              placeholder="123456_SB1"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ns-consumer-key">Consumer Key</Label>
            <Input
              id="ns-consumer-key"
              data-testid="input-netsuite-consumer-key"
              placeholder="Consumer key from NetSuite"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ns-consumer-secret">Consumer Secret</Label>
            <Input
              id="ns-consumer-secret"
              data-testid="input-netsuite-consumer-secret"
              type="password"
              placeholder="Consumer secret"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ns-token-id">Token ID</Label>
            <Input
              id="ns-token-id"
              data-testid="input-netsuite-token-id"
              placeholder="Access token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ns-token-secret">Token Secret</Label>
            <Input
              id="ns-token-secret"
              data-testid="input-netsuite-token-secret"
              type="password"
              placeholder="Access token secret"
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Sync Options</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-journals" className="text-sm font-normal">Journal Entries</Label>
              <Switch id="sync-journals" checked={syncJournals} onCheckedChange={setSyncJournals} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-budgets" className="text-sm font-normal">Budgets & Forecasts</Label>
              <Switch id="sync-budgets" checked={syncBudgets} onCheckedChange={setSyncBudgets} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-reports" className="text-sm font-normal">Financial Reports</Label>
              <Switch id="sync-reports" checked={syncReports} onCheckedChange={setSyncReports} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!isFormValid || testMutation.isPending}
              className="flex-1"
              data-testid="button-netsuite-test"
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
              data-testid="button-netsuite-save"
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
