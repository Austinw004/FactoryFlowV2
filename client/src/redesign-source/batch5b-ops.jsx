/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody,
   BarChart, MiniWorldDots */

// ============================================================
// BATCH 5b — Operations
//   LogisticsManagement · TradeTariffs · GlobalEvents
//   EventCalendar · ProcessAutomation · OperationsHub
// ============================================================

// =====================================================
// 1. OperationsHub
// =====================================================
function OperationsHubPage() {
  return (
    <PrescientShell active="opshub" title="Operations" breadcrumb={[]}>
      <PageBody>
        <PageHero
          eyebrow="Operations · Apr 26"
          headline="38 in-transit, 9 RFQs, 6 alerts."
          sub="Three lanes degrading. Two events this week with material exposure."
          meta={[<span key="r"><RegimeBadge size="sm" /></span>, <span key="t" className="mono">last sync 14:31</span>]} />

        <KpiStrip items={[
          { label: 'In-transit', value: '38', delta: '$48.2M', deltaTone: 'neutral' },
          { label: 'Active RFQs', value: '9' },
          { label: 'Open alerts', value: '6', delta: '+2', deltaTone: 'bad' },
          { label: 'OTIF · 30d', value: '88', suffix: '%', delta: '−1.2pp', deltaTone: 'bad' },
          { label: 'Cost · vs plan', value: '−2.1', suffix: '%', delta: 'underrun', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { eyebrow: 'Logistics', title: 'In-transit', body: '38 shipments tracked across 14 corridors.', kpi: '38', kpiLabel: 'shipments' },
            { eyebrow: 'Trade', title: 'Tariffs & duties', body: 'Section 232 watch · two pending decisions.', kpi: '$840K', kpiLabel: 'duty exposure', tone: 'signal' },
            { eyebrow: 'Events', title: 'Global event monitor', body: '24/7 watchlist across geo, weather, financial.', kpi: '47', kpiLabel: 'live signals' },
            { eyebrow: 'Calendar', title: 'Event calendar', body: 'Next 30 days · 18 named events with material risk.', kpi: '18', kpiLabel: 'next 30d' },
            { eyebrow: 'Automation', title: 'Process flows', body: '12 active automations · saving 84 hrs/wk.', kpi: '12', kpiLabel: 'flows', tone: 'good' },
            { eyebrow: 'Disruption', title: 'Disruption mitigation', body: 'Open mitigations · 3 in flight · $1.6M saved YTD.', kpi: '3', kpiLabel: 'in flight' },
          ].map((t, i) => <HubTile key={i} {...t} />)}
        </div>
      </PageBody>
    </PrescientShell>
  );
}
function HubTile({ eyebrow, title, body, kpi, kpiLabel, tone = 'neutral' }) {
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
// 2. LogisticsManagement
// =====================================================
function LogisticsManagementPage() {
  const ships = [
    { id: 'SH-3401', co: 'Han Steel', mat: 'CRC · 360 MT', mode: 'Ocean', from: 'Tianjin', to: 'Long Beach', eta: 'May 14', delay: '+4d', tone: 'bad', cost: 18400 },
    { id: 'SH-3400', co: 'Voestalpine', mat: 'CRC · 80 MT', mode: 'Air', from: 'Vienna', to: 'Pittsburgh', eta: 'Apr 30', delay: 'on time', tone: 'good', cost: 32100 },
    { id: 'SH-3399', co: 'Linde Gas', mat: 'Argon · 8,400 L', mode: 'Truck', from: 'Houston', to: 'Plant 02', eta: 'Apr 28', delay: 'on time', tone: 'good', cost: 4200 },
    { id: 'SH-3398', co: 'BASF', mat: 'Pt catalyst · 28 oz', mode: 'Air', from: 'Frankfurt', to: 'Detroit', eta: 'May 02', delay: 'on time', tone: 'good', cost: 8400 },
    { id: 'SH-3397', co: 'Cabot Micro', mat: 'Slurry · 12.4K kg', mode: 'Truck', from: 'Aurora', to: 'Plant 01', eta: 'Apr 27', delay: 'customs', tone: 'signal', cost: 3100 },
    { id: 'SH-3396', co: 'Mitsui', mat: 'PP resin · 8.2K kg', mode: 'Ocean', from: 'Yokohama', to: 'Long Beach', eta: 'May 18', delay: 'on time', tone: 'good', cost: 5800 },
  ];
  return (
    <PrescientShell active="logistics" title="Logistics" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Logistics · live"
          headline="38 shipments in flight, $48.2M in transit."
          sub="One customs hold cleared, three weather delays."
          meta={['14 corridors', '6 ports', <span key="t" className="mono">last sync 14:31</span>]} />

        <KpiStrip items={[
          { label: 'In-transit value', value: '$48.2M' },
          { label: 'On time', value: '92', suffix: '%', delta: '−1pp', deltaTone: 'bad' },
          { label: 'Avg transit', value: '12.4d' },
          { label: 'Spend · this week', value: '$842K' },
          { label: 'Lane spend variance', value: '+3.2', suffix: '%', delta: 'fuel +2.1%', deltaTone: 'bad' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Card eyebrow="In-transit" padded={false} action={
            <Toolbar search={false}>
              <FilterChip label="Mode" value="All" active />
              <FilterChip label="Status" value="All" />
            </Toolbar>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(140px, 1fr) minmax(150px, 1fr) 60px 110px 80px 80px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Ship id', 'Origin', 'Material', 'Mode', 'Lane', 'ETA', 'Status'].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {ships.map((r, i, a) => (
              <div key={r.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '90px minmax(140px, 1fr) minmax(150px, 1fr) 60px 110px 80px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.id}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.co}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.mat}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.mode}</span>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{r.from} → {r.to}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.eta}</span>
                <Pill tone={r.tone} mono>{r.delay}</Pill>
              </div>
            ))}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card eyebrow="By mode" title="Active mix" padded={false}>
              {[
                { l: 'Ocean', n: 18, val: '$28.4M' }, { l: 'Truck', n: 12, val: '$11.2M' },
                { l: 'Air', n: 5, val: '$6.8M' }, { l: 'Rail', n: 3, val: '$1.8M' },
              ].map((r, i, a) => (
                <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 50px 80px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
                  <div style={{ height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${(r.n / 20) * 100}%`, height: '100%', background: 'var(--soft)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.n}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{r.val}</span>
                </div>
              ))}
            </Card>

            <Card eyebrow="Delays · 30d" title="Why" padded={false}>
              {[
                { l: 'Weather', n: 6, tone: 'signal' }, { l: 'Customs', n: 4, tone: 'signal' },
                { l: 'Carrier capacity', n: 3, tone: 'bad' }, { l: 'Port congestion', n: 2, tone: 'bad' },
                { l: 'Documentation', n: 1, tone: 'neutral' },
              ].map((r, i, a) => (
                <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 50px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                  <StatusDot tone={r.tone} />
                  <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.l}</span>
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
// 3. TradeTariffs
// =====================================================
function TradeTariffsPage() {
  return (
    <PrescientShell active="trade" title="Trade & Tariffs" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Trade · live"
          headline="$840K duty exposure across 4 active rulings."
          sub="Two Section 232 reviews pending. CN-EU watch."
          meta={['12 countries', 'Tariff engine v3.4', <span key="t" className="mono">last sync 14:31</span>]} />

        <KpiStrip items={[
          { label: 'Duty exposure', value: '$840K', delta: '+$120K', deltaTone: 'bad' },
          { label: 'Active rulings', value: '4' },
          { label: 'Pending decisions', value: '2', delta: 'May 06 · May 14', deltaTone: 'signal' },
          { label: 'Effective rate', value: '4.2', suffix: '%' },
          { label: 'Drawback eligible', value: '$240K' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="Active rulings" title="Where exposure sits" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.4fr) 80px 90px 110px 100px 110px 80px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['HTS · ruling', 'Origin', 'Rate', 'Status', 'Effective', 'Annual exposure', 'Action'].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {[
              { l: '7209.16 · CRC · 232', orig: 'CN', r: '25%', s: 'In force', eff: '2018-03', ex: '$420K', act: 'Re-source', tone: 'bad' },
              { l: '2806.10 · Argon', orig: 'DE', r: '0%', s: 'In force', eff: '2024-01', ex: '$0', act: '—', tone: 'good' },
              { l: '7110.11 · Pt', orig: 'DE', r: '4.5%', s: 'In force', eff: '2022-04', ex: '$84K', act: 'Drawback', tone: 'neutral' },
              { l: '8001.10 · Tin', orig: 'CN', r: '8%', s: 'Pending', eff: 'May 06', ex: '$220K', act: 'Defer · re-source', tone: 'signal' },
              { l: '3902.10 · PP', orig: 'JP', r: '6.5%', s: 'In force', eff: '2023-09', ex: '$116K', act: 'Drawback', tone: 'neutral' },
              { l: '2811.21 · CO2', orig: 'JP', r: 'TBD', s: 'Pending', eff: 'May 14', ex: '$0', act: 'Watch', tone: 'signal' },
            ].map((r, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.4fr) 80px 90px 110px 100px 110px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>{r.l}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.orig}</span>
                <span className="mono" style={{ fontSize: 11.5, color: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'signal' ? 'var(--signal)' : 'var(--bone)' }}>{r.r}</span>
                <Pill tone={r.tone === 'good' ? 'good' : r.tone === 'signal' ? 'signal' : 'bone'} mono>{r.s}</Pill>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.eff}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>{r.ex}</span>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{r.act}</span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Pending decisions" title="What we're watching" padded={false}>
            {[
              { d: 'May 06', e: 'Section 232 · Tin · CN', impact: '+8% effective · $220K/yr', conf: 0.62, tone: 'signal' },
              { d: 'May 14', e: 'CO2 dual-use · JP', impact: 'unknown · watching', conf: 0.40, tone: 'signal' },
              { d: 'Jun 02', e: 'CRC quota review · annual', impact: 'expansion likely · −$120K', conf: 0.70, tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} style={{ padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.e}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{it.d}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--soft)' }}>
                  <span>{it.impact}</span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>conf {it.conf.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </Card>
          <Card eyebrow="Drawback queue" title="Refund opportunities" padded={false}>
            {[
              { c: 'Pt catalyst · BASF', amt: 84000, fileBy: 'Jun 30', tone: 'good' },
              { c: 'PP resin · Mitsui', amt: 116000, fileBy: 'Jul 14', tone: 'good' },
              { c: 'Slurry · Cabot', amt: 28000, fileBy: 'Aug 02', tone: 'good' },
              { c: 'Tin · Yunnan', amt: 12000, fileBy: 'Aug 18', tone: 'neutral' },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.c}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--good)', textAlign: 'right' }}>${(r.amt / 1000).toFixed(0)}K</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>file by {r.fileBy}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 4. GlobalEvents
// =====================================================
function GlobalEventsPage() {
  return (
    <PrescientShell active="events" title="Global Events" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Global events · 24/7 watch"
          headline="47 live signals across 12 countries."
          sub="Three rated material this week."
          meta={['Refresh 30s', 'Coverage geo + weather + financial', <span key="t" className="mono">conf 0.74</span>]} />

        <KpiStrip items={[
          { label: 'Live signals', value: '47' },
          { label: 'Material this week', value: '3', delta: '+1', deltaTone: 'bad' },
          { label: 'Countries impacted', value: '12' },
          { label: 'Suppliers exposed', value: '14/47' },
          { label: 'Confidence · weighted', value: '0.74' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
          <Card eyebrow="Geo signal map" title="Live · 47 signals" padded={false}>
            <MiniWorldDots h={360} markers={[
              { x: 50, y: 30, tone: 'signal', size: 16, label: 'Ukraine corridor' },
              { x: 78, y: 38, tone: 'bad', size: 14, label: 'CN-EU watch' },
              { x: 56, y: 50, tone: 'signal', size: 12, label: 'Suez transit' },
              { x: 22, y: 36, tone: 'good', size: 10, label: 'US labor' },
              { x: 80, y: 60, tone: 'signal', size: 10, label: 'India monsoon' },
              { x: 30, y: 64, tone: 'bad', size: 10, label: 'Brazil port' },
              { x: 82, y: 44, tone: 'good', size: 8, label: 'Japan stable' },
              { x: 64, y: 62, tone: 'signal', size: 8, label: 'Indonesia' },
            ]} />
          </Card>

          <Card eyebrow="Live feed · this hour" padded={false}>
            {[
              { t: '14:31', cat: 'Geopol', e: 'CN customs · steel HS code review · 2-day delay risk', tone: 'bad' },
              { t: '14:18', cat: 'Weather', e: 'Typhoon Banyan forming · East China Sea · 5-day window', tone: 'signal' },
              { t: '13:52', cat: 'Financial', e: 'Han Steel · Q1 filing · revenue −12% YoY', tone: 'bad' },
              { t: '13:14', cat: 'Trade', e: 'DOC opens AD review · cold-rolled steel from Vietnam', tone: 'signal' },
              { t: '12:38', cat: 'Energy', e: 'Argon spot up 4.1% · European gas tightness', tone: 'signal' },
              { t: '11:42', cat: 'Logistics', e: 'Long Beach port · congestion clearing · −1d ETA', tone: 'good' },
              { t: '10:08', cat: 'Geopol', e: 'EU CBAM phase-2 timing · letter to industry', tone: 'neutral' },
            ].map((it, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '50px 80px 12px 1fr', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <Pill tone="bone" mono>{it.cat}</Pill>
                <StatusDot tone={it.tone} />
                <span style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.e}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 5. EventCalendar
// =====================================================
function EventCalendarPage() {
  const events = [
    { d: 'Apr 28', dow: 'Mon', e: 'Long Beach port · ETA SH-3401 · 360 MT', cat: 'Logistics', tone: 'signal' },
    { d: 'Apr 30', dow: 'Wed', e: 'Voestalpine · contract Q2 milestone', cat: 'Procurement', tone: 'good' },
    { d: 'May 02', dow: 'Fri', e: 'BASF Pt catalyst · ETA · 28 oz', cat: 'Logistics', tone: 'good' },
    { d: 'May 06', dow: 'Tue', e: 'Section 232 · Tin · CN · DOC ruling', cat: 'Trade', tone: 'bad' },
    { d: 'May 08', dow: 'Thu', e: 'OPEC+ meeting · output decision', cat: 'Macro', tone: 'signal' },
    { d: 'May 10', dow: 'Sat', e: 'Han Steel · Q1 earnings call', cat: 'Financial', tone: 'signal' },
    { d: 'May 14', dow: 'Wed', e: 'CO2 dual-use · JP · ruling', cat: 'Trade', tone: 'signal' },
    { d: 'May 16', dow: 'Fri', e: 'Linde · investor day · spin-off question', cat: 'Financial', tone: 'signal' },
    { d: 'May 22', dow: 'Thu', e: 'EU CBAM phase-2 · industry briefing', cat: 'Trade', tone: 'neutral' },
  ];
  return (
    <PrescientShell active="calendar" title="Event Calendar" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Event calendar · next 30 days"
          headline="18 named events with material risk."
          sub="Three could move forecasts > 5%."
          meta={['Auto-curated', '6 categories', <span key="t" className="mono">last refresh 14:31</span>]}
          action={<div style={{ display: 'flex', gap: 8 }}><Btn kind="ghost" sm>Subscribe ICS</Btn><Btn kind="ghost" sm icon={<Icon.Plus s={11} />}>Add</Btn></div>} />

        <Toolbar searchPlaceholder="Search events…">
          <FilterChip label="Category" value="All" active />
          <FilterChip label="Severity" value="All" />
          <FilterChip label="When" value="Next 30d" />
        </Toolbar>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 50px 100px 12px 1fr 110px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
            {['Date', 'DoW', 'Category', '', 'Event', 'Action'].map((h) => (
              <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
            ))}
          </div>
          {events.map((it, i, a) => (
            <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '70px 50px 100px 12px 1fr 110px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.d}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.dow}</span>
              <Pill tone="bone" mono>{it.cat}</Pill>
              <StatusDot tone={it.tone} />
              <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.e}</span>
              <Btn kind="ghost" sm>Open scenario</Btn>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { l: 'Material this week', n: 3, tone: 'bad' },
            { l: 'Watch this month', n: 12, tone: 'signal' },
            { l: 'Resolved last week', n: 8, tone: 'good' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'var(--panel)', padding: 22 }}>
              <Eyebrow>{c.l}</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 28, color: 'var(--bone)', fontWeight: 300 }}>{c.n}</span>
                <StatusDot tone={c.tone} />
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 6. ProcessAutomation
// =====================================================
function ProcessAutomationPage() {
  const flows = [
    { n: 'Auto-route POs under $25K', cat: 'Procurement', runs: 142, save: '34h/wk', s: 'on', err: 0, conf: 0.92 },
    { n: 'Reorder point recompute weekly', cat: 'Inventory', runs: 52, save: '6h/wk', s: 'on', err: 0, conf: 0.88 },
    { n: 'Regime alert · advisor brief', cat: 'Intelligence', runs: 28, save: '8h/wk', s: 'on', err: 0, conf: 0.86 },
    { n: 'Late-shipment escalation', cat: 'Logistics', runs: 18, save: '4h/wk', s: 'on', err: 1, conf: 0.78 },
    { n: 'OTD scorecard · supplier email', cat: 'Suppliers', runs: 47, save: '12h/wk', s: 'on', err: 0, conf: 0.84 },
    { n: 'Drawback file prep · quarterly', cat: 'Trade', runs: 4, save: '20h/q', s: 'on', err: 0, conf: 0.82 },
    { n: 'Customer attribution · new lots', cat: 'Traceability', runs: 84, save: '2h/wk', s: 'pause', err: 0, conf: 0.74 },
  ];
  return (
    <PrescientShell active="automation" title="Process Automation" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Automations · 12 active"
          headline="84 hrs/wk of human work, off the docket."
          sub="One flow degraded. Re-run scheduled."
          meta={['Audit trail · 100%', 'Approval gates per flow', <span key="t" className="mono">last run 14:18</span>]}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New flow</Btn>} />

        <KpiStrip items={[
          { label: 'Active flows', value: '12' },
          { label: 'Time saved · this wk', value: '84', suffix: 'hrs' },
          { label: 'Runs · 30d', value: '418', delta: '+14%', deltaTone: 'good' },
          { label: 'Errors · 30d', value: '3', delta: '−2', deltaTone: 'good' },
          { label: 'Avg confidence', value: '0.84' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="Flows" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 2fr) 110px 70px 90px 80px 60px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['Flow', 'Category', 'Runs · 30d', 'Saved', 'Errors', 'Conf', 'Status', ''].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {flows.map((r, i, a) => (
              <div key={r.n} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 2fr) 110px 70px 90px 80px 60px 80px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.n}</span>
                <Pill tone="bone" mono>{r.cat}</Pill>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.runs}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--good)', textAlign: 'right' }}>{r.save}</span>
                <span className="mono" style={{ fontSize: 11, color: r.err ? 'var(--bad)' : 'var(--muted)', textAlign: 'right' }}>{r.err}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'right' }}>{r.conf.toFixed(2)}</span>
                <Pill tone={r.s === 'on' ? 'good' : 'signal'} mono>{r.s === 'on' ? 'on' : 'paused'}</Pill>
                <Icon.ArrowRight s={11} />
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Run history · 7 days" title="Volume by day">
            <BarChart h={140} data={[
              { l: 'Mon', v: 64 }, { l: 'Tue', v: 58 }, { l: 'Wed', v: 71 },
              { l: 'Thu', v: 62 }, { l: 'Fri', v: 68 }, { l: 'Sat', v: 22 }, { l: 'Sun', v: 18 },
            ]} color="var(--soft)" />
          </Card>
          <Card eyebrow="Approval gates · last 14 actions" title="What humans saw" padded={false}>
            {[
              { who: 'M. Okafor', a: 'Approved · auto-route PO-9920', t: '12:14' },
              { who: 'L. Park', a: 'Approved · reorder run #2814', t: '11:08' },
              { who: 'M. Okafor', a: 'Rejected · escalation · Han Steel', t: '10:22' },
              { who: 'Auto', a: 'Self-cleared · OTD email batch · 47 sent', t: '09:38' },
              { who: 'L. Park', a: 'Approved · drawback file prep', t: 'Yest' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 50px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{it.who}</span>
                <span style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.a}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'right' }}>{it.t}</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

window.OperationsHubPage = OperationsHubPage;
window.LogisticsManagementPage = LogisticsManagementPage;
window.TradeTariffsPage = TradeTariffsPage;
window.GlobalEventsPage = GlobalEventsPage;
window.EventCalendarPage = EventCalendarPage;
window.ProcessAutomationPage = ProcessAutomationPage;


Object.assign(window, { LogisticsManagementPage, TradeTariffsPage, GlobalEventsPage, EventCalendarPage, ProcessAutomationPage });
