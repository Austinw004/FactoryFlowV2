import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CSVImportExportDialog } from "@/components/CSVImportExportDialog";
import { SlackConfigDialog } from "@/components/SlackConfigDialog";
import { TwilioConfigDialog } from "@/components/TwilioConfigDialog";
import { HubSpotConfigDialog } from "@/components/HubSpotConfigDialog";
import { EmailConfigDialog } from "@/components/EmailConfigDialog";
import { ZapierWebhookDialog } from "@/components/ZapierWebhookDialog";
import { PowerBIConnectorDialog } from "@/components/PowerBIConnectorDialog";
import { GoogleSheetsDialog } from "@/components/GoogleSheetsDialog";
import {
  Building2,
  MessageSquare,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Radio,
  BarChart3,
  DollarSign,
  Cloud,
  CloudRain,
  Warehouse,
  FileText,
  Settings,
  CheckCircle,
  ExternalLink,
  Search,
  Zap,
  Shield,
  Users,
  Package,
  Globe,
  Bell,
  Mail,
  Phone,
  Database,
  Link2,
  ArrowRight,
  Star,
  TrendingUp,
  Factory,
  Boxes,
  CalendarCheck,
  FileCheck,
  Send,
  Clock,
} from "lucide-react";
import { SiSalesforce, SiHubspot, SiShopify, SiQuickbooks, SiSlack, SiGooglesheets, SiZapier, SiSap, SiOracle } from "react-icons/si";

type IntegrationStatus = "connected" | "available" | "coming_soon";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  icon: typeof Building2 | typeof SiSalesforce;
  iconType: "lucide" | "si";
  valueProposition: string;
  features: string[];
  setupTime?: string;
  popular?: boolean;
}

