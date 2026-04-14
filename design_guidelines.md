# FactoryFlow — Design System Guidelines

## Design Approach

**Selected System**: Dark Palantir-Inspired Design
**Rationale**: Enterprise manufacturing intelligence platform requiring clarity, confidence, and a sophisticated aesthetic. Dark backgrounds with amber accents create a control-center feel while maintaining readability for complex operational dashboards.

## Color Palette

**Semantic Colors**:
- **ink**: `#000000` — Primary background
- **panel**: `#0A0B0D` — Secondary surfaces (cards, panels)
- **line**: `#1A1B1E` — Borders, dividers, grid lines
- **bone**: `#F2F2F2` — Primary text, high contrast
- **soft**: `#A1A4AB` — Secondary text, descriptions
- **muted**: `#6A6E76` — Tertiary text, metadata
- **signal**: `#D9B56B` — Interactive elements, highlights, active states
- **good**: `#7FB09A` — Positive indicators, success
- **bad**: `#C47A6E` — Negative indicators, warnings

## Typography

**Font Stack**: Inter (UI), JetBrains Mono (data)

**Type Scales**:
- **hero** (300 weight, -0.035em tracking): Section headlines, 48-72px
- **display** (300 weight, -0.02em tracking): Page titles, 32-48px
- **eyebrow** (11px, 0.22em tracking, uppercase): Section labels, category headers
- **mono** (JetBrains Mono): Timestamps, codes, data values
- **Body**: 14-16px regular weight for main content
- **Small**: 12px for secondary text, metadata

**Text Colors**:
- Headings: `text-bone`
- Primary body: `text-soft`
- Secondary/metadata: `text-muted`
- Interactive: `text-signal`
- Positive: `text-good`
- Negative: `text-bad`

## Layout System

**Spacing**:
- **Padding**: p-4 (compact), p-6 (standard), p-8/p-10/p-12 (spacious)
- **Gaps**: gap-px (1px grids), gap-4 (standard), gap-6 (relaxed)
- **Sections**: py-14 to py-28 for major content sections

**Container Widths**:
- **Dashboard content**: max-w-5xl
- **Full-width sections**: max-w-7xl
- **Narrow content**: max-w-4xl

**Grid Patterns**:
- KPI cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Features: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Integrations: `grid-cols-2 md:grid-cols-6` with `gap-px bg-line`
- Pricing: `grid-cols-1 md:grid-cols-4` with `gap-px bg-line`

## Component Patterns

**Buttons**:
- **Primary** (`.btn-primary`): Bone background, ink text, 0.5rem 1.25rem padding
- **Ghost** (`.btn-ghost`): Transparent background, bone text, line border

**Cards**:
- Background: `bg-panel` or `bg-ink`
- Border: `border border-line`
- Spacing: `p-6` to `p-10` internal padding
- Gap grids: Use `gap-px bg-line` for bordered grids

**Badges & Indicators**:
- Active indicator: 2px left border with `bg-signal` color
- Status dot: 6x6px circle with semantic color (signal/good/bad)
- Trial banner: `trial-banner` class with panel bg and line border

**Dividers**:
- Full-width class: `.divider` (1px line, line color)
- Inline spacing: Use py-X around dividers

## Page Layouts

**Landing Page**:
- Header with signal dot, company name, navigation, CTA buttons
- Hero section with eyebrow, large display heading, description, CTAs
- Product screen mock with bordered panel, KPI grid, chart
- Capabilities section with numbered left-border items
- Integrations: Category eyebrows + grid layout (6 columns on desktop)
- Deployment cards (3-column with descriptions)
- Pricing cards (4-column with toggle for monthly/annual)
- Footer with signal dot, company name, copyright

**Dashboard**:
- Header with breadcrumb title, date/time, live indicator, export button
- Sidebar with signal dot header, FACTORYFLOW branding, nav sections
- Content area with max-w-5xl constraint
- Trial banner (if applicable) at top
- Section eyebrows for content groups
- KPI grid with gap-px borders
- Main content with consistent spacing

**Integrations Page**:
- Header with eyebrow and description
- Collapsible category sections
- Integration tiles showing connection status
- Add/remove/configure action buttons

**Billing Page**:
- Current plan cards (3-column grid)
- Billing period toggle
- Pricing plans (4-column grid)
- Invoice list with download actions
- Payment method section

## Interactions

**Hover States**:
- Light backgrounds: `hover:bg-panel`
- Ghost buttons: `hover:text-bone hover:bg-line`
- Interactive elements: Smooth color transitions (150-200ms)

**Active States**:
- Sidebar nav items: Amber left border indicator (`bg-signal`)
- Current page text: `text-bone`
- Inactive elements: `text-soft`

**Focus States**:
- 2px offset outline for keyboard navigation
- Consistent focus ring on all interactive elements

## Responsive Design

**Breakpoints** (Tailwind):
- `md:` (768px) for tablet layouts
- `lg:` (1024px) for desktop layouts
- Mobile-first approach: single column by default, expand on md/lg

**Common Patterns**:
- 2-column layout collapses to 1 on mobile (col-span-12 md:col-span-6)
- Full-width text sections use max-w-2xl for readability
- Images/charts stack vertically on mobile
- Navigation and modals are touch-friendly

## Texture & Depth

- **Grain overlay** (fixed position, pointer-events-none): Subtle texture across entire page
- **No shadows**: All box-shadow properties set to none
- **Borders over elevation**: Use thin 1px line borders instead of shadows
- **Grid backgrounds**: `gap-px bg-line` creates subtle grid pattern

## Accessibility

- Minimum touch targets: 44x44px for interactive elements
- Contrast ratio: All text meets WCAG AA standards
- Focus indicators: Visible 2px outlines on all focusable elements
- Semantic HTML: Proper heading hierarchy, alt text for images
- Keyboard navigation: All interactive elements reachable via Tab

## Asset Guidelines

**Icons**:
- Use lucide-react icons (4-6px stroke weight)
- Color with semantic colors: signal for interactive, soft for secondary
- Size: w-4 h-4 (standard), w-5 h-5 (prominent), w-6 h-6 (large)

**Images**:
- Dark backgrounds: Use high-contrast images
- Screenshots/mockups: Bordered with line color
- Illustrations: Line-style or minimalist aesthetic

**Spacing Around Assets**:
- Icon + text: gap-2 to gap-4
- Image + text: gap-6 to gap-8
