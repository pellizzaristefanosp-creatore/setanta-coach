import { addDays, weekStart, weekday } from "./dates";
import { comparePresentationCode } from "./plan";
import type { ISODate, State } from "./types";

/**
 * Piano per parti: tutte le parti che mancano (comprese quelle stimate delle unità non ancora uscite)
 * vengono distribuite in modo uniforme fino alla fine dello studio, una settimana prima dell'MCQ.
 * Se un giorno resta indietro, il conto si rifà da oggi e il minimo giornaliero sale da solo.
 */

export const MINUTES_PER_PART = 2; // ascolto + domanda veloce + richiamo
export const ESTIMATED_PARTS = 13; // parti stimate per una presentazione non ancora uscita
export const PRESENTATIONS_PER_UNIT = 3; // stima per le unità senza titoli

export type SchedPart = { code: string; release: ISODate; estimated: boolean };
export type SchedDay = { date: ISODate; rest: boolean; parts: SchedPart[] };
export type Schedule = {
  perDay: number; // parti al giorno (giorni di studio)
  todayTarget: number; // parti da fare oggi in tutto (fatte comprese)
  todayDone: number;
  todayLeft: number;
  todayCodes: { code: string; count: number }[]; // cosa fare oggi
  days: SchedDay[]; // da oggi alla fine
  end: ISODate | null; // ultimo giorno con parti
  studyEnd: ISODate; // traguardo: una settimana prima dell'MCQ
  totalParts: number; // tutte le parti del corso (fatte + da fare, stime comprese)
  doneParts: number;
  remainingParts: number;
  estimatedParts: number;
  percent: number; // corso completato
  weekDays: number; // giorni di studio da oggi a domenica
  weekParts: number; // parti da oggi a domenica (comprese quelle di oggi ancora da fare)
};

export function studyEndOf(state: Pick<State, "exams">): ISODate {
  return addDays(state.exams.mcqTarget, -7);
}

/** Parti da fare, nell'ordine del corso, e conteggi per la percentuale. */
export function remainingParts(state: Pick<State, "units" | "presentations">) {
  const parts: SchedPart[] = [];
  let total = 0;
  let done = 0;
  for (const u of [...state.units].sort((a, b) => a.n - b.n)) {
    const ps = state.presentations.filter((p) => p.unit === u.n).sort((a, b) => comparePresentationCode(a.code, b.code));
    if (ps.length === 0) {
      for (let k = 1; k <= PRESENTATIONS_PER_UNIT; k++) {
        for (let i = 0; i < ESTIMATED_PARTS; i++) parts.push({ code: `${u.n}.${k}`, release: u.release, estimated: true });
        total += ESTIMATED_PARTS;
      }
      continue;
    }
    for (const p of ps) {
      total += p.steps.length;
      for (const st of p.steps) {
        if (st.done) done++;
        else parts.push({ code: p.code, release: u.release, estimated: false });
      }
    }
  }
  return { parts, total, done };
}

function simulate(parts: SchedPart[], from: ISODate, end: ISODate, restDay: number, perDay: number, doneToday: number): SchedDay[] | null {
  const days: SchedDay[] = [];
  let i = 0;
  for (let d = from; d <= end; d = addDays(d, 1)) {
    const rest = weekday(d) === restDay;
    const cap = rest ? 0 : Math.max(0, perDay - (d === from ? doneToday : 0));
    const today: SchedPart[] = [];
    while (today.length < cap && i < parts.length && parts[i]!.release <= d) today.push(parts[i++]!);
    days.push({ date: d, rest, parts: today });
  }
  return i >= parts.length ? days : null;
}

export function buildSchedule(state: Pick<State, "units" | "presentations" | "settings" | "exams" | "log">, now: ISODate): Schedule {
  const { parts, total, done } = remainingParts(state);
  const doneToday = state.log[now]?.steps ?? 0;
  const studyEnd = studyEndOf(state);
  const end = studyEnd > now ? studyEnd : addDays(now, 7);
  let perDay = 1;
  let days: SchedDay[] | null = null;
  for (; perDay <= 80; perDay++) {
    days = simulate(parts, now, end, state.settings.restDay, perDay, doneToday);
    if (days) break;
  }
  days ??= simulate(parts, now, addDays(end, 365), state.settings.restDay, 80, doneToday) ?? [];
  const todayParts = days[0]?.parts ?? [];
  const counts = new Map<string, number>();
  todayParts.forEach((p) => counts.set(p.code, (counts.get(p.code) ?? 0) + 1));
  const sunday = addDays(weekStart(now), 6);
  const week = days.filter((d) => d.date <= sunday);
  const lastWithParts = [...days].reverse().find((d) => d.parts.length > 0);
  const isRest = weekday(now) === state.settings.restDay;
  return {
    perDay,
    todayTarget: isRest ? doneToday : doneToday + todayParts.length,
    todayDone: doneToday,
    todayLeft: todayParts.length,
    todayCodes: [...counts.entries()].map(([code, count]) => ({ code, count })),
    days,
    end: lastWithParts?.date ?? (parts.length === 0 ? now : null),
    studyEnd,
    totalParts: total,
    doneParts: done,
    remainingParts: parts.length,
    estimatedParts: parts.filter((p) => p.estimated).length,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
    weekDays: week.filter((d) => !d.rest && d.parts.length > 0).length,
    weekParts: week.reduce((s, d) => s + d.parts.length, 0),
  };
}

export function minutesOf(parts: number): number {
  return parts * MINUTES_PER_PART;
}

/** "16 min", "1 h 20 min" */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
