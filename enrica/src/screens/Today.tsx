import { useEffect, useRef, useState } from "react";
import { aiPost, type RecallFeedback } from "../lib/ai";
import { DialogueSession } from "./DialogueSession";
import { SceneSession } from "./SceneSession";
import { audioFor } from "../lib/audio";
import { HoneyCell } from "../BeeBackground";
import { Flap, Typewriter } from "../beeFx";
import { lessonVideo } from "../data/lessonVideos";
import { EpisodePlayer } from "../EpisodePlayer";
import { afterPart as practiceAfterPart, finalRound, type PracticeQuestion } from "../lib/practice";
import { nextAction } from "../lib/coach";
import { addDays, daysBetween, shortDate, today, weekStart, weekday } from "../lib/dates";
import { MINUTES_PER_PART, buildSchedule, formatMinutes, minutesOf } from "../lib/schedule";
import { level, totalXp } from "../lib/game";
import type { LessonPack } from "../lib/lesson";
import { lessonFor } from "../lib/lessons";
import { comparePresentationCode, currentItem, daySaved, isDone, nextItem } from "../lib/plan";
import {
  addCard,
  addMinute,
  addMistakeCard,
  cancelStep,
  finishReplay,
  startReplay,
  startStepAt,
  ensurePresentation,
  finishStep,
  getState,
  recordAnswer,
  saveRecall,
  setState,
  startStep,
  togglePause,
  toggleStepDone,
  useStore,
} from "../lib/store";
import { streak } from "../lib/streak";
import { unlockSpeech } from "../lib/tts";
import type { Presentation } from "../lib/types";
import { Box, Icon, Progress, Sheet, beep, formatClock, unlockAudio } from "../ui";

/** fa partire fn dopo ms, se active (si annulla se cambia schermata) */
function useAfter(active: boolean, ms: number, fn: () => void) {
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; });
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => cb.current(), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
}

type Phase = "idle" | "check" | "practice" | "recall" | "again" | "finished" | "final" | "library";
export type Intent = { kind: "cards" } | { kind: "boss"; unit: number } | { kind: "quiz" } | { kind: "exercise"; code: string };


export function Today({ goTo }: { goTo: (tab: "ripasso" | "situazione", intent?: Intent) => void }) {
  const s = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [last, setLast] = useState<{ pid: string; index: number } | null>(null);
  const [practice, setPractice] = useState<PracticeQuestion[]>([]);
  const [finalDone, setFinalDone] = useState<string | null>(null);
  const now = today();

  const afterPart = (pid: string, index: number) => {
    const after = getState().presentations.find((x) => x.id === pid)!;
    const lesson = lessonFor(getState(), after.code);
    setLast({ pid, index });
    if (lesson?.parts[index]) setPhase("check");
    else nextAfterCheck(after);
  };

  const nextAfterCheck = (p: Presentation) => {
    const done = p.steps.filter((x) => x.done).length;
    if (done % 3 === 0) setPhase("recall");
    else setPhase(isDone(p) ? "finished" : "again");
  };

  if (s.timer) {
    const p = s.presentations.find((x) => x.id === s.timer!.presentationId);
    if (p) {
      const index = p.steps.findIndex((x) => x.id === s.timer!.stepId);
      const lesson = lessonFor(s, p.code);
      const backTo = s.timer.returnTo;
      const onDone = s.timer.replay
        ? () => {
            finishReplay();
            if (!backTo) setPhase("library");
          }
        : () => {
            finishStep();
            afterPart(p.id, index);
          };
      const audio = lesson ? audioFor(lesson.code, index) : undefined;
      if (lesson?.parts[index] && audio) return <SceneSession key={`${p.code}-${index}`} p={p} lesson={lesson} index={index} audio={audio} onDone={onDone} />;
      return lesson?.parts[index] ? <DialogueSession key={`${p.code}-${index}`} p={p} lesson={lesson} index={index} onDone={onDone} /> : <TimerSession p={p} onDone={onDone} />;
    }
  }

  const lastP = last ? s.presentations.find((x) => x.id === last.pid) : undefined;

  if (phase === "check" && lastP && last) {
    const lesson = lessonFor(s, lastP.code);
    const part = lesson?.parts[last.index];
    if (lesson && part)
      return (
        <CheckStep
          code={lesson.code}
          index={last.index}
          part={part}
          onNext={() => {
            // altre domande brevi: una su questa parte e una di ripasso (richiamo + ripasso distanziato)
            const qs = practiceAfterPart(getState(), lesson.code, last.index, now);
            if (qs.length > 0) {
              setPractice(qs);
              setPhase("practice");
            } else nextAfterCheck(getState().presentations.find((x) => x.id === lastP.id)!);
          }}
        />
      );
  }

  if (phase === "practice" && lastP) {
    return <QuestionRound title={practice.length === 1 ? "Ancora una domanda" : "Ancora un paio di domande"} questions={practice} onDone={() => nextAfterCheck(getState().presentations.find((x) => x.id === lastP.id)!)} />;
  }

  if (phase === "final" && lastP) {
    return (
      <QuestionRound
        title={`Partita finale · ${lastP.code}`}
        questions={practice}
        onDone={() => {
          setFinalDone(lastP.id);
          setPhase("finished");
        }}
      />
    );
  }

  if (phase === "recall" && lastP) {
    return <RecallStep p={lastP} onNext={() => setPhase(isDone(lastP) ? "finished" : "again")} />;
  }

  if (phase === "again" && lastP) {
    return <AutoNext p={lastP} onStop={() => setPhase("idle")} onGo={() => setPhase("idle")} />;
  }

  if (phase === "finished" && lastP) {
    return (
      <Finished
        p={lastP}
        hasExercise={!!lessonFor(s, lastP.code)?.exercises.length}
        onFinal={
          finalDone === lastP.id
            ? undefined
            : () => {
                setPractice(finalRound(getState(), lastP.code, now));
                setPhase("final");
              }
        }
        onReview={() => goTo("ripasso", { kind: "cards" })}
        onExercise={() => goTo("ripasso", { kind: "exercise", code: lastP.code })}
        onClose={() => setPhase("idle")}
        onNextLesson={() => {
          const nx = currentItem(getState(), now);
          if (!nx) return setPhase("idle");
          unlockAudio();
          unlockSpeech();
          startStep(nx.kind === "real" ? nx.presentation.id : ensurePresentation(nx.code, nx.title));
          setPhase("idle");
        }}
      />
    );
  }

  if (phase === "library") {
    return (
      <Library
        onBack={() => setPhase("idle")}
        onPlay={(pid, stepId, done) => {
          unlockAudio();
          unlockSpeech();
          if (done) startReplay(pid, stepId);
          else {
            setPhase("idle");
            startStepAt(pid, stepId);
          }
        }}
      />
    );
  }

  return <Home goTo={goTo} onLibrary={() => setPhase("library")} />;
}

