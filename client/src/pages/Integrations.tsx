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
import { TeamsConfigDialog } from "@/components/TeamsConfigDialog";
import { LookerDialog } from "@/components/LookerDialog";
import { N8nDialog } from "@/components/N8nDialog";
import { ShopifyDialog } from "@/components/ShopifyDialog";
import { SalesforceConfigDialog } from "@/components/SalesforceConfigDialog";
import { JiraConfigDialog } from "@/components/JiraConfigDialog";
import { LinearConfigDialog } from "@/components/LinearConfigDialog";
import { NotionConfigDialog } from "@/components/NotionConfigDialog";
import { GoogleCalendarConfigDialog } from "@/components/GoogleCalendarConfigDialog";
import { QuickBooksConfigDialog } from "@/components/QuickBooksConfigDialog";
import { XeroConfigDialog } from "@/components/XeroConfigDialog";
import { DocuSignConfigDialog } from "@/components/DocuSignConfigDialog";
import { FedExConfigDialog } from "@/components/FedExConfigDialog";
import { UPSConfigDialog } from "@/components/UPSConfigDialog";
import { AmazonSellerConfigDialog } from "@/components/AmazonSellerConfigDialog";
import { WooCommerceConfigDialog } from "@/components/WooCommerceConfigDialog";
import { SharePointConfigDialog } from "@/components/SharePointConfigDialog";
import { FlexportConfigDialog } from "@/components/FlexportConfigDialog";
import { TableauConfigDialog } from "@/components/TableauConfigDialog";
import { SnowflakeConfigDialog } from "@/components/SnowflakeConfigDialog";
import { MondayConfigDialog } from "@/components/MondayConfigDialog";
import { AsanaConfigDialog } from "@/components/AsanaConfigDialog";
import { BigCommerceConfigDialog } from "@/components/BigCommerceConfigDialog";
import { StripeConfigDialog } from "@/components/StripeConfigDialog";
import { DHLConfigDialog } from "@/components/DHLConfigDialog";
import { BillComConfigDialog } from "@/components/BillComConfigDialog";
import { TrelloConfigDialog } from "@/components/TrelloConfigDialog";
import { ZendeskConfigDialog } from "@/components/ZendeskConfigDialog";
import { MailchimpConfigDialog } from "@/components/MailchimpConfigDialog";
import { SendGridConfigDialog } from "@/components/SendGridConfigDialog";
import { AirtableConfigDialog } from "@/components/AirtableConfigDialog";
import { AribaConfigDialog } from "@/components/AribaConfigDialog";
import { CoupaConfigDialog } from "@/components/CoupaConfigDialog";
import { ManhattanConfigDialog } from "@/components/ManhattanConfigDialog";
import { ETQConfigDialog } from "@/components/ETQConfigDialog";
import { NetSuiteConfigDialog } from "@/components/NetSuiteConfigDialog";
import { SPSCommerceConfigDialog } from "@/components/SPSCommerceConfigDialog";
import { TeamcenterConfigDialog } from "@/components/TeamcenterConfigDialog";
import { SAPConfigDialog } from "@/components/SAPConfigDialog";
import { DynamicsConfigDialog } from "@/components/DynamicsConfigDialog";
import { InforConfigDialog } from "@/components/InforConfigDialog";
import { Project44ConfigDialog } from "@/components/Project44ConfigDialog";
import { FishbowlConfigDialog } from "@/components/FishbowlConfigDialog";
import { SageX3ConfigDialog } from "@/components/SageX3ConfigDialog";
import { OPCUAConfigDialog } from "@/components/OPCUAConfigDialog";
import { MQTTConfigDialog } from "@/components/MQTTConfigDialog";
import { KepwareConfigDialog } from "@/components/KepwareConfigDialog";
import { NetSuiteFinancialsConfigDialog } from "@/components/NetSuiteFinancialsConfigDialog";
import { JaggaerConfigDialog } from "@/components/JaggaerConfigDialog";
import { SAPEWMConfigDialog } from "@/components/SAPEWMConfigDialog";
import { MasterControlConfigDialog } from "@/components/MasterControlConfigDialog";
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
  LayoutGrid,
  ListTodo,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { SiSalesforce, SiHubspot, SiShopify, SiQuickbooks, SiSlack, SiGooglesheets, SiZapier, SiSap, SiOracle, SiJira, SiLinear, SiNotion, SiGooglecalendar, SiXero } from "react-icons/si";

