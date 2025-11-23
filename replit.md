# Manufacturing Allocation Intelligence SaaS

## Overview

This AI-powered SaaS platform optimizes raw material allocation, demand forecasting, and procurement for manufacturing. It utilizes a dual-circuit economic model to analyze economic regimes and generate strategic policy signals. Key capabilities include SKU demand forecasting, prioritized material allocation, counter-cyclical procurement using Financial-to-Real Divergence (FDR) metrics, budget/inventory optimization, and comprehensive machinery lifecycle management. The system supports over 110 tradeable commodities with real-time pricing and a master materials catalog for streamlined management.

The platform offers unified UI tools for Strategic Analysis (Economic Scenario Simulation, Geopolitical Risk Assessment) and Supply Chain Intelligence (Material Traceability, Supplier Network monitoring). It includes enterprise features such as multi-tier Supply Chain Network Intelligence with FDR-aware risk scoring, Automated Purchase Order Execution with regime-aware triggers, an Industry Data Consortium for peer benchmarking, and M&A Intelligence. It also provides regulatory compliance, real-time production KPI dashboards with OEE tracking, automated bottleneck detection, and continuous intelligence from over 15 external economic APIs.

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

### System Design Choices

The frontend uses React with TypeScript and Vite, with `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL is used for the database, featuring a multi-tenant schema with `companyId` for data isolation. Authentication is handled via Replit Auth (OpenID Connect) with Express sessions. The system employs 9 background polling services for continuous data updates and WebSockets for live UI updates, including a daily automated forecast retraining service that continuously improves prediction accuracy.

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