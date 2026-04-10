import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Webhook, 
  Plus, 
  ArrowUpDown, 
  Settings,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  ArrowRight,
  ArrowLeft,
  Link2,
  Shield,
  Zap,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type WebhookPlatform = "mulesoft" | "boomi" | "zapier" | "make" | "workato" | "custom";
type WebhookStatus = "active" | "paused" | "error" | "pending_setup";

interface WebhookIntegration {
  id: string;
  companyId: string;
  name: string;
  platform: WebhookPlatform;
  inboundEnabled: boolean;
  inboundEndpoint: string;
  inboundSecret: string;
  inboundDataTypes: string[];
  outboundEnabled: boolean;
  outboundUrl: string | null;
  outboundSecret: string | null;
  outboundEvents: string[];
  outboundHeaders: Record<string, string>;
  status: WebhookStatus;
  fieldMappings: Record<string, any>;
}

const PLATFORMS: Record<WebhookPlatform, { name: string; description: string; color: string }> = {
  mulesoft: { name: "MuleSoft", description: "Anypoint Platform integration", color: "bg-blue-500" },
  boomi: { name: "Dell Boomi", description: "AtomSphere integration platform", color: "bg-purple-500" },
  zapier: { name: "Zapier", description: "No-code automation platform", color: "bg-orange-500" },
  make: { name: "Make (Integromat)", description: "Visual automation platform", color: "bg-violet-500" },
  workato: { name: "Workato", description: "Enterprise automation platform", color: "bg-green-500" },
  custom: { name: "Custom Webhook", description: "Generic webhook endpoint", color: "bg-gray-500" },
};

const DATA_TYPES = [
  { id: "inventory", label: "Inventory Updates" },
  { id: "purchase_orders", label: "Purchase Orders" },
  { id: "sales_orders", label: "Sales Orders" },
  { id: "production", label: "Production Data" },
  { id: "suppliers", label: "Supplier Updates" },
  { id: "materials", label: "Materials & SKUs" },
];

const OUTBOUND_EVENTS = [
  { id: "regime_change", label: "Economic Regime Changes" },
  { id: "forecast_complete", label: "Forecast Completion" },
  { id: "rfq_generated", label: "RFQ Generated" },
  { id: "low_stock", label: "Low Stock Alerts" },
  { id: "price_alert", label: "Price Alerts" },
  { id: "supplier_risk_change", label: "Supplier Risk Changes" },
  { id: "po_created", label: "Purchase Order Created" },
  { id: "allocation_updated", label: "Allocation Updates" },
];

