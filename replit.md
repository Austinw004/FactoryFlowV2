# Manufacturing Allocation Intelligence SaaS

## Overview

This platform is an AI-powered SaaS solution designed to optimize raw material allocation, demand forecasting, and procurement for manufacturing. It leverages a dual-circuit economic model to analyze economic regimes (Healthy Expansion, Asset-Led Growth, Imbalanced Excess, Real Economy Lead), generating strategic policy signals. Key capabilities include SKU demand forecasting, prioritized material allocation, counter-cyclical procurement using Financial-to-Real Divergence (FDR) metrics, budget/inventory optimization, and comprehensive machinery lifecycle management. The system supports over 110 tradeable commodities with real-time pricing and features a master materials catalog for streamlined material and supplier management.

The platform provides unified UI tools for **Strategic Analysis** (Economic Scenario Simulation, Geopolitical Risk Assessment, Theory Validation) and **Supply Chain Intelligence** (Material Traceability, Supplier Network monitoring). New enterprise features include multi-tier **Supply Chain Network Intelligence** with FDR-aware risk scoring, **Automated Purchase Order Execution** with regime-aware triggers, an **Industry Data Consortium** for peer benchmarking and collaborative forecasting, and **M&A Intelligence** for acquisition target scoring and divestiture timing. It also incorporates regulatory compliance management, real-time production KPI dashboards with OEE tracking, automated bottleneck detection, and continuous intelligence from over 15 external economic APIs. Advanced features like AI-driven auto-purchasing, email ingestion for supplier communication analysis, and background research validation are also integrated.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (November 23, 2025)

### Enterprise-Grade SaaS Enhancements
**Comprehensive Settings System**: Transformed Configuration page from 4 tabs to 9 comprehensive tabs covering all enterprise needs.
**Budget Time Duration**: Enhanced budget tracking with start/end date configuration for precise budget period management.
**Email Processing & Forwarding**: Future-proof email ingestion system with forwarding addresses, processing consent, retention policies (30-365 days), and NLP auto-tagging.
**AI Assistant Settings**: Granular data access permissions for future chatbot integration - control access to financials, suppliers, allocations, and emails.
**API & Integrations**: API access management, API key generation (client-side demonstration), webhook configuration for real-time notifications.
**Data & Privacy**: Configurable retention policies (minimal/standard/extended/permanent), auto-anonymization, export format preferences (JSON/CSV/Excel).
**Company Branding**: Logo URL, primary color picker, timezone selection for global operations.
**Empty States**: Proper empty state handling for new companies - no fake seed data, clean onboarding experience.

## System Architecture

### Frontend

**Framework**: React with TypeScript (Vite).
**UI/UX**: shadcn/ui on Radix UI, Material Design principles with Linear-inspired minimalism, Tailwind CSS. Dashboard-centric design with KPI cards, data tables, charts, regime status widgets, and policy signals panels.
**State Management**: TanStack Query for server state; custom hooks for authentication.
**Routing**: Wouter.
**Key Features**: Comprehensive machinery tracking, searchable materials catalog, unified strategic analysis interface, budget management with time duration, enterprise settings with 9 configuration tabs (Company, Budget, Economic, Alerts, Communications, Integrations, Data & Privacy, AI Assistant, Branding).
**Educational Content**: "How It Works" page explaining dual-circuit economics.

### Backend

