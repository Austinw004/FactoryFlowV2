# Prescient Labs - Manufacturing Intelligence Platform

## Overview

Prescient Labs is a manufacturing intelligence platform designed to optimize procurement, production, and supply chain management. It provides foresight through demand forecasting, material allocation, and proactive operational adjustments. The platform operates on a performance-based pricing model, taking a tiered percentage of verified procurement savings.

Key capabilities include:
- SKU demand forecasting
- Prioritized material allocation
- Counter-cyclical procurement timing
- Budget and inventory optimization
- Machinery lifecycle management
- Real-time pricing for over 110 commodities
- Master materials catalog

Enterprise features extend to:
- Multi-tier Supply Chain Network Intelligence
- Automated Purchase Order Execution
- Industry Data Consortium for benchmarking
- M&A and regulatory compliance tracking
- Real-time production KPI dashboards with automated bottleneck detection

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend utilizes React and TypeScript, styled with `shadcn/ui` on Radix UI, following Material Design principles with a minimalist aesthetic. Tailwind CSS is used for styling. The interface is dashboard-centric, featuring KPI cards, data tables, charts, regime status widgets, and policy signals panels.

### Technical Implementations

The system is a multi-tenant application with data isolation per company. Core technical features include:
- **Economic Regime Intelligence**: A "Dual-circuit FDR model" determines economic regimes and provides procurement timing signals and regime transition predictions.
- **Demand Forecasting**: Regime-aware, multi-horizon forecasting with automated retraining and real-time MAPE tracking.
- **Optimization Engines**: Constraint-based material allocation and budget optimization.
- **Real-time Data**: Integration for real-time commodity pricing and production KPIs (OEE, cycle time analysis).
- **Automated Processes**: Automated RFQ generation based on inventory and economic signals, and automated bottleneck detection.
- **Supply Chain Visibility**: Multi-tier supplier mapping with network graph visualization and geopolitical/event monitoring for real-time risk assessment.
- **Decision Support**: Prescriptive action playbooks, scenario simulation for economic modeling, and supplier risk scoring.
- **Collaboration**: Collaborative S&OP workflows.
- **Digital Twin**: Enterprise-grade supply chain digital twin with live snapshots and AI-powered natural language queries.
- **AI Assistant**: A conversational AI interface providing chat, proactive alerts, action automation, and context-aware insights, utilizing Replit AI Integrations (OpenAI) with graceful fallback. It maintains conversation context and handles follow-up questions. Now enhanced with cross-module smart insights for proactive suggestions.
- **Smart Insights Service**: A cross-module intelligence layer that aggregates data from regime analysis, inventory, suppliers, commodities, and RFQs to generate prioritized insights and compound risk alerts. Surfaces patterns that single data sources miss (e.g., low stock + at-risk supplier = compound risk alert).
- **Peer Benchmarking System**: Anonymized cost-sharing for competitive intelligence.
- **Demand Signal Repository**: Centralized hub for multi-source demand signals with analytics.
- **ROI Dashboard**: Visualizes procurement savings and forecast accuracy.
- **ERP Integration Templates**: Pre-built templates for major ERPs.
- **Onboarding Wizard**: A 3-step wizard for new users covering company setup, team invitations, and platform launch. Includes ref-based validation fallback for robust form handling.
- **Integration Health Monitoring**: Live connectivity health checks (GET /api/integrations/health) for all 18 configured integrations across 8 categories (data, ai, communication, payments, crm, ecommerce, productivity, project_management) with latency tracking, status categorization (healthy/degraded/offline/not_configured), and parallel execution.
- **Data Freshness Indicators**: Dashboard displays real-time data freshness status for regime analysis, allocations, and SKU data using TanStack Query's dataUpdatedAt. Color-coded indicators show fresh (<1min), recent (<5min), or stale (>5min) data with manual refresh capability.
- **Inventory Status Check (Allocation Flow)**: Pre-allocation inventory verification showing measured on-hand and inbound stock levels. Highlights materials with low stock (<10 units) and requires explicit acknowledgment before running allocation when low stock materials exist. No fabricated capacity metrics - only displays actual measured data for epistemic honesty.
- **Structural Confidence Display**: RegimeStatus component shows decomposed confidence (FDR Stability, Regime Maturity, Regime Stability, Data Quality) with progress bars, threshold ranges, regime duration, and transition probability warnings. Dashboard passes regimeEvidence and intelligence data from the API.
- **Graceful Degradation**: Regime API returns degraded responses with regime="UNKNOWN", fdr=0, and minimal confidence (10%) instead of 500 errors during data outages. Dashboard shows a degradation banner when data is unavailable.
- **Edge Case Resilience**: classifyRegimeFromFDR and classifyRegimeWithHysteresis guard against NaN, negative, and infinite FDR values, defaulting to safe behavior.
- **Prediction Tracking**: predictionOutcomes schema tracks predictions with FDR/regime context and resolves against actual outcomes with accuracy metrics (MAPE, directional accuracy).
- **Enterprise Automation Hardening**: Database-backed `AutomationEngine` (server/lib/automationEngine.ts) replaces all in-memory Maps with persistent storage. Uses automationRuntimeState, processedTriggerEvents, and automationSafeMode tables for durable state. Trigger deduplication via unique constraints prevents duplicate rule firing. Safe mode forces high-stakes actions (create_po, pause_orders) to require approval.
- **Durable Stripe Webhook Processing**: webhookHandlers.ts implements enterprise-grade webhook hardening with atomic insert-first locking (stripeProcessedEvents table as single source of truth), deterministic subscription state transition guards (monotonic ALLOWED_TRANSITIONS map preventing illegal regressions like active→incomplete), stale lock recovery (5-minute timeout with CAS takeover), parameterized SQL throughout (no sql.raw), and full audit logging for every transition, refund, and failure. All handlers are replay-safe, concurrent-safe, and horizontally scalable.
- **Structured Observability**: Enterprise-grade JSON logging (structuredLogger.ts) with automatic secret redaction (20+ sensitive keys) and database persistence for warn+ events to structured_event_log table.
- **RBAC for Automation**: Permissions for VIEW_AUTOMATION, EDIT_AUTOMATION, APPROVE_AUTOMATION, MANAGE_SAFE_MODE added to RBAC system. Admin and Procurement Manager roles include automation permissions.

