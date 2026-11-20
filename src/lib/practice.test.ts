import { describe, expect, it } from "vitest";
import { seedState } from "../data/seed";
import { syncLessons } from "./lessons";
import { afterPart, finalRound, mistakeCard } from "./practice";

const fixed = () => 0.42;
function state() {
  const s = seedState();
  syncLessons(s);
  return s;
}

describe("domande dopo lo studio", () => {
  it("dopo una parte: una domanda su quella parte e una di ripasso da una lezione già fatta", () => {
    const s = state();
    const qs = afterPart(s, "5.1", 2, "2026-11-20", fixed);
    expect(qs[0]?.kind).toBe("parte");
    expect(qs[0]?.from).toBe("5.1");
    const ripasso = qs.find((q) => q.kind === "ripasso");
    expect(ripasso && ripasso.from).not.toBe("5.1");
  });
  it("il ripasso viene solo da parti già fatte", () => {
    const s = state();
    for (const p of s.presentations) p.steps.forEach((st) => (st.done = false));
    const qs = afterPart(s, "5.1", 2, "2026-11-20", fixed);
    expect(qs.some((q) => q.kind === "ripasso")).toBe(false);
  });
  it("partita finale: fino a 6 domande, senza doppioni, ripasso mescolato", () => {
    const s = state();
    const qs = finalRound(s, "5.1", "2026-11-20", fixed);
    expect(qs.length).toBe(6);
    expect(new Set(qs.map((q) => q.id)).size).toBe(6);
    expect(qs[1]?.kind).toBe("ripasso");
  });
  it("le domande sbagliate di recente escono più spesso di quelle già sapute", () => {
    const s = state();
    const wrongOne = "L-5.1-7";
    const knownOne = "L-5.1-8";
    s.answers[wrongOne] = { seen: 1, wrong: 1, last: "2026-11-19", lastCorrect: false };
    s.answers[knownOne] = { seen: 4, wrong: 0, last: "2026-11-20", lastCorrect: true };
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let w = 0, k = 0;
    for (let i = 0; i < 300; i++) {
      const ids = finalRound(s, "5.1", "2026-11-20", rand).map((q) => q.id);
      if (ids.includes(wrongOne)) w++;
      if (ids.includes(knownOne)) k++;
    }
    expect(w).toBeGreaterThan(k * 3);
  });
  it("carta dell'errore con risposta giusta e perché", () => {
    const c = mistakeCard({ id: "x", question: "Q?", options: ["a", "b", "c", "d"], answer: 2, explanation: "perché sì" });
    expect(c).toEqual({ id: "E-x", front: "Q?", back: "c. perché sì" });
  });
});
