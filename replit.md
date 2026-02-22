# Prescient Labs - Manufacturing Intelligence Platform

## Overview

Prescient Labs is a manufacturing intelligence platform aimed at optimizing procurement, production, and supply chain management. It provides foresight through demand forecasting, material allocation, and proactive operational adjustments. The platform operates on a performance-based pricing model, taking a tiered percentage of verified procurement savings.

Key capabilities include SKU demand forecasting, prioritized material allocation, counter-cyclical procurement timing, budget and inventory optimization, machinery lifecycle management, and real-time commodity pricing. Enterprise features extend to multi-tier supply chain network intelligence, automated purchase order execution, industry data consortium for benchmarking, M&A and regulatory compliance tracking, and real-time production KPI dashboards with automated bottleneck detection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is built with React and TypeScript, styled using `shadcn/ui` on Radix UI, adhering to Material Design principles with a minimalist aesthetic, and utilizing Tailwind CSS for styling. The interface is dashboard-centric, featuring KPI cards, data tables, charts, regime status widgets, and policy signals panels.

### Technical Implementations

The system is a multi-tenant application with robust data isolation per company. Core technical features include:
- **Economic Regime Intelligence**: A "Dual-circuit FDR model" for economic regime determination and procurement timing signals.
- **Demand Forecasting**: Regime-aware, multi-horizon forecasting with automated retraining and real-time MAPE tracking.
- **Optimization Engines**: Constraint-based material allocation and budget optimization.
- **Real-time Data**: Integration for real-time commodity pricing and production KPIs.
- **Automated Processes**: Automated RFQ generation and bottleneck detection.
- **Supply Chain Visibility**: Multi-tier supplier mapping, network graph visualization, and geopolitical/event monitoring.
- **Decision Support**: Prescriptive action playbooks, scenario simulation, and supplier risk scoring.
- **Collaboration**: Collaborative S&OP workflows.
- **Digital Twin**: Enterprise-grade supply chain digital twin with live snapshots and AI-powered natural language queries.
- **AI Assistant**: Conversational AI interface with chat, proactive alerts, action automation, and context-aware insights, utilizing Replit AI Integrations (OpenAI) with graceful fallback and cross-module smart insights.
- **Smart Insights Service**: Cross-module intelligence layer for prioritized insights and compound risk alerts.
- **Peer Benchmarking System**: Anonymized cost-sharing for competitive intelligence.
- **Demand Signal Repository**: Centralized hub for multi-source demand signals.
- **ROI Dashboard**: Visualizes procurement savings and forecast accuracy.
- **ERP Integration Templates**: Pre-built templates for major ERPs.
- **Onboarding Wizard**: A 3-step wizard for new user setup.
- **Integration Health Monitoring**: Live connectivity health checks for all configured integrations with status categorization and latency tracking.
- **Data Freshness Indicators**: Dashboard displays real-time data freshness status for key modules.
- **Inventory Status Check (Allocation Flow)**: Pre-allocation inventory verification with low stock highlights and acknowledgment requirements.
- **Structural Confidence Display**: RegimeStatus component shows decomposed confidence for economic regimes.
- **Graceful Degradation**: API returns degraded responses for economic data during outages to prevent 500 errors.
- **Edge Case Resilience**: Robust handling for NaN, negative, and infinite FDR values in regime classification.
- **Prediction Tracking**: Tracks predictions against actual outcomes with accuracy metrics.
- **Enterprise Automation Hardening**: Database-backed `AutomationEngine` with persistent storage, trigger deduplication, and safe mode for high-stakes actions.
- **Atomic Integration Idempotency**: Ensures event processing idempotency using unique constraints.
- **Tenant Isolation Hardening**: Enforces tenant isolation across all critical operations and data structures.
- **Guardrail Escalation Events**: Logs escalation events when guardrails block actions.
- **Durable Stripe Webhook Processing**: Enterprise-grade webhook handling with atomic locking, state transition guards, stale lock recovery, and full audit logging.
- **Structured Observability**: Enterprise-grade JSON logging with secret redaction and database persistence.
- **RBAC for Automation**: Comprehensive RBAC permissions for automation features.
- **Enterprise E2E Certification Harness v8.0.0**: 14-gate certification with 241 tests for enterprise readiness.
- **Offline Evaluation & Calibration**: Harness for historical data evaluation and calibration of forecasts and allocations.
- **AI Copilot (Insight-Only)**: Read-only DB query with evidence-first responses and draft-only action system requiring approval.
- **Decision Intelligence**: Policy layer translates data into recommended parameters with what-if simulations and logged decision overrides.
- **Data Quality Scoring**: Scores materials, suppliers, and SKU demand, blocking automation if quality thresholds are not met.
- **Comparative Benchmark Layer**: Deterministic baseline forecasters for comparative analysis and lift reports.
- **Regime-Conditioned Forecasting**: Forecast noise varies by economic regime for more accurate predictions.
- **Probabilistic Decision Optimization**: Monte Carlo reorder quantity optimization with configurable demand samples and what-if scenarios.
- **Regime Stability Backtest**: Historical FDR series analysis for regime transition detection and stability.
- **Auditable Counterfactual Savings**: Immutable savings evidence records with strict estimated vs measured savings separation.
- **Copilot Evidence Traceability**: Evidence bundles attached to all copilot responses and action drafts for auditability.
- **Enterprise Identity & Access**: SSO/SAML configuration, SCIM provisioning stubs, and audit export with redaction and retention controls.
- **Pilot Evaluation Mode**: Side-by-side controlled experimentation with baseline vs regime-aware optimized policy simulation. Locked comparison windows, 5-metric tracking (service level, stockout rate, expedite spend, working capital, realized savings), strict estimated/measured savings separation, immutable config snapshots with SHA-256 hash integrity, reproducible JSON+MD artifacts, deterministic replay, and zero production mutation guarantee. API: POST /api/pilot-experiments/run, GET /api/pilot-experiments, replay, audit.
- **Adaptive Forecasting Layer**: Dynamic model weighting by regime with inverse-error normalization, heteroskedastic volatility modeling with regime-specific base volatility and auto-expansion, CVaR/expected shortfall tail-risk metrics for demand and supply, regime-transition prediction scoring with leading indicator integration, signal strength scoring with measured forward predictive lift, rolling lift decay analysis with half-life and persistence metrics, and automatic uncertainty band expansion when forecast error exceeds tolerance. Versioned predictive stability reports with provenance v5.0.0 evidence bundles. All deterministic under seeded evaluation. API: POST /api/adaptive-forecast/analyze, GET /api/adaptive-forecast/reports.
- **Stress Testing & Robustness Module**: Simulates extreme demand spikes, supplier outages, price shocks, lead-time disruptions, and compound crises across moderate/severe/extreme severity levels. Measures optimization stability under stress (service level degradation, stockout risk increase), verifies uncertainty expansion and automation downgrade behavior (approval_required → manual_only → emergency_halt), tracks CVaR behavior during tail scenarios with tail risk amplification metrics, and generates versioned Robustness & Stability Reports with provenance v6.0.0 evidence bundles. Includes safe-mode escalation assessment and explainable downgrade trigger reasons. All deterministic under seeded evaluation with zero production mutations. API: POST /api/stress-test/run, GET /api/stress-test/reports.
- **Revenue-Optimized Execution Layer**: Pilot Revenue Dashboard surfacing 5 key ROI metrics (Service Level Improvement, Stockout Reduction, Expedite Spend Reduction, Working Capital Impact, Realized Savings) with strict estimated vs measured savings separation. Executive report generator producing JSON artifacts, markdown summaries, and PDF-ready structure with baseline vs optimized comparison windows, stress resilience summaries, CVaR tail-risk containment, regime exposure summaries, immutable experiment hashes, and deterministic replay IDs. Rate-limited report generation with per-tenant counters. Landing Mode configuration for simplified ROI-focused UI posture. API: GET /api/pilot/revenue-dashboard, POST /api/pilot/generate-executive-report, GET /api/pilot/executive-reports, GET/POST /api/landing-mode.

### System Design Choices

The frontend is built with React, TypeScript, and Vite, using `wouter` for routing and TanStack Query for server state management. The backend is an Express.js application with TypeScript, providing RESTful APIs. Drizzle ORM with Neon serverless PostgreSQL is used for multi-tenant database management and data isolation. Authentication is handled via Replit Auth (OpenID Connect) with Express sessions. The system employs background polling services for data updates and WebSockets for live UI updates, including daily automated forecast retraining, real-time forecast accuracy tracking, automated RFQ generation, and peer benchmarking aggregation services.

## External Dependencies

-   **Database**: Neon Serverless PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect)
-   **Economic Data APIs**: FRED, Alpha Vantage, DBnomics, World Bank API, IMF Data API, OECD Stats API, Trading Economics, News API, Metals.Dev, and an internal economic fallback API (`https://api.factoryofthefuture.ai/economic-indicators`).
-   **Email Service**: SendPulse
-   **Payment Processing**: Stripe
-   **Communication & CRM**: Slack, Twilio, Microsoft Teams, HubSpot CRM, Salesforce CRM
-   **Productivity & Project Management**: Google Sheets, Google Calendar, Notion, Jira, Linear
-   **E-commerce**: Shopify