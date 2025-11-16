# Manufacturing Allocation Intelligence SaaS

## Overview

This is a Manufacturing Allocation Intelligence platform that uses dual-circuit economic indicators to optimize raw material allocation, demand forecasting, and counter-cyclical procurement decisions. The system analyzes economic regimes (Healthy Expansion, Asset-Led Growth, Imbalanced Excess, Real Economy Lead) and generates policy signals to guide manufacturing and procurement strategies.

The platform helps manufacturers make data-driven decisions about:
- SKU demand forecasting with regime-aware adjustments
- Material allocation across products with priority weighting
- Counter-cyclical procurement timing based on FDR (Financial-to-Real Divergence) metrics
- Budget optimization and inventory management

## Recent Changes

**November 16, 2025**:
- **COMMODITY TRADING EXPANSION**: Massively expanded materials database from 47 to **110+ tradeable commodities** enabling full commodity trading capabilities
  - Specialty High-Performance Polymers (7): PEEK, PVDF, PTFE (Teflon), Polyimide (Kapton), PPS, Polysulfone, PEI (Ultem)
  - Precious Metals (6): Gold, Silver, Platinum, Palladium, Rhodium, Iridium
  - Rare Earth Metals (8): Neodymium, Dysprosium, Lanthanum, Cerium, Praseodymium, Europium, Terbium, Yttrium
  - Specialty Alloys & Superalloys (5): Inconel 625, Hastelloy C-276, Monel 400, Waspaloy, Cobalt-Chrome
  - Semiconductor Materials (5): Silicon Wafer, Gallium Arsenide, Germanium, Gallium Nitride, Indium Tin Oxide
  - Battery & Energy Storage Materials (6): Lithium Carbonate, Lithium Hydroxide, Cobalt Oxide, Battery-Grade Graphite, Nickel Sulfate, Manganese Sulfate
  - Advanced Ceramics (5): Advanced Alumina, Zirconia, Silicon Carbide, Silicon Nitride, Boron Carbide
  - Industrial Chemicals (8): Sulfuric Acid, Hydrochloric Acid, Sodium Hydroxide, Ammonia, Methanol, Ethanol, Acetone, Toluene
  - Technology Metals (10): Indium, Tellurium, Selenium, Bismuth, Antimony, Molybdenum, Tungsten, Vanadium, Tantalum, Niobium
- **REAL-TIME COMMODITY PRICING**: Integrated live commodity pricing API system with Metals.Dev
  - API service layer (`server/lib/commodityPricing.ts`) for fetching real-time metal and commodity prices
  - Three API endpoints: `/api/commodities/prices` (all), `/api/commodities/prices/:materialCode` (single), `/api/commodities/prices/bulk` (batch)
  - Live pricing display on Configuration page with 24-hour price changes and trend indicators (green up/red down)
  - Auto-refresh every 5 minutes
  - Graceful fallback to realistic mock data when API key not configured
  - Supports optional `METALS_API_KEY` environment variable for real-time data (free tier: 100 requests/month)
- Updated BOMs and supplier materials to include pricing for specialty commodities (PEEK $125/kg, Gold $2050/oz, Rhodium $4800/oz, etc.)
- Corrected grammar throughout "How It Works" page for professional, complete sentences

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: 
- shadcn/ui component library built on Radix UI primitives
- Material Design principles with Linear-inspired minimalism
- Tailwind CSS for styling with custom design tokens
- Design system follows enterprise data visualization patterns optimized for manufacturing data

**State Management**:
- TanStack Query (React Query) for server state management and API data caching
- Custom hooks for authentication (`useAuth`) and common UI patterns
- No global client-side state management - server state driven approach

**Routing**: Wouter for lightweight client-side routing

**Key UI Patterns**:
- Dashboard-centric layout with sidebar navigation
- KPI cards for metrics display (FDR score, budget health, fill rates)
- Data tables for allocation planning with sortable columns
- Charts for forecast visualization (historical vs. predicted demand)
- Regime status widgets showing current economic conditions
- Policy signals panels with intensity indicators

