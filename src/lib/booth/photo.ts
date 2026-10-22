export const PHOTO_W = 1080;
export const PHOTO_H = 810;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applies the dark-room exposure gain in place, leaving the colours natural. */
export function applyGain(data: Uint8ClampedArray, gain: number) {
  if (gain === 1) return;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] * gain);
    data[i + 1] = clamp(data[i + 1] * gain);
    data[i + 2] = clamp(data[i + 2] * gain);
  }
}

/**
 * Grabs one frame: center-crops the feed to 4:3, keeps it unmirrored (so costume text reads
 * correctly), and brightens it for dark rooms. Returns a 1080 × 810 canvas.
 */
export function grabPhoto(video: HTMLVideoElement, gain: number): HTMLCanvasElement {
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
  applyGain(img.data, gain);
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Small, nearly black version shown before the strip "develops" out of the dark. */
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
    const v = 44 + (l - 128) * 0.1;
    d[i] = v * 1.35;
    d[i + 1] = v * 0.8;
    d[i + 2] = v * 0.72;
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
