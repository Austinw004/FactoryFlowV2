import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingDown, TrendingUp, Users, Shield, FileText, Plus, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

const submitSchema = z.object({
  materialCategory: z.string().min(1, "Category required"),
  materialSubcategory: z.string().optional(),
  materialName: z.string().min(1, "Material name required"),
  unit: z.string().min(1, "Unit required"),
  unitCost: z.coerce.number().positive("Cost must be positive"),
  currency: z.string().default("USD"),
  purchaseVolume: z.coerce.number().optional(),
  volumePeriod: z.string().optional(),
  companyIndustry: z.string().optional(),
  companySize: z.string().optional(),
  companyLocation: z.string().optional(),
  dataQuality: z.string().default("estimated"),
  shareConsent: z.boolean().default(true),
});

type SubmitFormData = z.infer<typeof submitSchema>;

export default function PeerBenchmarking() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ["/api/benchmarks/submissions"],
  });

  const { data: comparisons = [] } = useQuery<any[]>({
    queryKey: ["/api/benchmarks/comparisons"],
  });

  const { data: aggregates = [] } = useQuery<any[]>({
    queryKey: ["/api/benchmarks/aggregates"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SubmitFormData) => {
      return apiRequest("POST", "/api/benchmarks/submit", {
        ...data,
        snapshotDate: new Date().toISOString(),
        shareConsent: data.shareConsent ? 1 : 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benchmarks/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/benchmarks/comparisons"] });
      toast({
        title: "Benchmark data submitted",
        description: "Your cost data has been added to the industry dataset.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Unable to submit benchmark data",
        variant: "destructive",
      });
    },
  });

  const form = useForm<SubmitFormData>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      materialCategory: "",
      materialSubcategory: "",
      materialName: "",
      unit: "",
      unitCost: 0,
      currency: "USD",
      purchaseVolume: 0,
      volumePeriod: "monthly",
      companyIndustry: "",
      companySize: "",
      companyLocation: "",
      dataQuality: "estimated",
      shareConsent: true,
    },
  });

  const onSubmit = (data: SubmitFormData) => {
    submitMutation.mutate(data);
  };

  const getSavingsInsight = (comparison: any) => {
    if (!comparison.industryAverage) return null;
    
    const percentDiff = ((comparison.yourCost - comparison.industryAverage) / comparison.industryAverage) * 100;
    const isAbove = percentDiff > 0;
    const annualVolume = comparison.purchaseVolume * 12; // Assuming monthly
    const potentialSavings = isAbove 
      ? (comparison.yourCost - comparison.industryAverage) * annualVolume 
      : 0;

    return { percentDiff, isAbove, potentialSavings, annualVolume };
  };

  const totalPotentialSavings = comparisons
    .map(c => getSavingsInsight(c))
    .filter(i => i && i.isAbove)
    .reduce((sum, i) => sum + (i?.potentialSavings || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
<p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Compare your material costs with industry peers and discover savings opportunities
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-submit-benchmark">
              <Plus className="w-4 h-4 mr-2" />
              Submit Cost Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">Submit Material Cost Benchmark</DialogTitle>
              <DialogDescription data-testid="text-dialog-description">
                Share your material costs anonymously to access industry benchmarks. Your data helps create better insights for everyone.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="materialCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Metals">Metals</SelectItem>
                            <SelectItem value="Polymers">Polymers</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                            <SelectItem value="Chemicals">Chemicals</SelectItem>
                            <SelectItem value="Packaging">Packaging</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="materialSubcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Aluminum Alloys" {...field} data-testid="input-material-subcategory" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="materialName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Aluminum 6061" {...field} data-testid="input-material-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-unit-cost" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="JPY">JPY</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="kg, lb, m3" {...field} data-testid="input-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchaseVolume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Volume (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} data-testid="input-purchase-volume" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="volumePeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume Period</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-volume-period">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="companyIndustry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Automotive" {...field} data-testid="input-company-industry" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company-size">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="small">Small (1-50)</SelectItem>
                            <SelectItem value="medium">Medium (51-500)</SelectItem>
                            <SelectItem value="large">Large (501+)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., North America" {...field} data-testid="input-company-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dataQuality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Quality</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-data-quality">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="verified">Verified (from invoices)</SelectItem>
                          <SelectItem value="estimated">Estimated</SelectItem>
                          <SelectItem value="quoted">Quoted (from suppliers)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shareConsent"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Share with Industry</FormLabel>
                        <FormDescription>
                          Allow this data to be included in anonymized industry benchmarks
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-share-consent"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-submit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    data-testid="button-confirm-submit"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-submissions-count">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-submissions-count">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">Materials benchmarked</p>
          </CardContent>
        </Card>

        <Card data-testid="card-industry-participants">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Industry Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-participants-count">
              {aggregates.length > 0 ? Math.max(...aggregates.map((a: any) => a.participantCount || 0)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Companies sharing data</p>
          </CardContent>
        </Card>

        <Card data-testid="card-potential-savings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-potential-savings">
              ${totalPotentialSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Annual opportunity identified</p>
          </CardContent>
        </Card>

        <Card data-testid="card-privacy-status">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground" data-testid="text-privacy-status">Protected</div>
            <p className="text-xs text-muted-foreground">All data anonymized</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="comparisons" className="space-y-4">
        <TabsList data-testid="tabs-benchmarking">
          <TabsTrigger value="comparisons" data-testid="tab-comparisons">Cost Comparisons</TabsTrigger>
          <TabsTrigger value="submissions" data-testid="tab-submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Industry Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="comparisons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-comparisons-title">Your Costs vs. Industry Average</CardTitle>
              <CardDescription data-testid="text-comparisons-description">
                See how your material costs compare to industry benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparisons.length === 0 ? (
                <div className="text-center py-12" data-testid="text-no-comparisons">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No comparisons available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Submit your cost data to see industry benchmarks
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comparisons.map((comparison: any, idx: number) => {
                    const insight = getSavingsInsight(comparison);
                    if (!insight) return null;

                    return (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 hover-elevate"
                        data-testid={`card-comparison-${idx}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" data-testid={`text-material-name-${idx}`}>
                                {comparison.materialName}
                              </h3>
                              <Badge variant="outline" data-testid={`badge-category-${idx}`}>
                                {comparison.materialCategory}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-unit-${idx}`}>
                              {comparison.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            {insight.isAbove ? (
                              <div className="flex items-center gap-2 text-bad">
                                <TrendingUp className="w-4 h-4" />
                                <span className="font-semibold" data-testid={`text-diff-${idx}`}>
                                  +{Math.abs(insight.percentDiff).toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-good">
                                <TrendingDown className="w-4 h-4" />
                                <span className="font-semibold" data-testid={`text-diff-${idx}`}>
                                  {insight.percentDiff.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Your Cost</p>
                            <p className="text-lg font-semibold" data-testid={`text-your-cost-${idx}`}>
                              ${comparison.yourCost.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Industry Average</p>
                            <p className="text-lg font-semibold" data-testid={`text-industry-avg-${idx}`}>
                              ${comparison.industryAverage?.toFixed(2) || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Annual Savings Potential</p>
                            <p className="text-lg font-semibold" data-testid={`text-savings-${idx}`}>
                              ${insight.potentialSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>

                        {comparison.participantCount && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span data-testid={`text-participant-count-${idx}`}>
                              Based on {comparison.participantCount} companies
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-submissions-title">Your Submitted Data</CardTitle>
              <CardDescription data-testid="text-submissions-description">
                Material costs you've shared with the consortium
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-12" data-testid="text-no-submissions">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No submissions yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start sharing your cost data to unlock industry insights
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub: any, idx: number) => (
                    <div
                      key={sub.id}
                      className="border rounded-lg p-4 hover-elevate"
                      data-testid={`card-submission-${idx}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" data-testid={`text-submission-name-${idx}`}>
                              {sub.materialName}
                            </h3>
                            <Badge variant="outline" data-testid={`badge-submission-category-${idx}`}>
                              {sub.materialCategory}
                            </Badge>
                            {sub.shareConsent === 1 ? (
                              <Badge variant="default" className="bg-green-600" data-testid={`badge-shared-${idx}`}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Shared
                              </Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-private-${idx}`}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Private
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-submission-date-${idx}`}>
                            Submitted {new Date(sub.snapshotDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold" data-testid={`text-submission-cost-${idx}`}>
                            ${sub.unitCost.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-submission-unit-${idx}`}>
                            per {sub.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-insights-title">Industry Benchmark Data</CardTitle>
              <CardDescription data-testid="text-insights-description">
                Aggregated cost data from the industry consortium
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aggregates.length === 0 ? (
                <div className="text-center py-12" data-testid="text-no-aggregates">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No industry data available yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    More companies need to share data to generate benchmarks
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aggregates.map((agg: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 hover-elevate"
                      data-testid={`card-aggregate-${idx}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" data-testid={`text-aggregate-name-${idx}`}>
                              {agg.materialName}
                            </h3>
                            <Badge variant="outline" data-testid={`badge-aggregate-category-${idx}`}>
                              {agg.materialCategory}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span data-testid={`text-aggregate-participants-${idx}`}>
                              {agg.participantCount} companies
                            </span>
                            {agg.snapshotMonth && (
                              <>
                                <span>•</span>
                                <span data-testid={`text-aggregate-month-${idx}`}>{agg.snapshotMonth}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Average</p>
                          <p className="text-lg font-semibold" data-testid={`text-aggregate-avg-${idx}`}>
                            ${agg.averageCost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Median</p>
                          <p className="text-lg font-semibold" data-testid={`text-aggregate-median-${idx}`}>
                            ${agg.medianCost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">25th %ile</p>
                          <p className="text-lg font-semibold" data-testid={`text-aggregate-p25-${idx}`}>
                            ${agg.p25Cost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">75th %ile</p>
                          <p className="text-lg font-semibold" data-testid={`text-aggregate-p75-${idx}`}>
                            ${agg.p75Cost.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-privacy-title">Privacy & Data Protection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Complete Anonymization</p>
              <p className="text-sm text-muted-foreground">
                Your company identity is never exposed. All benchmarks require minimum 3 participants for privacy.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Aggregation Only</p>
              <p className="text-sm text-muted-foreground">
                Individual submissions are never shared. Only statistical aggregates are published.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Opt-Out Anytime</p>
              <p className="text-sm text-muted-foreground">
                You control sharing. Toggle consent off for any submission to exclude it from benchmarks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