**Educational Content**:
- Comprehensive "How It Works" page explaining dual-circuit economics, four economic regimes, competitive advantages over traditional ERP systems
- Interactive accordion with platform component details (Forecasting, Allocation, Procurement, Reporting, Configuration)
- Vocabulary glossary with 12 key terms

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful endpoints organized by domain:
- `/api/auth/*` - Authentication and user management
- `/api/economics/*` - Economic regime and FDR calculations
- `/api/commodities/prices` - Real-time commodity pricing (all tradeable materials)
- `/api/commodities/prices/:materialCode` - Single commodity price lookup
- `/api/commodities/prices/bulk` - Batch commodity price fetching
- `/api/skus` - Product SKU management
- `/api/materials` - Raw material inventory
- `/api/allocations` - Allocation engine results
- `/api/seed` - Demo data generation

**Core Business Logic Modules**:

1. **DualCircuitEconomics** (`server/lib/economics.ts`): Calculates Financial-to-Real Divergence (FDR) ratio by comparing asset market growth vs. real economy indicators (manufacturing PMI, core PCE, commercial loans, margin debt). Determines economic regime and generates policy signals.

2. **DemandForecaster** (`server/lib/forecasting.ts`): Produces regime-aware demand forecasts using exponential smoothing and moving averages, adjusting predictions based on current economic regime (e.g., reducing forecasts during Imbalanced Excess, increasing during Real Economy Lead).

3. **AllocationEngine** (`server/lib/allocation.ts`): Constraint-based optimization that allocates materials across SKUs considering:
   - Bill of Materials (BOM) requirements
   - Material availability (on-hand + inbound)
   - SKU priorities
   - Budget constraints
   - Policy knobs (inventory buffers, credit terms, capex gates)

4. **CommodityPricing** (`server/lib/commodityPricing.ts`): Real-time commodity pricing integration enabling commodity trading capabilities:
   - Integrates with Metals.Dev API for live precious/industrial metal prices
   - Maps material codes to trading symbols (XAU for gold, LME-XCU for copper, etc.)
   - Provides realistic mock pricing for 110+ commodities when API unavailable
   - Includes 24-hour price changes and percentage movements
   - Supports batch fetching for performance optimization

**Data Access Layer**: Centralized storage interface (`server/storage.ts`) abstracts database operations with methods for CRUD operations on all entities.

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Provider**: Neon serverless PostgreSQL with WebSocket connections

**Schema Design** (`shared/schema.ts`):

**Core Entities**:
- `companies` - Multi-tenant organization data
- `users` - User accounts with Replit Auth integration, linked to companies
- `skus` - Product definitions with priority weighting
- `materials` - Raw material inventory tracking (on-hand, inbound quantities). Seed data includes **110+ tradeable commodities** across 14 categories: metals (10), plastics/polymers (9), specialty high-performance polymers (7), composites (3), rubber (3), textiles (3), wood/paper (3), glass/ceramics (2), advanced ceramics (5), chemicals/adhesives (4), industrial chemicals (8), electronics (3), packaging (2), precious metals (6), rare earth metals (8), specialty alloys (5), semiconductor materials (5), battery materials (6), and technology metals (10). Materials range from common manufacturing inputs to high-value commodities like PEEK, gold, platinum, rare earths, and specialty superalloys.
- `boms` - Bill of Materials linking SKUs to required materials with quantities
- `suppliers` - Supplier master data with lead times
- `supplier_materials` - Junction table for supplier-material pricing. Seed includes realistic pricing/lead times for all commodity categories (e.g., PEEK $125/kg, Gold $2050/oz, Rhodium $4800/oz, Inconel $55/kg, Lithium Carbonate $18.50/kg)
- `demand_history` - Historical demand data for forecasting
- `allocations` - Saved allocation plan snapshots
- `allocation_results` - Detailed allocation outputs per SKU

**Session Management**: 
- `sessions` table for Express session storage (connect-pg-simple)
- Supports Replit Auth with OpenID Connect

**Multi-tenancy**: All core entities include `companyId` foreign key with cascade deletion for data isolation.

### Authentication & Authorization

**Authentication Provider**: Replit Auth using OpenID Connect

**Session Management**: 
- Express sessions stored in PostgreSQL
- 7-day session TTL with secure, httpOnly cookies
- Session middleware configured in `server/replitAuth.ts`

**Multi-Tenant Security Implementation** (Production-Ready):

