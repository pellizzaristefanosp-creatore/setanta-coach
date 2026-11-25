/**
 * Promemoria serali (20 e 22): cosa scrivere a Ste. Funzione pura, usata dal server (api/cron/promemoria) e dai test (src/lib/reminder.test.ts).
 * Il telefono manda al server un riassunto (StudySummary) ogni volta che l'app si apre o si studia una parte.
 */
export type StudySummary = {
  /** giorno del riassunto (data locale del telefono) */
  date: string;
  todayDone: number;
  todayTarget: number;
  /** parti al giorno previste dal piano */
  perDay: number;
  /** ultimo giorno in cui ha studiato almeno una parte */
  lastStudy: string | null;
  /** 0 = domenica … 6 = sabato */
  restDay: number;
  minutesPerPart: number;
};

const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const daysBetween = (a: string, b: string) => Math.round((day(b) - day(a)) / 86_400_000);
const weekdayOf = (d: string) => new Date(day(d)).getUTCDay();

/** Il messaggio da mandare stasera, oppure null se non serve (fatto tutto, giorno libero). */
export function reminderFor(s: StudySummary, today: string, turno: "20" | "22"): { title: string; body: string } | null {
  if (weekdayOf(today) === s.restDay) return null;
  const openedToday = s.date === today;
  if (openedToday && s.todayTarget > 0 && s.todayDone >= s.todayTarget) return null;
  const away = s.lastStudy ? daysBetween(s.lastStudy, today) : null;
  const left = Math.max(1, openedToday ? s.todayTarget - s.todayDone : s.perDay);
  const min = Math.max(2, Math.round(left * s.minutesPerPart));
  const parti = `${left} ${left === 1 ? "parte" : "parti"}`;
  if (turno === "22")
    return { title: "Ultima chiamata ⏰", body: `Ste, mancano ancora ${parti} (circa ${min} minuti). Anche solo 2 minuti salvano la giornata.` };
  if (away != null && away >= 2)
    return { title: "Ste, si riparte 💪", body: `Sono ${away} giorni che non studi: oggi ti ho messo ${parti} (circa ${min} minuti). Meglio non chiudere la giornata senza averle finite.` };
  return { title: "I tuoi 2 minuti di oggi", body: `Ste, oggi ti mancano ${parti} (circa ${min} minuti). Meglio non chiudere la giornata senza averle fatte.` };
}

/** Data di oggi a Roma (il server gira in UTC). */
export function todayInRome(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
