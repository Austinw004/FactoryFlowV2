/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody */

// ============================================================
// BATCH 2 — Intelligence
//   StrategyHub · StrategyInsights · StrategicAnalysis
//   EventMonitoring · DemandSignalRepository
//   MAIntelligence · GeopoliticalRisk · IndustryConsortium · PeerBenchmarking
// ============================================================

// === Shared world-map dot for geo + supply pages ===
function MiniWorldDots({ markers = [], h = 200 }) {
  // markers: [{x: 0..100, y: 0..100, tone, size}]
  const tone = (t) => ({ signal: 'var(--signal)', good: 'var(--good)', bad: 'var(--bad)', neutral: 'var(--soft)' }[t] || 'var(--soft)');
  return (
    <div style={{ position: 'relative', width: '100%', height: h, background: 'var(--ink-deep)', overflow: 'hidden' }}>
      {/* dotted globe grid */}
      <svg width="100%" height="100%" viewBox="0 0 600 280" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="var(--line)" />
          </pattern>
          <mask id="continents">
            {/* roughly continent shapes */}
            <rect width="600" height="280" fill="black" />
            <ellipse cx="120" cy="100" rx="60" ry="40" fill="white" />
            <ellipse cx="100" cy="180" rx="30" ry="60" fill="white" />
            <ellipse cx="290" cy="100" rx="55" ry="42" fill="white" />
            <ellipse cx="320" cy="180" rx="38" ry="50" fill="white" />
            <ellipse cx="430" cy="120" rx="80" ry="50" fill="white" />
            <ellipse cx="490" cy="200" rx="38" ry="22" fill="white" />
          </mask>
        </defs>
        <rect width="600" height="280" fill="url(#dotgrid)" mask="url(#continents)" />
      </svg>
      {markers.map((m, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${m.x}%`, top: `${m.y}%`,
          width: m.size || 8, height: m.size || 8, transform: 'translate(-50%, -50%)',
          background: tone(m.tone), borderRadius: '50%',
          boxShadow: `0 0 0 4px ${tone(m.tone)}33`,
        }} title={m.label} />
      ))}
    </div>
  );
}

// =====================================================
// 1. StrategyHub — directory of intelligence surfaces
// =====================================================
function StrategyHubPage() {
  return (
    <PrescientShell active="strategy" title="Strategy & Insights" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Intelligence · Apr 26"
          headline="Where macro meets your factory floor."
          sub="Eight surfaces, one regime."
          meta={[<span key="r"><RegimeBadge size="sm" /></span>, '14 active analyses', '3 memos drafted this week']} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { eyebrow: 'AI Advisor', title: 'Working memory', body: 'Tenant-scoped Claude Sonnet 4.5. Connected to live data, RFQs, suppliers.', kpi: '12', kpiLabel: 'pinned threads', tone: 'signal' },
            { eyebrow: 'Strategy & insights', title: 'Memos & analyses', body: 'Long-form analyses written by the engine and reviewed by your team.', kpi: '14', kpiLabel: 'active', tone: 'neutral' },
            { eyebrow: 'Strategic analysis', title: 'Deep-dive engine', body: 'Multi-source correlations: regime × commodity × supplier behavior.', kpi: '6', kpiLabel: 'running', tone: 'neutral' },
            { eyebrow: 'Event monitoring', title: 'Live signal stream', body: 'Macro, commodity, geopolitical, and supplier events. 24/7 watch.', kpi: '47', kpiLabel: 'last 24h', tone: 'signal' },
            { eyebrow: 'Geopolitical risk', title: 'Country & corridor', body: '14 corridors monitored. 2 elevated · 1 sanctions watch.', kpi: '2', kpiLabel: 'elevated', tone: 'bad' },
            { eyebrow: 'M&A intelligence', title: 'Supplier deal-watch', body: 'Three of your tier-1 suppliers in active M&A discussion.', kpi: '3', kpiLabel: 'in flight', tone: 'signal' },
            { eyebrow: 'Industry consortium', title: 'Cross-tenant signals', body: 'Anonymous, opt-in benchmarks across 38 peer operators.', kpi: '38', kpiLabel: 'peers', tone: 'good' },
            { eyebrow: 'Demand signal repository', title: 'External signals', body: 'Weather, web, POS, social. 47K updates today.', kpi: '47K', kpiLabel: '/24h', tone: 'neutral' },
            { eyebrow: 'Peer benchmarking', title: 'You vs cohort', body: 'Fill rate, MAPE, lead-time variance vs anonymized peers.', kpi: 'P72', kpiLabel: 'percentile', tone: 'good' },
          ].map((t, i) => (
            <HubTile2 key={i} {...t} />
          ))}
        </div>

        <div style={{ marginTop: 32 }}>
          <Card title="Recent memos" eyebrow="Authored & reviewed" padded={false}>
            {[
              { t: 'Q2 procurement under regime shift', auth: 'Advisor · M. Okafor', date: 'Apr 25', conf: 0.80, tag: 'Procurement' },
              { t: 'Han Steel concentration · fallback playbook', auth: 'Advisor · L. Park', date: 'Apr 22', conf: 0.70, tag: 'Supply' },
              { t: 'Tin counter-cyclical window analysis', auth: 'Advisor · M. Okafor', date: 'Apr 19', conf: 0.80, tag: 'Commodity' },
              { t: 'BASF Pt catalyst long-term outlook', auth: 'Advisor', date: 'Apr 15', conf: 0.70, tag: 'Strategy' },
              { t: 'Voestalpine vs Han Steel · cost comparison', auth: 'Advisor', date: 'Apr 11', conf: 0.60, tag: 'Procurement' },
            ].map((m, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '1fr 200px 100px 90px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, color: 'var(--bone)' }}>{m.t}</span>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{m.auth}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{m.date}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>conf {m.conf.toFixed(2)}</span>
                <Icon.External s={11} />
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

function HubTile2({ eyebrow, title, body, kpi, kpiLabel, tone = 'neutral' }) {
  const accent = { signal: 'var(--signal)', good: 'var(--good)', bad: 'var(--bad)', neutral: 'var(--line)' }[tone];
  return (
    <div className="row-hover" style={{ background: 'var(--panel)', padding: 20, borderLeft: `2px solid ${accent}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: 152 }}>
      <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>
      <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--soft)', lineHeight: 1.55, marginBottom: 14 }}>{body}</div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div className="mono" style={{ fontSize: 16, color: 'var(--bone)', fontWeight: 300 }}>{kpi}</div>
          {kpiLabel && <div className="eyebrow" style={{ fontSize: 9, marginTop: 2 }}>{kpiLabel}</div>}
        </div>
        <Icon.ArrowRight s={11} />
      </div>
    </div>
  );
}

