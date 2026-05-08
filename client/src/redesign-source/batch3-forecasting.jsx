/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody, BarChart */

// ============================================================
// BATCH 3 — Forecasting
//   Forecasting · MultiHorizon · ForecastAccuracy
//   CommodityForecasting · BacktestingDashboard · ForecastEnsemble
// ============================================================

// === forecast fan-chart used in several places ===
function FanChart({ history = [], forecast = [], h = 220, w = 800, label = '' }) {
  // history: [{x, v}], forecast: [{x, v, lo, hi}]
  const all = [...history, ...forecast];
  const xs = all.map(d => d.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const vAll = all.flatMap(d => [d.v, d.lo ?? d.v, d.hi ?? d.v]);
  const vMin = Math.min(...vAll), vMax = Math.max(...vAll);
  const px = (x) => ((x - xMin) / (xMax - xMin)) * w;
  const py = (v) => h - 30 - ((v - vMin) / (vMax - vMin)) * (h - 50);
  const histLine = history.map((d, i) => `${i ? 'L' : 'M'}${px(d.x)},${py(d.v)}`).join(' ');
  const fcLine = forecast.map((d, i) => `${i ? 'L' : 'M'}${px(d.x)},${py(d.v)}`).join(' ');
  const fcBand = [
    ...forecast.map((d, i) => `${i ? 'L' : 'M'}${px(d.x)},${py(d.hi)}`),
    ...[...forecast].reverse().map((d, i) => `L${px(d.x)},${py(d.lo)}`),
    'Z',
  ].join(' ');
  const splitX = forecast.length ? px(forecast[0].x) : w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      {/* grid */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1="0" x2={w} y1={(h - 30) * (1 - p) + 20} y2={(h - 30) * (1 - p) + 20} stroke="var(--line-soft)" />
      ))}
      {/* divider */}
      <line x1={splitX} x2={splitX} y1="10" y2={h - 24} stroke="var(--muted)" strokeDasharray="2 3" />
      <text x={splitX + 4} y="18" fill="var(--muted)" fontSize="10" fontFamily="JetBrains Mono">forecast →</text>
      {/* CI band */}
      <path d={fcBand} fill="var(--signal)" opacity="0.12" />
      {/* history line */}
      <path d={histLine} fill="none" stroke="var(--bone-dim)" strokeWidth="1.5" />
      {/* forecast line */}
      <path d={fcLine} fill="none" stroke="var(--signal)" strokeWidth="1.5" strokeDasharray="0" />
      {/* x labels at ends */}
      <text x="0" y={h - 6} fill="var(--muted)" fontSize="9.5" fontFamily="JetBrains Mono">{label}</text>
    </svg>
  );
}

function genFanData(seed = 1, hist = 36, fc = 12) {
  let v = 100 + seed * 5;
  const out = [];
  for (let i = 0; i < hist; i++) {
    v += (Math.sin(i * 0.4 + seed) * 4) + ((seed * 13 + i * 7) % 9 - 4) * 0.6;
    out.push({ x: i, v: +v.toFixed(2) });
  }
  const forecast = [];
  for (let i = 0; i < fc; i++) {
    v += Math.sin((hist + i) * 0.3 + seed) * 3 + 0.3;
    const spread = 4 + i * 1.2;
    forecast.push({ x: hist + i, v: +v.toFixed(2), lo: +(v - spread).toFixed(2), hi: +(v + spread).toFixed(2) });
  }
  return { history: out, forecast };
}

