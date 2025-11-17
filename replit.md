# Manufacturing Allocation Intelligence SaaS

## Overview

This Manufacturing Allocation Intelligence platform uses dual-circuit economic indicators to optimize raw material allocation, demand forecasting, and counter-cyclical procurement. It analyzes economic regimes (Healthy Expansion, Asset-Led Growth, Imbalanced Excess, Real Economy Lead) to generate policy signals for manufacturing and procurement strategies. The platform supports data-driven decisions for SKU demand forecasting, material allocation with priority weighting, counter-cyclical procurement timing using FDR (Financial-to-Real Divergence) metrics, budget/inventory optimization, and comprehensive machinery lifecycle management. The system now supports over 110 tradeable commodities, including specialty polymers, precious metals, rare earths, and advanced ceramics, with real-time commodity pricing capabilities. The new machinery management system tracks equipment value, depreciation across multiple methods, maintenance schedules, and replacement planning. Allocations support two modes: traditional SKU-based planning using demand forecasts and BOMs, or direct material requirements where users specify exact materials and quantities needed for budget duration planning with automatic cost calculations and coverage analysis. The platform features a comprehensive master materials catalog system allowing users to type and search any material from the full catalog, with automatic material and supplier pricing creation when users select materials not yet in their company database.

**New Features**: The platform now includes regulatory compliance management with document versioning and approval workflows, real-time production KPI dashboards with OEE (Overall Equipment Effectiveness) tracking, automated bottleneck detection, and continuous intelligence gathering from 15+ external economic APIs (FRED, Alpha Vantage, DBnomics, World Bank, IMF, OECD, Trading Economics). All features integrate with the dual-circuit economic thesis, tracking how economic regimes affect compliance requirements, production performance, and strategic decision-making.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript (Vite).
**UI Component System**: shadcn/ui on Radix UI, Material Design principles with Linear-inspired minimalism, Tailwind CSS.
**State Management**: TanStack Query for server state and caching; custom hooks for authentication.
**Routing**: Wouter.
**Key UI Patterns**: Dashboard-centric, KPI cards, data tables, charts for forecasts, regime status widgets, policy signals panels, machinery tracking cards with maintenance alerts.
**Educational Content**: "How It Works" page explaining dual-circuit economics, economic regimes, and platform components.
**Machinery Management**: Comprehensive equipment lifecycle tracking with depreciation calculators (straight-line, declining balance, units of production), maintenance scheduling, service warnings for overdue maintenance, replacement planning, and product URL linking for easy specification access.
**Materials Catalog UI**: Searchable combobox component enabling users to type and select from 110+ tradeable commodities with category filtering and live search functionality.

### Backend Architecture

