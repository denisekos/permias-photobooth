/**
 * Layered paper-cut theatre that surrounds every screen: a velvet star field, scalloped
 * valances and side columns cut from engraved parchment, lace strips, a paper town along
 * the bottom, and ornaments hanging on threads. Pure SVG with no hooks, so the phone
 * download page can render the same scenery on the server.
 */
import type { CSSProperties, ReactNode } from "react";

type Pt = [number, number];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/** Connects points with circular arcs, giving the bumpy edge of hand-cut paper. */
function scallop(pts: Pt[], sweep: 0 | 1, k = 0.62): string {
  let d = "";
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const r = Math.hypot(x1 - x0, y1 - y0) * k;
    d += `A${f(r)} ${f(r)} 0 0 ${sweep} ${f(x1)} ${f(y1)}`;
  }
  return d;
}

const TONES = { deep: "#B9A882", mid: "#D6C9A9", light: "#EFE6D2", ash: "#57524D" } as const;
type Tone = keyof typeof TONES;

function Paper({ d, tone, edge = true }: { d: string; tone: Tone; edge?: boolean }) {
  return (
    <g filter="url(#sum-cast)">
      <path d={d} fill={TONES[tone]} />
      <path d={d} fill="url(#sum-tex)" opacity={tone === "ash" ? 0.25 : 0.55} style={{ mixBlendMode: "multiply" }} />
      {tone !== "ash" && <path d={d} fill="url(#sum-engrave)" />}
      {edge && <path d={d} fill="none" stroke="#A88A4E" strokeWidth="1.2" opacity="0.8" />}
    </g>
  );
}

/** Shared patterns, symbols and the paper drop shadow. Render once per document. */
export function SceneryDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="sum-tex" patternUnits="userSpaceOnUse" width="600" height="800">
          <image href="/kit/parchment-texture.png" width="600" height="800" />
        </pattern>
        <pattern id="sum-engrave" patternUnits="userSpaceOnUse" width="90" height="90">
          <image href="/decor/engrave.svg" width="90" height="90" />
        </pattern>
        <filter id="sum-cast" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#07060a" floodOpacity="0.6" />
        </filter>
        <linearGradient id="sum-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F0DCA4" />
          <stop offset="0.5" stopColor="#C9AE72" />
          <stop offset="1" stopColor="#A88A4E" />
        </linearGradient>
        <radialGradient id="sum-pearl" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFFDF7" />
          <stop offset="0.6" stopColor="#EDE3CC" />
          <stop offset="1" stopColor="#B9A882" />
        </radialGradient>
        <symbol id="sum-rose" viewBox="-20 -20 40 40" overflow="visible">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <circle key={i} cx={f(Math.cos(a) * 10)} cy={f(Math.sin(a) * 10)} r="7.5" fill="#F5EFE3" stroke="#8C7444" strokeWidth="0.8" />
            );
          })}
          <circle r="9" fill="#E9DFC9" stroke="#8C7444" strokeWidth="0.8" />
          <path d="M0 -5 C5 -5 6 2 1 4 C-4 6 -7 -1 -3 -3 C0 -4 2 -1 0 1" fill="none" stroke="#8C7444" strokeWidth="0.9" />
        </symbol>
        <symbol id="sum-leaf" viewBox="0 -8 40 16" overflow="visible">
          <path d="M0 0 Q14 -9 40 0 Q14 9 0 0Z" fill="#D6C9A9" stroke="#8C7444" strokeWidth="0.8" />
          <path d="M2 0 L36 0 M12 0 L18 -4 M20 0 L26 -4 M12 0 L18 4 M20 0 L26 4" stroke="#8C7444" strokeWidth="0.6" />
        </symbol>
        <symbol id="sum-star" viewBox="-10 -10 20 20" overflow="visible">
          <path d="M0 -10 L1.5 -1.5 L10 0 L1.5 1.5 L0 10 L-1.5 1.5 L-10 0 L-1.5 -1.5Z" fill="url(#sum-gold)" />
          <path d="M0 -4.6 L0.9 -0.9 L4.6 0 L0.9 0.9 L0 4.6 L-0.9 0.9 L-4.6 0 L-0.9 -0.9Z" fill="url(#sum-gold)" transform="rotate(45)" />
        </symbol>
      </defs>
    </svg>
  );
}

