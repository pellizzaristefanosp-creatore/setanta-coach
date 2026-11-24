import { describe, expect, it } from "vitest";
import { seedState } from "../data/seed";
import { pickTurnLine, type DLine } from "./dialogue";
import { LessonPackSchema } from "./lesson";
import { bundledLessons, syncLessons } from "./lessons";
import { currentItem } from "./plan";
import { buildSchedule } from "./schedule";
import { weekday } from "./dates";

const NOW = "2026-11-24";

describe("libro di Enrica", () => {
  it("ogni capitolo incluso è una lezione valida con scienza, consiglio e fonti vere", () => {
    const lessons = bundledLessons();
    expect(lessons.length).toBeGreaterThan(0);
    for (const l of lessons) {
      expect(LessonPackSchema.safeParse(l).success, l.code).toBe(true);
      for (const p of l.parts as (typeof l.parts[number] & { science?: { url: string; source: string }; tip?: string })[]) {
        expect(p.tip, `${l.code} ${p.title}`).toBeTruthy();
        expect(p.science?.url, `${l.code} ${p.title}`).toMatch(/^https?:\/\//);
        expect(p.science?.source).toBeTruthy();
      }
    }
  });

  it("si parte dal primo capitolo e le parti seguono i paragrafi", () => {
    const s = seedState();
    syncLessons(s);
    const c = currentItem(s, NOW);
    expect(c && c.kind === "real" ? c.presentation.code : null).toBe("1.1");
    const l = bundledLessons().find((x) => x.code === "1.1");
    if (l) expect(s.presentations.find((p) => p.code === "1.1")!.steps.length).toBe(l.parts.length);
  });

  it("il piano finisce prima dell'obiettivo e salta il giorno libero", () => {
    const s = seedState();
    syncLessons(s);
    const sch = buildSchedule(s, NOW);
    expect(sch.percent).toBe(0);
    expect(sch.end && sch.end <= s.exams.mcqTarget).toBe(true);
    for (const d of sch.days) if (weekday(d.date) === s.settings.restDay) expect(d.parts.length).toBe(0);
  });

  it("'Tocca a te' si ferma solo dopo una domanda di Tonino seguita da Enrica", () => {
    const lines: DLine[] = [
      { who: "M", text: "Ciao" },
      { who: "M", text: "Secondo te?" },
      { who: "E", text: "Così." },
    ];
    const turns = [{ line: 0 }, { line: 1 }, { line: 2 }];
    expect(pickTurnLine(turns, lines, 0.9)).toBeNull();
    const t = pickTurnLine(turns, lines, 0.1);
    expect(t && lines[t.line]!.who).toBe("M");
    expect(t && lines[t.line + 1]).toBeDefined();
  });
});
