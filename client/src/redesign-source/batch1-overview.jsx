/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody */

// ============================================================
// BATCH 1 — Overview hubs
// 1. DashboardHub        — operator landing (different from Dashboard)
// 2. PilotRevenueDashboard
// 3. ImpactDashboard
// 4. OperationsHub
// 5. DemandHub
// ============================================================

// ---------- shared bits for this batch ----------

// 6-up scenario tile grid that several hubs use
function HubTile({ eyebrow, title, body, kpi, kpiLabel, tone = 'neutral', cta }) {
  const accent = { signal: 'var(--signal)', good: 'var(--good)', bad: 'var(--bad)', neutral: 'var(--line)' }[tone];
  return (
    <div className="row-hover" style={{
      background: 'var(--panel)', padding: 20,
      borderLeft: `2px solid ${accent}`,
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column', minHeight: 168,
    }}>
      <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>
      <div style={{ fontSize: 15, color: 'var(--bone)', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--soft)', lineHeight: 1.55, marginBottom: 14 }}>{body}</div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        {kpi && (
          <div>
            <div className="mono" style={{ fontSize: 18, color: 'var(--bone)', fontWeight: 300, letterSpacing: '-0.01em' }}>{kpi}</div>
            {kpiLabel && <div className="eyebrow" style={{ fontSize: 9, marginTop: 2 }}>{kpiLabel}</div>}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--soft)', fontSize: 11 }}>
          {cta || 'Open'} <Icon.ArrowRight s={11} />
        </div>
      </div>
    </div>
  );
}

