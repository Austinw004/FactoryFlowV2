/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark */

// ============================================================
// PROCUREMENT — high-density operations page
// Components mapped: <ProcurementSignalBar /> <MaterialsTable />
//   <SupplierRail /> <CommodityForecastInline /> <RfqDraftPanel />
//   <ProcurementToolbar /> <FilterChip /> <RowActions />
// ============================================================

function FilterChip({ label, value, active }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 26, padding: '0 10px',
      background: active ? 'var(--panel-2)' : 'transparent',
      border: '1px solid var(--line)',
      color: active ? 'var(--bone)' : 'var(--soft)',
      fontSize: 11, borderRadius: 3, cursor: 'pointer',
      fontFamily: 'inherit',
    }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span>{value}</span>
      <Icon.Down s={9} />
    </button>
  );
}

// Procurement signal — full-width banner driven by FDR regime
function ProcurementSignalBar() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto',
      gap: 24, alignItems: 'center',
      padding: '14px 20px',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderLeft: '2px solid var(--signal)',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Pill tone="signal" mono>HOLD</Pill>
        <div>
          <div style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 500, marginBottom: 2 }}>
            Defer non-critical orders. <span style={{ color: 'var(--soft)', fontWeight: 400 }}>High asset–real economy divergence detected.</span>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            FDR 2.21 · Imbalanced Excess · since Apr 11
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 11, color: 'var(--muted)' }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>Open POs</div>
          <span className="mono" style={{ fontSize: 13, color: 'var(--bone)' }}>$12.4M</span>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
        <div>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>Recommended pause</div>
          <span className="mono" style={{ fontSize: 13, color: 'var(--signal)' }}>$2.4M</span>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
        <div>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>RFQs in flight</div>
          <span className="mono" style={{ fontSize: 13, color: 'var(--bone)' }}>9</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" sm>Open evidence</Btn>
        <Btn kind="signal" sm>Apply to queue</Btn>
      </div>
    </div>
  );
}

// Toolbar
function ProcurementToolbar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 30, padding: '0 10px',
        background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 3,
        flex: '0 0 280px',
      }}>
        <Icon.Search s={12} />
        <input placeholder="Search materials, suppliers, POs…"
          style={{ flex: 1, background: 'transparent', border: 0, color: 'var(--bone)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 2 }}>⌘K</span>
      </div>
      <FilterChip label="Status" value="All" active />
      <FilterChip label="Category" value="All" />
      <FilterChip label="Region" value="Global" />
      <FilterChip label="Risk" value="≥ medium" active />
      <FilterChip label="Lead time" value="Any" />
      <div style={{ flex: 1 }} />
      <Btn kind="ghost" sm icon={<Icon.Filter s={11} />}>Saved views</Btn>
      <Btn kind="ghost" sm icon={<Icon.External s={11} />}>Export</Btn>
      <Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New PO</Btn>
    </div>
  );
}

