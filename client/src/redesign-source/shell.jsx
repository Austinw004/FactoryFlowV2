/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// =====================================================
// PRESCIENT SHELL — sidebar + topbar + content frame
// Maps to: <AppSidebar /> + <Header /> + page wrappers
// =====================================================

// Eye-in-triangle mark (Prescient logo) OR a true rotating globe with all
// continents drawn from real world topology. The globe variant uses d3-geo
// orthographic projection on a canvas; the canvas is mounted via a ref.
function PrescientMark({ size = 18, color = "#F2F2F2" }) {
  const [, force] = useState(0);
  const canvasRef = useRef(null);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    window.addEventListener('__brand_change', fn);
    return () => window.removeEventListener('__brand_change', fn);
  }, []);

  const cfg = (window.__BRAND ||= { mark: 'triangle', globeColor: '#A1A4AB', globeSpeed: 8 });
  const mark = cfg.mark || 'triangle';
  const globeColor = cfg.globeColor || '#A1A4AB';
  const globeSpeed = Math.max(1, Number(cfg.globeSpeed) || 8);

  // Draw loop for globe canvas
  useEffect(() => {
    if (mark !== 'globe') {
      // mark is forced to globe globally; this guard is now defensive only
    }
    const cv = canvasRef.current;
    if (!cv) return;
    let raf;
    let cancelled = false;
    const px = Math.max(160, size * 8);
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext('2d');

    function ensureLoaded(cb) {
      if (window.__WORLD_LAND) return cb(window.__WORLD_LAND);
      if (window.__WORLD_LAND_LOADING) {
        window.__WORLD_LAND_LOADING.push(cb);
        return;
      }
      window.__WORLD_LAND_LOADING = [cb];
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
        .then((r) => r.json())
        .then((topo) => {
          const land = window.topojson.feature(topo, topo.objects.land);
          window.__WORLD_LAND = land;
          window.__WORLD_LAND_LOADING.forEach((f) => f(land));
          window.__WORLD_LAND_LOADING = null;
        })
        .catch((e) => console.error('globe land load failed', e));
    }

    function start() {
      if (cancelled) return;
      if (!(window.d3 && window.d3.geoPath && window.topojson)) {
        raf = requestAnimationFrame(start);
        return;
      }
      ensureLoaded((world) => {
        if (cancelled) return;
        const proj = window.d3.geoOrthographic()
          .scale(px / 2 - 2)
          .translate([px / 2, px / 2])
          .rotate([0, -10, 0])
          .clipAngle(90);
        const path = window.d3.geoPath(proj, ctx);
        const grat = window.d3.geoGraticule10();

        function frame(t) {
          if (cancelled) return;
          proj.rotate([(t / 1000) * (360 / globeSpeed) % 360, -10, 0]);
          ctx.clearRect(0, 0, px, px);

          // Sphere disc
          ctx.beginPath();
          path({ type: 'Sphere' });
          ctx.fillStyle = '#EDEEF0';
          ctx.fill();

          // Graticule
          ctx.beginPath();
          path(grat);
          ctx.lineWidth = px / 220;
          ctx.strokeStyle = globeColor;
          ctx.globalAlpha = 0.45;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Continents
          ctx.beginPath();
          path(world);
          ctx.fillStyle = globeColor;
          ctx.fill();

          // Inner shading
          const grad = ctx.createRadialGradient(
            px * 0.36, px * 0.34, px * 0.05,
            px * 0.5, px * 0.5, px * 0.55);

          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.22)');
          ctx.beginPath();
          path({ type: 'Sphere' });
          ctx.fillStyle = grad;
          ctx.fill();

          // Edge ring
          ctx.beginPath();
          path({ type: 'Sphere' });
          ctx.lineWidth = px / 180;
          ctx.strokeStyle = '#6A6E76';
          ctx.stroke();

          raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      });
    }

    start();
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [mark, globeColor, globeSpeed, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block', borderRadius: '50%' }}
      aria-hidden="true" />);
}

// Lucide-ish icons inline. Stroke 1.5, currentColor.
const Icon = {
  Dashboard: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>,
  Trend: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></svg>,
  Bot: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 12h.01M15 12h.01" /><path d="M12 4v3M8 19v2M16 19v2" /></svg>,
  Bulb: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c1 1 2 2 2 3.5h4c0-1.5 1-2.5 2-3.5A6 6 0 0 0 12 2z" /></svg>,
  Alert: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Cart: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>,
  Network: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v3M12 10 6.5 17.5M12 10l5.5 7.5" /></svg>,
  Wrench: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" /></svg>,
  Plug: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 7v4M15 7v4M6 11h12v3a6 6 0 0 1-12 0zM12 20v2" /></svg>,
  Settings: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  Search: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  Bell: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "17px" }}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" /></svg>,
  Plus: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>,
  X: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  Play: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="currentColor"><path d="M6 4l14 8-14 8z" /></svg>,
  Filter: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h18l-7 9v6l-4 2v-8z" /></svg>,
  ArrowRight: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  ArrowUp: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
  ArrowDown: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>,
  Send: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  Paperclip: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.5 12.4 21a5 5 0 1 1-7-7L14 5.5a3.5 3.5 0 1 1 5 5L10.4 19a2 2 0 1 1-3-3l8-8" /></svg>,
  Sparkle: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6 8 8M16 16l2.4 2.4M5.6 18.4 8 16M16 8l2.4-2.4" /></svg>,
  Doc: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  Bookmark: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
  History: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" /><path d="M12 7v5l3 2" /></svg>,
  Copy: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Up: (p) => <svg viewBox="0 0 24 24" width={p.s || 10} height={p.s || 10} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 15 6-6 6 6" /></svg>,
  Down: (p) => <svg viewBox="0 0 24 24" width={p.s || 10} height={p.s || 10} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg>,
  Dot: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="currentColor"><circle cx="12" cy="12" r="3" /></svg>,
  Refresh: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 3 21 9 15 9" /></svg>,
  External: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  Globe: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  Box: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>,
  Truck: (p) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /></svg>
};

