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

interface NetSuiteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NetSuiteConfigDialog({ open, onOpenChange }: NetSuiteConfigDialogProps) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");
  const [syncItems, setSyncItems] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/netsuite/test", {
        accountId,
        consumerKey,
        consumerSecret,
        tokenId,
        tokenSecret,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: "Oracle NetSuite credentials verified" });
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
      const response = await apiRequest("POST", "/api/integrations/netsuite/configure", {
        accountId,
        consumerKey,
        consumerSecret,
        tokenId,
        tokenSecret,
        syncOptions: { syncItems, syncOrders },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Oracle NetSuite configured", description: "Integration saved successfully" });
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
            <Building2 className="h-5 w-5 text-bad" />
            Configure Oracle NetSuite
          </DialogTitle>
          <DialogDescription>
            Connect to Oracle NetSuite for complete ERP visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="netsuite-account">Account ID</Label>
            <Input
              id="netsuite-account"
              placeholder="Enter your NetSuite account ID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              data-testid="input-netsuite-account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="netsuite-consumer-key">Consumer Key</Label>
            <Input
              id="netsuite-consumer-key"
              type="password"
              placeholder="Enter your consumer key"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              data-testid="input-netsuite-consumer-key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="netsuite-consumer-secret">Consumer Secret</Label>
            <Input
              id="netsuite-consumer-secret"
              type="password"
              placeholder="Enter your consumer secret"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              data-testid="input-netsuite-consumer-secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="netsuite-token-id">Token ID</Label>
            <Input
              id="netsuite-token-id"
              type="password"
              placeholder="Enter your token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              data-testid="input-netsuite-token-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="netsuite-token-secret">Token Secret</Label>
            <Input
              id="netsuite-token-secret"
              type="password"
              placeholder="Enter your token secret"
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
              data-testid="input-netsuite-token-secret"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="netsuite-items">Sync item records</Label>
            <Switch
              id="netsuite-items"
              checked={syncItems}
              onCheckedChange={setSyncItems}
              data-testid="switch-netsuite-items"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="netsuite-orders">Sync sales orders</Label>
            <Switch
              id="netsuite-orders"
              checked={syncOrders}
              onCheckedChange={setSyncOrders}
              data-testid="switch-netsuite-orders"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret || testMutation.isPending}
            data-testid="button-netsuite-test"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret || saveMutation.isPending}
            data-testid="button-netsuite-save"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
