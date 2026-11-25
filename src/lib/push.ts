import { MINUTES_PER_PART, buildSchedule } from "./schedule";
import { getState } from "./store";
import { today } from "./dates";

/**
 * Promemoria serali sul telefono (notifiche push): alle 20 e alle 22, solo se oggi non hai finito le parti previste.
 * Il telefono manda al server un piccolo riassunto (niente testi, solo numeri e date); lo decide api/cron/promemoria.
 */
const PUBLIC_KEY = "BAeAcDTjdZSPVrWvSgb5wKbBIkr1_PkGh3vB0WZVce31mh5yrImbHVY7iEsj61wUL6m1qAMbzHut6r3JStf6gUY";
const ID_KEY = "setanta-push-id";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

function deviceId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(ID_KEY, id); }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Il riassunto di oggi, calcolato dallo stesso piano della schermata Oggi. */
export function studySummary() {
  const s = getState(), now = today(), sch = buildSchedule(s, now);
  const studied = Object.entries(s.log).filter(([, v]) => (v?.steps ?? 0) > 0).map(([d]) => d).sort();
  return { date: now, todayDone: sch.todayDone, todayTarget: sch.todayTarget, perDay: sch.perDay, lastStudy: studied.at(-1) ?? null, restDay: s.settings.restDay, minutesPerPart: MINUTES_PER_PART };
}

async function send(sub: PushSubscription) {
  await fetch("/api/promemoria", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: deviceId(), subscription: sub.toJSON(), summary: studySummary() }) });
}

/** Da un tocco: chiede il permesso e iscrive il telefono. Restituisce un messaggio per lo schermo. */
export async function enablePush(): Promise<string> {
  if (!pushSupported()) return "Questo telefono non supporta le notifiche dell'app. Su iPhone: aggiungi l'app alla schermata Home e aprila da lì.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifiche non permesse. Puoi attivarle da Impostazioni → Notifiche → Setanta.";
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  await send(sub);
  return "Promemoria attivi: alle 20 e alle 22, solo se non hai finito le parti di oggi.";
}

let last = "";
/** Aggiorna il server quando cambia qualcosa (aperta l'app, parte fatta). Silenziosa se le notifiche non sono attive. */
export async function syncPush(): Promise<void> {
  try {
    if (pushPermission() !== "granted") return;
    const key = JSON.stringify(studySummary());
    if (key === last) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await send(sub);
    last = key;
  } catch {
    /* senza rete: riprova alla prossima occasione */
  }
}
