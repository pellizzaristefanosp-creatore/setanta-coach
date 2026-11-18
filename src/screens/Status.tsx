import { useState } from "react";
import { dayMonth, daysBetween, shortDate, today, weekday } from "../lib/dates";
import { situation } from "../lib/plan";
import { buildSchedule, formatMinutes, minutesOf } from "../lib/schedule";
import { setState, useStore } from "../lib/store";
import { streak } from "../lib/streak";
import type { State } from "../lib/types";
import { BADGES, level, totalXp, weeklyChallenge, LEVELS } from "../lib/game";
import { Box, Icon, Progress } from "../ui";

/** La sessione di oggi è completa se la presentazione del giorno è finita (o oggi è giorno libero). */
export function todayIncomplete(s: State, now = today()): boolean {
  if (weekday(now) === s.settings.restDay) return false;
  const sch = buildSchedule(s, now);
  return sch.todayTarget > 0 && sch.todayDone < sch.todayTarget;
}

export function Status() {
  const s = useStore();
  const now = today();
  const sit = situation(s, now);
  const st = streak(s, now);
  const sch = buildSchedule(s, now);
  const plan = sch.days;
  const margin = sch.end ? daysBetween(sch.end, s.exams.mcqTarget) - 1 : null;
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

      <Season />

      <div className="stat-grid">
        <div className="card stack" style={{ gap: 6 }}>
          <span className="pill gold" style={{ alignSelf: "flex-start" }}><Icon.fire /> Serie</span>
          <p className="big-num">{st.days}</p>
          <p className="tiny">{st.days === 1 ? "giorno di fila" : "giorni di fila"} con almeno 2 minuti</p>
          <p className="tiny">Jolly della settimana: <b>{st.jollyUsedThisWeek ? "usato" : "libero"}</b></p>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className={`pill ${margin != null && margin < 0 ? "red" : "green"}`} style={{ alignSelf: "flex-start" }}>MCQ</span>
          {margin != null && margin < 0 ? (
            <>
              <p className="big-num" style={{ color: "var(--alarm)" }}>{-margin}</p>
              <p className="tiny">giorni di ritardo rispetto al {dayMonth(s.exams.mcqTarget)}</p>
            </>
          ) : (
            <>
              <p className="big-num">{margin ?? "–"}</p>
              <p className="tiny">giorni di margine prima del {dayMonth(s.exams.mcqTarget)}</p>
            </>
          )}
          {sch.end && <p className="tiny">Fine studio prevista: <b>{shortDate(sch.end)}</b></p>}
        </div>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <h2>Detto onestamente</h2>
        <p className="small">
          Corso al <b>{sch.percent}%</b>. Restano <b>{sch.remainingParts}</b> parti (circa {formatMinutes(minutesOf(sch.remainingParts))}){sch.estimatedParts > 0 && <>, di cui {sch.estimatedParts} stimate per le unità non ancora uscite</>}.
          {" "}Servono <b>{sch.perDay} parti al giorno</b> (circa {formatMinutes(minutesOf(sch.perDay))}), riposo il {["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"][s.settings.restDay]}. Se salti un giorno, il conto si rifà da solo.
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
                {d.rest ? (
                  <span className="muted">Giorno libero</span>
                ) : d.parts.length === 0 ? (
                  <span className="muted">Ripasso, quiz ed esame pratico</span>
                ) : (
                  <>
                    {groupCodes(d.parts).map((g) => `${g.code}${g.estimated ? " (stima)" : ""} · ${g.count} ${g.count === 1 ? "parte" : "parti"}`).join(" + ")}
                    <span className="tiny" style={{ display: "block" }}>circa {formatMinutes(minutesOf(d.parts.length))}</span>
                  </>
                )}
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

function Season() {
  const s = useStore();
  const now = today();
  const xp = totalXp(s);
  const lv = level(xp);
  const w = weeklyChallenge(s, now);
  return (
    <>
      <div className="card stack season">
        <div className="row">
          <span className="lv-badge big">{lv.index + 1}</span>
          <div className="grow">
            <p className="tiny">La tua stagione</p>
            <p className="step-title" style={{ fontSize: 24 }}>{lv.name}</p>
          </div>
          <span className="pill num">{xp} pt</span>
        </div>
        <Progress value={Math.round(lv.progress * 100)} max={100} />
        <p className="tiny">{lv.next ? `${lv.toNext} punti per diventare ${lv.next}.` : "Livello massimo. Ora vinci la finale."}</p>
        <p className="tiny">Livelli: {LEVELS.map((l) => l.name).join(" → ")}</p>
      </div>

      <div className={`card challenge stack ${w.complete ? "won" : ""}`} style={{ gap: 8 }}>
        <div className="spread">
          <span className="tag">{w.complete ? "Sfida della settimana vinta" : "Sfida della settimana"}</span>
          <span className="small num" style={{ fontWeight: 750 }}>{w.done}/{w.total}</span>
        </div>
        <Progress value={w.done} max={Math.max(1, w.total)} size="thin" />
        <p className="tiny">{w.total > 0 ? `Chiudi ${w.codes.join(", ")} entro ${shortDate(w.endsOn)}.` : "Nessuna presentazione prevista questa settimana."}</p>
      </div>

      <div className="card stack">
        <div className="spread"><h2>Premi</h2><span className="pill gold">{Object.keys(s.badges).length}/{BADGES.length}</span></div>
        <div className="badges">
          {BADGES.map((b) => {
            const got = s.badges[b.id];
            return (
              <div key={b.id} className={`badge ${got ? "got" : ""}`} title={b.how}>
                <span className="badge-icon">{got ? b.icon : "🔒"}</span>
                <span className="badge-name">{b.name}</span>
                <span className="tiny">{got ? shortDate(got) : b.how}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function groupCodes(parts: { code: string; estimated: boolean }[]) {
  const out: { code: string; count: number; estimated: boolean }[] = [];
  for (const p of parts) {
    const last = out.at(-1);
    if (last && last.code === p.code) last.count++;
    else out.push({ code: p.code, count: 1, estimated: p.estimated });
  }
  return out;
}
