import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, BarChart3, Code2, Database, Key, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PowerBIConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const apiEndpoints = [
  {
    name: "Demand Forecasts",
    endpoint: "/api/forecasts",
    description: "Get demand forecasting data for all SKUs",
    method: "GET",
    sampleResponse: {
      forecasts: [
        { skuId: "SKU-001", date: "2025-01", forecast: 1200, actual: null, mape: 8.5 },
        { skuId: "SKU-002", date: "2025-01", forecast: 850, actual: null, mape: 6.2 },
      ],
    },
  },
  {
    name: "Economic Regime",
    endpoint: "/api/economic-regime",
    description: "Current economic regime and market signals",
    method: "GET",
    sampleResponse: {
      regime: "late_expansion",
      confidence: 0.87,
      signals: { yieldCurve: "steepening", inflation: "moderate", employment: "strong" },
    },
  },
  {
    name: "Inventory Levels",
    endpoint: "/api/inventory",
    description: "Current inventory status for all items",
    method: "GET",
    sampleResponse: {
      items: [
        { skuId: "SKU-001", name: "Steel Bearings", currentStock: 1500, safetyStock: 500, reorderPoint: 800 },
      ],
    },
  },
  {
    name: "Supplier Risk Scores",
    endpoint: "/api/suppliers",
    description: "Supplier information with risk scores",
    method: "GET",
    sampleResponse: {
      suppliers: [
        { id: "SUP-001", name: "Acme Corp", riskScore: 25, leadTime: 14, onTimeDelivery: 0.94 },
      ],
    },
  },
  {
    name: "Commodity Prices",
    endpoint: "/api/commodities/prices",
    description: "Real-time commodity pricing data",
    method: "GET",
    sampleResponse: {
      commodities: [
        { name: "Copper", price: 4.25, unit: "USD/lb", change24h: 0.03, trend: "up" },
        { name: "Aluminum", price: 1.12, unit: "USD/lb", change24h: -0.01, trend: "down" },
      ],
    },
  },
];

const powerQueryTemplate = `let
    // Prescient Labs API Configuration
    BaseUrl = "{{BASE_URL}}",
    ApiKey = "YOUR_API_KEY", // Store in Power BI Service credentials
    
    // Headers for authentication
    Headers = [
        #"Content-Type" = "application/json",
        #"Authorization" = "Bearer " & ApiKey
    ],
    
    // Fetch forecasts data
    ForecastsResponse = Json.Document(
        Web.Contents(
            BaseUrl & "/api/forecasts",
            [Headers = Headers]
        )
    ),
    
    // Convert to table
    ForecastsTable = Table.FromRecords(ForecastsResponse[forecasts]),
    
    // Add calculated columns
    FinalTable = Table.AddColumn(ForecastsTable, "ForecastDate", 
        each Date.FromText([date] & "-01"))
in
    FinalTable`;

const tableauTemplate = `<datasource>
  <connection class="genericodbc" dbname="" server="{{BASE_URL}}/api" username="">
    <relation name="forecasts" table="forecasts" type="table">
      <columns>
        <column name="skuId" type="string"/>
        <column name="date" type="date"/>
        <column name="forecast" type="real"/>
        <column name="actual" type="real"/>
        <column name="mape" type="real"/>
      </columns>
    </relation>
  </connection>
</datasource>`;

export function PowerBIConnectorDialog({ open, onOpenChange }: PowerBIConnectorDialogProps) {
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
            <BarChart3 className="w-5 h-5" />
            Power BI / Tableau Connector
          </DialogTitle>
          <DialogDescription>
            Connect your BI tools directly to Prescient Labs data via our REST API.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="endpoints" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="endpoints" data-testid="tab-api-endpoints">
              API Endpoints
            </TabsTrigger>
            <TabsTrigger value="powerbi" data-testid="tab-powerbi">
              Power BI
            </TabsTrigger>
            <TabsTrigger value="tableau" data-testid="tab-tableau">
              Tableau
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
                    These REST API endpoints can be connected to any BI tool that supports JSON data sources.
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
                      data-testid={`card-endpoint-${endpoint.name.toLowerCase().replace(/\s/g, "-")}`}
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

                {selectedEndpoint && (
                  <div className="space-y-2">
                    <Label>Sample Response</Label>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedEndpoint.sampleResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="powerbi" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-signal" />
                    <span className="font-medium text-amber-600">Power BI Desktop Setup</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Step 1: Open Power Query Editor</h4>
                    <p className="text-sm text-muted-foreground">
                      In Power BI Desktop, click Home &rarr; Get Data &rarr; Web
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 2: Enter API URL</h4>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={getFullUrl("/api/forecasts")}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(getFullUrl("/api/forecasts"), "API URL")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 3: Add Authorization Header</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Click Advanced and add a header with your API key:
                    </p>
                    <div className="bg-muted p-2 rounded text-sm font-mono">
                      Authorization: Bearer YOUR_API_KEY
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Power Query M Code Template</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(powerQueryTemplate.replace("{{BASE_URL}}", baseUrl), "Power Query code")}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                      {powerQueryTemplate.replace("{{BASE_URL}}", baseUrl)}
                    </pre>
                  </div>

                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Scheduled Refresh
                      </CardTitle>
                      <CardDescription className="text-xs">
                        After publishing to Power BI Service, set up scheduled refresh to keep data current.
                        Configure credentials in the dataset settings.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tableau" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="rounded-md bg-blue-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-blue-600 dark:text-blue-400">Tableau Desktop Setup</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Step 1: Connect to Web Data Connector</h4>
                    <p className="text-sm text-muted-foreground">
                      In Tableau Desktop, click Connect &rarr; Web Data Connector
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 2: Use JSON API Connection</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Alternatively, use Tableau's built-in JSON file connector with our API:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={getFullUrl("/api/forecasts")}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(getFullUrl("/api/forecasts"), "API URL")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 3: Configure Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Add your API key as a URL parameter or use Tableau's credential manager.
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        API Key Required
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Contact your administrator or visit Settings &rarr; API Keys to generate an API key for BI tool access.
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="pt-2">
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href="https://help.tableau.com/current/pro/desktop/en-us/examples_web_data_connector.htm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Tableau Web Data Connector Docs
                      </a>
                    </Button>
                  </div>
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