function Layer({ depth, className, children, style }: { depth: number; className: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`scn-layer ${className}`} style={{ "--d": depth, ...style } as CSSProperties}>
      {children}
    </div>
  );
}

/* ---------- star field ---------- */

function starField(seed: number) {
  const r = rng(seed);
  const big = Array.from({ length: 22 }, () => ({ x: r() * 1440, y: r() * 900, s: 14 + r() * 26, rot: r() * 20 - 10 }));
  const mid = Array.from({ length: 60 }, () => ({ x: r() * 1440, y: r() * 900, s: 4 + r() * 7, rot: r() * 30 }));
  const flecks = Array.from({ length: 170 }, () => ({ x: r() * 1440, y: r() * 900, s: 1.6 + r() * 3.4, rot: r() * 90 }));
  return { big, mid, flecks };
}
const STARS = starField(42);

export function StarField() {
  return (
    <svg className="scn-fill" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <g fill="#D9C08A">
        {STARS.flecks.map((p, i) => (
          <rect
            key={i}
            x={f(p.x)}
            y={f(p.y)}
            width={f(p.s)}
            height={f(p.s * 0.8)}
            rx="1"
            opacity={0.35 + (i % 5) * 0.12}
            transform={`rotate(${f(p.rot)} ${f(p.x)} ${f(p.y)})`}
            className={i % 6 === 0 ? "twinkle" : undefined}
            style={i % 6 === 0 ? { animationDelay: `${(i % 9) * 0.5}s`, transformOrigin: `${f(p.x)}px ${f(p.y)}px` } : undefined}
          />
        ))}
      </g>
      {[...STARS.mid, ...STARS.big].map((p, i) => (
        <use
          key={i}
          href="#sum-star"
          x={f(p.x - p.s)}
          y={f(p.y - p.s)}
          width={f(p.s * 2)}
          height={f(p.s * 2)}
          className={i % 3 === 0 ? "twinkle" : undefined}
          style={{ animationDelay: `${(i % 7) * 0.6}s`, transformOrigin: `${f(p.x)}px ${f(p.y)}px` }}
        />
      ))}
    </svg>
  );
}

/* ---------- valance ---------- */

function valance(base: number, hang: number, pow: number, seed: number, step: number): { d: string; pts: Pt[] } {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let x = -40; x <= 1480; x += step * (0.75 + r() * 0.5)) {
    const t = Math.min(1, Math.abs(x - 720) / 720);
    pts.push([x, base + hang * Math.pow(t, pow) + (r() - 0.5) * 14]);
  }
  pts.push([1480, pts[pts.length - 1][1]]);
  const d = `M-40 -20L${f(pts[0][0])} ${f(pts[0][1])}${scallop(pts, 0)}L1480 -20Z`;
  return { d, pts };
}

const VAL_BACK = valance(70, 150, 1.4, 5, 56);
const VAL_MID = valance(46, 128, 1.7, 9, 44);
const VAL_FRONT = valance(18, 96, 2.2, 13, 34);

/** y of a scalloped edge at x, by linear interpolation between its points. */
function edgeY(pts: Pt[], x: number) {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return pts[pts.length - 1][1];
}

/** Pearl strands swagged between anchor points along the front valance, with drops at each anchor. */
const PEARLS = (() => {
  const anchors = [150, 440, 720, 1000, 1290].map((x) => [x, edgeY(VAL_FRONT.pts, x) - 6] as Pt);
  const beads: { x: number; y: number; r: number }[] = [];
  for (const [sag, r, gap] of [[46, 4.2, 10], [86, 5, 12]] as const) {
    for (let i = 1; i < anchors.length; i++) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / gap);
      for (let k = 1; k < n; k++) {
        const t = k / n;
        beads.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t + sag * 4 * t * (1 - t), r });
      }
    }
  }
  const drops = anchors.flatMap(([x, y]) => Array.from({ length: 6 }, (_, k) => ({ x, y: y + 4 + k * 9, r: k === 5 ? 6.5 : 3.6 })));
  return { beads: [...beads, ...drops], anchors };
})();

