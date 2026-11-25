import { del, get, list } from "@vercel/blob";
import * as webpush from "web-push";
import { reminderFor, todayInRome, type StudySummary } from "../_lib/reminder.js";

/**
 * GET /api/cron/promemoria?turno=20|22 — lo chiama Vercel la sera (vedi "crons" in vercel.json).
 * Per ogni telefono iscritto: se oggi non ha finito le parti previste, manda la notifica.
 */
type Rec = { subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; summary: StudySummary };

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non autorizzato", { status: 401 });
  const turno = new URL(request.url).searchParams.get("turno") === "22" ? "22" : "20";
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return new Response("Chiavi mancanti", { status: 500 });
  webpush.setVapidDetails("https://setanta-coach.vercel.app", pub, priv);
  const today = todayInRome();
  let sent = 0, skipped = 0, removed = 0;
  const { blobs } = await list({ prefix: "devices/" });
  for (const b of blobs) {
    try {
      const r = await get(b.pathname, { access: "private", useCache: false });
      if (!r) continue;
      const rec = JSON.parse(await new Response(r.stream).text()) as Rec;
      const msg = reminderFor(rec.summary, today, turno);
      if (!msg) { skipped++; continue; }
      await webpush.sendNotification(rec.subscription, JSON.stringify({ ...msg, url: "/" }), { TTL: 3600, urgency: "normal" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await del(b.url); removed++; } // iscrizione non più valida
    }
  }
  return new Response(JSON.stringify({ turno, today, sent, skipped, removed }), { headers: { "content-type": "application/json" } });
}
