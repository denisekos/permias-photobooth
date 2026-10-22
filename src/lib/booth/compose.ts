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

const BONE = "#E8DCC4";
const BLOOD = "#C4161C";
const BLOOD_DK = "#7A1014";

const SERIF = '"Cormorant Garamond", "IM Fell English", Georgia, serif';
const DISPLAY = '"Metal Mania", "Cormorant Garamond", serif';
const LABEL = '"Oswald", "Arial Narrow", sans-serif';

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
    ...["parchment-texture.png", "wax-seal-blank.svg"].map((f) => loadImage(`/kit/${f}`)),
    ...["talisman-yellow.svg", "talisman-white.svg", "talisman-red.svg", "skull.svg", "web.svg"].map((f) =>
      loadImage(`/decor/${f}`),
    ),
    document.fonts?.load(`500 26px ${SERIF}`),
    document.fonts?.load(`italic 500 40px ${SERIF}`),
    document.fonts?.load(`100px ${DISPLAY}`),
    document.fonts?.load(`500 30px ${LABEL}`),
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

function edgeBurn(ctx: CanvasRenderingContext2D, w: number, h: number, depth: number, alpha: number, rgb = "110, 80, 40") {
  const edges: [number, number, number, number, number, number, number, number][] = [
    [0, 0, 0, depth, 0, 0, w, depth],
    [0, h, 0, h - depth, 0, h - depth, w, depth],
    [0, 0, depth, 0, 0, 0, depth, h],
    [w, 0, w - depth, 0, w - depth, 0, depth, h],
  ];
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
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
  // dark vignette, like a flash photo in a dim hallway
  const g = ctx.createRadialGradient(x + PHOTO_W / 2, y + PHOTO_H / 2, PHOTO_H * 0.4, x + PHOTO_W / 2, y + PHOTO_H / 2, PHOTO_W * 0.68);
  g.addColorStop(0, "rgba(20, 6, 4, 0)");
  g.addColorStop(1, "rgba(20, 6, 4, 0.5)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, PHOTO_W, PHOTO_H);
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 5;
  ctx.strokeRect(x + 2.5, y + 2.5, PHOTO_W - 5, PHOTO_H - 5);
  ctx.strokeStyle = BLOOD_DK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, PHOTO_W + 8, PHOTO_H + 8);
}

/** Dark plaster with a red glow pooled in the middle, as on the party poster. */
function wall(ctx: CanvasRenderingContext2D, paper: HTMLImageElement, w: number, h: number) {
  ctx.fillStyle = "#1c120e";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.6;
  paperBackground(ctx, paper, w, h);
  ctx.restore();
  for (const [cx, cy, r, a] of [[0.5, 0.35, 0.8, 0.22], [0.3, 0.7, 0.6, 0.12], [0.75, 0.15, 0.5, 0.1]] as const) {
    const g = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, w * r);
    g.addColorStop(0, `rgba(160, 18, 22, ${a})`);
    g.addColorStop(1, "rgba(160, 18, 22, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  edgeBurn(ctx, w, h, Math.min(w, h) * 0.12, 0.75, "0, 0, 0");
}

/** A rule with a diamond in the middle, the poster's ornament. */
function diamondRule(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number) {
  ctx.strokeStyle = BLOOD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 16, y);
  ctx.moveTo(cx + 16, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.restore();
}

/** Draws an image as a die-cut sticker: bone outline, then the drawing. */
function sticker(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, rot: number) {
  const h = (img.height / img.width) * w;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
    ctx.filter = "brightness(0) invert(0.9) sepia(0.3)";
    ctx.drawImage(img, -w / 2 + dx, -h / 2 + dy, w, h);
    ctx.shadowColor = "transparent";
  }
  ctx.filter = "none";
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Washi tape strip across a sticker's top. */
function tape(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -14, w, 28);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = BONE;
  for (let i = -w / 2; i < w / 2; i += 14) ctx.fillRect(i, -14, 6, 28);
  ctx.restore();
}

export interface StripInput {
  photos: HTMLCanvasElement[];
  chapter: ChapterId;
  host: HostSettings;
}

