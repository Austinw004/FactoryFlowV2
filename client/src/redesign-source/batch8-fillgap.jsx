/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark */

// ============================================================
// BATCH 8 — FILL GAP
// 31 pages from client/src/pages/ that were not covered by the
// first 7 batches. Same visual language: ink/bone/signal palette,
// Inter + Inter Tight + JetBrains Mono, hairlines, eyebrows, sparks.
// ============================================================

// ---------- shared compact primitives ----------
function Card({ title, eyebrow, action, children, pad = 18 }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)', padding: pad }}>
      {(title || eyebrow || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && <div style={{ fontSize: 16, color: 'var(--bone)', marginTop: 4, fontWeight: 400 }}>{title}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
function KV({ k, v, mono, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</div>
      <div className={mono ? 'mono' : ''} style={{ fontSize: 13, color: tone === 'bad' ? 'var(--danger)' : tone === 'good' ? 'var(--good)' : 'var(--bone)' }}>{v}</div>
    </div>
  );
}
function TableRow({ cols, head }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols.map(c => c.w || '1fr').join(' '), gap: 14, padding: '11px 14px', borderBottom: head ? '1px solid var(--line)' : '1px solid var(--line-soft)', alignItems: 'center' }}>
      {cols.map((c, i) => (
        <div key={i} className={c.mono ? 'mono' : ''} style={{
          fontSize: head ? 10.5 : 12.5,
          letterSpacing: head ? '0.16em' : 0,
          textTransform: head ? 'uppercase' : 'none',
          color: head ? 'var(--muted)' : (c.tone === 'bad' ? 'var(--danger)' : c.tone === 'good' ? 'var(--good)' : c.tone === 'signal' ? 'var(--signal)' : 'var(--bone)'),
          textAlign: c.right ? 'right' : 'left',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{c.v}</div>
      ))}
    </div>
  );
}
function DocLayout({ title, subtitle, children, active = 'docs' }) {
  return (
    <PrescientShell active={active} title={title} breadcrumb={['Resources']}>
      <div style={{ padding: 36, maxWidth: 920 }}>
        <Eyebrow>Document</Eyebrow>
        <h1 style={{ fontSize: 32, fontWeight: 300, color: 'var(--bone)', margin: '8px 0 6px', letterSpacing: '-0.01em' }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>{subtitle}</div>}
        <Hairline />
        <div style={{ marginTop: 28, fontSize: 14, color: 'var(--soft)', lineHeight: 1.65 }}>{children}</div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 1. ActionPlaybooks
// ============================================================
function ActionPlaybooksPage() {
  const plays = [
    { n: 'Regime shift · Imbalanced Excess', triggers: 'FDR > 2.0', steps: 7, last: 'Apr 26 14:31', runs: 14, tone: 'signal' },
    { n: 'Supplier OTD breach · tier 1', triggers: 'OTD < 80% · 14d', steps: 5, last: 'Apr 24 09:12', runs: 8, tone: 'bad' },
    { n: 'Tariff event · steel HS 7208', triggers: 'Section 232 amend', steps: 6, last: 'Apr 18 11:04', runs: 3, tone: 'signal' },
    { n: 'Inventory shortfall · auto-restock', triggers: 'On-hand < safety', steps: 4, last: 'Apr 26 06:45', runs: 142, tone: 'good' },
    { n: 'Demand spike · order book', triggers: 'Δ > 12% / week', steps: 5, last: 'Apr 12 16:20', runs: 22, tone: 'good' },
  ];
  return (
    <PrescientShell active="playbooks" title="Action Playbooks" breadcrumb={['Operations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Active playbooks" subtitle="Pre-authored response plans · trigger-driven" right={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New playbook</Btn>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'Playbook', w: '2fr' }, { v: 'Trigger condition' }, { v: 'Steps', right: true, w: '70px' }, { v: 'Last run' }, { v: 'Total runs', right: true, w: '90px' }, { v: '', w: '110px' }]} />
          {plays.map((p, i) => (
            <TableRow key={i} cols={[
              { v: p.n, w: '2fr' },
              { v: p.triggers, mono: true, tone: p.tone },
              { v: p.steps, right: true, mono: true, w: '70px' },
              { v: p.last, mono: true },
              { v: p.runs, right: true, mono: true, w: '90px' },
              { v: <Btn kind="ghost" sm>Open</Btn>, w: '110px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 2. ApiDocumentation
// ============================================================
function ApiDocumentationPage() {
  const endpoints = [
    { m: 'GET', p: '/v1/forecast/{sku}', d: 'Single-SKU forecast with quantile bands' },
    { m: 'GET', p: '/v1/regime/current', d: 'Active regime + FDR snapshot' },
    { m: 'POST', p: '/v1/po', d: 'Create or stage a purchase order' },
    { m: 'GET', p: '/v1/inventory/{sku}', d: 'Live position · safety · DOS' },
    { m: 'GET', p: '/v1/suppliers', d: 'Directory · risk · OTD · concentration' },
    { m: 'POST', p: '/v1/scenario', d: 'Run a what-if scenario' },
    { m: 'GET', p: '/v1/events', d: 'Live event stream · macro + ops + supplier' },
    { m: 'POST', p: '/v1/advisor/ask', d: 'Conversational query · grounded' },
  ];
  return (
    <PrescientShell active="apidocs" title="API Documentation" breadcrumb={['Resources']}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%' }}>
        <aside style={{ borderRight: '1px solid var(--line)', padding: '22px 16px', background: 'var(--ink-deep)' }}>
          <Eyebrow>Reference</Eyebrow>
          {['Authentication', 'Forecast', 'Regime', 'Inventory', 'Suppliers', 'Scenarios', 'Events', 'Advisor'].map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: i === 1 ? 'var(--bone)' : 'var(--soft)', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>{s}</div>
          ))}
        </aside>
        <div style={{ padding: 32, maxWidth: 760 }}>
          <Eyebrow>v1 · stable</Eyebrow>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--bone)', margin: '6px 0 6px' }}>Prescient API</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>REST + JSON · keys at <span className="mono">/settings/integrations</span> · 1,000 req/min default</div>
          <Hairline />
          <div style={{ marginTop: 24 }}>
            {endpoints.map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <div className="mono" style={{ fontSize: 11, color: e.m === 'GET' ? 'var(--good)' : 'var(--signal)' }}>{e.m}</div>
                <div>
                  <div className="mono" style={{ fontSize: 13, color: 'var(--bone)' }}>{e.p}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{e.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 3. BulkTest — internal QA / simulation runner
// ============================================================
function BulkTestPage() {
  const runs = [
    { n: 'Forecast accuracy · 13mo backtest', skus: 1284, status: 'Done', mape: 6.2, dur: '4m 12s', tone: 'good' },
    { n: 'Regime model · stress test', skus: 0, status: 'Running', mape: null, dur: '1m 04s', tone: 'signal' },
    { n: 'Allocation engine · 200 scenarios', skus: 0, status: 'Queued', mape: null, dur: '—', tone: 'neutral' },
    { n: 'Supplier risk · concentration sweep', skus: 47, status: 'Done', mape: null, dur: '38s', tone: 'good' },
  ];
  return (
    <PrescientShell active="bulktest" title="Bulk Test" breadcrumb={['Engineering']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Test runs" subtitle="Internal · model + engine validation"
          right={<><Btn kind="ghost" sm>History</Btn><Btn kind="primary" sm icon={<Icon.Play s={11} />}>Start run</Btn></>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'Run', w: '2fr' }, { v: 'SKUs', right: true, w: '90px' }, { v: 'Status' }, { v: 'MAPE %', right: true, w: '90px' }, { v: 'Duration', right: true, w: '110px' }]} />
          {runs.map((r, i) => (
            <TableRow key={i} cols={[
              { v: r.n, w: '2fr' },
              { v: r.skus || '—', right: true, mono: true, w: '90px' },
              { v: <Pill tone={r.tone}>{r.status}</Pill> },
              { v: r.mape != null ? r.mape : '—', right: true, mono: true, w: '90px' },
              { v: r.dur, right: true, mono: true, w: '110px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 4. Compliance
// ============================================================
function CompliancePage() {
  const frames = [
    { n: 'SOC 2 Type II', state: 'Current', exp: 'Sep 2026', controls: 124, gaps: 0, tone: 'good' },
    { n: 'ISO 27001', state: 'Current', exp: 'Mar 2027', controls: 114, gaps: 1, tone: 'good' },
    { n: 'GDPR', state: 'Current', exp: 'Continuous', controls: 38, gaps: 0, tone: 'good' },
    { n: 'CCPA', state: 'Current', exp: 'Continuous', controls: 22, gaps: 0, tone: 'good' },
    { n: 'NIST CSF 2.0', state: 'In progress', exp: 'Q3 2026', controls: 108, gaps: 14, tone: 'signal' },
  ];
  return (
    <PrescientShell active="compliance" title="Compliance" breadcrumb={['Trust']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Frameworks" subtitle="Live posture · evidence collected continuously"
          right={<Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export evidence</Btn>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {frames.map((f, i) => (
            <Card key={i} eyebrow={f.state} title={f.n} action={<Pill tone={f.tone}>{f.gaps === 0 ? 'No gaps' : f.gaps + ' gaps'}</Pill>}>
              <KV k="Renews" v={f.exp} />
              <KV k="Controls in scope" v={f.controls} mono />
              <KV k="Open findings" v={f.gaps} mono tone={f.gaps > 0 ? 'signal' : 'good'} />
              <KV k="Last attested" v="Apr 22, 2026" />
            </Card>
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 5. Configuration
// ============================================================
function ConfigurationPage() {
  return (
    <PrescientShell active="config" title="Configuration" breadcrumb={['Settings']}>
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28 }}>
        <aside>
          <Eyebrow>Sections</Eyebrow>
          {['Forecasting', 'Regime model', 'Inventory rules', 'Approval thresholds', 'Working hours', 'Currencies', 'Units of measure'].map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: i === 1 ? 'var(--bone)' : 'var(--soft)', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>{s}</div>
          ))}
        </aside>
        <Card eyebrow="Regime model" title="Detection thresholds">
          <KV k="FDR threshold · imbalance" v="2.0" mono />
          <KV k="FDR threshold · severe" v="2.5" mono />
          <KV k="Hold-period (min)" v="14 days" mono />
          <KV k="Cool-down" v="7 days" mono />
          <KV k="Required signals" v="Macro · Demand · Logistics" />
          <KV k="Minimum confidence" v="0.78" mono />
          <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
            <Btn kind="ghost" sm>Reset to default</Btn>
            <Btn kind="primary" sm>Save changes</Btn>
          </div>
        </Card>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 6. Contact (marketing)
// ============================================================
function ContactPage() {
  return (
    <PrescientShell active="contact" title="Contact" breadcrumb={['Public']}>
      <div style={{ padding: 36, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 36, maxWidth: 1080 }}>
        <div>
          <Eyebrow>Get in touch</Eyebrow>
          <h1 style={{ fontSize: 38, fontWeight: 300, color: 'var(--bone)', margin: '6px 0 12px', letterSpacing: '-0.015em' }}>Talk to a manufacturing expert.</h1>
          <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 540, lineHeight: 1.6, marginBottom: 28 }}>We'll show you the live regime engine on a sample of your data and walk you through what early-warning looks like in your SKUs.</div>
          <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)', padding: 22 }}>
            {['Name', 'Work email', 'Company', 'Role', 'What are you trying to solve?'].map((l, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{l}</div>
                <div style={{ height: i === 4 ? 80 : 38, background: 'var(--ink)', border: '1px solid var(--line)' }} />
              </div>
            ))}
            <Btn kind="primary">Send request</Btn>
          </div>
        </div>
        <div>
          <Card eyebrow="Direct">
            <KV k="Sales" v="sales@prescient-labs.com" mono />
            <KV k="Pilot program" v="pilot@prescient-labs.com" mono />
            <KV k="Press" v="press@prescient-labs.com" mono />
            <KV k="HQ" v="San Francisco, CA" />
            <KV k="Response time" v="< 24h business days" />
          </Card>
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 7. DigitalTwin
// ============================================================
function DigitalTwinPage() {
  const lines = [
    { id: 'L-01', n: 'CRC slitting · line A', util: 87, throughput: '142 MT/d', wip: 38, status: 'good' },
    { id: 'L-02', n: 'CRC slitting · line B', util: 94, throughput: '148 MT/d', wip: 42, status: 'good' },
    { id: 'L-03', n: 'Galvanizing · line 1', util: 62, throughput: '88 MT/d', wip: 24, status: 'signal' },
    { id: 'L-04', n: 'Coil packaging', util: 79, throughput: '230 MT/d', wip: 18, status: 'good' },
    { id: 'L-05', n: 'CMP polish · cell 3', util: 0, throughput: '— · down', wip: 0, status: 'bad' },
  ];
  return (
    <PrescientShell active="twin" title="Digital Twin" breadcrumb={['Operations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Plant digital twin" subtitle="Live shop-floor state · Tianjin works · Apr 26 14:31"
          right={<><Btn kind="ghost" sm>3D view</Btn><Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export state</Btn></>} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
          <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)', height: 520, position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 800 520" style={{ width: '100%', height: '100%' }}>
              {/* schematic line layout */}
              {[60, 160, 260, 360, 460].map((y, i) => (
                <g key={i}>
                  <rect x={60} y={y} width={680} height={50} fill="none" stroke="var(--line)" strokeWidth="1" />
                  <rect x={60} y={y} width={680 * (lines[i].util / 100)} height={50} fill={lines[i].status === 'good' ? 'var(--good)' : lines[i].status === 'signal' ? 'var(--signal)' : 'var(--danger)'} fillOpacity="0.18" />
                  <text x={70} y={y + 22} fill="var(--bone)" fontSize="12">{lines[i].id} · {lines[i].n}</text>
                  <text x={70} y={y + 38} fill="var(--muted)" fontSize="10.5" fontFamily="'Inter Tight', sans-serif">{lines[i].util}% util · WIP {lines[i].wip}</text>
                  <text x={730} y={y + 30} fill="var(--soft)" fontSize="11" textAnchor="end" fontFamily="'Inter Tight', sans-serif">{lines[i].throughput}</text>
                </g>
              ))}
            </svg>
          </div>
          <div>
            <Card eyebrow="Plant totals">
              <KV k="OEE · today" v="76.4%" mono tone="good" />
              <KV k="Throughput" v="608 MT/d" mono />
              <KV k="WIP" v="122 MT" mono />
              <KV k="Down lines" v="1 of 5" mono tone="bad" />
              <KV k="Open work orders" v="14" mono />
              <KV k="Crew on shift" v="38" mono />
            </Card>
          </div>
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 8. ErpTemplates
// ============================================================
function ErpTemplatesPage() {
  const tpls = [
    { erp: 'SAP S/4HANA', map: '128 fields · 14 tables', status: 'Live', last: 'Apr 26 14:31', tone: 'good' },
    { erp: 'NetSuite', map: '94 fields · 11 records', status: 'Live', last: 'Apr 26 14:31', tone: 'good' },
    { erp: 'Oracle Fusion', map: '116 fields · 13 tables', status: 'Live', last: 'Apr 22 09:00', tone: 'good' },
    { erp: 'Microsoft Dynamics 365', map: '88 fields · 9 entities', status: 'Beta', last: 'Apr 18 11:04', tone: 'signal' },
    { erp: 'Infor LN', map: '72 fields · 8 tables', status: 'Beta', last: 'Apr 14 16:22', tone: 'signal' },
    { erp: 'Epicor Kinetic', map: '64 fields · 7 entities', status: 'Coming soon', last: '—', tone: 'neutral' },
  ];
  return (
    <PrescientShell active="erp" title="ERP Templates" breadcrumb={['Integrations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Pre-built field maps" subtitle="Drop-in mappings for major ERPs · adjust in Configuration"
          right={<Btn kind="ghost" sm>Compare templates</Btn>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'ERP', w: '1fr' }, { v: 'Mapping' }, { v: 'Status', w: '140px' }, { v: 'Last sync', w: '160px' }, { v: '', w: '120px' }]} />
          {tpls.map((t, i) => (
            <TableRow key={i} cols={[
              { v: t.erp, w: '1fr' },
              { v: t.map },
              { v: <Pill tone={t.tone}>{t.status}</Pill>, w: '140px' },
              { v: t.last, mono: true, w: '160px' },
              { v: <Btn kind="ghost" sm>Configure</Btn>, w: '120px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 9. ForgotPasswordPage / 10. ResetPasswordPage
// ============================================================
function AuthCard({ eyebrow, title, sub, children, footer }) {
  return (
    <PrescientShell active="signin" title="" breadcrumb={[]} hideTopbar>
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 40, background: 'var(--ink-deep)' }}>
        <div style={{ width: 420, background: 'var(--ink)', border: '1px solid var(--line)', padding: 36 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 style={{ fontSize: 26, fontWeight: 300, color: 'var(--bone)', margin: '8px 0 6px', letterSpacing: '-0.01em' }}>{title}</h1>
          {sub && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.55 }}>{sub}</div>}
          {children}
          {footer && <div style={{ marginTop: 22, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{footer}</div>}
        </div>
      </div>
    </PrescientShell>
  );
}
function ForgotPasswordPage() {
  return (
    <AuthCard eyebrow="Forgot password" title="Reset by email" sub="Enter the email tied to your workspace and we'll send a one-time reset link." footer={<>Remembered? <span style={{ color: 'var(--bone)' }}>Sign in</span></>}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Work email</div>
        <div style={{ height: 38, background: 'var(--ink-deep)', border: '1px solid var(--line)' }} />
      </div>
      <Btn kind="primary" full>Send reset link</Btn>
    </AuthCard>
  );
}
function ResetPasswordPage() {
  return (
    <AuthCard eyebrow="Set new password" title="Choose a new password" sub="At least 12 characters · mix of letter, number, and symbol." footer={<>Need help? <span style={{ color: 'var(--bone)' }}>Contact support</span></>}>
      {['New password', 'Confirm password'].map((l, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{l}</div>
          <div style={{ height: 38, background: 'var(--ink-deep)', border: '1px solid var(--line)' }} />
        </div>
      ))}
      <Btn kind="primary" full>Save and sign in</Btn>
    </AuthCard>
  );
}

// ============================================================
// 11. HowItWorks (marketing)
// ============================================================
function HowItWorksPage() {
  const steps = [
    { n: '01', t: 'Connect your systems', d: 'ERP, MES, planning, and one or two market feeds. We backfill 13 months and keep streaming.' },
    { n: '02', t: 'Calibrate the regime engine', d: 'We learn your baseline — supplier OTD, demand cadence, working capital tolerance — over the first cycle.' },
    { n: '03', t: 'Watch the FDR', d: 'Forecast Drift Ratio gives one number for system health. Above 2.0, the engine flags a regime shift.' },
    { n: '04', t: 'Take action', d: 'Pre-authored playbooks fire. Procurement holds. Suppliers are notified. The advisor explains why.' },
  ];
  return (
    <PrescientShell active="how" title="How it works" breadcrumb={['Public']}>
      <div style={{ padding: 40, maxWidth: 880 }}>
        <Eyebrow>Method</Eyebrow>
        <h1 style={{ fontSize: 40, fontWeight: 300, color: 'var(--bone)', margin: '6px 0 32px', letterSpacing: '-0.015em' }}>From signal to action in four steps.</h1>
        <Hairline />
        <div style={{ marginTop: 28 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 20, padding: '24px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="mono" style={{ fontSize: 22, color: 'var(--muted)', fontWeight: 300 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 18, color: 'var(--bone)', fontWeight: 400, marginBottom: 6 }}>{s.t}</div>
                <div style={{ fontSize: 13.5, color: 'var(--soft)', lineHeight: 1.6 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 12. IntegrationChecklist
// ============================================================
function IntegrationChecklistPage() {
  const groups = [
    { g: 'Systems of record', items: [
      { n: 'ERP — SAP S/4HANA', s: 'done' },
      { n: 'MES — Rockwell FactoryTalk', s: 'done' },
      { n: 'Planning — Kinaxis', s: 'in-progress' },
    ]},
    { g: 'Market feeds', items: [
      { n: 'Commodities — LME copper, alu, steel', s: 'done' },
      { n: 'FX — major pairs', s: 'done' },
      { n: 'Tariff & trade — USTR · WTO · EU', s: 'todo' },
    ]},
    { g: 'Notifications', items: [
      { n: 'Slack — #ops-floor', s: 'done' },
      { n: 'Email — daily digest', s: 'done' },
      { n: 'PagerDuty — sev-1 only', s: 'todo' },
    ]},
  ];
  return (
    <PrescientShell active="checklist" title="Integration Checklist" breadcrumb={['Setup']}>
      <div style={{ padding: 28, maxWidth: 760 }}>
        <SectionHead title="Setup progress" subtitle="6 of 9 connected · 2 in progress · 3 pending" />
        {groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 28 }}>
            <Eyebrow>{g.g}</Eyebrow>
            <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)', marginTop: 8 }}>
              {g.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < g.items.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 14, height: 14, border: '1px solid var(--line)', background: it.s === 'done' ? 'var(--good)' : 'transparent', display: 'grid', placeItems: 'center' }}>
                      {it.s === 'done' && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="var(--ink)" strokeWidth="2" fill="none" /></svg>}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--bone)' }}>{it.n}</div>
                  </div>
                  <Pill tone={it.s === 'done' ? 'good' : it.s === 'in-progress' ? 'signal' : 'neutral'}>{it.s === 'done' ? 'Connected' : it.s === 'in-progress' ? 'In progress' : 'Pending'}</Pill>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 13. LeadsAdmin
// ============================================================
function LeadsAdminPage() {
  const leads = [
    { co: 'Northstar Steel', country: 'US', stage: 'Qualified', mrr: '$24K est.', poc: 'D. Hahn', last: '2h ago' },
    { co: 'Boryeong Cement', country: 'KR', stage: 'Discovery', mrr: '$18K est.', poc: 'M. Park', last: '6h ago' },
    { co: 'Vega Aluminum', country: 'BR', stage: 'Pilot', mrr: '$32K · live', poc: 'L. Ferreira', last: '14:31' },
    { co: 'Greenstone Glass', country: 'UK', stage: 'Lost', mrr: '—', poc: 'A. Bell', last: '4d ago' },
    { co: 'Hokuriku Wire', country: 'JP', stage: 'Qualified', mrr: '$22K est.', poc: 'T. Sato', last: '1d ago' },
  ];
  return (
    <PrescientShell active="leads" title="Leads · Admin" breadcrumb={['Admin']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Pipeline" subtitle="Inbound + outbound · 14 active accounts"
          right={<><Btn kind="ghost" sm>Filter</Btn><Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New lead</Btn></>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'Company', w: '1fr' }, { v: 'Country', w: '90px' }, { v: 'Stage', w: '140px' }, { v: 'MRR' }, { v: 'POC' }, { v: 'Last activity', right: true, w: '120px' }]} />
          {leads.map((l, i) => (
            <TableRow key={i} cols={[
              { v: l.co, w: '1fr' },
              { v: l.country, mono: true, w: '90px' },
              { v: <Pill tone={l.stage === 'Pilot' ? 'good' : l.stage === 'Lost' ? 'bad' : 'signal'}>{l.stage}</Pill>, w: '140px' },
              { v: l.mrr, mono: true },
              { v: l.poc },
              { v: l.last, right: true, mono: true, w: '120px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 14. Machinery
// ============================================================
function MachineryPage() {
  const m = [
    { id: 'EQ-3401', n: 'CRC mill · Stand 1', mfg: 'SMS group', age: '8 yrs', state: 'Running', oee: 87, next: 'May 12', tone: 'good' },
    { id: 'EQ-3402', n: 'CRC mill · Stand 2', mfg: 'SMS group', age: '8 yrs', state: 'Running', oee: 91, next: 'May 12', tone: 'good' },
    { id: 'EQ-3501', n: 'Galv line · entry', mfg: 'Tenova', age: '5 yrs', state: 'Idle', oee: 62, next: 'May 02', tone: 'signal' },
    { id: 'EQ-3502', n: 'Galv pot', mfg: 'Tenova', age: '5 yrs', state: 'Running', oee: 84, next: 'Jun 18', tone: 'good' },
    { id: 'EQ-3601', n: 'CMP polish · cell 3', mfg: 'Applied Materials', age: '3 yrs', state: 'Down', oee: 0, next: 'Apr 27', tone: 'bad' },
  ];
  return (
    <PrescientShell active="machinery" title="Machinery" breadcrumb={['Operations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Asset register" subtitle="42 assets · 5 critical · 2 in maintenance window"
          right={<Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export CSV</Btn>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[
            { v: 'ID', w: '110px' }, { v: 'Asset', w: '2fr' }, { v: 'Mfg' }, { v: 'Age', w: '70px' },
            { v: 'State', w: '110px' }, { v: 'OEE %', right: true, w: '90px' }, { v: 'Next PM', right: true, w: '110px' }
          ]} />
          {m.map((x, i) => (
            <TableRow key={i} cols={[
              { v: x.id, mono: true, w: '110px' },
              { v: x.n, w: '2fr' },
              { v: x.mfg },
              { v: x.age, mono: true, w: '70px' },
              { v: <Pill tone={x.tone}>{x.state}</Pill>, w: '110px' },
              { v: x.oee, right: true, mono: true, w: '90px', tone: x.oee === 0 ? 'bad' : 'good' },
              { v: x.next, right: true, mono: true, w: '110px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 15. PilotProgram
// ============================================================
function PilotProgramPage() {
  return (
    <PrescientShell active="pilot" title="Pilot Program" breadcrumb={['Public']}>
      <div style={{ padding: 40, maxWidth: 920 }}>
        <Eyebrow>Pilot · 90 days</Eyebrow>
        <h1 style={{ fontSize: 40, fontWeight: 300, color: 'var(--bone)', margin: '6px 0 12px', letterSpacing: '-0.015em' }}>See your real regime in 14 days.</h1>
        <div style={{ fontSize: 15, color: 'var(--soft)', maxWidth: 640, lineHeight: 1.65, marginBottom: 32 }}>Connect three systems. We backfill 13 months, calibrate the regime engine on your data, and run a live shadow forecast against your current planning cycle for 90 days.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { d: 'Day 0–3', t: 'Connect', body: 'Read-only credentials. SAP, NetSuite, or Oracle. We do the field mapping.' },
            { d: 'Day 3–14', t: 'Calibrate', body: 'Backfill, baseline, regime fit. You get a tour of your own data.' },
            { d: 'Day 14–90', t: 'Run', body: 'Daily forecasts in your inbox. Side-by-side with your planning team.' },
          ].map((p, i) => (
            <Card key={i} eyebrow={p.d} title={p.t}><div style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6 }}>{p.body}</div></Card>
          ))}
        </div>
        <Hairline />
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Btn kind="primary">Apply for pilot</Btn>
          <Btn kind="ghost">Read pilot terms</Btn>
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 16. PlatformAnalytics / 17. PlatformOwnerAnalytics
// ============================================================
function PlatformAnalyticsPage() {
  return (
    <PrescientShell active="platanalytics" title="Platform Analytics" breadcrumb={['Admin']}>
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { l: 'Active workspaces', v: '42', s: '+3 / 30d' },
          { l: 'WAU · members', v: '1,284', s: '+8.2%' },
          { l: 'Forecasts · 24h', v: '184K', s: '+12%' },
          { l: 'Median MAPE', v: '6.2%', s: '−0.4 pp' },
          { l: 'API calls · 24h', v: '4.8M', s: '+5.1%' },
          { l: 'Advisor sessions · 24h', v: '342', s: '+22%' },
          { l: 'Median session', v: '4m 12s', s: '+12s' },
          { l: 'Uptime · 30d', v: '99.98%', s: 'SLO 99.9%' },
        ].map((k, i) => (
          <Card key={i} eyebrow={k.l} pad={16}>
            <div className="mono" style={{ fontSize: 26, color: 'var(--bone)', fontWeight: 300 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{k.s}</div>
            <div style={{ marginTop: 10 }}><Spark width={120} height={28} /></div>
          </Card>
        ))}
      </div>
    </PrescientShell>
  );
}
function PlatformOwnerAnalyticsPage() {
  return (
    <PrescientShell active="ownanalytics" title="Owner Analytics" breadcrumb={['Admin']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Workspace health" subtitle="Engagement · adoption · risk by workspace" />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'Workspace', w: '1fr' }, { v: 'Plan' }, { v: 'WAU', right: true, w: '90px' }, { v: 'Adoption', right: true, w: '110px' }, { v: 'Risk', w: '110px' }, { v: 'NRR', right: true, w: '90px' }]} />
          {[
            { w: 'Ridgeview Industries', plan: 'Enterprise', wau: 142, adp: 88, risk: 'low', nrr: 124 },
            { w: 'Han Steel · pilot', plan: 'Pilot', wau: 18, adp: 62, risk: 'med', nrr: 0 },
            { w: 'Northstar Steel', plan: 'Growth', wau: 84, adp: 91, risk: 'low', nrr: 118 },
            { w: 'Vega Aluminum · pilot', plan: 'Pilot', wau: 22, adp: 71, risk: 'low', nrr: 0 },
            { w: 'Boryeong Cement', plan: 'Growth', wau: 38, adp: 54, risk: 'high', nrr: 92 },
          ].map((r, i) => (
            <TableRow key={i} cols={[
              { v: r.w, w: '1fr' },
              { v: r.plan },
              { v: r.wau, right: true, mono: true, w: '90px' },
              { v: r.adp + '%', right: true, mono: true, w: '110px' },
              { v: <Pill tone={r.risk === 'low' ? 'good' : r.risk === 'med' ? 'signal' : 'bad'}>{r.risk}</Pill>, w: '110px' },
              { v: r.nrr ? r.nrr + '%' : '—', right: true, mono: true, w: '90px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 18. PredictiveMaintenance
// ============================================================
function PredictiveMaintenancePage() {
  const items = [
    { id: 'EQ-3601', n: 'CMP polish · cell 3', sym: 'Bearing vibration · 4.8 mm/s', risk: 92, eta: 'Today', tone: 'bad' },
    { id: 'EQ-3502', n: 'Galv pot heater', sym: 'Temp drift · −2.4σ', risk: 64, eta: 'May 02', tone: 'signal' },
    { id: 'EQ-3401', n: 'CRC mill · Stand 1', sym: 'Roll wear curve', risk: 38, eta: 'May 18', tone: 'good' },
    { id: 'EQ-3501', n: 'Galv line · entry', sym: 'Drive current spike', risk: 71, eta: 'Apr 30', tone: 'signal' },
  ];
  return (
    <PrescientShell active="predmaint" title="Predictive Maintenance" breadcrumb={['Operations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="At-risk assets" subtitle="Ranked by failure probability · next 14 days"
          right={<Btn kind="ghost" sm>Schedule window</Btn>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'ID', w: '110px' }, { v: 'Asset', w: '1.4fr' }, { v: 'Symptom', w: '2fr' }, { v: 'Risk %', right: true, w: '90px' }, { v: 'Window', right: true, w: '110px' }]} />
          {items.map((x, i) => (
            <TableRow key={i} cols={[
              { v: x.id, mono: true, w: '110px' },
              { v: x.n, w: '1.4fr' },
              { v: x.sym, w: '2fr', tone: x.tone },
              { v: x.risk, right: true, mono: true, w: '90px', tone: x.risk > 80 ? 'bad' : x.risk > 50 ? 'signal' : 'good' },
              { v: x.eta, right: true, mono: true, w: '110px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 19. PrivacyPolicy / 20. TermsOfService
// ============================================================
function PrivacyPolicyPage() {
  return (
    <DocLayout title="Privacy Policy" subtitle="Effective Apr 1, 2026 · summary at top, full terms below" active="legal">
      <Eyebrow>Summary</Eyebrow>
      <p>We collect operational data you connect to us, account details for users in your workspace, and usage telemetry. We never sell data. We never train shared models on your data without an explicit opt-in.</p>
      <Hairline />
      {['1. Data we collect', '2. How we use it', '3. Sub-processors', '4. Data residency', '5. Retention & deletion', '6. Your rights', '7. Contact'].map((h, i) => (
        <div key={i} style={{ marginTop: 18 }}>
          <div style={{ fontSize: 16, color: 'var(--bone)', fontWeight: 400, marginBottom: 6 }}>{h}</div>
          <p style={{ color: 'var(--soft)' }}>Section content. Engineering will populate this from the canonical legal source. The visual treatment matches the rest of the design system.</p>
        </div>
      ))}
    </DocLayout>
  );
}
function TermsOfServicePage() {
  return (
    <DocLayout title="Terms of Service" subtitle="Effective Apr 1, 2026" active="legal">
      <Eyebrow>Summary</Eyebrow>
      <p>By using Prescient Labs you agree to use the platform for lawful manufacturing and supply-chain purposes, accept the SLA below, and acknowledge the data-handling terms in our Privacy Policy.</p>
      <Hairline />
      {['1. Account', '2. Acceptable use', '3. SLA · 99.9% uptime', '4. Fees & billing', '5. Confidentiality', '6. Termination', '7. Governing law'].map((h, i) => (
        <div key={i} style={{ marginTop: 18 }}>
          <div style={{ fontSize: 16, color: 'var(--bone)', fontWeight: 400, marginBottom: 6 }}>{h}</div>
          <p style={{ color: 'var(--soft)' }}>Section content. Engineering will populate this from the canonical legal source. The visual treatment matches the rest of the design system.</p>
        </div>
      ))}
    </DocLayout>
  );
}

// ============================================================
// 21. ProductionKPIs
// ============================================================
function ProductionKPIsPage() {
  return (
    <PrescientShell active="prodkpi" title="Production KPIs" breadcrumb={['Operations']}>
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { l: 'OEE · today', v: '76.4%', s: 'target 78', tone: 'signal' },
          { l: 'First-pass yield', v: '94.8%', s: '+0.6 pp', tone: 'good' },
          { l: 'Throughput', v: '608 MT/d', s: 'plan 620', tone: 'signal' },
          { l: 'Scrap rate', v: '2.1%', s: '−0.3 pp', tone: 'good' },
          { l: 'Schedule attainment', v: '88%', s: '7d avg', tone: 'good' },
          { l: 'Mean time to repair', v: '2h 14m', s: '−18m', tone: 'good' },
          { l: 'Mean time between failure', v: '184h', s: '+12h', tone: 'good' },
          { l: 'Energy per MT', v: '0.41 MWh', s: '−0.02', tone: 'good' },
        ].map((k, i) => (
          <Card key={i} eyebrow={k.l} pad={16}>
            <div className="mono" style={{ fontSize: 26, color: k.tone === 'bad' ? 'var(--danger)' : k.tone === 'signal' ? 'var(--signal)' : 'var(--bone)', fontWeight: 300 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{k.s}</div>
            <div style={{ marginTop: 10 }}><Spark width={120} height={28} /></div>
          </Card>
        ))}
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 22. Reports
// ============================================================
function ReportsPage() {
  const reps = [
    { n: 'Daily ops digest', kind: 'Recurring · 06:00', last: 'Today 06:00', recip: 14 },
    { n: 'Weekly procurement summary', kind: 'Recurring · Mon 08:00', last: 'Apr 22', recip: 8 },
    { n: 'Monthly board pack', kind: 'Recurring · 1st 09:00', last: 'Apr 01', recip: 5 },
    { n: 'Supplier risk · Q1', kind: 'One-off', last: 'Mar 28', recip: 3 },
    { n: 'Forecast accuracy · 13mo', kind: 'One-off', last: 'Apr 11', recip: 6 },
  ];
  return (
    <PrescientShell active="reports" title="Reports" breadcrumb={['Resources']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Saved reports" subtitle="Recurring + ad-hoc · shared with your workspace"
          right={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New report</Btn>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'Report', w: '1.6fr' }, { v: 'Kind' }, { v: 'Last sent', w: '140px' }, { v: 'Recipients', right: true, w: '110px' }, { v: '', w: '110px' }]} />
          {reps.map((r, i) => (
            <TableRow key={i} cols={[
              { v: r.n, w: '1.6fr' },
              { v: r.kind, mono: true },
              { v: r.last, mono: true, w: '140px' },
              { v: r.recip, right: true, mono: true, w: '110px' },
              { v: <Btn kind="ghost" sm>Open</Btn>, w: '110px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 23. RoiCalculator
// ============================================================
function RoiCalculatorPage() {
  return (
    <PrescientShell active="roicalc" title="ROI Calculator" breadcrumb={['Public']}>
      <div style={{ padding: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 1100 }}>
        <div>
          <Eyebrow>Inputs</Eyebrow>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--bone)', margin: '6px 0 22px', letterSpacing: '-0.01em' }}>Estimate your savings</h1>
          {[
            { l: 'Annual material spend', v: '$184M' },
            { l: 'Average safety stock', v: '$24M' },
            { l: 'Stockouts / year', v: '14' },
            { l: 'Forecast MAPE today', v: '11.4%' },
            { l: 'Working capital cost', v: '8.5% / yr' },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{f.l}</div>
              <div style={{ height: 38, background: 'var(--ink-deep)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <span className="mono" style={{ fontSize: 14, color: 'var(--bone)' }}>{f.v}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <Eyebrow>Estimated savings · year 1</Eyebrow>
          <Card pad={22}>
            <div className="mono" style={{ fontSize: 48, color: 'var(--bone)', fontWeight: 300, letterSpacing: '-0.01em' }}>$3.4M</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>≈ 1.85% of spend · payback in 4.2 months</div>
            <Hairline />
            <div style={{ marginTop: 10 }}>
              <KV k="Working capital release" v="$2.1M" mono tone="good" />
              <KV k="Stockout avoidance" v="$840K" mono tone="good" />
              <KV k="Forecast-driven price wins" v="$420K" mono tone="good" />
              <KV k="Platform cost · est." v="−$120K" mono tone="bad" />
            </div>
            <div style={{ marginTop: 18 }}><Btn kind="primary" full>Get a custom proposal</Btn></div>
          </Card>
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 24. RoiDashboard (impact tracker for live customers)
// ============================================================
function RoiDashboardPage() {
  return (
    <PrescientShell active="roidash" title="ROI Dashboard" breadcrumb={['Impact']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Live ROI · Ridgeview Industries" subtitle="Cumulative since contract start · Aug 2024"
          right={<Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export pack</Btn>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { l: 'Cumulative savings', v: '$5.84M' },
            { l: 'Working capital released', v: '$3.10M' },
            { l: 'Stockouts avoided', v: '38' },
            { l: 'Net ROI · 21 months', v: '4.1×' },
          ].map((k, i) => (
            <Card key={i} eyebrow={k.l} pad={16}>
              <div className="mono" style={{ fontSize: 28, color: 'var(--bone)', fontWeight: 300 }}>{k.v}</div>
              <div style={{ marginTop: 10 }}><Spark width={140} height={32} /></div>
            </Card>
          ))}
        </div>
        <Card eyebrow="Savings by category" title="Year-over-year">
          <TableRow head cols={[{ v: 'Category', w: '1.4fr' }, { v: 'Y1', right: true }, { v: 'Y2 (proj)', right: true }, { v: 'Method' }]} />
          {[
            { c: 'Working capital release', y1: '$1.84M', y2: '$2.40M', m: 'Inventory rightsizing · regime-aware safety stock' },
            { c: 'Stockout avoidance', y1: '$1.10M', y2: '$1.40M', m: 'Multi-horizon forecasting + auto-reorder' },
            { c: 'Forecast-driven price wins', y1: '$640K', y2: '$820K', m: 'Procurement timing · regime hedging' },
            { c: 'Logistics rerouting', y1: '$280K', y2: '$340K', m: 'Event-driven mode/lane swaps' },
          ].map((r, i) => (
            <TableRow key={i} cols={[
              { v: r.c, w: '1.4fr' },
              { v: r.y1, right: true, mono: true, tone: 'good' },
              { v: r.y2, right: true, mono: true, tone: 'good' },
              { v: r.m },
            ]} />
          ))}
        </Card>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 25. ShopFloorMode (kiosk-style operator view)
// ============================================================
function ShopFloorModePage() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--bone)', minHeight: '100%', padding: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, fontFamily: 'Inter, sans-serif' }}>
      <div>
        <Eyebrow>Shop-floor mode · Tianjin works</Eyebrow>
        <div className="mono" style={{ fontSize: 64, color: 'var(--bone)', fontWeight: 300, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>14:31 PT</div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>Shift B · Crew 18/19 on floor · Apr 26</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Eyebrow>Plant OEE</Eyebrow>
        <div className="mono" style={{ fontSize: 64, color: 'var(--good)', fontWeight: 300, letterSpacing: '-0.02em' }}>76.4%</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Target 78 · within band</div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Hairline />
        <div style={{ marginTop: 18 }}>
          {[
            { l: 'CRC slitting · A', v: '142 MT/d', t: 'good' },
            { l: 'CRC slitting · B', v: '148 MT/d', t: 'good' },
            { l: 'Galvanizing · 1', v: '88 MT/d', t: 'signal' },
            { l: 'Coil packaging', v: '230 MT/d', t: 'good' },
            { l: 'CMP polish · 3', v: '0 · DOWN', t: 'bad' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 18, color: 'var(--bone)' }}>{r.l}</div>
              <div className="mono" style={{ fontSize: 22, color: r.t === 'bad' ? 'var(--danger)' : r.t === 'signal' ? 'var(--signal)' : 'var(--good)' }}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Auto-refresh · 30s · last 14:31:08</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Press <span className="mono" style={{ color: 'var(--bone)' }}>Esc</span> to exit kiosk mode</div>
      </div>
    </div>
  );
}

// ============================================================
// 26. SopWorkflows / 27. SopWorkspace
// ============================================================
function SopWorkflowsPage() {
  const sops = [
    { id: 'SOP-014', n: 'Galv pot temperature drift', cat: 'Operations', steps: 6, owner: 'M. Park', last: 'Apr 22' },
    { id: 'SOP-027', n: 'Auto-PO approval > $25K', cat: 'Procurement', steps: 4, owner: 'D. Hahn', last: 'Apr 18' },
    { id: 'SOP-035', n: 'Supplier OTD breach response', cat: 'Procurement', steps: 5, owner: 'L. Yu', last: 'Apr 11' },
    { id: 'SOP-042', n: 'Regime shift → procurement hold', cat: 'Strategy', steps: 7, owner: 'A. Bell', last: 'Apr 26' },
  ];
  return (
    <PrescientShell active="sopflows" title="SOP Workflows" breadcrumb={['Operations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Standard operating procedures" subtitle="Linked to playbooks · audit-traced"
          right={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New SOP</Btn>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <TableRow head cols={[{ v: 'ID', w: '110px' }, { v: 'SOP', w: '2fr' }, { v: 'Category', w: '140px' }, { v: 'Steps', right: true, w: '70px' }, { v: 'Owner' }, { v: 'Last edited', right: true, w: '110px' }]} />
          {sops.map((s, i) => (
            <TableRow key={i} cols={[
              { v: s.id, mono: true, w: '110px' },
              { v: s.n, w: '2fr' },
              { v: s.cat, w: '140px' },
              { v: s.steps, right: true, mono: true, w: '70px' },
              { v: s.owner },
              { v: s.last, right: true, mono: true, w: '110px' },
            ]} />
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}
function SopWorkspacePage() {
  return (
    <PrescientShell active="sopworkspace" title="SOP Workspace" breadcrumb={['Operations', 'SOP-042']}>
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 18, minHeight: '100%' }}>
        <aside>
          <Eyebrow>Steps · 7</Eyebrow>
          {['Detect FDR > 2.0', 'Notify procurement lead', 'Pause non-critical POs', 'Brief supplier risk team', 'Re-forecast 14d horizon', 'Run scenario A/B', 'Communicate to ops'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5, color: i === 2 ? 'var(--bone)' : 'var(--soft)' }}>
              <div className="mono" style={{ width: 20, color: 'var(--muted)' }}>{i + 1}</div>
              <div>{s}</div>
            </div>
          ))}
        </aside>
        <div>
          <Eyebrow>Editing · Step 03</Eyebrow>
          <h1 style={{ fontSize: 24, color: 'var(--bone)', fontWeight: 400, margin: '6px 0 14px' }}>Pause non-critical POs</h1>
          <Card pad={20}>
            <div style={{ fontSize: 13.5, color: 'var(--soft)', lineHeight: 1.7 }}>
              When the FDR crosses 2.0 and the regime is confirmed Imbalanced Excess, the procurement lead pauses any PO not flagged as critical-path. Critical-path is defined as: (a) on the critical-path BOM list, (b) supplier OTD &lt; 80% in last 14 days, or (c) safety stock breach within 21 days.
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--bone)' }}>Approver:  Procurement lead  · Mary Okafor</div>
            <div style={{ fontSize: 13, color: 'var(--bone)' }}>Audit hook:  ALL_PO_HOLDS · 7yr retention</div>
          </Card>
        </div>
        <aside>
          <Eyebrow>Linked</Eyebrow>
          <div style={{ marginTop: 6 }}>
            <KV k="Playbook" v="Regime shift" />
            <KV k="Last triggered" v="Apr 26 14:31" mono />
            <KV k="Triggered count" v="14" mono />
            <KV k="Linked tickets" v="JIRA-1284 · JIRA-1297" mono />
          </div>
        </aside>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 28. Status (system status page · public)
// ============================================================
function StatusPage() {
  const services = [
    { n: 'API · /v1', s: 'operational' },
    { n: 'Forecast engine', s: 'operational' },
    { n: 'Regime detection', s: 'operational' },
    { n: 'Advisor (LLM)', s: 'degraded' },
    { n: 'Webhook delivery', s: 'operational' },
    { n: 'Dashboard · web', s: 'operational' },
    { n: 'Auth & SSO', s: 'operational' },
    { n: 'Integrations · ERP', s: 'operational' },
  ];
  const tone = (s) => s === 'operational' ? 'good' : s === 'degraded' ? 'signal' : 'bad';
  return (
    <PrescientShell active="status" title="System Status" breadcrumb={['Public']}>
      <div style={{ padding: 36, maxWidth: 880 }}>
        <Eyebrow>System status</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '8px 0 28px' }}>
          <h1 style={{ fontSize: 32, color: 'var(--bone)', fontWeight: 300, letterSpacing: '-0.01em', margin: 0 }}>All systems mostly operational</h1>
          <Pill tone="signal">1 degraded</Pill>
        </div>
        <Hairline />
        <div style={{ marginTop: 18, background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          {services.map((sv, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: i < services.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusDot tone={tone(sv.s)} /><span style={{ fontSize: 14, color: 'var(--bone)' }}>{sv.n}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{sv.s}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Eyebrow>30-day uptime</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 3, marginTop: 8 }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} style={{ height: 32, background: i === 8 ? 'var(--signal)' : 'var(--good)', opacity: 0.7 }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>99.96% — 1 partial degradation Apr 18 (Advisor latency, 38min)</div>
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 29. Training
// ============================================================
function TrainingPage() {
  const courses = [
    { n: 'Reading the regime engine', dur: '12 min', kind: 'Video', done: true },
    { n: 'Writing your first scenario', dur: '18 min', kind: 'Walkthrough', done: true },
    { n: 'Procurement playbooks · authoring', dur: '24 min', kind: 'Walkthrough', done: false },
    { n: 'Talking to the AI Advisor', dur: '8 min', kind: 'Video', done: false },
    { n: 'Calibrating safety stock', dur: '14 min', kind: 'Walkthrough', done: false },
    { n: 'Setting up your morning brief', dur: '6 min', kind: 'Quick start', done: false },
  ];
  return (
    <PrescientShell active="training" title="Training" breadcrumb={['Resources']}>
      <div style={{ padding: 28, maxWidth: 920 }}>
        <SectionHead title="Learn the platform" subtitle="2 of 6 complete · 14m left in your current path" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {courses.map((c, i) => (
            <Card key={i} eyebrow={c.kind + ' · ' + c.dur} title={c.n} action={c.done ? <Pill tone="good">Done</Pill> : <Btn kind="ghost" sm>Start</Btn>}>
              <div style={{ height: 4, background: 'var(--line-soft)', position: 'relative' }}>
                <div style={{ height: 4, width: c.done ? '100%' : '0%', background: 'var(--good)' }} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 30. WorkforceScheduling
// ============================================================
function WorkforceSchedulingPage() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const shifts = ['A · 06–14', 'B · 14–22', 'C · 22–06'];
  const cells = [[18,16,8], [19,17,8], [20,18,9], [19,17,8], [18,16,8], [12,10,6], [10,8,4]];
  return (
    <PrescientShell active="workforce" title="Workforce Scheduling" breadcrumb={['Operations']}>
      <div style={{ padding: 28 }}>
        <SectionHead title="Week of Apr 26" subtitle="Headcount per shift · Tianjin works · forecast aligned"
          right={<><Btn kind="ghost" sm>Previous</Btn><Btn kind="ghost" sm>Next</Btn><Btn kind="primary" sm>Publish</Btn></>} />
        <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ padding: '14px 16px', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Shift</div>
            {days.map((d, i) => (
              <div key={i} style={{ padding: '14px 16px', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          {shifts.map((s, si) => (
            <div key={si} style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', borderBottom: si < shifts.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--bone)' }}>{s}</div>
              {cells.map((c, di) => (
                <div key={di} className="mono" style={{ padding: '20px 16px', textAlign: 'center', fontSize: 16, color: 'var(--bone)', borderLeft: '1px solid var(--line-soft)' }}>{c[si]}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PrescientShell>
  );
}

// ============================================================
// 31. NotFoundPage
// ============================================================
function NotFoundPage() {
  return (
    <div style={{ background: 'var(--ink)', minHeight: '100%', display: 'grid', placeItems: 'center', padding: 40, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <Eyebrow>404 · not found</Eyebrow>
        <div className="mono" style={{ fontSize: 96, fontWeight: 300, color: 'var(--bone)', letterSpacing: '-0.04em', margin: '12px 0 6px' }}>404</div>
        <div style={{ fontSize: 18, color: 'var(--bone)', fontWeight: 400, marginBottom: 10 }}>This page is not in our regime.</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22 }}>The URL you're after doesn't exist, or you don't have access. Check the address or head back to the dashboard.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn kind="primary">Back to dashboard</Btn>
          <Btn kind="ghost">Contact support</Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================
Object.assign(window, {
  ActionPlaybooksPage, ApiDocumentationPage, BulkTestPage, CompliancePage,
  ConfigurationPage, ContactPage, DigitalTwinPage, ErpTemplatesPage,
  ForgotPasswordPage, ResetPasswordPage, HowItWorksPage, IntegrationChecklistPage,
  LeadsAdminPage, MachineryPage, PilotProgramPage, PlatformAnalyticsPage,
  PlatformOwnerAnalyticsPage, PredictiveMaintenancePage, PrivacyPolicyPage,
  TermsOfServicePage, ProductionKPIsPage, ReportsPage, RoiCalculatorPage,
  RoiDashboardPage, ShopFloorModePage, SopWorkflowsPage, SopWorkspacePage,
  StatusPage, TrainingPage, WorkforceSchedulingPage, NotFoundPage,
});
