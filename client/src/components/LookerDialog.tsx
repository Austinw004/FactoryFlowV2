import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, BarChart3, Database, Key } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LookerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const apiEndpoints = [
  {
    name: "Demand Forecasts",
    endpoint: "/api/export/forecasts",
    description: "SKU demand forecasting data with confidence intervals",
    method: "GET",
  },
  {
    name: "Materials Catalog",
    endpoint: "/api/export/materials",
    description: "Complete materials inventory with costs and suppliers",
    method: "GET",
  },
  {
    name: "Inventory Levels",
    endpoint: "/api/export/inventory",
    description: "Current inventory status with reorder recommendations",
    method: "GET",
  },
  {
    name: "Suppliers",
    endpoint: "/api/export/suppliers",
    description: "Supplier directory with risk scores and performance",
    method: "GET",
  },
  {
    name: "Commodity Prices",
    endpoint: "/api/export/commodities",
    description: "Real-time commodity pricing data",
    method: "GET",
  },
  {
    name: "RFQs",
    endpoint: "/api/export/rfqs",
    description: "Request for quotation records",
    method: "GET",
  },
  {
    name: "Purchase Orders",
    endpoint: "/api/export/purchase_orders",
    description: "Purchase order history and status",
    method: "GET",
  },
];

const lookmlTemplate = `connection: "prescient_labs"

explore: materials {
  label: "Materials Catalog"
  description: "Materials inventory with costs"
}

explore: forecasts {
  label: "Demand Forecasts"
  description: "SKU demand predictions"
}

view: materials {
  sql_table_name: materials ;;
  
  dimension: id {
    primary_key: yes
    type: string
  }
  
  dimension: name {
    type: string
  }
  
  dimension: category {
    type: string
  }
  
  measure: total_value {
    type: sum
    sql: \${TABLE}.unitCost * \${TABLE}.onHand ;;
    value_format_name: usd
  }
}`;

export function LookerDialog({ open, onOpenChange }: LookerDialogProps) {
  const { toast } = useToast();
  const [selectedEndpoint, setSelectedEndpoint] = useState(apiEndpoints[0]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const getFullUrl = (endpoint: string) => `${baseUrl}${endpoint}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#4285F4]" />
            Looker Integration
          </DialogTitle>
          <DialogDescription>
            Connect Google Looker to Prescient Labs data via our REST API for advanced analytics and embedded dashboards.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="endpoints" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="endpoints" data-testid="tab-looker-endpoints">
              API Endpoints
            </TabsTrigger>
            <TabsTrigger value="setup" data-testid="tab-looker-setup">
              Setup Guide
            </TabsTrigger>
            <TabsTrigger value="lookml" data-testid="tab-looker-lookml">
              LookML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-blue-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-blue-600 dark:text-blue-400">Available Data Endpoints</span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    These REST API endpoints return JSON data compatible with Looker's data source connectors.
                  </p>
                </div>

                <div className="grid gap-2">
                  {apiEndpoints.map((endpoint) => (
                    <Card
                      key={endpoint.endpoint}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedEndpoint.endpoint === endpoint.endpoint ? "border-primary" : ""
                      }`}
                      onClick={() => setSelectedEndpoint(endpoint)}
                      data-testid={`card-looker-endpoint-${endpoint.name.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm">{endpoint.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {endpoint.method}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(getFullUrl(endpoint.endpoint), "Endpoint URL");
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          <code className="bg-muted px-1 rounded">{endpoint.endpoint}</code>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="setup" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-signal" />
                    <span className="font-medium text-amber-600">Looker Studio / Looker Setup</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Step 1: Create a Data Source</h4>
                    <p className="text-sm text-muted-foreground">
                      In Looker Studio, click "Create" then "Data Source" and select "JSON" or use Looker's custom connector.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 2: Configure API Connection</h4>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={getFullUrl("/api/export/forecasts")}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(getFullUrl("/api/export/forecasts"), "API URL")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 3: Authentication</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Use session-based authentication. Ensure your Looker instance has access to your Prescient Labs session.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 4: Data Refresh</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure scheduled data refresh in Looker to keep your dashboards current. We recommend refreshing every 15-60 minutes depending on your use case.
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        API Access
                      </CardTitle>
                      <CardDescription className="text-xs">
                        All endpoints require authentication. Use your active session or API keys for programmatic access.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="lookml" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-green-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-good" />
                    <span className="font-medium text-green-600">LookML Template</span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Use this template as a starting point for your Looker models.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Sample LookML Model</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(lookmlTemplate, "LookML template")}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {lookmlTemplate}
                  </pre>
                </div>

                <div className="pt-2">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href="https://cloud.google.com/looker/docs/lookml-project-files"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      LookML Documentation
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
