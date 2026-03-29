# Prescient Labs - Manufacturing Intelligence Platform

## Overview

Prescient Labs is a manufacturing intelligence platform designed to optimize procurement, production, and supply chain management. It delivers foresight through advanced demand forecasting, intelligent material allocation, and proactive operational adjustments. The platform aims to enhance efficiency and profitability for manufacturers by providing tools for budget and inventory optimization, machinery lifecycle management, and real-time commodity pricing. Enterprise features include multi-tier supply chain intelligence, automated purchasing, industry benchmarking, compliance tracking, and real-time production KPI dashboards with bottleneck detection. The business model is performance-based, with pricing tiered to verified procurement savings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is a dashboard-centric application built with React and TypeScript, leveraging `shadcn/ui` on Radix UI and styled with Tailwind CSS. It adheres to Material Design principles and a minimalist aesthetic, featuring KPI cards, data tables, charts, regime status widgets, and policy signals panels.

### Technical Implementations

The system is a multi-tenant application ensuring robust data isolation per company. Key technical features include:
- **Economic Regime Intelligence**: A "Dual-circuit FDR model" for economic regime determination and procurement timing signals.
- **Demand Forecasting**: Regime-aware, multi-horizon forecasting with automated retraining and real-time MAPE tracking.
- **Optimization Engines**: Constraint-based material allocation and budget optimization.
- **Real-time Data Integration**: For commodity pricing and production KPIs.
- **Automated Processes**: RFQ generation and bottleneck detection.
- **Supply Chain Visibility**: Multi-tier supplier mapping, network graph visualization, and geopolitical monitoring.
- **Decision Support**: Prescriptive action playbooks, scenario simulation, and supplier risk scoring.
- **Collaboration**: Collaborative S&OP workflows.
- **Digital Twin**: Enterprise-grade supply chain digital twin with live snapshots and AI-powered natural language queries.
- **AI Assistant**: Conversational AI with chat, proactive alerts, action automation, and context-aware insights, utilizing Replit AI Integrations (OpenAI).
- **Smart Insights Service**: Cross-module intelligence for prioritized insights and compound risk alerts.
- **Peer Benchmarking System**: Anonymized cost-sharing for competitive intelligence.
- **Demand Signal Repository**: Centralized hub for multi-source demand signals.
- **ROI Dashboard**: Visualizes procurement savings and forecast accuracy.
- **ERP Integration Templates**: Pre-built templates for major ERPs.
- **Onboarding Wizard**: A 3-step setup process for new users.
- **Integration Health Monitoring**: Live connectivity checks with status and latency tracking.
- **Data Freshness Indicators**: Real-time status display for key modules.
- **Inventory Status Check**: Pre-allocation verification with low stock highlights.
- **Structural Confidence Display**: Shows decomposed confidence for economic regimes.
- **Graceful Degradation**: API returns degraded responses for economic data during outages.
- **Prediction Tracking**: Tracks predictions against actual outcomes with accuracy metrics.
- **Enterprise Automation Hardening**: Database-backed `AutomationEngine` with persistent storage, trigger deduplication, and safe mode.
- **Atomic Integration Idempotency**: Ensures event processing idempotency.
- **Tenant Isolation Hardening**: Enforces isolation across all critical operations.
- **Guardrail Escalation Events**: Logs events when guardrails block actions.
- **Durable Stripe Webhook Processing**: Enterprise-grade webhook handling with atomic locking and audit logging.
- **Structured Observability**: Enterprise-grade JSON logging with secret redaction and database persistence.
- **RBAC for Automation**: Comprehensive permissions for automation features.
- **Enterprise E2E Certification Harness**: Extensive certification with live harness tests, including economic truth validation, adversarial validation, SOC 2 primitives, and real news ingestion.
- **Offline Evaluation & Calibration**: Harness for historical data evaluation and calibration.
- **AI Copilot (Insight-Only)**: Read-only DB query with evidence-first responses and draft-only action system.
- **Decision Intelligence**: Policy layer translating data into recommended parameters with what-if simulations.
- **Data Quality Scoring**: Scores materials, suppliers, and SKU demand, blocking automation if thresholds are not met.
- **Comparative Benchmark Layer**: Deterministic baseline forecasters for comparative analysis.
- **Regime-Conditioned Forecasting**: Forecast noise varies by economic regime.
- **Probabilistic Decision Optimization**: Monte Carlo reorder quantity optimization.
- **Regime Stability Backtest**: Historical FDR series analysis for regime transition detection.
- **Auditable Counterfactual Savings**: Immutable savings evidence records.
- **Copilot Evidence Traceability**: Evidence bundles attached to all copilot responses.
- **Enterprise Identity & Access**: SSO/SAML configuration, SCIM provisioning, and audit export.
- **Pilot Evaluation Mode**: Side-by-side controlled experimentation with baseline vs. optimized policy simulation, tracking 5 key metrics.
- **Adaptive Forecasting Layer**: Dynamic model weighting by regime, heteroskedastic volatility modeling, tail-risk metrics, and uncertainty band expansion.
- **Stress Testing & Robustness Module**: Simulates extreme scenarios to measure optimization stability and verify automation downgrade behavior.
- **Revenue-Optimized Execution Layer**: Pilot Revenue Dashboard for ROI metrics, executive report generation, and Landing Mode configuration.
- **Real News Ingestion & Verification System**: RSS-based ingestion from curated feeds with strict validation, deduplication, relevance scoring, and content enrichment.
- **Decision Win-Rate Learning Loop**: Persistent outcome tracking, win-rate computation, performance guardrails, and adaptive model blending.
- **System Directive v1 (AI Copilot Governance)**: A 12-rule non-negotiable enforcement layer governing all AI copilot outputs. Rules include: zero hallucination (every number from DB/computed/explicit input), trust scoring (evidence completeness 40% + win rate 40% + freshness 20%), fail-closed behavior (trustScore < 0.4 → `LOW_TRUST_BLOCKED_DECISION`, < 0.6 → approval required), economic validity check before any financial output, draft-only action outputs, and structured output schema with `trustScore`, `requiresApproval`, `automationBlocked`, `flags`, `keyDrivers`, `riskFactors`, `directiveEvidenceBundle`. Implemented in `server/lib/copilotDirective.ts`; directive prepended verbatim to every OpenAI call's system prompt via `aiAssistant.ts`; full directive fields computed and returned from `queryCopilot()` in `copilotService.ts`.

### System Design Choices

The frontend uses React, TypeScript, and Vite, with `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL handles multi-tenant database management. Authentication is managed via Replit Auth (OpenID Connect) with Express sessions. The system uses background polling services and WebSockets for real-time data updates, forecast retraining, RFQ generation, and peer benchmarking aggregation.

## External Dependencies

-   **Database**: Neon Serverless PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect)
-   **Economic Data APIs**: FRED, Alpha Vantage, DBnomics, World Bank API, IMF Data API, OECD Stats API, Trading Economics, News API, Metals.Dev, and an internal economic fallback API.
-   **Email Service**: SendPulse
-   **Payment Processing**: Stripe
-   **Communication & CRM**: Slack, Twilio, Microsoft Teams, HubSpot CRM, Salesforce CRM
-   **Productivity & Project Management**: Google Sheets, Google Calendar, Notion, Jira, Linear
-   **E-commerce**: Shopify