/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody,
   BarChart */

// ============================================================
// BATCH 7-12 — Settings, Trust, Onboarding, Auth, Admin, Billing, Scenarios, Marketing
// Compact, vocabulary-faithful pages.
// ============================================================

// === Settings shell — 8 sub-pages share a left-rail layout ===
function SettingsLayout({ active = 'profile', title, children, subtitle }) {
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'team', label: 'Team' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'security', label: 'Security' },
    { id: 'data', label: 'Data & residency' },
    { id: 'trust', label: 'Trust center' },
  ];
  return (
    <PrescientShell active="settings" title="Settings" breadcrumb={[]}>
      <PageBody>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 28 }}>
          <nav style={{ borderRight: '1px solid var(--line)', paddingRight: 18 }}>
            <Eyebrow style={{ marginBottom: 12 }}>Settings</Eyebrow>
            {tabs.map(t => (
              <div key={t.id} className={active === t.id ? '' : 'row-hover'} style={{
                padding: '8px 12px', marginBottom: 2, borderLeft: `2px solid ${active === t.id ? 'var(--bone)' : 'transparent'}`,
                background: active === t.id ? 'var(--panel-2)' : 'transparent',
                fontSize: 12.5, color: active === t.id ? 'var(--bone)' : 'var(--soft)', cursor: 'pointer',
              }}>{t.label}</div>
            ))}
          </nav>
          <div>
            <div style={{ marginBottom: 22 }}>
              <Eyebrow>{title}</Eyebrow>
              <h1 style={{ fontSize: 22, fontWeight: 400, color: 'var(--bone)', margin: '8px 0 6px', letterSpacing: '-0.01em' }}>{subtitle}</h1>
            </div>
            {children}
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}
function FieldRow({ label, value, hint, action }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 100px', gap: 18, padding: '14px 0', borderBottom: '1px solid var(--line-soft)', alignItems: 'center' }}>
      <span className="eyebrow" style={{ fontSize: 9 }}>{label}</span>
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{value}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>{action || <Btn kind="ghost" sm>Edit</Btn>}</div>
    </div>
  );
}

