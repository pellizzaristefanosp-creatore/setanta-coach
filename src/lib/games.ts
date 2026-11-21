import type { GamePack } from "./gameSchema";

export * from "./gameSchema";

/**
 * Giochi per studiare: tre modi di ripassare i concetti di una lezione.
 * - "Metti in ordine": i passaggi di un processo da rimettere in fila.
 * - "Chi sono?": tre indizi, un concetto da indovinare.
 * - "Vero o falso a tempo": frasi con gli errori tipici, 60 secondi.
 * I contenuti stanno in src/data/games/<codice>.json, scritti solo dal testo della lezione.
 */

const packs: GamePack[] = Object.values(
  import.meta.glob<{ default: GamePack }>("../data/games/*.json", { eager: true }),
).map((m) => m.default);

export function gamePacks(): GamePack[] {
  return [...packs].sort((a, b) => a.code.localeCompare(b.code, "it", { numeric: true }));
}

export function gamePack(code: string): GamePack | undefined {
  return packs.find((p) => p.code === code);
}

/** Mescola in modo ripetibile (stesso seme, stesso ordine). */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Seme diverso per ogni domanda: unisce il seme della partita e il testo della domanda. */
export function mixSeed(seed: number, text: string): number {
  let h = seed | 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h ^ text.charCodeAt(i), 2654435761) + i) | 0;
  return (h >>> 0) % 2147483646 + 1;
}

/** Mescola finché l'ordine non coincide con quello giusto (con 4+ passaggi basta un tentativo o due). */
export function shuffledSteps(steps: readonly string[], seed: number): string[] {
  for (let k = 0; k < 20; k++) {
    const s = shuffle(steps, seed + k * 7919);
    if (s.some((x, i) => x !== steps[i])) return s;
  }
  return [...steps].reverse();
}

/** Per ogni posizione: giusto o sbagliato. */
export function checkOrder(answer: readonly string[], correct: readonly string[]): boolean[] {
  return correct.map((c, i) => answer[i] === c);
}

/** Punti di "Chi sono?": più indizi usi, meno punti (3, 2, 1); risposta sbagliata 0. */
export function whoPoints(cluesShown: number, correct: boolean): number {
  if (!correct) return 0;
  return Math.max(1, 4 - Math.max(1, Math.min(3, cluesShown)));
}

/** Giudizio di fine partita in parole semplici. */
export function verdict(right: number, total: number): string {
  if (total === 0) return "";
  const r = right / total;
  if (r >= 0.9) return "Da Pallone d'oro.";
  if (r >= 0.7) return "Ottima partita.";
  if (r >= 0.5) return "Pareggio: ripassa i punti sbagliati.";
  return "Giornata storta: rifallo domani, va meglio.";
}
