import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, Phone } from "lucide-react";

interface TwilioConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  slack: {
    enabled: boolean;
    configured: boolean;
    channel: string;
  };
  twilio: {
    enabled: boolean;
    configured: boolean;
    fromNumber: string | null;
  };
  hubspot: {
    enabled: boolean;
    configured: boolean;
  };
}

export function TwilioConfigDialog({ open, onOpenChange }: TwilioConfigDialogProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.twilio.enabled);
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
      setTestPhoneNumber("");
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/twilio/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Twilio Configured",
        description: "SMS alerts have been " + (enabled ? "enabled" : "disabled") + ".",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save Twilio configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await apiRequest("POST", "/api/integrations/twilio/test", { phoneNumber });
      return res.json();
    },
    onSuccess: (data: { success: boolean; message?: string }) => {
      if (data.success) {
        toast({
          title: "Test SMS Sent",
          description: data.message || "Check your phone for the test message.",
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.message || "Could not send test SMS.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message || "Could not send test SMS.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({ enabled });
  };

  const handleTest = () => {
    if (!testPhoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to receive the test SMS.",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate(testPhoneNumber);
  };

  const isConfigured = status?.twilio.configured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            SMS Alerts (Twilio)
            {isConfigured && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </DialogTitle>
          <DialogDescription>
            Receive critical alerts via SMS for urgent supply chain events.
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
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Twilio is configured (from: ...{status?.twilio.fromNumber})</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span>Twilio credentials not configured. Please contact support to set up SMS alerts.</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SMS Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive SMS for critical alerts (regime changes, stockouts)
                  </p>
                </div>
                <Switch
                  data-testid="switch-twilio-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  disabled={!isConfigured}
                />
              </div>

              {isConfigured && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="test-phone">Test SMS</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-phone"
                      data-testid="input-test-phone"
                      placeholder="+1 (555) 123-4567"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={testMutation.isPending || !testPhoneNumber}
                      data-testid="button-test-twilio"
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Send Test"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your phone number to receive a test SMS
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
            disabled={configureMutation.isPending || !isConfigured}
            data-testid="button-save-twilio"
          >
            {configureMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