function SettingsProfilePage() {
  return (
    <SettingsLayout active="profile" title="Profile" subtitle="Your account">
      <FieldRow label="Name" value="Mary Okafor" />
      <FieldRow label="Email" value="m.okafor@ridgeview.com" hint="Verified · April 12" />
      <FieldRow label="Role" value="Procurement lead" hint="Admin · 3 workspaces" />
      <FieldRow label="Timezone" value="America / New York" />
      <FieldRow label="Locale" value="English (US) · USD" />
      <FieldRow label="Photo" value="Set" />
      <FieldRow label="Password" value="••••••••••••" hint="Last changed 38 days ago" action={<Btn kind="ghost" sm>Change</Btn>} />
      <FieldRow label="Two-factor" value="Authenticator app" hint="Backup codes generated" />
      <FieldRow label="Sessions" value="3 active" hint="Most recent · 14:31 · NYC" action={<Btn kind="ghost" sm>Manage</Btn>} />
    </SettingsLayout>
  );
}
function TeamPage() {
  const team = [
    { n: 'Mary Okafor', r: 'Owner', e: 'm.okafor@ridgeview.com', last: '14:31' },
    { n: 'Lily Park', r: 'Admin', e: 'l.park@ridgeview.com', last: '13:18' },
    { n: 'Daniel Roe', r: 'Member', e: 'd.roe@ridgeview.com', last: 'Yest' },
    { n: 'Sara Vega', r: 'Member', e: 's.vega@ridgeview.com', last: '2d' },
    { n: 'Vendor · Auditor', r: 'Read-only', e: 'audit@ext.com', last: '4d' },
  ];
  return (
    <SettingsLayout active="team" title="Team" subtitle="Members · 5">
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'flex-end' }}><Btn kind="primary" sm icon={<Icon.Plus s={11} />}>Invite</Btn></div>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1fr) 110px 80px 80px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
          {['Member', 'Email', 'Role', 'Last seen', ''].map(h => <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>)}
        </div>
        {team.map((r, i, a) => (
          <div key={r.n} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1fr) 110px 80px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.n}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.e}</span>
            <Pill tone={r.r === 'Owner' ? 'good' : r.r === 'Admin' ? 'signal' : 'bone'} mono>{r.r}</Pill>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.last}</span>
            <Btn kind="ghost" sm>Manage</Btn>
          </div>
        ))}
      </div>
    </SettingsLayout>
  );
}
function WorkspacePage() {
  return (
    <SettingsLayout active="workspace" title="Workspace" subtitle="Ridgeview Industries">
      <FieldRow label="Workspace name" value="Ridgeview Industries" />
      <FieldRow label="Subdomain" value="ridgeview.prescient.app" />
      <FieldRow label="Industry" value="Industrial · diversified" />
      <FieldRow label="Plant locations" value="4 plants · 2 distribution centers" />
      <FieldRow label="Fiscal year" value="January – December" />
      <FieldRow label="Default currency" value="USD · $1.00" />
      <FieldRow label="Logo" value="Ridgeview · monogram" action={<Btn kind="ghost" sm>Upload</Btn>} />
      <FieldRow label="Brand color" value="#3F86FF · advisor signal accent" />
    </SettingsLayout>
  );
}
function NotificationsPage() {
  return (
    <SettingsLayout active="notifications" title="Notifications" subtitle="What you'll hear about">
      {[
        { l: 'Regime changes', d: 'When FDR crosses threshold', email: true, slack: true, app: true },
        { l: 'High-confidence advisor briefs', d: '≥ 0.80 confidence · daily', email: true, slack: true, app: true },
        { l: 'PO over $100K · awaiting approval', d: 'Mary, Lily', email: true, slack: false, app: true },
        { l: 'Supplier risk score crosses 0.70', d: 'Any supplier', email: true, slack: true, app: true },
        { l: 'Forecast MAPE > 12% · A-class', d: 'Weekly digest', email: false, slack: false, app: true },
        { l: 'Agent incident · amber/red', d: 'Real-time', email: true, slack: true, app: true },
      ].map((r, i, a) => (
        <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 12, padding: '14px 0', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.l}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{r.d}</div>
          </div>
          {['email', 'slack', 'app'].map(ch => (
            <label key={ch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: 'var(--soft)' }}>
              <input type="checkbox" defaultChecked={r[ch]} style={{ accentColor: 'var(--bone)' }} />
              <span className="eyebrow" style={{ fontSize: 9 }}>{ch}</span>
            </label>
          ))}
        </div>
      ))}
    </SettingsLayout>
  );
}
function IntegrationsPage() {
  const ints = [
    { n: 'NetSuite ERP', cat: 'ERP', state: 'Connected', last: '14:31', tone: 'good' },
    { n: 'SAP S/4 HANA', cat: 'ERP', state: 'Available', last: '—', tone: 'neutral' },
    { n: 'Snowflake', cat: 'Warehouse', state: 'Connected', last: '14:28', tone: 'good' },
    { n: 'Slack', cat: 'Comms', state: 'Connected', last: '14:30', tone: 'good' },
    { n: 'Okta SSO', cat: 'Identity', state: 'Connected', last: '14:31', tone: 'good' },
    { n: 'Bloomberg Terminal', cat: 'Market data', state: 'Connected', last: '14:31', tone: 'good' },
    { n: 'Reuters Eikon', cat: 'Market data', state: 'Available', last: '—', tone: 'neutral' },
    { n: 'Coupa', cat: 'Procurement', state: 'Available', last: '—', tone: 'neutral' },
    { n: 'Workday Finance', cat: 'Finance', state: 'Available', last: '—', tone: 'neutral' },
  ];
  return (
    <SettingsLayout active="integrations" title="Integrations" subtitle="6 of 18 connected">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
        {ints.map((it) => (
          <div key={it.n} className="row-hover" style={{ background: 'var(--panel)', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 100px 90px 80px', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.n}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{it.cat}</div>
            </div>
            <Pill tone={it.tone} mono>{it.state}</Pill>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.last}</span>
            <Btn kind="ghost" sm>{it.state === 'Connected' ? 'Manage' : 'Connect'}</Btn>
          </div>
        ))}
      </div>
    </SettingsLayout>
  );
}
function SecurityPage() {
  return (
    <SettingsLayout active="security" title="Security" subtitle="Posture · all controls">
      <FieldRow label="SSO" value="Okta SAML 2.0 · enforced for ridgeview.com domain" hint="Last validated 14:31" />
      <FieldRow label="2FA · org policy" value="Required · all members · TOTP or hardware" />
      <FieldRow label="Session length" value="8 hours · re-auth on sensitive actions" />
      <FieldRow label="IP allowlist" value="Off · open to all · audit-logged" />
      <FieldRow label="Audit log retention" value="7 years · SOC2-aligned" />
      <FieldRow label="Encryption at rest" value="AES-256 · per-tenant keys" />
      <FieldRow label="Encryption in transit" value="TLS 1.3 only" />
      <FieldRow label="Penetration testing" value="Annual · Bishop Fox · last Mar 2026" />
      <FieldRow label="Bug bounty" value="HackerOne · public" />
      <FieldRow label="Data deletion" value="Self-serve · 30-day reversible window" action={<Btn kind="ghost" sm>Request</Btn>} />
    </SettingsLayout>
  );
}
function DataResidencyPage() {
  return (
    <SettingsLayout active="data" title="Data & residency" subtitle="Where your data lives">
      <FieldRow label="Primary region" value="us-east-1 · Virginia · AWS" hint="Failover us-west-2" />
      <FieldRow label="Backup region" value="us-west-2 · Oregon · 15-min RPO" />
      <FieldRow label="EU residency" value="Available · Frankfurt · contact sales" />
      <FieldRow label="Cross-region transfer" value="Disabled · per workspace" />
      <FieldRow label="Customer-managed keys" value="On · AWS KMS" />
      <FieldRow label="Data export" value="JSON · Parquet · daily snapshot" action={<Btn kind="ghost" sm>Export</Btn>} />
      <FieldRow label="Delete & purge" value="Self-serve · 30-day reversible · then unrecoverable" />
    </SettingsLayout>
  );
}
function TrustCenterPage() {
  return (
    <SettingsLayout active="trust" title="Trust center" subtitle="Compliance · attestations · live">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 24 }}>
        {[
          { l: 'SOC 2 · Type II', s: 'Active', d: 'Renewed Mar 14, 2026', tone: 'good' },
          { l: 'ISO 27001', s: 'Active', d: 'Cert 2024-08-22 · 3-year', tone: 'good' },
          { l: 'GDPR', s: 'In compliance', d: 'DPO assigned · DPA available', tone: 'good' },
          { l: 'HIPAA', s: 'Available', d: 'BAA on request', tone: 'neutral' },
          { l: 'CSRD scope 3', s: 'In compliance', d: 'Auto-emitted from traceability', tone: 'good' },
          { l: 'FedRAMP Moderate', s: 'In progress', d: '3PAO selected · Q3 2026', tone: 'signal' },
        ].map(c => (
          <div key={c.l} style={{ background: 'var(--panel)', padding: 18 }}>
            <Eyebrow>{c.l}</Eyebrow>
            <div style={{ marginTop: 8, marginBottom: 8 }}><Pill tone={c.tone} mono>{c.s}</Pill></div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.d}</div>
          </div>
        ))}
      </div>
      <Card eyebrow="Documents · download" padded={false}>
        {['SOC 2 Type II Report', 'ISO 27001 Certificate', 'Penetration test summary · 2026', 'Sub-processor list', 'Privacy whitepaper', 'DPA template'].map((d, i, a) => (
          <div key={d} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{d}</span>
            <Btn kind="ghost" sm icon={<Icon.External s={11} />}>Get</Btn>
          </div>
        ))}
      </Card>
    </SettingsLayout>
  );
}

