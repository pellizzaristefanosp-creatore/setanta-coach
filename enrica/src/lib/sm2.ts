import { addDays } from "./dates";
import type { Card, ISODate } from "./types";

/** Voti: 1 = non ricordo, 3 = difficile, 4 = bene, 5 = facile (algoritmo SM-2). */
export type Grade = 1 | 3 | 4 | 5;

export function review(card: Card, grade: Grade, now: ISODate): Card {
  let { ef, interval, reps } = card;
  if (grade < 3) {
    reps = 0;
    interval = 1;
  } else {
    interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ef);
    reps += 1;
  }
  ef = Math.max(1.3, ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return { ...card, ef: Math.round(ef * 100) / 100, interval, reps, due: addDays(now, interval) };
}

export function newCard(front: string, back: string, now: ISODate, presentationId?: string): Card {
  return {
    id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    presentationId,
    front,
    back,
    ef: 2.5,
    interval: 0,
    reps: 0,
    due: now,
    created: now,
  };
}

export function dueCards(cards: Card[], now: ISODate): Card[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due.localeCompare(b.due));
}