// Stacked bar — used in pilot/impact
function StackedBar({ segments, w = '100%', h = 6 }) {
  const total = segments.reduce((s, x) => s + x.v, 0);
  return (
    <div style={{ display: 'flex', height: h, width: w, background: 'var(--line)', overflow: 'hidden' }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${(s.v / total) * 100}%`, background: s.c, height: '100%' }} title={`${s.l} · ${s.v}`} />
      ))}
    </div>
  );
}

// Tiny month-bar chart
function BarChart({ data, w = 480, h = 140, color = 'var(--signal)', baseline }) {
  const max = Math.max(...data.map(d => d.v));
  const bw = (w - data.length * 4) / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', height: h }}>
      {data.map((d, i) => {
        const bh = (d.v / max) * (h - 24);
        return (
          <g key={i}>
            <rect x={i * (bw + 4)} y={h - bh - 16} width={bw} height={bh} fill={d.c || color} />
            <text x={i * (bw + 4) + bw / 2} y={h - 4} fill="var(--muted)" fontSize="9" textAnchor="middle" fontFamily="Inter Tight">{d.l}</text>
          </g>
        );
      })}
      {baseline !== undefined && (
        <line x1="0" y1={h - 16 - (baseline / max) * (h - 24)} x2={w} y2={h - 16 - (baseline / max) * (h - 24)} stroke="var(--muted)" strokeDasharray="2 3" strokeWidth="1" />
      )}
    </svg>
  );
}

// =====================================================
// 1. DashboardHub — directory-style landing
// =====================================================
function DashboardHubPage() {
  const tiles = [
    { eyebrow: 'Live · regime', title: 'State of operations', body: 'Imbalanced Excess regime since Apr 11. Defer non-critical purchases this cycle.', kpi: '2.21', kpiLabel: 'FDR', tone: 'signal', cta: 'Open dashboard' },
    { eyebrow: 'Pilot revenue', title: 'Q2 progress · pacing', body: 'Three pilots active across Han Steel, Voestalpine, BASF. $1.4M of $2.0M target.', kpi: '$1.4M', kpiLabel: 'commit', tone: 'good' },
    { eyebrow: 'Impact', title: 'Working capital released', body: 'Imbalance-aware ordering freed cash on argon and CRC stock-up windows.', kpi: '$4.8M', kpiLabel: 'YTD', tone: 'good' },
    { eyebrow: 'Operations', title: '47 suppliers · 12 countries', body: '6 suppliers moved up tier this week. 2 require fallback activation.', kpi: '94.3%', kpiLabel: 'fill rate', tone: 'neutral' },
    { eyebrow: 'Demand', title: 'Forecast accuracy', body: '8-week MAPE held at 6.4% under the new regime. SKU-3401 variance flagged.', kpi: '6.4%', kpiLabel: 'MAPE', tone: 'neutral' },
    { eyebrow: 'Action queue', title: '14 items · 2 high', body: 'Defer CRC stock-up, lock argon, diversify Han Steel — total exposure $2.4M.', kpi: '14', kpiLabel: 'open', tone: 'signal' },
  ];

  return (
    <PrescientShell active="dashboard" title="Dashboard" breadcrumb={['Overview']}>
      <PageBody>
        <PageHero
          eyebrow="Overview · Apr 26, 2026"
          headline="Good afternoon, M."
          sub="Here's where to focus today."
          meta={[
            <span key="r"><RegimeBadge size="sm" /></span>,
            'Tracking 1,284 SKUs',
            '47 suppliers',
            <span key="t" className="mono">Last sync 14:31 PT</span>,
          ]} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 32 }}>
          {tiles.map((t, i) => <HubTile key={i} {...t} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card title="Pinned threads" eyebrow="Continue working" padded={false}>
            {[
              { t: 'Q2 procurement under regime shift', s: 'Ridgeview · 4 attachments', time: '2h ago' },
              { t: 'Han Steel concentration risk · open', s: 'Memo draft for legal', time: '4h ago' },
              { t: 'Tin counter-cyclical window', s: 'Forward-buy economics through Q3', time: 'Mon' },
              { t: 'Slurry RFQ · 3-vendor compare', s: 'Cabot vs DuPont vs Versum', time: 'Tue' },
            ].map((it, i) => (
              <div key={i} className="row-hover" style={{ padding: '14px 18px', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--bone)', marginBottom: 3 }}>{it.t}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{it.s}</div>
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.time}</span>
              </div>
            ))}
          </Card>

          <Card title="What's changed" eyebrow="Last 24h" padded={false}>
            {[
              { t: '14:08', e: 'FDR crossed 2.20', d: 'Regime confirmed Imbalanced Excess', tone: 'signal' },
              { t: '11:24', e: 'Han Steel · lead time 21→34d', d: 'Single-source 41% of CRC', tone: 'bad' },
              { t: '09:51', e: 'Linde quote · 9-day validity', d: 'Argon $0.142/L · spot up 4.1%', tone: 'good' },
              { t: 'Yest', e: 'Tin LME −3.1%', d: 'Window opens for forward-buy Q3', tone: 'good' },
            ].map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 12px 1fr', gap: 10, padding: '12px 18px', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <StatusDot tone={it.tone} />
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--bone)', marginBottom: 2 }}>{it.e}</div>
                  <div style={{ fontSize: 11, color: 'var(--soft)' }}>{it.d}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 2. PilotRevenueDashboard
// =====================================================
function PilotRevenueDashboardPage() {
  const pilots = [
    { co: 'Han Steel', country: 'CN', stage: 'Live', mrr: 18000, commit: 540000, signed: 'Jan 12', poc: 'Y. Liu', use: 'CRC concentration · regime hedging', health: 'good', utilization: 87 },
    { co: 'Voestalpine', country: 'AT', stage: 'Live', mrr: 22000, commit: 660000, signed: 'Feb 03', poc: 'K. Bauer', use: 'Special steel forecasting', health: 'good', utilization: 74 },
    { co: 'BASF Catalysts', country: 'DE', stage: 'Live', mrr: 14500, commit: 435000, signed: 'Feb 28', poc: 'A. Müller', use: 'Pt catalyst supply mapping', health: 'neutral', utilization: 51 },
    { co: 'Cabot Microelectronics', country: 'US', stage: 'Trial', mrr: 0, commit: 0, signed: '—', poc: 'J. Chen', use: 'Slurry demand signal', health: 'signal', utilization: 22 },
    { co: 'Mitsui Plastics', country: 'JP', stage: 'Trial', mrr: 0, commit: 0, signed: '—', poc: 'H. Sato', use: 'PP resin commodity forecasts', health: 'neutral', utilization: 14 },
    { co: 'Linde Gas', country: 'DE', stage: 'Negotiation', mrr: 0, commit: 0, signed: '—', poc: 'F. Becker', use: 'Argon contract optimization', health: 'good', utilization: 0 },
  ];

  const monthly = [
    { l: 'Nov', v: 18 }, { l: 'Dec', v: 22 }, { l: 'Jan', v: 36 }, { l: 'Feb', v: 54 }, { l: 'Mar', v: 54 }, { l: 'Apr', v: 54 },
  ];

  return (
    <PrescientShell active="pilot" title="Pilot Revenue" breadcrumb={['Overview']}>
      <PageBody>
        <PageHero
          eyebrow="Q2 2026 · pilot program"
          headline="$1.4M committed across six pilots."
          sub="Three live, two in trial, one in negotiation."
          meta={['Pacing 70% of Q2 target', '3 conversions due this quarter', <span key="t" className="mono">YTD ARR run-rate $648K</span>]} />

        <KpiStrip items={[
          { label: 'Committed contract value', value: '$1.40M', delta: '+$120K', deltaTone: 'good', footnote: 'this week', spark: [820, 880, 950, 1100, 1280, 1340, 1400], sparkColor: 'var(--good)' },
          { label: 'MRR · live pilots', value: '$54.5K', delta: '+$22K', deltaTone: 'good', footnote: 'vs Q1', spark: [18, 22, 36, 54, 54, 54, 54.5], sparkColor: 'var(--good)' },
          { label: 'Avg time-to-live', value: '38', suffix: 'days', delta: '−6d', deltaTone: 'good', spark: [52, 50, 48, 44, 42, 40, 38] },
          { label: 'Pilot → paid rate', value: '67', suffix: '%', delta: '4 of 6', deltaTone: 'neutral' },
          { label: 'NRR · live cohort', value: '118', suffix: '%', delta: '+8pp', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          <Card eyebrow="Pipeline by stage" padded={false}>
            <div style={{ padding: '20px 18px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                <span className="mono" style={{ fontSize: 26, color: 'var(--bone)', fontWeight: 300 }}>$1.40M</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>committed across 6 pilots</span>
              </div>
              <StackedBar h={8} segments={[
                { l: 'Live', v: 1635, c: 'var(--good)' },
                { l: 'Trial', v: 240, c: 'var(--signal)' },
                { l: 'Negotiation', v: 360, c: 'var(--soft)' },
              ]} />
              <div style={{ display: 'flex', gap: 24, marginTop: 14, fontSize: 11.5, color: 'var(--soft)' }}>
                <span><StatusDot tone="good" /> Live $1.64M · 3</span>
                <span><StatusDot tone="signal" /> Trial $240K · 2</span>
                <span style={{ color: 'var(--muted)' }}><StatusDot tone="neutral" /> Negotiation $360K · 1</span>
              </div>
            </div>
            <div style={{ padding: '12px 18px 18px', borderTop: '1px solid var(--line-soft)' }}>
              <Eyebrow style={{ marginBottom: 12 }}>MRR by month · $K</Eyebrow>
              <BarChart data={monthly} h={120} color="var(--signal)" baseline={45} />
            </div>
          </Card>

          <Card eyebrow="Conversion forecast" title="Next 90 days" padded={false}>
            {[
              { co: 'Cabot Micro', s: 'Trial → Live', p: 0.78, eta: 'May 14', amt: '$210K' },
              { co: 'Mitsui Plastics', s: 'Trial → Live', p: 0.55, eta: 'Jun 02', amt: '$180K' },
              { co: 'Linde Gas', s: 'Neg → Live', p: 0.62, eta: 'Jun 18', amt: '$360K' },
            ].map((it, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--bone)' }}>{it.co}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.amt}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{it.s} · ETA {it.eta}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${it.p * 100}%`, height: '100%', background: it.p > 0.7 ? 'var(--good)' : 'var(--signal)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--soft)' }}>{(it.p * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--ink-deep)' }}>
              <Btn kind="ghost" sm full>Open advisor →</Btn>
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 32 }}>
          <SectionHead eyebrow="Active pilots" title="Six accounts · all regions" style={{ marginBottom: 16 }}
            action={<div style={{ display: 'flex', gap: 8 }}><Btn kind="ghost" sm>By stage</Btn><Btn kind="ghost" sm>By region</Btn><Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export</Btn></div>} />
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 80px 100px 110px 110px 100px minmax(220px, 2fr) 90px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Pilot', 'Region', 'Stage', 'MRR', 'Commit', 'Signed', 'Use case', 'Health'].map((h, i) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9, textAlign: ['MRR', 'Commit'].includes(h) ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {pilots.map((p, i) => (
              <div key={p.co} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 80px 100px 110px 110px 100px minmax(220px, 2fr) 90px', gap: 12, padding: '12px 18px', borderBottom: i < pilots.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{p.co}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{p.poc}</div>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{p.country}</span>
                <Pill tone={p.stage === 'Live' ? 'good' : p.stage === 'Trial' ? 'signal' : 'neutral'} mono>{p.stage}</Pill>
                <span className="mono" style={{ fontSize: 11.5, color: p.mrr ? 'var(--bone)' : 'var(--muted)', textAlign: 'right' }}>{p.mrr ? '$' + (p.mrr / 1000).toFixed(1) + 'K' : '—'}</span>
                <span className="mono" style={{ fontSize: 11.5, color: p.commit ? 'var(--bone)' : 'var(--muted)', textAlign: 'right' }}>{p.commit ? '$' + (p.commit / 1000).toFixed(0) + 'K' : '—'}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{p.signed}</span>
                <span style={{ fontSize: 12, color: 'var(--soft)' }}>{p.use}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${p.utilization}%`, height: '100%', background: p.health === 'good' ? 'var(--good)' : p.health === 'signal' ? 'var(--signal)' : 'var(--soft)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.utilization}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 3. ImpactDashboard — quantified business value
// =====================================================
function ImpactDashboardPage() {
  return (
    <PrescientShell active="impact" title="Impact" breadcrumb={['Overview']}>
      <PageBody>
        <PageHero
          eyebrow="Year-to-date · Apr 26, 2026"
          headline={<>$4.8M of working capital released and <span style={{ color: 'var(--bone)' }}>$2.1M of risk avoided.</span></>}
          sub="Audited against ERP-of-record."
          meta={['117 decisions logged', '93% accepted', <span key="t" className="mono">Audit ID 2026-Q1-A14</span>]} />

        <KpiStrip items={[
          { label: 'Working capital released', value: '$4.8M', delta: '+$1.8M', deltaTone: 'good', footnote: 'this quarter', spark: [1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8], sparkColor: 'var(--good)' },
          { label: 'Risk avoided · est.', value: '$2.1M', delta: '+$240K', deltaTone: 'good', footnote: 'last 30d', spark: [0.6, 0.9, 1.2, 1.5, 1.7, 1.9, 2.1], sparkColor: 'var(--good)' },
          { label: 'Decisions accepted', value: '109', suffix: '/117', delta: '93%', deltaTone: 'good' },
          { label: 'MAPE improvement', value: '−2.1', suffix: 'pp', delta: 'vs baseline', deltaTone: 'good' },
          { label: 'Avg lead-time variance', value: '−14', suffix: '%', delta: 'vs Q4', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card title="Cumulative value · YTD" eyebrow="Logged & audited">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 14 }}>
              <div>
                <div className="display" style={{ fontSize: 36, color: 'var(--good)' }}>$6.9M</div>
                <div className="eyebrow" style={{ marginTop: 6 }}>Combined value</div>
              </div>
              <div style={{ flex: 1 }}>
                <StackedBar h={10} segments={[
                  { l: 'WC released', v: 4.8, c: 'var(--good)' },
                  { l: 'Risk avoided', v: 2.1, c: 'var(--signal)' },
                ]} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--soft)' }}>
                  <span><StatusDot tone="good" /> WC released $4.8M (70%)</span>
                  <span><StatusDot tone="signal" /> Risk avoided $2.1M (30%)</span>
                </div>
              </div>
            </div>
            <Hairline style={{ margin: '14px 0' }} />
            <BarChart data={[
              { l: 'Jan', v: 0.9 }, { l: 'Feb', v: 1.4 }, { l: 'Mar', v: 1.8 }, { l: 'Apr', v: 2.8, c: 'var(--good)' }
            ]} h={130} color="var(--soft)" />
          </Card>

          <Card title="Top decisions by value" eyebrow="Accepted recommendations" padded={false}>
            {[
              { d: 'Apr 18', t: 'Defer CRC stock-up · 1,200 MT', v: '$1.04M', src: 'FDR 2.18 → Imbalanced Excess', tone: 'good' },
              { d: 'Apr 11', t: 'Lock argon · Linde 9-day quote', v: '$340K', src: 'Spot +4.1% MoM', tone: 'good' },
              { d: 'Apr 04', t: 'Diversify Han Steel → Voestalpine', v: '$1.10M', src: 'Concentration risk policy', tone: 'good' },
              { d: 'Mar 28', t: 'Forward-buy tin · Q3 demand', v: '$210K', src: 'Tin LME −3.1%', tone: 'good' },
              { d: 'Mar 14', t: 'Cancel slurry overstock RFQ', v: '$180K', src: 'Demand signal correction', tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '54px 1fr 90px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.d}</span>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--bone)' }}>{it.t}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{it.src}</div>
                </div>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--good)', textAlign: 'right' }}>{it.v}</span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="By function" title="Value attribution" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)' }}>
              {[
                { l: 'Procurement', v: '$3.2M', p: 46, src: '64 decisions' },
                { l: 'Inventory', v: '$1.6M', p: 23, src: '38 decisions' },
                { l: 'Forecasting', v: '$1.4M', p: 20, src: '11 decisions' },
                { l: 'Logistics', v: '$0.7M', p: 11, src: '4 decisions' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'var(--panel)', padding: '18px 20px' }}>
                  <Eyebrow>{c.l}</Eyebrow>
                  <div className="mono" style={{ fontSize: 22, color: 'var(--bone)', fontWeight: 300, marginTop: 8 }}>{c.v}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                      <div style={{ width: `${c.p}%`, height: '100%', background: 'var(--good)' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{c.p}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{c.src}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 4. OperationsHub — directory of operational surfaces
// =====================================================
function OperationsHubPage() {
  return (
    <PrescientShell active="opshub" title="Operations" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Operations · Apr 26"
          headline="142 materials, 47 suppliers, 24 production lines."
          sub="All systems streaming live."
          meta={['Last sync 14:31 PT', '6 alerts open', <span key="r"><RegimeBadge size="sm" /></span>]} />

        <KpiStrip items={[
          { label: 'Avg fill rate', value: '94.3', suffix: '%', delta: '−0.6pp', deltaTone: 'bad', spark: [95, 95, 94.8, 94.6, 94.4, 94.3, 94.3] },
          { label: 'On-time delivery', value: '88.1', suffix: '%', delta: '−1.2pp', deltaTone: 'bad' },
          { label: 'Stockouts · 30d', value: '4', delta: '+1', deltaTone: 'bad' },
          { label: 'Lines running', value: '22', suffix: '/24', footnote: '2 in changeover' },
          { label: 'OEE · weighted', value: '76.4', suffix: '%', delta: '+0.8pp', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          <HubTile eyebrow="Procurement" title="142 materials · 9 RFQs" body="HOLD signal active · $2.4M of POs flagged for deferral. 38 open POs across CRC, gas, slurry." kpi="$12.4M" kpiLabel="open POs" tone="signal" />
          <HubTile eyebrow="Supply chain" title="Multi-tier mapping" body="6 suppliers moved up risk tier. Han Steel concentration breaches policy at 41% of CRC." kpi="6/47" kpiLabel="at risk" tone="bad" />
          <HubTile eyebrow="Inventory" title="On-hand vs safety" body="Argon below safety stock. CRC stock-up window deferred. Working capital tied $48.2M." kpi="$48.2M" kpiLabel="WC tied" tone="neutral" />
          <HubTile eyebrow="Machinery" title="24 production lines" body="2 lines in changeover. Predictive maintenance flagged 1 high-risk asset on Line 7." kpi="22/24" kpiLabel="running" tone="neutral" />
          <HubTile eyebrow="Predictive maintenance" title="Asset health" body="Line 7 bearing FFT signature drift. Schedule maintenance window before May 8." kpi="1" kpiLabel="high risk" tone="signal" />
          <HubTile eyebrow="Digital twin" title="Production simulation" body="Stress-test Voestalpine fallback at 30/50/70% volumes. 3 scenarios saved." kpi="3" kpiLabel="scenarios" tone="neutral" />
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          <Card eyebrow="Recent operational events" title="Last 4h" padded={false}>
            {[
              { t: '14:18', src: 'Han Steel', e: 'Lead time 21→34 days', tone: 'bad' },
              { t: '13:52', src: 'M. Okafor', e: 'Approved RFQ-2814 · Cabot · 12,400 kg slurry', tone: 'neutral' },
              { t: '13:40', src: 'Linde Gas', e: 'Quote received · argon $0.142/L', tone: 'good' },
              { t: '12:06', src: 'Demand engine', e: 'Variance flag · SKU-3401 +18%', tone: 'neutral' },
              { t: '11:48', src: 'Machinery', e: 'Line 7 · bearing temp +6°C trend', tone: 'signal' },
              { t: '10:22', src: 'AI Advisor', e: 'Drafted memo: Q2 procurement under shift', tone: 'signal' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 12px 130px 1fr', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <StatusDot tone={it.tone} />
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{it.src}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.e}</span>
              </div>
            ))}
          </Card>
          <EvidencePanel
            title="Active signals"
            confidence={0.80}
            sources={[
              { title: 'Defer non-critical PO Mar–May', source: 'FDR 2.21 · regime panel', time: '2h ago' },
              { title: 'Han Steel exposure exceeds policy', source: 'Concentration limit 35%', time: '4h ago' },
              { title: 'Lock argon contract before EOQ', source: 'Linde quote · 9-day validity', time: '1d' },
              { title: 'Tin spot −3.1% — forward-buy', source: 'LME · counter-cyclical signal', time: '1d' },
            ]} />
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 5. DemandHub — directory for demand & forecasting
// =====================================================
function DemandHubPage() {
  return (
    <PrescientShell active="demand" title="Demand Hub" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="Demand · Apr 26"
          headline="Forecasts holding under regime shift."
          sub="MAPE 6.4% across 1,284 SKUs."
          meta={['8-week horizon active', '3 SKUs flagged high variance', <span key="r"><RegimeBadge size="sm" /></span>]} />

        <KpiStrip items={[
          { label: 'Forecast accuracy · MAPE', value: '6.4', suffix: '%', delta: '−0.4pp', deltaTone: 'good', spark: [7.2, 7.0, 6.8, 6.6, 6.5, 6.4, 6.4], sparkColor: 'var(--good)' },
          { label: 'Bias · weighted', value: '+1.2', suffix: '%', delta: 'over-forecast', deltaTone: 'neutral' },
          { label: 'SKUs in forecast', value: '1,284', delta: '+12', deltaTone: 'neutral' },
          { label: 'High variance SKUs', value: '3', delta: '+1', deltaTone: 'bad' },
          { label: 'Demand signal updates', value: '47K', delta: 'last 24h', deltaTone: 'neutral' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          <HubTile eyebrow="Forecasting" title="Model state · all horizons" body="Statistical ensemble + regime overlay. 8-week MAPE 6.4%, holding under Imbalanced Excess." kpi="6.4%" kpiLabel="MAPE" tone="good" />
          <HubTile eyebrow="Multi-horizon" title="2w · 8w · 26w · 52w" body="Four horizons synchronized. 26-week interval widening with FDR divergence." kpi="4" kpiLabel="horizons" tone="neutral" />
          <HubTile eyebrow="Accuracy" title="Backtest vs live" body="Out-of-sample MAPE 6.8%. Live tracking in-window for 23 of 26 weeks." kpi="88%" kpiLabel="in-window" tone="good" />
          <HubTile eyebrow="Commodity" title="HRC · AL · SN · AR · PP · PT" body="Six commodity tracks. Tin counter-cyclical, argon spot up 4.1% MoM." kpi="6" kpiLabel="commodities" tone="signal" />
          <HubTile eyebrow="Backtesting" title="Historical replay" body="Replay any horizon vs any prior date. Compare under-regime vs across-regime baselines." kpi="2018→" kpiLabel="window" tone="neutral" />
          <HubTile eyebrow="Demand Signal Repository" title="Signal library" body="POS, web, weather, social, pricing — 47K updates today. 12 sources connected." kpi="47K" kpiLabel="signals/24h" tone="neutral" />
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="High variance SKUs" title="Above 2σ this week" padded={false}>
            {[
              { sku: 'SKU-3401', name: 'Cold-rolled coil 1.2mm · auto-grade', delta: '+18%', tone: 'bad', period: '3w trailing' },
              { sku: 'SKU-1208', name: 'Argon · industrial 5N', delta: '+11%', tone: 'bad', period: '4w trailing' },
              { sku: 'SKU-2204', name: 'Pt catalyst · ingot', delta: '−9%', tone: 'good', period: '6w trailing' },
            ].map((it, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 60px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{it.sku}</span>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{it.period}</div>
                </div>
                <span className="mono" style={{ fontSize: 11.5, color: it.tone === 'good' ? 'var(--good)' : 'var(--bad)', textAlign: 'right' }}>{it.delta}</span>
              </div>
            ))}
          </Card>

          <Card eyebrow="Signal sources" title="Demand Signal Repository · 12 connected" padded={false}>
            {[
              { n: 'ERP — SAP S/4HANA', s: 'Core orders & shipments', updates: '12.4K/24h', tone: 'good' },
              { n: 'POS — NRF feed', s: 'Daily sell-through', updates: '8.1K/24h', tone: 'good' },
              { n: 'Web traffic — GA4', s: 'Customer-facing intent', updates: '14.2K/24h', tone: 'good' },
              { n: 'Weather — NOAA', s: 'Regional load proxies', updates: '6.4K/24h', tone: 'good' },
              { n: 'Pricing — Bloomberg', s: 'Spot & futures', updates: '5.0K/24h', tone: 'good' },
              { n: 'Social — XAPI', s: 'Brand mention deltas', updates: '0.9K/24h', tone: 'signal' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 90px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <StatusDot tone={it.tone} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--bone)' }}>{it.n}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.s}</div>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{it.updates}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

window.DashboardHubPage = DashboardHubPage;
window.PilotRevenueDashboardPage = PilotRevenueDashboardPage;
window.ImpactDashboardPage = ImpactDashboardPage;
window.OperationsHubPage = OperationsHubPage;
window.DemandHubPage = DemandHubPage;


Object.assign(window, { DashboardHubPage, PilotRevenueDashboardPage, ImpactDashboardPage, OperationsHubPage, DemandHubPage });