// =====================================================
// AUTH — sign-in, sign-up, sso-callback (no shell)
// =====================================================
function AuthShell({ children, eyebrow, title, sub }) {
  return (
    <div style={{ background: 'var(--ink)', minHeight: '100%', display: 'grid', gridTemplateColumns: '1fr 480px' }}>
      <div style={{ position: 'relative', borderRight: '1px solid var(--line)', padding: 48, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, background: 'var(--bone)' }} />
          <span style={{ fontSize: 13, color: 'var(--bone)', letterSpacing: '0.02em' }}>Prescient Labs</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 540 }}>
          <Eyebrow>The exec brief, every morning</Eyebrow>
          <h2 style={{ fontSize: 36, fontWeight: 300, color: 'var(--bone)', margin: '12px 0 16px', lineHeight: 1.15, letterSpacing: '-0.015em' }}>
            Five things to know.<br /><span style={{ color: 'var(--soft)' }}>Sourced. Reasoned. Yours by 7am.</span>
          </h2>
          <div style={{ fontSize: 13, color: 'var(--soft)', maxWidth: 460, lineHeight: 1.6 }}>
            Forecasts, regime, supplier risk, procurement decisions — the system that operates your supply chain so you don't have to.
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 18, fontSize: 11, color: 'var(--muted)' }}>
            <span><span style={{ color: 'var(--good)' }}>●</span> SOC 2 · ISO 27001</span>
            <span>SSO · SAML</span>
            <span>EU residency</span>
          </div>
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>v4.2.1 · Apr 26, 2026</div>
      </div>
      <div style={{ background: 'var(--panel)', padding: '64px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 style={{ fontSize: 24, fontWeight: 400, color: 'var(--bone)', margin: '8px 0 6px', letterSpacing: '-0.01em' }}>{title}</h1>
        <div style={{ fontSize: 12.5, color: 'var(--soft)', marginBottom: 28 }}>{sub}</div>
        {children}
      </div>
    </div>
  );
}
function FormField({ label, type = 'text', value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <input type={type} defaultValue={value} style={{
        width: '100%', background: 'var(--ink-deep)', border: '1px solid var(--line)',
        padding: '10px 12px', fontSize: 13, color: 'var(--bone)', fontFamily: 'inherit', outline: 'none',
      }} />
    </div>
  );
}
function SignInPage() {
  return (
    <AuthShell eyebrow="Sign in" title="Welcome back" sub="Use your work email or SSO.">
      <Btn kind="ghost" full icon={<Icon.External s={12} />}>Continue with Okta SSO</Btn>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0', color: 'var(--muted)', fontSize: 11 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} /> or email <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <FormField label="Work email" value="m.okafor@ridgeview.com" />
      <FormField label="Password" type="password" value="••••••••" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <label style={{ fontSize: 11.5, color: 'var(--soft)', display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ accentColor: 'var(--bone)' }} /> Stay signed in</label>
        <a href="#" style={{ fontSize: 11.5, color: 'var(--signal)', textDecoration: 'none' }}>Forgot password</a>
      </div>
      <Btn kind="primary" full>Sign in</Btn>
      <div style={{ marginTop: 22, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        New to Prescient? <a href="#" style={{ color: 'var(--bone)' }}>Request access</a>
      </div>
    </AuthShell>
  );
}
function SignUpPage() {
  return (
    <AuthShell eyebrow="Request access" title="Set up your workspace" sub="Tell us where you're starting. Talk to sales for production.">
      <FormField label="Name" value="" />
      <FormField label="Work email" value="" />
      <FormField label="Company" value="" />
      <FormField label="Industry" value="Industrial / diversified" />
      <FormField label="Annual procurement spend" value="≥ $100M" />
      <Btn kind="primary" full>Continue</Btn>
      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        By continuing you accept the <a href="#" style={{ color: 'var(--bone)' }}>terms</a> and <a href="#" style={{ color: 'var(--bone)' }}>privacy policy</a>.
      </div>
    </AuthShell>
  );
}
function SSOCallbackPage() {
  return (
    <AuthShell eyebrow="SSO callback" title="Verifying with Okta…" sub="One moment.">
      <div style={{ height: 4, background: 'var(--ink-deep)', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--signal), transparent)', animation: 'none' }} />
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
        ✓ token verified<br/>
        ✓ workspace · ridgeview.prescient.app<br/>
        ⋯ loading session…
      </div>
    </AuthShell>
  );
}

// =====================================================
// ONBOARDING (3 pages) — connects 1, connects 2, ready
// =====================================================
function OnboardingShell({ step, of, eyebrow, title, sub, children, action }) {
  return (
    <div style={{ background: 'var(--ink)', minHeight: '100%', padding: 56, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <div style={{ width: 18, height: 18, background: 'var(--bone)' }} />
        <span style={{ fontSize: 13, color: 'var(--bone)', letterSpacing: '0.02em' }}>Prescient Labs</span>
        <span className="eyebrow" style={{ marginLeft: 'auto' }}>Step {step} of {of}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 36 }}>
        {Array.from({ length: of }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, background: i < step ? 'var(--bone)' : 'var(--line)' }} />
        ))}
      </div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 style={{ fontSize: 32, fontWeight: 300, color: 'var(--bone)', margin: '10px 0 8px', letterSpacing: '-0.015em' }}>{title}</h1>
      <div style={{ fontSize: 13, color: 'var(--soft)', maxWidth: 600, lineHeight: 1.55, marginBottom: 32 }}>{sub}</div>
      {children}
      <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 18 }}>
        <Btn kind="ghost">Back</Btn>
        {action || <Btn kind="primary">Continue</Btn>}
      </div>
    </div>
  );
}
function OnboardingConnect1Page() {
  return (
    <OnboardingShell step={1} of={3} eyebrow="Connect" title="Where does your data live?" sub="Connect at least one system of record. We'll backfill 13 months and keep it in sync from there.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
        {[
          { n: 'NetSuite', cat: 'ERP', tone: 'good' },
          { n: 'SAP S/4', cat: 'ERP' },
          { n: 'Oracle Fusion', cat: 'ERP' },
          { n: 'Snowflake', cat: 'Warehouse', tone: 'good' },
          { n: 'BigQuery', cat: 'Warehouse' },
          { n: 'Databricks', cat: 'Warehouse' },
        ].map(it => (
          <div key={it.n} className="row-hover" style={{ background: 'var(--panel)', padding: 22, cursor: 'pointer', border: it.tone === 'good' ? '1px solid var(--good)' : 'none' }}>
            <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, marginBottom: 6 }}>{it.n}</div>
            <Eyebrow>{it.cat}</Eyebrow>
            {it.tone === 'good' && <div style={{ marginTop: 14 }}><Pill tone="good" mono>Connected</Pill></div>}
          </div>
        ))}
      </div>
    </OnboardingShell>
  );
}
function OnboardingConnect2Page() {
  return (
    <OnboardingShell step={2} of={3} eyebrow="Choose feeds" title="What do you want us to watch?" sub="Toggle on the data we'll fold into forecasts, regime, and advisor briefs.">
      {[
        { l: 'Bloomberg market data', d: 'Commodity spot · LME, COMEX, Reuters', on: true },
        { l: 'Macroeconomic · FRED', d: 'PMI, FX, treasury, employment', on: true },
        { l: 'AIS shipping data', d: 'Vessel positions · 6 corridors', on: true },
        { l: 'Filings · 10-K, 10-Q', d: 'Tier 1+2 supplier disclosures', on: true },
        { l: 'Trade press · Reuters/Bloomberg', d: 'Filtered to your tickers', on: true },
        { l: 'Weather · NOAA + JTWC', d: 'Storm, drought, freeze alerts', on: false },
        { l: 'Customs · public records', d: 'HTS rulings, AD/CVD, quota', on: false },
      ].map((r, i, a) => (
        <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 12, padding: '14px 0', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.l}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{r.d}</div>
          </div>
          <input type="checkbox" defaultChecked={r.on} style={{ accentColor: 'var(--bone)', justifySelf: 'end' }} />
        </div>
      ))}
    </OnboardingShell>
  );
}
function OnboardingReadyPage() {
  return (
    <OnboardingShell step={3} of={3} eyebrow="Ready" title="Backfill running. We'll email when it's done." sub="13 months · 1,284 SKUs · 47 suppliers. About 2 hours." action={<Btn kind="primary">Open dashboard</Btn>}>
      <Card eyebrow="What's happening" padded={false}>
        {[
          { l: 'NetSuite · 13mo POs · invoices · receipts', s: 'Streaming · 64% complete', tone: 'signal' },
          { l: 'Snowflake · demand history · 1,284 SKUs', s: 'Done', tone: 'good' },
          { l: 'Bloomberg · 6 commodities', s: 'Done', tone: 'good' },
          { l: 'FRED macro · 24 series', s: 'Done', tone: 'good' },
          { l: 'Filings · 47 suppliers', s: 'Streaming · 38 complete', tone: 'signal' },
          { l: 'Forecast model · ensemble train', s: 'Queued · waits for backfill', tone: 'neutral' },
        ].map((r, i, a) => (
          <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 200px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <StatusDot tone={r.tone} />
            <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.l}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.s}</span>
          </div>
        ))}
      </Card>
    </OnboardingShell>
  );
}

