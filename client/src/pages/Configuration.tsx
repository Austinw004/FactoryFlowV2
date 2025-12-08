import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertCircle, Package, Building2, Zap, DollarSign, Bell, Save, Mail, Plug, Shield, Bot, Palette, Globe, Users, FileText, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import type { Company, User, Role } from "@shared/schema";
import { LocationsManagement } from "@/components/LocationsManagement";

export default function Configuration() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Company>>({});

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/company/settings"],
  });

  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Company>) =>
      apiRequest("PATCH", "/api/company/settings", updates),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const sanitizedData: any = { ...formData };
    
    const integerFields = [
      'enableRegimeAlerts',
      'enableBudgetAlerts',
      'enableAllocationAlerts',
      'enablePriceAlerts',
      'emailForwardingEnabled',
      'emailProcessingConsent',
      'emailAutoTagging',
      'aiChatbotEnabled',
      'aiDataAccessConsent',
      'aiCanAccessFinancials',
      'aiCanAccessSupplierData',
      'aiCanAccessAllocations',
      'aiCanAccessEmails',
      'anonymizeOldData',
      'onboardingCompleted',
      'showOnboardingHints',
    ];
    
    integerFields.forEach(field => {
      if (sanitizedData[field] !== undefined && sanitizedData[field] !== null) {
        sanitizedData[field] = sanitizedData[field] ? 1 : 0;
      }
    });
    
    delete sanitizedData.apiAccessEnabled;
    delete sanitizedData.apiKey;
    delete sanitizedData.webhookEvents;
    
    updateMutation.mutate(sanitizedData);
  };

  const handleChange = (field: keyof Company, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-configuration">
            Settings & Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your company profile, budget, and preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid="button-save-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="company" orientation="vertical" className="flex gap-6" data-testid="tabs-settings">
        <TabsList className="flex flex-col h-auto w-56 shrink-0 bg-muted/50 p-2 rounded-lg">
          <TabsTrigger value="company" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-company">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="locations" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-locations">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="budget" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-budget">
            <DollarSign className="h-4 w-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="economic" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-economic">
            <Zap className="h-4 w-4" />
            Economic
          </TabsTrigger>
          <TabsTrigger value="alerts" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-alerts">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="communications" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-communications">
            <Mail className="h-4 w-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-integrations">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="privacy" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-privacy">
            <Shield className="h-4 w-4" />
            Data & Privacy
          </TabsTrigger>
          <TabsTrigger value="ai" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-ai">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="branding" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-branding">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="access" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-access">
            <Users className="h-4 w-4" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="audit" className="w-full justify-start gap-3 px-3 py-2.5" data-testid="tab-audit">
            <FileText className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic information about your manufacturing organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={formData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter company name"
                  data-testid="input-company-name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry || ""}
                    onValueChange={(value) => handleChange("industry", value)}
                  >
                    <SelectTrigger id="industry" data-testid="select-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="aerospace">Aerospace</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="consumer-goods">Consumer Goods</SelectItem>
                      <SelectItem value="industrial">Industrial Equipment</SelectItem>
                      <SelectItem value="medical">Medical Devices</SelectItem>
                      <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                      <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
                      <SelectItem value="textiles">Textiles</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ""}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="City, Country"
                    data-testid="input-location"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-size">Company Size</Label>
                <Select
                  value={formData.companySize || ""}
                  onValueChange={(value) => handleChange("companySize", value)}
                >
                  <SelectTrigger id="company-size" data-testid="select-company-size">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (1-50 employees)</SelectItem>
                    <SelectItem value="medium">Medium (51-250 employees)</SelectItem>
                    <SelectItem value="large">Large (251-1000 employees)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (1000+ employees)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="flex-1 space-y-4 mt-0">
          <LocationsManagement />
        </TabsContent>

        <TabsContent value="budget" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Budget Configuration</CardTitle>
              <CardDescription>
                Set your budget parameters and tracking preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annual-budget">Annual Budget ($)</Label>
                  <Input
                    id="annual-budget"
                    type="number"
                    value={formData.annualBudget || ""}
                    onChange={(e) => handleChange("annualBudget", parseFloat(e.target.value) || 0)}
                    placeholder="Enter annual budget"
                    data-testid="input-annual-budget"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-period">Budget Period</Label>
                  <Select
                    value={formData.budgetPeriod || ""}
                    onValueChange={(value) => handleChange("budgetPeriod", value)}
                  >
                    <SelectTrigger id="budget-period" data-testid="select-budget-period">
                      <SelectValue placeholder="Select budget period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-spent">Current Period Spent ($)</Label>
                <Input
                  id="current-spent"
                  type="number"
                  value={formData.currentBudgetSpent || ""}
                  onChange={(e) => handleChange("currentBudgetSpent", parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount spent in current period"
                  data-testid="input-current-spent"
                />
                <p className="text-sm text-muted-foreground">
                  Track your spending against the budget you've set
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economic" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Economic Policy Preferences</CardTitle>
              <CardDescription>
                Configure FDR thresholds and procurement policy defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  FDR (Financial-to-Real Divergence) thresholds determine economic regime classification
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fdr-low">FDR Low Threshold</Label>
                  <Input
                    id="fdr-low"
                    type="number"
                    step="0.1"
                    value={formData.fdrThresholdLow || ""}
                    onChange={(e) => handleChange("fdrThresholdLow", parseFloat(e.target.value) || 0.5)}
                    data-testid="input-fdr-low"
                  />
                  <p className="text-xs text-muted-foreground">Default: 0.5</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fdr-mid">FDR Mid Threshold</Label>
                  <Input
                    id="fdr-mid"
                    type="number"
                    step="0.1"
                    value={formData.fdrThresholdMid || ""}
                    onChange={(e) => handleChange("fdrThresholdMid", parseFloat(e.target.value) || 1.0)}
                    data-testid="input-fdr-mid"
                  />
                  <p className="text-xs text-muted-foreground">Default: 1.0</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fdr-high">FDR High Threshold</Label>
                  <Input
                    id="fdr-high"
                    type="number"
                    step="0.1"
                    value={formData.fdrThresholdHigh || ""}
                    onChange={(e) => handleChange("fdrThresholdHigh", parseFloat(e.target.value) || 1.5)}
                    data-testid="input-fdr-high"
                  />
                  <p className="text-xs text-muted-foreground">Default: 1.5</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="procurement-policy">Default Procurement Policy</Label>
                <Select
                  value={formData.defaultProcurementPolicy || ""}
                  onValueChange={(value) => handleChange("defaultProcurementPolicy", value)}
                >
                  <SelectTrigger id="procurement-policy" data-testid="select-procurement-policy">
                    <SelectValue placeholder="Select default policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative - Risk Averse</SelectItem>
                    <SelectItem value="balanced">Balanced - Moderate Risk</SelectItem>
                    <SelectItem value="aggressive">Aggressive - Opportunistic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Determines how the system responds to economic regime changes
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Alert & Notification Settings</CardTitle>
              <CardDescription>
                Configure when and how you receive alerts about economic changes and budget status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-email">Alert Email Address</Label>
                <Input
                  id="alert-email"
                  type="email"
                  value={formData.alertEmail || ""}
                  onChange={(e) => handleChange("alertEmail", e.target.value)}
                  placeholder="alerts@yourcompany.com"
                  data-testid="input-alert-email"
                />
                <p className="text-sm text-muted-foreground">
                  Receive email notifications about important events
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Economic Regime Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when economic regime changes
                    </p>
                  </div>
                  <Select
                    value={formData.enableRegimeAlerts?.toString() || "1"}
                    onValueChange={(value) => handleChange("enableRegimeAlerts", parseInt(value))}
                  >
                    <SelectTrigger className="w-32" data-testid="select-regime-alerts">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Enabled</SelectItem>
                      <SelectItem value="0">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when approaching budget limits
                    </p>
                  </div>
                  <Select
                    value={formData.enableBudgetAlerts?.toString() || "1"}
                    onValueChange={(value) => handleChange("enableBudgetAlerts", parseInt(value))}
                  >
                    <SelectTrigger className="w-32" data-testid="select-budget-alerts">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Enabled</SelectItem>
                      <SelectItem value="0">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-threshold">Budget Alert Threshold (%)</Label>
                  <Input
                    id="budget-threshold"
                    type="number"
                    step="5"
                    min="50"
                    max="100"
                    value={(formData.budgetAlertThreshold || 0.8) * 100}
                    onChange={(e) => handleChange("budgetAlertThreshold", parseFloat(e.target.value) / 100 || 0.8)}
                    data-testid="input-budget-threshold"
                  />
                  <p className="text-sm text-muted-foreground">
                    Receive alert when budget reaches this percentage (default: 80%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Advanced Notification Preferences
              </CardTitle>
              <CardDescription>
                Fine-tune your notification preferences with granular control over each alert type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/notification-settings">
                <Button variant="outline" className="w-full justify-between" data-testid="link-notification-settings">
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Manage All Notification Settings
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Email Processing & Forwarding</CardTitle>
              <CardDescription>
                Configure email ingestion and processing for AI-powered supplier communication analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Forward supplier emails to your unique company email address to enable automated processing and AI analysis
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Enable Email Forwarding</Label>
                    <p className="text-sm text-muted-foreground">
                      Activate your unique email address for forwarding
                    </p>
                  </div>
                  <Switch
                    checked={formData.emailForwardingEnabled === 1}
                    onCheckedChange={(checked) => handleChange("emailForwardingEnabled", checked ? 1 : 0)}
                    data-testid="switch-email-forwarding"
                  />
                </div>

                {formData.emailForwardingEnabled === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="forwarding-address">Your Forwarding Email Address</Label>
                      <Input
                        id="forwarding-address"
                        value={formData.emailForwardingAddress || ""}
                        onChange={(e) => handleChange("emailForwardingAddress", e.target.value)}
                        placeholder="your-company@mail.manufacturing-ai.app"
                        data-testid="input-forwarding-address"
                      />
                      <p className="text-sm text-muted-foreground">
                        Forward supplier emails to this address for automatic processing
                      </p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <Label>Email Processing Consent</Label>
                        <p className="text-sm text-muted-foreground">
                          I consent to automated processing of forwarded emails
                        </p>
                      </div>
                      <Switch
                        checked={formData.emailProcessingConsent === 1}
                        onCheckedChange={(checked) => handleChange("emailProcessingConsent", checked ? 1 : 0)}
                        data-testid="switch-email-consent"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-retention">Email Retention Period (Days)</Label>
                      <Select
                        value={formData.emailRetentionDays?.toString() || "90"}
                        onValueChange={(value) => handleChange("emailRetentionDays", parseInt(value))}
                      >
                        <SelectTrigger id="email-retention" data-testid="select-email-retention">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                          <SelectItem value="90">90 Days</SelectItem>
                          <SelectItem value="180">180 Days</SelectItem>
                          <SelectItem value="365">1 Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Emails older than this will be automatically deleted
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <Label>Auto-tagging with NLP</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically categorize and tag emails using AI
                        </p>
                      </div>
                      <Switch
                        checked={formData.emailAutoTagging === 1}
                        onCheckedChange={(checked) => handleChange("emailAutoTagging", checked ? 1 : 0)}
                        data-testid="switch-email-tagging"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>API & Webhook Configuration</CardTitle>
              <CardDescription>
                Configure integration settings and webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Future Feature:</strong> API access with secure key management will be available in a future release. Webhook notifications are production-ready.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                <div className="space-y-1">
                  <Label>Enable API Access (Coming Soon)</Label>
                  <p className="text-sm text-muted-foreground">
                    Programmatic access requires secure server-side key management
                  </p>
                </div>
                <Switch
                  checked={false}
                  disabled
                  data-testid="switch-api-access"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={formData.webhookUrl || ""}
                  onChange={(e) => handleChange("webhookUrl", e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  data-testid="input-webhook-url"
                />
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications about allocation runs, regime changes, and budget alerts
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook Events</Label>
                <p className="text-sm text-muted-foreground">
                  Configure which events trigger webhook notifications in future releases
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention & Privacy</CardTitle>
              <CardDescription>
                Configure how long data is stored and privacy preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retention-policy">Data Retention Policy</Label>
                <Select
                  value={formData.dataRetentionPolicy || "standard"}
                  onValueChange={(value) => handleChange("dataRetentionPolicy", value)}
                >
                  <SelectTrigger id="retention-policy" data-testid="select-retention-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (3 months)</SelectItem>
                    <SelectItem value="standard">Standard (1 year)</SelectItem>
                    <SelectItem value="extended">Extended (3 years)</SelectItem>
                    <SelectItem value="permanent">Permanent (Never delete)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How long to keep historical data before archiving or deletion
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Auto-anonymize Old Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically remove personally identifiable information from old records
                  </p>
                </div>
                <Switch
                  checked={formData.anonymizeOldData === 1}
                  onCheckedChange={(checked) => handleChange("anonymizeOldData", checked ? 1 : 0)}
                  data-testid="switch-anonymize-data"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="export-format">Data Export Format</Label>
                <Select
                  value={formData.exportDataFormat || "json"}
                  onValueChange={(value) => handleChange("exportDataFormat", value)}
                >
                  <SelectTrigger id="export-format" data-testid="select-export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Default format for data exports and backups
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Settings</CardTitle>
              <CardDescription>
                Configure AI chatbot capabilities and data access permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Bot className="h-4 w-4" />
                <AlertDescription>
                  The AI Assistant can answer questions about your company data and help you make informed decisions
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Enable AI Chatbot</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on the AI assistant for natural language queries
                  </p>
                </div>
                <Switch
                  checked={formData.aiChatbotEnabled === 1}
                  onCheckedChange={(checked) => handleChange("aiChatbotEnabled", checked ? 1 : 0)}
                  data-testid="switch-ai-chatbot"
                />
              </div>

              {formData.aiChatbotEnabled === 1 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium">Data Access Permissions</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose what data the AI can access when answering questions
                    </p>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <Label>General Data Access Consent</Label>
                        <p className="text-sm text-muted-foreground">
                          Master switch for AI data access
                        </p>
                      </div>
                      <Switch
                        checked={formData.aiDataAccessConsent === 1}
                        onCheckedChange={(checked) => handleChange("aiDataAccessConsent", checked ? 1 : 0)}
                        data-testid="switch-ai-data-consent"
                      />
                    </div>

                    {formData.aiDataAccessConsent === 1 && (
                      <>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label>Financial Data Access</Label>
                            <p className="text-sm text-muted-foreground">
                              Budget, spending, financial statements
                            </p>
                          </div>
                          <Switch
                            checked={formData.aiCanAccessFinancials === 1}
                            onCheckedChange={(checked) => handleChange("aiCanAccessFinancials", checked ? 1 : 0)}
                            data-testid="switch-ai-financials"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label>Supplier Data Access</Label>
                            <p className="text-sm text-muted-foreground">
                              Supplier information, contracts, pricing
                            </p>
                          </div>
                          <Switch
                            checked={formData.aiCanAccessSupplierData === 1}
                            onCheckedChange={(checked) => handleChange("aiCanAccessSupplierData", checked ? 1 : 0)}
                            data-testid="switch-ai-suppliers"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label>Allocation Data Access</Label>
                            <p className="text-sm text-muted-foreground">
                              Material allocations, demand forecasts
                            </p>
                          </div>
                          <Switch
                            checked={formData.aiCanAccessAllocations === 1}
                            onCheckedChange={(checked) => handleChange("aiCanAccessAllocations", checked ? 1 : 0)}
                            data-testid="switch-ai-allocations"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label>Email Data Access</Label>
                            <p className="text-sm text-muted-foreground">
                              Processed supplier emails and communications
                            </p>
                          </div>
                          <Switch
                            checked={formData.aiCanAccessEmails === 1}
                            onCheckedChange={(checked) => handleChange("aiCanAccessEmails", checked ? 1 : 0)}
                            data-testid="switch-ai-emails"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="flex-1 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Company Branding</CardTitle>
              <CardDescription>
                Customize your company's visual identity in the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo-url">Company Logo URL</Label>
                <Input
                  id="logo-url"
                  value={formData.logoUrl || ""}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  placeholder="https://your-company.com/logo.png"
                  data-testid="input-logo-url"
                />
                <p className="text-sm text-muted-foreground">
                  URL to your company logo (recommended: square, at least 200x200px)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={formData.primaryColor || "#3b82f6"}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="w-20"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={formData.primaryColor || "#3b82f6"}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    placeholder="#3b82f6"
                    data-testid="input-primary-color-text"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Primary color for charts, highlights, and accents
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone || "America/New_York"}
                  onValueChange={(value) => handleChange("timezone", value)}
                >
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Used for displaying dates and times throughout the application
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="flex-1 space-y-4 mt-0">
          <RoleManagement />
        </TabsContent>
        <TabsContent value="audit" className="flex-1 space-y-4 mt-0">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Audit Log Viewer Component
function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  
  const { data: auditLogs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/rbac/audit-logs"],
  });
  
  const filteredLogs = auditLogs?.filter(log => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
    return true;
  }) || [];
  
  const actions = ["all", "create", "update", "delete"];
  const entityTypes = ["all", "sku", "material", "supplier", "allocation", "company_settings", "role", "permission"];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>
          Track all critical actions performed by users in your system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="w-48">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger data-testid="select-action-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label>Entity Type</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger data-testid="select-entity-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No audit logs found with the selected filters</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{log.action.toUpperCase()}</span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-sm">{log.entityType.replace('_', ' ')}</span>
                      {log.entityId && (
                        <>
                          <span className="text-muted-foreground text-sm">•</span>
                          <span className="text-xs text-muted-foreground font-mono">{log.entityId.substring(0, 8)}</span>
                        </>
                      )}
                    </div>
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-2">
                        {JSON.stringify(log.changes, null, 2).substring(0, 200)}
                        {JSON.stringify(log.changes).length > 200 && "..."}
                      </div>
                    )}
                    {log.notes && (
                      <p className="text-sm text-muted-foreground">{log.notes}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right ml-4">
                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Role Management Component
function RoleManagement() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Fetch all users in company
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });
  
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/rbac/roles"],
  });
  
  const { data: userRoles = [], refetch: refetchUserRoles } = useQuery<Role[]>({
    queryKey: ["/api/rbac/users", selectedUserId, "roles"],
    enabled: !!selectedUserId,
  });
  
  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      apiRequest("POST", `/api/rbac/users/${userId}/roles`, { roleId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Role assigned successfully" });
      refetchUserRoles();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      apiRequest("DELETE", `/api/rbac/users/${userId}/roles/${roleId}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Role removed successfully" });
      refetchUserRoles();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  if (usersLoading || rolesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Access Control</CardTitle>
          <CardDescription>
            Manage user roles and permissions. Only administrators can modify access control.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Roles define what actions users can perform. Each role has a set of permissions that control access to features.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <h3 className="font-semibold">Available Roles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map((role: any) => (
                <Card key={role.id} className="hover-elevate">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{role.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {role.description}
                      {role.isDefault ? " (Default Role)" : ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="font-semibold">Assign Roles to Users</h3>
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select
                value={selectedUserId || ""}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedUserId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Current Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {userRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles assigned yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {userRoles.map((role: any) => (
                        <div
                          key={role.id}
                          className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md text-sm"
                        >
                          <span>{role.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() =>
                              removeRoleMutation.mutate({
                                userId: selectedUserId,
                                roleId: role.id,
                              })
                            }
                            disabled={removeRoleMutation.isPending}
                            data-testid={`button-remove-role-${role.id}`}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2">
                    <Label>Add Role</Label>
                    <Select
                      onValueChange={(roleId) =>
                        assignRoleMutation.mutate({
                          userId: selectedUserId,
                          roleId,
                        })
                      }
                      disabled={assignRoleMutation.isPending}
                    >
                      <SelectTrigger data-testid="select-role-to-assign">
                        <SelectValue placeholder="Choose a role to assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roles
                          .filter(
                            (role: any) =>
                              !userRoles.some((ur: any) => ur.id === role.id)
                          )
                          .map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