// ============== ATOMS ==============

function Eyebrow({ children, style }) {
  return <div className="eyebrow" style={{ ...style, color: "rgb(255, 255, 255)", fontSize: "1px" }}>{children}</div>;
}

function Hairline({ style }) {
  return <div className="hairline" style={style} />;
}

function Pill({ tone = "neutral", children, mono = false }) {
  const tones = {
    neutral: { bg: 'transparent', bd: 'var(--line)', fg: 'var(--soft)' },
    signal: { bg: 'var(--signal-bg)', bd: 'rgba(204,120,92,0.35)', fg: 'var(--signal)' },
    good: { bg: 'var(--good-bg)', bd: 'rgba(127,176,154,0.30)', fg: 'var(--good)' },
    bad: { bg: 'var(--bad-bg)', bd: 'rgba(196,122,110,0.35)', fg: 'var(--bad)' },
    bone: { bg: 'rgba(242,242,242,0.06)', bd: 'rgba(242,242,242,0.18)', fg: 'var(--bone)' }
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span className={mono ? 'mono' : ''} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', height: 20,
      background: t.bg, border: `1px solid ${t.bd}`, color: t.fg,
      fontSize: 11, fontWeight: 500, letterSpacing: mono ? '-0.01em' : '0.02em',
      borderRadius: 3
    }}>{children}</span>);

}

function StatusDot({ tone = "neutral" }) {
  const c = { neutral: 'var(--muted)', signal: 'var(--signal)', good: 'var(--good)', bad: 'var(--bad)' }[tone];
  return <span className="dot" style={{ background: c }} />;
}