**Framework**: Express.js with TypeScript (Node.js).
**API Design**: RESTful endpoints for authentication, economics, commodity pricing (including real-time for over 110 materials), SKUs, materials, allocations, machinery management, and master materials catalog access.
**Core Business Logic Modules**:
1.  **DualCircuitEconomics**: Calculates FDR ratio, determines economic regime, and generates policy signals.
2.  **DemandForecaster**: Produces regime-aware demand forecasts using exponential smoothing and moving averages.
3.  **AllocationEngine**: Constraint-based optimization for material allocation considering BOMs, availability, SKU priorities, budget, and budget duration planning with runway analysis.
4.  **CommodityPricing**: Real-time integration with Metals.Dev API for live commodity prices, with mock data fallback and support for 110+ tradeable commodities.
5.  **DepreciationCalculator**: Multi-method depreciation calculation library supporting straight-line, declining balance, and units of production methods with full schedule generation.
6.  **MaterialsCatalog**: Master catalog library (lib/materialsCatalog.ts) providing 110+ tradeable commodities with search functionality, category filtering, and estimated pricing; supports auto-creation of company materials and supplier pricing when users select catalog items.
7.  **ProductionKPIs**: OEE calculation engine implementing the industry-standard formula (Availability × Performance × Quality), cycle time analysis, and automated bottleneck detection from downtime patterns.
8.  **ExternalAPIs**: Comprehensive data aggregation from 15+ free-tier APIs including FRED (unlimited), Alpha Vantage (economic + sentiment, 25/day), DBnomics (22K+ datasets), World Bank, IMF, OECD, Trading Economics, and News API; calculates real-time FDR from external indicators and determines economic regimes.
**Data Access Layer**: Centralized storage interface (`server/storage.ts`) for CRUD operations.

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect.
**Database Provider**: Neon serverless PostgreSQL.
**Schema Design**: Multi-tenant schema including `companies`, `users`, `skus`, `materials` (110+ tradeable commodities), `boms`, `suppliers`, `supplier_materials`, `demand_history`, `allocations` (with budget duration tracking), `allocation_results` (with runway metrics), `price_alerts`, `machinery`, `maintenance_records`, `balance_sheets`, `income_statements`, `cash_flow_statements`, `supplier_machinery`, `price_history`, `price_recommendations`, `compliance_documents` (with version control and approval workflows), `compliance_regulations`, `compliance_audits` (with regime context), `compliance_approvals`, `production_runs` (with OEE data), `production_metrics` (availability, performance, quality), `downtime_events` (categorized and severity-tracked), and `production_bottlenecks` (automated detection and impact analysis).
**Session Management**: `sessions` table for Express session storage, supporting Replit Auth.
**Multi-tenancy**: All core entities include `companyId` for data isolation; robust security measures for route protection, resource ownership verification, and schema validation are implemented.

### Authentication & Authorization

**Authentication Provider**: Replit Auth (OpenID Connect).
**Session Management**: Express sessions stored in PostgreSQL, 7-day TTL, secure httpOnly cookies.
**Multi-Tenant Security**: All business API routes protected with `isAuthenticated` middleware; `companyId` derived from authenticated user session; 401/403 responses for unauthorized access; resource ownership verified for all CRUD operations.

### Build & Deployment

**Development**: `npm run dev` (Vite + Express API).
**Production Build**: `npm run build` (Vite for frontend, esbuild for server), `npm start` to run.
**Database Migrations**: `npm run db:push` (Drizzle Kit).

## External Dependencies

### Third-Party Services

**Database**: Neon Serverless PostgreSQL.
**Authentication**: Replit Auth (OpenID Connect).
**Economic Data APIs**: 
- FRED (Federal Reserve Economic Data): 800K+ indicators, unlimited free tier
- Alpha Vantage: Economic indicators + market sentiment, 25 requests/day
- DBnomics: 22K+ datasets from 82 providers (IMF, World Bank, OECD, etc.), unlimited
- World Bank API: 16K+ development indicators, unlimited
- IMF Data API: International financial statistics, free tier
- OECD Stats API: Labor, trade, productivity statistics, unlimited
- Trading Economics: 196 countries, 300+ indicators, limited free tier
- News API: Market news aggregation for sentiment, 100 requests/day
**Commodity Pricing API**: Metals.Dev (for real-time commodity prices).
**Internal Economic Fallback**: `https://api.factoryofthefuture.ai/economic-indicators` (optional fallback).

### Key NPM Packages

**Frontend Core**: `react`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `recharts`.
**UI Components**: `@radix-ui/*`, `class-variance-authority`, `cmdk`, `lucide-react`.
**Backend Core**: `express`, `drizzle-orm`, `drizzle-zod`, `zod`, `passport`, `openid-client`, `axios`.
**Database & Sessions**: `@neondatabase/serverless`, `connect-pg-simple`, `ws`.
**Development Tools**: `vite`, `tsx`, `esbuild`, `@replit/vite-plugin-*`.

### Asset Management

**Images**: Stored in `attached_assets/generated_images/`.
**Fonts**: Google Fonts (Inter, Roboto Mono, DM Sans, Fira Code, Geist Mono) via CDN.