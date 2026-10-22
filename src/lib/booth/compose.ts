import type { HostSettings } from "./settings";

/*
 * The strip is a length of 35mm film: sprocket rails down both sides, a cream title card
 * in the first frame, the three photos, and the party details in the last frame. Vintage
 * stickers sit on the rails and the gaps between frames, never over faces.
 */
export const STRIP_W = 1200;
export const STRIP_H = 3600;
const RAIL = 120;
const FRAME_W = STRIP_W - 2 * RAIL;
const SLOT_H = 720;
const GAP = 28;
const LEAD = 36;
const CARD_H = (STRIP_H - 2 * LEAD - 3 * SLOT_H - 4 * GAP) / 2;
const TITLE_Y = LEAD;
export const PHOTO_Y = [0, 1, 2].map((i) => LEAD + CARD_H + GAP + i * (SLOT_H + GAP));
const FOOTER_Y = PHOTO_Y[2] + SLOT_H + GAP;

/** Photo rectangles as fractions of the strip, for the develop overlay. */
export const PHOTO_RECTS = PHOTO_Y.map((y) => ({
  left: RAIL / STRIP_W,
  top: y / STRIP_H,
  width: FRAME_W / STRIP_W,
  height: SLOT_H / STRIP_H,
}));

// colours from the party palette
const FILM = "#131010";
const HOLE = "#D8D3C9";
const CARD = "#D3CEC4";
const EDGE_INK = "#C0622F";
const INK = "#1B1A1F";
const PUMPKIN = "#B5531F";
const RUST = "#4F1C10";
const BG = "#261D1B";

const SERIF = '"Cormorant Garamond", "IM Fell English", Georgia, serif';
const DISPLAY = '"Metal Mania", "Cormorant Garamond", serif';
const LABEL = '"Oswald", "Arial Narrow", sans-serif';
const HAND = '"Homemade Apple", "Bradley Hand", cursive';

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

const ART = ["pumpkin", "ghost", "cat-banjo", "witch-hat", "witch-broom", "bat"];

export async function preloadAssets() {
  await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    ...ART.map((f) => loadImage(`/art/${f}.webp`)),
    document.fonts?.load(`500 26px ${SERIF}`),
    document.fonts?.load(`100px ${DISPLAY}`),
    document.fonts?.load(`500 30px ${LABEL}`),
    document.fonts?.load(`30px ${HAND}`),
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Aged cream paper: parchment grain multiplied over cream, edges browned. */
function agedCard(ctx: CanvasRenderingContext2D, paper: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = CARD;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(paper, x, y, w, (paper.height / paper.width) * w);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(90, 58, 24, 0)");
  g.addColorStop(1, "rgba(90, 58, 24, 0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** The film itself: rails with rounded sprocket holes, a faint sheen, scratches and edge print. */
function film(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, w, h);
  const sheen = ctx.createLinearGradient(0, 0, w, 0);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.05)");
  sheen.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0.04)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = HOLE;
  for (let y = 22; y < h - 40; y += 76) {
    for (const x of [32, w - 32 - 56]) {
      roundRect(ctx, x, y, 56, 42, 9);
      ctx.fill();
    }
  }

  const r = rng(seed);
  ctx.strokeStyle = "rgba(237, 230, 214, 0.08)";
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    ctx.lineWidth = r() * 1.6 + 0.4;
    ctx.beginPath();
    ctx.moveTo(x, r() * h);
    ctx.lineTo(x + (r() - 0.5) * 8, r() * h);
    ctx.stroke();
  }
}