const integrations: Integration[] = [
  // CRM & Sales
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync sales pipeline data to improve demand forecasting",
    category: "crm",
    status: "available",
    icon: SiHubspot,
    iconType: "si",
    valueProposition: "Convert sales opportunities into demand signals",
    features: ["Deal pipeline sync", "Contact & company data", "Sales forecasts", "Lead scoring integration"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM integration for demand planning",
    category: "crm",
    status: "coming_soon",
    icon: SiSalesforce,
    iconType: "si",
    valueProposition: "Leverage opportunity data for accurate demand forecasting",
    features: ["Opportunity pipeline", "Account hierarchies", "Custom objects", "Real-time sync"],
    setupTime: "10 minutes",
    popular: true,
  },
  
  // Communication & Alerts
  {
    id: "email-notifications",
    name: "Email Notifications",
    description: "Receive platform notifications and alerts via email",
    category: "communication",
    status: "available",
    icon: Mail,
    iconType: "lucide",
    valueProposition: "Stay informed with automated email alerts",
    features: ["Meeting invitations", "Critical alerts", "Weekly summaries", "Regime change notifications"],
    setupTime: "2 minutes",
    popular: true,
  },
  {
    id: "twilio",
    name: "Twilio SMS",
    description: "Send critical alerts via SMS to key stakeholders",
    category: "communication",
    status: "available",
    icon: Phone,
    iconType: "lucide",
    valueProposition: "Never miss critical supply chain alerts",
    features: ["Regime change alerts", "Stockout warnings", "Supplier risk notifications", "Price movement alerts"],
    setupTime: "3 minutes",
    popular: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Real-time notifications in your team channels",
    category: "communication",
    status: "available",
    icon: SiSlack,
    iconType: "si",
    valueProposition: "Keep your entire team informed instantly",
    features: ["Channel notifications", "Interactive alerts", "Action buttons", "Threaded discussions"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Enterprise collaboration and alerting",
    category: "communication",
    status: "coming_soon",
    icon: MessageSquare,
    iconType: "lucide",
    valueProposition: "Integrate with your existing Microsoft ecosystem",
    features: ["Teams channels", "Adaptive cards", "Meeting scheduling", "Tab integration"],
    setupTime: "5 minutes",
  },
  
  // Data Import/Export
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Export data as CSV for spreadsheet import",
    category: "data",
    status: "available",
    icon: SiGooglesheets,
    iconType: "si",
    valueProposition: "Easy data export for spreadsheet analysis",
    features: ["Materials export", "Inventory export", "Forecasts export", "Suppliers export"],
    setupTime: "1 minute",
    popular: true,
  },
  {
    id: "csv-import",
    name: "CSV Import",
    description: "Bulk upload data from CSV spreadsheets",
    category: "data",
    status: "connected",
    icon: FileSpreadsheet,
    iconType: "lucide",
    valueProposition: "Quick data migration from existing systems",
    features: ["Drag-and-drop upload", "Data preview", "Validation", "Error handling"],
  },
  {
    id: "api-access",
    name: "REST API",
    description: "Full API access for custom integrations",
    category: "data",
    status: "connected",
    icon: Link2,
    iconType: "lucide",
    valueProposition: "Build custom workflows and automations",
    features: ["Full CRUD operations", "Webhook subscriptions", "Rate limiting", "OAuth 2.0"],
  },
  
  // E-commerce & Demand Signals
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync orders and inventory for D2C manufacturers",
    category: "ecommerce",
    status: "coming_soon",
    icon: SiShopify,
    iconType: "si",
    valueProposition: "Real-time demand signals from e-commerce orders",
    features: ["Order sync", "Inventory levels", "Product catalog", "Multi-location"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    description: "Marketplace demand intelligence",
    category: "ecommerce",
    status: "coming_soon",
    icon: ShoppingCart,
    iconType: "lucide",
    valueProposition: "Forecast demand from marketplace sales",
    features: ["Sales data sync", "Inventory planning", "Buy Box analytics", "FBA integration"],
    setupTime: "10 minutes",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "WordPress e-commerce integration",
    category: "ecommerce",
    status: "coming_soon",
    icon: ShoppingCart,
    iconType: "lucide",
    valueProposition: "Connect your WordPress store for demand signals",
    features: ["Order history", "Product sync", "Customer data", "Inventory sync"],
    setupTime: "5 minutes",
  },
  
  // ERP Systems
  {
    id: "sap",
    name: "SAP S/4HANA",
    description: "Enterprise ERP integration",
    category: "erp",
    status: "coming_soon",
    icon: SiSap,
    iconType: "si",
    valueProposition: "Seamless bi-directional sync with SAP",
    features: ["Material master sync", "Purchase orders", "Inventory levels", "Production orders"],
    setupTime: "1-2 weeks",
    popular: true,
  },
  {
    id: "oracle",
    name: "Oracle NetSuite",
    description: "Cloud ERP integration",
    category: "erp",
    status: "coming_soon",
    icon: SiOracle,
    iconType: "si",
    valueProposition: "Complete visibility across your NetSuite data",
    features: ["Item records", "Sales orders", "Vendor management", "Financial data"],
    setupTime: "3-5 days",
  },
  {
    id: "dynamics",
    name: "Microsoft Dynamics 365",
    description: "Microsoft ERP and CRM platform",
    category: "erp",
    status: "coming_soon",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Unified Microsoft ecosystem integration",
    features: ["Supply chain modules", "Finance sync", "Sales orders", "Inventory management"],
    setupTime: "3-5 days",
  },
  {
    id: "sage",
    name: "Sage X3",
    description: "Mid-market ERP solution",
    category: "erp",
    status: "coming_soon",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Connect Sage for comprehensive operations visibility",
    features: ["Inventory sync", "Purchase orders", "Supplier data", "Production planning"],
    setupTime: "3-5 days",
  },
  {
    id: "infor",
    name: "Infor CloudSuite",
    description: "Industry-specific ERP",
    category: "erp",
    status: "coming_soon",
    icon: Cloud,
    iconType: "lucide",
    valueProposition: "Industry-specific manufacturing intelligence",
    features: ["Shop floor data", "Material requirements", "Supplier portal", "Quality management"],
    setupTime: "1-2 weeks",
  },
  
  // Logistics & Shipping
  {
    id: "fedex",
    name: "FedEx",
    description: "Track shipments and delivery status",
    category: "logistics",
    status: "coming_soon",
    icon: Truck,
    iconType: "lucide",
    valueProposition: "Real-time shipment visibility for inbound materials",
    features: ["Shipment tracking", "Delivery estimates", "Exception alerts", "Proof of delivery"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "ups",
    name: "UPS",
    description: "Package and freight tracking",
    category: "logistics",
    status: "coming_soon",
    icon: Truck,
    iconType: "lucide",
    valueProposition: "Proactive logistics intelligence",
    features: ["Multi-modal tracking", "Customs status", "Delivery windows", "Delay predictions"],
    setupTime: "5 minutes",
  },
  {
    id: "flexport",
    name: "Flexport",
    description: "Global freight visibility",
    category: "logistics",
    status: "coming_soon",
    icon: Globe,
    iconType: "lucide",
    valueProposition: "End-to-end supply chain visibility",
    features: ["Ocean freight", "Air cargo", "Trucking", "Customs clearance"],
    setupTime: "10 minutes",
  },
  {
    id: "project44",
    name: "project44",
    description: "Advanced visibility platform",
    category: "logistics",
    status: "coming_soon",
    icon: Truck,
    iconType: "lucide",
    valueProposition: "Predictive ETA and risk management",
    features: ["Multi-carrier tracking", "Predictive ETAs", "Exception management", "Analytics"],
    setupTime: "10 minutes",
  },
  
  // IoT & Machine Data
  {
    id: "opcua",
    name: "OPC-UA",
    description: "Industrial machine connectivity",
    category: "iot",
    status: "coming_soon",
    icon: Radio,
    iconType: "lucide",
    valueProposition: "Real-time machine data for OEE optimization",
    features: ["PLC connectivity", "Sensor data", "Production counts", "Downtime tracking"],
    setupTime: "1-2 hours",
  },
  {
    id: "mqtt",
    name: "MQTT Broker",
    description: "IoT messaging protocol",
    category: "iot",
    status: "coming_soon",
    icon: Radio,
    iconType: "lucide",
    valueProposition: "Lightweight IoT data streaming",
    features: ["Sensor streams", "Edge devices", "Real-time alerts", "Data buffering"],
    setupTime: "30 minutes",
  },
  {
    id: "kepware",
    name: "Kepware KEPServerEX",
    description: "Industrial connectivity platform",
    category: "iot",
    status: "coming_soon",
    icon: Factory,
    iconType: "lucide",
    valueProposition: "Universal industrial protocol translation",
    features: ["300+ drivers", "OPC connectivity", "Cloud gateway", "Historian integration"],
    setupTime: "1-2 hours",
  },
  
  // BI & Analytics
  {
    id: "powerbi",
    name: "Power BI",
    description: "Connect Power BI to our Data Export API",
    category: "analytics",
    status: "available",
    icon: BarChart3,
    iconType: "lucide",
    valueProposition: "Enhanced analytics and executive dashboards",
    features: ["REST API connection", "JSON/CSV data feeds", "Multiple datasets", "Scheduled refresh"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "tableau",
    name: "Tableau",
    description: "Connect Tableau to our Data Export API",
    category: "analytics",
    status: "available",
    icon: BarChart3,
    iconType: "lucide",
    valueProposition: "Advanced visualization and analysis",
    features: ["Web Data Connector", "JSON data feeds", "Multiple datasets", "Live refresh"],
    setupTime: "10 minutes",
  },
  {
    id: "looker",
    name: "Looker",
    description: "Google Cloud BI platform",
    category: "analytics",
    status: "coming_soon",
    icon: BarChart3,
    iconType: "lucide",
    valueProposition: "Semantic layer for consistent metrics",
    features: ["LookML modeling", "Embedded analytics", "API access", "Data actions"],
    setupTime: "20 minutes",
  },
  
  // Accounting & Finance
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Small business accounting",
    category: "finance",
    status: "coming_soon",
    icon: SiQuickbooks,
    iconType: "si",
    valueProposition: "Financial visibility for procurement optimization",
    features: ["Invoice sync", "Payment terms", "Cash flow data", "Vendor payments"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "xero",
    name: "Xero",
    description: "Cloud accounting platform",
    category: "finance",
    status: "coming_soon",
    icon: DollarSign,
    iconType: "lucide",
    valueProposition: "Streamlined financial operations",
    features: ["Bill management", "Bank feeds", "Invoice tracking", "Reporting"],
    setupTime: "10 minutes",
  },
  {
    id: "netsuite-finance",
    name: "NetSuite Financials",
    description: "Enterprise financial management",
    category: "finance",
    status: "coming_soon",
    icon: DollarSign,
    iconType: "lucide",
    valueProposition: "Complete financial integration for cost analysis",
    features: ["GL transactions", "AP/AR sync", "Budget data", "Cost centers"],
  },
  
  // Procurement & Sourcing
  {
    id: "ariba",
    name: "SAP Ariba",
    description: "Procurement network",
    category: "procurement",
    status: "coming_soon",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Connect with your supplier network",
    features: ["Supplier discovery", "RFQ management", "Contract compliance", "Invoice matching"],
    setupTime: "1-2 weeks",
  },
  {
    id: "coupa",
    name: "Coupa",
    description: "Spend management platform",
    category: "procurement",
    status: "coming_soon",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Unified spend visibility",
    features: ["Procurement", "Invoicing", "Expenses", "Supplier management"],
    setupTime: "3-5 days",
  },
  {
    id: "jaggaer",
    name: "Jaggaer",
    description: "Source-to-pay platform",
    category: "procurement",
    status: "coming_soon",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "End-to-end procurement automation",
    features: ["Sourcing", "Contracts", "Supplier risk", "Spend analytics"],
    setupTime: "3-5 days",
  },
  
  // Warehouse & Inventory
  {
    id: "manhattan",
    name: "Manhattan WMS",
    description: "Warehouse management system",
    category: "warehouse",
    status: "coming_soon",
    icon: Warehouse,
    iconType: "lucide",
    valueProposition: "Real-time warehouse visibility",
    features: ["Inventory levels", "Pick/pack status", "Receiving", "Cycle counts"],
    setupTime: "1-2 weeks",
  },
  {
    id: "sap-ewm",
    name: "SAP EWM",
    description: "Extended warehouse management",
    category: "warehouse",
    status: "coming_soon",
    icon: Warehouse,
    iconType: "lucide",
    valueProposition: "Advanced warehouse operations integration",
    features: ["Slotting", "Labor management", "Yard management", "Cross-docking"],
    setupTime: "1-2 weeks",
  },
  {
    id: "fishbowl",
    name: "Fishbowl",
    description: "SMB inventory management",
    category: "warehouse",
    status: "coming_soon",
    icon: Boxes,
    iconType: "lucide",
    valueProposition: "Affordable inventory visibility",
    features: ["Multi-location", "Barcode scanning", "Reorder points", "Lot tracking"],
    setupTime: "1 day",
  },
  
  // Quality Management
  {
    id: "etq",
    name: "ETQ Reliance",
    description: "Quality management system",
    category: "quality",
    status: "coming_soon",
    icon: FileCheck,
    iconType: "lucide",
    valueProposition: "Quality data for supplier scoring",
    features: ["CAPA tracking", "Audit management", "Supplier quality", "Document control"],
    setupTime: "3-5 days",
  },
  {
    id: "mastercontrol",
    name: "MasterControl",
    description: "Life sciences QMS",
    category: "quality",
    status: "coming_soon",
    icon: Shield,
    iconType: "lucide",
    valueProposition: "Regulated industry quality integration",
    features: ["Deviation management", "Training records", "Validation", "Electronic signatures"],
    setupTime: "1-2 weeks",
  },
  
  // Automation & Workflow
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect via webhooks for automation",
    category: "automation",
    status: "available",
    icon: SiZapier,
    iconType: "si",
    valueProposition: "Connect to 5,000+ apps without code",
    features: ["Inbound webhooks", "Outbound triggers", "Event subscriptions", "HMAC security"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Connect via webhooks for automation",
    category: "automation",
    status: "available",
    icon: Zap,
    iconType: "lucide",
    valueProposition: "Complex workflow automation",
    features: ["Inbound webhooks", "Outbound triggers", "Event subscriptions", "HMAC security"],
    setupTime: "10 minutes",
  },
  {
    id: "webhooks",
    name: "Custom Webhooks",
    description: "Real-time event notifications",
    category: "automation",
    status: "connected",
    icon: Bell,
    iconType: "lucide",
    valueProposition: "Push events to any system",
    features: ["Event subscriptions", "Custom payloads", "Retry logic", "Signature verification"],
  },
  
  // Document Management
  {
    id: "docusign",
    name: "DocuSign",
    description: "Electronic signature platform",
    category: "documents",
    status: "coming_soon",
    icon: FileText,
    iconType: "lucide",
    valueProposition: "Streamline contract and PO approvals",
    features: ["Contract signatures", "PO approvals", "Supplier agreements", "Audit trails"],
    setupTime: "10 minutes",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    description: "Document management and collaboration",
    category: "documents",
    status: "coming_soon",
    icon: FileText,
    iconType: "lucide",
    valueProposition: "Centralized document storage",
    features: ["File storage", "Version control", "Collaboration", "Permissions"],
    setupTime: "15 minutes",
  },
  
  // Weather & External Data
  {
    id: "weather",
    name: "Weather APIs",
    description: "Weather impact on logistics",
    category: "external",
    status: "connected",
    icon: CloudRain,
    iconType: "lucide",
    valueProposition: "Proactive logistics planning",
    features: ["Hurricane tracking", "Severe weather alerts", "Port impacts", "Transportation delays"],
  },
  {
    id: "news-monitoring",
    name: "News & Event Monitoring",
    description: "Real-time supply chain news",
    category: "external",
    status: "connected",
    icon: Globe,
    iconType: "lucide",
    valueProposition: "Early warning for supply chain disruptions",
    features: ["Geopolitical events", "Supplier news", "Trade disputes", "Regulatory changes"],
  },
  {
    id: "commodity-feeds",
    name: "Commodity Price Feeds",
    description: "Real-time commodity pricing",
    category: "external",
    status: "connected",
    icon: TrendingUp,
    iconType: "lucide",
    valueProposition: "Optimal procurement timing",
    features: ["110+ commodities", "Futures curves", "Price alerts", "Historical trends"],
  },
];

const categories = [
  { id: "all", name: "All Integrations", icon: Settings },
  { id: "erp", name: "ERP Systems", icon: Building2 },
  { id: "crm", name: "CRM & Sales", icon: Users },
  { id: "communication", name: "Communication", icon: MessageSquare },
  { id: "data", name: "Data Import/Export", icon: FileSpreadsheet },
  { id: "ecommerce", name: "E-commerce", icon: ShoppingCart },
  { id: "logistics", name: "Logistics", icon: Truck },
  { id: "iot", name: "IoT & Machines", icon: Radio },
  { id: "analytics", name: "BI & Analytics", icon: BarChart3 },
  { id: "finance", name: "Accounting", icon: DollarSign },
  { id: "procurement", name: "Procurement", icon: Package },
  { id: "warehouse", name: "Warehouse", icon: Warehouse },
  { id: "quality", name: "Quality", icon: Shield },
  { id: "automation", name: "Automation", icon: Zap },
  { id: "documents", name: "Documents", icon: FileText },
  { id: "external", name: "External Data", icon: Globe },
];

function getStatusBadge(status: IntegrationStatus) {
  switch (status) {
    case "connected":
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
    case "available":
      return <Badge variant="secondary"><Zap className="w-3 h-3 mr-1" /> Available</Badge>;
    case "coming_soon":
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Coming Soon</Badge>;
  }
}

export default function Integrations() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [slackDialogOpen, setSlackDialogOpen] = useState(false);
  const [twilioDialogOpen, setTwilioDialogOpen] = useState(false);
  const [hubspotDialogOpen, setHubspotDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [zapierDialogOpen, setZapierDialogOpen] = useState(false);
  const [powerbiDialogOpen, setPowerbiDialogOpen] = useState(false);
  const [googleSheetsDialogOpen, setGoogleSheetsDialogOpen] = useState(false);

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const popularIntegrations = integrations.filter(i => i.popular);
  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const availableCount = integrations.filter(i => i.status === "available").length;

  const handleConnect = (integration: Integration) => {
    if (integration.id === "slack") {
      setSlackDialogOpen(true);
    } else if (integration.id === "twilio") {
      setTwilioDialogOpen(true);
    } else if (integration.id === "hubspot") {
      setHubspotDialogOpen(true);
    } else if (integration.id === "email-notifications") {
      setEmailDialogOpen(true);
    } else if (integration.id === "zapier") {
      setZapierDialogOpen(true);
    } else if (integration.id === "google-sheets") {
      setGoogleSheetsDialogOpen(true);
    } else if (integration.id === "powerbi") {
      setPowerbiDialogOpen(true);
    } else if (integration.id === "tableau") {
      setPowerbiDialogOpen(true);
    } else if (integration.status === "available") {
      toast({
        title: "Integration Setup",
        description: `Starting ${integration.name} configuration. Please follow the setup wizard.`,
      });
    }
  };

  const handleSettings = (integration: Integration) => {
    if (integration.id === "csv-import") {
      setCsvDialogOpen(true);
    } else if (integration.id === "slack") {
      setSlackDialogOpen(true);
    } else if (integration.id === "api-access") {
      toast({ title: "API Documentation", description: "Opening API documentation..." });
    } else if (integration.id === "webhooks") {
      setZapierDialogOpen(true);
    } else if (integration.id === "weather" || integration.id === "news-monitoring" || integration.id === "commodity-feeds") {
      toast({ title: `${integration.name} Settings`, description: "External data feeds are automatically configured." });
    } else if (integration.id === "email-notifications") {
      setEmailDialogOpen(true);
    } else {
      toast({
        title: `${integration.name} Settings`,
        description: "Integration settings panel coming soon.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Integrations</h1>
          <p className="text-muted-foreground">
            Connect Prescient Labs with your existing systems for seamless data flow and enhanced intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-connected-count">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-available-count">{availableCount}</p>
                <p className="text-sm text-muted-foreground">Ready to Connect</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Database className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{integrations.length}</p>
                <p className="text-sm text-muted-foreground">Total Integrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Star className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{popularIntegrations.length}</p>
                <p className="text-sm text-muted-foreground">Most Popular</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Popular Integrations
            </CardTitle>
            <CardDescription>Most commonly used by manufacturing companies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularIntegrations.map(integration => {
                const IconComponent = integration.icon;
                return (
                  <Card key={integration.id} className="hover-elevate cursor-pointer" data-testid={`card-popular-${integration.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${integration.status === "connected" ? "bg-green-500/10" : integration.status === "coming_soon" ? "bg-muted" : "bg-primary/10"}`}>
                          <IconComponent className={`w-5 h-5 ${integration.status === "connected" ? "text-green-500" : integration.status === "coming_soon" ? "text-muted-foreground" : "text-primary"}`} />
                        </div>
                        {getStatusBadge(integration.status)}
                      </div>
                      <h3 className="font-semibold mb-1">{integration.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>
                      {integration.status === "available" && (
                        <Button size="sm" className="w-full" onClick={() => handleConnect(integration)} data-testid={`button-connect-popular-${integration.id}`}>
                          Connect <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {integration.status === "coming_soon" && (
                        <Button size="sm" variant="outline" className="w-full" disabled data-testid={`button-coming-soon-popular-${integration.id}`}>
                          Coming Soon
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 shrink-0">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 pb-4">
                  {categories.map(category => {
                    const IconComponent = category.icon;
                    const count = category.id === "all" 
                      ? integrations.length 
                      : integrations.filter(i => i.category === category.id).length;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                          selectedCategory === category.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-category-${category.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {category.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIntegrations.map(integration => {
                const IconComponent = integration.icon;
                return (
                  <Card key={integration.id} className="hover-elevate" data-testid={`card-integration-${integration.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${integration.status === "connected" ? "bg-green-500/10" : integration.status === "coming_soon" ? "bg-muted" : "bg-primary/10"}`}>
                            <IconComponent className={`w-5 h-5 ${integration.status === "connected" ? "text-green-500" : integration.status === "coming_soon" ? "text-muted-foreground" : "text-primary"}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{integration.name}</h3>
                            <p className="text-xs text-muted-foreground">{integration.category}</p>
                          </div>
                        </div>
                        {getStatusBadge(integration.status)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>
                      
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium text-primary mb-1">Value Proposition</p>
                        <p className="text-sm">{integration.valueProposition}</p>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Key Features</p>
                        <div className="flex flex-wrap gap-1">
                          {integration.features.slice(0, 4).map((feature, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{feature}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {integration.setupTime && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Setup: {integration.setupTime}
                          </p>
                        )}
                        <div className="ml-auto">
                          {integration.status === "connected" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleSettings(integration)}
                              data-testid={`button-settings-${integration.id}`}
                            >
                              <Settings className="w-4 h-4 mr-1" /> Settings
                            </Button>
                          )}
                          {integration.status === "available" && (
                            <Button size="sm" onClick={() => handleConnect(integration)} data-testid={`button-connect-${integration.id}`}>
                              Connect <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                          {integration.status === "coming_soon" && (
                            <Button size="sm" variant="outline" disabled data-testid={`button-coming-soon-${integration.id}`}>
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredIntegrations.length === 0 && (
              <Card className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No integrations found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search or category filter</p>
                <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                  Clear Filters
                </Button>
              </Card>
            )}
          </div>
        </div>

        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <Mail className="w-12 h-12 mx-auto text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Don't see what you need?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We're constantly adding new integrations. Let us know what systems you use and we'll prioritize accordingly.
            </p>
            <Button 
              size="lg" 
              onClick={() => toast({ title: "Request submitted", description: "Thank you! We'll review your integration request and get back to you." })}
              data-testid="button-request-integration"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Request an Integration
            </Button>
          </CardContent>
        </Card>
      </div>

      <CSVImportExportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} />
      <SlackConfigDialog open={slackDialogOpen} onOpenChange={setSlackDialogOpen} />
      <TwilioConfigDialog open={twilioDialogOpen} onOpenChange={setTwilioDialogOpen} />
      <HubSpotConfigDialog open={hubspotDialogOpen} onOpenChange={setHubspotDialogOpen} />
      <EmailConfigDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
      <ZapierWebhookDialog open={zapierDialogOpen} onOpenChange={setZapierDialogOpen} />
      <PowerBIConnectorDialog open={powerbiDialogOpen} onOpenChange={setPowerbiDialogOpen} />
      <GoogleSheetsDialog open={googleSheetsDialogOpen} onOpenChange={setGoogleSheetsDialogOpen} />
    </div>
  );
}
