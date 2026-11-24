import { questionWeight } from "./coach";
import { allQuestions, lessonFor } from "./lessons";
import type { ISODate, Question, State } from "./types";

/**
 * Domande dopo lo studio, scelte con i principi più solidi della ricerca sull'apprendimento:
 * - richiamo attivo (rispondere fa ricordare più che rileggere);
 * - feedback subito, con il perché;
 * - ripasso distanziato e mescolato (una domanda da una lezione già fatta);
 * - poche domande per volta: meglio 3 domande ogni giorno che 30 una volta sola (e non si molla a metà).
 * Le domande sbagliate diventano carte del ripasso e tornano nei giorni dopo.
 */

export type PracticeQuestion = Question & { from: string; kind: "parte" | "ripasso" | "lezione" };

type S = Pick<State, "answers" | "lessons" | "questions" | "presentations">;

function weighted<T>(items: T[], weight: (x: T) => number, n: number, rand: () => number): T[] {
  const left = items.map((x) => ({ x, w: Math.max(0.01, weight(x)) }));
  const out: T[] = [];
  while (out.length < n && left.length > 0) {
    const total = left.reduce((s, it) => s + it.w, 0);
    let r = rand() * total;
    let i = 0;
    while (i < left.length - 1 && r >= left[i]!.w) r -= left[i++]!.w;
    out.push(left[i]!.x);
    left.splice(i, 1);
  }
  return out;
}

/** Domande delle lezioni con l'indice della parte a cui si riferiscono. */
function lessonQuestions(state: S, code: string): (Question & { part: number })[] {
  const lesson = lessonFor(state, code);
  if (!lesson) return [];
  return lesson.questions.map((q, i) => ({
    id: `L-${code}-${i + 1}`,
    presentation: code,
    unit: lesson.unit,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    part: q.part,
  }));
}

/** Domande su ciò che hai già studiato in altre lezioni (parti fatte), per il ripasso mescolato. */
function studiedElsewhere(state: S, code: string): Question[] {
  const done = new Map(state.presentations.map((p) => [p.code, new Set(p.steps.map((s, i) => (s.done ? i : -1)).filter((i) => i >= 0))]));
  return state.presentations
    .filter((p) => p.code !== code)
    .flatMap((p) => lessonQuestions(state, p.code).filter((q) => done.get(p.code)?.has(q.part)));
}

const tag = (q: Question, kind: PracticeQuestion["kind"]): PracticeQuestion => ({ ...q, from: q.presentation ?? "", kind });

/** Dopo una parte: una domanda in più su quella parte e una di ripasso da una lezione già fatta. */
export function afterPart(state: S, code: string, partIndex: number, now: ISODate, rand: () => number = Math.random): PracticeQuestion[] {
  const own = lessonQuestions(state, code).filter((q) => q.part === partIndex);
  const out: PracticeQuestion[] = weighted(own, (q) => questionWeight(state, q, now), 1, rand).map((q) => tag(q, "parte"));
  const older = weighted(studiedElsewhere(state, code), (q) => questionWeight(state, q, now), 1, rand).map((q) => tag(q, "ripasso"));
  return [...out, ...older];
}

/** Partita di fine lezione: 4 domande della lezione (prima quelle mai viste o sbagliate) e 2 di ripasso. */
export function finalRound(state: S, code: string, now: ISODate, rand: () => number = Math.random): PracticeQuestion[] {
  const own = weighted(lessonQuestions(state, code), (q) => questionWeight(state, q, now), 4, rand).map((q) => tag(q, "lezione"));
  const older = weighted(studiedElsewhere(state, code), (q) => questionWeight(state, q, now), 2, rand).map((q) => tag(q, "ripasso"));
  // mescola il ripasso dentro la partita (non tutto in fondo)
  return [own[0], older[0], own[1], own[2], older[1], own[3]].filter((x): x is PracticeQuestion => !!x);
}

/** Carta del ripasso per una domanda sbagliata: domanda → risposta giusta e perché. */
export function mistakeCard(q: Question): { id: string; front: string; back: string } {
  const right = q.options[q.answer] ?? "";
  return { id: `E-${q.id}`, front: q.question, back: q.explanation ? `${right}. ${q.explanation}` : right };
}

export { allQuestions };
