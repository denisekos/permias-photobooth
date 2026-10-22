import { PHOTO_H, PHOTO_W } from "./photo";
import { CHAPTERS, type ChapterId, type HostSettings } from "./settings";

export const STRIP_W = 1200;
export const STRIP_H = 3600;
const M = 60;
const HEADER_H = 380;
const GAP = 40;
export const PHOTO_Y = [0, 1, 2].map((i) => M + HEADER_H + i * (PHOTO_H + GAP));
const FOOTER_Y = M + HEADER_H + 3 * PHOTO_H + 2 * GAP;

/** Photo rectangles as fractions of the strip, for the develop overlay. */
export const PHOTO_RECTS = PHOTO_Y.map((y) => ({
  left: M / STRIP_W,
  top: y / STRIP_H,
  width: PHOTO_W / STRIP_W,
  height: PHOTO_H / STRIP_H,
}));

const INK = "#1B1A1F";
const ASH = "#4A4744";
const GOLD = "#A88A4E";

const SERIF = '"Cormorant Garamond", "IM Fell English", Georgia, serif';
const TYPE = '"Special Elite", "Courier New", monospace';
const SCRIPT = '"Pinyon Script", cursive';

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(src);
        reject(new Error(`could not load ${src}`));
      };
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

export async function preloadAssets() {
  await Promise.all([
    ...["parchment-texture.png", "lace-border.svg", "raven.svg", "moth.svg", "crescent-moon.svg",
      "wax-seal-blank.svg", "candle.svg", "torn-edge.svg"].map((f) => loadImage(`/kit/${f}`)),
    document.fonts?.load(`600 76px ${SERIF}`),
    document.fonts?.load(`italic 500 40px ${SERIF}`),
    document.fonts?.load(`104px ${SCRIPT}`),
    document.fonts?.load(`30px ${TYPE}`),
  ]).catch(() => {});
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Letter-spaced text (canvas letterSpacing isn't everywhere yet). */
function spaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = align;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, maxW: number) {
  ctx.font = font(px);
  while (px > 24 && ctx.measureText(text).width > maxW) ctx.font = font((px -= 2));
}

function paperBackground(ctx: CanvasRenderingContext2D, paper: HTMLImageElement, w: number, h: number) {
  const scale = w / paper.width;
  const tileH = paper.height * scale;
  for (let y = 0, i = 0; y < h; y += tileH, i++) {
    ctx.save();
    if (i % 2) {
      ctx.translate(0, y + tileH);
      ctx.scale(1, -1);
      ctx.drawImage(paper, 0, 0, w, tileH);
    } else {
      ctx.drawImage(paper, 0, y, w, tileH);
    }
    ctx.restore();
  }
}

function deckledPath(ctx: CanvasRenderingContext2D, w: number, h: number, inset: number, seed: number) {
  const r = rng(seed);
  const jag = () => inset + (r() - 0.5) * inset * 1.1;
  ctx.beginPath();
  ctx.moveTo(jag(), jag());
  for (let x = 0; x <= w; x += 9 + r() * 10) ctx.lineTo(x, jag());
  for (let y = 0; y <= h; y += 9 + r() * 10) ctx.lineTo(w - jag(), y);
  for (let x = w; x >= 0; x -= 9 + r() * 10) ctx.lineTo(x, h - jag());
  for (let y = h; y >= 0; y -= 9 + r() * 10) ctx.lineTo(jag(), y);
  ctx.closePath();
}

function edgeBurn(ctx: CanvasRenderingContext2D, w: number, h: number, depth: number, alpha: number) {
  const edges: [number, number, number, number, number, number, number, number][] = [
    [0, 0, 0, depth, 0, 0, w, depth],
    [0, h, 0, h - depth, 0, h - depth, w, depth],
    [0, 0, depth, 0, 0, 0, depth, h],
    [w, 0, w - depth, 0, w - depth, 0, depth, h],
  ];
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(110, 80, 40, ${alpha})`);
    g.addColorStop(1, "rgba(110, 80, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  }
}

function drawSeal(ctx: CanvasRenderingContext2D, seal: HTMLImageElement, cx: number, top: number, size: number) {
  const s = size / 160;
  ctx.drawImage(seal, cx - size / 2, top, size, size);
  ctx.textAlign = "center";
  ctx.font = `italic 600 ${30 * s}px ${SERIF}`;
  ctx.fillStyle = "#5E1C1C";
  ctx.fillText("SUM", cx, top + 91 * s);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#D97A70";
  ctx.fillText("SUM", cx - 1 * s, top + 89.5 * s);
  ctx.globalAlpha = 1;
}

function drawPhoto(ctx: CanvasRenderingContext2D, photo: HTMLCanvasElement, x: number, y: number) {
  ctx.drawImage(photo, x, y, PHOTO_W, PHOTO_H);
  // faint aged vignette
  const g = ctx.createRadialGradient(x + PHOTO_W / 2, y + PHOTO_H / 2, PHOTO_H * 0.42, x + PHOTO_W / 2, y + PHOTO_H / 2, PHOTO_W * 0.68);
  g.addColorStop(0, "rgba(60, 40, 20, 0)");
  g.addColorStop(1, "rgba(60, 40, 20, 0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, PHOTO_W, PHOTO_H);
  // thin ink keyline
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, PHOTO_W - 3, PHOTO_H - 3);
}

export interface StripInput {
  photos: HTMLCanvasElement[];
  chapter: ChapterId;
  host: HostSettings;
}

/** Composites the 1200 × 3600 strip: header, three photos, footer. No QR on it. */
export async function composeStrip({ photos, chapter, host }: StripInput): Promise<HTMLCanvasElement> {
  const ch = CHAPTERS.find((c) => c.id === chapter) ?? CHAPTERS[0];
  const [paper, lace, motif, seal] = await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    loadImage("/kit/lace-border.svg"),
    loadImage(`/kit/${ch.motif}.svg`),
    loadImage("/kit/wax-seal-blank.svg"),
  ]);

  const c = document.createElement("canvas");
  c.width = STRIP_W;
  c.height = STRIP_H;
  const ctx = c.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  // backing card, then the deckled parchment sheet on top of it
  ctx.fillStyle = "#CDBE9C";
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
  ctx.save();
  deckledPath(ctx, STRIP_W, STRIP_H, 16, 1031);
  ctx.shadowColor = "rgba(27, 26, 31, 0.35)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#E9DFC9";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  paperBackground(ctx, paper, STRIP_W, STRIP_H);
  edgeBurn(ctx, STRIP_W, STRIP_H, 70, 0.28);
  ctx.restore();

  // header: lace, motif, script title, typewriter subtitle
  const laceScale = 1080 / 800;
  for (let i = 0; i < 2; i++) ctx.drawImage(lace, M + i * 400 * laceScale, M, 400 * laceScale, 40 * laceScale);
  const motifH = 120;
  const motifW = (motif.width / motif.height) * motifH;
  ctx.drawImage(motif, STRIP_W / 2 - motifW / 2, M + 68, motifW, motifH);
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  fitFont(ctx, ch.title, (px) => `${px}px ${SCRIPT}`, 104, 980);
  ctx.fillText(ch.title, STRIP_W / 2, M + 282);
  ctx.fillStyle = ASH;
  ctx.font = `24px ${TYPE}`;
  spaced(ctx, host.subtitle.toUpperCase(), STRIP_W / 2, M + 350, 6);

  photos.forEach((p, i) => drawPhoto(ctx, p, M, PHOTO_Y[i]));

  // footer: divider, event name, chapter + date, chapter line, wax seal
  const fy = FOOTER_Y;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STRIP_W / 2 - 220, fy + 70);
  ctx.lineTo(STRIP_W / 2 - 18, fy + 70);
  ctx.moveTo(STRIP_W / 2 + 18, fy + 70);
  ctx.lineTo(STRIP_W / 2 + 220, fy + 70);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(STRIP_W / 2, fy + 60);
  ctx.lineTo(STRIP_W / 2 + 10, fy + 70);
  ctx.lineTo(STRIP_W / 2, fy + 80);
  ctx.lineTo(STRIP_W / 2 - 10, fy + 70);
  ctx.fill();

  ctx.fillStyle = INK;
  fitFont(ctx, host.eventName, (px) => `600 ${px}px ${SERIF}`, 76, 1000);
  ctx.fillText(host.eventName, STRIP_W / 2, fy + 168);
  ctx.fillStyle = ASH;
  ctx.font = `32px ${TYPE}`;
  const dateLine = `Chapter ${ch.numeral}${host.eventDate ? ` · ${host.eventDate}` : ""}`;
  fitFont(ctx, dateLine, (px) => `${px}px ${TYPE}`, 32, 1000);
  ctx.fillText(dateLine, STRIP_W / 2, fy + 230);
  ctx.font = `italic 500 40px ${SERIF}`;
  ctx.fillText(ch.line, STRIP_W / 2, fy + 292);
  drawSeal(ctx, seal, STRIP_W / 2, fy + 330, 180);

  return c;
}

/** 1080 × 1920 story image: the strip centered on a parchment backdrop with a moon and a candle. */
export async function composeStory(strip: HTMLCanvasElement, host: HostSettings): Promise<HTMLCanvasElement> {
  const [paper, lace, moon, candle] = await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    loadImage("/kit/lace-border.svg"),
    loadImage("/kit/crescent-moon.svg"),
    loadImage("/kit/candle.svg"),
  ]);
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  const s = H / paper.height;
  ctx.drawImage(paper, (W - paper.width * s) / 2, 0, paper.width * s, H);
  edgeBurn(ctx, W, H, 160, 0.3);

  const ls = W / 1200;
  for (let i = 0; i < 3; i++) ctx.drawImage(lace, i * 400 * ls * 1.0, 0, 400 * ls, 40 * ls);
  ctx.save();
  ctx.translate(0, H);
  ctx.scale(1, -1);
  for (let i = 0; i < 3; i++) ctx.drawImage(lace, i * 400 * ls, 0, 400 * ls, 40 * ls);
  ctx.restore();

  ctx.drawImage(moon, 810, 110, 190, 190);
  ctx.drawImage(candle, 60, 1530, 150, 278);

  const sh = 1560;
  const sw = (strip.width / strip.height) * sh;
  ctx.save();
  ctx.translate(W / 2, H / 2 - 30);
  ctx.rotate((-1.5 * Math.PI) / 180);
  ctx.shadowColor = "rgba(27, 26, 31, 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(strip, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  ctx.fillStyle = ASH;
  ctx.textAlign = "center";
  ctx.font = `28px ${TYPE}`;
  spaced(ctx, host.eventName.toUpperCase(), W / 2, H - 92, 5);
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), type, q));

/** PNG if it stays under 2.5 MB, JPEG at 0.9 otherwise. */
export async function encode(c: HTMLCanvasElement): Promise<Blob> {
  const png = await toBlob(c, "image/png");
  if (png.size <= 2.5 * 1024 * 1024) return png;
  return toBlob(c, "image/jpeg", 0.9);
}
