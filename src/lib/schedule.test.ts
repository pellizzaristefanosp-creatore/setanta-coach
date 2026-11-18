import { describe, expect, it } from "vitest";
import { seedState } from "../data/seed";
import { syncLessons } from "./lessons";
import { buildSchedule, formatMinutes } from "./schedule";
import type { State } from "./types";

const TODAY = "2026-11-18";
function fresh(): State {
  const s = seedState();
  syncLessons(s);
  return s;
}

describe("piano per parti", () => {
  it("distribuisce tutte le parti entro una settimana prima dell'MCQ, mai nel giorno libero", () => {
    const s = fresh();
    const sch = buildSchedule(s, TODAY);
    expect(sch.studyEnd).toBe("2026-12-31");
    expect(sch.end! <= sch.studyEnd).toBe(true);
    expect(sch.days.filter((d) => d.rest).every((d) => d.parts.length === 0)).toBe(true);
    const scheduled = sch.days.reduce((n, d) => n + d.parts.length, 0);
    expect(scheduled).toBe(sch.remainingParts);
    expect(sch.days.every((d) => d.parts.every((p) => p.release <= d.date))).toBe(true);
    expect(sch.percent).toBeGreaterThan(0);
    expect(sch.todayCodes[0]?.code).toBe("4.5");
  });

  it("se oggi non studi, domani il minimo giornaliero sale (o resta uguale)", () => {
    const s = fresh();
    const today = buildSchedule(s, TODAY);
    const tomorrow = buildSchedule(s, "2026-11-19");
    expect(tomorrow.perDay).toBeGreaterThanOrEqual(today.perDay);
  });

  it("le parti fatte oggi contano nell'obiettivo di oggi", () => {
    const s = fresh();
    const before = buildSchedule(s, TODAY);
    const p = s.presentations.find((x) => x.code === "4.5")!;
    p.steps.slice(0, 3).forEach((st) => (st.done = true));
    s.log[TODAY] = { minutes: 6, steps: 3 };
    const after = buildSchedule(s, TODAY);
    expect(after.todayDone).toBe(3);
    expect(after.todayTarget).toBe(before.todayTarget);
    expect(after.todayLeft).toBe(before.todayLeft - 3);
  });

  it("minuti scritti bene", () => {
    expect(formatMinutes(16)).toBe("16 min");
    expect(formatMinutes(80)).toBe("1 h 20 min");
    expect(formatMinutes(120)).toBe("2 h");
  });
});
