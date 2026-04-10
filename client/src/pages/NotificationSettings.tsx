import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Smartphone, Clock, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface NotificationPreferences {
  id?: string;
  inAppEnabled: number;
  inAppRegimeChanges: number;
  inAppForecastAlerts: number;
  inAppLowStock: number;
  inAppBudgetAlerts: number;
  inAppSystemUpdates: number;
  emailEnabled: number;
  emailRegimeChanges: number;
  emailForecastAlerts: number;
  emailLowStock: number;
  emailBudgetAlerts: number;
  emailWeeklyDigest: number;
  emailDailyDigest: number;
  digestFrequency: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

const defaultPreferences: NotificationPreferences = {
  inAppEnabled: 1,
  inAppRegimeChanges: 1,
  inAppForecastAlerts: 1,
  inAppLowStock: 1,
  inAppBudgetAlerts: 1,
  inAppSystemUpdates: 1,
  emailEnabled: 1,
  emailRegimeChanges: 1,
  emailForecastAlerts: 0,
  emailLowStock: 1,
  emailBudgetAlerts: 1,
  emailWeeklyDigest: 1,
  emailDailyDigest: 0,
  digestFrequency: "weekly",
  quietHoursStart: null,
  quietHoursEnd: null,
};

export default function NotificationSettings() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notification-preferences'],
  });

  useEffect(() => {
    if (preferences) {
      setPrefs(preferences);
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async (data: NotificationPreferences) => {
      return apiRequest('PUT', '/api/notification-preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    },
  });

  const updatePref = (key: keyof NotificationPreferences, value: number | string) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const togglePref = (key: keyof NotificationPreferences) => {
    const currentValue = prefs[key];
    if (typeof currentValue === 'number') {
      updatePref(key, currentValue === 1 ? 0 : 1);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
          <p className="text-muted-foreground mt-1">
            Control how and when you receive alerts and updates
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(prefs)}
          disabled={!hasChanges || saveMutation.isPending}
          data-testid="button-save-preferences"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        <Card data-testid="card-in-app-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              In-App Notifications
            </CardTitle>
            <CardDescription>
              Notifications that appear in the platform while you're using it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable In-App Notifications</Label>
                <p className="text-xs text-muted-foreground">Master toggle for all in-app alerts</p>
              </div>
              <Switch
                checked={prefs.inAppEnabled === 1}
                onCheckedChange={() => togglePref('inAppEnabled')}
                data-testid="switch-in-app-enabled"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <Label className="font-normal">Economic Regime Changes</Label>
                <Switch
                  checked={prefs.inAppRegimeChanges === 1}
                  onCheckedChange={() => togglePref('inAppRegimeChanges')}
                  disabled={prefs.inAppEnabled === 0}
                  data-testid="switch-in-app-regime"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Forecast Accuracy Alerts</Label>
                <Switch
                  checked={prefs.inAppForecastAlerts === 1}
                  onCheckedChange={() => togglePref('inAppForecastAlerts')}
                  disabled={prefs.inAppEnabled === 0}
                  data-testid="switch-in-app-forecast"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Low Stock Warnings</Label>
                <Switch
                  checked={prefs.inAppLowStock === 1}
                  onCheckedChange={() => togglePref('inAppLowStock')}
                  disabled={prefs.inAppEnabled === 0}
                  data-testid="switch-in-app-low-stock"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Budget Alerts</Label>
                <Switch
                  checked={prefs.inAppBudgetAlerts === 1}
                  onCheckedChange={() => togglePref('inAppBudgetAlerts')}
                  disabled={prefs.inAppEnabled === 0}
                  data-testid="switch-in-app-budget"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">System Updates</Label>
                <Switch
                  checked={prefs.inAppSystemUpdates === 1}
                  onCheckedChange={() => togglePref('inAppSystemUpdates')}
                  disabled={prefs.inAppEnabled === 0}
                  data-testid="switch-in-app-system"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-email-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Important updates sent directly to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Master toggle for all email alerts</p>
              </div>
              <Switch
                checked={prefs.emailEnabled === 1}
                onCheckedChange={() => togglePref('emailEnabled')}
                data-testid="switch-email-enabled"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <Label className="font-normal">Economic Regime Changes</Label>
                <Switch
                  checked={prefs.emailRegimeChanges === 1}
                  onCheckedChange={() => togglePref('emailRegimeChanges')}
                  disabled={prefs.emailEnabled === 0}
                  data-testid="switch-email-regime"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Forecast Accuracy Alerts</Label>
                <Switch
                  checked={prefs.emailForecastAlerts === 1}
                  onCheckedChange={() => togglePref('emailForecastAlerts')}
                  disabled={prefs.emailEnabled === 0}
                  data-testid="switch-email-forecast"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Low Stock Warnings</Label>
                <Switch
                  checked={prefs.emailLowStock === 1}
                  onCheckedChange={() => togglePref('emailLowStock')}
                  disabled={prefs.emailEnabled === 0}
                  data-testid="switch-email-low-stock"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Budget Alerts</Label>
                <Switch
                  checked={prefs.emailBudgetAlerts === 1}
                  onCheckedChange={() => togglePref('emailBudgetAlerts')}
                  disabled={prefs.emailEnabled === 0}
                  data-testid="switch-email-budget"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-normal">Weekly Digest</Label>
                  <p className="text-xs text-muted-foreground">Summary of the week's key events</p>
                </div>
                <Switch
                  checked={prefs.emailWeeklyDigest === 1}
                  onCheckedChange={() => togglePref('emailWeeklyDigest')}
                  disabled={prefs.emailEnabled === 0}
                  data-testid="switch-email-weekly"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-normal">Daily Digest</Label>
                  <p className="text-xs text-muted-foreground">Daily summary of activity</p>
                </div>
                <Switch
                  checked={prefs.emailDailyDigest === 1}
                  onCheckedChange={() => togglePref('emailDailyDigest')}
                  disabled={prefs.emailEnabled === 0}
                  data-testid="switch-email-daily"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-notification-schedule">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Notification Schedule
            </CardTitle>
            <CardDescription>
              Control when you receive non-urgent notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Digest Frequency</Label>
                <p className="text-xs text-muted-foreground">How often to receive summary emails</p>
              </div>
              <Select
                value={prefs.digestFrequency}
                onValueChange={(value) => updatePref('digestFrequency', value)}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-digest-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Quiet Hours Start</Label>
                <p className="text-xs text-muted-foreground">Pause non-urgent notifications</p>
              </div>
              <Select
                value={prefs.quietHoursStart || "none"}
                onValueChange={(value) => updatePref('quietHoursStart', value === "none" ? null as any : value)}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-quiet-start">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="20:00">8:00 PM</SelectItem>
                  <SelectItem value="22:00">10:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Quiet Hours End</Label>
                <p className="text-xs text-muted-foreground">Resume notifications</p>
              </div>
              <Select
                value={prefs.quietHoursEnd || "none"}
                onValueChange={(value) => updatePref('quietHoursEnd', value === "none" ? null as any : value)}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-quiet-end">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="07:00">7:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
