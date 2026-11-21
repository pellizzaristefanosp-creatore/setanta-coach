import { describe, expect, it } from "vitest";
import { seedState } from "../data/seed";
import { addDays, weekStart, weekday } from "./dates";
import { buildIcs, shiftTime } from "./ics";
import { buildPlan, currentItem, nextItem, queue, situation, skippedDays } from "./plan";
import { newCard, review } from "./sm2";
import { streak } from "./streak";
import type { State } from "./types";

const TODAY = "2026-11-18"; // mercoledì

function state(patch: Partial<State> = {}): State {
  return { ...seedState(), ...patch };
}

describe("date", () => {
  it("lunedì della settimana", () => {
    expect(weekStart("2026-11-18")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // domenica
    expect(weekday("2026-11-22")).toBe(0);
  });
});

describe("piano", () => {
  it("la coda parte dalla 4.5 e mette segnaposti per le unità 8–12", () => {
    const q = queue(state());
    expect(q[0]?.kind === "real" && q[0].presentation.code).toBe("4.5");
    expect(q.filter((i) => i.kind === "placeholder")).toHaveLength(15);
  });

  it("mai nel giorno libero, mai prima dell'uscita dell'unità", () => {
    const s = state();
    const plan = buildPlan(s, TODAY);
    for (const d of plan) {
      if (weekday(d.date) === s.settings.restDay) expect(d.kind).toBe("rest");
      if (d.kind === "study") expect(d.item.release <= d.date).toBe(true);
    }
    expect(plan[0]).toMatchObject({ date: TODAY, kind: "study" });
  });

  it("la fine prevista cade dopo l'uscita dell'unità 12 e prima dell'MCQ", () => {
    const sit = situation(state(), TODAY);
    expect(sit.remaining).toBe(25);
    expect(sit.finish! >= "2026-12-21").toBe(true);
    expect(sit.marginDays!).toBeGreaterThan(0);
  });

  it("i giorni saltati spostano la fine in avanti e riducono il margine", () => {
    const s = state();
    const before = situation(s, TODAY);
    const later = situation(s, "2026-11-25"); // una settimana dopo senza fare niente
    expect(later.skippedDays).toBe(6);
    expect(later.finish! >= before.finish!).toBe(true);
  });

  it("presentazione finita oggi → il piano riparte da domani", () => {
    const s = state();
    const p = s.presentations.find((x) => x.code === "4.5")!;
    p.steps.forEach((st) => (st.done = true));
    p.doneAt = TODAY;
    const plan = buildPlan(s, TODAY);
    expect(plan[1]?.date).toBe(addDays(TODAY, 1));
    expect(currentItem(s, TODAY)?.kind === "real" && (currentItem(s, TODAY) as { presentation: { code: string } }).presentation.code).toBe("5.1");
  });

  it("riparte dalla lezione che stavi facendo, anche se una prima non è finita", () => {
    const s = state();
    const p52 = s.presentations.find((x) => x.code === "5.2")!;
    p52.steps[0]!.done = true;
    s.lastPresentationId = p52.id;
    expect((currentItem(s, TODAY) as { presentation: { code: string } }).presentation.code).toBe("5.2");
    p52.steps.forEach((st) => (st.done = true));
    // finita la 5.2 si va alla lezione dopo (5.3), non si torna indietro
    expect((currentItem(s, TODAY) as { presentation: { code: string } }).presentation.code).toBe("5.3");
  });

  it("riparte dalla lezione aperta prima della sua data e il pulsante porta alla prossima", () => {
    const s = state();
    const p73 = s.presentations.find((x) => x.code === "7.3")!;
    p73.steps[0]!.done = true;
    s.lastPresentationId = p73.id;
    expect((currentItem(s, TODAY) as { presentation: { code: string } }).presentation.code).toBe("7.3");
    const p52 = s.presentations.find((x) => x.code === "5.2")!;
    s.lastPresentationId = p52.id;
    expect((nextItem(s, TODAY) as { presentation: { code: string } }).presentation.code).toBe("5.3");
  });

  it("i giorni liberi non contano come saltati", () => {
    const s = state({ log: {} });
    // dal 18 (mer) al 23 (lun) esclusi: mer gio ven sab dom → 4 giorni di studio (domenica libera)
    expect(skippedDays(s, "2026-11-23")).toBe(4);
  });
});

describe("serie di giorni", () => {
  const log = (dates: string[]) => Object.fromEntries(dates.map((d) => [d, { minutes: 2, steps: 1 }]));

  it("conta i giorni consecutivi e oggi non ancora fatto non la rompe", () => {
    const s = state({ log: log(["2026-11-18", "2026-11-19", "2026-11-20"]) });
    expect(streak(s, "2026-11-21").days).toBe(3);
    expect(streak(s, "2026-11-20").days).toBe(3);
  });

  it("un jolly a settimana salva la serie, il secondo buco la azzera", () => {
    const s = state({ log: log(["2026-11-18", "2026-11-20", "2026-11-21"]) }); // buco il 19
    expect(streak(s, "2026-11-21").days).toBe(3);
    const s2 = state({ log: log(["2026-11-18", "2026-11-21"]) }); // buchi 19 e 20, stessa settimana
    expect(streak(s2, "2026-11-21").days).toBe(1);
  });
});

describe("SM-2", () => {
  it("intervalli 1 → 6 → circa 15 giorni, e reset se non ricordo", () => {
    let c = newCard("Fibre tipo IIx?", "Contrazione molto veloce", TODAY);
    c = review(c, 4, TODAY);
    expect(c.interval).toBe(1);
    c = review(c, 4, TODAY);
    expect(c.interval).toBe(6);
    c = review(c, 5, TODAY);
    expect(c.interval).toBeGreaterThanOrEqual(15);
    c = review(c, 1, TODAY);
    expect(c.interval).toBe(1);
    expect(c.ef).toBeGreaterThanOrEqual(1.3);
  });
});

describe("promemoria .ics", () => {
  it("due eventi, secondo 2 ore dopo, mai nel giorno libero", () => {
    const ics = buildIcs({ start: TODAY, until: "2027-01-10", time: "19:00", hook: "dopo l'allenamento", restDay: 0, stamp: new Date(0) });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261118T190000");
    expect(ics).toContain("DTSTART:20261118T210000");
    expect(ics).toContain("BYDAY=MO,TU,WE,TH,FR,SA;");
    expect(ics).toContain("SUMMARY:2 minuti. Solo play.");
    expect(ics).toContain("\r\n");
  });

  it("il secondo promemoria non va oltre le 23:30", () => {
    expect(shiftTime("22:45", 120)).toBe("23:30");
  });
});