function Btn({ kind = "ghost", children, onClick, icon, full, sm, ...rest }) {
  const styles = {
    primary: { bg: 'var(--bone)', fg: 'var(--ink)', bd: 'transparent' },
    signal: { bg: 'var(--signal)', fg: '#1A0E08', bd: 'transparent' },
    ghost: { bg: 'transparent', fg: 'var(--bone-dim)', bd: 'var(--line)' },
    quiet: { bg: 'transparent', fg: 'var(--soft)', bd: 'transparent' }
  };
  const s = styles[kind] || styles.ghost;
  return (
    <button onClick={onClick} {...rest} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
      height: sm ? 26 : 30, padding: sm ? '0 10px' : '0 12px',
      background: s.bg, color: s.fg, border: `1px solid ${s.bd === 'transparent' ? s.bg : s.bd}`,
      borderRadius: 3, fontSize: sm ? 11 : 12, fontWeight: 500, letterSpacing: '-0.005em',
      cursor: 'pointer', transition: 'all 120ms ease',
      width: full ? '100%' : 'auto',
      fontFamily: 'inherit'
    }}>
      {icon}{children}
    </button>);

}

function SectionHead({ eyebrow, title, action, divider = true, style }) {
  return (
    <div style={{ ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 12 }}>
        <div>
          {eyebrow && <Eyebrow style={{ marginBottom: 6 }}>{eyebrow}</Eyebrow>}
          {title && <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--bone)', letterSpacing: '-0.01em' }}>{title}</div>}
        </div>
        {action}
      </div>
      {divider && <Hairline />}
    </div>);

}

// Sparkline — 1px stroke, signal color when up, soft otherwise
function Spark({ data, w = 80, h = 22, color = 'var(--soft)' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data),max = Math.max(...data),rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * (w - 2) + 1;
    const y = h - 1 - (v - min) / rng * (h - 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline className="spark" points={pts} stroke={color} />
    </svg>);

}

