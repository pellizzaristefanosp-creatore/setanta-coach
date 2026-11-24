import { describe, expect, it } from "vitest";
import { pickTurn, TURN_CHANCE, TurnPackSchema, type Turn } from "./turns";

const lines = [
  { who: "L" as const, start: 0, text: "Domanda?" },
  { who: "M" as const, start: 2, text: "Risposta." },
  { who: "L" as const, start: 5, text: "Altra domanda?" },
  { who: "M" as const, start: 7, text: "Altra risposta." },
];
const t = (line: number): Turn => ({ part: 0, line, question: "q", options: ["a", "b", "c", "d"], answer: 0, why: "w" });

describe("tocca a te", () => {
  it("a volte non chiede niente", () => {
    expect(pickTurn([t(0)], lines, TURN_CHANCE)).toBeNull();
    expect(pickTurn([t(0)], lines, 0.99)).toBeNull();
  });
  it("si ferma appena prima della risposta", () => {
    expect(pickTurn([t(0)], lines, 0)).toEqual({ turn: t(0), at: 1.85 });
  });
  it("sceglie tra le domande disponibili", () => {
    expect(pickTurn([t(0), t(2)], lines, 0.59)?.turn.line).toBe(2);
    expect(pickTurn([t(0), t(2)], lines, 0.1)?.turn.line).toBe(0);
  });
  it("ignora una domanda senza risposta dopo", () => {
    expect(pickTurn([t(3)], lines, 0)).toBeNull();
  });
  it("i pacchetti inclusi sono validi", async () => {
    const files = import.meta.glob("../data/turns/*.json", { eager: true, import: "default" });
    for (const p of Object.values(files)) expect(TurnPackSchema.safeParse(p).success).toBe(true);
  });
});
