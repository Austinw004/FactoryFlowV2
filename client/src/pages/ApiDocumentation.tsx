import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Code, Lock, Zap, Database, LineChart, Shield, Terminal, FileJson, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const apiEndpoints = [
  {
    category: "Authentication & Users",
    icon: Lock,
    description: "User authentication and session management",
    endpoints: [
      {
        method: "GET",
        path: "/api/auth/user",
        description: "Get authenticated user profile",
        auth: "Session",
        response: `{
  "id": "usr_abc123",
  "email": "user@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "companyId": "cmp_xyz789",
  "role": "admin",
  "createdAt": "2024-01-15T10:30:00Z"
}`,
      },
      {
        method: "POST",
        path: "/api/auth/login",
        description: "Initiate OAuth login flow",
        auth: "Public",
        response: `{ "redirectUrl": "https://auth.replit.com/..." }`,
      },
      {
        method: "POST",
        path: "/api/auth/logout",
        description: "End user session",
        auth: "Session",
        response: `{ "success": true }`,
      },
    ],
  },
  {
    category: "SKU & Product Management",
    icon: Database,
    description: "Manage products, SKUs, and demand data",
    endpoints: [
      {
        method: "GET",
        path: "/api/skus",
        description: "List all SKUs for company",
        auth: "Session",
        response: `[
  {
    "id": 1,
    "companyId": "cmp_xyz789",
    "name": "Industrial Widget A",
    "sku": "IW-001",
    "category": "Components",
    "basePrice": 24.99,
    "costPerUnit": 12.50,
    "leadTimeDays": 14,
    "safetyStockDays": 7,
    "historicalDemand": [120, 135, 128, 142, 150]
  }
]`,
      },
      {
        method: "POST",
        path: "/api/skus",
        description: "Create new SKU",
        auth: "Session",
        body: `{
  "name": "Industrial Widget B",
  "sku": "IW-002",
  "category": "Components",
  "basePrice": 29.99,
  "costPerUnit": 15.00,
  "leadTimeDays": 21,
  "safetyStockDays": 10,
  "historicalDemand": [100, 110, 115]
}`,
        response: `{ "id": 2, "success": true }`,
      },
      {
        method: "DELETE",
        path: "/api/skus/:id",
        description: "Delete SKU by ID",
        auth: "Session",
        response: `{ "deleted": true }`,
      },
    ],
  },
  {
    category: "Demand Forecasting",
    icon: LineChart,
    description: "AI-powered demand forecasting with MAPE tracking",
    endpoints: [
      {
        method: "GET",
        path: "/api/forecasts/:skuId",
        description: "Get forecast for specific SKU",
        auth: "Session",
        response: `{
  "skuId": 1,
  "horizon": 90,
  "forecasts": [
    { "date": "2024-02-01", "predicted": 145, "lower": 130, "upper": 160 },
    { "date": "2024-02-08", "predicted": 152, "lower": 135, "upper": 169 }
  ],
  "mape": 8.2,
  "model": "regime_aware_arima",
  "lastTrained": "2024-01-28T00:00:00Z"
}`,
      },
      {
        method: "POST",
        path: "/api/forecasts/retrain/:skuId",
        description: "Trigger forecast model retraining",
        auth: "Session",
        response: `{
  "success": true,
  "previousMape": 9.5,
  "newMape": 8.2,
  "improvement": 13.7
}`,
      },
    ],
  },
  {
    category: "Economic Regime Intelligence",
    icon: Zap,
    description: "FDR economic model and market timing signals",
    endpoints: [
      {
        method: "GET",
        path: "/api/regime",
        description: "Get current economic regime",
        auth: "Session",
        response: `{
  "currentRegime": "healthy_expansion",
  "regimeScore": 72,
  "signals": {
    "monetary": "accommodative",
    "fiscal": "expansionary",
    "credit": "normal"
  },
  "marketTiming": {
    "recommendation": "accelerate_purchases",
    "confidence": 0.85,
    "horizon": "30_days"
  },
  "lastUpdated": "2024-01-28T12:00:00Z"
}`,
      },
      {
        method: "GET",
        path: "/api/regime/history",
        description: "Historical regime data (30 days)",
        auth: "Session",
        response: `[
  { "date": "2024-01-28", "regime": "healthy_expansion", "score": 72 },
  { "date": "2024-01-27", "regime": "healthy_expansion", "score": 71 }
]`,
      },
    ],
  },
  {
    category: "Material Allocation",
    icon: Shield,
    description: "Constraint-based allocation optimization",
    endpoints: [
      {
        method: "GET",
        path: "/api/allocations",
        description: "Get current allocations",
        auth: "Session",
        response: `[
  {
    "id": 1,
    "skuId": 1,
    "skuName": "Industrial Widget A",
    "allocatedUnits": 1500,
    "priority": 1,
    "constraintType": "material",
    "utilizationPct": 87.5
  }
]`,
      },
      {
        method: "POST",
        path: "/api/allocations/optimize",
        description: "Run allocation optimizer",
        auth: "Session",
        body: `{
  "constraints": [
    { "type": "material", "materialId": 1, "available": 5000 },
    { "type": "capacity", "machineId": 1, "hoursAvailable": 160 }
  ],
  "objective": "maximize_margin"
}`,
        response: `{
  "optimized": true,
  "totalMargin": 125000,
  "allocations": [...]
}`,
      },
    ],
  },
  {
    category: "Commodity Pricing & Forecasts",
    icon: LineChart,
    description: "Real-time commodity prices and ML forecasts",
    endpoints: [
      {
        method: "GET",
        path: "/api/commodities",
        description: "Get all tracked commodities with current prices",
        auth: "Session",
        response: `[
  {
    "symbol": "COPPER",
    "name": "Copper",
    "price": 8542.50,
    "currency": "USD",
    "unit": "MT",
    "change24h": 1.2,
    "lastUpdated": "2024-01-28T15:30:00Z"
  }
]`,
      },
      {
        method: "GET",
        path: "/api/commodity-forecasts/:symbol",
        description: "Get price forecasts for commodity",
        auth: "Session",
        response: `{
  "symbol": "COPPER",
  "currentPrice": 8542.50,
  "forecasts": {
    "30day": { "price": 8650, "confidence": 0.78, "direction": "up" },
    "60day": { "price": 8820, "confidence": 0.65, "direction": "up" },
    "90day": { "price": 8950, "confidence": 0.52, "direction": "up" }
  },
  "regime": "healthy_expansion",
  "regimeImpact": "positive"
}`,
      },
    ],
  },
  {
    category: "Platform Analytics",
    icon: Terminal,
    description: "Platform value and usage metrics",
    endpoints: [
      {
        method: "GET",
        path: "/api/platform/value",
        description: "Get platform value metrics and ROI",
        auth: "Session",
        response: `{
  "totalSavings": 127500,
  "forecastAccuracyImprovement": 15.2,
  "allocationEfficiencyGain": 12.8,
  "procurementTimingSavings": 45000,
  "riskMitigationValue": 82500,
  "monthsActive": 6,
  "roi": 425
}`,
      },
      {
        method: "GET",
        path: "/api/platform/health",
        description: "Platform health and usage analytics",
        auth: "Session",
        response: `{
  "uptime": 99.97,
  "apiLatencyP50": 45,
  "apiLatencyP99": 180,
  "dailyActiveUsers": 24,
  "monthlyApiCalls": 125000,
  "dataFreshness": "real_time"
}`,
      },
    ],
  },
  {
    category: "Webhooks & Integrations",
    icon: Zap,
    description: "Real-time event notifications",
    endpoints: [
      {
        method: "POST",
        path: "/api/webhooks",
        description: "Register webhook endpoint",
        auth: "Session",
        body: `{
  "url": "https://your-system.com/webhook",
  "events": ["regime_change", "forecast_alert", "inventory_low"],
  "secret": "your-webhook-secret"
}`,
        response: `{
  "id": "wh_abc123",
  "active": true,
  "createdAt": "2024-01-28T10:00:00Z"
}`,
      },
      {
        method: "GET",
        path: "/api/webhooks",
        description: "List registered webhooks",
        auth: "Session",
        response: `[
  {
    "id": "wh_abc123",
    "url": "https://your-system.com/webhook",
    "events": ["regime_change", "forecast_alert"],
    "active": true,
    "lastDelivery": "2024-01-28T09:30:00Z"
  }
]`,
      },
    ],
  },
];

