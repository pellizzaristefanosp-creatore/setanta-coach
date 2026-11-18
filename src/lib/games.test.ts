import { describe, expect, it } from "vitest";
import { checkOrder, GamePackSchema, gamePacks, shuffle, shuffledSteps, verdict, whoPoints } from "./games";

describe("giochi", () => {
  it("mescola in modo ripetibile senza perdere elementi", () => {
    const a = shuffle([1, 2, 3, 4, 5], 42);
    expect(shuffle([1, 2, 3, 4, 5], 42)).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("i passaggi mescolati non sono mai già in ordine", () => {
    const steps = ["a", "b", "c", "d"];
    for (let seed = 1; seed < 200; seed++) expect(shuffledSteps(steps, seed)).not.toEqual(steps);
  });
  it("controlla ogni posizione", () => {
    expect(checkOrder(["a", "c", "b"], ["a", "b", "c"])).toEqual([true, false, false]);
  });
  it("meno indizi, più punti", () => {
    expect(whoPoints(1, true)).toBe(3);
    expect(whoPoints(2, true)).toBe(2);
    expect(whoPoints(3, true)).toBe(1);
    expect(whoPoints(1, false)).toBe(0);
  });
  it("giudizio", () => {
    expect(verdict(10, 10)).toBe("Da Pallone d'oro.");
    expect(verdict(2, 10)).toContain("domani");
  });
  it("i pacchetti inclusi sono validi e coerenti", () => {
    for (const p of gamePacks()) {
      expect(GamePackSchema.safeParse(p).success).toBe(true);
      for (const w of p.who) expect(w.distractors).not.toContain(w.answer);
      for (const o of p.order) expect(new Set(o.steps).size).toBe(o.steps.length);
    }
  });
});
