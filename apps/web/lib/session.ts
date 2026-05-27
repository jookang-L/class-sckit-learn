const SESSION_KEY = "sckit_session_id";

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function setStoredSessionId(id: string): void {
  sessionStorage.setItem(SESSION_KEY, id);
}

export function clearStoredSessionId(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export type LabPreferences = {
  mode: "guided" | "free";
  algorithm: string;
  datasetId: string;
};

const PREFS_KEY = "sckit_lab_prefs";

export function getLabPreferences(): LabPreferences {
  if (typeof window === "undefined") {
    return { mode: "guided", algorithm: "KNN", datasetId: "fish" };
  }
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { mode: "guided", algorithm: "KNN", datasetId: "fish" };
}

export function setLabPreferences(prefs: LabPreferences): void {
  sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
