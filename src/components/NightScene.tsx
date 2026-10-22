"use client";

import { useEffect, useRef } from "react";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** A bare tree as stroked segments, grouped by thickness so each group is one path. */
function bareTree(x: number, y: number, height: number, seed: number) {
  const r = rng(seed);
  const groups = new Map<number, string>();
  const branch = (x0: number, y0: number, len: number, angle: number, width: number, depth: number) => {
    const x1 = x0 + Math.cos(angle) * len;
    const y1 = y0 + Math.sin(angle) * len;
    const w = Math.max(0.6, Math.round(width * 2) / 2);
    groups.set(w, (groups.get(w) ?? "") + `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
    if (depth === 0) return;
    const n = depth > 3 ? 2 : 2 + Math.round(r());
    for (let i = 0; i < n; i++) {
      const spread = 0.35 + r() * 0.45;
      const a = angle + (i - (n - 1) / 2) * spread + (r() - 0.5) * 0.3;
      branch(x1, y1, len * (0.62 + r() * 0.16), a, width * 0.66, depth - 1);
    }
  };
  branch(x, y, height * 0.38, -Math.PI / 2 + (r() - 0.5) * 0.12, height * 0.075, 6);
  return [...groups.entries()];
}

function Stars() {
  const r = rng(7);
  const stars = Array.from({ length: 26 }, () => ({ x: r() * 400, y: r() * 150, s: 1.6 + r() * 3.4 }));
  return (
    <g fill="#A88A4E">
      {stars.map((s, i) => (
        <path
          key={i}
          className={i % 4 === 0 ? "twinkle" : undefined}
          style={{ animationDelay: `${(i % 7) * 0.7}s`, transformOrigin: `${s.x}px ${s.y}px` }}
          d={`M${s.x} ${s.y - s.s}L${s.x + s.s * 0.28} ${s.y - s.s * 0.28}L${s.x + s.s} ${s.y}L${s.x + s.s * 0.28} ${s.y + s.s * 0.28}L${s.x} ${s.y + s.s}L${s.x - s.s * 0.28} ${s.y + s.s * 0.28}L${s.x - s.s} ${s.y}L${s.x - s.s * 0.28} ${s.y - s.s * 0.28}Z`}
        />
      ))}
    </g>
  );
}

const farTree = bareTree(340, 236, 120, 11);
const midTreeA = bareTree(70, 300, 230, 3);
const midTreeB = bareTree(392, 300, 190, 29);

/**
 * Layered paper-cut night scene for the cover window. Layers drift with the cursor, and
 * drift on their own when nobody is moving the mouse, so the kiosk never looks frozen.
 */
export default function NightScene({ still }: { still: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || still) return;
    let tx = 0, ty = 0, x = 0, y = 0;
    let lastMove = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      lastMove = performance.now();
    };
    const loop = (t: number) => {
      if (t - lastMove > 4000) {
        tx = Math.sin(t / 5200) * 0.6;
        ty = Math.cos(t / 7100) * 0.35;
      }
      x += (tx - x) * 0.05;
      y += (ty - y) * 0.05;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [still]);

  return (
    <div className="scene" ref={root} aria-hidden="true">
      <svg className="layer" style={{ "--depth": 2 } as React.CSSProperties} viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B1A1F" />
            <stop offset="0.7" stopColor="#2E2B33" />
            <stop offset="1" stopColor="#3B3740" />
          </linearGradient>
        </defs>
        <rect x="-40" y="-40" width="480" height="410" fill="url(#sky)" />
        <Stars />
      </svg>
      <svg className="layer" style={{ "--depth": 5 } as React.CSSProperties} viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice">
        <image href="/kit/crescent-moon.svg" x="250" y="22" width="92" height="92" />
      </svg>
      <svg className="layer cut" style={{ "--depth": 9 } as React.CSSProperties} viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice">
        <path d="M-40 250 C40 215 110 205 170 222 C230 238 300 196 440 214 L440 400 L-40 400 Z" fill="#433E47" />
        {/* hilltop house: steep gables, a tower and one lit window */}
        <g fill="#433E47">
          <path d="M150 226 L150 186 L166 170 L182 186 L182 226 Z" />
          <path d="M176 226 L176 176 L200 150 L224 176 L224 226 Z" />
          <path d="M206 186 L206 140 L213 120 L220 140 L220 186 Z" />
          <rect x="212" y="114" width="1.6" height="8" />
        </g>
        <rect x="193" y="186" width="7" height="10" fill="#C8742B" opacity="0.85" />
        <rect x="160" y="196" width="5" height="8" fill="#A88A4E" opacity="0.5" />
        <g stroke="#433E47" strokeLinecap="round" fill="none">
          {farTree.map(([w, d]) => <path key={w} d={d} strokeWidth={w} />)}
        </g>
      </svg>
      <svg className="layer cut" style={{ "--depth": 15 } as React.CSSProperties} viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice">
        <path d="M-40 290 C60 262 140 270 220 284 C300 298 360 270 440 276 L440 400 L-40 400 Z" fill="#2C2930" />
        <g stroke="#2C2930" strokeLinecap="round" fill="none">
          {midTreeA.map(([w, d]) => <path key={w} d={d} strokeWidth={w} />)}
          {midTreeB.map(([w, d]) => <path key={w} d={d} strokeWidth={w} />)}
        </g>
      </svg>
      <svg className="layer cut" style={{ "--depth": 24 } as React.CSSProperties} viewBox="0 0 400 330" preserveAspectRatio="xMidYMid slice">
        <path d="M-40 316 C40 300 120 304 200 312 C280 320 340 302 440 306 L440 400 L-40 400 Z" fill="#1B1A1F" />
        <g stroke="#1B1A1F" strokeWidth="1.4" strokeLinecap="round">
          {Array.from({ length: 34 }, (_, i) => {
            const x = i * 13 - 20;
            const h = 5 + ((i * 7) % 6);
            return <path key={i} d={`M${x} 318 L${x + 2} ${312 - h} M${x + 4} 318 L${x + 7} ${314 - h}`} />;
          })}
        </g>
        <image href="/kit/raven.svg" x="232" y="226" width="110" height="99" />
      </svg>
    </div>
  );
}
