# Manufacturing Allocation Intelligence SaaS - Design Guidelines

## Design Approach

**Selected System**: Material Design for Enterprise with Linear-inspired minimalism
**Rationale**: Data-heavy productivity tool requiring clear information hierarchy, professional credibility, and efficient data comprehension. Material Design's systematic approach to data visualization combined with Linear's clean typography creates optimal conditions for complex manufacturing analytics.

## Core Design Elements

### A. Typography System

**Font Stack**: Inter (primary), Roboto Mono (data/numbers)
- **Display/Hero**: 48px, 600 weight - Dashboard headers, company name
- **H1**: 32px, 600 weight - Page titles, main sections
- **H2**: 24px, 600 weight - Card headers, subsection titles
- **H3**: 18px, 500 weight - Data table headers, widget titles
- **Body Large**: 16px, 400 weight - Primary content, descriptions
- **Body**: 14px, 400 weight - Secondary content, form labels
- **Small/Caption**: 12px, 400 weight - Metadata, timestamps, helper text
- **Data/Metrics**: Roboto Mono 20-32px, 500 weight - KPIs, numerical displays

### B. Layout System

**Spacing Primitives**: Use Tailwind units 2, 4, 6, 8, 12, 16, 24
- **Component padding**: p-4 to p-6 for cards, p-2 for compact elements
- **Section spacing**: py-8 to py-12 for major sections
- **Grid gaps**: gap-4 for tight grids, gap-6 for comfortable spacing
- **Container max-width**: max-w-7xl for dashboard, max-w-6xl for forms

**Grid Patterns**:
- Dashboard: 3-column grid (lg:grid-cols-3) for KPI cards
- Main content: 2-column split (lg:grid-cols-2) for allocation vs. forecasting views
- Data tables: Full-width single column with horizontal scroll if needed
- Sidebar navigation: Fixed 240px width on desktop, collapsible on mobile

### C. Component Library

**Navigation**
- **Top Bar**: Fixed header with company logo, user profile, notification bell, regime indicator badge
- **Sidebar**: Vertical navigation with icons + text, grouped by: Dashboard, Forecasting, Allocation, Procurement, Configuration, Reports
- **Breadcrumbs**: Show current location hierarchy (Home > Allocation Planner > SKU_A)

**Dashboard Components**
- **KPI Cards**: Elevated cards with icon, metric value (large), label (small), trend indicator (+/-%)
- **Regime Status Widget**: Prominent badge displaying current FDR regime (HEALTHY_EXPANSION, etc.) with intensity meter
- **Policy Signals Panel**: List of active signals with intensity bars (0-100%)

**Data Visualization**
- **Allocation Table**: Sortable columns (SKU, Planned Units, Fill Rate %), row hover states, inline edit capability
- **Forecast Charts**: Line charts with multiple series (historical, forecast, confidence intervals)
- **Material Flow Diagram**: Visual representation of BOM → Inventory → Allocation pipeline
- **Budget Gauge**: Circular progress indicator showing spent/remaining budget

**Forms & Input**
- **Material Input Cards**: Structured forms for SKU data, BOM configuration, supplier terms
- **File Upload**: Drag-and-drop zone for CSV/JSON with preview table
- **Date Range Picker**: Calendar component for forecast horizons
- **Numeric Steppers**: +/- controls for quantity inputs with manual entry

**Data Tables**
- **Interactive Headers**: Sortable, filterable columns with icons
- **Row Actions**: Edit, delete, duplicate icons on hover
- **Pagination**: Standard controls with page size selector
- **Bulk Selection**: Checkboxes for multi-row operations

**Feedback Elements**
- **Toast Notifications**: Top-right corner for success/error messages
- **Loading States**: Skeleton screens for data tables, spinner for calculations
- **Empty States**: Illustrative graphics with CTA buttons for first-time setup

**Modals & Overlays**
- **Scenario Comparison**: Side-by-side modal showing allocation results under different policies
- **Configuration Drawer**: Slide-in panel from right for editing supplier terms, BOM details
- **Confirmation Dialogs**: Centered modal with clear action buttons

### D. Page-Specific Layouts

**Landing/Marketing Page**
- **Hero Section**: Full-width (100vh) with headline "Manufacturing Intelligence Powered by Dual-Circuit Economics", subheadline explaining core value, primary CTA button, dashboard preview image
- **Features Grid**: 3-column showcase (Demand Forecasting, Smart Allocation, Cycle-Aware Procurement) with icons
- **How It Works**: 3-step visual process (Connect Data → AI Forecasts → Optimize Allocation)
- **Regime Intelligence Section**: Explanation of FDR framework with visual diagram
- **Social Proof**: 2-column layout with customer logos + testimonial quotes
- **Pricing Table**: 3-tier comparison (Starter, Professional, Enterprise)
- **Footer**: 4-column layout (Product, Company, Resources, Contact) with newsletter signup

**Dashboard Page**
- **Status Overview**: Top row with 4 KPI cards (Current Regime, FDR Score, Active Signals, Budget Health)
- **Main Grid**: 2-column layout - left: Recent allocations table, right: Forecast trends chart
- **Quick Actions Panel**: Floating action buttons for "New Allocation", "Import Data", "Run Scenario"

**Allocation Planner**
- **Configuration Panel**: Left sidebar (300px) with SKU selection, priority weighting sliders, policy toggles
- **Results View**: Main area with allocation table, material consumption breakdown, procurement recommendations
- **Comparison Mode**: Split-screen view for A/B scenario testing

**Forecasting Module**
- **SKU Selector**: Dropdown with search and multi-select capability
- **Historical Chart**: Line graph showing 12-month trailing data
- **Forecast Output**: Table with month-by-month predictions, confidence intervals, regime adjustments
- **Export Controls**: Download CSV/PDF buttons

## Images

**Hero Image**: Dashboard screenshot or abstract manufacturing visualization showing data flow and optimization - full-width, high-quality, professional photography style
**Feature Icons**: Custom line icons (64x64px) for each major feature - consistent stroke weight, minimal style
**Process Diagrams**: Clean infographic-style illustrations showing data flow from input → analysis → output
**Empty States**: Friendly illustrations encouraging users to add their first SKU, upload data, or configure suppliers

## Accessibility & Polish

- All interactive elements have 44x44px minimum touch targets
- Form inputs include floating labels that move on focus
- Data tables support keyboard navigation (arrow keys, tab)
- Chart tooltips appear on hover with detailed breakdowns
- Consistent elevation system: cards at elevation-1, modals at elevation-3, dropdowns at elevation-2
- Smooth transitions (200-300ms) for state changes, no distracting animations
- Focus indicators on all interactive elements (2px offset outline)