// =====================================================
// 2. StrategyInsights — long-form memo viewer
// =====================================================
function StrategyInsightsPage() {
  return (
    <PrescientShell active="strategy" title="Strategy & Insights" breadcrumb={['Intelligence']}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', height: 'calc(100% - 0px)', minHeight: 800 }}>
        {/* Left rail — memo list */}
        <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto' }} className="scroll-thin">
          <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
            <Btn kind="ghost" full sm icon={<Icon.Plus s={11} />}>New memo</Btn>
          </div>
          {[
            { g: 'This week', items: [
              { t: 'Q2 procurement under regime shift', s: 'Defer non-critical $2.4M', date: 'Apr 25', active: true },
              { t: 'Han Steel concentration · fallback', s: 'Voestalpine activation playbook', date: 'Apr 22' },
            ] },
            { g: 'This month', items: [
              { t: 'Tin counter-cyclical window', s: 'Forward-buy through Q3', date: 'Apr 19' },
              { t: 'BASF Pt catalyst outlook', s: 'Demand pull through 2027', date: 'Apr 15' },
              { t: 'Voestalpine vs Han Steel cost', s: 'Side-by-side at 30/50/70%', date: 'Apr 11' },
            ] },
            { g: 'Earlier', items: [
              { t: 'Argon contract optimization', s: 'Linde RFQ analysis', date: 'Apr 02' },
              { t: 'Slurry RFQ · 3-vendor compare', s: 'Cabot vs DuPont vs Versum', date: 'Mar 28' },
            ] },
          ].map((g) => (
            <div key={g.g}>
              <div className="eyebrow" style={{ padding: '14px 14px 6px', fontSize: 9 }}>{g.g}</div>
              {g.items.map((it, i) => (
                <div key={i} className={it.active ? '' : 'row-hover'} style={{
                  padding: '12px 14px', cursor: 'pointer',
                  background: it.active ? 'var(--panel-2)' : 'transparent',
                  borderLeft: it.active ? '2px solid var(--signal)' : '2px solid transparent',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--bone)', fontWeight: it.active ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.t}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>{it.date}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.s}</div>
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* Center — memo content */}
        <div style={{ overflowY: 'auto', padding: '40px 56px 80px' }} className="scroll-thin">
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Eyebrow style={{ marginBottom: 12 }}>Memo · authored Apr 25 · reviewed by M. Okafor</Eyebrow>
            <div className="hero" style={{ fontSize: 36, lineHeight: 1.1, marginBottom: 20 }}>
              Q2 procurement under regime shift
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
              <RegimeBadge size="sm" />
              <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>conf 0.80</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>14 sources</span>
              <Btn kind="ghost" sm style={{ marginLeft: 'auto' }} icon={<Icon.Copy s={11} />}>Copy link</Btn>
              <Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export PDF</Btn>
            </div>

            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--bone-dim)', letterSpacing: '-0.005em' }}>
              <p style={{ marginTop: 0 }}>
                The FDR has held above 2.20 for fourteen days, confirming a sustained transition into Imbalanced Excess. Asset markets are pricing optimism that real-economy commodity flows do not yet support — and that gap is the shape of our exposure for the rest of Q2.
              </p>
              <p>
                For Ridgeview, this means three things: <span className="mono" style={{ color: 'var(--signal)' }}>(1)</span> defer non-critical stock-up purchases through the May reset window, <span className="mono" style={{ color: 'var(--signal)' }}>(2)</span> lock contractual pricing where tier-1 suppliers will hold quotes, and <span className="mono" style={{ color: 'var(--signal)' }}>(3)</span> diversify the Han Steel exposure, which now represents 41% of CRC volume — well outside the 35% concentration policy.
              </p>

              <div className="eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>Recommended actions</div>
              <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                {[
                  { t: 'Pause CRC stock-up · 1,200 MT', d: 'Defer through May 30; re-quote on FDR breach below 1.80.', amt: '−$1.04M' },
                  { t: 'Lock argon · Linde 9-day quote', d: 'Spot up 4.1% MoM; lock $0.142/L for full Q2.', amt: '−$340K' },
                  { t: 'Diversify Han Steel → Voestalpine 30%', d: 'Move 360 MT/wk; existing fallback contract activates in 7 days.', amt: '−$1.10M' },
                ].map((a, i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px', gap: 14, padding: '18px 0', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 'none' }}>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>0{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, marginBottom: 4 }}>{a.t}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--soft)' }}>{a.d}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--good)', textAlign: 'right' }}>{a.amt}</span>
                  </li>
                ))}
              </ol>

              <div className="eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>Risks & assumptions</div>
              <p style={{ margin: 0, color: 'var(--soft)' }}>
                The recommendation assumes the regime persists at FDR ≥ 1.80 through end of Q2. A breach below would re-open the stock-up window and reverse <span className="mono" style={{ color: 'var(--bone)' }}>Action 01</span>. Voestalpine fallback diversification carries a one-time switching cost not modeled here — see full evidence panel.
              </p>
            </div>
          </div>
        </div>

        {/* Right rail — sources / actions */}
        <aside style={{ borderLeft: '1px solid var(--line)', padding: '20px 18px', overflowY: 'auto' }} className="scroll-thin">
          <Eyebrow style={{ marginBottom: 12 }}>Sources · 14</Eyebrow>
          {[
            { t: 'FDR live feed · 15 APIs', s: 'Real-economy + asset signals' },
            { t: 'Han Steel 10-Q (CSRC)', s: 'Q1 2026 · filed Apr 18' },
            { t: 'Voestalpine fallback contract', s: 'Signed Feb 03 · MSA-VA-2024' },
            { t: 'LME tin & argon spot', s: 'Bloomberg feed · 30s' },
            { t: 'Internal: 38 RFQs trailing 90d', s: 'Procurement audit log' },
          ].map((s, i, a) => (
            <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '20px 1fr 14px', gap: 8, padding: '10px 0', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>[{i + 1}]</span>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--bone)' }}>{s.t}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.s}</div>
              </div>
              <Icon.External s={10} />
            </div>
          ))}
          <div style={{ marginTop: 24 }}>
            <Eyebrow style={{ marginBottom: 10 }}>Activity</Eyebrow>
            {[
              { t: 'M. Okafor · reviewed', d: 'Apr 25 16:18' },
              { t: 'Advisor · drafted', d: 'Apr 25 14:08' },
              { t: 'L. Park · annotated', d: 'Apr 25 11:32' },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, color: 'var(--soft)' }}>
                <span>{it.t}</span>
                <span className="mono" style={{ color: 'var(--muted)' }}>{it.d}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PrescientShell>
  );
}

// =====================================================
// 3. StrategicAnalysis — engine for cross-domain analyses
// =====================================================
function StrategicAnalysisPage() {
  return (
    <PrescientShell active="strategy" title="Strategic Analysis" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Engine · running"
          headline="Cross-domain correlations, in your context."
          sub="Six analyses active · two flagged for review."
          meta={[<span key="r"><RegimeBadge size="sm" /></span>, '14 source domains', 'last refresh 14:31 PT']}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New analysis</Btn>} />

        <KpiStrip items={[
          { label: 'Active analyses', value: '6', delta: '+1', deltaTone: 'neutral' },
          { label: 'Source domains', value: '14', footnote: 'macro · commodity · supplier · internal' },
          { label: 'Avg confidence', value: '0.74', delta: '+0.02', deltaTone: 'good' },
          { label: 'Decisions logged', value: '117', delta: '93% accepted', deltaTone: 'good' },
          { label: 'Compute · 24h', value: '4.2', suffix: 'CPU·h', delta: '−14%', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <SectionHead eyebrow="Active analyses" title="Six runs · click to inspect" style={{ marginBottom: 16 }}
            action={<div style={{ display: 'flex', gap: 8 }}><Btn kind="ghost" sm>By domain</Btn><Btn kind="ghost" sm>By confidence</Btn></div>} />
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 130px 100px 120px 90px 110px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Analysis', 'Domains', 'Window', 'Confidence', 'Updated', 'Status', ''].map((h, i) => (
                <div key={i} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {[
              { t: 'Regime → procurement timing', d: 'Macro × Procurement', w: '8w', conf: 0.80, u: '14:31', s: 'live' },
              { t: 'Han Steel financial stress', d: 'Filings × Lead-time', w: '12w', conf: 0.70, u: '13:48', s: 'live', flag: true },
              { t: 'Tin counter-cyclical', d: 'Macro × LME × Demand', w: '26w', conf: 0.80, u: '11:22', s: 'live' },
              { t: 'BASF Pt catalyst pull-through', d: 'Filings × Web × POS', w: '52w', conf: 0.60, u: '09:14', s: 'live' },
              { t: 'Voestalpine fallback economics', d: 'Internal × Supplier', w: '4w', conf: 0.80, u: 'Yest', s: 'archive' },
              { t: 'Slurry vendor concentration', d: 'Supplier × M&A × Pricing', w: '12w', conf: 0.70, u: 'Yest', s: 'archive', flag: true },
            ].map((r, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 130px 100px 120px 90px 110px 24px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.flag && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--signal)' }} />}
                  <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.t}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{r.d}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.w}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${r.conf * 100}%`, height: '100%', background: r.conf >= 0.75 ? 'var(--good)' : r.conf >= 0.65 ? 'var(--signal)' : 'var(--soft)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--soft)' }}>{r.conf.toFixed(2)}</span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.u}</span>
                <Pill tone={r.s === 'live' ? 'good' : 'neutral'} mono>{r.s}</Pill>
                <Icon.External s={11} />
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 4. EventMonitoring — live event stream
// =====================================================
function EventMonitoringPage() {
  const events = [
    { t: '14:31', sev: 'signal', cat: 'Macro', src: 'FDR engine', e: 'FDR crossed 2.20 · regime confirmed Imbalanced Excess', impact: 'Procurement HOLD · $2.4M of POs flagged' },
    { t: '14:18', sev: 'bad', cat: 'Supplier', src: 'Han Steel', e: 'Lead time 21 → 34 days', impact: 'CRC concentration 41% · breach 35% policy' },
    { t: '13:52', sev: 'neutral', cat: 'Internal', src: 'M. Okafor', e: 'Approved RFQ-2814 · Cabot 12,400 kg slurry', impact: '+$58.4K committed' },
    { t: '13:40', sev: 'good', cat: 'Commodity', src: 'Linde Gas', e: 'Argon spot quote · $0.142/L · 9-day validity', impact: 'Lock window through May 5' },
    { t: '12:06', sev: 'neutral', cat: 'Demand', src: 'Demand engine', e: 'Variance flag · SKU-3401 +18% over baseline', impact: 'Adjust safety stock 1,200 MT' },
    { t: '11:48', sev: 'signal', cat: 'Strategy', src: 'AI Advisor', e: 'Drafted memo: Q2 procurement under shift', impact: '3 actions · $2.4M reduction' },
    { t: '10:22', sev: 'bad', cat: 'Geopolitical', src: 'Reuters', e: 'Sanctions watch · CN-EU corridor', impact: '2 lanes affected · review Han Steel logistics' },
    { t: '09:51', sev: 'good', cat: 'Commodity', src: 'LME', e: 'Tin spot −3.1% · $28,140/MT', impact: 'Forward-buy window opens' },
    { t: '09:14', sev: 'signal', cat: 'M&A', src: 'Bloomberg', e: 'Cabot Microelectronics · DuPont in talks', impact: 'Evaluate slurry single-source risk' },
    { t: '08:30', sev: 'neutral', cat: 'Internal', src: 'ERP sync', e: '142 materials updated · 38 POs reconciled', impact: '—' },
  ];

  return (
    <PrescientShell active="events" title="Event Monitoring" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Event stream · live"
          headline="47 events in last 24h."
          sub="Three high severity, eleven actioned."
          meta={['Macro · Commodity · Supplier · Geo · M&A · Internal', '12 sources connected', <span key="r" className="mono">stream lag &lt; 6s</span>]}
          action={<Btn kind="ghost" sm icon={<Icon.Plus s={11} />}>New rule</Btn>} />

        <KpiStrip items={[
          { label: 'Last 24h', value: '47', delta: '+12', deltaTone: 'neutral' },
          { label: 'High severity', value: '3', delta: '+1', deltaTone: 'bad' },
          { label: 'Actioned', value: '11', delta: '23%', deltaTone: 'good' },
          { label: 'Rules active', value: '34', delta: '2 paused', deltaTone: 'neutral' },
          { label: 'Stream lag', value: '5.8', suffix: 's', delta: 'p99', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card eyebrow="Live stream" title="All categories · last 4h" padded={false} action={
            <Toolbar search={false}>
              <FilterChip label="Severity" value="≥ medium" active />
              <FilterChip label="Category" value="All" />
              <FilterChip label="Source" value="All" />
            </Toolbar>
          }>
            {events.map((e, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '52px 12px 110px 110px 1fr 200px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'flex-start', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', paddingTop: 2 }}>{e.t}</span>
                <span style={{ paddingTop: 5 }}><StatusDot tone={e.sev} /></span>
                <Pill tone="bone" mono>{e.cat}</Pill>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{e.src}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)', lineHeight: 1.45 }}>{e.e}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>{e.impact}</span>
              </div>
            ))}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card eyebrow="By category" title="Last 24h" padded={false}>
              {[
                { l: 'Macro', n: 6, color: 'var(--signal)' },
                { l: 'Commodity', n: 14, color: 'var(--good)' },
                { l: 'Supplier', n: 11, color: 'var(--bad)' },
                { l: 'Geopolitical', n: 4, color: 'var(--bad)' },
                { l: 'M&A', n: 3, color: 'var(--signal)' },
                { l: 'Demand', n: 5, color: 'var(--soft)' },
                { l: 'Internal', n: 4, color: 'var(--muted)' },
              ].map((r, i, a) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 30px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.l}</span>
                  <div style={{ height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${(r.n / 14) * 100}%`, height: '100%', background: r.color }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.n}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 5. DemandSignalRepository
// =====================================================
function DemandSignalRepositoryPage() {
  const sigs = [
    { id: 'DSR-001', name: 'ERP — SAP S/4HANA', kind: 'Internal · core', updates: '12.4K/24h', cov: 100, status: 'good', last: '14:31' },
    { id: 'DSR-014', name: 'POS — NRF feed', kind: 'External · partner', updates: '8.1K/24h', cov: 92, status: 'good', last: '14:30' },
    { id: 'DSR-022', name: 'Web traffic — GA4', kind: 'External · self', updates: '14.2K/24h', cov: 88, status: 'good', last: '14:31' },
    { id: 'DSR-037', name: 'Weather — NOAA forecasts', kind: 'External · public', updates: '6.4K/24h', cov: 100, status: 'good', last: '14:25' },
    { id: 'DSR-041', name: 'Pricing — Bloomberg', kind: 'External · vendor', updates: '5.0K/24h', cov: 100, status: 'good', last: '14:31' },
    { id: 'DSR-052', name: 'Social — XAPI mentions', kind: 'External · vendor', updates: '0.9K/24h', cov: 64, status: 'signal', last: '13:48' },
    { id: 'DSR-061', name: 'Macroeconomic — FRED', kind: 'External · public', updates: '0.2K/24h', cov: 100, status: 'good', last: '12:00' },
    { id: 'DSR-074', name: 'Consortium — peer demand', kind: 'External · consortium', updates: '0.4K/24h', cov: 78, status: 'good', last: '14:20' },
  ];

  return (
    <PrescientShell active="dsr" title="Demand Signal Repository" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="DSR · 12 sources connected"
          headline="47K demand signals processed today."
          sub="One source degraded · all critical green."
          meta={['Coverage 92% across SKUs', 'Avg signal age &lt; 5 min', <span key="t" className="mono">Last refresh 14:31</span>]}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>Connect source</Btn>} />

        <KpiStrip items={[
          { label: 'Sources connected', value: '12', delta: '+1', deltaTone: 'good' },
          { label: 'Updates / 24h', value: '47K', delta: '+8%', deltaTone: 'good' },
          { label: 'SKU coverage', value: '92', suffix: '%', delta: '+2pp', deltaTone: 'good' },
          { label: 'Avg signal age', value: '4m32s', delta: 'p50', deltaTone: 'neutral' },
          { label: 'Health · degraded', value: '1', delta: 'XAPI · partial', deltaTone: 'signal' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Toolbar searchPlaceholder="Search signals, sources, SKUs…">
            <FilterChip label="Kind" value="All" active />
            <FilterChip label="Health" value="All" />
            <FilterChip label="Coverage" value="≥ 80%" />
          </Toolbar>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(220px, 1fr) 180px 130px 110px 90px 80px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Source', 'Name', 'Kind', 'Updates', 'Coverage', 'Last sync', 'Health'].map((h, i) => (
                <div key={i} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {sigs.map((r, i, a) => (
              <div key={r.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px minmax(220px, 1fr) 180px 130px 110px 90px 80px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.id}</span>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.kind}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{r.updates}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${r.cov}%`, height: '100%', background: r.cov >= 90 ? 'var(--good)' : r.cov >= 75 ? 'var(--signal)' : 'var(--bad)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r.cov}%</span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.last}</span>
                <Pill tone={r.status === 'good' ? 'good' : r.status === 'signal' ? 'signal' : 'bad'} mono>{r.status}</Pill>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 6. MAIntelligence — supplier deal-watch
// =====================================================
function MAIntelligencePage() {
  return (
    <PrescientShell active="ma" title="M&A Intelligence" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Deal watch · live"
          headline="Three of your tier-1 suppliers in active M&A discussion."
          sub="Cabot, Linde, and a confidential third party."
          meta={['12 deals tracked YTD', '4 closed', <span key="r"><RegimeBadge size="sm" /></span>]} />

        <KpiStrip items={[
          { label: 'Deals tracked', value: '12', delta: '+2', deltaTone: 'neutral' },
          { label: 'Affecting your suppliers', value: '3', delta: '+1', deltaTone: 'signal' },
          { label: 'Closed YTD', value: '4', delta: '+1', deltaTone: 'good' },
          { label: 'Avg signal lead', value: '47d', delta: 'before announce', deltaTone: 'good' },
          { label: 'Confidence · weighted', value: '0.70', delta: '+0.04', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
          <Card eyebrow="Active situations" title="Affecting your tier-1+2" padded={false}>
            {[
              { t: 'Cabot Microelectronics · DuPont talks', d: 'Bloomberg confirms · advanced stage', conf: 0.70, you: 'CMP slurry · single-source 22%', sev: 'signal', stage: 'Advanced' },
              { t: 'Linde Gas · industrial division spin-off', d: 'WSJ leak · early stage', conf: 0.60, you: 'Argon · tier-1 single-source', sev: 'neutral', stage: 'Early' },
              { t: 'Yunnan Tin · state-stake review', d: 'Reuters · regulatory filing', conf: 0.80, you: 'Tin solder · tier-2 26%', sev: 'bad', stage: 'Regulatory' },
            ].map((r, i, a) => (
              <div key={i} className="row-hover" style={{ padding: '14px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 500 }}>{r.t}</span>
                  <Pill tone={r.sev} mono>{r.stage}</Pill>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--soft)', marginBottom: 8 }}>{r.d}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
                  <span>Your exposure: <span style={{ color: 'var(--bone)' }}>{r.you}</span></span>
                  <span className="mono">conf {r.conf.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </Card>

          <Card eyebrow="Sector activity" title="Industrial inputs · 12-month rolling" padded={false}>
            <div style={{ padding: '20px 18px 8px' }}>
              <BarChart h={140} data={[
                { l: 'May', v: 2 }, { l: 'Jun', v: 1 }, { l: 'Jul', v: 3 }, { l: 'Aug', v: 2 },
                { l: 'Sep', v: 4 }, { l: 'Oct', v: 3 }, { l: 'Nov', v: 5 }, { l: 'Dec', v: 4 },
                { l: 'Jan', v: 6 }, { l: 'Feb', v: 5 }, { l: 'Mar', v: 7 }, { l: 'Apr', v: 5, c: 'var(--signal)' },
              ]} color="var(--soft)" />
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--soft)' }}>
              <span><StatusDot tone="signal" /> Apr count 5 · YoY +67%</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>12m total 47</span>
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Recent closes" title="What we predicted vs what happened" padded={false}>
            {[
              { d: 'Apr 02', t: 'Versum Materials · Merck KGaA close', pred: 'Flagged 38d before · conf 0.80', act: 'Slurry tier-2 secondary affected', tone: 'good' },
              { d: 'Mar 14', t: 'Norsk Hydro · Hydrolic JV', pred: 'Flagged 51d before · conf 0.70', act: 'Aluminum tier-1 unaffected', tone: 'good' },
              { d: 'Feb 28', t: 'Mitsui · ExxonMobil chem div', pred: 'Flagged 22d before · conf 0.60', act: 'PP resin tier-2 watch', tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 220px', gap: 16, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.d}</span>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.t}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{it.pred}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{it.act}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 7. GeopoliticalRisk
// =====================================================
function GeopoliticalRiskPage() {
  return (
    <PrescientShell active="geo" title="Geopolitical Risk" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Country & corridor · live"
          headline="Two corridors elevated. One sanctions watch."
          sub="14 corridors monitored continuously."
          meta={['Sources: Reuters, OFAC, EU TARIC, IMF', '47 events last 24h', <span key="r" className="mono">stream lag &lt; 6s</span>]} />

        <KpiStrip items={[
          { label: 'Corridors monitored', value: '14' },
          { label: 'Elevated', value: '2', delta: '+1', deltaTone: 'bad' },
          { label: 'Sanctions watch', value: '1', delta: 'CN-EU', deltaTone: 'bad' },
          { label: 'Tariff actions · 30d', value: '4', delta: '+2', deltaTone: 'bad' },
          { label: 'Risk-weighted exposure', value: '$8.2M', delta: '+$1.4M', deltaTone: 'bad' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
          <Card eyebrow="Global view" title="Corridor heatmap" padded={false}>
            <MiniWorldDots h={280} markers={[
              { x: 78, y: 38, tone: 'bad', size: 14, label: 'CN' },
              { x: 50, y: 32, tone: 'signal', size: 12, label: 'EU' },
              { x: 22, y: 36, tone: 'good', size: 10, label: 'US' },
              { x: 82, y: 44, tone: 'signal', size: 10, label: 'JP' },
              { x: 48, y: 64, tone: 'good', size: 8, label: 'BR' },
              { x: 56, y: 50, tone: 'signal', size: 8, label: 'TR' },
              { x: 64, y: 60, tone: 'good', size: 8, label: 'IN' },
              { x: 88, y: 80, tone: 'good', size: 8, label: 'AU' },
            ]} />
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 18, fontSize: 11, color: 'var(--soft)' }}>
              <span><StatusDot tone="bad" /> Elevated · 2</span>
              <span><StatusDot tone="signal" /> Watch · 4</span>
              <span><StatusDot tone="good" /> Stable · 8</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)' }} className="mono">refresh 5s</span>
            </div>
          </Card>

          <Card eyebrow="Top corridors · risk-weighted" title="By exposure" padded={false}>
            {[
              { c: 'CN → EU', sup: 'Han Steel · Yunnan Tin', risk: 0.78, exp: '$3.4M', sev: 'bad' },
              { c: 'CN → US', sup: 'Han Steel', risk: 0.71, exp: '$2.1M', sev: 'bad' },
              { c: 'DE → US', sup: 'BASF · Linde', risk: 0.32, exp: '$1.6M', sev: 'good' },
              { c: 'AT → US', sup: 'Voestalpine', risk: 0.28, exp: '$0.8M', sev: 'good' },
              { c: 'JP → US', sup: 'Mitsui', risk: 0.34, exp: '$0.3M', sev: 'good' },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 80px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--bone)' }}>{r.c}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.sup}</span>
                <span className="mono" style={{ fontSize: 11.5, color: r.sev === 'bad' ? 'var(--bad)' : 'var(--good)', textAlign: 'right' }}>{r.risk.toFixed(2)}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.exp}</span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Active alerts" title="Last 48h" padded={false}>
            {[
              { t: '14:22', sev: 'bad', co: 'CN-EU', e: 'Sanctions watch · proposed dual-use restrictions', exp: '$2.1M Han Steel logistics' },
              { t: '11:08', sev: 'bad', co: 'CN-US', e: 'Tariff increase · 25% on cold-rolled steel', exp: '$1.8M direct CRC imports' },
              { t: 'Yest', sev: 'signal', co: 'TR-EU', e: 'Customs delay · 4-day average', exp: '$340K Pt catalyst delivery' },
              { t: 'Yest', sev: 'good', co: 'JP-US', e: 'Tariff easing · industrial polymers', exp: '+$120K margin Mitsui' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 12px 80px 1fr 220px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <StatusDot tone={it.sev} />
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.co}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.e}</span>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{it.exp}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 8. IndustryConsortium
// =====================================================
function IndustryConsortiumPage() {
  return (
    <PrescientShell active="consortium" title="Industry Consortium" breadcrumb={['Intelligence']}>
      <PageBody>
        <PageHero
          eyebrow="Consortium · 38 peers · anonymous"
          headline="Cross-tenant signals you can't get alone."
          sub="Aggregate, k-anonymous, opt-in."
          meta={['k=12 · differential privacy', 'Your contribution: 14 metrics', <span key="t" className="mono">last roll-up 14:00</span>]}
          action={<Btn kind="ghost" sm>Manage opt-in</Btn>} />

        <KpiStrip items={[
          { label: 'Active peers', value: '38', delta: '+3', deltaTone: 'good' },
          { label: 'Industries', value: '4', footnote: 'Steel · Chem · Auto · Semicon' },
          { label: 'Your contribution', value: '14', suffix: 'metrics', delta: 'all anonymized', deltaTone: 'good' },
          { label: 'Signal quality', value: 'k=12', footnote: 'min cohort size' },
          { label: 'Updated', value: '14:00', delta: 'every 6h', deltaTone: 'neutral' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="You vs cohort · this week" title="Operational percentile" padded={false}>
            {[
              { l: 'Forecast accuracy (MAPE)', you: '6.4%', med: '8.1%', p: 72, tone: 'good' },
              { l: 'Fill rate', you: '94.3%', med: '92.7%', p: 64, tone: 'good' },
              { l: 'Lead-time variance', you: '−14%', med: '−6%', p: 81, tone: 'good' },
              { l: 'Working capital tied', you: '$48.2M', med: '$54.1M', p: 68, tone: 'good' },
              { l: 'Stockouts (30d)', you: '4', med: '6', p: 71, tone: 'good' },
              { l: 'Supplier concentration', you: '0.41', med: '0.32', p: 24, tone: 'bad' },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 100px 50px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.you}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'right' }}>{r.med}</span>
                <div style={{ height: 2, background: 'var(--line)', position: 'relative' }}>
                  <div style={{ width: `${r.p}%`, height: '100%', background: r.tone === 'good' ? 'var(--good)' : 'var(--bad)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 6, background: 'var(--muted)' }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>P{r.p}</span>
              </div>
            ))}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }}>
              <span>You</span><span>Cohort median</span><span>Percentile</span>
            </div>
          </Card>

          <Card eyebrow="Shared signals · opt-in" title="What peers are seeing this week" padded={false}>
            {[
              { t: '24 of 38 peers raised CRC safety stock', d: 'Driven by Han Steel lead-time signal', count: '24/38', tone: 'signal' },
              { t: '17 of 38 deferring discretionary purchases', d: 'Procurement HOLD aligned across cohort', count: '17/38', tone: 'signal' },
              { t: '12 of 38 forward-buying tin', d: 'Counter-cyclical window utilized', count: '12/38', tone: 'good' },
              { t: '9 of 38 activated supplier fallback', d: 'Concentration policy triggered', count: '9/38', tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} style={{ padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.t}</span>
                  <span className="mono" style={{ fontSize: 11, color: it.tone === 'good' ? 'var(--good)' : 'var(--signal)' }}>{it.count}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{it.d}</div>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 9. PeerBenchmarking — deeper benchmarking page
// =====================================================
function PeerBenchmarkingPage() {
  return (
    <PrescientShell active="consortium" title="Peer Benchmarking" breadcrumb={['Intelligence', 'Consortium']}>
      <PageBody>
        <PageHero
          eyebrow="You vs cohort · steel + chemicals · k=12"
          headline="P72 across operational metrics."
          sub="Above median on accuracy and lead-time. Below on supplier concentration."
          meta={['38 peers in cohort', 'Anonymized, audited', <span key="t" className="mono">last refresh 14:00 PT</span>]} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 32 }}>
          {[
            { l: 'Overall percentile', v: 'P72', d: '+4 vs last quarter', tone: 'good' },
            { l: 'Strongest metric', v: 'Lead-time variance', d: 'P81 · −14%', tone: 'good' },
            { l: 'Weakest metric', v: 'Supplier concentration', d: 'P24 · 0.41 · breach', tone: 'bad' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'var(--panel)', padding: '20px 22px' }}>
              <Eyebrow>{c.l}</Eyebrow>
              <div className="display" style={{ fontSize: 24, marginTop: 10, color: c.tone === 'bad' ? 'var(--bad)' : 'var(--bone)' }}>{c.v}</div>
              <div className="mono" style={{ fontSize: 11, color: c.tone === 'good' ? 'var(--good)' : c.tone === 'bad' ? 'var(--bad)' : 'var(--muted)', marginTop: 6 }}>{c.d}</div>
            </div>
          ))}
        </div>

        <Card eyebrow="Distribution · all metrics" title="You against the cohort" padded={false}>
          {[
            { l: 'Forecast MAPE', y: 0.72, m: 0.50 },
            { l: 'Fill rate', y: 0.64, m: 0.50 },
            { l: 'On-time delivery', y: 0.58, m: 0.50 },
            { l: 'Lead-time variance', y: 0.81, m: 0.50 },
            { l: 'Working capital efficiency', y: 0.68, m: 0.50 },
            { l: 'Inventory turns', y: 0.62, m: 0.50 },
            { l: 'OEE', y: 0.55, m: 0.50 },
            { l: 'Stockout rate', y: 0.71, m: 0.50 },
            { l: 'Supplier concentration', y: 0.24, m: 0.50 },
            { l: 'Time-to-decision', y: 0.78, m: 0.50 },
          ].map((r, i, a) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 60px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
              <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '50%', top: -3, width: 1, height: 10, background: 'var(--muted)' }} />
                <div style={{ position: 'absolute', left: 0, height: '100%', width: `${r.y * 100}%`, background: r.y >= 0.5 ? 'var(--good)' : 'var(--bad)' }} />
                <div style={{ position: 'absolute', left: `${r.y * 100}%`, top: -2, transform: 'translateX(-50%)', width: 8, height: 8, background: r.y >= 0.5 ? 'var(--good)' : 'var(--bad)', border: '1px solid var(--ink)', borderRadius: '50%' }} />
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: r.y >= 0.5 ? 'var(--good)' : 'var(--bad)', textAlign: 'right' }}>P{Math.round(r.y * 100)}</span>
            </div>
          ))}
        </Card>
      </PageBody>
    </PrescientShell>
  );
}

window.StrategyHubPage = StrategyHubPage;
window.StrategyInsightsPage = StrategyInsightsPage;
window.StrategicAnalysisPage = StrategicAnalysisPage;
window.EventMonitoringPage = EventMonitoringPage;
window.DemandSignalRepositoryPage = DemandSignalRepositoryPage;
window.MAIntelligencePage = MAIntelligencePage;
window.GeopoliticalRiskPage = GeopoliticalRiskPage;
window.IndustryConsortiumPage = IndustryConsortiumPage;
window.PeerBenchmarkingPage = PeerBenchmarkingPage;
window.MiniWorldDots = MiniWorldDots;
window.BarChart = BarChart;


Object.assign(window, { StrategyHubPage, StrategyInsightsPage, StrategicAnalysisPage, EventMonitoringPage, DemandSignalRepositoryPage, MAIntelligencePage, GeopoliticalRiskPage, IndustryConsortiumPage, PeerBenchmarkingPage });