// ============ SIDEBAR ============
// <AppSidebar />
function Sidebar({ active = "dashboard" }) {
  const sections = [
  { label: 'Overview', items: [
    { id: 'dashboard', name: 'Dashboard', icon: <Icon.Dashboard /> },
    { id: 'pilot', name: 'Pilot Revenue', icon: <Icon.Trend /> },
    { id: 'impact', name: 'Impact', icon: <Icon.Sparkle /> }]
  },
  { label: 'Intelligence', items: [
    { id: 'advisor', name: 'AI Advisor', icon: <Icon.Bot /> },
    { id: 'strategy', name: 'Strategy & Insights', icon: <Icon.Bulb /> },
    { id: 'events', name: 'Event Monitoring', icon: <Icon.Alert />, alert: 3 },
    { id: 'geo', name: 'Geopolitical Risk', icon: <Icon.Globe /> },
    { id: 'ma', name: 'M&A Intelligence', icon: <Icon.Network /> },
    { id: 'consortium', name: 'Industry Consortium', icon: <Icon.Doc /> }]
  },
  { label: 'Demand & Forecasting', items: [
    { id: 'demand', name: 'Demand Hub', icon: <Icon.Trend /> },
    { id: 'forecasting', name: 'Forecasting', icon: <Icon.Trend /> },
    { id: 'multihorizon', name: 'Multi-Horizon', icon: <Icon.Trend /> },
    { id: 'accuracy', name: 'Forecast Accuracy', icon: <Icon.History /> },
    { id: 'commodity', name: 'Commodity Forecasts', icon: <Icon.Box /> },
    { id: 'backtest', name: 'Backtesting', icon: <Icon.History /> },
    { id: 'dsr', name: 'Demand Signal Repository', icon: <Icon.Bookmark /> }]
  },
  { label: 'Supply & Procurement', items: [
    { id: 'supply', name: 'Supply Chain', icon: <Icon.Network /> },
    { id: 'suppliermap', name: 'Multi-Tier Mapping', icon: <Icon.Network /> },
    { id: 'procurement', name: 'Procurement', icon: <Icon.Cart />, alert: 5 },
    { id: 'po', name: 'Automated PO', icon: <Icon.Doc /> },
    { id: 'allocation', name: 'Allocation', icon: <Icon.Box /> },
    { id: 'inventory', name: 'Inventory', icon: <Icon.Box /> },
    { id: 'invopt', name: 'Inventory Optimization', icon: <Icon.Sparkle /> }]
  },
  { label: 'Operations', items: [
    { id: 'opshub', name: 'Operations Hub', icon: <Icon.Wrench /> },
    { id: 'machinery', name: 'Machinery', icon: <Icon.Wrench /> },
    { id: 'maintenance', name: 'Predictive Maintenance', icon: <Icon.Wrench /> },
    { id: 'twin', name: 'Digital Twin', icon: <Icon.Box /> }]
  },
  { label: 'Automation', items: [
    { id: 'playbooks', name: 'Action Playbooks', icon: <Icon.Sparkle /> },
    { id: 'automations', name: 'Automations', icon: <Icon.Bot /> }]
  }];

  const bottom = [
  { id: 'integrations', name: 'Integrations', icon: <Icon.Plug /> },
  { id: 'compliance', name: 'Compliance', icon: <Icon.Doc /> },
  { id: 'settings', name: 'Settings', icon: <Icon.Settings /> }];

  return (
    <aside style={{
      width: 240, height: '100%',
      background: 'var(--ink-deep)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      {/* Brand */}
      <div style={{ height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
        <PrescientMark size={22} color="var(--bone)" />
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.16em', color: 'var(--bone)' }}>PRESCIENT LABS</div>
      </div>
      {/* Nav */}
      <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '14px 8px 8px' }}>
        {sections.map((sec) =>
        <div key={sec.label} style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ padding: '0 12px 6px', fontSize: 9 }}>{sec.label}</div>
            {sec.items.map((it) => {
            const isActive = it.id === active;
            return (
              <div key={it.id} style={{ position: 'relative' }}>
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 7, width: 2, height: 16, background: 'var(--signal)' }} />}
                  <div className={isActive ? '' : 'row-hover'} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 12px', height: 30,
                  color: isActive ? 'var(--bone)' : 'var(--soft)',
                  background: isActive ? 'var(--panel)' : 'transparent',
                  fontSize: 12.5, fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer', borderRadius: 3, marginLeft: 2,
                  transition: 'background 120ms'
                }}>
                    <span style={{ color: isActive ? 'var(--bone)' : 'var(--muted)', display: 'flex' }}>{it.icon}</span>
                    <span style={{ flex: 1 }}>{it.name}</span>
                    {it.alert &&
                  <span className="mono" style={{ fontSize: 10, color: 'var(--signal)', background: 'var(--signal-bg)', padding: '1px 5px', borderRadius: 2, border: '1px solid rgba(204,120,92,0.25)' }}>{it.alert}</span>
                  }
                  </div>
                </div>);

          })}
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 8px 12px' }}>
        {bottom.map((it) =>
        <div key={it.id} className="row-hover" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', height: 28, color: 'var(--soft)',
          fontSize: 12, cursor: 'pointer', borderRadius: 3
        }}>
            <span style={{ color: 'var(--muted)', display: 'flex' }}>{it.icon}</span>
            <span>{it.name}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, padding: '12px 12px 4px' }}>
          <div className="eyebrow" style={{ marginBottom: 6, fontSize: 9 }}>Operator</div>
          <div style={{ fontSize: 12.5, color: 'var(--bone)' }}>M. Okafor</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Ridgeview Industrial</div>
        </div>
      </div>
    </aside>);

}

// ============ TOPBAR ============
// <Header /> — single Refresh, optional left-of-Refresh extras via `right`
function Topbar({ title, breadcrumb = [], right, timestamp = "14:32 PT", liveLabel = "Apr 26" }) {
  return (
    <div style={{
      height: 56, padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--line)', background: 'var(--ink)',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11.5 }}>
          {breadcrumb.map((b, i) =>
          <React.Fragment key={i}>
              <span>{b}</span>
              <span style={{ opacity: 0.5 }}>/</span>
            </React.Fragment>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--bone)', letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="dot" style={{ background: 'var(--good)', width: 5, height: 5, boxShadow: '0 0 0 2px rgba(127,176,154,0.18)' }} />
          <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>Live</span>
          <span className="mono" style={{ color: 'var(--soft)', fontSize: 11 }}>· {liveLabel} {timestamp}</span>
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />
        {right}
        <Btn kind="ghost" sm icon={<Icon.Refresh s={11} />}>Refresh</Btn>
        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />
        <button style={{
          background: 'transparent', border: '1px solid var(--line)', color: 'var(--soft)',
          width: 30, height: 30, borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
        }}>
          <Icon.Bell />
          <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: 'var(--signal)' }} />
        </button>
        <div style={{
          width: 28, height: 28, borderRadius: 3, background: 'var(--panel-2)',
          border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 500, color: 'var(--bone)', letterSpacing: 0
        }}>MO</div>
      </div>
    </div>);
}

