# Prescient Labs - Manufacturing Intelligence Platform

## Overview

Prescient Labs is a manufacturing intelligence platform designed to optimize procurement, production, and supply chain management. It provides advanced demand forecasting, intelligent material allocation, and proactive operational adjustments to enhance efficiency and profitability for manufacturers. Key capabilities include budget and inventory optimization, machinery lifecycle management, real-time commodity pricing, multi-tier supply chain intelligence, automated purchasing, industry benchmarking, compliance tracking, and real-time production KPI dashboards with bottleneck detection. The platform operates on a performance-based business model, with pricing tiered to verified procurement savings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is a dashboard-centric application built with React and TypeScript, utilizing `shadcn/ui` on Radix UI and styled with Tailwind CSS. It follows Material Design principles and a minimalist aesthetic, featuring KPI cards, data tables, charts, regime status widgets, and policy signals panels.

### Technical Implementations

The system is a multi-tenant application with robust data isolation. Key features include:
- **Economic Regime Intelligence**: A "Dual-circuit FDR model" for economic regime determination and procurement timing.
- **Demand Forecasting**: Regime-aware, multi-horizon forecasting with automated retraining and real-time MAPE tracking.
- **Optimization Engines**: Constraint-based material allocation and budget optimization.
- **Real-time Data Integration**: For commodity pricing and production KPIs.
- **Automated Processes**: RFQ generation and bottleneck detection.
- **Supply Chain Visibility**: Multi-tier supplier mapping, network graph visualization, and geopolitical monitoring.
- **Decision Support**: Prescriptive action playbooks, scenario simulation, and supplier risk scoring.
- **Collaboration**: Collaborative S&OP workflows.
- **Digital Twin**: Enterprise-grade supply chain digital twin with live snapshots and AI-powered natural language queries.
- **AI Assistant**: Conversational AI with chat, proactive alerts, action automation, and context-aware insights, utilizing Replit AI Integrations.
- **Smart Insights Service**: Cross-module intelligence for prioritized insights and compound risk alerts.
- **Peer Benchmarking System**: Anonymized cost-sharing for competitive intelligence.
- **Demand Signal Repository**: Centralized hub for multi-source demand signals.
- **ROI Dashboard**: Visualizes procurement savings and forecast accuracy.
- **ERP Integration Templates**: Pre-built templates for major ERPs.
- **Enterprise Authentication**: Full email/password authentication, account lockout, JWT access/refresh tokens, IP/device fingerprint tracking, and Enterprise SSO (SAML 2.0, Google OAuth).
- **Enterprise Billing**: Six plans including usage-based and performance-based models, integrating with Stripe for customer management and metered billing. Performance-based billing is ROI-linked, charging only on verified, measured savings with a strict evidence chain.
- **Procurement Execution Engine**: Manages end-to-end purchase execution, validating AI recommendations, running fraud checks, and processing payments via Stripe PaymentIntent or Purchase Orders with a full audit trail.
- **Fraud Detection**: Real-time risk scoring with rules-based blocking or approval requirements, logging all events immutably.
- **Enterprise Payment Processing**: Handles Stripe webhooks for various payment and subscription events, supports creating and confirming payment intents, and managing supplier payouts.
- **Enterprise Automation Hardening**: Database-backed `AutomationEngine` with persistent storage, trigger deduplication, and safe mode, alongside atomic integration idempotency and tenant isolation hardening.
- **Guardrail Escalation Events**: Logs events when guardrails block actions.
- **Durable Stripe Webhook Processing**: Enterprise-grade webhook handling with atomic locking and audit logging.
- **Structured Observability**: Enterprise-grade JSON logging with secret redaction and database persistence.
- **RBAC for Automation**: Comprehensive permissions for automation features.
- **Enterprise E2E Certification Harness**: Extensive certification with live harness tests, including economic truth validation and SOC 2 primitives.
- **AI Copilot Governance**: A 12-rule non-negotiable enforcement layer for AI copilot outputs, ensuring zero hallucination, trust scoring, fail-closed behavior, economic validity checks, draft-only actions, and structured output schemas.
- **Adversarial Input Defense Layer**: A 10-rule system prompt block enforcing anti-prompt-injection rules, blocking unsafe requests, and protecting core system information.
- **Executive Summary Translator**: A 6-section executive brief format for all AI responses, focusing on financial impact, recommendations, key drivers, risks, and counterfactuals, free of jargon.

### System Design Choices

The frontend uses React, TypeScript, and Vite, with `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL handles multi-tenant database management. Authentication is managed via Replit Auth (OpenID Connect) with Express sessions. The system uses background polling services and WebSockets for real-time data updates, forecast retraining, RFQ generation, and peer benchmarking aggregation.

## External Dependencies

-   **Database**: Neon Serverless PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect)
-   **Economic Data APIs**: FRED, Alpha Vantage, DBnomics, World Bank API, IMF Data API, OECD Stats API, Trading Economics, News API, Metals.Dev
-   **Email Service**: SendPulse
-   **Payment Processing**: Stripe
-   **Communication & CRM**: Slack, Twilio, Microsoft Teams, HubSpot CRM, Salesforce CRM
-   **Productivity & Project Management**: Google Sheets, Google Calendar, Notion, Jira, Linear
-   **E-commerce**: Shopify