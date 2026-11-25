import { describe, expect, it } from "vitest";
import { reminderFor, type StudySummary } from "../../api/_lib/reminder";

const base: StudySummary = { date: "2026-11-25", todayDone: 0, todayTarget: 10, perDay: 10, lastStudy: "2026-11-24", restDay: 0, minutesPerPart: 2 };

describe("promemoria serali", () => {
  it("niente messaggio se oggi hai fatto tutto o è il giorno libero", () => {
    expect(reminderFor({ ...base, todayDone: 10 }, "2026-11-25", "20")).toBeNull();
    expect(reminderFor(base, "2026-11-29", "20")).toBeNull(); // domenica
  });
  it("dopo giorni saltati dice quanti e quante parti ci sono oggi", () => {
    const m = reminderFor({ ...base, date: "2026-11-22", lastStudy: "2026-11-22", perDay: 12 }, "2026-11-25", "20");
    expect(m?.body).toContain("Sono 3 giorni che non studi");
    expect(m?.body).toContain("12 parti");
  });
  it("se hai aperto l'app ma non finito, conta le parti che mancano", () => {
    expect(reminderFor({ ...base, todayDone: 7 }, "2026-11-25", "20")?.body).toContain("3 parti");
    expect(reminderFor({ ...base, todayDone: 7 }, "2026-11-25", "22")?.title).toContain("Ultima chiamata");
  });
});
