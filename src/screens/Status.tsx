import { useState } from "react";
import { dayMonth, daysBetween, shortDate, today, weekday } from "../lib/dates";
import { buildPlan, currentItem, isDone, situation } from "../lib/plan";
import { setState, useStore } from "../lib/store";
import { streak } from "../lib/streak";
import type { State } from "../lib/types";
import { Box, Icon } from "../ui";

/** La sessione di oggi è completa se la presentazione del giorno è finita (o oggi è giorno libero). */
export function todayIncomplete(s: State, now = today()): boolean {
  if (weekday(now) === s.settings.restDay) return false;
  if (s.presentations.some((p) => p.doneAt === now && isDone(p))) return false;
  return currentItem(s, now) !== null;
}

export function Status() {
  const s = useStore();
  const now = today();
  const sit = situation(s, now);
  const st = streak(s, now);
  const plan = buildPlan(s, now);
  const [all, setAll] = useState(false);
  const incomplete = todayIncomplete(s, now);
  const daysToMcq = daysBetween(now, s.exams.mcqTarget);
  const daysToPractical = daysBetween(now, s.exams.practicalTarget);

  return (
    <div className="stack fade-in" style={{ gap: 16 }}>
      <h1 className="page-title">Situazione</h1>

      {incomplete ? (
        <div className="alarm" role="status">
          <Icon.alert />
          <div>
            <strong>La sessione di oggi non è finita.</strong>
            <span className="small">
              Giorni saltati finora: <b className="num">{sit.skippedDays}</b>. Bastano 2 minuti per salvare la giornata.
            </span>
          </div>
        </div>
      ) : (
        <div className="okbar">Oggi è a posto.</div>
      )}

      <div className="stat-grid">
        <div className="card stack" style={{ gap: 6 }}>
          <span className="pill gold" style={{ alignSelf: "flex-start" }}><Icon.fire /> Serie</span>
          <p className="big-num">{st.days}</p>
          <p className="tiny">{st.days === 1 ? "giorno di fila" : "giorni di fila"} con almeno 2 minuti</p>
          <p className="tiny">Jolly della settimana: <b>{st.jollyUsedThisWeek ? "usato" : "libero"}</b></p>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className={`pill ${sit.marginDays != null && sit.marginDays < 0 ? "red" : "green"}`} style={{ alignSelf: "flex-start" }}>MCQ</span>
          {sit.marginDays != null && sit.marginDays < 0 ? (
            <>
              <p className="big-num" style={{ color: "var(--alarm)" }}>{-sit.marginDays}</p>
              <p className="tiny">giorni di ritardo rispetto al {dayMonth(s.exams.mcqTarget)}</p>
            </>
          ) : (
            <>
              <p className="big-num">{sit.marginDays ?? "–"}</p>
              <p className="tiny">giorni di margine prima del {dayMonth(s.exams.mcqTarget)}</p>
            </>
          )}
          {sit.finish && <p className="tiny">Fine studio prevista: <b>{shortDate(sit.finish)}</b></p>}
        </div>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <h2>Detto onestamente</h2>
        <p className="small">
          Restano <b>{sit.remaining}</b> presentazioni{sit.estimated > 0 && <> (di cui {sit.estimated} stimate per le unità non ancora uscite)</>}.
          {" "}Una al giorno, {s.settings.restDay >= 0 && <>riposo il {["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"][s.settings.restDay]}</>}.
        </p>
        <p className="small muted">
          MCQ tra <b className="num">{daysToMcq}</b> giorni (obiettivo {dayMonth(s.exams.mcqTarget)}, chiude il 10 gen alle 23:59). Esame pratico: obiettivo {dayMonth(s.exams.practicalTarget)}
          {daysToPractical >= 0 ? <>, tra <b className="num">{daysToPractical}</b> giorni</> : null} (scadenza 27 dic, 23:59).
        </p>
      </div>

      <div className="card">
        <div className="spread"><h2>Esame pratico</h2><span className="pill">{s.checklist.filter((c) => c.done).length}/{s.checklist.length}</span></div>
        <ul className="steps">
          {s.checklist.map((c) => {
            const late = !c.done && c.due < now;
            return (
              <li key={c.id}>
                <button
                  className="check"
                  aria-pressed={c.done}
                  onClick={() =>
                    setState((d) => {
                      const it = d.checklist.find((x) => x.id === c.id);
                      if (it) it.done = !it.done;
                    })
                  }
                >
                  <Box on={c.done} />
                  <span className="grow">
                    <span className={c.done ? "done-text" : ""}>{c.title}</span>
                    <span className="tiny" style={{ display: "block", color: late ? "var(--alarm)" : undefined }}>
                      entro {shortDate(c.due)}{late ? " · in ritardo" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <h2>Calendario</h2>
        <ul className="plan-list">
          {(all ? plan : plan.slice(0, 14)).map((d) => (
            <li key={d.date} className={d.date === now ? "is-today" : ""}>
              <span className="d">{d.date === now ? "Oggi" : shortDate(d.date)}</span>
              <span className="grow small">
                {d.kind === "study" && (d.item.kind === "real" ? `${d.item.presentation.code} · ${d.item.presentation.title}` : `${d.item.code} · ${d.item.title} (stima)`)}
                {d.kind === "rest" && <span className="muted">Giorno libero</span>}
                {d.kind === "wait" && <span className="muted">Ripasso + esame pratico (nuova unità il {dayMonth(d.nextRelease)})</span>}
              </span>
            </li>
          ))}
        </ul>
        {plan.length > 14 && (
          <button className="link-btn" onClick={() => setAll(!all)}>{all ? "Mostra meno" : `Mostra tutto (${plan.length} giorni)`}</button>
        )}
      </div>
    </div>
  );
}
