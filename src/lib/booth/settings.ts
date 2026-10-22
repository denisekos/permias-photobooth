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