/** Frame numbers and stock name printed in the margins, as on real negatives. */
function edgePrint(ctx: CanvasRenderingContext2D, frames: number[]) {
  ctx.fillStyle = EDGE_INK;
  ctx.font = `600 26px ${LABEL}`;
  ctx.textAlign = "center";
  frames.forEach((y, i) => {
    ctx.fillText(String(i + 1), 18, y + 40);
    ctx.fillText(`${i + 1}A`, STRIP_W - 16, y + 40);
    ctx.beginPath();
    ctx.moveTo(STRIP_W - 24, y + 360);
    ctx.lineTo(STRIP_W - 8, y + 350);
    ctx.lineTo(STRIP_W - 8, y + 370);
    ctx.closePath();
    ctx.fill();
  });
  // stock name runs down the margin between the sprocket holes and the frames
  ctx.save();
  ctx.translate(RAIL - 14, STRIP_H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `500 16px ${LABEL}`;
  ctx.globalAlpha = 0.85;
  spaced(ctx, "SUM 400 · SAFETY FILM · HALLOWEEN 2026", 0, 6, 6);
  ctx.restore();
}

/** Places a piece of artwork with a soft shadow (no outline). */
function sticker(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, w: number, rot: number) {
  const h = (img.height / img.width) * w;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** A rule with a diamond in the middle, the poster's ornament. */
function diamondRule(ctx: CanvasRenderingContext2D, cx: number, y: number, half: number) {
  ctx.strokeStyle = PUMPKIN;
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

/** Draws the photo cover-fitted into its film frame (capture is 4:3, so it fills exactly). */
function drawPhoto(ctx: CanvasRenderingContext2D, photo: HTMLCanvasElement, y: number) {
  ctx.drawImage(photo, RAIL, y, FRAME_W, SLOT_H);
  const g = ctx.createRadialGradient(STRIP_W / 2, y + SLOT_H / 2, SLOT_H * 0.45, STRIP_W / 2, y + SLOT_H / 2, FRAME_W * 0.7);
  g.addColorStop(0, "rgba(20, 12, 6, 0)");
  g.addColorStop(1, "rgba(20, 12, 6, 0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(RAIL, y, FRAME_W, SLOT_H);
}

export interface StripInput {
  photos: HTMLCanvasElement[];
  host: HostSettings;
}

/** Composites the 1200 × 3600 film strip. No QR on it. */
export async function composeStrip({ photos, host }: StripInput): Promise<HTMLCanvasElement> {
  const [paper, pumpkin, ghost, hat, bat] = await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    ...["pumpkin", "ghost", "witch-hat", "bat"].map((n) => loadImage(`/art/${n}.webp`)),
  ]);

  const c = document.createElement("canvas");
  c.width = STRIP_W;
  c.height = STRIP_H;
  const ctx = c.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  film(ctx, STRIP_W, STRIP_H, 1031);

  // frame 1: title card
  agedCard(ctx, paper, RAIL, TITLE_Y, FRAME_W, CARD_H);
  ctx.fillStyle = RUST;
  ctx.font = `500 30px ${LABEL}`;
  spaced(ctx, host.presenter.toUpperCase(), STRIP_W / 2 - 240, TITLE_Y + 110, 8);
  spaced(ctx, host.subtitle.toUpperCase(), STRIP_W / 2 + 240, TITLE_Y + 110, 8);
  diamondRule(ctx, STRIP_W / 2, TITLE_Y + 100, 100);
  const words = host.eventName.toUpperCase().split(/\s+/);
  const lines = words.length >= 3 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : [words.join(" ")];
  ctx.save();
  ctx.translate(STRIP_W / 2, TITLE_Y + (lines.length > 1 ? 270 : 330));
  ctx.rotate((-2 * Math.PI) / 180);
  lines.forEach((line, i) => {
    fitFont(ctx, line, (px) => `${px}px ${DISPLAY}`, i ? 150 : 118, FRAME_W - 90);
    ctx.fillStyle = RUST;
    ctx.fillText(line, 0, i * 142 + 5);
    ctx.fillStyle = PUMPKIN;
    ctx.fillText(line, 0, i * 142);
  });
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.font = `30px ${HAND}`;
  ctx.fillText("a night of costumes, music & surprises", STRIP_W / 2, TITLE_Y + CARD_H - 52);

  photos.forEach((p, i) => drawPhoto(ctx, p, PHOTO_Y[i]));

  // last frame: the party details
  const fy = FOOTER_Y;
  agedCard(ctx, paper, RAIL, fy, FRAME_W, CARD_H);
  diamondRule(ctx, STRIP_W / 2, fy + 76, 240);
  ctx.fillStyle = PUMPKIN;
  const when = [host.eventDate, host.eventTime, host.venue].filter(Boolean).join("  ·  ").toUpperCase();
  fitFont(ctx, when, (px) => `500 ${px}px ${LABEL}`, 50, FRAME_W - 80);
  ctx.fillText(when, STRIP_W / 2, fy + 168);
  ctx.fillStyle = INK;
  ctx.font = `500 28px ${SERIF}`;
  spaced(ctx, [host.eventDay, host.city].filter(Boolean).join(" · ").toUpperCase(), STRIP_W / 2, fy + 222, 7);
  ctx.font = `36px ${HAND}`;
  ctx.fillText("see you in costume", STRIP_W / 2, fy + 320);
  sticker(ctx, pumpkin, STRIP_W / 2, fy + 470, 220, -3);

  edgePrint(ctx, [TITLE_Y, ...PHOTO_Y, FOOTER_Y]);

  // a few pieces of artwork on the rails, clear of faces
  sticker(ctx, bat, STRIP_W - RAIL - 30, TITLE_Y + CARD_H + 6, 260, -8);
  sticker(ctx, ghost, RAIL + 4, PHOTO_Y[2] - 4, 170, -6);
  sticker(ctx, hat, STRIP_W - RAIL - 20, PHOTO_Y[2] + SLOT_H + 14, 250, 10);

  return c;
}

/** 1080 × 1920 story image: the film strip on the plain dark ground, a ghost and the banjo cat beside it. */
export async function composeStory(strip: HTMLCanvasElement, host: HostSettings): Promise<HTMLCanvasElement> {
  const [paper, ghost, cat] = await Promise.all([
    loadImage("/kit/parchment-texture.png"),
    ...["ghost", "cat-banjo"].map((n) => loadImage(`/art/${n}.webp`)),
  ]);
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.35;
  ctx.drawImage(paper, 0, 0, W, H);
  ctx.restore();
  const glow = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W);
  glow.addColorStop(0, "rgba(48, 37, 31, 0.6)");
  glow.addColorStop(1, "rgba(15, 9, 8, 0.6)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const sh = 1520;
  const sw = (strip.width / strip.height) * sh;
  ctx.save();
  ctx.translate(W / 2, H / 2 - 30);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.drawImage(strip, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  sticker(ctx, ghost, 170, 1520, 230, -6);
  sticker(ctx, cat, 920, 1530, 230, 4);

  ctx.textAlign = "center";
  ctx.fillStyle = "#C0BBB1";
  ctx.font = `34px ${HAND}`;
  ctx.fillText(`${host.presenter} · ${host.subtitle}`.toLowerCase(), W / 2, H - 50);
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
