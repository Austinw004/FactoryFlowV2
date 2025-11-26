import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Database, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Copy,
  FileCode,
  Zap,
  Shield,
  RefreshCw,
  Building2,
  Package
} from "lucide-react";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ErpTemplate {
  id: string;
  erpName: string;
  erpVersion?: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  
  supportedModules?: string[];
  dataFlowDirection: string;
  connectionType: string;
  authMethod: string;
  apiDocumentationUrl?: string;
  
  fieldMappings: Record<string, any>;
  sampleConfig?: Record<string, any>;
  setupInstructions?: string;
  
  isPopular?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ErpConnection {
  id: string;
  erpType: string;
  connectionName: string;
  status: string;
  lastSyncAt?: string;
}

const ERP_LOGOS: Record<string, { icon: any; color: string }> = {
  "SAP": { icon: Building2, color: "text-blue-600" },
  "Oracle NetSuite": { icon: Database, color: "text-red-600" },
  "Microsoft Dynamics 365": { icon: Package, color: "text-purple-600" },
  "Sage": { icon: Settings, color: "text-green-600" },
  "Infor": { icon: Zap, color: "text-orange-600" },
};

function TemplateCard({ template, onSetup }: { template: ErpTemplate; onSetup: (template: ErpTemplate) => void }) {
  const erpConfig = ERP_LOGOS[template.erpName] || { icon: Database, color: "text-gray-600" };
  const Icon = erpConfig.icon;
  
  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-erp-${template.erpName.toLowerCase().replace(/\s/g, '-')}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${erpConfig.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{template.displayName || template.erpName}</CardTitle>
              <CardDescription>{template.erpVersion || 'Latest'}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {template.isPopular && (
              <Badge variant="secondary">Popular</Badge>
            )}
            {template.isActive && (
              <Badge variant="default" className="bg-green-600">Active</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{template.description}</p>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            {template.dataFlowDirection}
          </Badge>
          <Badge variant="outline">
            {template.authMethod}
          </Badge>
          <Badge variant="outline">
            {template.connectionType}
          </Badge>
        </div>
        
        {template.supportedModules && template.supportedModules.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Supported Modules:</p>
            <div className="flex flex-wrap gap-1">
              {template.supportedModules.slice(0, 4).map((module) => (
                <Badge key={module} variant="outline" className="text-xs capitalize">
                  {module}
                </Badge>
              ))}
              {template.supportedModules.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{template.supportedModules.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="default" 
            className="flex-1"
            onClick={() => onSetup(template)}
            data-testid={`button-setup-${template.erpName.toLowerCase().replace(/\s/g, '-')}`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          {template.apiDocumentationUrl && (
            <Button variant="outline" size="icon" asChild>
              <a href={template.apiDocumentationUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SetupDialog({ 
  template, 
  isOpen, 
  onClose 
}: { 
  template: ErpTemplate | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  
  if (!template) return null;
  
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied",
      description: `${field} copied to clipboard`,
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configure {template.erpName}
          </DialogTitle>
          <DialogDescription>
            Follow these steps to connect your {template.erpName} instance
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
            <TabsTrigger value="sync">Sync Config</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Authentication
                </CardTitle>
                <CardDescription>
                  {template.authMethod} authentication via {template.connectionType}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.sampleConfig?.requiredFields && (
                  <div>
                    <p className="text-sm font-medium mb-2">Required Fields:</p>
                    <div className="space-y-2">
                      {template.sampleConfig.requiredFields.map((field: string) => (
                        <div key={field} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm font-mono">{field}</span>
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {template.sampleConfig?.optionalFields && template.sampleConfig.optionalFields.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Optional Fields:</p>
                    <div className="space-y-2">
                      {template.sampleConfig.optionalFields.map((field: string) => (
                        <div key={field} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm font-mono">{field}</span>
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Setup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {template.setupInstructions ? (
                  <ol className="space-y-3">
                    {template.setupInstructions.split('\n').map((instruction, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm">{instruction.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No setup instructions available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mappings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Default Field Mappings</CardTitle>
                <CardDescription>
                  How your {template.erpName} fields map to our system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(template.fieldMappings).filter(([k]) => k !== 'customMappings').map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded bg-muted/50">
                      <div>
                        <span className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <p className="text-xs text-muted-foreground">{template.erpName} field</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded">{value as string}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(value as string, key)}
                        >
                          {copied === key ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sync Configuration</CardTitle>
                <CardDescription>
                  Data synchronization settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Data Flow Direction</p>
                    <p className="text-sm font-medium capitalize">{template.dataFlowDirection}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Connection Type</p>
                    <p className="text-sm font-medium uppercase">{template.connectionType}</p>
                  </div>
                </div>
                
                {template.supportedModules && template.supportedModules.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Supported Modules:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.supportedModules.map((module) => (
                        <Badge key={module} variant="secondary" className="capitalize">
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {template.sampleConfig?.batchSize && (
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Batch Size</p>
                    <p className="text-sm font-medium">{template.sampleConfig.batchSize} records</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button data-testid="button-start-integration">
            Start Integration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectionCard({ connection }: { connection: ErpConnection }) {
  const statusColors: Record<string, string> = {
    connected: "bg-green-600",
    disconnected: "bg-red-600",
    syncing: "bg-yellow-600",
    error: "bg-red-600",
  };
  
  return (
    <Card data-testid={`card-connection-${connection.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{connection.connectionName}</p>
              <p className="text-sm text-muted-foreground">{connection.erpType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[connection.status] || "bg-gray-600"}>
              {connection.status}
            </Badge>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {connection.lastSyncAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ErpTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<ErpTemplate | null>(null);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  
  const { data: templates, isLoading: templatesLoading } = useQuery<ErpTemplate[]>({
    queryKey: ["/api/erp/templates"],
  });
  
  const { data: connections } = useQuery<ErpConnection[]>({
    queryKey: ["/api/erp/connections"],
  });
  
  const handleSetup = (template: ErpTemplate) => {
    setSelectedTemplate(template);
    setSetupDialogOpen(true);
  };
  
  if (templatesLoading) {
    return <LoadingSkeleton />;
  }
  
  const activeTemplates = templates?.filter(t => t.isActive) || [];
  const inactiveTemplates = templates?.filter(t => !t.isActive) || [];
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-erp-templates">
            ERP Integration Templates
          </h1>
          <p className="text-muted-foreground">
            Pre-built configurations for the top 5 ERP systems
          </p>
        </div>
        <Badge variant="secondary">
          {activeTemplates.length} templates available
        </Badge>
      </div>
      
      {connections && connections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Connections</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} />
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Available Templates</h2>
        {activeTemplates.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeTemplates.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template}
                onSetup={handleSetup}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
              <p className="text-muted-foreground">
                ERP integration templates are being configured. Check back soon.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {inactiveTemplates.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="coming-soon">
            <AccordionTrigger className="text-lg font-semibold">
              Coming Soon ({inactiveTemplates.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
                {inactiveTemplates.map((template) => (
                  <Card key={template.id} className="opacity-60">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.erpName}</CardTitle>
                          <CardDescription>Coming soon</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      <SetupDialog 
        template={selectedTemplate}
        isOpen={setupDialogOpen}
        onClose={() => {
          setSetupDialogOpen(false);
          setSelectedTemplate(null);
        }}
      />
    </div>
  );
}
