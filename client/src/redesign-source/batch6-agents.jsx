/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
   PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, Toolbar, FilterChip, PageBody,
   BarChart */

// ============================================================
// BATCH 6 — Agents
//   AgentMonitoring · AgentRegistry · SwarmOrchestration
// ============================================================

// =====================================================
// 1. AgentMonitoring
// =====================================================
function AgentMonitoringPage() {
  const agents = [
    { id: 'AG-Procure', n: 'Procurement Auditor', task: 'Review POs · flag anomalies', runs: 1284, succ: 99.4, lat: '420ms', conf: 0.86, s: 'green' },
    { id: 'AG-Regime', n: 'Regime Sentinel', task: 'Recompute FDR · alert', runs: 720, succ: 100, lat: '180ms', conf: 0.92, s: 'green' },
    { id: 'AG-Forecast', n: 'Forecast Re-trainer', task: 'Weekly retrain · ensemble', runs: 4, succ: 100, lat: '8.4h', conf: 0.88, s: 'green' },
    { id: 'AG-Risk', n: 'Supplier Risk Scout', task: 'Scrape filings · score risk', runs: 412, succ: 96.8, lat: '2.1s', conf: 0.74, s: 'amber' },
    { id: 'AG-Trace', n: 'Lot Traceability', task: 'Verify chain-of-custody', runs: 1820, succ: 98.6, lat: '380ms', conf: 0.82, s: 'green' },
    { id: 'AG-Trade', n: 'Tariff Watcher', task: 'Monitor HTS rulings', runs: 168, succ: 99.4, lat: '1.4s', conf: 0.78, s: 'green' },
    { id: 'AG-Outreach', n: 'Supplier Outreach', task: 'OTD scorecards · email', runs: 47, succ: 100, lat: '320ms', conf: 0.84, s: 'green' },
    { id: 'AG-Drawback', n: 'Drawback Drafter', task: 'Quarterly file prep', runs: 4, succ: 100, lat: '12m', conf: 0.82, s: 'green' },
    { id: 'AG-Evidence', n: 'Evidence Collector', task: 'Source-link advisor briefs', runs: 8400, succ: 99.8, lat: '60ms', conf: 0.90, s: 'green' },
    { id: 'AG-Customer', n: 'Customer Attribution', task: 'Match new lots → orders', runs: 84, succ: 92.4, lat: '180ms', conf: 0.74, s: 'amber' },
  ];

  return (
    <PrescientShell active="agents" title="Agent Monitoring" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Agents · 10 active"
          headline="Every agent has a leash, a budget, a logbook."
          sub="Two agents amber. No reds."
          meta={['18 agents registered', '8 in shadow eval', <span key="t" className="mono">last sync 14:31</span>]}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>Register agent</Btn>} />

        <KpiStrip items={[
          { label: 'Active', value: '10' },
          { label: 'Shadow eval', value: '8' },
          { label: 'Avg success', value: '98.6', suffix: '%' },
          { label: 'Avg conf', value: '0.83' },
          { label: 'Open incidents', value: '2', delta: 'amber', deltaTone: 'signal' },
        ]} />

        <div style={{ marginTop: 32 }}>
          <Card eyebrow="Active agents" padded={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(180px, 1fr) minmax(220px, 1.4fr) 80px 80px 80px 60px 60px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
              {['ID', 'Agent', 'Task', 'Runs', 'Success', 'Latency', 'Conf', 'Status'].map((h) => (
                <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
              ))}
            </div>
            {agents.map((r, i, a) => (
              <div key={r.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '120px minmax(180px, 1fr) minmax(220px, 1.4fr) 80px 80px 80px 60px 60px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.id}</span>
                <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.n}</span>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.task}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.runs.toLocaleString()}</span>
                <span className="mono" style={{ fontSize: 11, color: r.succ >= 99 ? 'var(--good)' : r.succ >= 95 ? 'var(--signal)' : 'var(--bad)', textAlign: 'right' }}>{r.succ}%</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'right' }}>{r.lat}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'right' }}>{r.conf.toFixed(2)}</span>
                <Pill tone={r.s === 'green' ? 'good' : r.s === 'amber' ? 'signal' : 'bad'} mono>{r.s}</Pill>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <Card eyebrow="Activity stream · last hour" padded={false}>
            {[
              { t: '14:31', a: 'Regime Sentinel', e: 'Recomputed FDR 2.21 · no change', tone: 'good' },
              { t: '14:28', a: 'Procurement Auditor', e: 'Reviewed PO-9921 · flagged regime HOLD', tone: 'signal' },
              { t: '14:22', a: 'Risk Scout', e: 'Han Steel filing · revenue −12% YoY · scored', tone: 'bad' },
              { t: '14:14', a: 'Tariff Watcher', e: 'DOC opens AD review · cold-rolled · VN', tone: 'signal' },
              { t: '14:08', a: 'Lot Trace', e: 'HEAT-482-118 · customs cleared', tone: 'good' },
              { t: '13:58', a: 'Customer Attribution', e: 'Match failure · lot 482-119 · queued for review', tone: 'signal' },
              { t: '13:42', a: 'Evidence Collector', e: 'Linked 12 sources to advisor brief #2814', tone: 'good' },
              { t: '13:14', a: 'Procurement Auditor', e: 'Auto-routed PO-9920 · Voestalpine', tone: 'good' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 12px 160px 1fr', gap: 12, padding: '11px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <StatusDot tone={it.tone} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--soft)' }}>{it.a}</span>
                <span style={{ fontSize: 11.5, color: 'var(--bone)' }}>{it.e}</span>
              </div>
            ))}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card eyebrow="Confidence · 14 days" title="Across all agents">
              <BarChart h={120} data={[0.82, 0.83, 0.81, 0.84, 0.85, 0.84, 0.85, 0.86, 0.84, 0.85, 0.84, 0.83, 0.83, 0.84].map((v, i) => ({ l: `D${i + 1}`, v: v * 100 }))} color="var(--soft)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--soft)' }}>
                <span>14 days</span>
                <span className="mono" style={{ color: 'var(--good)' }}>μ 0.84</span>
              </div>
            </Card>
            <Card eyebrow="Open incidents" title="Amber · need attention" padded={false}>
              {[
                { a: 'Risk Scout', e: 'Filing parse · 1 source intermittent', t: '4h', tone: 'signal' },
                { a: 'Customer Attribution', e: 'Match accuracy 92% · below 95% target', t: '2d', tone: 'signal' },
              ].map((it, i, a) => (
                <div key={i} style={{ padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.a}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--soft)' }}>{it.e}</div>
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
// 2. AgentRegistry
// =====================================================
function AgentRegistryPage() {
  return (
    <PrescientShell active="registry" title="Agent Registry" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Registry · 18 agents"
          headline="Every agent has a contract. Scope, budget, escalation."
          sub="Eight in shadow eval before promotion."
          meta={['10 production', '8 shadow', '0 deprecated']}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>Register</Btn>} />

        <Toolbar searchPlaceholder="Search agent…">
          <FilterChip label="State" value="All" active />
          <FilterChip label="Owner" value="All" />
          <FilterChip label="Domain" value="All" />
        </Toolbar>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 110px 110px 130px 100px 80px 24px', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
            {['Agent', 'Owner', 'Domain', 'Scope', 'Budget · mo', 'State', ''].map((h) => (
              <div key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</div>
            ))}
          </div>
          {[
            { n: 'Procurement Auditor', own: 'M. Okafor', dom: 'Procurement', sc: 'Read POs · flag', bud: '$120', st: 'Production' },
            { n: 'Regime Sentinel', own: 'Platform', dom: 'Intelligence', sc: 'Recompute FDR', bud: '$80', st: 'Production' },
            { n: 'Forecast Re-trainer', own: 'Platform', dom: 'Forecasting', sc: 'Weekly retrain', bud: '$840', st: 'Production' },
            { n: 'Risk Scout', own: 'L. Park', dom: 'Suppliers', sc: 'Scrape · score', bud: '$240', st: 'Production' },
            { n: 'Lot Trace', own: 'Platform', dom: 'Traceability', sc: 'Verify lots', bud: '$60', st: 'Production' },
            { n: 'Tariff Watcher', own: 'Platform', dom: 'Trade', sc: 'Monitor HTS', bud: '$40', st: 'Production' },
            { n: 'Demand Probe v2', own: 'Platform', dom: 'Forecasting', sc: 'Driver discovery', bud: '$320', st: 'Shadow' },
            { n: 'Negotiation Coach', own: 'M. Okafor', dom: 'Procurement', sc: 'Quote analysis', bud: '$180', st: 'Shadow' },
            { n: 'Customer Attribution', own: 'Platform', dom: 'Traceability', sc: 'Match lots → orders', bud: '$60', st: 'Production' },
          ].map((r, i, a) => (
            <div key={r.n} className="row-hover" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 110px 110px 130px 100px 80px 24px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 12.5, color: 'var(--bone)' }}>{r.n}</span>
              <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{r.own}</span>
              <Pill tone="bone" mono>{r.dom}</Pill>
              <span style={{ fontSize: 11, color: 'var(--soft)' }}>{r.sc}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--bone)', textAlign: 'right' }}>{r.bud}</span>
              <Pill tone={r.st === 'Production' ? 'good' : 'signal'} mono>{r.st}</Pill>
              <Icon.ArrowRight s={11} />
            </div>
          ))}
        </div>
      </PageBody>
    </PrescientShell>
  );
}

