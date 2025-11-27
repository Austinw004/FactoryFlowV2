# Manufacturing Allocation Intelligence SaaS

## Overview

This AI-powered SaaS platform optimizes raw material allocation, demand forecasting, and procurement for manufacturing. It utilizes a dual-circuit economic model to analyze economic regimes and generate strategic policy signals. Key capabilities include SKU demand forecasting, prioritized material allocation, counter-cyclical procurement using Financial-to-Real Divergence (FDR) metrics, budget/inventory optimization, and comprehensive machinery lifecycle management. The system supports over 110 tradeable commodities with real-time pricing and a master materials catalog for streamlined management.

The platform offers unified UI tools for Strategic Analysis (Economic Scenario Simulation, Geopolitical Risk Assessment) and Supply Chain Intelligence (Material Traceability, Supplier Network monitoring). It includes enterprise features such as multi-tier Supply Chain Network Intelligence with FDR-aware risk scoring, Automated Purchase Order Execution with regime-aware triggers, an Industry Data Consortium for peer benchmarking with anonymized cost sharing and competitive intelligence, and M&A Intelligence. The Peer Benchmarking system enables companies to submit material cost data, compare against industry aggregates, and identify potential savings opportunities while maintaining strict privacy controls (minimum 3 participants, complete anonymization). It also provides regulatory compliance, real-time production KPI dashboards with OEE tracking, automated bottleneck detection, and continuous intelligence from over 15 external economic APIs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is built with React and TypeScript, using `shadcn/ui` on Radix UI, following Material Design principles with a Linear-inspired minimalist aesthetic. Tailwind CSS is used for styling. The design is dashboard-centric, featuring KPI cards, data tables, charts, regime status widgets, and policy signals panels. Educational content on dual-circuit economics is also provided.

### Technical Implementations

