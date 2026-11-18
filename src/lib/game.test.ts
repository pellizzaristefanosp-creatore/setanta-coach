import { describe, expect, it } from "vitest";
import { seedState } from "../data/seed";
import { nextAction, pickQuestions } from "./coach";
import { BOSS_QUESTIONS, bossStatus, dailyChallenge, earnedBadges, level, weeklyChallenge } from "./game";
import { LessonPackSchema } from "./lesson";
import { allQuestions, bundledLessons, cardsForPart, syncLessons } from "./lessons";
import { newCard } from "./sm2";
import type { State } from "./types";

const TODAY = "2026-11-18";

function fresh(): State {
  const s = seedState();
  syncLessons(s);
  return s;
}

describe("lezioni incluse", () => {
  it("ci sono le lezioni scritte dai PDF e sono valide", () => {
    const codes = bundledLessons().map((l) => l.code);
    for (const c of ["4.1", "4.2", "5.1", "6.1", "7.1"]) expect(codes).toContain(c);
    for (const l of bundledLessons()) expect(LessonPackSchema.safeParse(l).success).toBe(true);
  });

  it("le parti della presentazione seguono le slide della lezione e le spunte restano", () => {
    const s = fresh();
    const p51 = s.presentations.find((p) => p.code === "5.1")!;
    const l51 = bundledLessons().find((l) => l.code === "5.1")!;
    expect(p51.steps).toHaveLength(l51.parts.length);
    const p41 = s.presentations.find((p) => p.code === "4.1")!;
    expect(p41.steps.every((x) => x.done)).toBe(true); // la 4.1 era già fatta
  });

  it("le domande delle lezioni entrano nel quiz", () => {
    const s = fresh();
    expect(allQuestions(s).length).toBeGreaterThan(s.questions.length + 40);
  });

  it("le flashcard di una parte entrano nel ripasso con un id fisso", () => {
    const l = bundledLessons().find((x) => x.code === "5.1")!;
    const cards = cardsForPart(l, 0, "p-5.1", TODAY);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]!.id).toMatch(/^L-5\.1-c\d+$/);
  });
});

describe("gioco", () => {
  it("livelli", () => {
    expect(level(0).name).toBe("Panchina");
    expect(level(500).name).toBe("Titolare");
    expect(level(99999)).toMatchObject({ name: "Campione", next: null });
  });

  it("sfida del giorno: finire la presentazione di oggi", () => {
    const s = fresh();
    const d = dailyChallenge(s, TODAY);
    const p45 = s.presentations.find((p) => p.code === "4.5")!;
    expect(d.target).toBe(p45.steps.length);
    expect(d.complete).toBe(false);
  });

  it("sfida della settimana: le presentazioni previste fino a domenica", () => {
    const w = weeklyChallenge(fresh(), TODAY);
    expect(w.codes[0]).toBe("4.5");
    expect(w.endsOn).toBe("2026-11-22");
    expect(w.complete).toBe(false);
  });

  it("partita di fine unità: pronta quando l'unità è finita e ci sono abbastanza domande", () => {
    const s = fresh();
    const u4 = bossStatus(s).find((b) => b.unit === 4)!;
    expect(u4.state).toBe("bloccata");
    expect(u4.missing).toEqual(["4.5"]);
    s.presentations.find((p) => p.code === "4.5")!.steps.forEach((x) => (x.done = true));
    const after = bossStatus(s).find((b) => b.unit === 4)!;
    expect(after.questions).toBeGreaterThanOrEqual(BOSS_QUESTIONS);
    expect(after.state).toBe("pronta");
  });

  it("premi: primo play e rientro dopo un giorno saltato", () => {
    const s = fresh();
    s.log = { "2026-11-18": { minutes: 2, steps: 1 }, "2026-11-20": { minutes: 2, steps: 1 } };
    const got = earnedBadges(s, "2026-11-20");
    expect(got).toContain("primo-play");
    expect(got).toContain("rientro");
  });
});

describe("allenatore", () => {
  it("prima la parte nuova, poi il ripasso", () => {
    const s = fresh();
    expect(nextAction(s, TODAY).kind).toBe("part");
    // Presentazione di oggi finita → con carte scadute si ripassa.
    const p = s.presentations.find((x) => x.code === "4.5")!;
    p.steps.forEach((x) => (x.done = true));
    p.doneAt = TODAY;
    s.log[TODAY] = { minutes: 20, steps: p.steps.length };
    s.cards = [1, 2, 3].map((i) => ({ ...newCard(`d${i}`, `r${i}`, TODAY), id: `c${i}` }));
    expect(nextAction(s, TODAY).kind).toBe("cards");
  });

  it("le domande sbagliate escono più spesso, e si mescolano le unità", () => {
    const s = fresh();
    const qs = allQuestions(s);
    const wrongId = qs[0]!.id;
    s.answers[wrongId] = { seen: 1, wrong: 1, last: "2026-11-17", lastCorrect: false };
    let hits = 0;
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 200; k++) if (pickQuestions(s, 10, TODAY, { rand }).some((q) => q.id === wrongId)) hits++;
    expect(hits / 200).toBeGreaterThan(10 / qs.length * 1.5);
    const picked = pickQuestions(s, 10, TODAY, { rand });
    expect(new Set(picked.map((q) => q.id)).size).toBe(10);
    expect(new Set(picked.map((q) => q.unit)).size).toBeGreaterThan(1);
  });
});