// =====================================================
// 3. SwarmOrchestration
// =====================================================
function SwarmOrchestrationPage() {
  return (
    <PrescientShell active="swarm" title="Swarm Orchestration" breadcrumb={['Operations']}>
      <PageBody>
        <PageHero
          eyebrow="Swarms · 4 active"
          headline="When agents work together, declared and bounded."
          sub="Each swarm has a goal, a protocol, a kill-switch."
          meta={['18 agents available', '4 active swarms', <span key="t" className="mono">last sync 14:31</span>]}
          action={<Btn kind="primary" sm icon={<Icon.Plus s={11} />}>New swarm</Btn>} />

        <KpiStrip items={[
          { label: 'Active swarms', value: '4' },
          { label: 'Agents engaged', value: '14/18' },
          { label: 'Decisions · 24h', value: '94', delta: '88 auto · 6 escalated', deltaTone: 'good' },
          { label: 'Avg consensus', value: '0.86' },
          { label: 'Kill-switches fired', value: '0', delta: '30 days', deltaTone: 'good' },
        ]} />

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {[
            { n: 'Procurement coordination', goal: 'Auto-route POs while honoring regime + risk', members: ['Procurement Auditor', 'Regime Sentinel', 'Risk Scout'], state: 'active', dec: 47, csn: 0.88 },
            { n: 'Daily forecast brief', goal: 'Compose advisor brief from forecast + signals + macro', members: ['Forecast Re-trainer', 'Evidence Collector', 'Regime Sentinel'], state: 'active', dec: 28, csn: 0.92 },
            { n: 'Supplier health watch', goal: 'Monitor scoring · trigger outreach on slip', members: ['Risk Scout', 'Supplier Outreach', 'Lot Trace'], state: 'active', dec: 14, csn: 0.84 },
            { n: 'Quarterly compliance', goal: 'Drawback prep + traceability audit', members: ['Drawback Drafter', 'Lot Trace', 'Tariff Watcher'], state: 'scheduled', dec: 5, csn: 0.82 },
          ].map((s, i) => (
            <Card key={i} eyebrow="Swarm" title={s.n} padded={false}>
              <div style={{ padding: '0 18px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 12 }}>{s.goal}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.members.map(m => <Pill key={m} tone="bone" mono>{m}</Pill>)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: '14px 18px' }}>
                <div>
                  <Eyebrow>State</Eyebrow>
                  <div style={{ marginTop: 6 }}><Pill tone={s.state === 'active' ? 'good' : 'signal'} mono>{s.state}</Pill></div>
                </div>
                <div>
                  <Eyebrow>Decisions · 24h</Eyebrow>
                  <div className="mono" style={{ fontSize: 16, color: 'var(--bone)', fontWeight: 300, marginTop: 6 }}>{s.dec}</div>
                </div>
                <div>
                  <Eyebrow>Consensus</Eyebrow>
                  <div className="mono" style={{ fontSize: 16, color: 'var(--bone)', fontWeight: 300, marginTop: 6 }}>{s.csn.toFixed(2)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <Card eyebrow="Cross-agent consensus · this hour" title="Where agents agreed/disagreed" padded={false}>
            {[
              { ag: 'Procurement Auditor + Regime Sentinel', t: '14:28', dec: 'PO-9921 · HOLD', csn: 1.00, state: 'auto' },
              { ag: 'Risk Scout + Forecast Re-trainer', t: '14:14', dec: 'Han Steel score → 62 · widen forecast CI', csn: 0.92, state: 'auto' },
              { ag: 'Tariff Watcher + Procurement Auditor', t: '13:42', dec: 'Pause Tin RFQ · pending DOC', csn: 0.84, state: 'auto' },
              { ag: 'Customer Attribution + Lot Trace', t: '13:14', dec: 'Match lot 482-119 · queue for review', csn: 0.62, state: 'escalated' },
            ].map((it, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.5fr) 60px 1fr 70px 80px', gap: 12, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--soft)' }}>{it.ag}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.t}</span>
                <span style={{ fontSize: 12, color: 'var(--bone)' }}>{it.dec}</span>
                <span className="mono" style={{ fontSize: 11.5, color: it.csn >= 0.9 ? 'var(--good)' : it.csn >= 0.75 ? 'var(--signal)' : 'var(--bad)', textAlign: 'right' }}>{it.csn.toFixed(2)}</span>
                <Pill tone={it.state === 'auto' ? 'good' : 'signal'} mono>{it.state}</Pill>
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </PrescientShell>
  );
}

window.AgentMonitoringPage = AgentMonitoringPage;
window.AgentRegistryPage = AgentRegistryPage;
window.SwarmOrchestrationPage = SwarmOrchestrationPage;


Object.assign(window, { AgentMonitoringPage, AgentRegistryPage, SwarmOrchestrationPage });