The system is a multi-tenant application ensuring data isolation per company. Core features include:
- **Dual-circuit FDR model**: Determines economic regimes and policy signals.
- **Demand Forecasting**: Regime-aware forecasting using exponential smoothing and moving averages.
- **Multi-Horizon Forecasting**: Tracks demand forecasts across multiple time horizons (1 day, 1 week, 2 weeks, 1 month, 2 months, 3 months, 6 months, 1 year) with confidence intervals, accuracy tracking, and cross-horizon comparison analytics.
- **Automated Forecast Retraining**: Daily background job that implements continuous learning by finding SKUs with new actual demand, calculating forecast error (MAPE), and automatically retraining models where error exceeds 10%. Achieves 26%+ accuracy improvements through feedback loops.
- **Real-Time MAPE Tracking**: Continuous forecast accuracy monitoring system that tracks MAPE across all SKUs every 4 hours, comparing against both baseline (first measurement) and previous measurements to detect long-term drift and short-term degradation.
- **Forecast Degradation Alerts**: Automated alert system that creates/updates alerts when MAPE degrades by >10% from baseline or previous measurement, with severity levels (low/medium/high/critical) based on degradation percentage. Alerts persist until verified improvement after retraining.
- **Automatic Recalibration**: When degradation reaches high (>30%) or critical (>50%) severity, the system automatically triggers model retraining and only resolves alerts if MAPE demonstrably improves post-retraining.
- **Allocation Engine**: Constraint-based optimization for material allocation based on BOMs, availability, priorities, and budget duration.
- **Real-time Commodity Pricing**: Integration with Metals.Dev for over 110 commodities.
- **Depreciation Calculator**: Supports multiple methods for machinery.
- **Master Materials Catalog**: Centralized management of materials and supplier pricing.
- **Production KPIs**: OEE calculation, cycle time analysis, and automated bottleneck detection.
- **External API Aggregation**: Integrates data from 15+ economic APIs for FDR and regime determination.
- **Research Validation**: Background system for backtesting the dual-circuit theory.
- **Smart Onboarding System**: Tracks completion of key setup steps with a dynamic checklist.
- **Webhook Notification System**: Fires HTTP POST requests for key events like regime changes, budget alerts, and allocation completion.
- **Data Export System**: Allows exporting company data (SKUs, materials, suppliers, allocations, machinery) in JSON, CSV, or Excel formats.
- **Data Import System**: Supports importing SKUs, materials, and suppliers from CSV with validation and error reporting.
- **Comprehensive Settings System**: Manages budget duration, email processing, AI assistant permissions, API access, data privacy, and company branding.
- **Automated RFQ Generation**: Intelligent system that monitors inventory levels and economic regime signals to automatically generate Request for Quotations (RFQs). Triggers when inventory falls below reorder point threshold AND regime signals are favorable (expansionary or real economy lead). Runs every 15 minutes via background job, saving procurement managers 10-15 hours/week by eliminating manual RFQ creation. Uses storage layer for proper company scoping and audit logging. Features regime-aware prioritization, supplier matching, and full CRUD API with schema validation.
- **Peer Benchmarking System**: Anonymized cost-sharing platform enabling companies to compare material costs with industry peers. Features include: benchmark data submission with quality validation, industry aggregate calculations (average, median, percentiles), comparative analytics showing cost position vs. industry, potential savings identification, and privacy safeguards (minimum 3 participants, complete anonymization, opt-in sharing). Daily background aggregation job processes submissions into industry benchmarks with multi-dimensional segmentation (category, industry, company size, region). Provides competitive intelligence and network effects through data consortium participation.
- **Demand Signal Repository**: Centralized hub for multi-source demand signals with analytics. Features signal sources (ERP, CRM, ecommerce, POS, API, etc.), signal recording with type classification (orders, forecasts, POS sales, returns, promotions), confidence scoring, and comprehensive analytics by signal type and source performance.
- **ROI Dashboard**: Visualizes procurement savings and forecast accuracy improvements with summary cards for key metrics (procurement savings, forecast accuracy, time saved, inventory optimization), trend charts, and recent metrics tracking.
- **ERP Integration Templates**: Pre-built integration templates for top 5 ERPs (SAP S/4HANA, Oracle NetSuite, Microsoft Dynamics 365, Sage X3, Infor CloudSuite). Each template includes field mappings, setup instructions, authentication configuration, and supported modules. Templates are stored globally and can be used by any company to set up ERP connections.
- **Prescriptive Action Playbooks**: Regime-specific action playbooks that provide specific recommended actions when economic regimes change. Each playbook includes trigger conditions (FDR threshold, direction), recommended actions with rationale and timeframes, expected outcomes, and priority levels. System default playbooks cover: Bubble Territory Response Protocol (IMBALANCED_EXCESS), Opportunity Zone Expansion Strategy (REAL_ECONOMY_LEAD), Early Warning Defensive Posture (ASSET_LED_GROWTH), and Healthy Expansion Optimization (HEALTHY_EXPANSION).
- **Scenario Simulation**: What-if economic modeling system for simulating different economic conditions. Users can create simulations with baseline FDR values and regimes, then add multiple scenario variants (e.g., recession, expansion, commodity price shocks). Each variant calculates procurement impact, inventory impact, budget impact, and risk scores based on FDR changes. Includes visual comparison tools with bar charts, radar charts, and trend analysis. Supports running simulations to compute all variant impacts and generating comparative insights.
- **Supplier Risk Scoring**: FDR-based supplier risk assessment system that evaluates suppliers using multiple risk factors: financial health score, geographic risk, concentration risk, performance history, and regime impact (how economic conditions affect supplier reliability). Risk tiers (Low, Medium, High, Critical) are calculated based on composite scores. Features include summary dashboard with aggregate statistics, detailed supplier risk profiles, risk trend visualization, and actionable recommendations for risk mitigation. Integrates with the dual-circuit economics engine to provide regime-aware supplier evaluations.
- **Collaborative S&OP Workflows**: Full-featured Sales & Operations Planning module enabling cross-functional collaboration between demand planning, supply chain, and executive teams. Features include: 
  - **Meeting Templates**: Pre-configured templates for Demand Review, Supply Review, Pre-S&OP, Executive S&OP, and Financial Reconciliation meetings with built-in agendas and required participants.
  - **Meeting Management**: Schedule, track, and manage S&OP meetings with status tracking (scheduled, in_progress, completed, cancelled), participant management, and automatic end-time calculation based on duration.
  - **Demand/Supply Reconciliation**: Track demand forecasts vs. supply capacity with variance calculations, automatic gap identification, and resolution tracking. Items can be pending, accepted, rejected, or escalated.
  - **Approval Workflows**: Multi-level approval chains for demand adjustments, supply changes, and budget modifications with full audit trails, comments, and escalation support.
  - **S&OP Dashboard**: Real-time metrics showing total meetings, pending approvals, reconciliation items, and economic regime status. Quick navigation to upcoming meetings and next actions.
- **Real-Time Digital Twin**: Enterprise-grade supply chain digital twin competing with industry leaders (o9, Kinaxis, Logility). Features include:
  - **Live State Snapshots**: Continuous capture of inventory, production, and supply chain state with metrics aggregation and regime integration.
  - **AI-Powered Natural Language Queries**: Ask questions in plain English about your supply chain ("What materials need reordering?", "Predict demand for next month"). Intent parsing, entity detection, and intelligent response generation with confidence scoring.
  - **What-If Simulations**: Model scenarios like demand shocks, supply disruptions, price changes, and regime shifts. Run simulations to calculate cost impacts, risk scores, timeline projections, key findings, and actionable recommendations.
  - **Real-Time Alerts**: Anomaly detection across inventory, production, supply, and demand with severity levels, acknowledgment workflow, and resolution tracking.
  - **Data Feed Management**: Configure and monitor real-time data feeds from internal systems (ERP, MES) and external APIs with connection status and sync intervals.
  - **Executive Dashboard**: KPI cards for inventory value, OEE, supplier network, and FDR ratio. Radar chart visualization of system state, alert summaries, and quick insights.

### System Design Choices

The frontend uses React with TypeScript and Vite, with `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL is used for the database, featuring a multi-tenant schema with `companyId` for data isolation. Authentication is handled via Replit Auth (OpenID Connect) with Express sessions. The system employs 12 background polling services for continuous data updates and WebSockets for live UI updates, including daily automated forecast retraining, real-time forecast accuracy tracking, automated RFQ generation, and peer benchmarking aggregation services that continuously improve system intelligence.

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
-   **Development**: `vite`, `tsx`, `esbuild`, `@replit/vite-plugin-*`