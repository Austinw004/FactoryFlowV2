/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody,
   BarChart, MiniWorldDots */

// ============================================================
// BATCH 5a — Suppliers
//   SupplyChainHub · MultiTierSupplierMapping · SupplyChain
//   SupplierRisk · SupplyChainNetwork · SupplyChainTraceability
// ============================================================

// =====================================================
// 1. SupplyChainHub — directory
// =====================================================
function SupplyChainHubPage() {
  return (
    <PrescientShell active="schub" title="Supply Chain" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Supply chain · Apr 26"
          headline="47 suppliers, 12 countries, 4 tiers visible."
          sub="Six suppliers moved up risk this week."
          meta={[<span key="r"><RegimeBadge size="sm" /></span>, '2 corridors elevated', <span key="t" className="mono">last sync 14:31</span>]} />

        <KpiStrip items={[
          { label: 'Suppliers · tier 1+2', value: '47', delta: '+1', deltaTone: 'neutral' },
          { label: 'Countries', value: '12' },
          { label: 'At-risk this week', value: '6/47', delta: '+2', deltaTone: 'bad' },
          { label: 'Single-source · breach', value: '2', delta: 'Han · Linde', deltaTone: 'bad' },
          { label: 'On-time · weighted', value: '88.1', suffix: '%', delta: '−1.2pp', deltaTone: 'bad' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { eyebrow: 'Multi-tier', title: 'Mapping · 4 tiers', body: 'See your CRC supplier\'s supplier\'s mill. 142 nodes mapped.', kpi: '142', kpiLabel: 'nodes' },
            { eyebrow: 'Supply chain', title: 'All suppliers', body: 'Active directory across 47 suppliers, scoring, contracts, lead times.', kpi: '47', kpiLabel: 'suppliers' },
            { eyebrow: 'Supplier risk', title: 'Risk dashboard', body: 'Concentration, financial stress, geopolitical, performance.', kpi: '6', kpiLabel: 'elevated', tone: 'bad' },
            { eyebrow: 'Network', title: 'Geo network', body: 'Visualize lanes, ports, corridors. 14 corridors monitored.', kpi: '14', kpiLabel: 'corridors' },
            { eyebrow: 'Traceability', title: 'Trace & track', body: 'Lot-level traceability across tiers. CSRD, regulatory.', kpi: '94%', kpiLabel: 'lot coverage', tone: 'good' },
            { eyebrow: 'Logistics', title: 'In-transit', body: '38 shipments in transit · 3 delays · 1 customs hold.', kpi: '38', kpiLabel: 'in flight' },
          ].map((t, i) => (
            <HubTile5 key={i} {...t} />
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Top exposures" title="Risk-weighted" padded={false}>
            {[
              { co: 'Han Steel', risk: 0.78, exp: '$3.4M', tone: 'bad', why: 'Concentration breach · CN-EU watch' },
              { co: 'Yunnan Tin', risk: 0.71, exp: '$2.1M', tone: 'bad', why: 'State-stake review' },
              { co: 'Cabot Microelectronics', risk: 0.52, exp: '$1.6M', tone: 'signal', why: 'M&A discussion · DuPont' },
              { co: 'Linde Gas', risk: 0.42, exp: '$0.9M', tone: 'signal', why: 'Spin-off rumor · early stage' },
              { co: 'BASF Catalysts', risk: 0.32, exp: '$0.6M', tone: 'good', why: 'Stable · contract through 2027' },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 1fr 70px 60px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.co}</span>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{r.why}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.exp}</span>
                <span className="mono" style={{ fontSize: 11, color: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'signal' ? 'var(--signal)' : 'var(--good)', textAlign: 'right' }}>{r.risk.toFixed(2)}</span>
              </div>
            ))}
          </Card>
          <Card eyebrow="Lead time · this week" title="By tier" padded={false}>
            {[
              { l: 'Tier 1 · direct', avg: 18, var: '+3d', tone: 'bad' },
              { l: 'Tier 2 · sub', avg: 26, var: '+1d', tone: 'signal' },
              { l: 'Tier 3 · raw', avg: 42, var: 'flat', tone: 'good' },
              { l: 'Tier 4 · origin', avg: 58, var: '−2d', tone: 'good' },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.avg}d avg</span>
                <span className="mono" style={{ fontSize: 11, color: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'good' ? 'var(--good)' : 'var(--signal)', textAlign: 'right' }}>{r.var}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}
function HubTile5({ eyebrow, title, body, kpi, kpiLabel, tone = 'neutral' }) {
  const accent = { signal: 'var(--signal)', good: 'var(--good)', bad: 'var(--bad)', neutral: 'var(--line)' }[tone];
  return (
    <div className="row-hover" style={{ background: 'var(--panel)', padding: 20, borderLeft: `2px solid ${accent}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: 152 }}>
      <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>
      <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, marginBottom: 8 }}>{title}</div>
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
// 2. MultiTierSupplierMapping
// =====================================================
function MultiTierSupplierMappingPage() {
  // 4-tier dependency view rendered as columns of nodes with hand-drawn-ish links
  const tiers = [
    { name: 'Tier 1', count: 6, items: [{ n: 'Han Steel', tone: 'bad' }, { n: 'Voestalpine', tone: 'good' }, { n: 'Linde Gas', tone: 'signal' }, { n: 'BASF', tone: 'good' }, { n: 'Cabot Micro', tone: 'signal' }, { n: 'Mitsui', tone: 'good' }] },
    { name: 'Tier 2', count: 14, items: [{ n: 'Yunnan Tin', tone: 'bad' }, { n: 'Norsk Hydro', tone: 'good' }, { n: 'POSCO', tone: 'good' }, { n: 'Chiyoda', tone: 'good' }, { n: 'Tata Chem', tone: 'signal' }, { n: 'Albermarle', tone: 'good' }] },
    { name: 'Tier 3', count: 38, items: [{ n: 'Tianqi Lithium', tone: 'signal' }, { n: 'Vale', tone: 'good' }, { n: 'Glencore', tone: 'good' }, { n: 'Codelco', tone: 'good' }, { n: 'BHP', tone: 'good' }, { n: '+33 more', tone: 'neutral' }] },
    { name: 'Tier 4', count: 84, items: [{ n: 'Origin mines · 12', tone: 'neutral' }, { n: 'Origin wells · 6', tone: 'good' }, { n: 'Origin refiners · 18', tone: 'good' }, { n: '+48 more', tone: 'neutral' }] },
  ];

  return (
    <PrescientShell active="mtm" title="Multi-tier Mapping" breadcrumb={['Supply Chain']}>
      <PageBody>
        <PageHero
          eyebrow="Multi-tier mapping · 142 nodes"
          headline="See your supplier's supplier."
          sub="From assembled steel coil back to the iron ore mine."
          meta={['4 tiers visible', '38 sub-tier nodes added this quarter', <span key="t" className="mono">conf 0.74</span>]}
          action={<Btn kind="ghost" sm icon={<Icon.Plus s={11} />}>Trace material</Btn>} />

        <KpiStrip items={[
          { label: 'Total nodes', value: '142', delta: '+12', deltaTone: 'neutral' },
          { label: 'Tier 1 · direct', value: '6' },
          { label: 'Tier 2 · sub', value: '14' },
          { label: 'Tier 3 · raw', value: '38' },
          { label: 'Tier 4 · origin', value: '84', delta: 'mostly opaque', deltaTone: 'neutral' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="CRC chain · 4 tiers · selected" title="From mill back to mine" padded={false}>
            <div style={{ padding: '24px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
              {tiers.map((t, ci) => (
                <div key={t.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Eyebrow>{t.name}</Eyebrow>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{t.count} nodes</span>
                  </div>
                  {t.items.map((n, i) => (
                    <div key={i} className="row-hover" style={{
                      padding: '11px 14px', marginBottom: 8, marginRight: ci < 3 ? 24 : 0,
                      background: 'var(--panel-2)',
                      borderLeft: `2px solid ${{ bad: 'var(--bad)', signal: 'var(--signal)', good: 'var(--good)', neutral: 'var(--line)' }[n.tone]}`,
                      cursor: 'pointer',
                      position: 'relative',
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--bone)' }}>{n.n}</div>
                      {ci < 3 && <span style={{ position: 'absolute', right: -22, top: '50%', transform: 'translateY(-50%)', width: 18, height: 1, background: 'var(--line)' }}>
                        <span style={{ position: 'absolute', right: -3, top: -2, width: 5, height: 5, background: 'var(--line)', borderRadius: '50%' }} />
                      </span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 18, fontSize: 11, color: 'var(--soft)' }}>
              <span><StatusDot tone="bad" /> elevated</span>
              <span><StatusDot tone="signal" /> watch</span>
              <span><StatusDot tone="good" /> stable</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)' }} className="mono">conf 0.74 · last refresh 14:31</span>
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Hidden dependencies" title="Where one node feeds many" padded={false}>
            {[
              { n: 'Yunnan Tin · concentrate', feeds: '4 of your tier-1 suppliers', risk: '$2.1M', tone: 'bad' },
              { n: 'Vale · iron ore', feeds: '3 of your tier-1 suppliers', risk: '$5.6M', tone: 'signal' },
              { n: 'Glencore · cobalt', feeds: '2 tier-2 + 1 tier-1', risk: '$1.4M', tone: 'signal' },
              { n: 'Norsk Hydro · alumina', feeds: '1 tier-1 · multiple grades', risk: '$0.8M', tone: 'good' },
            ].map((r, i, a) => (
              <div key={i} style={{ padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.n}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'signal' ? 'var(--signal)' : 'var(--good)' }}>{r.risk}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.feeds}</div>
              </div>
            ))}
          </Card>
          <Card eyebrow="Coverage · this quarter" title="Tier visibility" padded={false}>
            {[
              { t: 'Tier 1', cov: 100 }, { t: 'Tier 2', cov: 86 }, { t: 'Tier 3', cov: 64 }, { t: 'Tier 4', cov: 38 },
            ].map((r, i, a) => (
              <div key={r.t} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 50px', gap: 12, padding: '14px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.t}</span>
                <div style={{ height: 4, background: 'var(--line)' }}>
                  <div style={{ width: `${r.cov}%`, height: '100%', background: r.cov >= 80 ? 'var(--good)' : r.cov >= 50 ? 'var(--signal)' : 'var(--bad)' }} />
                </div>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.cov}%</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 3. SupplyChain — supplier directory
// =====================================================
function SupplyChainPage() {
  const sups = [
    { co: 'Han Steel', cat: 'CRC', country: 'CN', tier: 1, score: 62, lt: 34, otd: 84.2, vol: '$3.4M', tone: 'bad' },
    { co: 'Voestalpine', cat: 'CRC', country: 'AT', tier: 1, score: 88, lt: 18, otd: 96.4, vol: '$1.8M', tone: 'good' },
    { co: 'Linde Gas', cat: 'Argon', country: 'DE', tier: 1, score: 84, lt: 9, otd: 94.8, vol: '$1.6M', tone: 'good' },
    { co: 'BASF Catalysts', cat: 'Pt catalyst', country: 'DE', tier: 1, score: 92, lt: 21, otd: 98.2, vol: '$1.2M', tone: 'good' },
    { co: 'Cabot Microelectronics', cat: 'Slurry', country: 'US', tier: 1, score: 76, lt: 14, otd: 91.4, vol: '$0.9M', tone: 'signal' },
    { co: 'Mitsui Plastics', cat: 'PP resin', country: 'JP', tier: 1, score: 86, lt: 28, otd: 95.0, vol: '$0.8M', tone: 'good' },
    { co: 'Yunnan Tin', cat: 'Tin solder', country: 'CN', tier: 2, score: 58, lt: 42, otd: 82.0, vol: '$0.6M', tone: 'bad' },
    { co: 'Norsk Hydro', cat: 'Aluminum', country: 'NO', tier: 2, score: 89, lt: 24, otd: 96.8, vol: '$0.5M', tone: 'good' },
    { co: 'POSCO', cat: 'CRC', country: 'KR', tier: 2, score: 84, lt: 22, otd: 95.2, vol: '$0.4M', tone: 'good' },
    { co: 'Tata Chem', cat: 'Specialty', country: 'IN', tier: 2, score: 72, lt: 32, otd: 88.6, vol: '$0.3M', tone: 'signal' },
  ];

  return (
    <PrescientShell active="supplychain" title="Supply Chain" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Supplier directory · 47 active"
          headline="Every supplier scored on the same axis."
          sub="Performance, financial, geopolitical, concentration."
          meta={['12 countries', '4 tiers', <span key="t" className="mono">last refresh 14:31</span>]}
          action={<Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export</Btn>} />

        <Toolbar searchPlaceholder="Search supplier, category, country…">
          <FilterChip label="Tier" value="1+2" active />
          <FilterChip label="Country" value="All" />
          <FilterChip label="Score" value="All" />
          <FilterChip label="Status" value="All" />
        </Toolbar>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 110px 60px 60px 1fr 80px 70px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
            {['Supplier', 'Category', 'CC', 'Tier', 'Score', 'Lead time', 'OTD', 'Volume', ''].map((h) => (
              <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
            ))}
          </div>
          {sups.map((r, i, a) => (
            <div key={r.co} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 110px 60px 60px 1fr 80px 70px 80px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.co}</span>
              <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.cat}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.country}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>T{r.tier}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                  <div style={{ width: `${r.score}%`, height: '100%', background: r.tone === 'good' ? 'var(--good)' : r.tone === 'signal' ? 'var(--signal)' : 'var(--bad)' }} />
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--soft)' }}>{r.score}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.lt}d</span>
              <span className="mono" style={{ fontSize: 11, color: r.otd >= 92 ? 'var(--good)' : 'var(--signal)', textAlign: 'right' }}>{r.otd.toFixed(1)}%</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.vol}</span>
              <Icon.ArrowRight s={11} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Score distribution" title="All 47 suppliers" padded={false}>
            <div style={{ padding: '20px 18px' }}>
              <BarChart h={140} data={[
                { l: '< 50', v: 2, c: 'var(--bad)' }, { l: '50-60', v: 4, c: 'var(--bad)' },
                { l: '60-70', v: 8, c: 'var(--signal)' }, { l: '70-80', v: 14, c: 'var(--soft)' },
                { l: '80-90', v: 16, c: 'var(--good)' }, { l: '90+', v: 3, c: 'var(--good)' },
              ]} />
            </div>
          </Card>
          <Card eyebrow="Concentration" title="Volume share, top 6" padded={false}>
            {[
              { co: 'Han Steel', pct: 28, tone: 'bad' },
              { co: 'Voestalpine', pct: 16, tone: 'good' },
              { co: 'Linde Gas', pct: 12, tone: 'good' },
              { co: 'BASF', pct: 10, tone: 'good' },
              { co: 'Cabot Micro', pct: 7, tone: 'signal' },
              { co: 'Mitsui', pct: 6, tone: 'good' },
            ].map((r, i, a) => (
              <div key={r.co} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 50px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.co}</span>
                <div style={{ height: 2, background: 'var(--line)' }}>
                  <div style={{ width: `${r.pct * 3}%`, height: '100%', background: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'signal' ? 'var(--signal)' : 'var(--good)' }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.pct}%</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 4. SupplierRisk
// =====================================================
function SupplierRiskPage() {
  return (
    <PrescientShell active="risk" title="Supplier Risk" breadcrumb={['Supply Chain']}>
      <PageBody>
        <PageHero
          eyebrow="Risk · live"
          headline="Six suppliers above tolerance."
          sub="Three financial stress, two geopolitical, one performance."
          meta={['Updated continuously', '$8.2M risk-weighted exposure', <span key="r"><RegimeBadge size="sm" /></span>]} />

        <KpiStrip items={[
          { label: 'Suppliers tracked', value: '47' },
          { label: 'Above tolerance', value: '6', delta: '+2', deltaTone: 'bad' },
          { label: 'Risk-weighted exposure', value: '$8.2M', delta: '+$1.4M', deltaTone: 'bad' },
          { label: 'Concentration breach', value: '2', delta: 'Han · Linde', deltaTone: 'bad' },
          { label: 'Avg risk score', value: '0.42', delta: '+0.04', deltaTone: 'bad' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Risk axes" title="Score breakdown · top 5 risk" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(4, 1fr)', gap: 0, padding: '12px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Supplier', 'Concentration', 'Financial', 'Geopolitical', 'Performance'].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {[
              { co: 'Han Steel', vals: [0.92, 0.68, 0.78, 0.42] },
              { co: 'Yunnan Tin', vals: [0.62, 0.74, 0.86, 0.32] },
              { co: 'Cabot Micro', vals: [0.42, 0.32, 0.28, 0.62] },
              { co: 'Linde Gas', vals: [0.74, 0.34, 0.22, 0.18] },
              { co: 'Tata Chem', vals: [0.18, 0.38, 0.42, 0.46] },
            ].map((r, i, a) => (
              <div key={r.co} style={{ display: 'grid', gridTemplateColumns: '180px repeat(4, 1fr)', gap: 0, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.co}</span>
                {r.vals.map((v, k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                      <div style={{ width: `${v * 100}%`, height: '100%', background: v >= 0.7 ? 'var(--bad)' : v >= 0.5 ? 'var(--signal)' : 'var(--good)' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--soft)' }}>{v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </Card>
          <Card eyebrow="Recent triggers" title="Last 7 days" padded={false}>
            {[
              { t: 'Today', co: 'Han Steel', e: 'Lead time 21→34d', tone: 'bad' },
              { t: 'Today', co: 'Yunnan Tin', e: 'State-stake review filed', tone: 'bad' },
              { t: 'Yest', co: 'Cabot Micro', e: 'M&A · DuPont · advanced', tone: 'signal' },
              { t: '2d', co: 'Linde Gas', e: 'Spin-off rumor · WSJ leak', tone: 'signal' },
              { t: '4d', co: 'Tata Chem', e: 'OTD missed 2 consecutive', tone: 'signal' },
              { t: '6d', co: 'Han Steel', e: 'Q1 filing · revenue −12% YoY', tone: 'bad' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 12px 130px 1fr', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <StatusDot tone={it.tone} />
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.co}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{it.e}</span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Mitigations · drafted" title="Action menu" padded={false}>
            {[
              { co: 'Han Steel', a: 'Diversify 30% to Voestalpine fallback contract', impact: '−$1.10M exposure', conf: 0.80 },
              { co: 'Yunnan Tin', a: 'Activate Norsk + Glencore secondary', impact: '−$0.6M exposure', conf: 0.70 },
              { co: 'Cabot Micro', a: 'Run RFQ-2814 to add 2nd source', impact: '−$0.4M exposure', conf: 0.70 },
              { co: 'Linde Gas', a: 'Lock 9-day quote ahead of restructure', impact: '−$340K cost lock', conf: 0.80 },
            ].map((it, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 60px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.co}</span>
                <span style={{ fontSize: 12, color: 'var(--soft)' }}>{it.a}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--good)', textAlign: 'right' }}>{it.impact}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{it.conf.toFixed(2)}</span>
                <Btn kind="ghost" sm>Apply</Btn>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 5. SupplyChainNetwork
// =====================================================
function SupplyChainNetworkPage() {
  return (
    <PrescientShell active="network" title="Network" breadcrumb={['Supply Chain']}>
      <PageBody>
        <PageHero
          eyebrow="Network view · live"
          headline="38 lanes, 14 corridors, 6 ports."
          sub="One customs hold, three weather delays."
          meta={['12 countries', '$48.2M in transit', <span key="t" className="mono">last sync 14:31</span>]} />

        <KpiStrip items={[
          { label: 'Active lanes', value: '38' },
          { label: 'Corridors', value: '14' },
          { label: 'Ports', value: '6' },
          { label: 'In-transit', value: '$48.2M', delta: '+$2.1M', deltaTone: 'neutral' },
          { label: 'Delays · 30d', value: '4', delta: '+2', deltaTone: 'bad' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Card eyebrow="Geo network" title="Live shipments + corridors" padded={false}>
            <MiniWorldDots h={360} markers={[
              { x: 22, y: 36, tone: 'good', size: 14, label: 'US-Plant' },
              { x: 78, y: 38, tone: 'bad', size: 14, label: 'Han Steel' },
              { x: 50, y: 32, tone: 'good', size: 12, label: 'Voestalpine' },
              { x: 82, y: 44, tone: 'good', size: 10, label: 'Mitsui' },
              { x: 80, y: 60, tone: 'good', size: 10, label: 'POSCO' },
              { x: 64, y: 60, tone: 'signal', size: 10, label: 'Tata' },
              { x: 80, y: 42, tone: 'bad', size: 8, label: 'Yunnan' },
              { x: 48, y: 40, tone: 'good', size: 8, label: 'Linde' },
              { x: 26, y: 40, tone: 'good', size: 8, label: 'Cabot' },
            ]} />
          </Card>

          <Card eyebrow="In-transit · details" title="38 shipments" padded={false}>
            {[
              { id: 'SH-3401', co: 'Han Steel', mode: 'Ocean', eta: 'May 14', delay: '+4d', tone: 'bad' },
              { id: 'SH-3400', co: 'Voestalpine', mode: 'Air', eta: 'Apr 30', delay: 'on time', tone: 'good' },
              { id: 'SH-3399', co: 'Linde Gas', mode: 'Truck', eta: 'Apr 28', delay: 'on time', tone: 'good' },
              { id: 'SH-3398', co: 'BASF', mode: 'Air', eta: 'May 02', delay: 'on time', tone: 'good' },
              { id: 'SH-3397', co: 'Cabot Micro', mode: 'Truck', eta: 'Apr 27', delay: 'customs', tone: 'signal' },
              { id: 'SH-3396', co: 'Mitsui', mode: 'Ocean', eta: 'May 18', delay: 'on time', tone: 'good' },
            ].map((r, i, a) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 80px 80px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.id}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.co}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.mode}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.eta}</span>
                <Pill tone={r.tone} mono>{r.delay}</Pill>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 6. SupplyChainTraceability
// =====================================================
function SupplyChainTraceabilityPage() {
  // vertical timeline of a traced lot
  const stops = [
    { d: 'Apr 12 · 09:14', loc: 'Henan, CN · Han Steel mill', e: 'Heat #482-118 · cast', tone: 'good' },
    { d: 'Apr 14 · 16:22', loc: 'Tianjin, CN · port', e: 'Loaded · M/V Pacific Crest', tone: 'good' },
    { d: 'Apr 18 · 03:48', loc: 'Pacific transit', e: 'AIS confirmed · on schedule', tone: 'good' },
    { d: 'Apr 26 · 11:08', loc: 'Long Beach, US · port', e: 'Customs hold · 4 hours', tone: 'signal' },
    { d: 'Apr 26 · 15:30', loc: 'Long Beach · cleared', e: 'Released to inland carrier', tone: 'good' },
    { d: 'Apr 28 · est', loc: 'Plant 02, Pittsburgh', e: 'ETA · planned arrival', tone: 'neutral' },
  ];
  return (
    <PrescientShell active="trace" title="Traceability" breadcrumb={['Supply Chain']}>
      <PageBody>
        <PageHero
          eyebrow="Trace · lot HEAT-482-118"
          headline={<>Heat 482-118 · 1.2mm CRC · 360 MT · <span style={{ color: 'var(--signal)' }}>en route</span></>}
          sub="Selected from PO-9921 · Han Steel"
          meta={['6 stops · 16-day window', 'Lot 94% verified', <span key="t" className="mono">conf 0.86</span>]}
          action={<div style={{ display: 'flex', gap: 8 }}><Btn kind="ghost" sm>CSRD export</Btn><Btn kind="ghost" sm>Customer share</Btn></div>} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <Card eyebrow="Chain of custody" title="6 confirmed stops" padded={false}>
            <div style={{ padding: '24px 24px' }}>
              {stops.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 16, position: 'relative', paddingBottom: i < stops.length - 1 ? 22 : 0 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: { good: 'var(--good)', signal: 'var(--signal)', bad: 'var(--bad)', neutral: 'var(--soft)' }[s.tone], marginTop: 4, position: 'relative', zIndex: 1 }} />
                    {i < stops.length - 1 && <div style={{ position: 'absolute', left: 4, top: 16, bottom: -22, width: 1, background: 'var(--line)' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: 'var(--bone)', marginBottom: 2 }}>{s.e}</div>
                    <div style={{ fontSize: 11, color: 'var(--soft)' }}>{s.loc}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card eyebrow="Lot details" title="HEAT-482-118" padded={false}>
              {[
                { k: 'Material', v: 'CRC 1.2mm auto' }, { k: 'Quantity', v: '360 MT' },
                { k: 'Heat number', v: 'HEAT-482-118' }, { k: 'Cast date', v: 'Apr 12 09:14' },
                { k: 'Source mill', v: 'Han Steel · Henan #4' }, { k: 'PO reference', v: 'PO-9921' },
                { k: 'Buyer', v: 'Ridgeview · Plant 02' }, { k: 'Customer attribution', v: '4 finished goods SKUs' },
              ].map((r, i, a) => (
                <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '10px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span className="eyebrow" style={{ fontSize: 9 }}>{r.k}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{r.v}</span>
                </div>
              ))}
            </Card>
            <Card eyebrow="Compliance" title="Auto-evaluated" padded={false}>
              {[
                { l: 'CSRD scope 3', s: 'In compliance', tone: 'good' },
                { l: 'Section 232 tariff', s: 'Flagged · review', tone: 'signal' },
                { l: 'Conflict-mineral declaration', s: 'Verified', tone: 'good' },
                { l: 'Country-of-origin', s: 'CN · documented', tone: 'good' },
              ].map((it, i, a) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 100px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                  <StatusDot tone={it.tone} />
                  <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.l}</span>
                  <Pill tone={it.tone} mono>{it.s}</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

window.SupplyChainHubPage = SupplyChainHubPage;
window.MultiTierSupplierMappingPage = MultiTierSupplierMappingPage;
window.SupplyChainPage = SupplyChainPage;
window.SupplierRiskPage = SupplierRiskPage;
window.SupplyChainNetworkPage = SupplyChainNetworkPage;
window.SupplyChainTraceabilityPage = SupplyChainTraceabilityPage;


Object.assign(window, { SupplyChainHubPage, MultiTierSupplierMappingPage, SupplyChainPage, SupplierRiskPage, SupplyChainNetworkPage, SupplyChainTraceabilityPage });
