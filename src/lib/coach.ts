import { dailyChallenge, bossStatus } from "./game";
import { allQuestions } from "./lessons";
import { currentItem } from "./plan";
import { dueCards } from "./sm2";
import type { ISODate, Question, State } from "./types";

/** Cosa fa il bottone unico adesso: sempre la cosa più utile per imparare. */
export type NextAction =
  | { kind: "part"; label: string; sub: string }
  | { kind: "cards"; label: string; sub: string; count: number }
  | { kind: "boss"; label: string; sub: string; unit: number }
  | { kind: "quiz"; label: string; sub: string };

export function nextAction(state: State, now: ISODate): NextAction {
  const daily = dailyChallenge(state, now);
  const item = currentItem(state, now);
  const due = dueCards(state.cards, now).length;
  const boss = bossStatus(state).find((b) => b.state === "pronta");
  const partSub = () => {
    if (!item) return "";
    if (item.kind === "placeholder") return `${item.code} · ${item.title}`;
    const p = item.presentation;
    const i = p.steps.findIndex((s) => !s.done);
    return `${p.code} · parte ${i + 1} di ${p.steps.length}`;
  };

  // 1. Prima le parti nuove che servono oggi (ascolto → richiamo).
  if (item && !daily.complete) return { kind: "part", label: "Solo 2 minuti", sub: partSub() };
  // 2. Poi il ripasso nei giorni giusti (ripetizione spaziata).
  if (due >= 3) return { kind: "cards", label: "2 minuti di ripasso", sub: `${due} carte da ricordare`, count: due };
  // 3. Unità finita: la partita che la chiude.
  if (boss) return { kind: "boss", label: "Partita di fine unità", sub: `Unità ${boss.unit} · ${boss.title}`, unit: boss.unit };
  // 4. Carte rimaste, anche poche.
  if (due > 0) return { kind: "cards", label: "2 minuti di ripasso", sub: `${due} carte da ricordare`, count: due };
  // 5. Vantaggio: vai avanti con la prossima parte.
  if (item) return { kind: "part", label: "Ancora 2 minuti", sub: partSub() };
  // 6. Niente di nuovo: quiz mescolato sugli argomenti deboli.
  return { kind: "quiz", label: "Quiz lampo", sub: "Domande mescolate, prima quelle sbagliate" };
}

/** Peso di una domanda: mai vista o sbagliata di recente = più probabile. */
export function questionWeight(state: Pick<State, "answers">, q: Question, now: ISODate): number {
  const a = state.answers[q.id];
  if (!a) return 3;
  if (!a.lastCorrect) return 6;
  const wrongRate = a.wrong / Math.max(1, a.seen);
  const recent = a.last === now ? 0.2 : 1;
  return (0.6 + wrongRate * 3) * recent;
}

/**
 * Sceglie n domande: pesate sugli errori e mescolate tra unità (interleaving).
 * `rand` si passa nei test per avere risultati ripetibili.
 */
export function pickQuestions(state: State, n: number, now: ISODate, opts: { unit?: number; rand?: () => number } = {}): Question[] {
  const rand = opts.rand ?? Math.random;
  let pool = allQuestions(state);
  if (opts.unit != null) pool = pool.filter((q) => q.unit === opts.unit);
  const picked: Question[] = [];
  const left = pool.map((q) => ({ q, w: questionWeight(state, q, now) }));
  while (picked.length < n && left.length > 0) {
    // Mescola: penalizza l'unità della domanda appena scelta.
    const lastUnit = picked.at(-1)?.unit;
    const weights = left.map((x) => (opts.unit == null && x.q.unit === lastUnit ? x.w * 0.35 : x.w));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = rand() * total;
    let idx = 0;
    while (idx < weights.length - 1 && r >= weights[idx]!) r -= weights[idx++]!;
    picked.push(left[idx]!.q);
    left.splice(idx, 1);
  }
  return picked;
}

export function weakCount(state: Pick<State, "answers">): number {
  return Object.values(state.answers).filter((a) => !a.lastCorrect).length;
}
