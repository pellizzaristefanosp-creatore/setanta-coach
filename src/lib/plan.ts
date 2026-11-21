import { addDays, daysBetween, weekday } from "./dates";
import type { ISODate, Presentation, State, Unit } from "./types";

/** Quante presentazioni si stimano per un'unità ancora senza titoli. */
export const PLACEHOLDERS_PER_UNIT = 3;

export type QueueItem =
  | { kind: "real"; presentation: Presentation; unit: number; release: ISODate }
  | { kind: "placeholder"; code: string; unit: number; release: ISODate; title: string };

export type PlanDay =
  | { date: ISODate; kind: "study"; item: QueueItem }
  | { date: ISODate; kind: "rest" }
  | { date: ISODate; kind: "wait"; nextRelease: ISODate };

export function comparePresentationCode(a: string, b: string): number {
  const [au = 0, ai = 0] = a.split(".").map(Number);
  const [bu = 0, bi = 0] = b.split(".").map(Number);
  return au - bu || ai - bi;
}

export function isDone(p: Presentation): boolean {
  return p.steps.length > 0 && p.steps.every((s) => s.done);
}

function releaseOf(units: Unit[], n: number): ISODate {
  return units.find((u) => u.n === n)?.release ?? "1970-01-01";
}

/** Coda delle presentazioni da fare, in ordine; le unità senza titoli hanno segnaposti. */
export function queue(state: Pick<State, "units" | "presentations">): QueueItem[] {
  const items: QueueItem[] = [];
  const units = [...state.units].sort((a, b) => a.n - b.n);
  for (const u of units) {
    const ps = state.presentations.filter((p) => p.unit === u.n).sort((a, b) => comparePresentationCode(a.code, b.code));
    if (ps.length === 0) {
      for (let i = 1; i <= PLACEHOLDERS_PER_UNIT; i++) {
        items.push({ kind: "placeholder", code: `${u.n}.${i}`, unit: u.n, release: u.release, title: `${u.title} – parte ${i}` });
      }
      continue;
    }
    for (const p of ps) {
      if (!isDone(p)) items.push({ kind: "real", presentation: p, unit: u.n, release: releaseOf(state.units, u.n) });
    }
  }
  return items;
}

/**
 * Calendario da `from` in poi: una presentazione al giorno, mai nel giorno libero,
 * mai prima dell'uscita della sua unità. Se oggi la presentazione è già finita, si parte da domani.
 */
export function buildPlan(state: Pick<State, "units" | "presentations" | "settings">, from: ISODate): PlanDay[] {
  const q = queue(state);
  const finishedToday = state.presentations.some((p) => p.doneAt === from && isDone(p));
  const days: PlanDay[] = [];
  let date = finishedToday ? addDays(from, 1) : from;
  if (finishedToday) days.push({ date: from, kind: "rest" });
  let guard = 0;
  while (q.length > 0 && guard++ < 400) {
    if (weekday(date) === state.settings.restDay) {
      days.push({ date, kind: "rest" });
    } else {
      const idx = q.findIndex((it) => it.release <= date);
      if (idx === -1) {
        const next = q.reduce((m, it) => (it.release < m ? it.release : m), q[0]!.release);
        days.push({ date, kind: "wait", nextRelease: next });
      } else {
        const [item] = q.splice(idx, 1);
        days.push({ date, kind: "study", item: item! });
      }
    }
    date = addDays(date, 1);
  }
  return days;
}

export type Situation = {
  finish: ISODate | null; // ultimo giorno di studio previsto
  remaining: number; // presentazioni ancora da fare (segnaposti compresi)
  estimated: number; // di cui stimate
  marginDays: number | null; // giorni liberi tra fine studio e MCQ (negativo = ritardo)
  skippedDays: number; // giorni di studio senza neanche 2 minuti
};

export function situation(state: State, now: ISODate): Situation {
  const plan = buildPlan(state, now);
  const study = plan.filter((d) => d.kind === "study");
  const finish = study.at(-1)?.date ?? null;
  return {
    finish,
    remaining: study.length,
    estimated: study.filter((d) => d.kind === "study" && d.item.kind === "placeholder").length,
    marginDays: finish ? daysBetween(finish, state.exams.mcqTarget) - 1 : null,
    skippedDays: skippedDays(state, now),
  };
}

export function daySaved(state: Pick<State, "log">, date: ISODate): boolean {
  const l = state.log[date];
  return !!l && (l.steps >= 1 || l.minutes >= 2);
}

/** Giorni di studio (non liberi) dall'inizio a ieri senza nemmeno 2 minuti. */
export function skippedDays(state: Pick<State, "log" | "settings">, now: ISODate): number {
  let n = 0;
  for (let d = state.settings.startDate; d < now; d = addDays(d, 1)) {
    if (weekday(d) === state.settings.restDay) continue;
    if (!daySaved(state, d)) n++;
  }
  return n;
}

/**
 * La presentazione su cui lavorare adesso: quella che stavi facendo, se non è finita (anche se l'hai aperta
 * prima della sua data); se l'hai finita, la lezione dopo; altrimenti la prima della coda già uscita.
 */
export function currentItem(state: Pick<State, "units" | "presentations" | "lastPresentationId">, now: ISODate): QueueItem | null {
  const all = queue(state), q = all.filter((it) => it.release <= now);
  const lastId = state.lastPresentationId;
  const last = lastId ? all.find((it) => it.kind === "real" && it.presentation.id === lastId) : undefined;
  if (last) return last;
  const lastP = lastId ? state.presentations.find((p) => p.id === lastId) : undefined;
  if (lastP) {
    const after = q.find((it) => it.kind === "real" && comparePresentationCode(it.presentation.code, lastP.code) > 0);
    if (after) return after;
  }
  return q[0] ?? null;
}

/** La lezione dopo quella di adesso (per il pulsante "Prossima lezione"), tra quelle già uscite. */
export function nextItem(state: Pick<State, "units" | "presentations" | "lastPresentationId">, now: ISODate): QueueItem | null {
  const cur = currentItem(state, now);
  if (!cur) return null;
  const code = cur.kind === "real" ? cur.presentation.code : cur.code;
  return queue(state).filter((it) => it.release <= now).find((it) => comparePresentationCode(it.kind === "real" ? it.presentation.code : it.code, code) > 0) ?? null;
}