**Framework**: Express.js with TypeScript (Node.js).
**API Design**: RESTful for authentication, economics, commodities, SKUs, materials, allocations, and machinery.
**Core Business Logic**:
- **DualCircuitEconomics**: Calculates FDR, determines economic regimes, generates policy signals.
- **DemandForecaster**: Regime-aware forecasting using exponential smoothing and moving averages.
- **AllocationEngine**: Constraint-based optimization for material allocation considering BOMs, availability, priorities, and budget duration.
- **CommodityPricing**: Real-time integration with Metals.Dev API for 110+ commodities, with mock data fallback.
- **DepreciationCalculator**: Multi-method depreciation (straight-line, declining balance, units of production).
- **MaterialsCatalog**: Master catalog with search, filtering, and auto-creation of company materials/supplier pricing.
- **ProductionKPIs**: OEE calculation, cycle time analysis, automated bottleneck detection.
- **ExternalAPIs**: Aggregates data from 15+ economic APIs for real-time FDR and regime determination.
- **ResearchValidation**: Background system for historical backtesting of the dual-circuit theory.
**Data Access Layer**: Centralized interface (`server/storage.ts`) for CRUD.
**Real-time & Automation**: 8 background polling services for continuous data updates, WebSocket for live UI updates, automatic procurement scheduling with FDR triggers, AI-driven auto-purchasing recommendations, and NLP-powered email ingestion for supplier communication analysis.

### Database

**ORM**: Drizzle ORM with PostgreSQL dialect.
**Provider**: Neon serverless PostgreSQL.
**Schema Design**: Multi-tenant with `companyId` for data isolation across all core entities. Extensive schema supporting SKUs, materials, BOMs, suppliers, demand, allocations, machinery, maintenance, financial statements, compliance, production KPIs, workforce management, automated purchasing (PO, usage tracking, schedules, recommendations, email analysis), and non-user-facing research validation tables.

**Enterprise Settings**: Companies table includes 20+ enterprise-grade fields:
- Budget management with time duration (budgetStartDate, budgetEndDate)
- Email processing & forwarding (emailForwardingEnabled, emailForwardingAddress, emailProcessingConsent, emailRetentionDays, emailAutoTagging)
- AI/Chatbot permissions (aiChatbotEnabled, aiDataAccessConsent, aiCanAccessFinancials, aiCanAccessSupplierData, aiCanAccessAllocations, aiCanAccessEmails)
- API & integration settings (apiAccessEnabled, apiKey, webhookUrl, webhookEvents)
- Data retention & privacy (dataRetentionPolicy, anonymizeOldData, exportDataFormat)
- Company branding (logoUrl, primaryColor, timezone)
- Onboarding & feature flags (onboardingCompleted, showOnboardingHints)
- Extended notification preferences (enableAllocationAlerts, enablePriceAlerts)

**Session Management**: `sessions` table for Express session storage.

### Authentication & Authorization

**Authentication**: Replit Auth (OpenID Connect).
**Session Management**: Express sessions (7-day TTL, secure httpOnly cookies).
**Security**: `isAuthenticated` middleware, `companyId` derived from session, 401/403 responses for unauthorized access, resource ownership verification.

### Build & Deployment

**Development**: `npm run dev` (Vite + Express).
**Production**: `npm run build` (Vite for frontend, esbuild for server), `npm start`.
**Migrations**: `npm run db:push` (Drizzle Kit).

## External Dependencies

### Third-Party Services

-   **Database**: Neon Serverless PostgreSQL.
-   **Authentication**: Replit Auth (OpenID Connect).
-   **Economic Data APIs**: FRED, Alpha Vantage, DBnomics, World Bank API, IMF Data API, OECD Stats API, Trading Economics, News API.
-   **Commodity Pricing API**: Metals.Dev.
-   **Internal Economic Fallback**: `https://api.factoryofthefuture.ai/economic-indicators` (optional).

### Key NPM Packages

-   **Frontend**: `react`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `recharts`, `@radix-ui/*`, `class-variance-authority`, `cmdk`, `lucide-react`.
-   **Backend**: `express`, `drizzle-orm`, `drizzle-zod`, `zod`, `passport`, `openid-client`, `axios`.
-   **Database & Sessions**: `@neondatabase/serverless`, `connect-pg-simple`, `ws`.
-   **Development**: `vite`, `tsx`, `esbuild`, `@replit/vite-plugin-*`.

### Asset Management

-   **Images**: `attached_assets/generated_images/`.
-   **Fonts**: Google Fonts (Inter, Roboto Mono, DM Sans, Fira Code, Geist Mono) via CDN.