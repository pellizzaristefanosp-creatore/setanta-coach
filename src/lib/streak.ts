import { addDays, weekStart } from "./dates";
import { daySaved } from "./plan";
import type { ISODate, State } from "./types";

export type Streak = {
  days: number; // giorni consecutivi con almeno 2 minuti
  jollyUsedThisWeek: boolean;
  todaySaved: boolean;
};

/**
 * Serie di giorni: si conta all'indietro da oggi (o da ieri, se oggi non è ancora salvato).
 * Un giorno mancato non azzera la serie se in quella settimana (lun–dom) il jolly è ancora libero.
 */
export function streak(state: Pick<State, "log" | "settings">, now: ISODate): Streak {
  const todaySaved = daySaved(state, now);
  const jollyWeeks = new Set<ISODate>();
  let days = 0;
  let d = todaySaved ? now : addDays(now, -1);
  while (d >= state.settings.startDate) {
    if (daySaved(state, d)) {
      days++;
    } else {
      const w = weekStart(d);
      if (jollyWeeks.has(w)) break;
      jollyWeeks.add(w);
    }
    d = addDays(d, -1);
  }
  // Un jolly "speso" solo per i giorni prima dell'inizio della serie non conta.
  return { days, jollyUsedThisWeek: jollyWeeks.has(weekStart(now)) && days > 0, todaySaved };
}
