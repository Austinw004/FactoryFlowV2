import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, ExternalLink, AlertTriangle, Calendar } from "lucide-react";
import { SiGooglecalendar } from "react-icons/si";

interface GoogleCalendarConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IntegrationStatus {
  googleCalendar?: {
    enabled: boolean;
    configured: boolean;
    calendarId?: string;
    syncMeetings?: boolean;
  };
}

export function GoogleCalendarConfigDialog({ open, onOpenChange }: GoogleCalendarConfigDialogProps) {
  const { toast } = useToast();
  const [calendarId, setCalendarId] = useState("");
  const [syncMeetings, setSyncMeetings] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    enabled: open,
  });

  useEffect(() => {
    if (status && open && !isInitialized) {
      setEnabled(status.googleCalendar?.enabled ?? false);
      setCalendarId(status.googleCalendar?.calendarId ?? "");
      setSyncMeetings(status.googleCalendar?.syncMeetings ?? true);
      setIsInitialized(true);
    }
  }, [status, open, isInitialized]);

  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
    }
  }, [open]);

  const configureMutation = useMutation({
    mutationFn: async (data: { calendarId?: string; syncMeetings?: boolean; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/integrations/google-calendar/configure", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({
        title: "Google Calendar Configured",
        description: "Your calendar integration has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Could not save calendar configuration.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    configureMutation.mutate({
      calendarId: calendarId || undefined,
      syncMeetings,
      enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiGooglecalendar className="w-6 h-6 text-[#4285F4]" />
            Google Calendar Integration
          </DialogTitle>
          <DialogDescription>
            Connect Google Calendar to schedule S&OP meetings and sync planning events.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Sync calendar events with Prescient Labs
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-google-calendar-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendarId">Calendar ID</Label>
              <Input
                id="calendarId"
                placeholder="primary or calendar@group.calendar.google.com"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                data-testid="input-google-calendar-id"
              />
              <p className="text-xs text-muted-foreground">
                Use "primary" for your main calendar or enter a specific calendar ID
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sync S&OP Meetings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create calendar events for S&OP planning sessions
                </p>
              </div>
              <Switch
                checked={syncMeetings}
                onCheckedChange={setSyncMeetings}
                data-testid="switch-sync-meetings"
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Features</p>
                  <ul className="text-muted-foreground mt-1 space-y-1">
                    <li>Schedule S&OP planning meetings</li>
                    <li>Add forecast review sessions</li>
                    <li>Set reminders for regime change reviews</li>
                    <li>Sync supplier meeting schedules</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">OAuth Setup Required</p>
                  <p className="text-muted-foreground">
                    For full calendar sync, contact support to set up Google OAuth integration.
                  </p>
                  <a
                    href="https://developers.google.com/calendar/api/quickstart/nodejs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    View Google Calendar API docs
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {status?.googleCalendar?.configured && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Google Calendar is configured
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={configureMutation.isPending}
            data-testid="button-save-google-calendar"
          >
            {configureMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
