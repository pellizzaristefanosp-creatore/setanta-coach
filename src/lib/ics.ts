import type { ISODate } from "./types";

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function compact(date: ISODate): string {
  return date.replaceAll("-", "");
}

/** Orario + minuti, senza andare oltre le 23:30. */
export function shiftTime(time: string, minutes: number): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

type Reminder = { uid: string; time: string; summary: string; description: string };

/**
 * Promemoria giornalieri per il Calendario di iPhone: due eventi ricorrenti, mai nel giorno libero.
 * Orari "flottanti" (senza fuso): il telefono li legge come ora locale.
 */
export function buildIcs(opts: { start: ISODate; until: ISODate; time: string; hook: string; restDay: number; stamp: Date }): string {
  const days = DAY_CODES.filter((_, i) => i !== opts.restDay).join(",");
  const stamp = opts.stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const reminders: Reminder[] = [
    {
      uid: "setanta-coach-1",
      time: opts.time,
      summary: "2 minuti. Solo play.",
      description: `${opts.hook}: apri Setanta Coach e premi il bottone.`,
    },
    {
      uid: "setanta-coach-2",
      time: shiftTime(opts.time, 120),
      summary: "Anche 1 minuto vale",
      description: "Se l'hai già fatto, ignora. Se no: un minuto e basta.",
    },
  ];
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Setanta Coach//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Setanta Coach"];
  for (const r of reminders) {
    const t = r.time.replace(":", "") + "00";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${compact(opts.start)}T${t}`,
      "DURATION:PT5M",
      `RRULE:FREQ=WEEKLY;BYDAY=${days};UNTIL=${compact(opts.until)}T235959`,
      `SUMMARY:${escapeText(r.summary)}`,
      `DESCRIPTION:${escapeText(r.description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:PT0M",
      `DESCRIPTION:${escapeText(r.summary)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
