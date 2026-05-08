/* global React, PrescientShell, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark */

// ============================================================
// AI ADVISOR — clean conversation surface
// Components mapped: <AdvisorComposer /> <ThreadList /> <ConversationView />
//   <ContextRail /> <SuggestedPrompts /> <CitationChip /> <AttachmentBar />
// Empty state per brief — no example chat, no triangle on every screen.
// ============================================================

function ThreadItem({ title, snippet, time, active }) {
  return (
    <div className={active ? '' : 'row-hover'} style={{
      padding: '12px 14px',
      background: active ? 'var(--panel-2)' : 'transparent',
      borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
      cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12.5, color: 'var(--bone)', fontWeight: active ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>{time}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet}</div>
    </div>);

}

function ThreadList() {
  const groups = [
  { label: 'Today', items: [
    { t: 'Q2 procurement under regime shift', s: 'Defer non-critical $2.4M, lock argon...', time: '14:08', active: true },
    { t: 'Han Steel concentration risk', s: 'Suggested fallback contract clauses', time: '11:24' }]
  },
  { label: 'This week', items: [
    { t: 'Forecast variance · SKU-3401', s: 'Why is demand outpacing 3-week trail...', time: 'Wed' },
    { t: 'Slurry RFQ · 3-vendor compare', s: 'Cabot vs DuPont vs Versum side-by-side', time: 'Tue' },
    { t: 'Tin counter-cyclical window', s: 'Forward-buy economics through Q3', time: 'Mon' }]
  },
  { label: 'Earlier', items: [
    { t: 'Audit memo · Voestalpine', s: 'Drafted redlines for legal review', time: 'Apr 18' },
    { t: 'Supplier scoring rubric', s: 'Weights for tier-1 critical materials', time: 'Apr 15' }]
  }];

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="scroll-thin">
      {groups.map((g) =>
      <div key={g.label}>
          <div className="eyebrow" style={{ padding: '14px 14px 6px', fontSize: 9 }}>{g.label}</div>
          {g.items.map((it, i) => <ThreadItem key={i} title={it.t} snippet={it.s} time={it.time} active={it.active} />)}
        </div>
      )}
    </div>);

}

// Left rail
function AdvisorRail() {
  return (
    <aside style={{
      width: 280, borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--ink)', flexShrink: 0
    }}>
      <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
        <Btn kind="ghost" full icon={<Icon.Plus s={12} />}>New conversation</Btn>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, height: 36 }}>
        <Icon.Search s={11} />
        <input placeholder="Search conversations" style={{ flex: 1, background: 'transparent', border: 0, color: 'var(--bone)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
      </div>
      <ThreadList />
    </aside>);

}

// Suggested prompts — context-aware, grouped by intent
function SuggestedPrompts() {
  const groups = [
  { label: 'Operate', prompts: [
    'Walk me through the regime shift and what should change this week.',
    'Which open POs should I pause given current FDR?',
    'Draft a memo to my CFO summarizing this morning\u2019s state.']
  },
  { label: 'Investigate', prompts: [
    'Why has Han Steel\u2019s lead time moved from 21 to 34 days?',
    'Compare three vendors for CMP slurry on price, lead, and risk.',
    'Show forecast variance for SKU-3401 and the most likely drivers.']
  },
  { label: 'Plan', prompts: [
    'If FDR holds at 2.2 through Q3, what does my procurement plan look like?',
    'Stress-test Voestalpine fallback at 30%, 50%, 70% volumes.']
  }];

  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      {groups.map((g, gi) =>
      <div key={g.label} style={{ marginBottom: gi < groups.length - 1 ? 24 : 0 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{g.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {g.prompts.map((p, i) =>
          <button key={i} className="row-hover" style={{
            background: 'var(--panel)',
            border: 0, padding: '14px 18px',
            color: 'var(--bone-dim)', fontSize: 13, fontWeight: 400,
            fontFamily: 'inherit', textAlign: 'left',
            cursor: 'pointer', letterSpacing: '-0.005em',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
          }}>
                <span>{p}</span>
                <Icon.ArrowRight s={12} />
              </button>
          )}
          </div>
        </div>
      )}
    </div>);

}

// Composer — claude.ai-style: roomy textarea, attach + tools row, send button
function AdvisorComposer({ centered = false }) {
  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 6,
        padding: '14px 16px 10px'
      }}>
        <div style={{
          fontSize: 14, color: 'var(--soft)', minHeight: 60, lineHeight: 1.55,
          fontFamily: 'inherit', letterSpacing: '-0.01em'
        }}>
          {centered ? 'Ask about regime, suppliers, forecasts, or procurement…' : 'Reply…'}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)'
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ background: 'transparent', border: 0, color: 'var(--soft)', padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, borderRadius: 3, fontFamily: 'inherit' }}>
              <Icon.Paperclip s={12} /> Attach
            </button>
            <button style={{ background: 'transparent', border: 0, color: 'var(--soft)', padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, borderRadius: 3, fontFamily: 'inherit' }}>
              <Icon.Box s={12} /> Tools
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>4</span>
            </button>
            <button style={{ background: 'transparent', border: 0, color: 'var(--soft)', padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, borderRadius: 3, fontFamily: 'inherit' }}>
              <Icon.Globe s={12} /> Live data
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>Claude · Sonnet 4.5</span>
            <button style={{
              width: 28, height: 28, borderRadius: 3,
              background: 'var(--bone)', color: 'var(--ink)',
              border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.4
            }}><Icon.Send s={12} /></button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 10.5, color: 'var(--muted)' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span>Connected: <span style={{ color: 'var(--bone-dim)' }}>FDR feed · Suppliers · Inventory · POs</span></span>
        </div>
        <span className="mono">Press <span style={{ color: 'var(--bone-dim)' }}>Enter</span> to send · <span style={{ color: 'var(--bone-dim)' }}>⇧Enter</span> for newline</span>
      </div>
    </div>);

}