// =========== SHELL WRAPPER ===========
function PrescientShell({ active, title, breadcrumb, topRight, children }) {
  return (
    <div className="prescient" style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--ink)' }}>
      <Sidebar active={active} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar title={title} breadcrumb={breadcrumb} right={topRight} />
        <div style={{ flex: 1, overflowY: 'auto' }} className="scroll-thin">
          {children}
        </div>
      </div>
    </div>);

}

// ============ SHARED PAGE PRIMITIVES ============

// Page hero strip — eyebrow + headline + meta line. Used at top of most pages.
function PageHero({ eyebrow, headline, sub, meta = [], action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 24 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <Eyebrow style={{ marginBottom: 10 }}>{eyebrow}</Eyebrow>}
        {headline && (
          <div className="hero" style={{ fontSize: 28, maxWidth: 820 }}>
            {headline}
            {sub && <span style={{ color: 'var(--soft)' }}> {sub}</span>}
          </div>
        )}
        {meta.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
            {meta.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>·</span>}
                <span>{m}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// Tabs row — borderBottom 1px line, signal underline on active
function Tabs({ tabs, value, onChange, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{
          background: 'transparent', border: 0, padding: '10px 16px',
          fontSize: 12.5, fontWeight: 500,
          color: value === t.id ? 'var(--bone)' : 'var(--soft)',
          cursor: 'pointer', position: 'relative', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {t.icon}
          {t.name}
          {t.count !== undefined && <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{t.count}</span>}
          {value === t.id && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 1, background: 'var(--signal)' }} />}
        </button>
      ))}
      {right && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
    </div>
  );
}

// Generic KPI cell — consistent across all pages
function Kpi({ label, value, suffix, delta, deltaTone = 'neutral', spark, sparkColor, footnote, mono = true }) {
  return (
    <div style={{ background: 'var(--panel)', padding: '20px 22px 18px' }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
        <div className="display" style={{ fontSize: 28, lineHeight: 1, color: 'var(--bone)' }}>
          <span className={mono ? 'mono' : 'num'}>{value}</span>
          {suffix && <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4, fontWeight: 400 }}>{suffix}</span>}
        </div>
        {spark && <Spark data={spark} color={sparkColor || 'var(--soft)'} w={64} h={20} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        {delta && (
          <span className="mono" style={{
            fontSize: 11,
            color: deltaTone === 'good' ? 'var(--good)' : deltaTone === 'bad' ? 'var(--bad)' : 'var(--muted)',
            display: 'inline-flex', alignItems: 'center', gap: 3
          }}>
            {deltaTone === 'good' && <Icon.Up s={9} />}
            {deltaTone === 'bad' && <Icon.Down s={9} />}
            {delta}
          </span>
        )}
        {footnote && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{footnote}</span>}
      </div>
    </div>
  );
}

// KpiStrip — horizontal grid of N kpis, hairline gutters
function KpiStrip({ items, columns }) {
  const cols = columns || items.length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
      {items.map((it, i) => <Kpi key={i} {...it} />)}
    </div>
  );
}

// Card — single panel with optional header
function Card({ title, eyebrow, action, children, padded = true, style }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', ...style }}>
      {(title || eyebrow || action) && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            {eyebrow && <Eyebrow style={{ marginBottom: title ? 4 : 0 }}>{eyebrow}</Eyebrow>}
            {title && <div style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 500 }}>{title}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={padded ? { padding: '16px 18px' } : null}>{children}</div>
    </div>
  );
}

