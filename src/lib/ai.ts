import { getState } from "./store";

/** Chiamata alle funzioni intelligenti sul server, con il codice di accesso salvato nell'app. */
export async function aiPost<T>(path: "/api/paragone" | "/api/richiamo", body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const code = getState().settings.appCode?.trim();
  if (!code) return { ok: false, error: "Scrivi il codice di accesso in Altro → Funzioni intelligenti." };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, error: "Serve internet per questa funzione." };
  try {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-app-code": code }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `Errore ${res.status}. Riprova.` };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Senza rete non funziona. Riprova con internet." };
  }
}

export type Paragone = { simple: string; analogy: string; remember: string };
export type RecallFeedback = { score: number; praise: string; got: string[]; missing: string[]; fix: string; tip: string; errors?: { wrong: string; right: string }[]; corrected?: string };
