/** Dialoghi delle lezioni (Giuliano ed Enrica), scritti in content/ e copiati da scripts/build-content.mjs. */
export type DLine = { who: "M" | "E"; text: string };
type Pack = { code: string; parts: { part: number; lines: DLine[] }[] };

const packs: Pack[] = Object.values(import.meta.glob<{ default: Pack }>("../data/dialogues/*.json", { eager: true })).map((m) => m.default);

export function dialogueFor(code: string, part: number): DLine[] | undefined {
  return packs.find((p) => p.code === code)?.parts.find((x) => x.part === part)?.lines;
}

export const WHO = { M: "Giuliano", E: "Enrica" } as const;

/** Domanda "Tocca a te" di una parte: a caso (60%), una delle domande di Giuliano si ferma e risponde lei. */
export function pickTurnLine<T extends { line: number }>(turns: T[], lines: DLine[], rnd: number): T | null {
  const usable = turns.filter((t) => lines[t.line]?.who === "M" && lines[t.line + 1] !== undefined);
  if (usable.length === 0 || rnd >= 0.6) return null;
  return usable[Math.min(usable.length - 1, Math.floor((rnd / 0.6) * usable.length))]!;
}
