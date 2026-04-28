import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, Mail, Send, AlertTriangle } from "lucide-react";

interface EmailConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  slack: { enabled: boolean; configured: boolean; channel: string };
  twilio: { enabled: boolean; configured: boolean; fromNumber: string | null };
  hubspot: { enabled: boolean; configured: boolean };
  email: { enabled: boolean; configured: boolean };
}

export function EmailConfigDialog({ open, onOpenChange }: EmailConfigDialogProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.email?.enabled ?? false);
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      setTestEmail("");
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/email/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Email Configured",
        description: "Email notifications have been " + (enabled ? "enabled" : "disabled") + ".",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save email configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/integrations/email/test", { email });
      return res.json();
    },
    onSuccess: (data: { success: boolean; message?: string }) => {
      if (data.success) {
        toast({
          title: "Test Email Sent",
          description: data.message || "Check your inbox for the test email.",
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.message || "Could not send test email.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message || "Could not send test email.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({ enabled });
  };

  const handleTest = () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to receive the test.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate(testEmail);
  };

  const isConfigured = status?.email?.configured ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
            {isConfigured && (
              <CheckCircle className="w-4 h-4 text-good" />
            )}
          </DialogTitle>
          <DialogDescription>
            Receive email notifications for important platform events, meeting invitations, and alerts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {isConfigured ? (
                <div className="rounded-md bg-green-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-good" />
                    <span>Email service is configured and ready</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Email service not fully configured</p>
                      <p className="text-muted-foreground mt-1">
                        SendPulse credentials need to be set up. Contact support for assistance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive emails for meeting invites, alerts, and updates
                  </p>
                </div>
                <Switch
                  data-testid="switch-email-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Email notifications include:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- S&OP meeting invitations and reminders</li>
                  <li>- Team invitation emails</li>
                  <li>- Critical supply chain alerts</li>
                  <li>- Weekly summary reports</li>
                  <li>- Regime change notifications</li>
                </ul>
              </div>

              {isConfigured && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="test-email">Send Test Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-email"
                      type="email"
                      data-testid="input-test-email"
                      placeholder="your@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={testMutation.isPending || !testEmail}
                      data-testid="button-test-email"
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your email to receive a test notification
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending}
            data-testid="button-save-email"
          >
            {configureMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