const GAUZE =
  "M-40 -20 L300 -20 C270 30 200 64 160 130 C130 180 110 250 92 330 C80 316 70 322 60 340 C52 326 40 330 28 352 C16 336 0 344 -40 360 Z";

function Pearls() {
  return (
    <g filter="url(#sum-cast)">
      {PEARLS.beads.map((b, i) => (
        <circle key={i} cx={f(b.x)} cy={f(b.y)} r={b.r} fill="url(#sum-pearl)" stroke="#A88A4E" strokeWidth="0.5" />
      ))}
      {PEARLS.anchors.map(([x, y], i) => (
        <use key={i} href="#sum-rose" x={f(x - 13)} y={f(y - 15)} width="26" height="26" />
      ))}
    </g>
  );
}

function Gauze({ flip }: { flip?: boolean }) {
  return (
    <g transform={flip ? "translate(1440 0) scale(-1 1)" : undefined} opacity="0.85">
      <path d={GAUZE} fill="#F5EFE3" opacity="0.38" />
      <g stroke="#F5EFE3" strokeWidth="0.7" opacity="0.6" fill="none">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${20 + i * 30} -10 C${10 + i * 22} 80 ${i * 14} 200 ${-10 + i * 10} ${330 - i * 6}`} />
        ))}
      </g>
      <image href="/decor/web.svg" x="70" y="40" width="150" height="150" opacity="0.9" />
    </g>
  );
}

function Valance() {
  const roses = VAL_FRONT.pts.filter((_, i) => i % 5 === 2 && i > 2 && i < VAL_FRONT.pts.length - 3);
  return (
    <>
      <Layer depth={5} className="scn-top">
        <svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMin slice">
          <Paper d={VAL_BACK.d} tone="deep" />
        </svg>
      </Layer>
      <Layer depth={9} className="scn-top">
        <svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMin slice">
          <Paper d={VAL_MID.d} tone="mid" />
          {VAL_MID.pts.filter((_, i) => i % 3 === 1).map(([x, y], i) => (
            <use key={i} href="#sum-leaf" x={f(x - 16)} y={f(y - 8)} width="34" height="14" transform={`rotate(${i % 2 ? 70 : 110} ${f(x)} ${f(y)})`} />
          ))}
        </svg>
      </Layer>
      <Layer depth={14} className="scn-top tall">
        <svg viewBox="0 0 1440 400" preserveAspectRatio="xMidYMin slice">
          <Paper d={VAL_FRONT.d} tone="light" />
          <Gauze />
          <Gauze flip />
          <Pearls />
          {roses.map(([x, y], i) => (
            <g key={i}>
              <use href="#sum-leaf" x={f(x - 36)} y={f(y - 12)} width="34" height="14" transform={`rotate(150 ${f(x - 18)} ${f(y - 4)})`} />
              <use href="#sum-leaf" x={f(x + 2)} y={f(y - 12)} width="34" height="14" transform={`rotate(30 ${f(x + 18)} ${f(y - 4)})`} />
              <use href="#sum-rose" x={f(x - 15)} y={f(y - 22)} width="30" height="30" />
            </g>
          ))}
        </svg>
      </Layer>
    </>
  );
}

/* ---------- side columns ---------- */

function column(edge: number, amp: number, period: number, seed: number, step: number) {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let y = -30; y <= 940; y += step * (0.8 + r() * 0.4)) {
    pts.push([edge + amp * Math.sin(y / period) + (r() - 0.5) * 10, y]);
  }
  return `M-20 -30L${f(pts[0][0])} ${f(pts[0][1])}${scallop(pts, 1)}L-20 940Z`;
}

const COL_BACK = column(104, 20, 90, 21, 48);
const COL_MID = column(70, 12, 64, 25, 36);

const LACE = (() => {
  let d = "M-4 -10L22 -10";
  const holes: Pt[] = [];
  for (let y = -10; y < 920; y += 18) {
    d += `A9 9 0 0 1 22 ${y + 18}`;
    holes.push([21, y + 9]);
  }
  d += "L-4 920Z";
  return { d, holes };
})();

const VINE = (() => {
  const leaves: { x: number; y: number; a: number }[] = [];
  const roses: Pt[] = [];
  for (let y = 40, i = 0; y < 880; y += 30, i++) {
    const x = 50 + 9 * Math.sin(y / 55);
    leaves.push({ x, y, a: i % 2 ? 20 : 160 });
    if (i % 6 === 3) roses.push([x, y]);
  }
  return { leaves, roses, d: `M${Array.from({ length: 30 }, (_, i) => `${f(50 + 9 * Math.sin((20 + i * 30) / 55))} ${20 + i * 30}`).join("L")}` };
})();

function Column({ side }: { side: "left" | "right" }) {
  return (
    <>
      <Layer depth={6} className={`scn-col ${side}`}>
        <svg viewBox="0 0 150 900" preserveAspectRatio="xMinYMid slice">
          <Paper d={COL_BACK} tone="deep" />
        </svg>
      </Layer>
      <Layer depth={11} className={`scn-col ${side}`}>
        <svg viewBox="0 0 150 900" preserveAspectRatio="xMinYMid slice">
          <Paper d={COL_MID} tone="mid" />
          <path d={VINE.d} fill="none" stroke="#8C7444" strokeWidth="1.4" />
          {VINE.leaves.map((l, i) => (
            <use key={i} href="#sum-leaf" x={f(l.x)} y={f(l.y - 7)} width="30" height="12" transform={`rotate(${l.a} ${f(l.x)} ${f(l.y)})`} />
          ))}
          {VINE.roses.map(([x, y], i) => (
            <use key={i} href="#sum-rose" x={f(x - 14)} y={f(y - 14)} width="28" height="28" />
          ))}
        </svg>
      </Layer>
      <Layer depth={16} className={`scn-col lace ${side}`}>
        <svg viewBox="0 0 150 900" preserveAspectRatio="xMinYMid slice">
          <g filter="url(#sum-cast)">
            <path d={LACE.d} fill="#F5EFE3" />
            {LACE.holes.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="3.2" fill="#1B1A1F" opacity="0.75" />
                <circle cx={8} cy={y} r="1.6" fill="#1B1A1F" opacity="0.45" />
              </g>
            ))}
            <path d="M14 -10 L14 920" stroke="#A88A4E" strokeWidth="0.8" strokeDasharray="3 3" />
          </g>
        </svg>
      </Layer>
    </>
  );
}

/* ---------- town ---------- */

const TOWN = (() => {
  const r = rng(77);
  let houses = "";
  const windows: { x: number; y: number; lit: boolean }[] = [];
  for (let x = -20; x < 1460; ) {
    const w = 38 + r() * 54;
    const h = 46 + r() * 70;
    const top = 240 - h;
    const kind = r();
    houses += `M${f(x)} 240L${f(x)} ${f(top)}`;
    if (kind < 0.45) houses += `L${f(x + w / 2)} ${f(top - w * 0.55)}L${f(x + w)} ${f(top)}`;
    else if (kind < 0.7) {
      houses += `L${f(x + w * 0.35)} ${f(top)}L${f(x + w * 0.35)} ${f(top - 26)}L${f(x + w * 0.5)} ${f(top - 70 - r() * 30)}L${f(x + w * 0.65)} ${f(top - 26)}L${f(x + w * 0.65)} ${f(top)}`;
    } else houses += `L${f(x + w * 0.2)} ${f(top - 16)}L${f(x + w * 0.8)} ${f(top - 16)}`;
    houses += `L${f(x + w)} ${f(top)}L${f(x + w)} 240Z`;
    for (let i = 0; i < 2; i++) windows.push({ x: x + w * (0.28 + i * 0.32), y: top + 14 + r() * 18, lit: r() < 0.4 });
    x += w + 4 + r() * 18;
  }
  const hill: Pt[] = [];
  for (let x = -40; x <= 1480; x += 46 + r() * 30) hill.push([x, 188 + 18 * Math.sin(x / 160) + (r() - 0.5) * 8]);
  const ground: Pt[] = [];
  for (let x = -40; x <= 1480; x += 30 + r() * 22) ground.push([x, 216 + 9 * Math.sin(x / 110 + 2) + (r() - 0.5) * 6]);
  const stones = Array.from({ length: 16 }, (_, i) => ({ x: 40 + i * 88 + r() * 30, h: 14 + r() * 12 }));
  return {
    houses,
    windows,
    hill: `M-40 260L${f(hill[0][0])} ${f(hill[0][1])}${scallop(hill, 1)}L1480 260Z`,
    hillPts: hill,
    ground: `M-40 260L${f(ground[0][0])} ${f(ground[0][1])}${scallop(ground, 1)}L1480 260Z`,
    stones,
  };
})();

function Town({ pumpkins = true }: { pumpkins?: boolean }) {
  return (
    <>
      <Layer depth={4} className="scn-bottom">
        <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice">
          <Paper d={TOWN.houses} tone="ash" edge={false} />
          {TOWN.windows.map((w, i) => (
            <rect key={i} x={f(w.x)} y={f(w.y)} width="6" height="9" fill={w.lit ? "#E6A35A" : "#2C2930"} opacity={w.lit ? 0.9 : 0.6} />
          ))}
        </svg>
      </Layer>
      <Layer depth={8} className="scn-bottom">
        <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice">
          <Paper d={TOWN.hill} tone="deep" />
          <g fill="#4A4744" filter="url(#sum-cast)">
            {TOWN.stones.map((s, i) => {
              const y = 196 + 18 * Math.sin(s.x / 160);
              return i % 3 === 2 ? (
                <path key={i} d={`M${f(s.x)} ${f(y)}l0 ${f(-s.h - 10)}m-7 9l14 0`} stroke="#4A4744" strokeWidth="4" />
              ) : (
                <path key={i} d={`M${f(s.x - 8)} ${f(y)}l0 ${f(-s.h)}a8 8 0 0 1 16 0l0 ${f(s.h)}z`} />
              );
            })}
          </g>
        </svg>
      </Layer>
      <Layer depth={15} className="scn-bottom">
        <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice">
          <Paper d={TOWN.ground} tone="light" />
          {pumpkins &&
            [120, 300, 1150, 1330].map((x, i) => (
              <image key={x} href="/kit/pumpkin.svg" x={x} y={i % 2 ? 176 : 168} width={i % 2 ? 54 : 70} height={i % 2 ? 47 : 61} />
            ))}
          {[60, 230, 420, 1010, 1240, 1400].map((x, i) => (
            <g key={x}>
              <use href="#sum-leaf" x={x - 30} y={204} width="30" height="12" transform={`rotate(${200 + i * 7} ${x - 15} ${210})`} />
              <use href="#sum-rose" x={x - 13} y={194} width="26" height="26" />
            </g>
          ))}
        </svg>
      </Layer>
    </>
  );
}

/* ---------- hanging ornaments ---------- */

type Hang = {
  left: number;
  len: number;
  kind: "moon" | "star" | "lantern" | "moth" | "skull";
  size: number;
  dur: number;
  page?: boolean;
};

const HANGS: Hang[] = [
  { left: 9, len: 26, kind: "star", size: 34, dur: 5.1, page: true },
  { left: 12.5, len: 44, kind: "skull", size: 40, dur: 6.6, page: true },
  { left: 15, len: 38, kind: "lantern", size: 46, dur: 6.3 },
  { left: 22, len: 24, kind: "star", size: 24, dur: 4.4, page: true },
  { left: 26, len: 46, kind: "skull", size: 34, dur: 5.4 },
  { left: 29, len: 32, kind: "moth", size: 64, dur: 7.2 },
  { left: 71, len: 24, kind: "star", size: 28, dur: 4.8 },
  { left: 74, len: 46, kind: "skull", size: 34, dur: 6.1 },
  { left: 78, len: 40, kind: "moon", size: 84, dur: 6.8 },
  { left: 86, len: 24, kind: "star", size: 30, dur: 5.6, page: true },
  { left: 89, len: 46, kind: "skull", size: 38, dur: 5.2, page: true },
  { left: 92, len: 35, kind: "lantern", size: 40, dur: 5.9, page: true },
];

function Ornament({ kind, size }: { kind: Hang["kind"]; size: number }) {
  if (kind === "moon") return <img src="/kit/crescent-moon.svg" alt="" style={{ width: size }} />;
  if (kind === "moth") return <img src="/kit/moth.svg" alt="" style={{ width: size }} />;
  if (kind === "skull") return <img src="/decor/skull.svg" alt="" style={{ width: size }} className="sticker" />;
  if (kind === "star")
    return (
      <svg width={size} height={size} viewBox="-10 -10 20 20">
        <use href="#sum-star" x="-10" y="-10" width="20" height="20" />
      </svg>
    );
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 40 64" className="lantern">
      <path d="M12 6 L28 6 L32 14 L8 14 Z" fill="#1B1A1F" />
      <rect x="10" y="14" width="20" height="34" rx="3" fill="#E6A35A" opacity="0.9" />
      <rect x="10" y="14" width="20" height="34" rx="3" fill="none" stroke="#1B1A1F" strokeWidth="2.4" />
      <path d="M16.7 14 V48 M23.3 14 V48" stroke="#1B1A1F" strokeWidth="1.6" />
      <path d="M8 48 L32 48 L28 56 L12 56 Z" fill="#1B1A1F" />
      <circle cx="20" cy="2" r="2.4" fill="none" stroke="#A88A4E" strokeWidth="1.4" />
    </svg>
  );
}

function Hangers({ page }: { page: boolean }) {
  return (
    <Layer depth={12} className="scn-hangers">
      {HANGS.filter((h) => !page || h.page).map((h, i) => (
        <div
          key={i}
          className="hang"
          style={{ left: `${h.left}%`, animationDuration: `${h.dur}s`, animationDelay: `${-i * 0.9}s` } as CSSProperties}
        >
          <span className="thread" style={{ height: `${h.len}vh` }} />
          <Ornament kind={h.kind} size={h.size} />
        </div>
      ))}
    </Layer>
  );
}

const BATS = [
  { left: 34, top: 30, w: 46, page: false },
  { left: 39, top: 24, w: 30, page: false },
  { left: 63, top: 27, w: 40, page: true },
  { left: 18, top: 52, w: 34, page: false },
  { left: 84, top: 56, w: 44, page: true },
];

/** A witch crossing the sky every half minute, and a colony of bats. */
function Night({ page }: { page: boolean }) {
  return (
    <Layer depth={7} className="scn-night">
      <div className="witch-fly">
        <img src="/decor/witch.svg" alt="" />
      </div>
      {BATS.filter((b) => !page || b.page).map((b, i) => (
        <div key={i} className="bat" style={{ left: `${b.left}%`, top: `${b.top}vh`, width: b.w, animationDelay: `${-i * 1.7}s` }}>
          <img src="/decor/bat.svg" alt="" style={{ animationDelay: `${-i * 0.13}s` }} />
        </div>
      ))}
    </Layer>
  );
}

/** Pumpkin hot-air balloon with a candle riding in the basket. */
export function Balloon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={`balloon ${className ?? ""}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 160 250">
        <image href="/kit/pumpkin.svg" x="0" y="0" width="160" height="140" />
        <path d="M44 128 L62 196 M116 128 L98 196 M80 136 L80 196" stroke="#A88A4E" strokeWidth="1.6" />
        <image href="/kit/candle.svg" x="66" y="150" width="28" height="52" />
        <g filter="url(#sum-cast)">
          <path d="M56 196 L104 196 L98 236 L62 236 Z" fill="#D6C9A9" />
          <path d="M56 196 L104 196 L98 236 L62 236 Z" fill="url(#sum-engrave)" />
          <path d="M54 194 L106 194 L106 201 L54 201 Z" fill="#A88A4E" />
          <path d="M56 196 L104 196 L98 236 L62 236 Z" fill="none" stroke="#4A4744" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}

export type SceneryVariant = "full" | "page";

/** The whole theatre. "page" keeps the hangers to the outer edges so working screens stay clear. */
export default function Scenery({ variant = "full" }: { variant?: SceneryVariant }) {
  return (
    <div className={`scenery ${variant}`} aria-hidden="true">
      <Layer depth={2} className="scn-stars">
        <StarField />
      </Layer>
      <Town pumpkins={variant === "full"} />
      <Column side="left" />
      <Column side="right" />
      <Hangers page={variant === "page"} />
      <Night page={variant === "page"} />
      <Valance />
    </div>
  );
}
