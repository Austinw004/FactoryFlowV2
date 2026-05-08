/* global React, ReactDOM */
// Brand-mark Tweaks. Hosts the floating panel, applies brand changes globally,
// and persists them via the EDITMODE-BEGIN block in the root HTML.

const { useState: __useState, useEffect: __useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mark": "globe",
  "globeColor": "#6A6E76",
  "globeSpeed": 5
}/*EDITMODE-END*/;

function applyBrand(t) {
  window.__BRAND = {
    mark: t.mark,
    globeColor: t.globeColor,
    globeSpeed: t.globeSpeed
  };
  window.dispatchEvent(new Event('__brand_change'));
}

// Apply ASAP so the first paint after load reflects persisted values.
applyBrand(TWEAK_DEFAULTS);

function TweaksApp() {
  const [t, setT] = __useState(TWEAK_DEFAULTS);
  const [active, setActive] = __useState(false);

  __useEffect(() => {
    const onMsg = (e) => {
      if (!e?.data?.type) return;
      if (e.data.type === '__activate_edit_mode') setActive(true);
      else if (e.data.type === '__deactivate_edit_mode') setActive(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  __useEffect(() => { applyBrand(t); }, [t]);

  function set(key, val) {
    setT((prev) => {
      const next = { ...prev, [key]: val };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
      return next;
    });
  }

  function close() {
    setActive(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  }

  if (!active) return null;

  const sw = (label, value) => (
    <button
      key={value}
      onClick={() => set('mark', value)}
      style={{
        flex: 1, height: 30, border: '1px solid var(--line)',
        background: t.mark === value ? 'var(--panel-2)' : 'transparent',
        color: t.mark === value ? 'var(--bone)' : 'var(--soft)',
        fontFamily: 'inherit', fontSize: 11.5, letterSpacing: '-0.005em',
        borderRadius: 3, cursor: 'pointer'
      }}>{label}</button>);

  return (
    <div className="prescient" style={{
      position: 'fixed', right: 16, bottom: 16, width: 280,
      background: 'var(--ink-deep)', border: '1px solid var(--line)',
      borderRadius: 6, padding: 14, zIndex: 99999,
      boxShadow: '0 10px 32px rgba(0,0,0,0.4)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--bone)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bone)' }}>Tweaks</div>
        <button onClick={close} aria-label="Close" style={{
          width: 22, height: 22, background: 'transparent', border: '1px solid var(--line)',
          color: 'var(--soft)', borderRadius: 3, cursor: 'pointer', fontSize: 12, lineHeight: 1
        }}>×</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Brand mark</div>
        <div style={{ fontSize: 11.5, color: 'var(--soft)', letterSpacing: '-0.005em' }}>Animated globe</div>
      </div>

      <div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--soft)' }}>Globe color</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{t.globeColor}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#A1A4AB', '#6A6E76', '#D6D6D8', '#F2F2F2', '#CC785C'].map((c) => (
              <button key={c} onClick={() => set('globeColor', c)} aria-label={c} style={{
                width: 24, height: 24, borderRadius: 999,
                background: c, border: t.globeColor === c ? '2px solid var(--bone)' : '1px solid var(--line)',
                cursor: 'pointer', padding: 0
              }} />
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--soft)' }}>Spin speed</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{t.globeSpeed}s / rev</span>
          </div>
          <input type="range" min="2" max="20" step="1" value={t.globeSpeed}
            onChange={(e) => set('globeSpeed', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--signal)' }} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 10, fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Affects the brand mark in the sidebar and any topbar references.
      </div>
    </div>);
}

const __tweaksRoot = document.createElement('div');
document.body.appendChild(__tweaksRoot);
ReactDOM.createRoot(__tweaksRoot).render(<TweaksApp />);
