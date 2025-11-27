# Manufacturing Allocation Intelligence SaaS

## Overview

This AI-powered SaaS platform optimizes raw material allocation, demand forecasting, and procurement for manufacturing. It utilizes a dual-circuit economic model to analyze economic regimes and generate strategic policy signals. Key capabilities include SKU demand forecasting, prioritized material allocation, counter-cyclical procurement using Financial-to-Real Divergence (FDR) metrics, budget/inventory optimization, and comprehensive machinery lifecycle management. The system supports over 110 tradeable commodities with real-time pricing and a master materials catalog.

The platform offers unified UI tools for Strategic Analysis (Economic Scenario Simulation, Geopolitical Risk Assessment) and Supply Chain Intelligence (Material Traceability, Supplier Network monitoring). Enterprise features include multi-tier Supply Chain Network Intelligence with FDR-aware risk scoring, Automated Purchase Order Execution, an Industry Data Consortium for peer benchmarking, and M&A Intelligence. It also provides regulatory compliance, real-time production KPI dashboards with OEE tracking, automated bottleneck detection, and continuous intelligence from external economic APIs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is built with React and TypeScript, using `shadcn/ui` on Radix UI, following Material Design principles with a Linear-inspired minimalist aesthetic. Tailwind CSS is used for styling. The design is dashboard-centric, featuring KPI cards, data tables, charts, regime status widgets, and policy signals panels.

### Technical Implementations

The system is a multi-tenant application ensuring data isolation per company. Core features include:
- **Dual-circuit FDR model**: Determines economic regimes and policy signals.
- **Demand Forecasting**: Regime-aware, multi-horizon forecasting with automated retraining and real-time MAPE tracking, including degradation alerts and automatic recalibration.
- **Allocation Engine**: Constraint-based optimization for material allocation.
- **Real-time Commodity Pricing**: Integration for over 110 commodities.
- **Master Materials Catalog**: Centralized management of materials and supplier pricing.
- **Production KPIs**: OEE calculation, cycle time analysis, and automated bottleneck detection.
- **Automated RFQ Generation**: Intelligent system that monitors inventory levels and economic regime signals to automatically generate Request for Quotations (RFQs), saving significant procurement manager time.
- **Peer Benchmarking System**: Anonymized cost-sharing platform for comparing material costs with industry peers, offering competitive intelligence and identifying savings.
- **Demand Signal Repository**: Centralized hub for multi-source demand signals with analytics and confidence scoring.
- **ROI Dashboard**: Visualizes procurement savings and forecast accuracy improvements.
- **ERP Integration Templates**: Pre-built integration templates for top ERPs (SAP S/4HANA, Oracle NetSuite, Microsoft Dynamics 365, Sage X3, Infor CloudSuite).
- **Prescriptive Action Playbooks**: Regime-specific action playbooks for economic changes, covering scenarios like Bubble Territory Response and Healthy Expansion Optimization.
- **Scenario Simulation**: What-if economic modeling for simulating different conditions and calculating impacts on procurement, inventory, and budget.
- **Supplier Risk Scoring**: FDR-based supplier risk assessment incorporating financial health, geographic risk, and regime impact.
- **Collaborative S&OP Workflows**: Full-featured Sales & Operations Planning module with meeting management, demand/supply reconciliation, and approval workflows.
- **Real-Time Digital Twin**: Enterprise-grade supply chain digital twin with live state snapshots, AI-powered natural language queries, what-if simulations, and real-time alerts.
- **Multi-Tier Supplier Mapping**: Enterprise-grade supply chain visibility with network graph visualization, dependency analysis, regional risk assessment, and sub-tier alerts.

### System Design Choices

The frontend uses React with TypeScript and Vite, with `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL is used for the database, featuring a multi-tenant schema with `companyId` for data isolation. Authentication is handled via Replit Auth (OpenID Connect) with Express sessions. The system employs background polling services for continuous data updates and WebSockets for live UI updates, including daily automated forecast retraining, real-time forecast accuracy tracking, automated RFQ generation, and peer benchmarking aggregation services.

## External Dependencies

### Third-Party Services

-   **Database**: Neon Serverless PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect)
-   **Economic Data APIs**: FRED, Alpha Vantage, DBnomics, World Bank API, IMF Data API, OECD Stats API, Trading Economics, News API
-   **Commodity Pricing API**: Metals.Dev
-   **Internal Economic Fallback**: `https://api.factoryofthefuture.ai/economic-indicators`

### Key NPM Packages

-   **Frontend**: `react`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `recharts`, `@radix-ui/*`, `class-variance-authority`, `cmdk`, `lucide-react`
-   **Backend**: `express`, `drizzle-orm`, `drizzle-zod`, `zod`, `passport`, `openid-client`, `axios`
-   **Database & Sessions**: `@neondatabase/serverless`, `connect-pg-simple`, `ws`