import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Zap, CheckCircle } from "lucide-react";

interface N8nDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const webhookTemplates = [
  {
    id: "regime-change",
    name: "Economic Regime Change",
    description: "Trigger when economic regime shifts",
    event: "regime.changed",
    payload: {
      event: "regime.changed",
      timestamp: "2025-01-09T12:00:00Z",
      data: {
        previousRegime: "expansion",
        newRegime: "contraction",
        confidence: 0.87,
        recommendation: "Reduce inventory levels",
      },
    },
  },
  {
    id: "stockout-alert",
    name: "Stockout Warning",
    description: "Trigger when inventory falls below safety stock",
    event: "inventory.stockout_warning",
    payload: {
      event: "inventory.stockout_warning",
      timestamp: "2025-01-09T12:00:00Z",
      data: {
        skuId: "SKU-12345",
        skuName: "Steel Bearings 10mm",
        currentStock: 150,
        safetyStock: 500,
        daysUntilStockout: 3,
      },
    },
  },
  {
    id: "supplier-risk",
    name: "Supplier Risk Alert",
    description: "Trigger when supplier risk score exceeds threshold",
    event: "supplier.risk_alert",
    payload: {
      event: "supplier.risk_alert",
      timestamp: "2025-01-09T12:00:00Z",
      data: {
        supplierId: "SUP-001",
        supplierName: "Acme Manufacturing",
        riskScore: 85,
        riskFactors: ["delivery_delays", "financial_instability"],
      },
    },
  },
  {
    id: "price-movement",
    name: "Commodity Price Movement",
    description: "Trigger on significant price changes",
    event: "commodity.price_alert",
    payload: {
      event: "commodity.price_alert",
      timestamp: "2025-01-09T12:00:00Z",
      data: {
        commodity: "Copper",
        currentPrice: 4.25,
        previousPrice: 3.95,
        changePercent: 7.6,
        direction: "up",
      },
    },
  },
];

export function N8nDialog({ open, onOpenChange }: N8nDialogProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState(webhookTemplates[0]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inboundWebhookUrl = `${baseUrl}/api/webhooks/inbound/n8n`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const testWebhook = async () => {
    if (!webhookUrl) return;
    
    setIsTesting(true);
    try {
      const response = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          url: webhookUrl,
          event: selectedTemplate.event,
          testData: selectedTemplate.payload.data,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Webhook Test Successful",
          description: `Response received in ${result.durationMs}ms with status ${result.statusCode}`,
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: result.message || `Status: ${result.statusCode}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Could not reach the webhook URL",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#EA4B71]" />
            n8n Integration
          </DialogTitle>
          <DialogDescription>
            Connect Prescient Labs to n8n for powerful workflow automation with our webhook-based integration.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="outbound" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outbound" data-testid="tab-n8n-outbound">
              Outbound Events
            </TabsTrigger>
            <TabsTrigger value="inbound" data-testid="tab-n8n-inbound">
              Inbound Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outbound" className="space-y-4 mt-4">
            <div className="rounded-md bg-pink-500/10 p-3 text-sm">
              <p className="font-medium text-pink-600 dark:text-pink-400">Send events from Prescient Labs to n8n</p>
              <p className="text-muted-foreground mt-1">
                When events occur in Prescient Labs, we can trigger your n8n workflows via webhooks.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Your n8n Webhook URL</Label>
              <Input
                data-testid="input-n8n-webhook"
                placeholder="https://your-n8n-instance.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get this URL from your n8n Webhook trigger node
              </p>
            </div>

            <div className="space-y-2">
              <Label>Event Templates</Label>
              <div className="grid gap-2">
                {webhookTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors hover-elevate ${
                      selectedTemplate.id === template.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                    data-testid={`card-n8n-template-${template.id}`}
                  >
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {template.event}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sample Payload</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(selectedTemplate.payload, null, 2), "Payload")}
                    data-testid="button-copy-n8n-payload"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(selectedTemplate.payload, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!webhookUrl || isTesting}
                onClick={testWebhook}
                data-testid="button-test-n8n-webhook"
              >
                {isTesting ? (
                  <>Testing...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Test Webhook
                  </>
                )}
              </Button>
              <Button className="flex-1" disabled={!webhookUrl} data-testid="button-save-n8n-outbound">
                <Zap className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="inbound" className="space-y-4 mt-4">
            <div className="rounded-md bg-green-500/10 p-3 text-sm">
              <p className="font-medium text-good">Receive actions from n8n</p>
              <p className="text-muted-foreground mt-1">
                Send data to Prescient Labs from your n8n workflows.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Prescient Labs Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inboundWebhookUrl}
                  className="font-mono text-sm"
                  data-testid="input-n8n-inbound-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(inboundWebhookUrl, "Webhook URL")}
                  data-testid="button-copy-n8n-inbound-url"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this URL as the destination in your n8n HTTP Request node
              </p>
            </div>

            <div className="space-y-2">
              <Label>Supported Inbound Actions</Label>
              <div className="space-y-2">
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Create Demand Signal</CardTitle>
                    <CardDescription className="text-xs">
                      POST to create a new demand signal from external sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <pre className="bg-muted p-2 rounded text-xs">
{`{
  "action": "create_demand_signal",
  "data": {
    "source": "n8n",
    "skuId": "SKU-123",
    "quantity": 100,
    "date": "2025-01-15"
  }
}`}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Update Inventory</CardTitle>
                    <CardDescription className="text-xs">
                      POST to update inventory levels from external systems
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <pre className="bg-muted p-2 rounded text-xs">
{`{
  "action": "update_inventory",
  "data": {
    "materialCode": "MAT-001",
    "quantity": 500,
    "location": "Warehouse A"
  }
}`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" className="w-full" asChild>
                <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  n8n Webhook Documentation
                </a>
              </Button>
            </div>
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