const sdkExamples: Record<string, string> = {
  python: [
    'import prescient',
    '',
    '# Initialize client',
    'client = prescient.Client(api_key="your-api-key")',
    '',
    '# Get current economic regime',
    'regime = client.regime.current()',
    'print(f"Current regime: {regime.name}")',
    'print(f"Market timing: {regime.market_timing.recommendation}")',
    '',
    '# Get demand forecast for a SKU',
    'forecast = client.forecasts.get(sku_id=123)',
    'print(f"MAPE: {forecast.mape}%")',
    'for point in forecast.predictions[:5]:',
    '    print(f"  {point.date}: {point.predicted} units")',
    '',
    '# Run allocation optimization',
    'result = client.allocations.optimize(',
    '    constraints=[',
    '        {"type": "material", "id": 1, "available": 5000}',
    '    ],',
    '    objective="maximize_margin"',
    ')',
    'print(f"Optimized margin: ${result.total_margin:,.2f}")',
  ].join('\n'),
  javascript: [
    "import { PrescientClient } from '@prescient/sdk';",
    '',
    '// Initialize client',
    "const client = new PrescientClient({ apiKey: 'your-api-key' });",
    '',
    '// Get current economic regime',
    'const regime = await client.regime.getCurrent();',
    'console.log(`Current regime: ${regime.name}`);',
    'console.log(`Market timing: ${regime.marketTiming.recommendation}`);',
    '',
    '// Get demand forecast for a SKU',
    'const forecast = await client.forecasts.get({ skuId: 123 });',
    'console.log(`MAPE: ${forecast.mape}%`);',
    'forecast.predictions.slice(0, 5).forEach(point => {',
    '  console.log(`  ${point.date}: ${point.predicted} units`);',
    '});',
    '',
    '// Run allocation optimization',
    'const result = await client.allocations.optimize({',
    '  constraints: [',
    "    { type: 'material', id: 1, available: 5000 }",
    '  ],',
    "  objective: 'maximize_margin'",
    '});',
    'console.log(`Optimized margin: $${result.totalMargin.toLocaleString()}`);',
  ].join('\n'),
  curl: [
    '# Get current economic regime',
    'curl -X GET "https://api.prescientlabs.io/v1/regime" \\',
    '  -H "Authorization: Bearer YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json"',
    '',
    '# Get demand forecast for a SKU',
    'curl -X GET "https://api.prescientlabs.io/v1/forecasts/123" \\',
    '  -H "Authorization: Bearer YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json"',
    '',
    '# Run allocation optimization',
    'curl -X POST "https://api.prescientlabs.io/v1/allocations/optimize" \\',
    '  -H "Authorization: Bearer YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "constraints": [',
    '      {"type": "material", "id": 1, "available": 5000}',
    '    ],',
    '    "objective": "maximize_margin"',
    "  }'",
    '',
    '# Register webhook',
    'curl -X POST "https://api.prescientlabs.io/v1/webhooks" \\',
    '  -H "Authorization: Bearer YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "url": "https://your-system.com/webhook",',
    '    "events": ["regime_change", "forecast_alert"],',
    '    "secret": "your-webhook-secret"',
    "  }'",
  ].join('\n'),
};

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function ApiDocumentation() {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<"python" | "javascript" | "curl">("python");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code snippet copied successfully",
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            Enterprise-grade REST API for manufacturing intelligence integration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            v2.1 Stable
          </Badge>
          <Badge variant="outline">OpenAPI 3.0</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-api-version">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v2.1</div>
            <p className="text-xs text-muted-foreground">Released Jan 2025</p>
          </CardContent>
        </Card>
        <Card data-testid="card-endpoints-count">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiEndpoints.reduce((sum, cat) => sum + cat.endpoints.length, 0)}+
            </div>
            <p className="text-xs text-muted-foreground">RESTful endpoints</p>
          </CardContent>
        </Card>
        <Card data-testid="card-response-time">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45ms</div>
            <p className="text-xs text-muted-foreground">P50 latency</p>
          </CardContent>
        </Card>
        <Card data-testid="card-uptime">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">Enterprise guarantee</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList data-testid="tabs-api-docs">
          <TabsTrigger value="endpoints" data-testid="tab-endpoints">
            <FileJson className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="sdk" data-testid="tab-sdk">
            <Code className="h-4 w-4 mr-2" />
            SDK Examples
          </TabsTrigger>
          <TabsTrigger value="authentication" data-testid="tab-auth">
            <Lock className="h-4 w-4 mr-2" />
            Authentication
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Endpoints Reference</CardTitle>
              <CardDescription>
                Complete reference for all available API endpoints. All endpoints require authentication unless marked as Public.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {apiEndpoints.map((category, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline" data-testid={`accordion-${category.category.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <category.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{category.category}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                        <Badge variant="outline" className="ml-auto mr-4">
                          {category.endpoints.length} endpoints
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      {category.endpoints.map((endpoint, endpointIdx) => (
                        <div key={endpointIdx} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={methodColors[endpoint.method]}>
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {endpoint.path}
                              </code>
                            </div>
                            <Badge variant="outline">{endpoint.auth}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                          
                          {endpoint.body && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">Request Body</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(endpoint.body!)}
                                  data-testid={`copy-body-${endpointIdx}`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                                <code>{endpoint.body}</code>
                              </pre>
                            </div>
                          )}
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">Response</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(endpoint.response)}
                                data-testid={`copy-response-${endpointIdx}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                              <code>{endpoint.response}</code>
                            </pre>
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SDK & Integration Examples</CardTitle>
              <CardDescription>
                Quick-start examples for integrating Prescient Labs into your systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedLanguage === "python" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLanguage("python")}
                  data-testid="btn-sdk-python"
                >
                  Python
                </Button>
                <Button
                  variant={selectedLanguage === "javascript" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLanguage("javascript")}
                  data-testid="btn-sdk-javascript"
                >
                  JavaScript
                </Button>
                <Button
                  variant={selectedLanguage === "curl" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLanguage("curl")}
                  data-testid="btn-sdk-curl"
                >
                  cURL
                </Button>
              </div>
              
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(sdkExamples[selectedLanguage])}
                  data-testid="btn-copy-sdk"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{sdkExamples[selectedLanguage]}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Python SDK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted px-2 py-1 rounded">pip install prescient-sdk</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Full-featured Python SDK with async support
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  JavaScript SDK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted px-2 py-1 rounded">npm i @prescient/sdk</code>
                <p className="text-xs text-muted-foreground mt-2">
                  TypeScript-first with full type definitions
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  OpenAPI Spec
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted px-2 py-1 rounded">api.prescientlabs.io/openapi.json</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Generate clients in any language
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authentication</CardTitle>
              <CardDescription>
                Secure API access using API keys or OAuth 2.0
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  API Key Authentication
                </h4>
                <p className="text-sm text-muted-foreground">
                  Include your API key in the Authorization header:
                </p>
                <pre className="bg-muted p-3 rounded-lg text-sm">
                  <code>Authorization: Bearer YOUR_API_KEY</code>
                </pre>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Best Practices
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                    Store API keys in environment variables, never in code
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                    Use separate keys for development and production
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                    Rotate keys regularly (recommended every 90 days)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                    Use webhook secrets to verify payload authenticity
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Rate Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="font-medium">Starter</div>
                    <div className="text-2xl font-bold">1,000</div>
                    <div className="text-xs text-muted-foreground">requests/hour</div>
                  </div>
                  <div className="border rounded-lg p-3 border-primary">
                    <div className="font-medium text-primary">Professional</div>
                    <div className="text-2xl font-bold">10,000</div>
                    <div className="text-xs text-muted-foreground">requests/hour</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-medium">Enterprise</div>
                    <div className="text-2xl font-bold">Unlimited</div>
                    <div className="text-xs text-muted-foreground">custom limits</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