// ===================================================
// 1. Forecasting — single SKU detail
// ===================================================
function ForecastingPage() {
  const data = genFanData(2, 40, 12);
  return (
    <PrescientShell active="forecasting" title="Forecasting" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="SKU-3401 · Cold-rolled coil 1.2mm · auto-grade"
          headline="Forecast holding · MAPE 6.4% on 8-week horizon."
          sub="Statistical ensemble + regime overlay."
          meta={['1,284 SKUs in book', 'Ensemble v4.2.1', <span key="r"><RegimeBadge size="sm" /></span>]}
          action={<div style={{ display: 'flex', gap: 8 }}><Btn kind="ghost" sm>Compare SKUs</Btn><Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export</Btn></div>} />

        <KpiStrip items={[
          { label: 'MAPE · 8w', value: '6.4', suffix: '%', delta: '−0.4pp', deltaTone: 'good', spark: [7.4, 7.0, 6.8, 6.6, 6.5, 6.4, 6.4], sparkColor: 'var(--good)' },
          { label: 'Bias', value: '+1.2', suffix: '%', delta: 'over-forecast', deltaTone: 'neutral' },
          { label: 'Coverage · 80% CI', value: '83', suffix: '%', delta: '+1pp', deltaTone: 'good' },
          { label: 'Demand last 4w', value: '4,820', suffix: 'MT' },
          { label: 'Next 8w · expected', value: '5,180', suffix: 'MT', delta: '+7.5%', deltaTone: 'neutral' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card eyebrow="History · 40 weeks · forecast 12 weeks ahead" title="SKU-3401 demand">
            <FanChart history={data.history} forecast={data.forecast} h={260} label="−40w" />
            <Hairline style={{ margin: '14px 0' }} />
            <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'var(--soft)' }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 1.5, background: 'var(--bone-dim)', verticalAlign: 'middle', marginRight: 6 }} /> Historical</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 1.5, background: 'var(--signal)', verticalAlign: 'middle', marginRight: 6 }} /> Forecast (median)</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 6, background: 'var(--signal)', opacity: 0.2, verticalAlign: 'middle', marginRight: 6 }} /> 80% CI</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)' }} className="mono">last refresh 14:31</span>
            </div>
          </Card>

          <EvidencePanel
            title="Drivers · top contributing"
            confidence={0.74}
            sources={[
              { title: 'POS · NRF feed', source: '+3.2pp · auto-grade demand pull', time: 'live' },
              { title: 'Han Steel lead-time signal', source: '+1.4pp · safety stock pressure', time: '14:18' },
              { title: 'Macroeconomic — FRED', source: '+0.8pp · auto OEM index up', time: '12:00' },
              { title: 'Web traffic — GA4', source: '+0.4pp · model-line interest', time: 'live' },
            ]} />
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Forecast vs actual · trailing 8w" title="In-sample fit" padded={false}>
            {[
              { w: 'W14', f: 1180, a: 1212, e: -2.6 },
              { w: 'W15', f: 1205, a: 1188, e: 1.4 },
              { w: 'W16', f: 1210, a: 1234, e: -1.9 },
              { w: 'W17', f: 1220, a: 1218, e: 0.2 },
              { w: 'W18', f: 1235, a: 1294, e: -4.6 },
              { w: 'W19', f: 1242, a: 1258, e: -1.3 },
              { w: 'W20', f: 1248, a: 1232, e: 1.3 },
              { w: 'W21', f: 1252, a: 1241, e: 0.9 },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 70px 70px 70px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.w}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, height: '100%', width: `${(r.f / 1300) * 100}%`, background: 'var(--bone-dim)' }} />
                    <div style={{ position: 'absolute', left: 0, height: '100%', width: `${(r.a / 1300) * 100}%`, background: 'var(--signal)', opacity: 0.5 }} />
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.f}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.a}</span>
                <span className="mono" style={{ fontSize: 11, color: r.e > 0 ? 'var(--soft)' : 'var(--bad)', textAlign: 'right' }}>{r.e > 0 ? '+' : ''}{r.e}%</span>
              </div>
            ))}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 16, fontSize: 10.5, color: 'var(--muted)' }}>
              <span>Wk</span><span style={{ marginLeft: 'auto' }}>Forecast / Actual / Error</span>
            </div>
          </Card>

          <Card eyebrow="Adjustments" title="Manual overrides this cycle" padded={false}>
            {[
              { d: 'Apr 22', who: 'M. Okafor', what: 'Lifted W22 forecast +6%', why: 'Auto OEM order book confirmed' },
              { d: 'Apr 15', who: 'L. Park', what: 'Cut W19 forecast −3%', why: 'Holiday calendar correction' },
              { d: 'Apr 03', who: 'Advisor', what: 'Widened CI for W18-W22', why: 'Regime variance flag' },
            ].map((r, i, a) => (
              <div key={i} style={{ padding: '14px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.what}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.d}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.who} · {r.why}</div>
              </div>
            ))}
            <div style={{ padding: 12 }}><Btn kind="ghost" sm full icon={<Icon.Plus s={11} />}>Add override</Btn></div>
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// ===================================================
// 2. MultiHorizon
// ===================================================
function MultiHorizonPage() {
  const horizons = [
    { l: '2 weeks', mape: 4.1, cov: 88, use: 'Ops · production scheduling', data: genFanData(1, 28, 4) },
    { l: '8 weeks', mape: 6.4, cov: 83, use: 'Procurement · RFQ timing', data: genFanData(2, 28, 12) },
    { l: '26 weeks', mape: 11.8, cov: 78, use: 'Strategy · capacity planning', data: genFanData(3, 28, 26) },
    { l: '52 weeks', mape: 18.2, cov: 71, use: 'Finance · annual budgeting', data: genFanData(4, 28, 52) },
  ];

  return (
    <PrescientShell active="horizons" title="Multi-Horizon" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="Four horizons · synchronized"
          headline="Plan two weeks out and two years out from one model."
          sub="Each horizon weighted into a single coherent ensemble."
          meta={['1,284 SKUs', 'Ensemble v4.2.1', <span key="r"><RegimeBadge size="sm" /></span>]}
          action={<Btn kind="ghost" sm>Configure horizons</Btn>} />

        <KpiStrip items={[
          { label: '2-week MAPE', value: '4.1', suffix: '%', delta: '−0.2pp', deltaTone: 'good' },
          { label: '8-week MAPE', value: '6.4', suffix: '%', delta: '−0.4pp', deltaTone: 'good' },
          { label: '26-week MAPE', value: '11.8', suffix: '%', delta: '+0.6pp', deltaTone: 'bad' },
          { label: '52-week MAPE', value: '18.2', suffix: '%', delta: 'baseline', deltaTone: 'neutral' },
          { label: 'Coherence', value: '0.94', delta: 'cross-horizon agreement', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {horizons.map((h, i) => (
            <div key={i} style={{ background: 'var(--panel)', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <Eyebrow>{h.l}</Eyebrow>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>MAPE {h.mape}% · CI {h.cov}%</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 14 }}>{h.use}</div>
              <FanChart history={h.data.history} forecast={h.data.forecast} h={150} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="Cross-horizon agreement · SKU-3401" title="Same model, four horizons" padded={false}>
            <div style={{ padding: '20px 24px' }}>
              {[
                { l: '2w · production', val: 1248, lo: 1182, hi: 1314 },
                { l: '8w · procurement', val: 1280, lo: 1180, hi: 1380 },
                { l: '26w · capacity', val: 1340, lo: 1180, hi: 1500 },
                { l: '52w · budgeting', val: 1410, lo: 1140, hi: 1680 },
              ].map((r, i) => {
                const totalRange = 1700 - 1100;
                const lp = ((r.lo - 1100) / totalRange) * 100;
                const wp = ((r.hi - r.lo) / totalRange) * 100;
                const vp = ((r.val - 1100) / totalRange) * 100;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 200px', gap: 16, alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
                    <div style={{ height: 18, position: 'relative', background: 'var(--ink-deep)' }}>
                      <div style={{ position: 'absolute', left: `${lp}%`, width: `${wp}%`, height: '100%', background: 'var(--signal)', opacity: 0.18 }} />
                      <div style={{ position: 'absolute', left: `${vp}%`, width: 2, height: '100%', background: 'var(--signal)' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.lo}–{r.hi} · μ {r.val}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 18 }}>
                <span className="mono">1100</span><span className="mono">1400</span><span className="mono">1700 MT/wk</span>
              </div>
            </div>
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// ===================================================
// 3. ForecastAccuracy
// ===================================================
function ForecastAccuracyPage() {
  return (
    <PrescientShell active="accuracy" title="Forecast Accuracy" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="Accuracy · live tracking"
          headline="Out-of-sample MAPE 6.8%, in-window 88% of weeks."
          sub="Tracked against ERP-of-record."
          meta={['1,284 SKUs', '26-week rolling window', <span key="t" className="mono">last refresh 14:31</span>]} />

        <KpiStrip items={[
          { label: 'MAPE · weighted', value: '6.4', suffix: '%', delta: '−0.4pp', deltaTone: 'good', spark: [7.2, 7.0, 6.8, 6.6, 6.5, 6.4, 6.4], sparkColor: 'var(--good)' },
          { label: 'Bias · weighted', value: '+1.2', suffix: '%', delta: 'over-forecast', deltaTone: 'neutral' },
          { label: 'In-window weeks', value: '23', suffix: '/26', delta: '88%', deltaTone: 'good' },
          { label: 'WAPE', value: '5.8', suffix: '%', delta: '−0.2pp', deltaTone: 'good' },
          { label: 'sMAPE', value: '6.0', suffix: '%', delta: '−0.3pp', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Card eyebrow="MAPE history · 26 weeks" title="Tracking against baseline">
            <BarChart h={180} data={[
              { l: 'W1', v: 8.2 }, { l: 'W3', v: 7.8 }, { l: 'W5', v: 7.4 }, { l: 'W7', v: 7.6 },
              { l: 'W9', v: 7.0 }, { l: 'W11', v: 6.8 }, { l: 'W13', v: 6.4 }, { l: 'W15', v: 5.8 },
              { l: 'W17', v: 6.2 }, { l: 'W19', v: 5.6 }, { l: 'W21', v: 6.0 }, { l: 'W23', v: 6.4, c: 'var(--good)' }, { l: 'W25', v: 6.4, c: 'var(--good)' },
            ]} color="var(--soft)" baseline={8.0} />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--soft)' }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 6, background: 'var(--good)', verticalAlign: 'middle', marginRight: 6 }} /> Live</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 1, background: 'var(--muted)', borderTop: '1px dashed var(--muted)', verticalAlign: 'middle', marginRight: 6 }} /> Baseline 8.0%</span>
            </div>
          </Card>

          <Card eyebrow="By segment" title="Where accuracy comes from" padded={false}>
            {[
              { l: 'A-class SKUs · top 80% revenue', mape: 4.8, n: 142 },
              { l: 'B-class SKUs · next 15%', mape: 7.2, n: 384 },
              { l: 'C-class SKUs · bottom 5%', mape: 12.4, n: 758 },
              { l: 'New SKUs · &lt; 12w history', mape: 18.6, n: 22 },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span dangerouslySetInnerHTML={{ __html: r.l }} style={{ fontSize: 12, color: 'var(--bone)' }} />
                <span className="mono" style={{ fontSize: 11.5, color: r.mape < 8 ? 'var(--good)' : r.mape < 14 ? 'var(--signal)' : 'var(--bad)', textAlign: 'right' }}>{r.mape}%</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>n={r.n}</span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="High-error SKUs · this cycle" title="Top offenders" padded={false}>
            {[
              { sku: 'SKU-3401', name: 'Cold-rolled coil 1.2mm', mape: 14.2, bias: '−6%', tag: 'auto-grade' },
              { sku: 'SKU-1208', name: 'Argon · industrial 5N', mape: 12.8, bias: '+8%', tag: 'gas' },
              { sku: 'SKU-2204', name: 'Pt catalyst · ingot', mape: 11.4, bias: '−3%', tag: 'precious' },
              { sku: 'SKU-0884', name: 'PP resin · grade 11', mape: 10.6, bias: '+2%', tag: 'polymer' },
              { sku: 'SKU-4471', name: 'Tin solder · 60/40', mape: 9.8, bias: '+4%', tag: 'commodity' },
            ].map((r, i, a) => (
              <div key={r.sku} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 80px 80px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sku}</span>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.name}</span>
                <Pill tone="bone" mono>{r.tag}</Pill>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bad)', textAlign: 'right' }}>{r.mape}%</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--soft)', textAlign: 'right' }}>{r.bias}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// ===================================================
// 4. CommodityForecasting
// ===================================================
function CommodityForecastingPage() {
  return (
    <PrescientShell active="commodity" title="Commodity Forecasting" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="Commodities · 6 tracks"
          headline="Tin window open. Argon spot rising. Pt holding."
          sub="Hourly model, regime-aware, FX-adjusted."
          meta={['Bloomberg + LME + Reuters · 30s', '6 commodities tracked', <span key="r"><RegimeBadge size="sm" /></span>]} />

        {/* commodity grid */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { sym: 'HRC', name: 'Hot-rolled coil', spot: '$842', unit: '/MT', d: '−1.2%', tone: 'good', signal: 'Soft · imbalanced excess', fc: '−2.4% · 4w' },
            { sym: 'AL', name: 'Aluminum', spot: '$2,432', unit: '/MT', d: '+0.4%', tone: 'neutral', signal: 'Sideways', fc: '+0.8% · 4w' },
            { sym: 'SN', name: 'Tin', spot: '$28,140', unit: '/MT', d: '−3.1%', tone: 'good', signal: 'Counter-cyclical buy', fc: '+5.6% · 12w' },
            { sym: 'AR', name: 'Argon', spot: '$0.142', unit: '/L', d: '+4.1%', tone: 'bad', signal: 'Lock contract', fc: '+6.2% · 4w' },
            { sym: 'PP', name: 'Polypropylene', spot: '$1,184', unit: '/MT', d: '−0.6%', tone: 'neutral', signal: 'Hold', fc: '−0.4% · 4w' },
            { sym: 'PT', name: 'Platinum', spot: '$948', unit: '/oz', d: '+1.4%', tone: 'neutral', signal: 'Watch', fc: '+2.1% · 8w' },
          ].map((c, i) => (
            <div key={i} className="row-hover" style={{ background: 'var(--panel)', padding: '20px 22px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500 }}>{c.sym}</span>
                <span className="mono" style={{ fontSize: 11, color: c.tone === 'good' ? 'var(--good)' : c.tone === 'bad' ? 'var(--bad)' : 'var(--muted)' }}>{c.d}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 12 }}>{c.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                <span className="mono" style={{ fontSize: 22, color: 'var(--bone)', fontWeight: 300 }}>{c.spot}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.unit}</span>
              </div>
              <Spark data={Array.from({ length: 24 }, (_, k) => 100 + Math.sin(k * 0.4 + i) * 8 + (i % 2 ? -k * 0.3 : k * 0.2))} w={140} h={28} color={c.tone === 'good' ? 'var(--good)' : c.tone === 'bad' ? 'var(--bad)' : 'var(--soft)'} />
              <Hairline style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--soft)' }}>
                <span>{c.signal}</span>
                <span className="mono" style={{ color: 'var(--muted)' }}>{c.fc}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Card eyebrow="Tin · 26-week price · forecast" title="Counter-cyclical window">
            <FanChart {...genFanData(7, 32, 14)} h={220} />
          </Card>

          <Card eyebrow="Hedging recommendations" title="Active windows" padded={false}>
            {[
              { c: 'Tin (SN)', a: 'Forward-buy 12w', impact: '−$210K', conf: 0.80, tone: 'good' },
              { c: 'Argon (AR)', a: 'Lock spot · 9-day quote', impact: '−$340K', conf: 0.80, tone: 'good' },
              { c: 'HRC', a: 'Defer stock-up', impact: '−$1.04M', conf: 0.70, tone: 'good' },
              { c: 'Platinum (PT)', a: 'Hold position', impact: '—', conf: 0.60, tone: 'neutral' },
            ].map((r, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '90px 1fr 70px 60px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>{r.c}</span>
                <span style={{ fontSize: 12, color: 'var(--soft)' }}>{r.a}</span>
                <span className="mono" style={{ fontSize: 11.5, color: r.tone === 'good' ? 'var(--good)' : 'var(--muted)', textAlign: 'right' }}>{r.impact}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{r.conf.toFixed(2)}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// ===================================================
// 5. BacktestingDashboard
// ===================================================
function BacktestingDashboardPage() {
  return (
    <PrescientShell active="backtest" title="Backtesting" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="Replay window · Jan 2018 → Apr 2026"
          headline="Replay any horizon, against any past date."
          sub="Compare under-regime vs across-regime baselines."
          meta={['Ensemble v4.2.1 vs v3.7.0', '8 horizons available', <span key="t" className="mono">last run 12 min ago</span>]}
          action={<Btn kind="primary" sm icon={<Icon.Play s={11} />}>Run backtest</Btn>} />

        <Card eyebrow="Configuration" title="Replay parameters" padded={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)' }}>
            {[
              { l: 'Window', v: '2020-01 → 2026-04', s: '6.3 years' },
              { l: 'Horizon', v: '8 weeks', s: 'Procurement' },
              { l: 'Regime filter', v: 'Imbalanced Excess', s: 'FDR ≥ 1.80' },
              { l: 'Cohort', v: 'Top 200 SKUs', s: 'A-class · 80% revenue' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'var(--panel)', padding: '16px 20px' }}>
                <Eyebrow>{c.l}</Eyebrow>
                <div className="mono" style={{ fontSize: 14, color: 'var(--bone)', marginTop: 6 }}>{c.v}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{c.s}</div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Out-of-sample · MAPE" title="Ensemble v4.2.1 vs v3.7.0">
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <span className="mono" style={{ fontSize: 26, color: 'var(--good)', fontWeight: 300 }}>6.8%</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>v4.2.1</span>
                <span className="mono" style={{ fontSize: 16, color: 'var(--muted)', marginLeft: 24 }}>8.4%</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>v3.7.0 baseline</span>
                <Pill tone="good" mono style={{ marginLeft: 'auto' }}>−1.6pp</Pill>
              </div>
            </div>
            <BarChart h={140} data={[
              { l: 'A', v: 4.8, c: 'var(--good)' }, { l: 'B', v: 7.2, c: 'var(--good)' }, { l: 'C', v: 12.4, c: 'var(--signal)' },
              { l: 'A', v: 6.4, c: 'var(--soft)' }, { l: 'B', v: 9.8, c: 'var(--soft)' }, { l: 'C', v: 15.6, c: 'var(--soft)' },
            ]} />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--soft)' }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 6, background: 'var(--good)', verticalAlign: 'middle', marginRight: 6 }} /> v4.2.1</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 6, background: 'var(--soft)', verticalAlign: 'middle', marginRight: 6 }} /> v3.7.0</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>by ABC class</span>
            </div>
          </Card>

          <Card eyebrow="Coverage · 80% CI" title="Forecast intervals contain actual">
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <span className="mono" style={{ fontSize: 26, color: 'var(--good)', fontWeight: 300 }}>83%</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>v4.2.1 · target 80%</span>
                <Pill tone="good" mono style={{ marginLeft: 'auto' }}>+3pp</Pill>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              {[
                { l: 'Stable regime weeks', cov: 88, n: 162 },
                { l: 'Transition weeks', cov: 79, n: 28 },
                { l: 'Imbalanced regime weeks', cov: 81, n: 138 },
              ].map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 50px 50px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
                  <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, height: '100%', width: `${r.cov}%`, background: r.cov >= 80 ? 'var(--good)' : 'var(--signal)' }} />
                    <div style={{ position: 'absolute', left: '80%', top: -3, width: 1, height: 10, background: 'var(--muted)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11.5, color: r.cov >= 80 ? 'var(--good)' : 'var(--signal)', textAlign: 'right' }}>{r.cov}%</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'right' }}>n={r.n}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Run history" title="Last 8 backtests" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 90px 130px 130px 90px 90px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Run ID', 'When', 'Window', 'Cohort', 'MAPE', 'Coverage', 'Status', ''].map((h, i) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {[
              { id: 'BT-2814', t: '12 min ago', win: '2020 → 2026', co: 'Top 200', mape: 6.8, cov: 83, s: 'done' },
              { id: 'BT-2813', t: '2h ago', win: '2022 → 2026', co: 'All A-class', mape: 5.2, cov: 86, s: 'done' },
              { id: 'BT-2812', t: 'Yest', win: '2018 → 2026', co: 'All', mape: 8.1, cov: 79, s: 'done' },
              { id: 'BT-2811', t: 'Yest', win: '2020 → 2026', co: 'B-class', mape: 9.4, cov: 76, s: 'done' },
              { id: 'BT-2810', t: '2d ago', win: '2024 → 2026', co: 'New SKUs', mape: 18.6, cov: 64, s: 'done' },
            ].map((r, i, a) => (
              <div key={r.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px 90px 130px 130px 90px 90px 80px 24px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.id}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.t}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.win}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.co}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.mape}%</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.cov}%</span>
                <Pill tone="good" mono>{r.s}</Pill>
                <Icon.External s={11} />
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// ===================================================
// 6. ForecastEnsemble
// ===================================================
function ForecastEnsemblePage() {
  const models = [
    { n: 'ARIMA · seasonal', kind: 'Statistical', weight: 22, mape: 7.4, role: 'Trend & seasonality' },
    { n: 'Prophet', kind: 'Statistical', weight: 18, mape: 7.8, role: 'Holiday + change-points' },
    { n: 'GBT regression', kind: 'ML', weight: 28, mape: 6.2, role: 'Driver-based' },
    { n: 'Temporal CNN', kind: 'Deep', weight: 16, mape: 6.6, role: 'Long-context patterns' },
    { n: 'Regime overlay', kind: 'Macro', weight: 16, mape: 6.0, role: 'FDR conditioning' },
  ];

  return (
    <PrescientShell active="ensemble" title="Forecast Ensemble" breadcrumb={['Demand & Forecasting']}>
      <PageBody>
        <PageHero
          eyebrow="Ensemble v4.2.1 · 5 base models"
          headline="Five models, one forecast. Weights adapt by regime."
          sub="Live re-weighting on out-of-sample performance."
          meta={['Trained on 2018-01 → 2025-12', 'Re-trained weekly', <span key="t" className="mono">last train Apr 24 02:14</span>]} />

        <KpiStrip items={[
          { label: 'Ensemble MAPE', value: '6.4', suffix: '%', delta: '−0.4pp vs best single', deltaTone: 'good' },
          { label: 'Best single model', value: '6.0', suffix: '%', delta: 'Regime overlay', deltaTone: 'neutral' },
          { label: 'Models active', value: '5', delta: '+1 vs v3.7.0', deltaTone: 'neutral' },
          { label: 'Re-weight cadence', value: 'wkly' },
          { label: 'Train compute · last', value: '8.4', suffix: 'GPU·h', delta: '−12%', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="Constituent models" title="Weights & contribution" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 130px 200px 80px 1fr', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Model', 'Kind', 'Role', 'MAPE', 'Weight'].map((h, i) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {models.map((m, i, a) => (
              <div key={m.n} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 130px 200px 80px 1fr', gap: 12, padding: '14px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{m.n}</span>
                <Pill tone="bone" mono>{m.kind}</Pill>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{m.role}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{m.mape}%</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--line)' }}>
                    <div style={{ width: `${m.weight}%`, height: '100%', background: 'var(--signal)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', minWidth: 30, textAlign: 'right' }}>{m.weight}%</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Weight evolution" title="Last 26 weeks">
            <div style={{ position: 'relative', height: 200, padding: '10px 0' }}>
              <svg viewBox="0 0 400 180" preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block' }}>
                {[
                  { name: 'GBT', col: 'var(--signal)', pts: [22, 24, 26, 28, 30, 28, 28] },
                  { name: 'ARIMA', col: 'var(--good)', pts: [25, 24, 23, 22, 22, 22, 22] },
                  { name: 'Prophet', col: 'var(--soft)', pts: [20, 19, 18, 18, 17, 17, 18] },
                  { name: 'TCN', col: 'var(--bone-dim)', pts: [16, 16, 16, 16, 15, 16, 16] },
                  { name: 'Regime', col: 'var(--bad)', pts: [17, 17, 17, 16, 16, 17, 16] },
                ].map((s, k) => (
                  <path key={s.name} d={s.pts.map((v, i) => `${i ? 'L' : 'M'}${(i / 6) * 400},${180 - v * 5}`).join(' ')} fill="none" stroke={s.col} strokeWidth="1.5" />
                ))}
              </svg>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 10.5, color: 'var(--soft)' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 1.5, background: 'var(--signal)', verticalAlign: 'middle', marginRight: 4 }} /> GBT</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 1.5, background: 'var(--good)', verticalAlign: 'middle', marginRight: 4 }} /> ARIMA</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 1.5, background: 'var(--soft)', verticalAlign: 'middle', marginRight: 4 }} /> Prophet</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 1.5, background: 'var(--bone-dim)', verticalAlign: 'middle', marginRight: 4 }} /> TCN</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 1.5, background: 'var(--bad)', verticalAlign: 'middle', marginRight: 4 }} /> Regime</span>
            </div>
          </Card>

          <Card eyebrow="Diagnostics" title="Health & next steps" padded={false}>
            {[
              { l: 'No model dominance', d: 'No single model exceeds 30% weight', tone: 'good' },
              { l: 'Residuals · whitened', d: 'Ljung-Box p=0.18 · acceptable', tone: 'good' },
              { l: 'Drift detector', d: 'No drift since Mar 14', tone: 'good' },
              { l: 'New model candidate', d: 'XGBoost-v2 in shadow eval · MAPE 6.1%', tone: 'signal' },
              { l: 'Next train', d: 'Sun 02:00 PT · weekly cadence', tone: 'neutral' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'flex-start' }}>
                <span style={{ paddingTop: 5 }}><StatusDot tone={it.tone} /></span>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--bone)' }}>{it.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{it.d}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

window.ForecastingPage = ForecastingPage;
window.MultiHorizonPage = MultiHorizonPage;
window.ForecastAccuracyPage = ForecastAccuracyPage;
window.CommodityForecastingPage = CommodityForecastingPage;
window.BacktestingDashboardPage = BacktestingDashboardPage;
window.ForecastEnsemblePage = ForecastEnsemblePage;
window.FanChart = FanChart;
window.genFanData = genFanData;


Object.assign(window, { ForecastingPage, MultiHorizonPage, ForecastAccuracyPage, CommodityForecastingPage, BacktestingDashboardPage, ForecastEnsemblePage });
