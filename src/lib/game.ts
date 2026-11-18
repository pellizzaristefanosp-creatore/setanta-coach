import { addDays, weekStart } from "./dates";
import { allQuestions } from "./lessons";
import { buildPlan, isDone } from "./plan";
import { buildSchedule } from "./schedule";
import { streak } from "./streak";
import type { ISODate, State, XpKind } from "./types";

/* ——— Punti ——— */

export const POINTS: Record<XpKind, number> = {
  part: 10,
  check: 5,
  recall: 10,
  card: 2,
  quiz: 3,
  boss: 50,
  presentation: 25,
  daily: 20,
  weekly: 60,
  exercise: 15,
  game: 10,
};

export const LEVELS = [
  { name: "Panchina", min: 0 },
  { name: "Convocato", min: 150 },
  { name: "Titolare", min: 450 },
  { name: "Vice-capitano", min: 900 },
  { name: "Capitano", min: 1500 },
  { name: "Campione", min: 2400 },
] as const;

export function totalXp(state: Pick<State, "xp">): number {
  return state.xp.reduce((s, e) => s + e.points, 0);
}

export function xpOn(state: Pick<State, "xp">, date: ISODate): number {
  return state.xp.filter((e) => e.date === date).reduce((s, e) => s + e.points, 0);
}

export function level(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]!.min) i++;
  const cur = LEVELS[i]!;
  const next = LEVELS[i + 1];
  return {
    index: i,
    name: cur.name,
    next: next?.name ?? null,
    progress: next ? (xp - cur.min) / (next.min - cur.min) : 1,
    toNext: next ? next.min - xp : 0,
  };
}

/* ——— Sfida del giorno: le parti che servono oggi per restare in linea ——— */

export type Daily = { target: number; done: number; reason: string; complete: boolean };

/** Sfida del giorno = le parti che il piano chiede oggi (ricalcolato ogni giorno). */
export function dailyChallenge(state: State, now: ISODate): Daily {
  const sch = buildSchedule(state, now);
  const target = sch.todayTarget;
  const done = sch.todayDone;
  const what = sch.todayCodes.map((c) => `${c.count} della ${c.code}`).join(", ");
  const reason = target === 0 ? "Oggi è libero: se vuoi, 2 minuti di ripasso." : sch.todayLeft > 0 ? `Oggi: ${what}.` : "Fatto per oggi.";
  return { target, done, reason, complete: done >= target };
}

/* ——— Sfida della settimana: chiudere le presentazioni previste fino a domenica ——— */

export type Weekly = { codes: string[]; done: number; total: number; complete: boolean; endsOn: ISODate };

export function weeklyChallenge(state: State, now: ISODate): Weekly {
  const monday = weekStart(now);
  const sunday = addDays(monday, 6);
  const doneThisWeek = state.presentations.filter((p) => isDone(p) && p.doneAt && p.doneAt >= monday && p.doneAt <= sunday).map((p) => p.code);
  const planned = buildPlan(state, now)
    .filter((d) => d.date <= sunday && d.kind === "study")
    .map((d) => (d.kind === "study" ? (d.item.kind === "real" ? d.item.presentation.code : d.item.code) : ""));
  const codes = [...new Set([...doneThisWeek, ...planned])];
  return { codes, done: doneThisWeek.length, total: codes.length, complete: codes.length > 0 && planned.length === 0, endsOn: sunday };
}

/* ——— Partita di fine unità ——— */

export const BOSS_QUESTIONS = 10;
export const BOSS_TO_WIN = 7;

export type BossStatus = { unit: number; title: string; state: "bloccata" | "pronta" | "vinta"; questions: number; best?: number; missing: string[] };