// MaterialsTable — operational density. Columns: code · name · category · on-hand · safety · inbound · 7d demand · price · trend · supplier · lead · risk · signal
function MaterialsTable() {
  const rows = [
    { code: 'MAT-CRC-318',  name: 'Cold-rolled coil 1.2mm', cat: 'Steel',     onHand: 14200, safety: 18000, inbound: 6200, demand: 4400, price: '842',   unit: '/MT', trend: [820,830,832,835,840,842], dt: 'bad',  supplier: 'Han Steel · T1', lead: 34, leadTrend: 'bad', risk: 0.82, signal: 'hold', alt: '+1' },
    { code: 'MAT-CRC-422',  name: 'Cold-rolled coil 0.6mm', cat: 'Steel',     onHand: 9800,  safety: 8000,  inbound: 0,    demand: 1200, price: '838',   unit: '/MT', trend: [815,820,825,830,835,838], dt: 'bad',  supplier: 'Voestalpine · T1', lead: 18, leadTrend: 'good', risk: 0.31, signal: 'ok' },
    { code: 'MAT-SLR-104',  name: 'CMP slurry · type-B',    cat: 'Chem',      onHand: 1240,  safety: 1800,  inbound: 0,    demand: 360,  price: '4.81',  unit: '/L',  trend: [4.7,4.7,4.75,4.78,4.80,4.81], dt: 'bad',  supplier: 'Cabot Micro · T2', lead: 28, leadTrend: 'neutral', risk: 0.58, signal: 'rfq', alt: '+2' },
    { code: 'MAT-AR-001',   name: 'Argon (industrial)',     cat: 'Gas',       onHand: 14200, safety: 30000, inbound: 18000,demand: 7200, price: '0.142', unit: '/L',  trend: [0.135,0.137,0.139,0.140,0.141,0.142], dt: 'bad', supplier: 'Linde · T1', lead: 4, leadTrend: 'good', risk: 0.22, signal: 'lock' },
    { code: 'MAT-PP-2018',  name: 'PP resin · homopolymer', cat: 'Polymer',   onHand: 24800, safety: 20000, inbound: 12000,demand: 3100, price: '1,184', unit: '/MT', trend: [1180,1181,1182,1183,1183,1184], dt: 'neutral', supplier: 'Mitsui · T2', lead: 22, leadTrend: 'neutral', risk: 0.39, signal: 'ok' },
    { code: 'MAT-SN-005',   name: 'Tin solder bar 99.99%',  cat: 'Metal',     onHand: 880,   safety: 600,   inbound: 1200, demand: 420,  price: '28,140',unit: '/MT', trend: [29100,29000,28800,28600,28400,28140], dt: 'good', supplier: 'Yunnan Tin · T2', lead: 41, leadTrend: 'bad', risk: 0.71, signal: 'forward', alt: '+1' },
    { code: 'MAT-AL-220',   name: 'Aluminum 6061 sheet',    cat: 'Metal',     onHand: 6400,  safety: 5000,  inbound: 2800, demand: 1100, price: '2,418', unit: '/MT', trend: [2390,2400,2405,2410,2415,2418], dt: 'bad', supplier: 'Norsk Hydro · T1', lead: 16, leadTrend: 'good', risk: 0.34, signal: 'ok' },
    { code: 'MAT-CAT-PT',   name: 'Pt catalyst pellets',    cat: 'Catalyst',  onHand: 142,   safety: 100,   inbound: 0,    demand: 18,   price: '971',   unit: '/oz', trend: [985,982,980,977,974,971], dt: 'good', supplier: 'BASF · T1', lead: 28, leadTrend: 'neutral', risk: 0.28, signal: 'ok' },
    { code: 'MAT-POL-K12',  name: 'Polyaluminum chloride',  cat: 'Chem',      onHand: 4200,  safety: 6000,  inbound: 4000, demand: 1200, price: '0.84',  unit: '/L',  trend: [0.82,0.83,0.83,0.84,0.84,0.84], dt: 'neutral', supplier: 'Kemira · T2', lead: 21, leadTrend: 'neutral', risk: 0.44, signal: 'rfq' },
  ];

  const Col = ({ children, w, num, mono, head, color }) => (
    <div style={{
      width: w, flexShrink: 0,
      fontSize: head ? 10 : 11.5,
      letterSpacing: head ? '0.16em' : 'normal',
      textTransform: head ? 'uppercase' : 'none',
      color: head ? 'var(--muted)' : (color || 'var(--bone)'),
      fontFamily: mono ? "'Inter Tight', 'Inter', system-ui, sans-serif" : "inherit",
      fontVariantNumeric: 'tabular-nums',
      textAlign: num ? 'right' : 'left',
      fontWeight: head ? 500 : 400,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>{children}</div>
  );

  const stockBar = (onHand, safety) => {
    const pct = Math.min(100, (onHand / (safety * 1.5)) * 100);
    const tone = onHand < safety * 0.8 ? 'var(--bad)' : onHand < safety ? 'var(--signal)' : 'var(--good)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <div style={{ flex: 1, height: 2, background: 'var(--line)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: `${(safety / (safety * 1.5)) * 100}%`, top: -2, width: 1, height: 6, background: 'var(--muted)' }} />
          <div style={{ height: '100%', width: `${pct}%`, background: tone }} />
        </div>
      </div>
    );
  };

  const sigPill = (s) => {
    if (s === 'hold') return <Pill tone="signal" mono>HOLD</Pill>;
    if (s === 'rfq') return <Pill tone="bone" mono>RFQ</Pill>;
    if (s === 'lock') return <Pill tone="good" mono>LOCK</Pill>;
    if (s === 'forward') return <Pill tone="good" mono>BUY</Pill>;
    return <Pill tone="neutral" mono>OK</Pill>;
  };

  const widths = ['110px','minmax(220px,1fr)','80px','100px','110px','110px','100px','64px','120px','64px','64px','60px'];
  const gridTpl = widths.join(' ');

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      {/* head */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridTpl,
        gap: 12, padding: '10px 18px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel-2)',
      }}>
        {['Code','Material','Category','On-hand','Safety','Inbound','Price','7d','Supplier','Lead','Risk','Sig'].map((h, i) => (
          <div key={h} className="eyebrow" style={{ fontSize: 9, textAlign: ['On-hand','Safety','Inbound','Price','Lead','Risk'].includes(h) ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={r.code} className="row-hover" style={{
          display: 'grid', gridTemplateColumns: gridTpl,
          gap: 12, padding: '11px 18px',
          borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
          alignItems: 'center', cursor: 'pointer',
        }}>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.code}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--bone)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ marginTop: 4 }}>{stockBar(r.onHand, r.safety)}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--soft)' }}>{r.cat}</div>
          <div className="mono" style={{ fontSize: 11.5, color: r.onHand < r.safety ? 'var(--signal)' : 'var(--bone)', textAlign: 'right' }}>{r.onHand.toLocaleString()}</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'right' }}>{r.safety.toLocaleString()}</div>
          <div className="mono" style={{ fontSize: 11.5, color: r.inbound > 0 ? 'var(--bone)' : 'var(--muted)', textAlign: 'right' }}>
            {r.inbound > 0 ? '+' + r.inbound.toLocaleString() : '—'}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--bone)', textAlign: 'right' }}>
            ${r.price}<span style={{ color: 'var(--muted)', fontSize: 10 }}>{r.unit}</span>
          </div>
          <div><Spark data={r.trend} color={r.dt === 'good' ? 'var(--good)' : r.dt === 'bad' ? 'var(--bad)' : 'var(--soft)'} w={56} h={16} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--bone)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.supplier}</div>
            {r.alt && <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', border: '1px solid var(--line)', padding: '0 4px', borderRadius: 2 }}>{r.alt}</span>}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: r.leadTrend === 'bad' ? 'var(--bad)' : r.leadTrend === 'good' ? 'var(--good)' : 'var(--bone)', textAlign: 'right' }}>{r.lead}d</div>
          <div className="mono" style={{ fontSize: 11.5, color: r.risk >= 0.7 ? 'var(--bad)' : r.risk >= 0.5 ? 'var(--signal)' : r.risk >= 0.35 ? 'var(--soft)' : 'var(--good)', textAlign: 'right' }}>{r.risk.toFixed(2)}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{sigPill(r.signal)}</div>
        </div>
      ))}
    </div>
  );
}