// Right context rail — what the Advisor knows right now
function ContextRail() {
  return (
    <aside style={{
      width: 300, borderLeft: '1px solid var(--line)',
      padding: '20px 18px', flexShrink: 0,
      overflowY: 'auto'
    }} className="scroll-thin">
      <Eyebrow style={{ marginBottom: 10 }}>Working context</Eyebrow>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Current regime</div>
        <div style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>Imbalanced Excess</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill tone="signal" mono>FDR 2.21</Pill>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>since Apr 11</span>
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Sources</Eyebrow>
      <div style={{ marginBottom: 16 }}>
        {[
        { i: <Icon.Trend s={12} />, n: 'FDR live feed', d: '15 economic APIs · 30s' },
        { i: <Icon.Box s={12} />, n: 'Inventory state', d: '142 materials' },
        { i: <Icon.Truck s={12} />, n: 'Supplier mapping', d: '47 suppliers · T1+T2' },
        { i: <Icon.Doc s={12} />, n: 'Open POs · RFQs', d: '38 POs · 9 RFQs' }].
        map((s, i) =>
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 10,
          padding: '10px 0',
          borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none',
          alignItems: 'center'
        }}>
            <span style={{ color: 'var(--muted)' }}>{s.i}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--bone)' }}>{s.n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.d}</div>
            </div>
            <StatusDot tone="good" />
          </div>
        )}
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Pinned threads</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['Q2 strategy under regime shift', 'Han Steel risk · open', 'Tin forward-buy memo'].map((p, i) =>
        <div key={i} className="row-hover" style={{ padding: '8px 10px', fontSize: 11.5, color: 'var(--soft)', cursor: 'pointer', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.Bookmark s={11} />{p}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, padding: 14, background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Confidentiality</div>
        <div style={{ fontSize: 11, color: 'var(--soft)', lineHeight: 1.55 }}>
          Conversations stay within your tenant. Outputs cite sources from your live data.
        </div>
      </div>
    </aside>);

}

function AdvisorPage() {
  return (
    <PrescientShell
      active="advisor"
      title="AI Advisor"
      breadcrumb={['Intelligence']}>
      
      <div style={{ display: 'flex', height: '100%', minHeight: 800 }}>
        <AdvisorRail />

        {/* Center column — empty state with composer + suggestions */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px' }}>
            <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <Eyebrow style={{ marginBottom: 14, justifyContent: 'center' }}>Advisor · Claude Sonnet 4.5</Eyebrow>
                <div className="hero" style={{ fontSize: 45, lineHeight: 1.1 }}>What will we do today, M.?</div>
              </div>

              <AdvisorComposer centered />
              <SuggestedPrompts />
            </div>
          </div>
        </div>

        <ContextRail />
      </div>
    </PrescientShell>);

}

window.AdvisorPage = AdvisorPage;