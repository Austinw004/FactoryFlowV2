# Prescient Labs Redesign — Source Handoff

These are the design-source JSX files produced by Claude Design. Each batch file contains one or more page components named `<Name>Page` that render inside `<PrescientShell>` (defined in `shell.jsx`).

## Stack
- React 18 (UMD via CDN in the prototype)
- No build step required for the prototype — `Prescient Labs Redesign.html` loads everything as `<script type="text/babel">`.
- For production integration, transpile the JSX and replace `<PrescientShell>` with your real router + chrome.

## Shared infrastructure
| File | Purpose |
|---|---|
| `tokens.css` | Color, type, spacing tokens (ink/bone/signal palette, Inter + Inter Tight + JetBrains Mono) |
| `shell.jsx` | `<PrescientShell>`, `<Icon>`, `Eyebrow`, `Hairline`, `Pill`, `StatusDot`, `Btn`, `SectionHead`, `Spark`, `PrescientMark` (rotating globe) |
| `tweaks.jsx` | In-design tweak panel (globe color, spin speed) |
| `design-canvas.jsx` | Pan/zoom canvas wrapper (prototype-only) |

## Page surfaces by batch

### dashboard.jsx
- DashboardPage

### procurement.jsx
- ProcurementPage

### advisor.jsx
- AdvisorPage

### batch1-overview.jsx (5)
- DashboardHubPage
- PilotRevenueDashboardPage
- ImpactDashboardPage
- OperationsHubPage
- DemandHubPage

### batch2-intelligence.jsx (9)
- StrategyHubPage
- StrategyInsightsPage
- StrategicAnalysisPage
- EventMonitoringPage
- DemandSignalRepositoryPage
- MAIntelligencePage
- GeopoliticalRiskPage
- IndustryConsortiumPage
- PeerBenchmarkingPage

### batch3-forecasting.jsx (6)
- ForecastingPage
- MultiHorizonPage
- ForecastAccuracyPage
- CommodityForecastingPage
- BacktestingDashboardPage
- ForecastEnsemblePage

### batch4-procurement.jsx (6)
- ProcurementHubPage
- AutomatedPOPage
- AllocationPage
- InventoryManagementPage
- InventoryOptimizationPage
- RFQDashboardPage

### batch5a-suppliers.jsx (6)
- SupplyChainHubPage
- MultiTierSupplierMappingPage
- SupplyChainPage (supplier directory)
- SupplierRiskPage
- SupplyChainNetworkPage
- SupplyChainTraceabilityPage

### batch5b-ops.jsx (5)
- LogisticsManagementPage
- TradeTariffsPage
- GlobalEventsPage
- EventCalendarPage
- ProcessAutomationPage

### batch6-agents.jsx (3)
- AgentMonitoringPage
- AgentRegistryPage
- SwarmOrchestrationPage

### batch7-misc.jsx (24)
Scenarios:
- ScenarioBuilderPage, ScenarioComparePage

Settings & trust:
- SettingsProfilePage, TeamPage, WorkspacePage, NotificationsPage, IntegrationsPage, SecurityPage, DataResidencyPage, TrustCenterPage

Auth & onboarding:
- SignInPage, SignUpPage, SSOCallbackPage, OnboardingConnect1Page, OnboardingConnect2Page, OnboardingReadyPage

Admin:
- AdminTenantsPage, AdminUsersPage, AdminAuditPage, AdminFlagsPage, BillingPage

Public / marketing:
- MarketingLandingPage, MarketingPricingPage, MarketingSecurityPage, MarketingCareersPage

### batch8-fillgap.jsx (31)
The pages flagged as uncovered after batches 1–7. Same visual language; sized appropriately (auth/kiosk/error use shorter HSm height in the canvas).

Operations & ops-platform:
- ActionPlaybooksPage, DigitalTwinPage, MachineryPage, PredictiveMaintenancePage, ProductionKPIsPage, ShopFloorModePage, SopWorkflowsPage, SopWorkspacePage, WorkforceSchedulingPage

Procurement / setup adjacencies:
- IntegrationChecklistPage, ErpTemplatesPage, ConfigurationPage

Trust / compliance / docs:
- CompliancePage, PrivacyPolicyPage, TermsOfServicePage, StatusPage, ApiDocumentationPage, ReportsPage, TrainingPage

Admin & analytics:
- LeadsAdminPage, PlatformAnalyticsPage, PlatformOwnerAnalyticsPage, RoiDashboardPage, BulkTestPage

Auth (extras):
- ForgotPasswordPage, ResetPasswordPage

Marketing / public:
- ContactPage, HowItWorksPage, PilotProgramPage, RoiCalculatorPage

Error:
- NotFoundPage

## Total
- **99 surfaces** wired into `Prescient Labs Redesign.html`
- Covers all 84 .tsx files in `client/src/pages/` — either 1:1, or consolidated (LandingPage A/B/C → MarketingLandingPage; Onboarding multi-step → OnboardingConnect1/2/Ready; ScenarioPlanning + ScenarioSimulation → ScenarioBuilder/Compare; WebhookIntegrations → IntegrationsPage), or net-new design surfaces with no current repo equivalent (Strategy Insights, Forecast Ensemble, Logistics Management, Trade & Tariffs, Global Events, Event Calendar, Agent Monitoring/Registry/Swarm, Team/Workspace/Security/DataResidency, Admin Tenants/Users/Flags, Marketing Careers).