/** Composites the 1200 × 3600 strip in the party poster's style. No QR on it. */
export async function composeStrip({ photos, chapter, host }: StripInput): Promise<HTMLCanvasElement> {
  const ch = CHAPTERS.find((c) => c.id === chapter) ?? CHAPTERS[0];
  const [paper, seal, talY, talW, talR, skull, web] = await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    loadImage("/kit/wax-seal-blank.svg"),
    loadImage("/decor/talisman-yellow.svg"),
    loadImage("/decor/talisman-white.svg"),
    loadImage("/decor/talisman-red.svg"),
    loadImage("/decor/skull.svg"),
    loadImage("/decor/web.svg"),
  ]);

  const c = document.createElement("canvas");
  c.width = STRIP_W;
  c.height = STRIP_H;
  const ctx = c.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // black backing, a torn sheet of dark paper on top
  ctx.fillStyle = "#070404";
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);
  ctx.save();
  deckledPath(ctx, STRIP_W, STRIP_H, 16, 1031);
  ctx.shadowColor = "rgba(196, 22, 28, 0.35)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#1c120e";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  wall(ctx, paper, STRIP_W, STRIP_H);
  ctx.restore();

  // header: presenter ◆ label, the event title in poster lettering, chapter
  ctx.drawImage(web, M - 10, M - 10, 170, 170);
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(web, -(STRIP_W - M + 10), M - 10, 170, 170);
  ctx.restore();
  ctx.fillStyle = BLOOD;
  ctx.font = `500 30px ${LABEL}`;
  spaced(ctx, host.presenter.toUpperCase(), STRIP_W / 2 - 250, M + 72, 8);
  spaced(ctx, host.subtitle.toUpperCase(), STRIP_W / 2 + 250, M + 72, 8);
  diamondRule(ctx, STRIP_W / 2, M + 62, 110);

  ctx.save();
  ctx.translate(STRIP_W / 2, M + 236);
  ctx.rotate((-2 * Math.PI) / 180);
  fitFont(ctx, host.eventName.toUpperCase(), (px) => `${px}px ${DISPLAY}`, 112, 1000);
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#2a0406";
  ctx.fillText(host.eventName.toUpperCase(), 0, 5);
  ctx.shadowColor = "rgba(196, 22, 28, 0.45)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = BLOOD;
  ctx.fillText(host.eventName.toUpperCase(), 0, 0);
  ctx.restore();

  ctx.fillStyle = BONE;
  ctx.font = `500 28px ${LABEL}`;
  spaced(ctx, `CHAPTER ${ch.numeral} · ${ch.title.toUpperCase()}`, STRIP_W / 2, M + 330, 8);

  photos.forEach((p, i) => drawPhoto(ctx, p, M, PHOTO_Y[i]));

  // talismans taped along the outer edges, clear of faces
  const tals = [talY, talW, talR];
  [
    [M - 30, PHOTO_Y[0] + 470, -8],
    [STRIP_W - M - 52, PHOTO_Y[1] + 420, 7],
    [M - 34, PHOTO_Y[2] + 480, 6],
  ].forEach(([x, y, rot], i) => {
    sticker(ctx, tals[i], x, y, 82, rot);
    tape(ctx, x + 41, y + 8, 96, rot - 6, i === 1 ? BLOOD_DK : "#8f6e3e");
  });

  // footer: the poster's details, then the seal
  const fy = FOOTER_Y;
  diamondRule(ctx, STRIP_W / 2, fy + 64, 230);
  ctx.fillStyle = BLOOD;
  const when = [host.eventDate, host.eventTime, host.venue].filter(Boolean).join("  ·  ").toUpperCase();
  fitFont(ctx, when, (px) => `500 ${px}px ${LABEL}`, 46, 1020);
  ctx.fillText(when, STRIP_W / 2, fy + 140);
  ctx.fillStyle = BONE;
  ctx.font = `500 26px ${SERIF}`;
  spaced(ctx, [host.eventDay, host.city].filter(Boolean).join(" · ").toUpperCase(), STRIP_W / 2, fy + 188, 7);
  ctx.font = `italic 500 40px ${SERIF}`;
  ctx.fillText(ch.line, STRIP_W / 2, fy + 256);
  ctx.font = `500 28px ${SERIF}`;
  spaced(ctx, "SEE YOU IN COSTUME", STRIP_W / 2, fy + 320, 12);
  drawSeal(ctx, seal, STRIP_W / 2, fy + 352, 150);
  sticker(ctx, skull, STRIP_W / 2 - 250, fy + 380, 110, -12);
  sticker(ctx, tals[0], STRIP_W / 2 + 190, fy + 350, 60, 10);
  tape(ctx, STRIP_W / 2 + 220, fy + 356, 80, 4, BLOOD_DK);

  return c;
}

/** 1080 × 1920 story image: the strip on the dark wall, talismans and a skull around it. */
export async function composeStory(strip: HTMLCanvasElement, host: HostSettings): Promise<HTMLCanvasElement> {
  const [paper, talY, talW, talR, skull, web] = await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    loadImage("/decor/talisman-yellow.svg"),
    loadImage("/decor/talisman-white.svg"),
    loadImage("/decor/talisman-red.svg"),
    loadImage("/decor/skull.svg"),
    loadImage("/decor/web.svg"),
  ]);
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  wall(ctx, paper, W, H);
  ctx.drawImage(web, 0, 0, 260, 260);
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(web, -W, 0, 260, 260);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = BLOOD;
  ctx.font = `500 30px ${LABEL}`;
  spaced(ctx, host.presenter.toUpperCase(), W / 2 - 230, 122, 8);
  spaced(ctx, host.subtitle.toUpperCase(), W / 2 + 230, 122, 8);
  diamondRule(ctx, W / 2, 112, 100);

  sticker(ctx, talY, 70, 330, 110, -10);
  sticker(ctx, talR, 900, 520, 100, 8);
  sticker(ctx, talW, 80, 1180, 96, 6);
  sticker(ctx, skull, 850, 1400, 150, 12);
  tape(ctx, 125, 342, 120, -16, BLOOD_DK);
  tape(ctx, 950, 530, 110, 2, "#8f6e3e");
  tape(ctx, 128, 1190, 110, 0, BLOOD_DK);

  const sh = 1480;
  const sw = (strip.width / strip.height) * sh;
  ctx.save();
  ctx.translate(W / 2, H / 2 - 20);
  ctx.rotate((-1.5 * Math.PI) / 180);
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.drawImage(strip, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  ctx.font = `500 30px ${SERIF}`;
  ctx.fillStyle = BONE;
  spaced(ctx, "SEE YOU IN COSTUME", W / 2, H - 80, 12);
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), type, q));

/** JPEG at 0.88: the story image is all photo and texture, where PNG only adds weight. */
export const encodeJpeg = (c: HTMLCanvasElement) => toBlob(c, "image/jpeg", 0.88);

/** PNG if it stays under 2.5 MB, JPEG at 0.9 otherwise. */
export async function encode(c: HTMLCanvasElement): Promise<Blob> {
  const png = await toBlob(c, "image/png");
  if (png.size <= 2.5 * 1024 * 1024) return png;
  return toBlob(c, "image/jpeg", 0.9);
}
