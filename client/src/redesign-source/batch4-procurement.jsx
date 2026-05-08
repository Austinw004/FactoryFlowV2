/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody, BarChart */

// ============================================================
// BATCH 4 — Procurement cluster
//   ProcurementHub · AutomatedPO · Allocation
//   InventoryManagement · InventoryOptimization · RFQDashboard
// ============================================================

// =====================================================
// 1. ProcurementHub
// =====================================================
function ProcurementHubPage() {
  return (
    <PrescientShell active="prochub" title="Procurement" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Procurement · Apr 26"
          headline={<>$12.4M open POs · <span style={{ color: 'var(--signal)' }}>$2.4M flagged for deferral.</span></>}
          sub="Regime-aware ordering is reducing exposure this cycle."
          meta={[<span key="r"><RegimeBadge size="sm" /></span>, '38 open POs', '9 active RFQs']} />

        <KpiStrip items={[
          { label: 'Open POs', value: '38', delta: '+4', deltaTone: 'neutral', spark: [28, 32, 34, 36, 38, 38, 38] },
          { label: 'Active RFQs', value: '9', delta: '+2', deltaTone: 'neutral' },
          { label: 'Auto-routed', value: '67', suffix: '%', delta: '+8pp', deltaTone: 'good' },
          { label: 'Cycle time · avg', value: '4.2', suffix: 'd', delta: '−0.6d', deltaTone: 'good' },
          { label: 'Savings · YTD', value: '$3.2M', delta: 'audited', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            { eyebrow: 'Procurement', title: 'Active orders', body: '38 open POs across CRC, gas, slurry. $2.4M flagged HOLD.', kpi: '$12.4M', kpiLabel: 'open', tone: 'signal' },
            { eyebrow: 'Automated PO', title: 'Routing engine', body: '67% of POs auto-routed this cycle. Approval thresholds in policy.', kpi: '67%', kpiLabel: 'auto', tone: 'good' },
            { eyebrow: 'RFQ pipeline', title: '9 RFQs in flight', body: '3 awaiting quote, 4 evaluating, 2 awarding. $1.6M expected commit.', kpi: '9', kpiLabel: 'active', tone: 'neutral' },
            { eyebrow: 'Allocation', title: 'Capacity allocation', body: 'Quarterly contract draw vs forecast across 14 suppliers.', kpi: '83%', kpiLabel: 'utilized', tone: 'good' },
            { eyebrow: 'Inventory', title: 'On-hand vs safety', body: 'Argon below safety. CRC stock-up window deferred.', kpi: '$48.2M', kpiLabel: 'WC tied', tone: 'neutral' },
            { eyebrow: 'Optimization', title: 'Reorder points', body: 'Re-derive ROP/EOQ under regime shift. 142 SKUs in run.', kpi: '142', kpiLabel: 'SKUs', tone: 'neutral' },
          ].map((t, i) => (
            <HubTile3 key={i} {...t} />
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Card eyebrow="Recent activity" title="Last 24h" padded={false}>
            {[
              { t: '14:31', who: 'Advisor', e: 'Flagged 6 POs for deferral · regime HOLD', tone: 'signal' },
              { t: '13:52', who: 'M. Okafor', e: 'Approved RFQ-2814 · Cabot 12,400 kg slurry', tone: 'good' },
              { t: '11:08', who: 'L. Park', e: 'Diversified Han Steel · 30% to Voestalpine', tone: 'good' },
              { t: '10:22', who: 'Auto', e: 'Routed PO-9914 · BASF · $84K', tone: 'neutral' },
              { t: 'Yest', who: 'M. Okafor', e: 'Cancelled PO-9888 · slurry overstock', tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 12px 100px 1fr', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <StatusDot tone={it.tone} />
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{it.who}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.e}</span>
              </div>
            ))}
          </Card>

          <EvidencePanel
            title="Live signals · procurement"
            confidence={0.78}
            sources={[
              { title: 'Defer non-critical POs · Mar–May', source: 'FDR 2.21 · regime panel', time: '2h' },
              { title: 'Lock argon · 9-day Linde quote', source: 'Argon spot +4.1% MoM', time: '4h' },
              { title: 'Tin forward-buy window', source: 'LME −3.1% · counter-cyclical', time: '1d' },
              { title: 'Han Steel concentration breach', source: '41% of CRC · policy 35%', time: '4h' },
            ]} />
        </div>
      </PageBody>
    </PrescientShell>
  );
}
function HubTile3({ eyebrow, title, body, kpi, kpiLabel, tone }) {
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
// 2. AutomatedPO
// =====================================================
function AutomatedPOPage() {
  const queue = [
    { id: 'PO-9921', sup: 'Linde Gas', mat: 'Argon · 5N · 8,400 L', amt: 39260, status: 'Awaiting approval', conf: 0.82, eta: 'Now', flag: true },
    { id: 'PO-9920', sup: 'Voestalpine', mat: 'CRC · 1.2mm auto · 360 MT', amt: 304200, status: 'Auto-routed · approved', conf: 0.90, eta: 'Sent 12:14' },
    { id: 'PO-9919', sup: 'Cabot Microelectronics', mat: 'Slurry · grade A · 12,400 kg', amt: 58400, status: 'Awaiting approval', conf: 0.76, eta: 'Now' },
    { id: 'PO-9918', sup: 'BASF Catalysts', mat: 'Pt catalyst · ingot · 28 oz', amt: 26544, status: 'Auto-routed · approved', conf: 0.88, eta: 'Sent 11:08' },
    { id: 'PO-9917', sup: 'Han Steel', mat: 'CRC · 1.2mm · 420 MT', amt: 354000, status: 'On HOLD · regime', conf: 0.42, eta: 'Defer', flag: true, tone: 'bad' },
    { id: 'PO-9916', sup: 'Mitsui Plastics', mat: 'PP resin · grade 11 · 8,200 kg', amt: 9709, status: 'Auto-routed · approved', conf: 0.91, eta: 'Sent 10:22' },
  ];

  return (
    <PrescientShell active="apo" title="Automated PO" breadcrumb={['Procurement']}>
      <PageBody>
        <PageHero
          eyebrow="Automated PO · routing engine"
          headline="67% of POs auto-routed this cycle."
          sub="Two awaiting human approval, one on regime HOLD."
          meta={['38 open POs', '$12.4M committed', <span key="r"><RegimeBadge size="sm" /></span>]}
          action={<Btn kind="ghost" sm>Approval rules</Btn>} />

        <KpiStrip items={[
          { label: 'Auto-routed · 30d', value: '67', suffix: '%', delta: '+8pp', deltaTone: 'good' },
          { label: 'Awaiting approval', value: '6', delta: '+2', deltaTone: 'neutral' },
          { label: 'On regime HOLD', value: '6', delta: '$2.4M', deltaTone: 'signal' },
          { label: 'Avg approval time', value: '38m', delta: '−12m', deltaTone: 'good' },
          { label: 'Auto-route confidence', value: '0.86', delta: '+0.03', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Toolbar searchPlaceholder="Search PO id, supplier, material…">
            <FilterChip label="Status" value="All" active />
            <FilterChip label="Supplier" value="All" />
            <FilterChip label="Amount" value="≥ $25K" />
          </Toolbar>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(160px, 1fr) minmax(220px, 1.4fr) 100px 200px 80px 90px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['PO id', 'Supplier', 'Material', 'Amount', 'Status', 'Conf', 'ETA', ''].map((h, i) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9, textAlign: ['Amount', 'Conf'].includes(h) ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {queue.map((r, i, a) => (
              <div key={r.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px minmax(160px, 1fr) minmax(220px, 1.4fr) 100px 200px 80px 90px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: r.flag ? 'var(--signal)' : 'var(--muted)' }}>{r.id}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.sup}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.mat}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>${(r.amt / 1000).toFixed(1)}K</span>
                <span style={{ fontSize: 11.5, color: r.tone === 'bad' ? 'var(--bad)' : r.status.includes('approved') ? 'var(--good)' : r.status.includes('HOLD') ? 'var(--signal)' : 'var(--soft)' }}>{r.status}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${r.conf * 100}%`, height: '100%', background: r.conf >= 0.8 ? 'var(--good)' : r.conf >= 0.65 ? 'var(--signal)' : 'var(--bad)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r.conf.toFixed(2)}</span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{r.eta}</span>
                <Icon.ArrowRight s={11} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Routing rules · active" title="9 rules · 2 in shadow" padded={false}>
            {[
              { rule: '< $25K · trusted supplier · auto', match: '142 POs · 30d', tone: 'good' },
              { rule: '$25–100K · 1 approver · 4h SLA', match: '64 POs · 30d', tone: 'good' },
              { rule: '> $100K · 2 approvers · 24h SLA', match: '18 POs · 30d', tone: 'neutral' },
              { rule: 'Regime HOLD · defer 7-day check', match: '6 POs · live', tone: 'signal' },
              { rule: 'Concentration breach · escalate', match: '2 POs · live', tone: 'bad' },
            ].map((r, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 130px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <StatusDot tone={r.tone} />
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.rule}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{r.match}</span>
              </div>
            ))}
          </Card>
          <Card eyebrow="Cycle time · 30d" title="From request to send">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 30, color: 'var(--bone)', fontWeight: 300 }}>4.2</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>days median</span>
              <Pill tone="good" mono style={{ marginLeft: 'auto' }}>−0.6d</Pill>
            </div>
            <BarChart h={120} data={[
              { l: '< 1d', v: 24, c: 'var(--good)' }, { l: '1-2d', v: 38, c: 'var(--good)' },
              { l: '2-4d', v: 56, c: 'var(--good)' }, { l: '4-7d', v: 32, c: 'var(--soft)' },
              { l: '7-14d', v: 14, c: 'var(--soft)' }, { l: '> 14d', v: 4, c: 'var(--bad)' },
            ]} />
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 3. Allocation
// =====================================================
function AllocationPage() {
  return (
    <PrescientShell active="alloc" title="Allocation" breadcrumb={['Procurement']}>
      <PageBody>
        <PageHero
          eyebrow="Q2 contract draw"
          headline="83% of contracted capacity utilized."
          sub="Three suppliers under-drawn, two over."
          meta={['14 active contracts', '$28.4M committed Q2', <span key="t" className="mono">last sync 14:31</span>]} />

        <KpiStrip items={[
          { label: 'Q2 contracted', value: '$28.4M' },
          { label: 'Drawn YTD', value: '$23.6M', delta: '83%', deltaTone: 'good' },
          { label: 'Under-drawn', value: '3', delta: 'review by May 15', deltaTone: 'signal' },
          { label: 'Over-drawn', value: '2', delta: 'breach risk', deltaTone: 'bad' },
          { label: 'Avg utilization', value: '83', suffix: '%', delta: '+4pp', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="Allocation by supplier · Q2" title="Drawn vs contracted" padded={false}>
            {[
              { sup: 'Han Steel', mat: 'CRC · auto-grade', con: 4800, drawn: 5520, tone: 'bad' },
              { sup: 'Voestalpine', mat: 'CRC · auto-grade', con: 2400, drawn: 1320, tone: 'signal' },
              { sup: 'Linde Gas', mat: 'Argon · industrial', con: 1800, drawn: 1620, tone: 'good' },
              { sup: 'BASF Catalysts', mat: 'Pt catalyst', con: 1200, drawn: 980, tone: 'good' },
              { sup: 'Cabot Micro', mat: 'CMP slurry', con: 980, drawn: 880, tone: 'good' },
              { sup: 'Mitsui Plastics', mat: 'PP resin', con: 760, drawn: 480, tone: 'signal' },
              { sup: 'Yunnan Tin', mat: 'Tin solder', con: 620, drawn: 540, tone: 'good' },
              { sup: 'Norsk Hydro', mat: 'Aluminum billet', con: 540, drawn: 320, tone: 'signal' },
            ].map((r, i, a) => {
              const pct = (r.drawn / r.con) * 100;
              return (
                <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(180px, 1fr) 1fr 90px 60px', gap: 12, padding: '14px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.sup}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.mat}</span>
                  <div style={{ height: 6, background: 'var(--line)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, height: '100%', width: `${Math.min(100, pct)}%`, background: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'good' ? 'var(--good)' : 'var(--signal)' }} />
                    {pct > 100 && <div style={{ position: 'absolute', left: '100%', height: '100%', width: `${pct - 100}%`, background: 'var(--bad)', opacity: 0.5 }} />}
                    <div style={{ position: 'absolute', left: '100%', top: -2, width: 1, height: 10, background: 'var(--muted)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11.5, color: r.tone === 'bad' ? 'var(--bad)' : 'var(--bone)', textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>${(r.drawn / 1000).toFixed(1)}K/${(r.con / 1000).toFixed(1)}K</span>
                </div>
              );
            })}
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Recommended actions" title="Rebalance Q2" padded={false}>
            {[
              { who: 'Han Steel', a: 'Cap further draw at 100% · escalate concentration policy', amt: '−$320K', tone: 'bad' },
              { who: 'Voestalpine', a: 'Pull forward 240 MT · activate fallback contract', amt: '+$240K', tone: 'good' },
              { who: 'Mitsui Plastics', a: 'Use commitment · forecast PP resin demand up 8%', amt: '+$180K', tone: 'good' },
              { who: 'Norsk Hydro', a: 'Pull forward Q3 demand · spot up 4%', amt: '+$110K', tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '160px 1fr 90px 60px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{it.who}</span>
                <span style={{ fontSize: 12, color: 'var(--soft)' }}>{it.a}</span>
                <span className="mono" style={{ fontSize: 11.5, color: it.tone === 'good' ? 'var(--good)' : 'var(--bad)', textAlign: 'right' }}>{it.amt}</span>
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
// 4. InventoryManagement
// =====================================================
function InventoryManagementPage() {
  const items = [
    { sku: 'SKU-3401', mat: 'CRC · 1.2mm auto', uom: 'MT', oh: 1840, safety: 1200, max: 2400, dos: 14, tone: 'good' },
    { sku: 'SKU-1208', mat: 'Argon · 5N', uom: 'L', oh: 4800, safety: 6000, max: 12000, dos: 8, tone: 'bad' },
    { sku: 'SKU-2204', mat: 'Pt catalyst', uom: 'oz', oh: 142, safety: 80, max: 240, dos: 22, tone: 'good' },
    { sku: 'SKU-0884', mat: 'PP resin · grade 11', uom: 'kg', oh: 18400, safety: 12000, max: 24000, dos: 18, tone: 'good' },
    { sku: 'SKU-4471', mat: 'Tin solder · 60/40', uom: 'kg', oh: 1640, safety: 800, max: 2400, dos: 26, tone: 'good' },
    { sku: 'SKU-5012', mat: 'CMP slurry · grade A', uom: 'kg', oh: 8400, safety: 9600, max: 18000, dos: 9, tone: 'signal' },
  ];

  return (
    <PrescientShell active="inv" title="Inventory" breadcrumb={['Procurement']}>
      <PageBody>
        <PageHero
          eyebrow="Inventory management · live"
          headline="$48.2M tied up in working capital."
          sub="Two SKUs below safety stock. One stock-out risk in 9 days."
          meta={['142 SKUs · 4 warehouses', 'Avg DoS 16 days', <span key="r"><RegimeBadge size="sm" /></span>]} />

        <KpiStrip items={[
          { label: 'Working capital', value: '$48.2M', delta: '−$1.6M', deltaTone: 'good' },
          { label: 'Below safety', value: '2', delta: 'AR · slurry', deltaTone: 'bad' },
          { label: 'Avg days-of-stock', value: '16d', delta: '−2d', deltaTone: 'good' },
          { label: 'Inventory turns', value: '8.4', delta: '+0.6', deltaTone: 'good' },
          { label: 'Stockouts · 30d', value: '4', delta: '+1', deltaTone: 'bad' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Toolbar searchPlaceholder="Search SKU, material, warehouse…">
            <FilterChip label="Status" value="All" active />
            <FilterChip label="Warehouse" value="All" />
            <FilterChip label="DoS" value="≤ 14d" />
          </Toolbar>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(220px, 1fr) 60px 1fr 100px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['SKU', 'Material', 'UOM', 'Position', 'On hand', 'DoS', ''].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {items.map((r, i, a) => {
              const ohp = (r.oh / r.max) * 100;
              const sp = (r.safety / r.max) * 100;
              return (
                <div key={r.sku} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px minmax(220px, 1fr) 60px 1fr 100px 80px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sku}</span>
                  <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.mat}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.uom}</span>
                  <div style={{ height: 6, background: 'var(--line)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, height: '100%', width: `${ohp}%`, background: r.tone === 'bad' ? 'var(--bad)' : r.tone === 'signal' ? 'var(--signal)' : 'var(--good)' }} />
                    <div style={{ position: 'absolute', left: `${sp}%`, top: -2, width: 1, height: 10, background: 'var(--muted)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.oh.toLocaleString()}</span>
                  <span className="mono" style={{ fontSize: 11, color: r.dos < 10 ? 'var(--bad)' : 'var(--soft)', textAlign: 'right' }}>{r.dos}d</span>
                  <Icon.ArrowRight s={11} />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card eyebrow="Working capital · 12w" title="Trend">
            <BarChart h={150} data={[
              { l: 'W14', v: 51 }, { l: 'W15', v: 50 }, { l: 'W16', v: 49 }, { l: 'W17', v: 50 },
              { l: 'W18', v: 49 }, { l: 'W19', v: 49 }, { l: 'W20', v: 48 }, { l: 'W21', v: 48 },
              { l: 'W22', v: 49 }, { l: 'W23', v: 48 }, { l: 'W24', v: 48 }, { l: 'W25', v: 48, c: 'var(--good)' },
            ]} color="var(--soft)" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--soft)' }}>
              <span>Trailing 12 weeks · $M</span>
              <span className="mono" style={{ color: 'var(--good)' }}>−$1.6M</span>
            </div>
          </Card>
          <Card eyebrow="ABC · turns" title="Top 6 SKUs by velocity" padded={false}>
            {items.slice(0, 6).map((r, i, a) => (
              <div key={r.sku} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 60px', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sku}</span>
                <div style={{ height: 2, background: 'var(--line)' }}>
                  <div style={{ width: `${(r.dos / 30) * 100}%`, height: '100%', background: 'var(--soft)' }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{(364 / r.dos).toFixed(1)}/yr</span>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 5. InventoryOptimization
// =====================================================
function InventoryOptimizationPage() {
  return (
    <PrescientShell active="invopt" title="Inventory Optimization" breadcrumb={['Procurement']}>
      <PageBody>
        <PageHero
          eyebrow="Optimization · run #2814"
          headline="Re-derive ROP & EOQ for 142 SKUs under regime shift."
          sub="Service level 96%, holding cost 18%/yr."
          meta={['Current: legacy heuristic', 'Proposed: stochastic newsvendor + regime', <span key="r"><RegimeBadge size="sm" /></span>]}
          action={<Btn kind="primary" sm icon={<Icon.Play s={11} />}>Apply policy</Btn>} />

        <KpiStrip items={[
          { label: 'SKUs in run', value: '142' },
          { label: 'WC change · expected', value: '−$2.4M', delta: '−5.0%', deltaTone: 'good' },
          { label: 'Service level · current', value: '96.4', suffix: '%' },
          { label: 'Service level · proposed', value: '97.1', suffix: '%', delta: '+0.7pp', deltaTone: 'good' },
          { label: 'Stockout reduction · est.', value: '−42', suffix: '%', delta: 'sim 1000', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card eyebrow="Recommended changes" title="142 SKUs · top movers" padded={false}>
            {[
              { sku: 'SKU-3401', mat: 'CRC · 1.2mm auto', cur: '1,200 / 2,400', prop: '1,400 / 2,200', wc: '−$24K', tone: 'good' },
              { sku: 'SKU-1208', mat: 'Argon · 5N', cur: '6,000 / 12,000', prop: '7,200 / 14,400', wc: '+$18K', tone: 'signal' },
              { sku: 'SKU-2204', mat: 'Pt catalyst', cur: '80 / 240', prop: '60 / 180', wc: '−$96K', tone: 'good' },
              { sku: 'SKU-5012', mat: 'CMP slurry · A', cur: '9,600 / 18,000', prop: '11,200 / 16,000', wc: '+$8K', tone: 'signal' },
              { sku: 'SKU-4471', mat: 'Tin solder · 60/40', cur: '800 / 2,400', prop: '600 / 1,800', wc: '−$32K', tone: 'good' },
              { sku: 'SKU-0884', mat: 'PP resin · grade 11', cur: '12,000 / 24,000', prop: '10,800 / 20,400', wc: '−$14K', tone: 'good' },
            ].map((r, i, a) => (
              <div key={r.sku} style={{ display: 'grid', gridTemplateColumns: '100px minmax(180px, 1fr) 130px 130px 80px 50px', gap: 12, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sku}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.mat}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.cur}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.prop}</span>
                <span className="mono" style={{ fontSize: 11.5, color: r.tone === 'good' ? 'var(--good)' : 'var(--signal)', textAlign: 'right' }}>{r.wc}</span>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--bone)', justifySelf: 'end' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(180px, 1fr) 130px 130px 80px 50px', gap: 12, padding: '10px 18px', borderTop: '1px solid var(--line)', background: 'var(--panel-2)', alignItems: 'center' }}>
              <span></span>
              <span className="eyebrow" style={{ fontSize: 9 }}>Header — SKU / Material / Current ROP/Max / Proposed / ΔWC</span>
            </div>
          </Card>

          <EvidencePanel
            title="Policy assumptions"
            confidence={0.78}
            sources={[
              { title: 'Service level target', source: '96% baseline → 97% on A-class', time: 'policy' },
              { title: 'Holding cost', source: '18%/yr · finance approved', time: '2024-Q4' },
              { title: 'Regime overlay', source: 'Imbalanced Excess: tighter on commodities, looser on specialty', time: 'live' },
              { title: 'Demand model', source: 'Ensemble v4.2.1 · MAPE 6.4%', time: 'live' },
            ]} />
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Sensitivity" title="If service level moves" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--line)' }}>
              {[
                { sl: '94%', wc: '−$3.6M', stk: '+18%', tone: 'bad' },
                { sl: '95%', wc: '−$3.0M', stk: '+8%', tone: 'signal' },
                { sl: '96%', wc: '−$2.4M', stk: 'baseline', tone: 'neutral' },
                { sl: '97%', wc: '−$1.8M', stk: '−42%', tone: 'good', highlight: true },
                { sl: '98%', wc: '−$0.9M', stk: '−68%', tone: 'good' },
              ].map((c, i) => (
                <div key={i} style={{ background: c.highlight ? 'var(--panel-2)' : 'var(--panel)', padding: 18, borderTop: c.highlight ? '2px solid var(--signal)' : 'none' }}>
                  <Eyebrow>SL {c.sl}</Eyebrow>
                  <div className="mono" style={{ fontSize: 18, color: 'var(--bone)', fontWeight: 300, marginTop: 8 }}>{c.wc}</div>
                  <div className="mono" style={{ fontSize: 11, color: c.tone === 'good' ? 'var(--good)' : c.tone === 'bad' ? 'var(--bad)' : 'var(--muted)', marginTop: 6 }}>stockout {c.stk}</div>
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
// 6. RFQDashboard
// =====================================================
function RFQDashboardPage() {
  const rfqs = [
    { id: 'RFQ-2814', mat: 'CMP slurry · grade A · 12,400 kg', stage: 'Awarding', conf: 0.82, vendors: 3, eta: 'May 02', amt: 58400 },
    { id: 'RFQ-2813', mat: 'Argon · 5N · 32,000 L', stage: 'Evaluating', conf: 0.76, vendors: 2, eta: 'Apr 30', amt: 45000 },
    { id: 'RFQ-2812', mat: 'CRC · 1.2mm · 720 MT', stage: 'Evaluating', conf: 0.71, vendors: 4, eta: 'May 04', amt: 608000 },
    { id: 'RFQ-2811', mat: 'Pt catalyst · 88 oz', stage: 'Quotes in', conf: 0.68, vendors: 2, eta: 'May 06', amt: 83400 },
    { id: 'RFQ-2810', mat: 'PP resin · grade 11 · 18,000 kg', stage: 'Awaiting', conf: 0.62, vendors: 0, eta: 'May 08', amt: 21300 },
    { id: 'RFQ-2809', mat: 'Tin solder · 60/40 · 4,200 kg', stage: 'Awaiting', conf: 0.60, vendors: 0, eta: 'May 10', amt: 118000 },
  ];
  const stages = ['Awaiting', 'Quotes in', 'Evaluating', 'Awarding'];
  const stageCount = stages.map(s => ({ s, n: rfqs.filter(r => r.stage === s).length, sum: rfqs.filter(r => r.stage === s).reduce((a, r) => a + r.amt, 0) }));

  return (
    <PrescientShell active="rfq" title="RFQ Dashboard" breadcrumb={['Procurement']}>
      <PageBody>
        <PageHero
          eyebrow="RFQ pipeline · 9 active"
          headline="$1.9M of expected commitment in flight."
          sub="Two RFQs still awaiting vendor quotes."
          meta={['Avg cycle 8.2 days', '3 vendors per RFQ avg', <span key="t" className="mono">last sync 14:31</span>]}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New RFQ</Btn>} />

        {/* funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 32 }}>
          {stageCount.map((c, i) => (
            <div key={c.s} style={{ background: 'var(--panel)', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Eyebrow>{c.s}</Eyebrow>
                <span className="mono" style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 300 }}>{c.n}</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>${(c.sum / 1000).toFixed(0)}K</div>
              <div style={{ height: 2, background: 'var(--line)', marginTop: 12 }}>
                <div style={{ width: `${(c.n / 4) * 100}%`, height: '100%', background: 'var(--signal)' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card eyebrow="Active RFQs" padded={false} action={
            <Toolbar search={false}>
              <FilterChip label="Stage" value="All" active />
              <FilterChip label="Amount" value="All" />
            </Toolbar>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(220px, 1fr) 110px 70px 90px 90px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['RFQ id', 'Material', 'Stage', 'Vendors', 'Amount', 'ETA', 'Conf', ''].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {rfqs.map((r, i, a) => (
              <div key={r.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px minmax(220px, 1fr) 110px 70px 90px 90px 80px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.id}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{r.mat}</span>
                <Pill tone={r.stage === 'Awarding' ? 'good' : r.stage === 'Awaiting' ? 'signal' : 'neutral'} mono>{r.stage}</Pill>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.vendors}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>${(r.amt / 1000).toFixed(0)}K</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.eta}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${r.conf * 100}%`, height: '100%', background: r.conf >= 0.75 ? 'var(--good)' : 'var(--signal)' }} />
                  </div>
                </div>
                <Icon.ArrowRight s={11} />
              </div>
            ))}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card eyebrow="Cycle time" title="Stage → next, avg" padded={false}>
              {[
                { l: 'Awaiting → Quotes', d: '3.2d' },
                { l: 'Quotes → Evaluating', d: '1.8d' },
                { l: 'Evaluating → Awarding', d: '2.4d' },
                { l: 'Awarding → PO sent', d: '0.8d' },
              ].map((it, i, a) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{it.l}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.d}</span>
                </div>
              ))}
            </Card>

            <Card eyebrow="Win rate · 90d" title="By vendor count" padded={false}>
              {[
                { l: '1 vendor', win: 58 }, { l: '2 vendors', win: 71 }, { l: '3+ vendors', win: 84 },
              ].map((r, i, a) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 50px', gap: 10, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.l}</span>
                  <div style={{ height: 2, background: 'var(--line)' }}>
                    <div style={{ width: `${r.win}%`, height: '100%', background: 'var(--good)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.win}%</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

window.ProcurementHubPage = ProcurementHubPage;
window.AutomatedPOPage = AutomatedPOPage;
window.AllocationPage = AllocationPage;
window.InventoryManagementPage = InventoryManagementPage;
window.InventoryOptimizationPage = InventoryOptimizationPage;
window.RFQDashboardPage = RFQDashboardPage;


Object.assign(window, { ProcurementHubPage, AutomatedPOPage, AllocationPage, InventoryManagementPage, InventoryOptimizationPage, RFQDashboardPage });
