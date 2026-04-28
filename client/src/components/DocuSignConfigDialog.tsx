import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, FileSignature, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocuSignConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocuSignConfigDialog({ open, onOpenChange }: DocuSignConfigDialogProps) {
  const [integrationKey, setIntegrationKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [userId, setUserId] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [autoSendPOs, setAutoSendPOs] = useState(false);
  const [autoSendContracts, setAutoSendContracts] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (config: { 
      integrationKey: string; 
      secretKey: string; 
      accountId: string;
      userId: string;
      environment: string;
      autoSendPOs: boolean;
      autoSendContracts: boolean;
    }) => {
      const response = await fetch("/api/integrations/docusign/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save configuration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/health"] });
      toast({
        title: "DocuSign Connected",
        description: "Electronic signature integration is now active.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setIntegrationKey("");
    setSecretKey("");
    setAccountId("");
    setUserId("");
    setEnvironment("sandbox");
    setAutoSendPOs(false);
    setAutoSendContracts(true);
    setTesting(false);
    setTestSuccess(false);
  };

  const testConnection = async () => {
    if (!integrationKey || !secretKey || !accountId) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your Integration Key, Secret Key, and Account ID.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestSuccess(false);

    try {
      const response = await fetch("/api/integrations/docusign/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationKey, secretKey, accountId, userId, environment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Connection test failed");
      }

      setTestSuccess(true);
      toast({
        title: "Connection Successful",
        description: "DocuSign credentials verified successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to DocuSign. Please verify your credentials.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!integrationKey || !secretKey || !accountId) {
      toast({
        title: "Missing Credentials",
        description: "Please enter all required DocuSign credentials.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({ 
      integrationKey, 
      secretKey, 
      accountId,
      userId,
      environment,
      autoSendPOs,
      autoSendContracts
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <FileSignature className="w-6 h-6 text-signal" />
            </div>
            <div>
              <DialogTitle>Connect DocuSign</DialogTitle>
              <DialogDescription>
                Enable electronic signatures for contracts and purchase orders
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://admindemo.docusign.com/apps-and-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">DocuSign Admin Console <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create an application integration</li>
              <li>Generate an RSA keypair or use authorization code grant</li>
              <li>Copy your Integration Key, Secret, and Account ID</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={(value: "sandbox" | "production") => setEnvironment(value)}>
                <SelectTrigger data-testid="select-docusign-environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Demo)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationKey">Integration Key *</Label>
              <Input
                id="integrationKey"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={integrationKey}
                onChange={(e) => setIntegrationKey(e.target.value)}
                data-testid="input-docusign-integration-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key *</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Your DocuSign secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                data-testid="input-docusign-secret-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID *</Label>
              <Input
                id="accountId"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                data-testid="input-docusign-account-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">User ID (Optional)</Label>
              <Input
                id="userId"
                placeholder="API user ID for impersonation"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                data-testid="input-docusign-user-id"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Automation Options</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoSendContracts">Auto-send Supplier Contracts</Label>
                <p className="text-xs text-muted-foreground">Automatically route new contracts for signature</p>
              </div>
              <Switch
                id="autoSendContracts"
                checked={autoSendContracts}
                onCheckedChange={setAutoSendContracts}
                data-testid="switch-auto-send-contracts"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoSendPOs">Auto-send Purchase Orders</Label>
                <p className="text-xs text-muted-foreground">Route POs for approval signatures</p>
              </div>
              <Switch
                id="autoSendPOs"
                checked={autoSendPOs}
                onCheckedChange={setAutoSendPOs}
                data-testid="switch-auto-send-pos"
              />
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={testConnection}
            disabled={testing || !integrationKey || !secretKey || !accountId}
            data-testid="button-test-docusign"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : testSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-good" />
                Connection Verified
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-docusign">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || !integrationKey || !secretKey || !accountId}
            data-testid="button-save-docusign"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect DocuSign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}