// RegimeBadge — the signature "FDR 2.21 · Imbalanced Excess" pill cluster
function RegimeBadge({ size = 'md', showSince = true }) {
  const fz = size === 'sm' ? 11 : 13;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <Pill tone="signal" mono>FDR 2.21</Pill>
      <span style={{ fontSize: fz, color: 'var(--bone)', fontWeight: 500, letterSpacing: '-0.01em' }}>Imbalanced Excess</span>
      {showSince && <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>since Apr 11</span>}
    </div>
  );
}

// EvidencePanel — for any "why we said this" composition. Source rows + citations.
function EvidencePanel({ title = 'Evidence', sources = [], confidence }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>{title}</Eyebrow>
        {confidence !== undefined && (
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            confidence <span style={{ color: 'var(--bone)' }}>{confidence.toFixed(2)}</span>
          </span>
        )}
      </div>
      {sources.map((s, i) => (
        <div key={i} className="row-hover" style={{
          display: 'grid', gridTemplateColumns: '20px 1fr auto',
          gap: 10, padding: '10px 16px',
          borderBottom: i < sources.length - 1 ? '1px solid var(--line-soft)' : 'none',
          alignItems: 'center', cursor: 'pointer'
        }}>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>[{i + 1}]</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--bone)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.source}{s.time ? ' · ' + s.time : ''}</div>
          </div>
          <Icon.External s={11} />
        </div>
      ))}
    </div>
  );
}

// StarterChips — conversational starter prompts (used on Advisor + many empty states)
function StarterChips({ groups }) {
  return (
    <div style={{ width: '100%' }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 20 : 0 }}>
          {g.label && <div className="eyebrow" style={{ marginBottom: 10 }}>{g.label}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {g.prompts.map((p, i) => (
              <button key={i} className="row-hover" style={{
                background: 'var(--panel)', border: 0, padding: '14px 18px',
                color: 'var(--bone-dim)', fontSize: 13, fontFamily: 'inherit',
                textAlign: 'left', cursor: 'pointer', letterSpacing: '-0.005em',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
              }}>
                <span>{p}</span>
                <Icon.ArrowRight s={12} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Row helpers for tables
function TableHead({ columns, gridTpl }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: gridTpl,
      gap: 12, padding: '10px 18px',
      borderBottom: '1px solid var(--line)', background: 'var(--panel-2)',
    }}>
      {columns.map((c, i) => (
        <div key={i} className="eyebrow" style={{ fontSize: 9, textAlign: c.num ? 'right' : 'left' }}>{c.label}</div>
      ))}
    </div>
  );
}

// Search/filter toolbar
function Toolbar({ children, search = true, searchPlaceholder = 'Search…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      {search && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 30, padding: '0 10px',
          background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 3,
          flex: '0 0 280px',
        }}>
          <Icon.Search s={12} />
          <input placeholder={searchPlaceholder}
            style={{ flex: 1, background: 'transparent', border: 0, color: 'var(--bone)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 2 }}>⌘K</span>
        </div>
      )}
      {children}
    </div>
  );
}

// FilterChip — pulled from procurement, generalized
function FilterChip({ label, value, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 26, padding: '0 10px',
      background: active ? 'var(--panel-2)' : 'transparent',
      border: '1px solid var(--line)',
      color: active ? 'var(--bone)' : 'var(--soft)',
      fontSize: 11, borderRadius: 3, cursor: 'pointer',
      fontFamily: 'inherit',
    }}>
      {label && <span style={{ color: 'var(--muted)' }}>{label}</span>}
      <span>{value}</span>
      <Icon.Down s={9} />
    </button>
  );
}

// Page wrapper to ensure every page uses identical padding + max-width
function PageBody({ children, max = 1600, pad = '28px 32px 60px' }) {
  return <div style={{ padding: pad, maxWidth: max, margin: '0 auto' }}>{children}</div>;
}

// expose
Object.assign(window, {
  PrescientShell, PrescientMark, Icon, Eyebrow, Hairline, Pill, StatusDot, Btn, SectionHead, Spark,
  PageHero, Tabs, Kpi, KpiStrip, Card, RegimeBadge, EvidencePanel, StarterChips, TableHead, Toolbar, FilterChip, PageBody
});