import type { FilterId } from "./settings";

export const PHOTO_W = 1080;
export const PHOTO_H = 810;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applies one of the three looks plus an exposure gain, in place. Pixel math so it matches across browsers. */
export function applyFilter(data: Uint8ClampedArray, filter: FilterId, gain: number) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * gain;
    let g = data[i + 1] * gain;
    let b = data[i + 2] * gain;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    if (filter === "moonlit") {
      const c = (l - 128) * 1.12 + 128;
      r = c * 0.98 + 2;
      g = c * 0.99 + 2;
      b = c * 1.03 + 4;
    } else if (filter === "parchment") {
      const c = (l - 128) * 1.05 + 128;
      r = 18 + (c * 1.07 + 10) * 0.92;
      g = 18 + (c * 0.95 + 4) * 0.92;
      b = 18 + c * 0.74 * 0.92;
    } else {
      r = l + (r - l) * 0.7;
      g = l + (g - l) * 0.7;
      b = l + (b - l) * 0.7;
      r = 10 + (r * 1.06 + 6) * 0.95;
      g = 10 + (g + 2) * 0.95;
      b = 10 + b * 0.86 * 0.95;
    }
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
}

/**
 * Grabs one frame: center-crops the feed to 4:3, keeps it unmirrored (so costume text reads
 * correctly), and bakes in the filter. Returns a 1080 × 810 canvas.
 */
export function grabPhoto(video: HTMLVideoElement, filter: FilterId, gain: number): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const target = PHOTO_W / PHOTO_H;
  let sw = vw;
  let sh = vh;
  if (vw / vh > target) sw = vh * target;
  else sh = vw / target;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  const c = document.createElement("canvas");
  c.width = PHOTO_W;
  c.height = PHOTO_H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  const img = ctx.getImageData(0, 0, PHOTO_W, PHOTO_H);
  applyFilter(img.data, filter, gain);
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Small flat-sepia version shown before the strip "develops". */
export function ghostOf(photo: HTMLCanvasElement): string {
  const c = document.createElement("canvas");
  c.width = 216;
  c.height = 162;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(photo, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = 196 + (l - 128) * 0.12;
    d[i] = v * 1.04;
    d[i + 1] = v * 0.97;
    d[i + 2] = v * 0.82;
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL("image/jpeg", 0.7);
  c.width = 0;
  return url;
}

/** Average luminance of the live feed (0–255), sampled tiny so it costs nothing. */
export function sampleLuminance(video: HTMLVideoElement, scratch: HTMLCanvasElement): number {
  scratch.width = 48;
  scratch.height = 27;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, 48, 27);
  const d = ctx.getImageData(0, 0, 48, 27).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return sum / (d.length / 4);
}

/** Exposure gain for dark rooms: lifts a dim feed toward mid-grey, capped so noise stays tolerable. */
export const gainFor = (lum: number) => Math.min(1.6, Math.max(1, 112 / Math.max(lum, 1)));
