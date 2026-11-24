import type { AudioLine } from "./audio";
import type { Turn, TurnPack } from "./turnSchema";

export * from "./turnSchema";

const packs: TurnPack[] = Object.values(import.meta.glob<{ default: TurnPack }>("../data/turns/*.json", { eager: true })).map((m) => m.default);

export function turnsFor(code: string, part: number): Turn[] {
  return packs.find((p) => p.code === code)?.turns.filter((t) => t.part === part) ?? [];
}

/** Quante volte su 100 una parte con domande ferma l'audio per farti rispondere. */
export const TURN_CHANCE = 0.6;

/**
 * Sceglie a caso se e quale domanda fare in questa parte.
 * `rnd` è un numero tra 0 e 1 (Math.random nell'app, fisso nei test).
 */
export function pickTurn(turns: Turn[], lines: AudioLine[], rnd: number): { turn: Turn; at: number } | null {
  const usable = turns.filter((t) => lines[t.line + 1] !== undefined);
  if (usable.length === 0 || rnd >= TURN_CHANCE) return null;
  const turn = usable[Math.min(usable.length - 1, Math.floor((rnd / TURN_CHANCE) * usable.length))]!;
  // ci si ferma appena prima della risposta (la battuta dopo la domanda)
  return { turn, at: Math.max(0, lines[turn.line + 1]!.start - 0.15) };
}