// Right rail: open RFQs + recommended actions
function RfqRail() {
  const rfqs = [
    { id: 'RFQ-2814', mat: 'CMP slurry · type-B', supplier: '3 invited', status: 'open', age: '2d', amt: '$58.4K' },
    { id: 'RFQ-2811', mat: 'Argon (industrial)', supplier: 'Linde Gas', status: 'quoted', age: '4h', amt: '$112K' },
    { id: 'RFQ-2807', mat: 'CRC 1.2mm fallback', supplier: 'Voestalpine', status: 'quoted', age: '1d', amt: '$2.1M' },
    { id: 'RFQ-2802', mat: 'Polyaluminum K12', supplier: '2 invited', status: 'open', age: '3d', amt: '$24.0K' },
  ];
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>Open RFQs · 9</Eyebrow>
        <Btn kind="quiet" sm>All</Btn>
      </div>
      {rfqs.map((r, i) => (
        <div key={r.id} className="row-hover" style={{
          padding: '12px 16px',
          borderBottom: i < rfqs.length - 1 ? '1px solid var(--line-soft)' : 'none',
          cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.id}</span>
            <Pill tone={r.status === 'quoted' ? 'good' : 'neutral'} mono>{r.status}</Pill>
          </div>
          <div style={{ fontSize: 12, color: 'var(--bone)', marginBottom: 3 }}>{r.mat}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--soft)' }}>{r.supplier}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>{r.amt}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r.age}</span>
            </div>
          </div>
        </div>
      ))}
      {/* Inline composer footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--ink-deep)' }}>
        <Btn kind="ghost" sm full icon={<Icon.Plus s={11} />}>Draft new RFQ</Btn>
      </div>
    </div>
  );
}

// Inline AI co-pilot snippet (Procurement uses the Advisor; one card linking out)
function AdvisorCard() {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon.Sparkle s={12} />
        <Eyebrow>Advisor recommendations</Eyebrow>
      </div>
      <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--soft)', lineHeight: 1.6 }}>
        Under <span style={{ color: 'var(--bone)' }}>Imbalanced Excess</span>, three actions reduce exposure by{' '}
        <span className="mono" style={{ color: 'var(--bone)' }}>~$2.4M</span>:
      </div>
      {[
        { n: '01', t: 'Pause CRC stock-up', d: 'Defer 1,200 MT order; re-quote in 30d', amt: '−$1.0M' },
        { n: '02', t: 'Lock argon contract', d: 'Linde 9-day quote validity', amt: '−$0.3M' },
        { n: '03', t: 'Diversify Han Steel', d: 'Move 30% to Voestalpine fallback', amt: '−$1.1M' },
      ].map((a, i) => (
        <div key={a.n} className="row-hover" style={{
          display: 'grid', gridTemplateColumns: '24px 1fr auto',
          gap: 10, padding: '12px 16px',
          borderTop: '1px solid var(--line-soft)',
          alignItems: 'flex-start', cursor: 'pointer',
        }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{a.n}</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--bone)', marginBottom: 2 }}>{a.t}</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{a.d}</div>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--good)' }}>{a.amt}</span>
        </div>
      ))}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
        <Btn kind="ghost" sm full>Open in Advisor →</Btn>
      </div>
    </div>
  );
}

function ProcurementPage() {
  const [tab, setTab] = React.useState('materials');
  return (
    <PrescientShell
      active="procurement"
      title="Procurement"
      breadcrumb={['Operations']}
    >
      <div style={{ padding: '24px 32px 60px', maxWidth: 1600, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
          {[
            { id: 'materials', name: 'Materials', count: 142 },
            { id: 'suppliers', name: 'Suppliers', count: 47 },
            { id: 'rfqs', name: 'RFQs', count: 9 },
            { id: 'pos', name: 'Purchase orders', count: 38 },
            { id: 'commodities', name: 'Commodities' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'transparent', border: 0, padding: '10px 16px',
              fontSize: 12.5, fontWeight: 500,
              color: tab === t.id ? 'var(--bone)' : 'var(--soft)',
              cursor: 'pointer', position: 'relative', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.name}
              {t.count !== undefined && <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{t.count}</span>}
              {tab === t.id && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 1, background: 'var(--signal)' }} />}
            </button>
          ))}
        </div>

        <ProcurementSignalBar />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div>
            <ProcurementToolbar />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: 'var(--muted)' }}>
              <span><span className="mono" style={{ color: 'var(--bone)' }}>9</span> of <span className="mono" style={{ color: 'var(--bone)' }}>142</span> materials · sorted by risk</span>
              <span className="mono">Updated 14:31 PT</span>
            </div>
            <MaterialsTable />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <AdvisorCard />
            <RfqRail />
          </div>
        </div>
      </div>
    </PrescientShell>
  );
}

window.ProcurementPage = ProcurementPage;