**Route Protection**:
- ALL business API routes protected with `isAuthenticated` middleware
- CompanyId always derived from authenticated user session (req.user.claims.sub → user.companyId)
- Never accepts companyId from query parameters or request bodies
- Returns 401 Unauthorized for unauthenticated requests
- Returns 403 Forbidden for cross-tenant access attempts

**Resource Ownership Verification**:
- GET endpoints: Verify resource.companyId matches user.companyId before returning
- POST endpoints: Force companyId to user.companyId (ignore client-provided values)
- PATCH endpoints: 
  - Validate against update schemas (updateSkuSchema, updateMaterialSchema)
  - Schemas exclude protected fields (id, companyId, createdAt) to prevent tampering
  - Verify existing resource ownership before allowing updates
- DELETE endpoints: Verify resource ownership before deletion

**Cross-Entity Validation**:
- BOM operations: Verify SKU belongs to user's company
- Supplier Materials: Verify both supplier AND material belong to user's company
- Demand History: Verify SKU ownership before creating/reading history
- Allocations: Scoped to company, include ownership verification on retrieval

**Schema Validation**:
- Insert operations use insertSchemas with auto-generated fields omitted
- Update operations use updateSchemas (partial, excluding protected fields)
- Prevents field tampering, ensures data integrity
- Validates all inputs before storage operations

**Security Audit Status**: ✅ Comprehensive multi-tenant isolation enforced. All attack vectors addressed.

**User Flow**:
1. Unauthenticated users see landing page
2. Replit Auth handles OAuth flow
3. User record upserted on successful authentication
4. Session established with user claims and tokens
5. Frontend redirects to dashboard upon authentication
6. All API requests scoped to user's company automatically

### Build & Deployment

**Development**:
- `npm run dev` - Concurrent Vite dev server with Express API server
- Hot module replacement for frontend
- tsx for TypeScript execution without compilation

**Production Build**:
- `npm run build` - Vite builds frontend to `dist/public`, esbuild bundles server to `dist`
- `npm start` - Runs production server from compiled bundle
- Static assets served from built directory

**Database Migrations**: 
- `npm run db:push` - Drizzle Kit pushes schema changes to database
- Schema definition is source of truth (`shared/schema.ts`)

## External Dependencies

### Third-Party Services

**Database**: Neon Serverless PostgreSQL
- WebSocket connections via `@neondatabase/serverless`
- Connection pooling for scalability
- Configured via `DATABASE_URL` environment variable

**Authentication**: Replit Auth (OpenID Connect)
- OAuth provider for user authentication
- Configuration via `ISSUER_URL` and `REPL_ID` environment variables
- Session secret via `SESSION_SECRET`

**Economic Data API** (Optional): 
- Fetches real-time economic indicators from `https://api.factoryofthefuture.ai/economic-indicators`
- Falls back to mock data if unavailable
- Includes manufacturing PMI, core PCE inflation, loan growth metrics

### Key NPM Packages

**Frontend Core**:
- `react` + `react-dom` - UI framework
- `wouter` - Routing
- `@tanstack/react-query` - Server state management
- `tailwindcss` - Utility-first CSS
- `recharts` - Chart library for forecasting visualizations

**UI Components**:
- `@radix-ui/*` - 20+ primitive component packages (dialogs, dropdowns, tooltips, etc.)
- `class-variance-authority` - Type-safe variant management
- `cmdk` - Command palette component
- `lucide-react` - Icon library

**Backend Core**:
- `express` - Web framework
- `drizzle-orm` - Type-safe ORM
- `drizzle-zod` - Schema validation
- `zod` - Runtime validation
- `passport` + `openid-client` - Authentication

**Database & Sessions**:
- `@neondatabase/serverless` - Neon database driver
- `connect-pg-simple` - PostgreSQL session store
- `ws` - WebSocket client for Neon connections

**Development Tools**:
- `vite` - Build tool with HMR
- `tsx` - TypeScript execution
- `esbuild` - Server bundling
- `@replit/vite-plugin-*` - Replit-specific dev tools

### Asset Management

**Images**: Generated images stored in `attached_assets/generated_images/`
- Landing page hero image
- Empty state illustrations
- Loaded via Vite asset imports

**Fonts**: Google Fonts via CDN
- Inter - Primary UI font
- Roboto Mono - Monospace for data/metrics
- DM Sans, Fira Code, Geist Mono - Additional typefaces