function getStatusBadge(status: WebhookStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
    case "paused":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Paused</Badge>;
    case "error":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
    case "pending_setup":
      return <Badge variant="outline"><Settings className="w-3 h-3 mr-1" /> Setup Required</Badge>;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: `${label} copied to clipboard` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, '-')}`}>
      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function SecretDisplay({ secret, label }: { secret: string; label: string }) {
  const [visible, setVisible] = useState(false);
  
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs bg-muted p-2 rounded font-mono overflow-hidden text-ellipsis">
        {visible ? secret : "••••••••••••••••••••••••••••••••"}
      </code>
      <Button variant="ghost" size="icon" onClick={() => setVisible(!visible)} data-testid={`button-toggle-${label.toLowerCase().replace(/\s/g, '-')}`}>
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </Button>
      <CopyButton text={secret} label={label} />
    </div>
  );
}

function CreateIntegrationDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    platform: "custom" as WebhookPlatform,
    inboundEnabled: true,
    inboundDataTypes: ["inventory", "purchase_orders"] as string[],
    outboundEnabled: false,
    outboundUrl: "",
    outboundEvents: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/webhooks/integrations", data);
    },
    onSuccess: () => {
      toast({ title: "Integration Created", description: "Your webhook integration has been set up successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/integrations"] });
      onSuccess();
      onOpenChange(false);
      setStep(1);
      setFormData({
        name: "",
        platform: "custom",
        inboundEnabled: true,
        inboundDataTypes: ["inventory", "purchase_orders"],
        outboundEnabled: false,
        outboundUrl: "",
        outboundEvents: [],
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleToggleDataType = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      inboundDataTypes: prev.inboundDataTypes.includes(typeId)
        ? prev.inboundDataTypes.filter(t => t !== typeId)
        : [...prev.inboundDataTypes, typeId]
    }));
  };

  const handleToggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      outboundEvents: prev.outboundEvents.includes(eventId)
        ? prev.outboundEvents.filter(e => e !== eventId)
        : [...prev.outboundEvents, eventId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Webhook Integration</DialogTitle>
          <DialogDescription>
            Set up bidirectional data flow with your middleware platform
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name</Label>
              <Input
                id="name"
                placeholder="e.g., SAP via MuleSoft"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-integration-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Middleware Platform</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PLATFORMS) as WebhookPlatform[]).map((key) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer hover-elevate ${formData.platform === key ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, platform: key }))}
                    data-testid={`card-platform-${key}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${PLATFORMS[key].color}`} />
                      <div>
                        <p className="font-medium text-sm">{PLATFORMS[key].name}</p>
                        <p className="text-xs text-muted-foreground">{PLATFORMS[key].description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Inbound Data (to Prescient Labs)
                  </h4>
                  <p className="text-sm text-muted-foreground">Receive data from your middleware</p>
                </div>
                <Switch 
                  checked={formData.inboundEnabled} 
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inboundEnabled: checked }))}
                  data-testid="switch-inbound-enabled"
                />
              </div>
              
              {formData.inboundEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  {DATA_TYPES.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`inbound-${type.id}`}
                        checked={formData.inboundDataTypes.includes(type.id)}
                        onCheckedChange={() => handleToggleDataType(type.id)}
                        data-testid={`checkbox-inbound-${type.id}`}
                      />
                      <Label htmlFor={`inbound-${type.id}`} className="text-sm">{type.label}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Outbound Events (from Prescient Labs)
                  </h4>
                  <p className="text-sm text-muted-foreground">Push events to your middleware</p>
                </div>
                <Switch 
                  checked={formData.outboundEnabled} 
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, outboundEnabled: checked }))}
                  data-testid="switch-outbound-enabled"
                />
              </div>
              
              {formData.outboundEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="outboundUrl">Webhook URL</Label>
                    <Input
                      id="outboundUrl"
                      placeholder="https://your-middleware.com/webhook"
                      value={formData.outboundUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, outboundUrl: e.target.value }))}
                      data-testid="input-outbound-url"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTBOUND_EVENTS.map((event) => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`outbound-${event.id}`}
                          checked={formData.outboundEvents.includes(event.id)}
                          onCheckedChange={() => handleToggleEvent(event.id)}
                          data-testid={`checkbox-outbound-${event.id}`}
                        />
                        <Label htmlFor={`outbound-${event.id}`} className="text-sm">{event.label}</Label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} data-testid="button-back">
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!formData.name} data-testid="button-next">
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending} data-testid="button-submit-integration">
              {createMutation.isPending ? "Creating..." : "Create Integration"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IntegrationCard({ 
  integration, 
  onDelete 
}: { 
  integration: WebhookIntegration; 
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const platform = PLATFORMS[integration.platform];

  return (
    <Card className="overflow-hidden" data-testid={`card-integration-${integration.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
              <Webhook className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{integration.name}</h3>
              <p className="text-sm text-muted-foreground">{platform.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(integration.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-menu-${integration.id}`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                  <Settings className="w-4 h-4 mr-2" /> Configure
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(integration.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {integration.inboundEnabled && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowRight className="w-3 h-3" />
              <span>Inbound ({integration.inboundDataTypes?.length || 0} types)</span>
            </div>
          )}
          {integration.outboundEnabled && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowLeft className="w-3 h-3" />
              <span>Outbound ({integration.outboundEvents?.length || 0} events)</span>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {integration.inboundEnabled && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Inbound Endpoint
                </h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono overflow-hidden text-ellipsis">
                    {window.location.origin}{integration.inboundEndpoint}
                  </code>
                  <CopyButton text={`${window.location.origin}${integration.inboundEndpoint}`} label="Endpoint" />
                </div>
                
                <h4 className="text-sm font-medium flex items-center gap-2 mt-3">
                  <Shield className="w-4 h-4" /> Signature Secret
                </h4>
                <SecretDisplay secret={integration.inboundSecret} label="Secret" />
                <p className="text-xs text-muted-foreground">
                  Use this secret to sign your webhook payloads with HMAC-SHA256
                </p>
              </div>
            )}

            {integration.outboundEnabled && integration.outboundUrl && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Outbound URL
                </h4>
                <code className="text-xs bg-muted p-2 rounded font-mono block overflow-hidden text-ellipsis">
                  {integration.outboundUrl}
                </code>
              </div>
            )}

            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {integration.inboundDataTypes?.length || 0} data types
              </Badge>
              <Badge variant="outline" className="text-xs">
                {integration.outboundEvents?.length || 0} events
              </Badge>
            </div>
          </div>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-3"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-${integration.id}`}
        >
          {expanded ? "Hide Details" : "Show Details"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function WebhookIntegrations() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: integrations, isLoading, refetch } = useQuery<WebhookIntegration[]>({
    queryKey: ["/api/webhooks/integrations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/webhooks/integrations/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Integration Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/integrations"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Webhook Integrations</h1>
            <p className="text-muted-foreground">
              Connect Prescient Labs with middleware platforms for bidirectional data sync
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-integration">
            <Plus className="w-4 h-4 mr-2" /> New Integration
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <ArrowUpDown className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-integrations">{integrations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Webhook Integrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-integrations">
                  {integrations?.filter(i => i.status === "active").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-event-subscriptions">
                  {integrations?.reduce((sum, i) => sum + (i.outboundEvents?.length || 0), 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Event Subscriptions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Supported Platforms
            </CardTitle>
            <CardDescription>
              Connect with enterprise integration platforms or use custom webhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {(Object.keys(PLATFORMS) as WebhookPlatform[]).map((key) => (
                <div key={key} className="flex flex-col items-center gap-2 p-3 rounded-lg border hover-elevate cursor-pointer" data-testid={`card-supported-platform-${key}`}>
                  <div className={`w-8 h-8 rounded-full ${PLATFORMS[key].color} flex items-center justify-center`}>
                    <Webhook className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-center">{PLATFORMS[key].name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : integrations && integrations.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Integrations</h2>
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {integrations.map((integration) => (
                <IntegrationCard 
                  key={integration.id} 
                  integration={integration} 
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Webhook className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Webhook Integrations</h3>
              <p className="text-muted-foreground mb-4">
                Create your first integration to enable bidirectional data sync with your middleware platform
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first">
                <Plus className="w-4 h-4 mr-2" /> Create Integration
              </Button>
            </CardContent>
          </Card>
        )}

        <CreateIntegrationDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => refetch()}
        />
      </div>
    </div>
  );
}
