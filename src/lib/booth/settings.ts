export type FilterId = "moonlit" | "parchment" | "candle";
export type ChapterId = "raven" | "masquerade" | "garden";

export const FILTERS: { id: FilterId; name: string; css: string }[] = [
  { id: "moonlit", name: "Moonlit Silver", css: "grayscale(1) contrast(1.12)" },
  { id: "parchment", name: "Old Parchment", css: "sepia(0.85) contrast(1.05)" },
  { id: "candle", name: "Candlelight", css: "saturate(0.72) sepia(0.22)" },
];

export const CHAPTERS: {
  id: ChapterId;
  title: string;
  numeral: string;
  motif: "raven" | "crescent-moon" | "moth";
  line: string;
}[] = [
  { id: "raven", title: "The Raven", numeral: "I", motif: "raven", line: "Quoth the raven, nevermore." },
  { id: "masquerade", title: "The Masquerade", numeral: "II", motif: "crescent-moon", line: "Unmasked only by moonlight." },
  { id: "garden", title: "The Midnight Garden", numeral: "III", motif: "moth", line: "Where the moths keep watch." },
];

export interface HostSettings {
  eventName: string;
  eventDate: string;
  subtitle: string;
  soundOn: boolean;
}

export const DEFAULT_HOST: HostSettings = {
  eventName: "Sebelum Uber Menjemput",
  eventDate: "November 1, 2026",
  subtitle: "A Haunted Tale",
  soundOn: false,
};

const KEY = "sum-host-settings";

export function loadHost(): HostSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_HOST, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_HOST;
}

export function saveHost(s: HostSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function deviceId(): string {
  try {
    let id = localStorage.getItem("sum-device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sum-device", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}
