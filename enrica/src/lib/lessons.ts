import { makePresentation } from "../data/seed";
import type { LessonPack } from "./lesson";
import { newCard } from "./sm2";
import type { Card, ISODate, Presentation, Question, State } from "./types";

/** Lezioni incluse nell'app (scritte dai PDF del corso). */
const bundled: LessonPack[] = Object.values(
  import.meta.glob<{ default: LessonPack }>("../data/lessons/*.json", { eager: true }),
).map((m) => m.default);

export function bundledLessons(): LessonPack[] {
  return bundled;
}

/** Le lezioni importate dall'utente vincono su quelle incluse con lo stesso codice. */
export function allLessons(state: Pick<State, "lessons">): LessonPack[] {
  const byCode = new Map<string, LessonPack>();
  for (const l of bundled) byCode.set(l.code, l);
  for (const l of state.lessons ?? []) byCode.set(l.code, l);
  return [...byCode.values()];
}

export function lessonFor(state: Pick<State, "lessons">, code: string): LessonPack | undefined {
  return allLessons(state).find((l) => l.code === code);
}

export function stepTitle(slide: number, title: string): string {
  return `Parte ${slide} · ${title}`;
}

/**
 * Allinea le presentazioni alle lezioni: una parte per slide della lezione.
 * Le spunte già messe restano (per posizione). Muta lo stato passato.
 */
export function syncLessons(state: State): void {
  for (const lesson of allLessons(state)) {
    const titles = lesson.parts.map((p) => stepTitle(p.slide, p.title));
    let p: Presentation | undefined = state.presentations.find((x) => x.code === lesson.code);
    if (!p) {
      p = makePresentation(lesson.code, lesson.title, titles);
      state.presentations.push(p);
      continue;
    }
    const same = p.steps.length === titles.length && p.steps.every((s, i) => s.title === titles[i]);
    if (same) continue;
    const wasDone = p.steps.length > 0 && p.steps.every((s) => s.done);
    p.steps = titles.map((t, i) => ({ id: `p-${lesson.code}-s${i + 1}`, title: t, done: wasDone || (p!.steps[i]?.done ?? false) }));
    if (!p.title || /parte \d+$/.test(p.title)) p.title = lesson.title;
  }
}

/** Domande d'esame: quelle importate a mano + quelle di ogni lezione. */
export function allQuestions(state: Pick<State, "questions" | "lessons">): Question[] {
  const fromLessons = allLessons(state).flatMap((l) =>
    l.questions.map((q, i) => ({
      id: `L-${l.code}-${i + 1}`,
      presentation: l.code,
      unit: l.unit,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
    })),
  );
  return [...state.questions, ...fromLessons];
}

/** Flashcard già pronte di una parte: entrano nel ripasso quando la parte è fatta. */
export function cardsForPart(lesson: LessonPack, partIndex: number, presentationId: string, now: ISODate): Card[] {
  return lesson.flashcards
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.part === partIndex)
    .map(({ f, i }) => ({ ...newCard(f.front, f.back, now, presentationId), id: `L-${lesson.code}-c${i + 1}` }));
}
