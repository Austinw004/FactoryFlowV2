// Brand mark for the sidebar header. Two variants share one component:
//
//   - "triangle"  — eye-in-triangle, drawn as inline SVG. Faster, accessible,
//                   no canvas tax. Good default.
//   - "globe"     — slow-rotating dotted globe, drawn on a 2D canvas with a
//                   procedurally-rendered orthographic projection. Visually
//                   richer; the spin advertises that the platform is "live".
//
// The variant is configurable at runtime via window.__BRAND so non-engineers
// can A/B test from the browser console without a redeploy. Defaults to
// "globe" — that's what shipped in the design.
//
// Why not a static logo PNG? Two reasons. (1) Sharp at any DPR without
// shipping multiple raster sizes. (2) The globe variant communicates
// "always-on telemetry" in a way a static mark can't, and that matches the
// product positioning. The cost is ~6 KB of JS — acceptable.

import { useEffect, useRef } from "react";

type BrandVariant = "triangle" | "globe";
interface BrandConfig {
  mark: BrandVariant;
  globeColor: string;
  globeSpeed: number; // seconds per full rotation; higher = slower
}

declare global {
  interface Window {
    __BRAND?: Partial<BrandConfig>;
  }
}

interface PrescientMarkProps {
  size?: number;
  className?: string;
}

export function PrescientMark({ size = 18, className = "" }: PrescientMarkProps) {
  // Resolve the variant + color + speed once per render. Reading window
  // here rather than at module scope keeps SSR and tests safe (window may
  // not exist at import time).
  const cfg: BrandConfig = {
    mark: (typeof window !== "undefined" ? window.__BRAND?.mark : undefined) ?? "globe",
    globeColor:
      (typeof window !== "undefined" ? window.__BRAND?.globeColor : undefined) ?? "#A1A4AB",
    globeSpeed: Math.max(
      1,
      Number(typeof window !== "undefined" ? window.__BRAND?.globeSpeed : 8) || 8,
    ),
  };

  if (cfg.mark === "triangle") {
    // Eye-in-triangle — the original Prescient Labs mark. Outline triangle
    // with a small filled circle as the pupil. Uses currentColor so callers
    // can recolor by setting `color` on the wrapper.
    const half = size / 2;
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={className}
        aria-label="Prescient Labs"
        role="img"
      >
        <polygon
          points={`${half},2 ${size - 2},${size - 2} 2,${size - 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
        />
        <circle cx={half} cy={size * 0.62} r={size * 0.12} fill="currentColor" />
      </svg>
    );
  }

  return <GlobeMark size={size} color={cfg.globeColor} secondsPerRev={cfg.globeSpeed} className={className} />;
}

// Procedurally-rendered rotating globe. We don't use d3-geo or three.js — a
// few sin/cos calls and a coarse lat/long dot grid produce a recognizable
// continent silhouette at this size, and it ships zero extra dependencies.
//
// The projection: orthographic, viewer at the equator. We rotate the dot
// grid's longitude over time. Latitude bands are static; the visible
// hemisphere is the dots whose projected x is real (cos(lat) * sin(longRel) >= 0).
function GlobeMark({
  size,
  color,
  secondsPerRev,
  className,
}: {
  size: number;
  color: string;
  secondsPerRev: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render at 2x DPR for crisp dots on retina; never larger because the
    // mark is small and we're drawing a lot of dots per frame.
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const px = size * dpr;
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    const start = performance.now();
    const r = px / 2 - dpr; // leave 1px gutter so the silhouette doesn't clip

    function frame(t: number) {
      if (cancelled || !ctx) return;
      const elapsedSec = (t - start) / 1000;
      const longOffset = (elapsedSec / secondsPerRev) * Math.PI * 2;

      ctx.clearRect(0, 0, px, px);

      // Outline circle.
      ctx.beginPath();
      ctx.arc(px / 2, px / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = dpr;
      ctx.stroke();

      // Dot grid: sample latitude every 18°, longitude every 12°. Draw only
      // the visible hemisphere; alpha fades dots near the limb so the
      // silhouette feels three-dimensional.
      ctx.fillStyle = color;
      for (let lat = -78; lat <= 78; lat += 18) {
        const phi = (lat * Math.PI) / 180;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        for (let lon = 0; lon < 360; lon += 12) {
          const lambda = (lon * Math.PI) / 180 + longOffset;
          const cosLam = Math.cos(lambda);
          const sinLam = Math.sin(lambda);
          // Orthographic projection from a viewer at the equator
          // (lat0=0, lon0=0). Visible iff cos(lat)*cos(lambda) > 0.
          if (cosPhi * cosLam <= 0) continue;
          const x = px / 2 + r * cosPhi * sinLam;
          const y = px / 2 - r * sinPhi;
          // Limb fade: dots close to the edge dim out.
          const limb = cosPhi * cosLam; // 0 at limb, 1 at center
          ctx.globalAlpha = 0.25 + 0.6 * limb;
          ctx.beginPath();
          ctx.arc(x, y, dpr * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [size, color, secondsPerRev]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Prescient Labs"
      role="img"
    />
  );
}
