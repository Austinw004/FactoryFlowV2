/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark */
const { useState: useStateD } = React;

// ============================================================
// DASHBOARD — operational overview
// Components mapped: <KpiStrip /> <RegimeShiftPanel /> <FdrTrendChart />
//   <SupplierRiskStrip /> <RecentActivityFeed /> <PolicySignalsList />
//   <ActionQueueCard /> <DataFreshnessBar />
// ============================================================

function KpiCell({ label, value, suffix, delta, deltaTone = 'neutral', spark, sparkColor, footnote, mono = true }) {
  return (
    <div style={{ background: 'var(--panel)', padding: '20px 22px 18px' }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
        <div className="display" style={{ fontSize: 32, lineHeight: 1, color: 'var(--bone)' }}>
          <span className={mono ? 'mono' : 'num'}>{value}</span>
          {suffix && <span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4, fontWeight: 400 }}>{suffix}</span>}
        </div>
        {spark && <Spark data={spark} color={sparkColor || 'var(--soft)'} w={64} h={20} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        {delta &&
        <span className="mono" style={{
          fontSize: 11,
          color: deltaTone === 'good' ? 'var(--good)' : deltaTone === 'bad' ? 'var(--bad)' : 'var(--muted)',
          display: 'inline-flex', alignItems: 'center', gap: 3
        }}>
            {deltaTone === 'good' && <Icon.Up s={9} />}
            {deltaTone === 'bad' && <Icon.Down s={9} />}
            {delta}
          </span>
        }
        {footnote && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{footnote}</span>}
      </div>
    </div>);

}

// FDR trend area chart — 60-day
function FdrTrendChart() {
  const data = [1.18, 1.20, 1.19, 1.22, 1.24, 1.23, 1.27, 1.30, 1.34, 1.36, 1.41, 1.43, 1.39, 1.42, 1.45, 1.49, 1.52, 1.55, 1.58, 1.62, 1.65, 1.69, 1.72, 1.74, 1.71, 1.73, 1.78, 1.81, 1.79, 1.82, 1.85, 1.83, 1.81, 1.78, 1.79, 1.84, 1.88, 1.92, 1.95, 1.97, 1.93, 1.91, 1.94, 1.99, 2.04, 2.08, 2.06, 2.03, 2.07, 2.11, 2.14, 2.18, 2.21, 2.19, 2.16, 2.13, 2.10, 2.13, 2.17, 2.21];
  const w = 720,h = 180;
  const min = 1.0,max = 2.6,rng = max - min;
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * w;
    const y = h - (v - min) / rng * h;
    return [x, y];
  });
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  // regime threshold lines: 1.2, 1.8, 2.5
  const yAt = (v) => h - (v - min) / rng * h;
  const shiftIdx = 31; // regime shift point
  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', height: 200 }}>
        {/* threshold bands */}
        <rect x="0" y={yAt(2.5)} width={w} height={yAt(1.8) - yAt(2.5)} fill="rgba(204,120,92,0.04)" />
        <line x1="0" y1={yAt(1.2)} x2={w} y2={yAt(1.2)} stroke="var(--line)" strokeDasharray="2 4" strokeWidth="1" />
        <line x1="0" y1={yAt(1.8)} x2={w} y2={yAt(1.8)} stroke="var(--line)" strokeDasharray="2 4" strokeWidth="1" />
        <line x1="0" y1={yAt(2.5)} x2={w} y2={yAt(2.5)} stroke="rgba(204,120,92,0.20)" strokeDasharray="2 4" strokeWidth="1" />
        {/* area */}
        <defs>
          <linearGradient id="fdrFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(204,120,92,0.18)" />
            <stop offset="100%" stopColor="rgba(204,120,92,0)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#fdrFill)" />
        <path d={linePath} stroke="var(--signal)" strokeWidth="1.5" fill="none" />
        {/* regime shift marker */}
        <line x1={pts[shiftIdx][0]} y1="0" x2={pts[shiftIdx][0]} y2={h} stroke="var(--signal)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        <circle cx={pts[shiftIdx][0]} cy={pts[shiftIdx][1]} r="3" fill="var(--ink)" stroke="var(--signal)" strokeWidth="1.5" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="var(--signal)" />
      </svg>
      {/* labels */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', pointerEvents: 'none' }}>
        <div className="mono" style={{ position: 'absolute', right: 0, top: `${yAt(2.5) / h * 100}%`, fontSize: 10, color: 'var(--signal)', transform: 'translateY(-100%)', paddingRight: 4 }}>2.50 — Imbalanced</div>
        <div className="mono" style={{ position: 'absolute', right: 0, top: `${yAt(1.8) / h * 100}%`, fontSize: 10, color: 'var(--muted)', transform: 'translateY(-100%)', paddingRight: 4 }}>1.80 — Asset-Led</div>
        <div className="mono" style={{ position: 'absolute', right: 0, top: `${yAt(1.2) / h * 100}%`, fontSize: 10, color: 'var(--muted)', transform: 'translateY(-100%)', paddingRight: 4 }}>1.20 — Healthy</div>
      </div>
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
        <span>Feb 26</span><span>Mar 12</span><span>Mar 26</span><span>Apr 09</span><span>Apr 26</span>
      </div>
    </div>);

}

