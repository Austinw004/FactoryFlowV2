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
import { Settings, AlertCircle, Package, Building2, Zap, DollarSign, Bell, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { Company } from "@shared/schema";

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
    updateMutation.mutate(formData);
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

      <Tabs defaultValue="company" data-testid="tabs-settings">
        <TabsList>
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="h-4 w-4 mr-2" />
            Company Profile
          </TabsTrigger>
          <TabsTrigger value="budget" data-testid="tab-budget">
            <DollarSign className="h-4 w-4 mr-2" />
            Budget Settings
          </TabsTrigger>
          <TabsTrigger value="economic" data-testid="tab-economic">
            <Zap className="h-4 w-4 mr-2" />
            Economic Policy
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts & Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
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

        <TabsContent value="budget" className="space-y-4">
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

        <TabsContent value="economic" className="space-y-4">
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

        <TabsContent value="alerts" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