export function bossStatus(state: State): BossStatus[] {
  const qs = allQuestions(state);
  return state.units.map((u) => {
    const ps = state.presentations.filter((p) => p.unit === u.n);
    const missing = ps.filter((p) => !isDone(p)).map((p) => p.code);
    const questions = qs.filter((q) => q.unit === u.n).length;
    const res = state.bosses[String(u.n)];
    const st = res?.won ? "vinta" : ps.length > 0 && missing.length === 0 && questions >= BOSS_QUESTIONS ? "pronta" : "bloccata";
    return { unit: u.n, title: u.title, state: st, questions, best: res?.best, missing };
  });
}

/* ——— Premi ——— */

export type Badge = { id: string; icon: string; name: string; how: string };

export const BADGES: Badge[] = [
  { id: "primo-play", icon: "▶️", name: "Primo play", how: "Fai la prima parte" },
  { id: "serie-3", icon: "🔥", name: "Tre di fila", how: "3 giorni di fila" },
  { id: "serie-7", icon: "🔥", name: "Settimana piena", how: "7 giorni di fila" },
  { id: "serie-14", icon: "💪", name: "Due settimane", how: "14 giorni di fila" },
  { id: "prima-pres", icon: "✅", name: "Prima presentazione", how: "Chiudi una presentazione" },
  { id: "doppietta", icon: "⚽", name: "Doppietta", how: "2 presentazioni nello stesso giorno" },
  { id: "unita-vinta", icon: "🏆", name: "Unità vinta", how: "Vinci una partita di fine unità" },
  { id: "tripletta", icon: "🥇", name: "Tripletta", how: "Vinci 3 partite di fine unità" },
  { id: "memoria-50", icon: "🧠", name: "Memoria", how: "50 flashcard ripassate" },
  { id: "cecchino", icon: "🎯", name: "Cecchino", how: "Quiz da 10 con almeno 9 giuste" },
  { id: "simulazione", icon: "📝", name: "Pronto per la finale", how: "Simulazione d'esame con il 70%" },
  { id: "rientro", icon: "↩️", name: "Rientro", how: "Torna a studiare dopo un giorno saltato" },
  { id: "pratico", icon: "📎", name: "Consegnato", how: "Spunta la consegna dell'esame pratico" },
];

export function earnedBadges(state: State, now: ISODate): string[] {
  const out: string[] = [];
  const st = streak(state, now);
  const doneDates = state.presentations.filter((p) => isDone(p) && p.doneAt && p.doneAt >= state.settings.startDate).map((p) => p.doneAt!);
  const perDay = new Map<string, number>();
  doneDates.forEach((d) => perDay.set(d, (perDay.get(d) ?? 0) + 1));
  const wins = Object.values(state.bosses).filter((b) => b.won).length;
  const cards = state.xp.filter((e) => e.kind === "card").length;
  const studied = Object.keys(state.log).filter((d) => (state.log[d]?.steps ?? 0) > 0 || (state.log[d]?.minutes ?? 0) >= 2).sort();
  if (studied.length > 0) out.push("primo-play");
  if (st.days >= 3) out.push("serie-3");
  if (st.days >= 7) out.push("serie-7");
  if (st.days >= 14) out.push("serie-14");
  if (state.xp.some((e) => e.kind === "presentation")) out.push("prima-pres");
  if ([...perDay.values()].some((n) => n >= 2)) out.push("doppietta");
  if (wins >= 1) out.push("unita-vinta");
  if (wins >= 3) out.push("tripletta");
  if (cards >= 50) out.push("memoria-50");
  if (state.quizResults.some((r) => r.total >= 10 && r.correct >= 9)) out.push("cecchino");
  if (state.quizResults.some((r) => r.mode === "simulazione" && r.total >= 20 && r.correct / r.total >= 0.7)) out.push("simulazione");
  for (let i = 1; i < studied.length; i++) {
    if (addDays(studied[i - 1]!, 1) < studied[i]!) {
      out.push("rientro");
      break;
    }
  }
  if (state.checklist.find((c) => c.id === "c11")?.done) out.push("pratico");
  return out.filter((id) => !state.badges[id]);
}