// <SupplierRiskStrip /> — 8 tiers in one row
function SupplierRiskStrip() {
  const tiers = [
  { name: 'Han Steel', tier: 'T1', region: 'CN', risk: 0.82, change: '+0.14', delta: 'bad', material: 'Cold-rolled coil' },
  { name: 'Voestalpine', tier: 'T1', region: 'AT', risk: 0.31, change: '−0.04', delta: 'good', material: 'Special steel' },
  { name: 'Cabot Microelectronics', tier: 'T2', region: 'US', risk: 0.58, change: '+0.07', delta: 'bad', material: 'Slurry' },
  { name: 'Linde Gas', tier: 'T1', region: 'DE', risk: 0.22, change: '−0.02', delta: 'good', material: 'Argon · N₂' },
  { name: 'Kemira', tier: 'T2', region: 'FI', risk: 0.44, change: '+0.01', delta: 'neutral', material: 'Polymers' },
  { name: 'Yunnan Tin', tier: 'T2', region: 'CN', risk: 0.71, change: '+0.18', delta: 'bad', material: 'Tin solder' },
  { name: 'BASF Catalysts', tier: 'T1', region: 'DE', risk: 0.28, change: '−0.05', delta: 'good', material: 'Pt catalyst' },
  { name: 'Mitsui Plastics', tier: 'T2', region: 'JP', risk: 0.39, change: '+0.03', delta: 'neutral', material: 'PP resin' }];

  const riskColor = (r) => r >= 0.7 ? 'var(--bad)' : r >= 0.5 ? 'var(--signal)' : r >= 0.35 ? 'var(--soft)' : 'var(--good)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
      {tiers.map((t) =>
      <div key={t.name} style={{ background: 'var(--panel)', padding: '14px 14px 12px', minHeight: 110 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: 0 }}>{t.tier} · {t.region}</span>
            <span className="mono" style={{ fontSize: 9.5, color: t.delta === 'bad' ? 'var(--bad)' : t.delta === 'good' ? 'var(--good)' : 'var(--muted)' }}>{t.change}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--bone)', lineHeight: 1.2, marginBottom: 4 }}>{t.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 12 }}>{t.material}</div>
          {/* risk bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 2, background: 'var(--line)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${t.risk * 100}%`, background: riskColor(t.risk) }} />
            </div>
            <span className="mono" style={{ fontSize: 10, color: riskColor(t.risk) }}>{t.risk.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>);

}

// <RegimeShiftPanel />
function RegimeShiftPanel() {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Regime · last 60 days</Eyebrow>
          <div className="hero" style={{ fontSize: 28 }}>Imbalanced Excess</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <Pill tone="signal" mono>FDR 2.21</Pill>
            <span style={{ fontSize: 12, color: 'var(--soft)' }}>Shifted from Asset-Led Growth on <span className="mono" style={{ color: 'var(--bone)' }}>Apr 11</span></span>
          </div>
        </div>
        <Btn kind="ghost" sm icon={<Icon.External s={11} />}>Open evidence</Btn>
      </div>
      <FdrTrendChart />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', marginTop: 20, border: '1px solid var(--line)' }}>
        {[
        { l: 'S&P 500', v: '5,847', d: '+0.34%', dt: 'good' },
        { l: 'GDP Real', v: '$22.9T', d: 'Q1 2026', dt: 'neutral' },
        { l: 'Inflation', v: '3.4%', d: '+0.2pp', dt: 'bad' },
        { l: 'Sentiment', v: 'Bullish', d: '0.62', dt: 'good' }].
        map((s) =>
        <div key={s.l} style={{ background: 'var(--panel)', padding: '12px 14px' }}>
            <div className="eyebrow" style={{ fontSize: 9 }}>{s.l}</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--bone)', marginTop: 6 }}>{s.v}</div>
            <div className="mono" style={{ fontSize: 10, color: s.dt === 'good' ? 'var(--good)' : s.dt === 'bad' ? 'var(--bad)' : 'var(--muted)', marginTop: 3 }}>{s.d}</div>
          </div>
        )}
      </div>
    </div>);

}

// <ActionQueueCard /> - the right-rail action items (policy signals + recommendations)
function ActionQueue() {
  const items = [
  { sev: 'signal', title: 'Defer non-critical PO / Mar–May', body: 'FDR 2.21 — high divergence. Postpone $2.4M of discretionary stock-up.', owner: 'Procurement', age: '2h' },
  { sev: 'bad', title: 'Han Steel exposure exceeds policy', body: 'Single-source 41% of CRC. Activate Voestalpine fallback contract.', owner: 'Supply', age: '4h' },
  { sev: 'signal', title: 'Lock argon contract before EOQ', body: 'Linde quote valid 9 days. Spot up 4.1% MoM.', owner: 'Procurement', age: '1d' },
  { sev: 'good', title: 'Tin spot down 3.1%', body: 'Window to forward-buy Q3 demand. Counter-cyclical signal.', owner: 'Procurement', age: '1d' },
  { sev: 'neutral', title: 'Demand variance: SKU-3401', body: '+18% over 3-week trailing. Adjust safety stock.', owner: 'Demand', age: '2d' }];

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 14px', borderBottom: '1px solid var(--line)' }}>
        <div>
          <Eyebrow style={{ marginBottom: 4 }}>Action queue</Eyebrow>
          <div style={{ fontSize: 13, color: 'var(--bone)' }}>5 items · 2 high</div>
        </div>
        <Btn kind="quiet" sm>View all <Icon.ArrowRight s={10} /></Btn>
      </div>
      <div>
        {items.map((it, i) =>
        <div key={i} className="row-hover" style={{
          padding: '14px 18px',
          borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
          cursor: 'pointer',
          position: 'relative'
        }}>
            <div style={{ position: 'absolute', left: 0, top: 16, width: 2, height: 14, background: it.sev === 'signal' ? 'var(--signal)' : it.sev === 'bad' ? 'var(--bad)' : it.sev === 'good' ? 'var(--good)' : 'var(--line)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <StatusDot tone={it.sev} />
              <div style={{ fontSize: 12.5, color: 'var(--bone)', fontWeight: 500, flex: 1 }}>{it.title}</div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{it.age}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--soft)', lineHeight: 1.5, marginBottom: 8 }}>{it.body}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>→ {it.owner}</div>
          </div>
        )}
      </div>
    </div>);

}

// <RecentActivityFeed />
function ActivityFeed() {
  const events = [
  { t: '14:31', who: 'Forecast engine', what: 'FDR crossed 2.20 — regime confirmed Imbalanced Excess', kind: 'signal' },
  { t: '14:18', who: 'Han Steel', what: 'Lead time updated · 21 → 34 days', kind: 'bad' },
  { t: '13:52', who: 'M. Okafor', what: 'Approved RFQ-2814 · Cabot · 12,400 kg slurry', kind: 'neutral' },
  { t: '13:40', who: 'Linde Gas', what: 'Quote received · argon $0.142/L · 9-day validity', kind: 'good' },
  { t: '12:06', who: 'Demand engine', what: 'Variance flag · SKU-3401 +18% over baseline', kind: 'neutral' },
  { t: '11:48', who: 'AI Advisor', what: 'Drafted memo: Q2 procurement strategy under shift', kind: 'signal' }];

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>Recent activity</Eyebrow>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>last 4h</span>
      </div>
      <div>
        {events.map((e, i) =>
        <div key={i} className="row-hover" style={{
          display: 'grid', gridTemplateColumns: '52px 1fr',
          gap: 12, padding: '11px 18px',
          borderBottom: i < events.length - 1 ? '1px solid var(--line-soft)' : 'none',
          alignItems: 'baseline'
        }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{e.t}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--bone)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <StatusDot tone={e.kind} />
                <span style={{ color: 'var(--soft)' }}>{e.who}</span>
                <span style={{ color: 'var(--bone)' }}>{e.what}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>);

}

// MAIN PAGE
function DashboardPage() {
  return (
    <PrescientShell
      active="dashboard"
      title="Dashboard"
      breadcrumb={['Overview']}>
      
      <div style={{ padding: '28px 32px 60px', maxWidth: 1600, margin: '0 auto' }}>
        {/* Hero state line */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <Eyebrow style={{ marginBottom: 10 }}>State of operations · Apr 26, 2026</Eyebrow>
            <div className="hero" style={{ maxWidth: 720, fontSize: 28 }}>
              Significant asset–real economy decoupling. <span style={{ color: 'var(--soft)' }}>Defer non-critical purchases. Negotiate where possible.</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
              <span>Tracking <span className="mono" style={{ color: 'var(--bone)' }}>1,284</span> SKUs</span>
              <span>·</span>
              <span><span className="mono" style={{ color: 'var(--bone)' }}>47</span> suppliers across 12 countries</span>
              <span>·</span>
              <span>Last sync <span className="mono" style={{ color: 'var(--bone)' }}>14:31 PT</span></span>
            </div>
          </div>
        </div>

        {/* KPI strip — 5-up no-chrome cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 32 }}>
          <KpiCell label="FDR · live" value="2.21" delta="+0.07" deltaTone="bad" footnote="vs 7d avg" spark={[1.85, 1.91, 1.95, 2.04, 2.11, 2.18, 2.21]} sparkColor="var(--signal)" />
          <KpiCell label="Working capital tied up" value="$48.2M" delta="−$1.8M" deltaTone="good" footnote="released this week" spark={[52, 51, 51, 50, 49, 48, 48]} sparkColor="var(--good)" />
          <KpiCell label="Avg fill rate" value="94.3" suffix="%" delta="−0.6pp" deltaTone="bad" spark={[95, 95, 94.8, 94.6, 94.4, 94.3, 94.3]} />
          <KpiCell label="Suppliers at risk" value="6" suffix="/47" delta="+2" deltaTone="bad" footnote="moved up tier" spark={[3, 3, 4, 5, 5, 6, 6]} sparkColor="var(--bad)" />
          <KpiCell label="Action items" value="14" delta="2 high" deltaTone="bad" spark={[8, 9, 11, 12, 13, 14, 14]} />
        </div>

        {/* Two-up: regime panel + action queue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, marginBottom: 32 }}>
          <RegimeShiftPanel />
          <ActionQueue />
        </div>

        {/* Supplier risk strip */}
        <div style={{ marginBottom: 32 }}>
          <SectionHead
            eyebrow="Supplier risk · top exposures"
            title="By concentration weighted volume"
            action={
            <div style={{ display: 'flex', gap: 8 }}>
                <Btn kind="quiet" sm>By region</Btn>
                <Btn kind="quiet" sm>By tier</Btn>
                <Btn kind="ghost" sm icon={<Icon.External s={11} />}>Open mapping</Btn>
              </div>
            }
            style={{ marginBottom: 16 }} />
          
          <SupplierRiskStrip />
        </div>

        {/* Two-up: activity + commodity strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <ActivityFeed />
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow>Commodity watch</Eyebrow>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>spot · 1d</span>
            </div>
            {[
            { name: 'Cold-rolled coil', code: 'HRC', px: '$842', unit: '/MT', d: '+2.4%', dt: 'bad', spark: [820, 825, 830, 832, 835, 840, 842] },
            { name: 'Aluminum (LME)', code: 'AL', px: '$2,418', unit: '/MT', d: '+0.8%', dt: 'bad', spark: [2390, 2395, 2400, 2405, 2410, 2415, 2418] },
            { name: 'Tin (LME)', code: 'SN', px: '$28,140', unit: '/MT', d: '−3.1%', dt: 'good', spark: [29100, 29000, 28800, 28600, 28400, 28200, 28140] },
            { name: 'Argon (industrial)', code: 'AR', px: '$0.142', unit: '/L', d: '+4.1%', dt: 'bad', spark: [0.135, 0.136, 0.138, 0.139, 0.140, 0.141, 0.142] },
            { name: 'PP resin', code: 'PP', px: '$1,184', unit: '/MT', d: '+0.3%', dt: 'neutral', spark: [1180, 1181, 1182, 1183, 1183, 1184, 1184] },
            { name: 'Pt catalyst', code: 'PT', px: '$971', unit: '/oz', d: '−1.2%', dt: 'good', spark: [985, 982, 980, 977, 974, 972, 971] }].
            map((c, i) =>
            <div key={c.code} className="row-hover" style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 80px 64px 60px',
              gap: 12, padding: '12px 18px', alignItems: 'center',
              borderBottom: i < 5 ? '1px solid var(--line-soft)' : 'none'
            }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.code}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{c.name}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{c.px}<span style={{ color: 'var(--muted)', fontSize: 10 }}>{c.unit}</span></span>
                <Spark data={c.spark} color={c.dt === 'good' ? 'var(--good)' : c.dt === 'bad' ? 'var(--bad)' : 'var(--soft)'} w={56} h={16} />
                <span className="mono" style={{ fontSize: 11, color: c.dt === 'good' ? 'var(--good)' : c.dt === 'bad' ? 'var(--bad)' : 'var(--muted)', textAlign: 'right' }}>{c.d}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </PrescientShell>);

}

window.DashboardPage = DashboardPage;