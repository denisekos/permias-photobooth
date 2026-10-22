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
  presenter: string;
  subtitle: string;
  eventDate: string;
  eventDay: string;
  eventTime: string;
  doors: string;
  venue: string;
  city: string;
  soundOn: boolean;
}

/** Defaults match the party poster; all of it is editable in host settings (Shift+H). */
export const DEFAULT_HOST: HostSettings = {
  eventName: "Sebelum Uber Menjemput",
  presenter: "Permias NYC",
  subtitle: "Halloween",
  eventDate: "November 1, 2026",
  eventDay: "Sunday",
  eventTime: "9 PM — 12 AM",
  doors: "Doors open 9 PM",
  venue: "@ SoHo",
  city: "New York, NY",
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
