import { put } from "@vercel/blob";
import type { StudySummary } from "./_lib/reminder.js";

/**
 * POST /api/promemoria — il telefono si iscrive ai promemoria serali e manda il riassunto dello studio di oggi.
 * Body: { id, subscription?, summary }. Salvato in privato nell'archivio Blob "setanta-promemoria" (devices/<id>.json).
 */
type Body = { id?: unknown; subscription?: unknown; summary?: Partial<StudySummary> };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const isDate = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
const num = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(max, Math.round(x))) : 0);

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > 6000) return json({ error: "Troppo grande." }, 413);
  let body: Body;
  try { body = JSON.parse(raw) as Body; } catch { return json({ error: "Dati non validi." }, 400); }
  const id = typeof body.id === "string" && /^[a-z0-9-]{16,64}$/.test(body.id) ? body.id : null;
  const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const s = body.summary ?? {};
  if (!id || !sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string")
    return json({ error: "Iscrizione non valida." }, 400);
  const summary: StudySummary = {
    date: isDate(s.date) ? s.date : "1970-01-01",
    todayDone: num(s.todayDone, 200),
    todayTarget: num(s.todayTarget, 200),
    perDay: num(s.perDay, 200),
    lastStudy: isDate(s.lastStudy) ? s.lastStudy : null,
    restDay: num(s.restDay, 6),
    minutesPerPart: num(s.minutesPerPart, 10) || 2,
  };
  const record = { subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, summary, updated: new Date().toISOString() };
  await put(`devices/${id}.json`, JSON.stringify(record), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
  return json({ ok: true });
}