type IntegrationStatus = "connected" | "available" | "setup_ready" | "coming_soon";

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
    status: "setup_ready",
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
    status: "available",
    icon: MessageSquare,
    iconType: "lucide",
    valueProposition: "Integrate with your existing Microsoft ecosystem",
    features: ["Teams channels", "Adaptive cards", "Webhook notifications", "Real-time alerts"],
    setupTime: "5 minutes",
    popular: true,
  },
  
  // Data Import/Export
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Export data as CSV for spreadsheet import",
    category: "data",
    status: "setup_ready",
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
    status: "setup_ready",
    icon: SiShopify,
    iconType: "si",
    valueProposition: "Real-time demand signals from e-commerce orders",
    features: ["Order sync", "Inventory levels", "Product catalog", "Webhook integration"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    description: "Marketplace demand intelligence",
    category: "ecommerce",
    status: "setup_ready",
    icon: ShoppingCart,
    iconType: "lucide",
    valueProposition: "Forecast demand from marketplace sales",
    features: ["Sales data sync", "Inventory planning", "Buy Box analytics", "FBA integration"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "WordPress e-commerce integration",
    category: "ecommerce",
    status: "setup_ready",
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
    description: "Enterprise resource planning with real-time analytics",
    category: "erp",
    status: "setup_ready",
    icon: SiSap,
    iconType: "si",
    valueProposition: "Seamless bi-directional sync with SAP",
    features: ["Material master sync", "Purchase orders", "Inventory levels", "Production orders"],
    setupTime: "15 minutes",
    popular: true,
  },
  {
    id: "oracle",
    name: "Oracle NetSuite",
    description: "Cloud ERP integration",
    category: "erp",
    status: "setup_ready",
    icon: SiOracle,
    iconType: "si",
    valueProposition: "Complete visibility across your NetSuite data",
    features: ["Item records", "Sales orders", "Vendor management", "Financial data"],
    setupTime: "15 minutes",
    popular: true,
  },
  {
    id: "dynamics",
    name: "Microsoft Dynamics 365",
    description: "Unified ERP, CRM, and supply chain management",
    category: "erp",
    status: "setup_ready",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Unified Microsoft ecosystem integration",
    features: ["Supply chain modules", "Finance sync", "Sales orders", "Inventory management"],
    setupTime: "15 minutes",
  },
  {
    id: "sage-x3",
    name: "Sage X3",
    description: "Mid-market ERP for manufacturing and distribution",
    category: "erp",
    status: "setup_ready",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Connect Sage for comprehensive operations visibility",
    features: ["Inventory sync", "Purchase orders", "Supplier data", "Production planning"],
    setupTime: "15 minutes",
  },
  {
    id: "infor",
    name: "Infor CloudSuite",
    description: "Industry-tailored ERP for manufacturing and distribution",
    category: "erp",
    status: "setup_ready",
    icon: Cloud,
    iconType: "lucide",
    valueProposition: "Industry-specific manufacturing intelligence",
    features: ["Shop floor data", "Material requirements", "Supplier portal", "Quality management"],
    setupTime: "15 minutes",
  },
  
  // Logistics & Shipping
  {
    id: "fedex",
    name: "FedEx",
    description: "Track shipments and delivery status",
    category: "logistics",
    status: "setup_ready",
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
    status: "setup_ready",
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
    status: "setup_ready",
    icon: Globe,
    iconType: "lucide",
    valueProposition: "End-to-end supply chain visibility",
    features: ["Ocean freight", "Air cargo", "Trucking", "Customs clearance"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "project44",
    name: "project44",
    description: "Real-time supply chain visibility and predictive ETAs",
    category: "logistics",
    status: "setup_ready",
    icon: Truck,
    iconType: "lucide",
    valueProposition: "Predictive ETA and risk management",
    features: ["Multi-carrier tracking", "Predictive ETAs", "Exception management", "Analytics"],
    setupTime: "10 minutes",
  },
  
  // IoT & Machine Data
  {
    id: "opc-ua",
    name: "OPC-UA",
    description: "Industrial machine connectivity protocol",
    category: "iot",
    status: "setup_ready",
    icon: Radio,
    iconType: "lucide",
    valueProposition: "Real-time machine data for OEE optimization",
    features: ["PLC connectivity", "Sensor data", "Production counts", "Downtime tracking"],
    setupTime: "30 minutes",
  },
  {
    id: "mqtt",
    name: "MQTT Broker",
    description: "IoT messaging protocol for sensor data",
    category: "iot",
    status: "setup_ready",
    icon: Radio,
    iconType: "lucide",
    valueProposition: "Lightweight IoT data streaming",
    features: ["Sensor streams", "Edge devices", "Real-time alerts", "Data buffering"],
    setupTime: "15 minutes",
  },
  {
    id: "kepware",
    name: "Kepware KEPServerEX",
    description: "Industrial connectivity platform with 300+ device drivers",
    category: "iot",
    status: "setup_ready",
    icon: Factory,
    iconType: "lucide",
    valueProposition: "Universal industrial protocol translation",
    features: ["300+ drivers", "OPC connectivity", "Cloud gateway", "Historian integration"],
    setupTime: "30 minutes",
  },
  
  // BI & Analytics
  {
    id: "powerbi",
    name: "Power BI",
    description: "Connect Power BI to our Data Export API",
    category: "analytics",
    status: "setup_ready",
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
    status: "setup_ready",
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
    status: "setup_ready",
    icon: BarChart3,
    iconType: "lucide",
    valueProposition: "Semantic layer for consistent metrics",
    features: ["LookML modeling", "Data Export API", "REST endpoints", "JSON data feeds"],
    setupTime: "10 minutes",
  },
  
  // Accounting & Finance
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Small business accounting",
    category: "finance",
    status: "setup_ready",
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
    status: "setup_ready",
    icon: SiXero,
    iconType: "si",
    valueProposition: "Streamlined financial operations",
    features: ["Bill management", "Bank feeds", "Invoice tracking", "Reporting"],
    setupTime: "10 minutes",
  },
  {
    id: "netsuite-financials",
    name: "NetSuite Financials",
    description: "Enterprise financial management and reporting",
    category: "finance",
    status: "setup_ready",
    icon: DollarSign,
    iconType: "lucide",
    valueProposition: "Complete financial integration for cost analysis",
    features: ["GL transactions", "AP/AR sync", "Budget data", "Cost centers"],
    setupTime: "15 minutes",
  },
  
  // Procurement & Sourcing
  {
    id: "ariba",
    name: "SAP Ariba",
    description: "Procurement network",
    category: "procurement",
    status: "setup_ready",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Connect with your supplier network",
    features: ["Supplier discovery", "RFQ management", "Contract compliance", "Invoice matching"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "coupa",
    name: "Coupa",
    description: "Spend management platform",
    category: "procurement",
    status: "setup_ready",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "Unified spend visibility",
    features: ["Procurement", "Invoicing", "Expenses", "Supplier management"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "jaggaer",
    name: "Jaggaer",
    description: "Source-to-pay and procurement automation platform",
    category: "procurement",
    status: "setup_ready",
    icon: Building2,
    iconType: "lucide",
    valueProposition: "End-to-end procurement automation",
    features: ["Sourcing", "Contracts", "Supplier risk", "Spend analytics"],
    setupTime: "15 minutes",
  },
  
  // Warehouse & Inventory
  {
    id: "manhattan",
    name: "Manhattan WMS",
    description: "Warehouse management system",
    category: "warehouse",
    status: "setup_ready",
    icon: Warehouse,
    iconType: "lucide",
    valueProposition: "Real-time warehouse visibility",
    features: ["Inventory levels", "Pick/pack status", "Receiving", "Cycle counts"],
    setupTime: "15 minutes",
    popular: true,
  },
  {
    id: "sap-ewm",
    name: "SAP EWM",
    description: "Extended Warehouse Management for complex logistics",
    category: "warehouse",
    status: "setup_ready",
    icon: Warehouse,
    iconType: "lucide",
    valueProposition: "Advanced warehouse operations integration",
    features: ["Slotting", "Labor management", "Yard management", "Cross-docking"],
    setupTime: "20 minutes",
  },
  {
    id: "fishbowl",
    name: "Fishbowl",
    description: "Inventory management and manufacturing for SMBs",
    category: "warehouse",
    status: "setup_ready",
    icon: Boxes,
    iconType: "lucide",
    valueProposition: "Affordable inventory visibility",
    features: ["Multi-location", "Barcode scanning", "Reorder points", "Lot tracking"],
    setupTime: "10 minutes",
  },
  
  // Quality Management
  {
    id: "etq",
    name: "ETQ Reliance",
    description: "Quality management system",
    category: "quality",
    status: "setup_ready",
    icon: FileCheck,
    iconType: "lucide",
    valueProposition: "Quality data for supplier scoring",
    features: ["CAPA tracking", "Audit management", "Supplier quality", "Document control"],
    setupTime: "10 minutes",
    popular: true,
  },
  {
    id: "mastercontrol",
    name: "MasterControl",
    description: "Quality management for regulated industries",
    category: "quality",
    status: "setup_ready",
    icon: Shield,
    iconType: "lucide",
    valueProposition: "Regulated industry quality integration",
    features: ["Deviation management", "Training records", "Validation", "Electronic signatures"],
    setupTime: "15 minutes",
  },
  
  // Automation & Workflow
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect via webhooks for automation",
    category: "automation",
    status: "setup_ready",
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
    status: "setup_ready",
    icon: Zap,
    iconType: "lucide",
    valueProposition: "Complex workflow automation",
    features: ["Inbound webhooks", "Outbound triggers", "Event subscriptions", "HMAC security"],
    setupTime: "10 minutes",
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Open-source workflow automation",
    category: "automation",
    status: "setup_ready",
    icon: Zap,
    iconType: "lucide",
    valueProposition: "Self-hosted automation for advanced workflows",
    features: ["Inbound webhooks", "Outbound triggers", "Event subscriptions", "Custom nodes"],
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
  
  // Productivity & Project Management
  {
    id: "jira",
    name: "Jira",
    description: "Issue tracking and project management",
    category: "productivity",
    status: "setup_ready",
    icon: SiJira,
    iconType: "si",
    valueProposition: "Track supply chain issues and procurement tasks",
    features: ["Issue sync", "Project boards", "Sprint planning", "Workflow automation"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Modern project tracking platform",
    category: "productivity",
    status: "setup_ready",
    icon: SiLinear,
    iconType: "si",
    valueProposition: "Fast issue tracking for agile teams",
    features: ["Issue management", "Roadmap planning", "Cycle tracking", "GitHub sync"],
    setupTime: "5 minutes",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Knowledge base and documentation",
    category: "productivity",
    status: "setup_ready",
    icon: SiNotion,
    iconType: "si",
    valueProposition: "Centralized knowledge management",
    features: ["Database sync", "Documentation", "Team wikis", "Process templates"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Calendar and meeting scheduling",
    category: "productivity",
    status: "setup_ready",
    icon: SiGooglecalendar,
    iconType: "si",
    valueProposition: "Schedule S&OP meetings and planning sessions",
    features: ["Meeting scheduling", "Event sync", "Reminder integration", "Team calendars"],
    setupTime: "3 minutes",
  },
  
  // Document Management
  {
    id: "docusign",
    name: "DocuSign",
    description: "Electronic signature platform",
    category: "documents",
    status: "setup_ready",
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
    status: "setup_ready",
    icon: FileText,
    iconType: "lucide",
    valueProposition: "Centralized document storage",
    features: ["File storage", "Version control", "Collaboration", "Permissions"],
    setupTime: "15 minutes",
    popular: true,
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
  
  // New Data Warehouse & Analytics
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Cloud data warehouse integration",
    category: "analytics",
    status: "setup_ready",
    icon: Database,
    iconType: "lucide",
    valueProposition: "Export data to your data warehouse for advanced analytics",
    features: ["Data export", "Scheduled sync", "Multiple datasets", "SQL access"],
    setupTime: "15 minutes",
    popular: true,
  },
  
  // New Productivity Integrations
  {
    id: "monday",
    name: "Monday.com",
    description: "Work management platform",
    category: "productivity",
    status: "setup_ready",
    icon: LayoutGrid,
    iconType: "lucide",
    valueProposition: "Track procurement and operations tasks",
    features: ["Board sync", "Task automation", "Status updates", "Team collaboration"],
    setupTime: "5 minutes",
    popular: true,
  },
  {
    id: "asana",
    name: "Asana",
    description: "Project and task management",
    category: "productivity",
    status: "setup_ready",
    icon: ListTodo,
    iconType: "lucide",
    valueProposition: "Manage supply chain projects and tasks",
    features: ["Project sync", "Task tracking", "Subtasks", "Team assignments"],
    setupTime: "5 minutes",
  },
  
  // New E-commerce
  {
    id: "bigcommerce",
    name: "BigCommerce",
    description: "Enterprise e-commerce platform",
    category: "ecommerce",
    status: "setup_ready",
    icon: ShoppingBag,
    iconType: "lucide",
    valueProposition: "Sync orders and inventory from your BigCommerce store",
    features: ["Order sync", "Product catalog", "Inventory levels", "Customer data"],
    setupTime: "10 minutes",
  },
  
  // Payments
  {
    id: "stripe-payments",
    name: "Stripe",
    description: "Payment processing and reconciliation",
    category: "finance",
    status: "setup_ready",
    icon: CreditCard,
    iconType: "lucide",
    valueProposition: "Automate payment tracking and supplier reconciliation",
    features: ["Payment sync", "Invoice tracking", "Subscription management", "Auto-reconciliation"],
    setupTime: "10 minutes",
    popular: true,
  },
  
  // Additional Logistics
  {
    id: "dhl",
    name: "DHL Express",
    description: "International shipping and logistics",
    category: "logistics",
    status: "setup_ready",
    icon: Truck,
    iconType: "lucide",
    valueProposition: "Global shipment tracking and delivery intelligence",
    features: ["Shipment tracking", "Customs status", "Delivery estimates", "Multi-country visibility"],
    setupTime: "5 minutes",
    popular: true,
  },
  
  // Additional Finance
  {
    id: "billcom",
    name: "Bill.com",
    description: "AP/AR automation platform",
    category: "finance",
    status: "setup_ready",
    icon: DollarSign,
    iconType: "lucide",
    valueProposition: "Streamline accounts payable and receivable",
    features: ["Invoice processing", "Payment automation", "Approval workflows", "Vendor management"],
    setupTime: "10 minutes",
  },
  
  // Additional Productivity
  {
    id: "trello",
    name: "Trello",
    description: "Visual project management with boards",
    category: "productivity",
    status: "setup_ready",
    icon: LayoutGrid,
    iconType: "lucide",
    valueProposition: "Visualize procurement workflows with Kanban boards",
    features: ["Board sync", "Card automation", "Checklists", "Team collaboration"],
    setupTime: "5 minutes",
  },
  
  // Additional CRM
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Customer service and support platform",
    category: "crm",
    status: "setup_ready",
    icon: Users,
    iconType: "lucide",
    valueProposition: "Connect customer feedback to demand signals",
    features: ["Ticket sync", "Customer insights", "SLA tracking", "Satisfaction metrics"],
    setupTime: "10 minutes",
  },
  
  // Additional Communication
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Email marketing and automation",
    category: "communication",
    status: "setup_ready",
    icon: Mail,
    iconType: "lucide",
    valueProposition: "Automate supplier and customer communications",
    features: ["Email campaigns", "Audience sync", "Automation workflows", "Analytics"],
    setupTime: "5 minutes",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Transactional email delivery",
    category: "communication",
    status: "setup_ready",
    icon: Send,
    iconType: "lucide",
    valueProposition: "Reliable transactional email for alerts and notifications",
    features: ["Email delivery", "Templates", "Analytics", "Bounce handling"],
    setupTime: "5 minutes",
  },
  
  // Additional Data
  {
    id: "airtable",
    name: "Airtable",
    description: "Spreadsheet-database hybrid platform",
    category: "data",
    status: "setup_ready",
    icon: Database,
    iconType: "lucide",
    valueProposition: "Flexible data management and collaboration",
    features: ["Base sync", "Record import/export", "Automation triggers", "API access"],
    setupTime: "5 minutes",
    popular: true,
  },
  
  // EDI & Supply Chain Connectivity
  {
    id: "sps-commerce",
    name: "SPS Commerce",
    description: "EDI and supply chain connectivity",
    category: "data",
    status: "setup_ready",
    icon: Link2,
    iconType: "lucide",
    valueProposition: "Connect with retail and wholesale partners via EDI",
    features: ["EDI transactions", "Trading partner network", "Order automation", "ASN/invoicing"],
    setupTime: "15 minutes",
    popular: true,
  },
  
  // PLM / Product Lifecycle
  {
    id: "teamcenter",
    name: "Siemens Teamcenter",
    description: "Product lifecycle management",
    category: "data",
    status: "setup_ready",
    icon: Settings,
    iconType: "lucide",
    valueProposition: "Integrate BOM and engineering data for procurement",
    features: ["BOM sync", "Engineering changes", "Part data", "Revision management"],
    setupTime: "20 minutes",
    popular: true,
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
  { id: "productivity", name: "Productivity", icon: CalendarCheck },
  { id: "documents", name: "Documents", icon: FileText },
  { id: "external", name: "External Data", icon: Globe },
];

function getStatusBadge(status: IntegrationStatus) {
  switch (status) {
    case "connected":
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
    case "available":
      return <Badge variant="secondary"><Zap className="w-3 h-3 mr-1" /> Available</Badge>;
    case "setup_ready":
      return <Badge variant="outline" className="border-amber-500 text-amber-600"><Settings className="w-3 h-3 mr-1" /> Setup Ready</Badge>;
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
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);
  const [lookerDialogOpen, setLookerDialogOpen] = useState(false);
  const [n8nDialogOpen, setN8nDialogOpen] = useState(false);
  const [shopifyDialogOpen, setShopifyDialogOpen] = useState(false);
  const [salesforceDialogOpen, setSalesforceDialogOpen] = useState(false);
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false);
  const [linearDialogOpen, setLinearDialogOpen] = useState(false);
  const [notionDialogOpen, setNotionDialogOpen] = useState(false);
  const [googleCalendarDialogOpen, setGoogleCalendarDialogOpen] = useState(false);
  const [quickbooksDialogOpen, setQuickbooksDialogOpen] = useState(false);
  const [xeroDialogOpen, setXeroDialogOpen] = useState(false);
  const [docusignDialogOpen, setDocusignDialogOpen] = useState(false);
  const [fedexDialogOpen, setFedexDialogOpen] = useState(false);
  const [upsDialogOpen, setUpsDialogOpen] = useState(false);
  const [amazonDialogOpen, setAmazonDialogOpen] = useState(false);
  const [woocommerceDialogOpen, setWoocommerceDialogOpen] = useState(false);
  const [sharepointDialogOpen, setSharepointDialogOpen] = useState(false);
  const [flexportDialogOpen, setFlexportDialogOpen] = useState(false);
  const [tableauDialogOpen, setTableauDialogOpen] = useState(false);
  const [snowflakeDialogOpen, setSnowflakeDialogOpen] = useState(false);
  const [mondayDialogOpen, setMondayDialogOpen] = useState(false);
  const [asanaDialogOpen, setAsanaDialogOpen] = useState(false);
  const [bigcommerceDialogOpen, setBigcommerceDialogOpen] = useState(false);
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const [dhlDialogOpen, setDhlDialogOpen] = useState(false);
  const [billcomDialogOpen, setBillcomDialogOpen] = useState(false);
  const [trelloDialogOpen, setTrelloDialogOpen] = useState(false);
  const [zendeskDialogOpen, setZendeskDialogOpen] = useState(false);
  const [mailchimpDialogOpen, setMailchimpDialogOpen] = useState(false);
  const [sendgridDialogOpen, setSendgridDialogOpen] = useState(false);
  const [airtableDialogOpen, setAirtableDialogOpen] = useState(false);
  const [aribaDialogOpen, setAribaDialogOpen] = useState(false);
  const [coupaDialogOpen, setCoupaDialogOpen] = useState(false);
  const [manhattanDialogOpen, setManhattanDialogOpen] = useState(false);
  const [etqDialogOpen, setEtqDialogOpen] = useState(false);
  const [netsuiteDialogOpen, setNetsuiteDialogOpen] = useState(false);
  const [spsCommerceDialogOpen, setSpsCommerceDialogOpen] = useState(false);
  const [teamcenterDialogOpen, setTeamcenterDialogOpen] = useState(false);
  const [sapDialogOpen, setSapDialogOpen] = useState(false);
  const [dynamicsDialogOpen, setDynamicsDialogOpen] = useState(false);
  const [inforDialogOpen, setInforDialogOpen] = useState(false);
  const [project44DialogOpen, setProject44DialogOpen] = useState(false);
  const [fishbowlDialogOpen, setFishbowlDialogOpen] = useState(false);
  const [sageX3DialogOpen, setSageX3DialogOpen] = useState(false);
  const [opcuaDialogOpen, setOpcuaDialogOpen] = useState(false);
  const [mqttDialogOpen, setMqttDialogOpen] = useState(false);
  const [kepwareDialogOpen, setKepwareDialogOpen] = useState(false);
  const [netsuiteFinancialsDialogOpen, setNetsuiteFinancialsDialogOpen] = useState(false);
  const [jaggaerDialogOpen, setJaggaerDialogOpen] = useState(false);
  const [sapEwmDialogOpen, setSapEwmDialogOpen] = useState(false);
  const [mastercontrolDialogOpen, setMastercontrolDialogOpen] = useState(false);

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const popularIntegrations = integrations.filter(i => i.popular);
  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const availableCount = integrations.filter(i => i.status === "available").length;
  const setupReadyCount = integrations.filter(i => i.status === "setup_ready").length;

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
      setTableauDialogOpen(true);
    } else if (integration.id === "teams") {
      setTeamsDialogOpen(true);
    } else if (integration.id === "looker") {
      setLookerDialogOpen(true);
    } else if (integration.id === "n8n") {
      setN8nDialogOpen(true);
    } else if (integration.id === "shopify") {
      setShopifyDialogOpen(true);
    } else if (integration.id === "make") {
      setZapierDialogOpen(true);
    } else if (integration.id === "salesforce") {
      setSalesforceDialogOpen(true);
    } else if (integration.id === "jira") {
      setJiraDialogOpen(true);
    } else if (integration.id === "linear") {
      setLinearDialogOpen(true);
    } else if (integration.id === "notion") {
      setNotionDialogOpen(true);
    } else if (integration.id === "google-calendar") {
      setGoogleCalendarDialogOpen(true);
    } else if (integration.id === "quickbooks") {
      setQuickbooksDialogOpen(true);
    } else if (integration.id === "xero") {
      setXeroDialogOpen(true);
    } else if (integration.id === "docusign") {
      setDocusignDialogOpen(true);
    } else if (integration.id === "fedex") {
      setFedexDialogOpen(true);
    } else if (integration.id === "ups") {
      setUpsDialogOpen(true);
    } else if (integration.id === "amazon") {
      setAmazonDialogOpen(true);
    } else if (integration.id === "woocommerce") {
      setWoocommerceDialogOpen(true);
    } else if (integration.id === "sharepoint") {
      setSharepointDialogOpen(true);
    } else if (integration.id === "flexport") {
      setFlexportDialogOpen(true);
    } else if (integration.id === "snowflake") {
      setSnowflakeDialogOpen(true);
    } else if (integration.id === "monday") {
      setMondayDialogOpen(true);
    } else if (integration.id === "asana") {
      setAsanaDialogOpen(true);
    } else if (integration.id === "bigcommerce") {
      setBigcommerceDialogOpen(true);
    } else if (integration.id === "stripe-payments") {
      setStripeDialogOpen(true);
    } else if (integration.id === "dhl") {
      setDhlDialogOpen(true);
    } else if (integration.id === "billcom") {
      setBillcomDialogOpen(true);
    } else if (integration.id === "trello") {
      setTrelloDialogOpen(true);
    } else if (integration.id === "zendesk") {
      setZendeskDialogOpen(true);
    } else if (integration.id === "mailchimp") {
      setMailchimpDialogOpen(true);
    } else if (integration.id === "sendgrid") {
      setSendgridDialogOpen(true);
    } else if (integration.id === "airtable") {
      setAirtableDialogOpen(true);
    } else if (integration.id === "ariba") {
      setAribaDialogOpen(true);
    } else if (integration.id === "coupa") {
      setCoupaDialogOpen(true);
    } else if (integration.id === "manhattan") {
      setManhattanDialogOpen(true);
    } else if (integration.id === "etq") {
      setEtqDialogOpen(true);
    } else if (integration.id === "oracle") {
      setNetsuiteDialogOpen(true);
    } else if (integration.id === "sps-commerce") {
      setSpsCommerceDialogOpen(true);
    } else if (integration.id === "teamcenter") {
      setTeamcenterDialogOpen(true);
    } else if (integration.id === "sap") {
      setSapDialogOpen(true);
    } else if (integration.id === "dynamics") {
      setDynamicsDialogOpen(true);
    } else if (integration.id === "infor") {
      setInforDialogOpen(true);
    } else if (integration.id === "project44") {
      setProject44DialogOpen(true);
    } else if (integration.id === "fishbowl") {
      setFishbowlDialogOpen(true);
    } else if (integration.id === "sage-x3") {
      setSageX3DialogOpen(true);
    } else if (integration.id === "opc-ua") {
      setOpcuaDialogOpen(true);
    } else if (integration.id === "mqtt") {
      setMqttDialogOpen(true);
    } else if (integration.id === "kepware") {
      setKepwareDialogOpen(true);
    } else if (integration.id === "netsuite-financials") {
      setNetsuiteFinancialsDialogOpen(true);
    } else if (integration.id === "jaggaer") {
      setJaggaerDialogOpen(true);
    } else if (integration.id === "sap-ewm") {
      setSapEwmDialogOpen(true);
    } else if (integration.id === "mastercontrol") {
      setMastercontrolDialogOpen(true);
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
                <Settings className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-setup-ready-count">{setupReadyCount}</p>
                <p className="text-sm text-muted-foreground">Setup Ready</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedCategory === "all" && (
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
                          <div className={`p-2 rounded-lg ${integration.status === "connected" ? "bg-green-500/10" : integration.status === "coming_soon" ? "bg-muted" : integration.status === "setup_ready" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                            <IconComponent className={`w-5 h-5 ${integration.status === "connected" ? "text-green-500" : integration.status === "coming_soon" ? "text-muted-foreground" : integration.status === "setup_ready" ? "text-amber-600" : "text-primary"}`} />
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
                        {integration.status === "setup_ready" && (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handleConnect(integration)} data-testid={`button-configure-popular-${integration.id}`}>
                            <Settings className="w-4 h-4 mr-2" /> Configure
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
        )}

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
                        onClick={() => {
                          setSelectedCategory(category.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
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
                          <div className={`p-2.5 rounded-lg ${integration.status === "connected" ? "bg-green-500/10" : integration.status === "coming_soon" ? "bg-muted" : integration.status === "setup_ready" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                            <IconComponent className={`w-5 h-5 ${integration.status === "connected" ? "text-green-500" : integration.status === "coming_soon" ? "text-muted-foreground" : integration.status === "setup_ready" ? "text-amber-600" : "text-primary"}`} />
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
                          {integration.status === "setup_ready" && (
                            <Button size="sm" variant="outline" onClick={() => handleConnect(integration)} data-testid={`button-configure-${integration.id}`}>
                              <Settings className="w-4 h-4 mr-1" /> Configure
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
      <TeamsConfigDialog open={teamsDialogOpen} onOpenChange={setTeamsDialogOpen} />
      <LookerDialog open={lookerDialogOpen} onOpenChange={setLookerDialogOpen} />
      <N8nDialog open={n8nDialogOpen} onOpenChange={setN8nDialogOpen} />
      <ShopifyDialog open={shopifyDialogOpen} onOpenChange={setShopifyDialogOpen} />
      <SalesforceConfigDialog open={salesforceDialogOpen} onOpenChange={setSalesforceDialogOpen} />
      <JiraConfigDialog open={jiraDialogOpen} onOpenChange={setJiraDialogOpen} />
      <LinearConfigDialog open={linearDialogOpen} onOpenChange={setLinearDialogOpen} />
      <NotionConfigDialog open={notionDialogOpen} onOpenChange={setNotionDialogOpen} />
      <GoogleCalendarConfigDialog open={googleCalendarDialogOpen} onOpenChange={setGoogleCalendarDialogOpen} />
      <QuickBooksConfigDialog open={quickbooksDialogOpen} onOpenChange={setQuickbooksDialogOpen} />
      <XeroConfigDialog open={xeroDialogOpen} onOpenChange={setXeroDialogOpen} />
      <DocuSignConfigDialog open={docusignDialogOpen} onOpenChange={setDocusignDialogOpen} />
      <FedExConfigDialog open={fedexDialogOpen} onOpenChange={setFedexDialogOpen} />
      <UPSConfigDialog open={upsDialogOpen} onOpenChange={setUpsDialogOpen} />
      <AmazonSellerConfigDialog open={amazonDialogOpen} onOpenChange={setAmazonDialogOpen} />
      <WooCommerceConfigDialog open={woocommerceDialogOpen} onOpenChange={setWoocommerceDialogOpen} />
      <SharePointConfigDialog open={sharepointDialogOpen} onOpenChange={setSharepointDialogOpen} />
      <FlexportConfigDialog open={flexportDialogOpen} onOpenChange={setFlexportDialogOpen} />
      <TableauConfigDialog open={tableauDialogOpen} onOpenChange={setTableauDialogOpen} />
      <SnowflakeConfigDialog open={snowflakeDialogOpen} onOpenChange={setSnowflakeDialogOpen} />
      <MondayConfigDialog open={mondayDialogOpen} onOpenChange={setMondayDialogOpen} />
      <AsanaConfigDialog open={asanaDialogOpen} onOpenChange={setAsanaDialogOpen} />
      <BigCommerceConfigDialog open={bigcommerceDialogOpen} onOpenChange={setBigcommerceDialogOpen} />
      <StripeConfigDialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen} />
      <DHLConfigDialog open={dhlDialogOpen} onOpenChange={setDhlDialogOpen} />
      <BillComConfigDialog open={billcomDialogOpen} onOpenChange={setBillcomDialogOpen} />
      <TrelloConfigDialog open={trelloDialogOpen} onOpenChange={setTrelloDialogOpen} />
      <ZendeskConfigDialog open={zendeskDialogOpen} onOpenChange={setZendeskDialogOpen} />
      <MailchimpConfigDialog open={mailchimpDialogOpen} onOpenChange={setMailchimpDialogOpen} />
      <SendGridConfigDialog open={sendgridDialogOpen} onOpenChange={setSendgridDialogOpen} />
      <AirtableConfigDialog open={airtableDialogOpen} onOpenChange={setAirtableDialogOpen} />
      <AribaConfigDialog open={aribaDialogOpen} onOpenChange={setAribaDialogOpen} />
      <CoupaConfigDialog open={coupaDialogOpen} onOpenChange={setCoupaDialogOpen} />
      <ManhattanConfigDialog open={manhattanDialogOpen} onOpenChange={setManhattanDialogOpen} />
      <ETQConfigDialog open={etqDialogOpen} onOpenChange={setEtqDialogOpen} />
      <NetSuiteConfigDialog open={netsuiteDialogOpen} onOpenChange={setNetsuiteDialogOpen} />
      <SPSCommerceConfigDialog open={spsCommerceDialogOpen} onOpenChange={setSpsCommerceDialogOpen} />
      <TeamcenterConfigDialog open={teamcenterDialogOpen} onOpenChange={setTeamcenterDialogOpen} />
      <SAPConfigDialog open={sapDialogOpen} onOpenChange={setSapDialogOpen} />
      <DynamicsConfigDialog open={dynamicsDialogOpen} onOpenChange={setDynamicsDialogOpen} />
      <InforConfigDialog open={inforDialogOpen} onOpenChange={setInforDialogOpen} />
      <Project44ConfigDialog open={project44DialogOpen} onOpenChange={setProject44DialogOpen} />
      <FishbowlConfigDialog open={fishbowlDialogOpen} onOpenChange={setFishbowlDialogOpen} />
      <SageX3ConfigDialog open={sageX3DialogOpen} onOpenChange={setSageX3DialogOpen} />
      <OPCUAConfigDialog open={opcuaDialogOpen} onOpenChange={setOpcuaDialogOpen} />
      <MQTTConfigDialog open={mqttDialogOpen} onOpenChange={setMqttDialogOpen} />
      <KepwareConfigDialog open={kepwareDialogOpen} onOpenChange={setKepwareDialogOpen} />
      <NetSuiteFinancialsConfigDialog open={netsuiteFinancialsDialogOpen} onOpenChange={setNetsuiteFinancialsDialogOpen} />
      <JaggaerConfigDialog open={jaggaerDialogOpen} onOpenChange={setJaggaerDialogOpen} />
      <SAPEWMConfigDialog open={sapEwmDialogOpen} onOpenChange={setSapEwmDialogOpen} />
      <MasterControlConfigDialog open={mastercontrolDialogOpen} onOpenChange={setMastercontrolDialogOpen} />
    </div>
  );
}