/* ——— Le lezioni passate: riascolta qualsiasi parte già fatta ——— */

function Library({ onBack, onPlay }: { onBack: () => void; onPlay: (presentationId: string, stepId: string, done: boolean) => void }) {
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const list = s.presentations
    .filter((p) => lessonFor(s, p.code))
    .sort((a, b) => a.code.localeCompare(b.code, "it", { numeric: true }));
  return (
    <div className="stack fade-in" style={{ gap: 14 }}>
      <button className="link-btn" style={{ alignSelf: "flex-start" }} onClick={onBack}>← Oggi</button>
      <h1 className="page-title">Le tue lezioni</h1>
      <p className="muted small">Tutti i capitoli del libro. ▶ verde: già fatta, la riascolti quando vuoi (non cambia il piano). ▶ arancione: da fare, la fai adesso e conta come studio.</p>
      {list.map((p) => {
        const lesson = lessonFor(s, p.code)!;
        const done = p.steps.filter((x) => x.done).length;
        const isOpen = open === p.id;
        return (
          <div key={p.id} className="card stack" style={{ gap: 10 }}>
            <button className="lib-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
              <span className="lib-code num">{p.code}</span>
              <span className="grow">
                <span className="lib-title">{lesson.title}</span>
                <span className="tiny">{done === p.steps.length ? "Finita ✓" : done === 0 ? `${p.steps.length} parti · da iniziare` : `${done} di ${p.steps.length} parti fatte`}</span>
              </span>
              <span aria-hidden="true">{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && lessonVideo(p.code) && <EpisodePlayer video={lessonVideo(p.code)!} />}
            {isOpen && (
              <ol className="lib-parts">
                {p.steps.map((st, i) => {
                  const part = lesson.parts[i];
                  if (!part) return null;
                  return (
                    <li key={st.id}>
                      <button className={`lib-part ${st.done ? "done" : ""}`} onClick={() => onPlay(p.id, st.id, st.done)}>
                        <span className="lib-play" aria-hidden="true">{st.done ? <Icon.check /> : <Icon.play />}</span>
                        <span className="grow">{part.title}</span>
                        <span className="tiny num">{st.done ? "riascolta" : "da fare"}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ——— Schermata iniziale: a che punto sei, cosa fare oggi, il bottone ——— */

const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function Home({ goTo, onLibrary }: { goTo: (tab: "ripasso" | "situazione", intent?: Intent) => void; onLibrary: () => void }) {
  const s = useStore();
  const now = today();
  const action = nextAction(s, now);
  const xp = totalXp(s);
  const lv = level(xp);
  const st = streak(s, now);
  const sch = buildSchedule(s, now);
  const saved = daySaved(s, now);
  const mcqDays = daysBetween(now, s.exams.mcqTarget);

  // Ogni nuovo giorno: ricorda il piano e, se ieri sono rimaste parti, dillo chiaramente una volta.
  useEffect(() => {
    const cur = getState();
    const lp = cur.lastPlan;
    if (lp?.date === now) return;
    const fresh = buildSchedule(cur, now);
    let note: typeof cur.replanNote;
    if (lp && lp.date < now) {
      const missed = Math.max(0, lp.target - (cur.log[lp.date]?.steps ?? 0));
      if (missed > 0) note = { date: now, missed, from: lp.perDay, to: fresh.perDay };
    }
    setState((d) => {
      d.lastPlan = { date: now, perDay: fresh.perDay, target: fresh.todayTarget };
      d.replanNote = note;
    });
  }, [now]);

  const go = () => {
    unlockAudio();
    unlockSpeech();
    if (action.kind === "part") {
      const item = currentItem(getState(), now);
      if (!item) return;
      const id = item.kind === "real" ? item.presentation.id : ensurePresentation(item.code, item.title);
      startStep(id);
      return;
    }
    if (action.kind === "cards") goTo("ripasso", { kind: "cards" });
    else if (action.kind === "boss") goTo("ripasso", { kind: "boss", unit: action.unit });
    else goTo("ripasso", { kind: "quiz" });
  };

  const sunday = addDays(weekStart(now), 6);
  const monday = weekStart(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const planned = sch.days.find((d) => d.date === date);
    const doneThere = s.log[date]?.steps ?? 0;
    const parts = date < now ? doneThere : date === now ? sch.todayTarget : planned?.parts.length ?? 0;
    return { date, parts, rest: weekday(date) === s.settings.restDay, past: date < now, isToday: date === now };
  });
  const maxWeek = Math.max(1, ...week.map((w) => w.parts));
  const weekMinutes = minutesOf(sch.weekParts);
  const todayDone = Math.min(sch.todayDone, sch.todayTarget);
  const restToday = weekday(now) === s.settings.restDay;
  const note = s.replanNote?.date === now ? s.replanNote : undefined;

  useScrollFx();
  const hour = new Date().getHours();
  return (
    <div className="stack fade-in" style={{ gap: 14 }}>
      <header className="greet" id="greet">
        <h1>{hour < 13 ? "Buongiorno," : hour < 18 ? "Buon pomeriggio," : "Buonasera,"}<br />Enrica</h1>
        <p><Typewriter text="Due minuti al giorno, come un'ape: un fiore alla volta." /></p>
      </header>
      <button className="gamebar" onClick={() => goTo("situazione")} aria-label="Vai alla stagione">
        <span className="lv-badge">{lv.index + 1}</span>
        <span className="grow" style={{ textAlign: "left" }}>
          <span className="lv-name">{lv.name}</span>
          <span className="xpbar"><span style={{ width: `${Math.round(lv.progress * 100)}%` }} /></span>
        </span>
        <span className="pill gold num"><Icon.fire /> {st.days}</span>
        <span className="pill num">{xp} pt</span>
      </button>

      <LessonCalendar now={now} />

      <section className="card progress-hero fx-blur" aria-label="A che punto sei">
        <HoneyCell percent={sch.percent} />
        <div className="stack" style={{ gap: 4 }}>
          <p className="tiny">A che punto sei</p>
          <p className="ph-title">Libro al <Flap n={sch.percent} />%</p>
          <p className="small muted num"><CountUp to={sch.doneParts} /> parti fatte su {sch.totalParts}</p>
          <p className="small num">Fine prevista: <b>{sch.end ? shortDate(sch.end) : "–"}</b></p>
          <p className="small muted num">Obiettivo {shortDate(s.exams.mcqTarget)} ({mcqDays} giorni) · mancano circa {formatMinutes(minutesOf(sch.remainingParts))}</p>
        </div>
      </section>

      {note && (
        <div className="replan fade-in" role="status">
          <b>Il piano si è aggiornato.</b> L'ultima volta sono rimaste {note.missed} {note.missed === 1 ? "parte" : "parti"}: le ho spostate nei prossimi giorni.
          {note.to > note.from ? ` Ora bastano ${note.to} parti al giorno (circa ${formatMinutes(minutesOf(note.to))}).` : ` Il minimo resta ${note.to} parti al giorno.`}
        </div>
      )}

      <section className={`card today-card fx-blur ${sch.todayDone >= sch.todayTarget && sch.todayTarget > 0 ? "won" : ""}`} aria-label="Oggi">
        <div className="spread">
          <h2>Oggi</h2>
          <span className="small num" style={{ fontWeight: 750 }}>{restToday ? "giorno libero" : `${todayDone}/${sch.todayTarget} parti`}</span>
        </div>
        {!restToday && <Progress value={todayDone} max={Math.max(1, sch.todayTarget)} size="big" />}
        <p className="small">
          {restToday
            ? "Oggi è il tuo giorno libero: niente obbligo. Se vuoi, 2 minuti di ripasso."
            : sch.todayLeft > 0
              ? <>Bastano <b>{formatMinutes(minutesOf(sch.todayLeft))}</b>: {sch.todayCodes.map((c) => `${c.count} ${c.count === 1 ? "parte" : "parti"} della ${c.code}`).join(" e ")}.</>
              : <>✓ Fatto per oggi. Tutto quello che fai adesso è vantaggio per domani.</>}
        </p>
      </section>

      <div className="hero compact">
        {saved && <div className="saved"><Icon.check /> Giornata salvata</div>}
        {(() => { const c = currentItem(s, now); const code = c ? (c.kind === "real" ? c.presentation.code : c.code) : ""; return c ? (<div className="hero-head"><p className="hero-eyebrow">★ Si riparte da qui · lezione {code}</p><h2 className="hero-title">{lessonFor(s, code)?.title ?? (c.kind === "real" ? c.presentation.title : c.title)}</h2></div>) : null; })()}
        <button className={`go small-go ${action.kind === "part" ? "" : "calm"}`} onClick={go} aria-label={`${action.label}: ${action.sub}`}>
          <Icon.play />
          <span className="go-label">{action.label}</span>
        </button>
        <p className="muted small">{action.sub}</p>
        {(() => {
          const cur = currentItem(s, now), nx = nextItem(s, now);
          if (!nx) return null;
          const code = nx.kind === "real" ? nx.presentation.code : nx.code;
          const title = nx.kind === "real" ? lessonFor(s, code)?.title ?? nx.presentation.title : nx.title;
          const curCode = cur ? (cur.kind === "real" ? cur.presentation.code : cur.code) : "";
          return (
            <button className="btn next-lesson" onClick={() => { unlockAudio(); unlockSpeech(); startStep(nx.kind === "real" ? nx.presentation.id : ensurePresentation(nx.code, nx.title)); }}>
              Prossima lezione: <b>{code}</b> {title} ›
              {curCode && <span className="tiny muted" style={{ display: "block" }}>adesso sei alla {curCode}</span>}
            </button>
          );
        })()}
      </div>

      <section className="card stack fx-tilt" aria-label="Questa settimana" style={{ gap: 10 }}>
        <div className="spread">
          <h2>Questa settimana</h2>
          <span className="small muted num">fino a {shortDate(sunday)}</span>
        </div>
        <p className="small">
          Ancora <b>{sch.weekDays} {sch.weekDays === 1 ? "giorno" : "giorni"}</b> di studio · circa <b>{formatMinutes(weekMinutes)}</b> in tutto.
        </p>
        <div className="week-bars" role="img" aria-label="Parti per giorno questa settimana">
          {week.map((w) => (
            <div key={w.date} className={`wb ${w.isToday ? "today" : ""} ${w.past ? "past" : ""}`}>
              <span className="wb-min num">{w.rest ? "" : w.parts ? `${minutesOf(w.parts)}′` : ""}</span>
              <span className="wb-bar"><span style={{ height: `${w.rest || w.parts === 0 ? 0 : Math.max(6, (w.parts / maxWeek) * 100)}%` }} /></span>
              <span className="wb-day">{w.rest ? "🌼" : WD[weekday(w.date)]}</span>
            </div>
          ))}
        </div>
        <p className="tiny">Ogni parte è circa {MINUTES_PER_PART} minuti: ascolto, domanda veloce e richiamo. Se un giorno salti, il piano si ricalcola da solo.</p>
      </section>

      <button className="card lib-entry" onClick={onLibrary}>
        <span className="lib-entry-icon" aria-hidden="true">📚</span>
        <span className="grow">
          <span className="lib-title">Le tue lezioni</span>
          <span className="tiny">Riascolta le parti che hai già fatto</span>
        </span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}


/* ——— Senza lezione: timer da 2 minuti e audio sul sito del corso ——— */

function TimerSession({ p, onDone }: { p: Presentation; onDone: () => void }) {
  const s = useStore();
  const t = s.timer!;
  const [now, setNow] = useState(() => Date.now());
  const [card, setCard] = useState(false);
  const fired = useRef(false);
  const step = p.steps.find((x) => x.id === t.stepId);
  const index = p.steps.findIndex((x) => x.id === t.stepId);
  const doneCount = p.steps.filter((x) => x.done).length;
  const paused = t.pausedLeft != null;
  const left = paused ? t.pausedLeft! : t.endsAt - now;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!paused && left <= 0 && !fired.current) {
      fired.current = true;
      beep();
      onDone();
    }
  }, [left, paused, onDone]);

  return (
    <div className="stack fade-in" style={{ gap: 18 }}>
      <div className="session-head">
        <button className="icon-btn" aria-label="Chiudi senza salvare questa parte" onClick={() => confirm("Chiudere? Questa parte non viene segnata.") && cancelStep()}>
          <Icon.close />
        </button>
        <div className="grow">
          <p className="tiny">{p.code} · {p.title}</p>
          <p className="small muted num">Parte {index + 1} di {p.steps.length}</p>
        </div>
        <button className="btn sm" onClick={() => setCard(true)}><Icon.plus /> Flashcard</button>
      </div>
      <Progress value={doneCount} max={p.steps.length} size="big" />
      <div className="card stack" style={{ gap: 10 }}>
        <span className="listen-label"><Icon.headphones /> Ascolta</span>
        <p className="step-title">{step?.title}</p>
        <p className="tiny">Questo capitolo è ancora in preparazione: arriva con il prossimo aggiornamento.</p>
      </div>
      <p className={`clock ${paused ? "paused" : ""}`}>{formatClock(left)}</p>
      <button className="btn field huge block" onClick={onDone}><Icon.check /> Fatto</button>
      <div className="row">
        <button className="btn grow" onClick={togglePause}>{paused ? <><Icon.play /> Riprendi</> : <><Icon.pause /> Pausa</>}</button>
        <button className="btn grow" onClick={addMinute}>+1 minuto</button>
      </div>
      <details className="card">
        <summary>Tutte le parti ({doneCount}/{p.steps.length})</summary>
        <StepList p={p} currentId={t.stepId} />
      </details>
      {card && <CardSheet presentationId={p.id} onClose={() => setCard(false)} />}
    </div>
  );
}

export function StepList({ p, currentId }: { p: Presentation; currentId?: string }) {
  return (
    <ul className="steps">
      {p.steps.map((st) => (
        <li key={st.id}>
          <button className={`check ${st.id === currentId ? "current" : ""}`} onClick={() => toggleStepDone(p.id, st.id)} aria-pressed={st.done}>
            <Box on={st.done} />
            <span className={st.done ? "done-text" : ""}>{st.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ——— Domanda veloce dopo ogni parte ——— */

function CheckStep({ code, index, part, onNext }: { code: string; index: number; part: LessonPack["parts"][number]; onNext: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const q = part.check;
  useAfter(chosen != null && chosen === q.answer, 1600, onNext);
  return (
    <div className="stack fade-in" style={{ gap: 14, paddingTop: 12 }}>
      <span className="tag" style={{ alignSelf: "flex-start" }}>Domanda veloce</span>
      <h1 className="step-title">{q.question}</h1>
      <div className="stack" style={{ gap: 8 }}>
        {q.options.map((o, k) => {
          const cls = chosen == null ? "" : k === q.answer ? "right" : k === chosen ? "wrong" : "";
          return (
            <button
              key={k}
              className={`btn option ${cls}`}
              disabled={chosen != null}
              onClick={() => {
                setChosen(k);
                recordAnswer(`C-${code}-${index + 1}`, k === q.answer, "check");
                if (k !== q.answer) navigator.vibrate?.(80);
              }}
            >
              <span className="letter">{"ABCD"[k]}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {chosen != null && (
        <div className="card soft stack fade-in">
          <p style={{ fontWeight: 750, color: chosen === q.answer ? "var(--field)" : "var(--alarm)" }}>{chosen === q.answer ? "Brava, giusta! Si va avanti…" : "Non proprio."}</p>
          <p className="small muted">{q.explanation}</p>
          <button className="btn primary block" onClick={onNext}>Avanti</button>
        </div>
      )}
    </div>
  );
}

function RecallStep({ p, onNext }: { p: Presentation; onNext: () => void }) {
  const s = useStore();
  const done = p.steps.filter((x) => x.done).length;
  const [text, setText] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [showCard, setShowCard] = useState(false);
  const [checked, setChecked] = useState(false);
  const lastIdx = p.steps.map((x, i) => (x.done ? i : -1)).filter((i) => i >= 0).slice(-3);
  const lesson = lessonFor(s, p.code);
  const points = lesson ? lastIdx.flatMap((i) => (lesson.parts[i]?.keyPoints ?? []).slice(0, 2)) : [];
  const hit = (k: string) => {
    const words = k.toLowerCase().match(/[a-zà-ú0-9%]{5,}/g) ?? [];
    const t = text.toLowerCase();
    return words.some((w) => t.includes(w.slice(0, Math.max(5, w.length - 2))));
  };

  const [ai, setAi] = useState<RecallFeedback | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const check = async () => {
    setChecked(true);
    if (!lesson || text.trim().length < 3 || !getState().settings.appCode) return;
    setAiBusy(true);
    setAiError(null);
    const r = await aiPost<RecallFeedback>("/api/richiamo", {
      recall: text,
      points: lastIdx.flatMap((i) => lesson.parts[i]?.keyPoints ?? []),
      text: lastIdx.map((i) => lesson.parts[i]?.narration ?? "").join("\n\n"),
    });
    setAiBusy(false);
    if (r.ok) setAi(r.data);
    else setAiError(r.error);
  };

  const save = () => {
    if (text.trim()) saveRecall(p.id, done, text.trim());
    for (const e of ai?.errors ?? []) addCard(`Correggi: «${e.wrong}»`, e.right, p.id);
    if (front.trim() && back.trim()) addCard(front.trim(), back.trim(), p.id);
    onNext();
  };

  return (
    <div className="stack fade-in" style={{ gap: 16, paddingTop: 12 }}>
      <div className="saved pop" style={{ alignSelf: "flex-start" }}><Icon.check /> {done} parti fatte</div>
      <h1 className="page-title">Cosa ricordi di queste parti?</h1>
      <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
        {lastIdx.map((i) => <li key={i}>{p.steps[i]?.title}</li>)}
      </ul>
      <textarea aria-label="Cosa ricordi" placeholder="Due righe, con parole tue. Anche un paragone di casa." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      {aiBusy && <div className="card soft small">Il tutor sta leggendo quello che hai scritto…</div>}
      {ai && (
        <div className="card stack fade-in tutor" style={{ gap: 8 }}>
          <div className="spread">
            <h2>Il tutor</h2>
            <span className="pill gold" aria-label={`${ai.score} su 5`}>{"★".repeat(ai.score)}{"☆".repeat(5 - ai.score)}</span>
          </div>
          {ai.praise && <p className="small">{ai.praise}</p>}
          {ai.got.map((g, i) => <p key={`g${i}`} className="small" style={{ color: "var(--field)" }}>✓ {g}</p>)}
          {(ai.errors ?? []).length > 0 ? (
            <div className="stack" style={{ gap: 8 }}>
              <h3 className="tutor-sub">Da correggere</h3>
              {(ai.errors ?? []).map((e, i) => (
                <div key={`e${i}`} className="tutor-fix">
                  <p className="small"><span className="tutor-x">✗</span> «{e.wrong}»</p>
                  <p className="small"><span className="tutor-ok">✓</span> {e.right}</p>
                </div>
              ))}
            </div>
          ) : (
            ai.fix && <p className="small" style={{ color: "var(--alarm)" }}>Attento: {ai.fix}</p>
          )}
          {ai.missing.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <h3 className="tutor-sub">Ti è sfuggito</h3>
              {ai.missing.map((m, i) => <p key={`m${i}`} className="small" style={{ color: "var(--ink-2)" }}>○ {m}</p>)}
            </div>
          )}
          {ai.corrected && (
            <div className="stack" style={{ gap: 4 }}>
              <h3 className="tutor-sub">Detto bene, con le tue parole</h3>
              <p className="small tutor-corrected">{ai.corrected}</p>
            </div>
          )}
          {ai.tip && <p className="analogy">🌼 {ai.tip}</p>}
        </div>
      )}
      {aiError && (
        <div className="card soft stack" style={{ gap: 4 }}>
          <p className="small" style={{ fontWeight: 700 }}>Il tutor non ha potuto correggerti</p>
          <p className="small muted">{aiError}</p>
          {/codice/i.test(aiError) && <CodeInline onSaved={() => void check()} />}
          <p className="tiny">Intanto ecco il confronto semplice con i punti chiave:</p>
        </div>
      )}
      {checked && !ai && !aiBusy && points.length > 0 && (
        <div className="card stack fade-in" style={{ gap: 6 }}>
          <h2>Confronta con i punti chiave</h2>
          {points.map((k, i) => (
            <p key={i} className="small" style={{ color: hit(k) ? "var(--field)" : "var(--ink-2)" }}>{hit(k) ? "✓" : "○"} {k}</p>
          ))}
          <p className="tiny">I ○ sono le cose da ripassare: ritornano nelle flashcard.</p>
        </div>
      )}
      {showCard ? (
        <div className="card stack">
          <label className="field">Domanda<input type="text" value={front} onChange={(e) => setFront(e.target.value)} /></label>
          <label className="field">Risposta<input type="text" value={back} onChange={(e) => setBack(e.target.value)} /></label>
        </div>
      ) : (
        <button className="btn" onClick={() => setShowCard(true)}><Icon.plus /> Crea anche una flashcard</button>
      )}
      {points.length > 0 && !checked ? (
        <button className="btn primary huge block" onClick={() => void check()}>Controlla</button>
      ) : (
        <button className="btn primary huge block" onClick={save}>Avanti</button>
      )}
      <button className="link-btn" onClick={onNext}>Salta</button>
    </div>
  );
}

/** Giro di domande con risposta subito e il perché; le sbagliate diventano carte del ripasso. */
function QuestionRound({ title, questions, onDone }: { title: string; questions: PracticeQuestion[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [over, setOver] = useState(false);
  const cur = questions[i];
  useAfter(over || questions.length === 0, 2200, onDone);
  useAfter(!over && chosen != null && !!cur && chosen === cur.answer, 1500, () => (i + 1 < questions.length ? (setI(i + 1), setChosen(null)) : setOver(true)));
  if (over || questions.length === 0) {
    const wrong = questions.length - right;
    return (
      <div className="hero fade-in">
        <div className="saved pop"><Icon.check /> {right} su {questions.length}</div>
        <p className="page-title" style={{ fontSize: 34 }}>{right === questions.length ? "Tutte giuste." : wrong === 1 ? "Una da ripassare." : `${wrong} da ripassare.`}</p>
        {wrong > 0 && <p className="muted center">Le sbagliate tornano nelle flashcard nei prossimi giorni: è così che si fissano.</p>}
        <button className="btn primary huge block" onClick={onDone}>Avanti</button>
      </div>
    );
  }
  const q = questions[i]!;
  const next = () => {
    if (i + 1 < questions.length) {
      setI(i + 1);
      setChosen(null);
    } else setOver(true);
  };
  return (
    <div className="stack fade-in" style={{ gap: 14, paddingTop: 12 }}>
      <div className="spread">
        <span className="tag">{title}</span>
        <span className="small muted num">{i + 1} di {questions.length}</span>
      </div>
      <span className="pill" style={{ alignSelf: "flex-start" }}>{q.kind === "ripasso" ? `Ripasso · lezione ${q.from}` : `Lezione ${q.from}`}</span>
      <h1 className="step-title">{q.question}</h1>
      <div className="stack" style={{ gap: 8 }}>
        {q.options.map((o, k) => {
          const cls = chosen == null ? "" : k === q.answer ? "right" : k === chosen ? "wrong" : "";
          return (
            <button
              key={k}
              className={`btn option ${cls}`}
              disabled={chosen != null}
              onClick={() => {
                setChosen(k);
                const ok = k === q.answer;
                recordAnswer(q.id, ok, "quiz");
                if (ok) setRight(right + 1);
                else {
                  addMistakeCard(q);
                  navigator.vibrate?.(80);
                }
              }}
            >
              <span className="letter">{"ABCD"[k]}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {chosen != null && (
        <div className="card soft stack fade-in">
          <p style={{ fontWeight: 750, color: chosen === q.answer ? "var(--field)" : "var(--alarm)" }}>{chosen === q.answer ? "Bravo, giusta!" : `Era: ${q.options[q.answer]}`}</p>
          {q.explanation && <p className="small muted">{q.explanation}</p>}
          <button className="btn primary block" onClick={next}>{i + 1 < questions.length ? "Avanti" : "Fine"}</button>
        </div>
      )}
      {chosen == null && <button className="link-btn" onClick={onDone}>Basta domande per ora</button>}
    </div>
  );
}

function Finished({ p, hasExercise, onFinal, onReview, onExercise, onClose, onNextLesson }: { p: Presentation; hasExercise: boolean; onFinal?: () => void; onReview: () => void; onExercise: () => void; onClose: () => void; onNextLesson: () => void }) {
  const [auto, setAuto] = useState(true);
  useAfter(auto, 8000, onNextLesson);
  return (
    <div className="hero fade-in">
      <div className="trophy pop">🏁</div>
      <div className="saved"><Icon.check /> {p.code} finita</div>
      <p className="page-title" style={{ fontSize: 34 }}>Presentazione chiusa.</p>
      <p className="muted">{p.title}</p>
      <div className="stack" style={{ width: "100%" }}>
        {onFinal && <button className="btn primary block" onClick={onFinal}>Partita finale · 6 domande</button>}
        <button className={`btn block ${onFinal ? "" : "primary"}`} onClick={onReview}>Ripasso 10 minuti</button>
        {hasExercise && <button className="btn block" onClick={onExercise}>Esercizio pratico</button>}
        <button className="btn field block" onClick={onNextLesson}>Prossima lezione ›</button>
        {auto ? <button className="link-btn" onClick={() => setAuto(false)}>Fra poco parte la prossima lezione · Fermati qui</button> : <button className="link-btn" onClick={onClose}>Basta per oggi</button>}
      </div>
    </div>
  );
}

/** Bravo! e la parte dopo parte da sola (si può fermare). */
function AutoNext({ p, onStop, onGo }: { p: Presentation; onStop: () => void; onGo: () => void }) {
  const done = p.steps.filter((x) => x.done).length;
  const go = () => { unlockAudio(); unlockSpeech(); startStep(p.id); onGo(); };
  useAfter(true, 2500, go);
  return (
    <div className="hero fade-in">
      <div className="saved pop"><Icon.check /> Bravo!</div>
      <p className="page-title" style={{ fontSize: 36 }}>Parte fatta.</p>
      <p className="step-title">Si va avanti con la prossima…</p>
      <Progress value={done} max={p.steps.length} size="big" />
      <p className="tiny">{p.code} · {done} di {p.steps.length} parti</p>
      <div className="stack" style={{ width: "100%" }}>
        <button className="btn primary huge block" onClick={go}>Vai subito</button>
        <button className="link-btn" onClick={onStop}>Basta per oggi</button>
      </div>
    </div>
  );
}

export function CardSheet({ presentationId, onClose }: { presentationId?: string; onClose: () => void }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  return (
    <Sheet label="Nuova flashcard" onClose={onClose}>
      <h2 className="step-title" style={{ fontSize: 22 }}>Nuova flashcard</h2>
      <label className="field">Domanda<input type="text" value={front} onChange={(e) => setFront(e.target.value)} autoFocus /></label>
      <label className="field">Risposta<textarea value={back} onChange={(e) => setBack(e.target.value)} /></label>
      <button
        className="btn primary block"
        disabled={!front.trim() || !back.trim()}
        onClick={() => {
          addCard(front.trim(), back.trim(), presentationId);
          onClose();
        }}
      >
        Salva
      </button>
      <button className="link-btn" onClick={onClose}>Annulla</button>
    </Sheet>
  );
}

/* ——— "Spiegamelo con un paragone": l'IA scrive un esempio dal campo, che resta salvato ——— */


/* ——— Lezione con audio vero (Marco e Luca): va anche a schermo bloccato ——— */


/**
 * Calendario delle lezioni: tocchi una lezione e l'app riparte da lì (resta salvato).
 * Da lì va avanti da sola; puoi sempre tornare indietro toccando una lezione prima.
 */
function LessonCalendar({ now }: { now: string }) {
  const s = useStore();
  const cur = currentItem(s, now);
  const curId = cur?.kind === "real" ? cur.presentation.id : undefined;
  const list = s.presentations.filter((p) => lessonFor(s, p.code)).sort((a, b) => comparePresentationCode(a.code, b.code));
  const strip = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(".cal-chip.now");
    if (el && strip.current) strip.current.scrollLeft = el.offsetLeft - strip.current.clientWidth / 2 + el.clientWidth / 2;
  }, [curId]);
  return (
    <section className="card lesson-cal" aria-label="Da quale lezione parti">
      <div className="spread"><h2>I capitoli</h2><span className="tiny muted">tocca e parte la lezione</span></div>
      <div className="cal-strip" ref={strip}>
        {list.map((p) => {
          const done = p.steps.filter((x) => x.done).length, all = p.steps.length;
          const state = done === all ? "done" : p.id === curId ? "now" : done > 0 ? "half" : "";
          return (
            <button key={p.id} className={`cal-chip ${state}`} aria-pressed={p.id === curId} style={{ ["--img" as string]: `url(/img/u${p.unit}.svg)` }}
              onClick={() => { unlockAudio(); unlockSpeech(); if (done === all) startReplay(p.id, p.steps[0]!.id); else { setState((d) => void (d.lastPresentationId = p.id)); startStep(p.id); } }}>
              <span className="cal-code num">{p.code}</span>
              <span className="cal-title">{lessonFor(s, p.code)?.title}</span>
              <span className="cal-state">{done === all ? "✓ rivedi" : p.id === curId ? "▶ adesso" : done > 0 ? `${done}/${all}` : "da fare"}</span>
            </button>
          );
        })}
      </div>
      {cur && <p className="small">Si parte da: <b>{cur.kind === "real" ? `${cur.presentation.code} · ${lessonFor(s, cur.presentation.code)?.title ?? ""}` : cur.code}</b></p>}
    </section>
  );
}

/** Codice del tutor scritto qui, senza andare in Altro: lo salva e riprova subito. */
function CodeInline({ onSaved }: { onSaved: () => void }) {
  const s = useStore();
  const [code, setCode] = useState(s.settings.appCode ?? "");
  return (
    <div className="stack" style={{ gap: 6 }}>
      <label className="field">Codice di accesso del tutor<input type="text" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="lo stesso che avevi scritto in Altro" /></label>
      <button className="btn primary block" disabled={!code.trim()} onClick={() => { setState((d) => void (d.settings.appCode = code.trim())); onSaved(); }}>Salva e correggimi</button>
    </div>
  );
}


/** Foto morbide delle lezioni (public/img, stesso stile: salvia, pietra, luce calda). */

/** Numero che sale da 0 al valore quando entra nello schermo (una volta sola). */
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(to);
  const el = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const node = el.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 1100); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={el}>{v}</span>;
}

/**
 * Effetti di scorrimento della schermata principale: saluto che si rimpicciolisce, carta di oggi che si allontana,
 * sezioni che arrivano a fuoco (.fx-blur), carte che si raddrizzano (.fx-tilt), lezioni a scatti con quella al centro più grande.
 */
function useScrollFx() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    const entered = (el: Element, span: number) => clamp((innerHeight - el.getBoundingClientRect().top) / (innerHeight * span));
    const frame = () => {
      const g = document.getElementById("greet");
      if (g) { const k = clamp(scrollY / 120); g.style.setProperty("--shrink", String(k)); g.classList.toggle("small", k > 0.95); }
      if (reduce) return;
      const hero = document.querySelector<HTMLElement>(".hero.compact");
      if (hero) hero.style.setProperty("--z", String(1 - clamp((160 - hero.getBoundingClientRect().top) / 600) * 0.1));
      document.querySelectorAll<HTMLElement>(".fx-blur").forEach((el) => el.style.setProperty("--b", String(1 - entered(el, 0.4))));
      document.querySelectorAll<HTMLElement>(".fx-tilt").forEach((el) => el.style.setProperty("--r", String(1 - entered(el, 0.35))));
    };
    const strip = () => {
      const box = document.querySelector<HTMLElement>(".cal-strip");
      if (!box) return;
      const mid = box.getBoundingClientRect().left + box.clientWidth / 2;
      box.querySelectorAll<HTMLElement>(".cal-chip").forEach((el) => { const r = el.getBoundingClientRect(), d = clamp(Math.abs(r.left + r.width / 2 - mid) / r.width); el.style.setProperty("--s", String(1 - d * 0.07)); el.style.setProperty("--o", String(1 - d * 0.35)); });
    };
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { frame(); strip(); }); };
    addEventListener("scroll", onScroll, { passive: true });
    const box = document.querySelector(".cal-strip");
    box?.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { removeEventListener("scroll", onScroll); box?.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
}
