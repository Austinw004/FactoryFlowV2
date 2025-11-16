# Manufacturing Allocation Intelligence SaaS

## Overview

This is a Manufacturing Allocation Intelligence platform that uses dual-circuit economic indicators to optimize raw material allocation, demand forecasting, and counter-cyclical procurement decisions. The system analyzes economic regimes (Healthy Expansion, Asset-Led Growth, Imbalanced Excess, Real Economy Lead) and generates policy signals to guide manufacturing and procurement strategies.

The platform helps manufacturers make data-driven decisions about:
- SKU demand forecasting with regime-aware adjustments
- Material allocation across products with priority weighting
- Counter-cyclical procurement timing based on FDR (Financial-to-Real Divergence) metrics
- Budget optimization and inventory management

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

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful endpoints organized by domain:
- `/api/auth/*` - Authentication and user management
- `/api/economics/*` - Economic regime and FDR calculations
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

**Data Access Layer**: Centralized storage interface (`server/storage.ts`) abstracts database operations with methods for CRUD operations on all entities.

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Provider**: Neon serverless PostgreSQL with WebSocket connections

**Schema Design** (`shared/schema.ts`):

**Core Entities**:
- `companies` - Multi-tenant organization data
- `users` - User accounts with Replit Auth integration, linked to companies
- `skus` - Product definitions with priority weighting
- `materials` - Raw material inventory tracking (on-hand, inbound quantities)
- `boms` - Bill of Materials linking SKUs to required materials with quantities
- `suppliers` - Supplier master data with lead times
- `supplier_materials` - Junction table for supplier-material pricing
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