// =====================================================
// ADMIN (4 pages) — Tenants, Users, Audit Log, Feature Flags
// =====================================================
function AdminLayout({ active, title, subtitle, children }) {
  const tabs = [
    { id: 'tenants', label: 'Tenants' }, { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit log' }, { id: 'flags', label: 'Feature flags' },
  ];
  return (
    <PrescientShell active="admin" title="Admin" breadcrumb={['Internal']}>
      <PageBody>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
          {tabs.map(t => (
            <div key={t.id} style={{
              padding: '10px 18px', cursor: 'pointer', fontSize: 12.5,
              color: active === t.id ? 'var(--bone)' : 'var(--soft)',
              borderBottom: `2px solid ${active === t.id ? 'var(--bone)' : 'transparent'}`,
              marginBottom: -1,
            }}>{t.label}</div>
          ))}
        </div>
        <Eyebrow>{title}</Eyebrow>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: 'var(--bone)', margin: '6px 0 22px', letterSpacing: '-0.01em' }}>{subtitle}</h1>
        {children}
      </PageBody>
    </PrescientShell>
  );
}
function AdminTenantsPage() {
  return (
    <AdminLayout active="tenants" title="Tenants" subtitle="42 active workspaces">
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 110px 90px 80px 90px 80px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
          {['Workspace', 'Plan', 'Members', 'Region', 'Spend · mo', 'State'].map(h => <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>)}
        </div>
        {[
          { n: 'Ridgeview Industries', plan: 'Enterprise', m: 18, r: 'us-east-1', s: '$48K', st: 'active' },
          { n: 'Northwind Plastics', plan: 'Enterprise', m: 24, r: 'us-east-1', s: '$62K', st: 'active' },
          { n: 'Crescendo Auto', plan: 'Pro', m: 12, r: 'eu-central-1', s: '$28K', st: 'active' },
          { n: 'Avantis Steel', plan: 'Enterprise', m: 32, r: 'us-east-1', s: '$74K', st: 'active' },
          { n: 'Helios Battery', plan: 'Pro', m: 8, r: 'us-west-2', s: '$18K', st: 'trial' },
        ].map((r, i, a) => (
          <div key={r.n} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 110px 90px 80px 90px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.n}</span>
            <Pill tone="bone" mono>{r.plan}</Pill>
            <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.m}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.r}</span>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.s}</span>
            <Pill tone={r.st === 'active' ? 'good' : 'signal'} mono>{r.st}</Pill>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
function AdminUsersPage() {
  return (
    <AdminLayout active="users" title="Users · cross-tenant" subtitle="1,284 users · 42 workspaces">
      <Toolbar searchPlaceholder="Search by email…">
        <FilterChip label="Tenant" value="All" active />
        <FilterChip label="Role" value="All" />
        <FilterChip label="Last seen" value="7d" />
      </Toolbar>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 1fr) 90px 80px 80px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
          {['Email', 'Tenant', 'Role', 'Last seen', 'State'].map(h => <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>)}
        </div>
        {[
          { e: 'm.okafor@ridgeview.com', t: 'Ridgeview', r: 'Owner', l: '14:31', s: 'active' },
          { e: 'a.henn@northwind.com', t: 'Northwind', r: 'Admin', l: '14:14', s: 'active' },
          { e: 'j.kim@crescendo.com', t: 'Crescendo', r: 'Member', l: '13:52', s: 'active' },
          { e: 'b.li@avantis.com', t: 'Avantis', r: 'Owner', l: '13:08', s: 'active' },
          { e: 'r.silva@helios.com', t: 'Helios', r: 'Member', l: '4d', s: 'idle' },
        ].map((u, i, a) => (
          <div key={u.e} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 1fr) 90px 80px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{u.e}</span>
            <span style={{ fontSize: 12, color: 'var(--soft)' }}>{u.t}</span>
            <Pill tone={u.r === 'Owner' ? 'good' : u.r === 'Admin' ? 'signal' : 'bone'} mono>{u.r}</Pill>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{u.l}</span>
            <Pill tone={u.s === 'active' ? 'good' : 'neutral'} mono>{u.s}</Pill>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
function AdminAuditPage() {
  return (
    <AdminLayout active="audit" title="Audit log" subtitle="Append-only · 7-year retention">
      <Toolbar searchPlaceholder="Search action, actor…">
        <FilterChip label="Tenant" value="All" active />
        <FilterChip label="Severity" value="All" />
        <FilterChip label="Range" value="24h" />
      </Toolbar>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 90px 130px minmax(180px, 1fr) minmax(220px, 1fr)', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
          {['When', 'Severity', 'Tenant', 'Actor', 'Action'].map(h => <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>)}
        </div>
        {[
          { t: '14:31:18', sev: 'info', te: 'Ridgeview', a: 'm.okafor', e: 'Approved PO-9920 · Voestalpine · $304K' },
          { t: '14:28:42', sev: 'info', te: 'Ridgeview', a: 'agent.proc-audit', e: 'Flagged PO-9921 · regime HOLD' },
          { t: '14:18:08', sev: 'warn', te: 'Northwind', a: 'a.henn', e: 'Override regime hold · PO-7184 · $214K' },
          { t: '13:52:14', sev: 'info', te: 'Avantis', a: 'b.li', e: 'Connected Snowflake account' },
          { t: '13:14:02', sev: 'info', te: 'Ridgeview', a: 'l.park', e: 'Approved reorder run #2814' },
          { t: '12:42:18', sev: 'crit', te: 'Crescendo', a: 'system', e: 'Failed login burst · 14 attempts · IP blocked' },
        ].map((r, i, a) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 90px 130px minmax(180px, 1fr) minmax(220px, 1fr)', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.t}</span>
            <Pill tone={r.sev === 'crit' ? 'bad' : r.sev === 'warn' ? 'signal' : 'bone'} mono>{r.sev}</Pill>
            <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.te}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>{r.a}</span>
            <span style={{ fontSize: 11.5, color: 'var(--bone)' }}>{r.e}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
function AdminFlagsPage() {
  return (
    <AdminLayout active="flags" title="Feature flags" subtitle="14 flags · 4 in rollout">
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 100px 110px 90px 60px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
          {['Flag', 'Default', 'Rollout', 'Tenants', 'State'].map(h => <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>)}
        </div>
        {[
          { f: 'forecast.ensemble.v4.2.1', d: 'on', r: '100%', t: 'all', s: 'GA' },
          { f: 'advisor.evidence-panel-v2', d: 'on', r: '100%', t: 'all', s: 'GA' },
          { f: 'agents.swarm-orchestration', d: 'on', r: '60%', t: '24/42', s: 'rollout' },
          { f: 'inventory.stochastic-newsvendor', d: 'on', r: '40%', t: '16/42', s: 'rollout' },
          { f: 'compliance.csrd-auto-export', d: 'off', r: '8%', t: '3/42', s: 'beta' },
          { f: 'ui.dark-canvas-experiment', d: 'off', r: '0%', t: 'internal', s: 'shadow' },
        ].map((r, i, a) => (
          <div key={r.f} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 100px 110px 90px 60px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{r.f}</span>
            <Pill tone={r.d === 'on' ? 'good' : 'bone'} mono>{r.d}</Pill>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                <div style={{ width: r.r, height: '100%', background: 'var(--signal)' }} />
              </div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r.r}</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.t}</span>
            <Pill tone={r.s === 'GA' ? 'good' : r.s === 'rollout' ? 'signal' : 'bone'} mono>{r.s}</Pill>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

// =====================================================
// BILLING
// =====================================================
function BillingPage() {
  return (
    <PrescientShell active="billing" title="Billing" breadcrumb={['Settings']}>
      <PageBody>
        <PageHero
          eyebrow="Billing · current cycle"
          headline="Enterprise · $48,000/mo · paid through May 31."
          sub="Annual contract · auto-renews Dec 14, 2026."
          meta={['8 invoices', '0 past due', <span key="t" className="mono">last sync 14:31</span>]}
          action={<Btn kind="ghost" sm icon={<Icon.External s={11} />}>Download invoices</Btn>} />

        <KpiStrip items={[
          { label: 'Plan', value: 'Enterprise' },
          { label: 'Monthly', value: '$48K' },
          { label: 'Members', value: '18 / 30 seats' },
          { label: 'Spend YTD', value: '$192K' },
          { label: 'Next invoice', value: 'May 31' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Card eyebrow="Invoices · last 8" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 90px 100px 110px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Invoice', 'Period', 'Amount', 'Due', 'State', ''].map(h => <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>)}
            </div>
            {[
              { id: 'INV-2026-04', p: 'Apr 2026', a: '$48,000', d: 'May 31', s: 'open' },
              { id: 'INV-2026-03', p: 'Mar 2026', a: '$48,000', d: 'Apr 30', s: 'paid' },
              { id: 'INV-2026-02', p: 'Feb 2026', a: '$48,000', d: 'Mar 31', s: 'paid' },
              { id: 'INV-2026-01', p: 'Jan 2026', a: '$48,000', d: 'Feb 28', s: 'paid' },
              { id: 'INV-2025-12', p: 'Dec 2025', a: '$42,000', d: 'Jan 31', s: 'paid' },
              { id: 'INV-2025-11', p: 'Nov 2025', a: '$42,000', d: 'Dec 31', s: 'paid' },
            ].map((r, i, a) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '110px 90px 100px 110px 80px 24px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>{r.id}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.p}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{r.a}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.d}</span>
                <Pill tone={r.s === 'paid' ? 'good' : 'signal'} mono>{r.s}</Pill>
                <Icon.External s={11} />
              </div>
            ))}
          </Card>
          <Card eyebrow="Payment method" title="On file" padded={false}>
            <div style={{ padding: '20px 18px' }}>
              <div className="mono" style={{ fontSize: 14, color: 'var(--bone)' }}>ACH · Bank of America</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>•••• 8842 · routing •••• 2114</div>
              <Hairline style={{ margin: '18px 0' }} />
              <Eyebrow>Billing contact</Eyebrow>
              <div style={{ fontSize: 12.5, color: 'var(--bone)', marginTop: 8 }}>finance@ridgeview.com</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>CC: m.okafor@ridgeview.com</div>
              <Hairline style={{ margin: '18px 0' }} />
              <Eyebrow>Tax</Eyebrow>
              <div className="mono" style={{ fontSize: 12, color: 'var(--bone)', marginTop: 8 }}>EIN 84-2841992 · DE</div>
            </div>
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// SCENARIOS — ScenarioBuilder, ScenarioCompare
// =====================================================
function ScenarioBuilderPage() {
  return (
    <PrescientShell active="scenario-build" title="Scenario Builder" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Build · scenario #SC-2814"
          headline="What if Han Steel cuts allocation 40% in May?"
          sub="Building from 'Imbalanced Excess' regime, current book."
          meta={['1,284 SKUs', '8-week horizon', <span key="r"><RegimeBadge size="sm" /></span>]}
          action={<div style={{ display: 'flex', gap: 8 }}><Btn kind="ghost" sm>Save draft</Btn><Btn kind="primary" sm icon={<Icon.Play s={11} />}>Run</Btn></div>} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Driver · 1 of 4" title="Han Steel allocation" padded={false}>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--soft)', marginBottom: 14 }}>Reduce monthly allocation by</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <input type="range" min="0" max="100" defaultValue="40" style={{ flex: 1, accentColor: 'var(--bone)' }} />
                <span className="mono" style={{ fontSize: 22, color: 'var(--bone)', minWidth: 60, textAlign: 'right' }}>−40%</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Effective May 1 · 6,800 → 4,080 MT/mo</div>
            </div>
          </Card>
          <Card eyebrow="Drivers" title="3 more applied" padded={false}>
            {[
              { l: 'Voestalpine · activate fallback', v: '+2,400 MT/mo', tone: 'good' },
              { l: 'POSCO · add tertiary', v: '+1,200 MT/mo', tone: 'good' },
              { l: 'Demand · auto OEM', v: '+8% next 8w', tone: 'signal' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.l}</span>
                <span className="mono" style={{ fontSize: 11.5, color: it.tone === 'good' ? 'var(--good)' : 'var(--signal)', textAlign: 'right' }}>{it.v}</span>
                <Icon.X s={11} />
              </div>
            ))}
            <div style={{ padding: 12 }}><Btn kind="ghost" sm full icon={<Icon.Plus s={11} />}>Add driver</Btn></div>
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Projected outcome" title="Sim 1,000 paths · ready">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', marginTop: 12 }}>
              {[
                { l: 'Service level', v: '94.2%', d: '−2.2pp', tone: 'bad' },
                { l: 'Stockouts · 8w', v: '6', d: '+4', tone: 'bad' },
                { l: 'Δ working capital', v: '−$1.8M', d: 'tighter', tone: 'good' },
                { l: 'Total cost · 8w', v: '+$840K', d: 'fallback premium', tone: 'signal' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'var(--panel)', padding: 18 }}>
                  <Eyebrow>{c.l}</Eyebrow>
                  <div className="mono" style={{ fontSize: 22, color: 'var(--bone)', fontWeight: 300, marginTop: 6 }}>{c.v}</div>
                  <div className="mono" style={{ fontSize: 11, color: c.tone === 'good' ? 'var(--good)' : c.tone === 'bad' ? 'var(--bad)' : 'var(--signal)', marginTop: 4 }}>{c.d}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}
function ScenarioComparePage() {
  return (
    <PrescientShell active="scenario-compare" title="Scenario Compare" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Compare · 3 scenarios"
          headline="Han Steel −40% · Han Steel −80% · status quo."
          sub="Same horizon, same demand assumptions, different supply paths."
          meta={['Sim 1,000 paths', '8-week horizon']} />

        <Card eyebrow="Side-by-side" padded={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(3, 1fr)', gap: 0 }}>
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}><Eyebrow>Metric</Eyebrow></div>
            {['Status quo', 'Han −40%', 'Han −80%'].map((h, i) => (
              <div key={h} style={{ padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--line)' : 'none', borderBottom: '1px solid var(--line)', background: i === 1 ? 'var(--panel-2)' : 'transparent', borderTop: i === 1 ? '2px solid var(--signal)' : 'none' }}>
                <Eyebrow>Scenario {i + 1}</Eyebrow>
                <div style={{ fontSize: 13, color: 'var(--bone)', marginTop: 6 }}>{h}</div>
              </div>
            ))}
            {[
              { l: 'Service level', v: ['96.4%', '94.2%', '88.4%'] },
              { l: 'Stockouts · 8w', v: ['2', '6', '14'] },
              { l: 'Δ Working capital', v: ['baseline', '−$1.8M', '−$3.2M'] },
              { l: 'Total cost · 8w', v: ['baseline', '+$840K', '+$2.4M'] },
              { l: 'Concentration', v: ['Han 41%', 'Han 24%', 'Han 8%'] },
              { l: 'Recommendation', v: ['—', 'Plan A', 'Crisis only'] },
            ].map((row, ri, ra) => (
              <React.Fragment key={ri}>
                <div style={{ padding: '13px 18px', borderRight: '1px solid var(--line)', borderBottom: ri < ra.length - 1 ? '1px solid var(--line-soft)' : 'none', fontSize: 11.5, color: 'var(--soft)' }}>{row.l}</div>
                {row.v.map((v, ci) => (
                  <div key={ci} className="mono" style={{ padding: '13px 18px', borderRight: ci < 2 ? '1px solid var(--line)' : 'none', borderBottom: ri < ra.length - 1 ? '1px solid var(--line-soft)' : 'none', background: ci === 1 ? 'var(--panel-2)' : 'transparent', fontSize: 12, color: 'var(--bone)' }}>{v}</div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </Card>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// MARKETING / PUBLIC — landing, pricing, security, careers
// (compact, share a header)
// =====================================================
function MarketingShell({ children }) {
  return (
    <div style={{ background: 'var(--ink)', minHeight: '100%', color: 'var(--bone)', fontFamily: 'inherit' }}>
      <header style={{ padding: '20px 56px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, background: 'var(--bone)' }} />
          <span style={{ fontSize: 13, color: 'var(--bone)', letterSpacing: '0.02em' }}>Prescient Labs</span>
        </div>
        <nav style={{ display: 'flex', gap: 22, fontSize: 12.5, color: 'var(--soft)', marginLeft: 12 }}>
          {['Product', 'Pricing', 'Security', 'Customers', 'Company', 'Careers', 'Docs'].map(t => <span key={t} style={{ cursor: 'pointer' }}>{t}</span>)}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Btn kind="ghost" sm>Sign in</Btn>
          <Btn kind="primary" sm>Request access</Btn>
        </div>
      </header>
      {children}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '32px 56px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span>© 2026 Prescient Labs</span>
        <span className="mono">SOC 2 · ISO 27001 · GDPR</span>
      </footer>
    </div>
  );
}
function MarketingLandingPage() {
  return (
    <MarketingShell>
      <section style={{ padding: '96px 56px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>Operating system for industrial supply chains</Eyebrow>
        <h1 style={{ fontSize: 56, fontWeight: 300, color: 'var(--bone)', margin: '14px 0 18px', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
          Five things to know.<br />Sourced. Reasoned. Yours by 7am.
        </h1>
        <div style={{ fontSize: 16, color: 'var(--soft)', maxWidth: 620, lineHeight: 1.55, marginBottom: 32 }}>
          A regime-aware system that watches your suppliers, forecasts your demand, and operates your procurement — so your team makes ten right decisions a day instead of a hundred close ones.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Btn kind="primary">Request access</Btn>
          <Btn kind="ghost">Watch the brief</Btn>
        </div>
      </section>
      <section style={{ padding: '48px 56px', borderTop: '1px solid var(--line)', maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>What it does</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginTop: 18 }}>
          {[
            { t: 'Regime intelligence', d: 'FDR-driven view of when normal rules stop working. Live across your book.' },
            { t: 'Forecasts that age well', d: 'Ensemble v4.2.1 · 6.4% MAPE · regime-conditioned · with uncertainty.' },
            { t: 'Procurement on autopilot', d: 'Auto-route POs, run RFQs, escalate the close calls — with full audit.' },
            { t: 'Multi-tier traceability', d: 'See your supplier\'s supplier\'s mill. Lot-level. CSRD-ready.' },
            { t: 'Agents you can trust', d: 'Every agent has a leash, a budget, an audit log. Nothing surprises you.' },
            { t: 'AI Advisor', d: 'A morning brief sourced to evidence, with confidence on every claim.' },
          ].map((c) => (
            <div key={c.t} style={{ background: 'var(--panel)', padding: '24px 22px' }}>
              <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, marginBottom: 8 }}>{c.t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--soft)', lineHeight: 1.6 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: '64px 56px', borderTop: '1px solid var(--line)', maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>Customers · industrial · diversified · auto</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 32, marginTop: 24, opacity: 0.7 }}>
          {['Ridgeview', 'Northwind', 'Crescendo', 'Avantis', 'Helios', 'Coronis'].map(n => (
            <div key={n} className="mono" style={{ fontSize: 14, color: 'var(--soft)', textAlign: 'center', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>{n}</div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
function MarketingPricingPage() {
  return (
    <MarketingShell>
      <section style={{ padding: '64px 56px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>Pricing</Eyebrow>
        <h1 style={{ fontSize: 40, fontWeight: 300, color: 'var(--bone)', margin: '12px 0 14px', letterSpacing: '-0.02em' }}>One contract per workspace.</h1>
        <div style={{ fontSize: 14, color: 'var(--soft)' }}>Annual · invoiced · no per-seat lock-in.</div>
      </section>
      <section style={{ padding: '24px 56px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { t: 'Starter', p: '$18K/mo', sub: 'Single-plant · ≤ 200 SKUs', f: ['1 ERP integration', '4 commodities', 'Up to 8 users', 'Email support'] },
            { t: 'Pro', p: '$28K/mo', sub: 'Mid-market · ≤ 1,000 SKUs · 4 plants', f: ['All integrations', '12 commodities', 'Up to 24 users', 'Slack support · 4h SLA', 'Auto-PO routing'], highlight: true },
            { t: 'Enterprise', p: 'Custom', sub: 'Multi-plant · multi-region · custom retention', f: ['Custom integrations', 'Unlimited commodities', 'Unlimited users', 'Dedicated CSM · 1h SLA', 'Custom agents', 'EU residency', 'SOC2 + custom reports'] },
          ].map((p, i) => (
            <div key={p.t} style={{ background: 'var(--panel)', padding: 28, borderTop: p.highlight ? '2px solid var(--signal)' : 'none' }}>
              <Eyebrow>{p.t}</Eyebrow>
              <div className="mono" style={{ fontSize: 30, color: 'var(--bone)', fontWeight: 300, marginTop: 12 }}>{p.p}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, marginBottom: 22 }}>{p.sub}</div>
              {p.f.map(it => (
                <div key={it} style={{ fontSize: 12.5, color: 'var(--soft)', padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>{it}</div>
              ))}
              <div style={{ marginTop: 22 }}><Btn kind={p.highlight ? 'primary' : 'ghost'} full>Talk to us</Btn></div>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
function MarketingSecurityPage() {
  return (
    <MarketingShell>
      <section style={{ padding: '64px 56px', maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>Security & trust</Eyebrow>
        <h1 style={{ fontSize: 40, fontWeight: 300, color: 'var(--bone)', margin: '12px 0 14px', letterSpacing: '-0.02em' }}>Enterprise grade, by default.</h1>
        <div style={{ fontSize: 14, color: 'var(--soft)', maxWidth: 620, marginBottom: 36, lineHeight: 1.55 }}>
          Every data path encrypted. Every action logged. Every model decision sourced. We don't ship a feature without an audit trail.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { t: 'SOC 2 · Type II', d: 'Active · renewed Mar 14, 2026' },
            { t: 'ISO 27001', d: 'Cert 2024-08-22 · 3-year' },
            { t: 'GDPR', d: 'In compliance · DPO on staff' },
            { t: 'Encryption', d: 'AES-256 at rest · TLS 1.3 in transit · per-tenant keys' },
            { t: 'Penetration testing', d: 'Annual · Bishop Fox' },
            { t: 'EU residency', d: 'Available · Frankfurt · contact sales' },
          ].map(c => (
            <div key={c.t} style={{ background: 'var(--panel)', padding: 22 }}>
              <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, marginBottom: 6 }}>{c.t}</div>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>{c.d}</div>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
function MarketingCareersPage() {
  return (
    <MarketingShell>
      <section style={{ padding: '64px 56px', maxWidth: 1100, margin: '0 auto' }}>
        <Eyebrow>Careers</Eyebrow>
        <h1 style={{ fontSize: 40, fontWeight: 300, color: 'var(--bone)', margin: '12px 0 14px', letterSpacing: '-0.02em' }}>Join us. Bring your hands.</h1>
        <div style={{ fontSize: 14, color: 'var(--soft)', maxWidth: 620, marginBottom: 36, lineHeight: 1.55 }}>
          We're building the system that operates industrial supply chains. Rigor over polish. Evidence over prose.
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          {[
            { t: 'Forecast research engineer', l: 'NYC · hybrid', d: 'Ensembles, regime models, calibrated uncertainty.' },
            { t: 'Procurement product engineer', l: 'NYC · onsite', d: 'Build the auto-routing engine and approval graph.' },
            { t: 'Senior designer · systems', l: 'NYC / SF · hybrid', d: 'Own the dense-information design language end to end.' },
            { t: 'Customer engineer · enterprise', l: 'Remote · US/EU', d: 'Onboard customers from kickoff to live.' },
            { t: 'Trust & reliability lead', l: 'NYC · hybrid', d: 'SOC2, FedRAMP path, security posture.' },
          ].map((j, i, a) => (
            <div key={j.t} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 130px 80px', gap: 16, padding: '18px 22px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--bone)' }}>{j.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{j.d}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--soft)' }}>{j.l}</span>
              <Pill tone="bone" mono>Open</Pill>
              <Btn kind="ghost" sm>Apply</Btn>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

// expose all
Object.assign(window, {
  SettingsProfilePage, TeamPage, WorkspacePage, NotificationsPage, IntegrationsPage,
  SecurityPage, DataResidencyPage, TrustCenterPage,
  SignInPage, SignUpPage, SSOCallbackPage,
  OnboardingConnect1Page, OnboardingConnect2Page, OnboardingReadyPage,
  AdminTenantsPage, AdminUsersPage, AdminAuditPage, AdminFlagsPage,
  BillingPage,
  ScenarioBuilderPage, ScenarioComparePage,
  MarketingLandingPage, MarketingPricingPage, MarketingSecurityPage, MarketingCareersPage,
});
