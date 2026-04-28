import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Database, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Zap,
  Shield,
  RefreshCw,
  Building2,
  Package,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Key,
  Link2,
  Plug,
  TestTube,
  Boxes,
  Sparkles,
  Circle,
  XCircle,
  Info,
  Play,
  Clock,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  companyId: string;
  erpSystem: string;
  erpVersion?: string;
  apiEndpoint?: string;
  authMethod?: string;
  status: string;
  lastSync?: string;
  lastError?: string;
  canReadPOs: number;
  canCreatePOs: number;
  canUpdatePOs: number;
  canReadInventory: number;
  createdAt: string;
}

const ERP_LOGOS: Record<string, { icon: any; color: string; bgColor: string }> = {
  "SAP": { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  "Oracle NetSuite": { icon: Database, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  "Microsoft Dynamics 365": { icon: Package, color: "text-signal", bgColor: "bg-signal/15 dark:bg-signal/15" },
  "Sage": { icon: Settings, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  "Infor": { icon: Zap, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
};

const WIZARD_STEPS = [
  { id: 1, title: "Choose ERP", description: "Select your ERP system", icon: Database },
  { id: 2, title: "Connect", description: "Enter your credentials", icon: Key },
  { id: 3, title: "Configure", description: "Select modules & sync options", icon: Settings },
  { id: 4, title: "Test", description: "Verify connection works", icon: TestTube },
  { id: 5, title: "Complete", description: "Start syncing", icon: Sparkles },
];

interface WizardState {
  step: number;
  selectedTemplate: ErpTemplate | null;
  connectionName: string;
  apiEndpoint: string;
  authMethod: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  selectedModules: string[];
  syncFrequency: string;
  dataFlowDirection: string;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  testMessage: string;
}

function WizardStepIndicator({ currentStep, steps }: { currentStep: number; steps: typeof WIZARD_STEPS }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    isCompleted ? 'bg-green-600' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step1SelectERP({ 
  templates, 
  selectedTemplate, 
  onSelect 
}: { 
  templates: ErpTemplate[];
  selectedTemplate: ErpTemplate | null;
  onSelect: (template: ErpTemplate) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Which ERP system do you use?</h2>
        <p className="text-muted-foreground mt-1">Select your ERP to get started with the integration</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.filter(t => t.isActive).map((template) => {
          const erpConfig = ERP_LOGOS[template.erpName] || { icon: Database, color: "text-gray-600", bgColor: "bg-gray-100" };
          const Icon = erpConfig.icon;
          const isSelected = selectedTemplate?.id === template.id;
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover-elevate'
              }`}
              onClick={() => onSelect(template)}
              data-testid={`select-erp-${template.erpName.toLowerCase().replace(/\s/g, '-')}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-lg ${erpConfig.bgColor} flex items-center justify-center ${erpConfig.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{template.displayName || template.erpName}</h3>
                      {template.isPopular && (
                        <Badge variant="secondary" className="text-xs">Popular</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{template.erpVersion || 'All versions'}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-3">{template.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {templates.filter(t => !t.isActive).length > 0 && (
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            More integrations coming soon: {templates.filter(t => !t.isActive).map(t => t.erpName).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

function Step2Connect({ 
  state, 
  updateState 
}: { 
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}) {
  const template = state.selectedTemplate;
  if (!template) return null;
  
  const erpConfig = ERP_LOGOS[template.erpName] || { icon: Database, color: "text-gray-600", bgColor: "bg-gray-100" };
  const Icon = erpConfig.icon;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`h-16 w-16 rounded-xl ${erpConfig.bgColor} flex items-center justify-center ${erpConfig.color} mx-auto mb-4`}>
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Connect to {template.erpName}</h2>
        <p className="text-muted-foreground mt-1">Enter your connection details below</p>
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="connectionName">Connection Name</Label>
            <Input
              id="connectionName"
              placeholder={`My ${template.erpName} Connection`}
              value={state.connectionName}
              onChange={(e) => updateState({ connectionName: e.target.value })}
              data-testid="input-connection-name"
            />
            <p className="text-xs text-muted-foreground">A friendly name to identify this connection</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint URL</Label>
            <Input
              id="apiEndpoint"
              placeholder={template.sampleConfig?.endpointExample || "https://your-instance.erp.com/api"}
              value={state.apiEndpoint}
              onChange={(e) => updateState({ apiEndpoint: e.target.value })}
              data-testid="input-api-endpoint"
            />
            <p className="text-xs text-muted-foreground">Your {template.erpName} API endpoint</p>
          </div>
          
          <div className="space-y-2">
            <Label>Authentication Method</Label>
            <Select 
              value={state.authMethod || template.authMethod} 
              onValueChange={(value) => updateState({ authMethod: value })}
            >
              <SelectTrigger data-testid="select-auth-method">
                <SelectValue placeholder="Select authentication method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="basic">Username & Password</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(state.authMethod || template.authMethod) === 'api_key' && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={state.apiKey}
                onChange={(e) => updateState({ apiKey: e.target.value })}
                data-testid="input-api-key"
              />
            </div>
          )}
          
          {(state.authMethod || template.authMethod) === 'oauth2' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="Enter your OAuth Client ID"
                  value={state.clientId}
                  onChange={(e) => updateState({ clientId: e.target.value })}
                  data-testid="input-client-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Enter your OAuth Client Secret"
                  value={state.clientSecret}
                  onChange={(e) => updateState({ clientSecret: e.target.value })}
                  data-testid="input-client-secret"
                />
              </div>
            </>
          )}
          
          {(state.authMethod || template.authMethod) === 'basic' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={state.username}
                  onChange={(e) => updateState({ username: e.target.value })}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={state.password}
                  onChange={(e) => updateState({ password: e.target.value })}
                  data-testid="input-password"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {template.apiDocumentationUrl && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Need help finding your credentials?</AlertTitle>
          <AlertDescription>
            <a 
              href={template.apiDocumentationUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              View {template.erpName} API documentation <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Step3Configure({ 
  state, 
  updateState 
}: { 
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}) {
  const template = state.selectedTemplate;
  if (!template) return null;
  
  const allModules = template.supportedModules || ['inventory', 'procurement', 'sales', 'production'];
  
  const toggleModule = (module: string) => {
    const current = state.selectedModules;
    if (current.includes(module)) {
      updateState({ selectedModules: current.filter(m => m !== module) });
    } else {
      updateState({ selectedModules: [...current, module] });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Configure Your Integration</h2>
        <p className="text-muted-foreground mt-1">Choose what data to sync and how often</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Select Modules to Sync
          </CardTitle>
          <CardDescription>Choose which data modules you want to integrate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allModules.map((module) => (
            <div 
              key={module}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                state.selectedModules.includes(module) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => toggleModule(module)}
              data-testid={`toggle-module-${module}`}
            >
              <Checkbox 
                checked={state.selectedModules.includes(module)}
                onCheckedChange={() => toggleModule(module)}
              />
              <div className="flex-1">
                <p className="font-medium capitalize">{module}</p>
                <p className="text-xs text-muted-foreground">
                  {module === 'inventory' && 'Sync inventory levels and stock data'}
                  {module === 'procurement' && 'Create and manage purchase orders'}
                  {module === 'sales' && 'Sync sales orders and customer data'}
                  {module === 'production' && 'Sync production schedules and work orders'}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sync Frequency</Label>
            <Select 
              value={state.syncFrequency} 
              onValueChange={(value) => updateState({ syncFrequency: value })}
            >
              <SelectTrigger data-testid="select-sync-frequency">
                <SelectValue placeholder="Select sync frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time (as changes occur)</SelectItem>
                <SelectItem value="15min">Every 15 minutes</SelectItem>
                <SelectItem value="hourly">Every hour</SelectItem>
                <SelectItem value="daily">Once daily</SelectItem>
                <SelectItem value="manual">Manual only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Data Flow Direction</Label>
            <Select 
              value={state.dataFlowDirection || template.dataFlowDirection} 
              onValueChange={(value) => updateState({ dataFlowDirection: value })}
            >
              <SelectTrigger data-testid="select-data-flow">
                <SelectValue placeholder="Select data flow direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="import">Import from ERP only</SelectItem>
                <SelectItem value="export">Export to ERP only</SelectItem>
                <SelectItem value="bidirectional">Bidirectional sync</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {state.dataFlowDirection === 'bidirectional' 
                ? 'Data flows both ways between systems' 
                : state.dataFlowDirection === 'import'
                  ? 'Data is imported from your ERP into this system'
                  : 'Data is exported from this system to your ERP'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step4Test({ 
  state, 
  updateState,
  onTest
}: { 
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onTest: () => void;
}) {
  const template = state.selectedTemplate;
  if (!template) return null;
  
  const erpConfig = ERP_LOGOS[template.erpName] || { icon: Database, color: "text-gray-600", bgColor: "bg-gray-100" };
  const Icon = erpConfig.icon;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Test Your Connection</h2>
        <p className="text-muted-foreground mt-1">Let's verify everything is working correctly</p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center py-8">
            <div className={`h-20 w-20 rounded-2xl ${erpConfig.bgColor} flex items-center justify-center ${erpConfig.color} mb-6`}>
              <Icon className="h-10 w-10" />
            </div>
            
            {state.testStatus === 'idle' && (
              <>
                <h3 className="font-semibold text-lg mb-2">Ready to Test</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Click the button below to verify your {template.erpName} connection
                </p>
                <Button size="lg" onClick={onTest} data-testid="button-test-connection">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </>
            )}
            
            {state.testStatus === 'testing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">Testing Connection...</h3>
                <p className="text-muted-foreground text-center">
                  Connecting to your {template.erpName} instance
                </p>
              </>
            )}
            
            {state.testStatus === 'success' && (
              <>
                <div className="h-16 w-16 rounded-full bg-good/15 dark:bg-good/15 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-good" />
                </div>
                <h3 className="font-semibold text-lg text-good mb-2">Connection Successful!</h3>
                <p className="text-muted-foreground text-center mb-2">
                  {state.testMessage || `Successfully connected to your ${template.erpName} instance`}
                </p>
                <Button variant="outline" onClick={onTest} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Again
                </Button>
              </>
            )}
            
            {state.testStatus === 'error' && (
              <>
                <div className="h-16 w-16 rounded-full bg-bad/15 dark:bg-bad/15 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-bad" />
                </div>
                <h3 className="font-semibold text-lg text-bad mb-2">Connection Failed</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {state.testMessage || 'Unable to connect. Please check your credentials and try again.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => updateState({ step: 2 })}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Edit Credentials
                  </Button>
                  <Button onClick={onTest}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Connection Name</span>
            <span className="font-medium">{state.connectionName || 'Not specified'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">API Endpoint</span>
            <span className="font-medium text-sm">{state.apiEndpoint || 'Not specified'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Authentication</span>
            <span className="font-medium capitalize">{state.authMethod?.replace('_', ' ') || template.authMethod}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Modules</span>
            <span className="font-medium">{state.selectedModules.length} selected</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Sync Frequency</span>
            <span className="font-medium capitalize">{state.syncFrequency?.replace(/(\d+)/, ' $1 ') || 'Not set'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step5Complete({ 
  state,
  onFinish
}: { 
  state: WizardState;
  onFinish: () => void;
}) {
  const template = state.selectedTemplate;
  if (!template) return null;
  
  const erpConfig = ERP_LOGOS[template.erpName] || { icon: Database, color: "text-gray-600", bgColor: "bg-gray-100" };
  const Icon = erpConfig.icon;
  
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="relative inline-block mb-6">
          <div className={`h-20 w-20 rounded-2xl ${erpConfig.bgColor} flex items-center justify-center ${erpConfig.color}`}>
            <Icon className="h-10 w-10" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">
          Your {template.erpName} integration is ready to go
        </p>
      </div>
      
      <Card className="border-good/30 dark:border-good/30 bg-good/15/50 dark:bg-good/15">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-good/15 dark:bg-good/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-good" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">What happens next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-good" />
                  Initial data sync will start automatically
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-good" />
                  {state.selectedModules.length} modules will be synced ({state.selectedModules.join(', ')})
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-good" />
                  Data will sync {state.syncFrequency === 'realtime' ? 'in real-time' : state.syncFrequency === 'manual' ? 'when you trigger it' : `every ${state.syncFrequency}`}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button size="lg" onClick={onFinish} data-testid="button-finish-setup">
          <Play className="h-4 w-4 mr-2" />
          Finish & Start Syncing
        </Button>
      </div>
    </div>
  );
}

function IntegrationWizard({ 
  templates,
  isOpen, 
  onClose,
  onSuccess
}: { 
  templates: ErpTemplate[];
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  
  const [state, setState] = useState<WizardState>({
    step: 1,
    selectedTemplate: null,
    connectionName: '',
    apiEndpoint: '',
    authMethod: '',
    apiKey: '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    selectedModules: [],
    syncFrequency: 'hourly',
    dataFlowDirection: 'bidirectional',
    testStatus: 'idle',
    testMessage: '',
  });
  
  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  const createConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/erp-connections', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/erp-connections'] });
      toast({
        title: "Success!",
        description: "Your ERP integration has been set up successfully.",
      });
      onSuccess();
      onClose();
      resetWizard();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create connection. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const resetWizard = () => {
    setState({
      step: 1,
      selectedTemplate: null,
      connectionName: '',
      apiEndpoint: '',
      authMethod: '',
      apiKey: '',
      clientId: '',
      clientSecret: '',
      username: '',
      password: '',
      selectedModules: [],
      syncFrequency: 'hourly',
      dataFlowDirection: 'bidirectional',
      testStatus: 'idle',
      testMessage: '',
    });
  };
  
  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.selectedTemplate !== null;
      case 2:
        const hasCredentials = state.authMethod === 'api_key' 
          ? state.apiKey.length > 0
          : state.authMethod === 'oauth2'
            ? state.clientId.length > 0 && state.clientSecret.length > 0
            : state.username.length > 0 && state.password.length > 0;
        return state.connectionName.length > 0 && state.apiEndpoint.length > 0 && hasCredentials;
      case 3:
        return state.selectedModules.length > 0 && state.syncFrequency.length > 0;
      case 4:
        return state.testStatus === 'success';
      default:
        return true;
    }
  };
  
  const handleTest = async () => {
    updateState({ testStatus: 'testing' });
    
    try {
      const testData = {
        erpSystem: state.selectedTemplate?.erpName,
        apiEndpoint: state.apiEndpoint,
        authMethod: state.authMethod || state.selectedTemplate?.authMethod,
        credentials: {
          apiKey: state.apiKey,
          clientId: state.clientId,
          clientSecret: state.clientSecret,
          username: state.username,
          password: state.password,
        }
      };
      
      const response = await apiRequest('POST', '/api/erp-connections/test', testData);
      const result = await response.json();
      
      if (result.success) {
        updateState({ 
          testStatus: 'success',
          testMessage: `Connected to ${state.selectedTemplate?.erpName}. Found ${result.discovery?.products || 0} products and ${result.discovery?.orders || 0} open orders.`
        });
      } else {
        updateState({ 
          testStatus: 'error',
          testMessage: result.error || 'Connection test failed. Please check your credentials.'
        });
      }
    } catch (error: any) {
      updateState({ 
        testStatus: 'error',
        testMessage: error.message || 'Connection test failed. Please check your credentials.'
      });
    }
  };
  
  const handleFinish = () => {
    const connectionData = {
      erpSystem: state.selectedTemplate?.erpName.toLowerCase().replace(/\s/g, '_') || 'unknown',
      erpVersion: state.selectedTemplate?.erpVersion,
      apiEndpoint: state.apiEndpoint,
      authMethod: state.authMethod || state.selectedTemplate?.authMethod,
      credentialsEncrypted: JSON.stringify({
        apiKey: state.apiKey,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        username: state.username,
        password: state.password,
      }),
      canReadPOs: state.selectedModules.includes('procurement') ? 1 : 0,
      canCreatePOs: state.selectedModules.includes('procurement') ? 1 : 0,
      canUpdatePOs: state.selectedModules.includes('procurement') ? 1 : 0,
      canReadInventory: state.selectedModules.includes('inventory') ? 1 : 0,
      status: 'active',
    };
    
    createConnectionMutation.mutate(connectionData);
  };
  
  const handleSelectTemplate = (template: ErpTemplate) => {
    updateState({ 
      selectedTemplate: template,
      authMethod: template.authMethod,
      selectedModules: template.supportedModules || [],
      dataFlowDirection: template.dataFlowDirection,
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); resetWizard(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            ERP Integration Setup
          </DialogTitle>
          <DialogDescription>
            Connect your ERP system in just a few steps
          </DialogDescription>
        </DialogHeader>
        
        <WizardStepIndicator currentStep={state.step} steps={WIZARD_STEPS} />
        
        <div className="py-4">
          {state.step === 1 && (
            <Step1SelectERP 
              templates={templates}
              selectedTemplate={state.selectedTemplate}
              onSelect={handleSelectTemplate}
            />
          )}
          
          {state.step === 2 && (
            <Step2Connect state={state} updateState={updateState} />
          )}
          
          {state.step === 3 && (
            <Step3Configure state={state} updateState={updateState} />
          )}
          
          {state.step === 4 && (
            <Step4Test state={state} updateState={updateState} onTest={handleTest} />
          )}
          
          {state.step === 5 && (
            <Step5Complete state={state} onFinish={handleFinish} />
          )}
        </div>
        
        <DialogFooter className="flex justify-between gap-2">
          <div>
            {state.step > 1 && state.step < 5 && (
              <Button 
                variant="outline" 
                onClick={() => updateState({ step: state.step - 1 })}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { onClose(); resetWizard(); }}>
              Cancel
            </Button>
            {state.step < 5 && (
              <Button 
                onClick={() => updateState({ step: state.step + 1 })}
                disabled={!canProceed()}
                data-testid="button-wizard-next"
              >
                {state.step === 4 ? 'Continue' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectionCard({ connection, onDelete }: { connection: ErpConnection; onDelete: (id: string) => void }) {
  const statusConfig: Record<string, { color: string; icon: any }> = {
    active: { color: "bg-green-600", icon: CheckCircle2 },
    inactive: { color: "bg-gray-500", icon: Circle },
    error: { color: "bg-red-600", icon: XCircle },
  };
  
  const config = statusConfig[connection.status] || statusConfig.inactive;
  const StatusIcon = config.icon;
  
  return (
    <Card data-testid={`card-connection-${connection.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Link2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium capitalize">{connection.erpSystem?.replace('_', ' ')}</p>
              <p className="text-sm text-muted-foreground">{connection.apiEndpoint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${config.color} gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {connection.status}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onDelete(connection.id)}
              data-testid={`button-delete-connection-${connection.id}`}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        {connection.lastSync && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last synced: {new Date(connection.lastSync).toLocaleString()}
          </div>
        )}
        {connection.lastError && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{connection.lastError}</AlertDescription>
          </Alert>
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
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-12 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ErpTemplates() {
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const { data: templates, isLoading: templatesLoading } = useQuery<ErpTemplate[]>({
    queryKey: ["/api/erp/templates"],
  });
  
  const { data: connections, refetch: refetchConnections } = useQuery<ErpConnection[]>({
    queryKey: ["/api/erp-connections"],
  });
  
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/erp-connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/erp-connections'] });
      toast({
        title: "Connection removed",
        description: "The ERP connection has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete connection.",
        variant: "destructive",
      });
    }
  });
  
  if (templatesLoading) {
    return <LoadingSkeleton />;
  }
  
  const activeConnections = connections?.filter(c => c.status === 'active') || [];
  const hasConnections = connections && connections.length > 0;
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-erp-integration">
            ERP Integration
          </h1>
          <p className="text-muted-foreground">
            Connect your ERP system to automate data synchronization
          </p>
        </div>
        <Button size="lg" onClick={() => setWizardOpen(true)} data-testid="button-add-erp">
          <Plug className="h-4 w-4 mr-2" />
          Add ERP Connection
        </Button>
      </div>
      
      {!hasConnections && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No ERP Connections Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your ERP system to automatically sync inventory, purchase orders, and more. Setup takes just a few minutes.
            </p>
            <Button size="lg" onClick={() => setWizardOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Started
            </Button>
            
            <div className="mt-8 pt-8 border-t">
              <p className="text-sm text-muted-foreground mb-4">Supported ERP Systems</p>
              <div className="flex justify-center gap-6">
                {Object.entries(ERP_LOGOS).map(([name, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={name} className="flex flex-col items-center gap-2">
                      <div className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-muted-foreground">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {hasConnections && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Connections</h2>
            <Badge variant="secondary">
              {activeConnections.length} active
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections?.map((connection) => (
              <ConnectionCard 
                key={connection.id} 
                connection={connection}
                onDelete={(id) => deleteConnectionMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {hasConnections && templates && templates.filter(t => t.isActive).length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h2 className="text-lg font-semibold">Add Another ERP</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.filter(t => t.isActive).map((template) => {
              const erpConfig = ERP_LOGOS[template.erpName] || { icon: Database, color: "text-gray-600", bgColor: "bg-gray-100" };
              const Icon = erpConfig.icon;
              
              return (
                <Card 
                  key={template.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setWizardOpen(true)}
                  data-testid={`card-erp-${template.erpName.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${erpConfig.bgColor} flex items-center justify-center ${erpConfig.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{template.displayName}</p>
                        <p className="text-sm text-muted-foreground">{template.erpVersion || 'All versions'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      <IntegrationWizard 
        templates={templates || []}
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => refetchConnections()}
      />
    </div>
  );
}