### System Design Choices

The frontend is built with React, TypeScript, and Vite, using `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL is used for multi-tenant database management, enforcing data isolation via `companyId`. Authentication is handled via Replit Auth (OpenID Connect) with Express sessions. The system employs background polling services for data updates and WebSockets for live UI updates, including daily automated forecast retraining, real-time forecast accuracy tracking, automated RFQ generation, and peer benchmarking aggregation services.

## External Dependencies

-   **Database**: Neon Serverless PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect)
-   **Economic Data APIs**: FRED, Alpha Vantage, DBnomics, World Bank API, IMF Data API, OECD Stats API, Trading Economics, News API, Metals.Dev, and an internal economic fallback API (`https://api.factoryofthefuture.ai/economic-indicators`).
-   **Email Service**: SendPulse (for team invitations).
-   **Payment Processing**: Stripe.
-   **Communication & CRM**:
    -   Slack (for alerts and notifications).
    -   Twilio (for critical SMS alerts).
    -   Microsoft Teams (for alerts and notifications).
    -   HubSpot CRM (for contact/company sync and demand signals).
    -   Salesforce CRM (alternative CRM integration).
-   **Productivity & Project Management**:
    -   Google Sheets (data export/import).
    -   Google Calendar (S&OP meeting scheduling).
    -   Notion (knowledge base and documentation).
    -   Jira (issue tracking and project management).
    -   Linear (project tracking and issue management).
-   **E-commerce**:
    -   Shopify (e-commerce demand signals).
-   **NPM Packages (Key Examples)**:
    -   **Frontend**: `react`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `recharts`, `@radix-ui/*`, `class-variance-authority`, `cmdk`, `lucide-react`.
    -   **Backend**: `express`, `drizzle-orm`, `drizzle-zod`, `zod`, `passport`, `openid-client`, `axios`.
    -   **Database & Sessions**: `@neondatabase/serverless`, `connect-pg-simple`, `ws`.