import { useEffect, useMemo, useRef, useState } from "react";
import { aiPost, type Paragone, type RecallFeedback } from "../lib/ai";
import { Cartoon } from "../Cartoon";
import { audioFor, lineAt, type AudioLine, type AudioPart } from "../lib/audio";
import { pickTurn, turnsFor, type Turn } from "../lib/turns";
import { nextAction } from "../lib/coach";
import { addDays, daysBetween, shortDate, today, weekStart, weekday } from "../lib/dates";
import { MINUTES_PER_PART, buildSchedule, formatMinutes, minutesOf } from "../lib/schedule";
import { dailyChallenge, level, totalXp } from "../lib/game";
import type { LessonPack } from "../lib/lesson";
import { lessonFor } from "../lib/lessons";
import { currentItem, daySaved, isDone } from "../lib/plan";
import {
  addCard,
  addMinute,
  cancelStep,
  finishReplay,
  startReplay,
  startStepAt,
  ensurePresentation,
  finishStep,
  getState,
  recordAnswer,
  saveExplanation,
  saveRecall,
  setState,
  startStep,
  togglePause,
  toggleStepDone,
  useStore,
} from "../lib/store";
import { streak } from "../lib/streak";
import { readSentences, splitSentences, ttsAvailable, unlockSpeech, voicesReady, type Reader } from "../lib/tts";
import type { Presentation } from "../lib/types";
import { Box, Icon, Progress, Sheet, beep, formatClock, unlockAudio } from "../ui";

type Phase = "idle" | "check" | "recall" | "again" | "finished" | "library";
export type Intent = { kind: "cards" } | { kind: "boss"; unit: number } | { kind: "quiz" } | { kind: "exercise"; code: string };

const COURSE_URL = "https://online.setantacollege.com/my/";

export function Today({ goTo }: { goTo: (tab: "ripasso" | "situazione", intent?: Intent) => void }) {
  const s = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [last, setLast] = useState<{ pid: string; index: number } | null>(null);
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
      const onDone = s.timer.replay
        ? () => {
            finishReplay();
            setPhase("library");
          }
        : () => {
            finishStep();
            afterPart(p.id, index);
          };
      const audio = lesson ? audioFor(lesson.code, index) : undefined;
      if (lesson?.parts[index] && audio) return <AudioLessonSession key={`${p.code}-${index}`} p={p} lesson={lesson} index={index} audio={audio} onDone={onDone} />;
      return lesson?.parts[index] ? <LessonSession p={p} lesson={lesson} index={index} onDone={onDone} /> : <TimerSession p={p} onDone={onDone} />;
    }
  }

  const lastP = last ? s.presentations.find((x) => x.id === last.pid) : undefined;

  if (phase === "check" && lastP && last) {
    const lesson = lessonFor(s, lastP.code);
    const part = lesson?.parts[last.index];
    if (lesson && part) return <CheckStep code={lesson.code} index={last.index} part={part} onNext={() => nextAfterCheck(getState().presentations.find((x) => x.id === lastP.id)!)} />;
  }

  if (phase === "recall" && lastP) {
    return <RecallStep p={lastP} onNext={() => setPhase(isDone(lastP) ? "finished" : "again")} />;
  }

  if (phase === "again" && lastP) {
    const done = lastP.steps.filter((x) => x.done).length;
    const daily = dailyChallenge(s, now);
    return (
      <div className="hero fade-in">
        <div className="saved pop"><Icon.check /> Giornata salvata</div>
        <p className="page-title" style={{ fontSize: 40 }}>Fatto.</p>
        <p className="step-title">Ne fai un'altra?</p>
        <div className="stack" style={{ width: "100%" }}>
          <button
            className="btn primary huge block"
            onClick={() => {
              unlockAudio();
              unlockSpeech();
              startStep(lastP.id);
              setPhase("idle");
            }}
          >
            Sì
          </button>
          <button className="link-btn" onClick={() => setPhase("idle")}>Basta per oggi</button>
        </div>
        <Progress value={done} max={lastP.steps.length} size="big" />
        <p className="tiny">
          {lastP.code} · {done} di {lastP.steps.length} parti
          {!daily.complete && daily.target > 0 && ` · sfida di oggi ${Math.min(daily.done, daily.target)}/${daily.target}`}
        </p>
      </div>
    );
  }

  if (phase === "finished" && lastP) {
    return (
      <Finished
        p={lastP}
        hasExercise={!!lessonFor(s, lastP.code)?.exercises.length}
        onReview={() => goTo("ripasso", { kind: "cards" })}
        onExercise={() => goTo("ripasso", { kind: "exercise", code: lastP.code })}
        onClose={() => setPhase("idle")}
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
      <p className="muted small">Tutte le lezioni del corso. ▶ verde: già fatta, la riascolti quando vuoi (non cambia il piano). ▶ arancione: da fare, la fai adesso e conta come studio.</p>
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

  return (
    <div className="stack fade-in" style={{ gap: 14 }}>
      <button className="gamebar" onClick={() => goTo("situazione")} aria-label="Vai alla stagione">
        <span className="lv-badge">{lv.index + 1}</span>
        <span className="grow" style={{ textAlign: "left" }}>
          <span className="lv-name">{lv.name}</span>
          <span className="xpbar"><span style={{ width: `${Math.round(lv.progress * 100)}%` }} /></span>
        </span>
        <span className="pill gold num"><Icon.fire /> {st.days}</span>
        <span className="pill num">{xp} pt</span>
      </button>

      <section className="card progress-hero" aria-label="A che punto sei">
        <Ring percent={sch.percent} />
        <div className="stack" style={{ gap: 4 }}>
          <p className="tiny">A che punto sei</p>
          <p className="ph-title">Corso al {sch.percent}%</p>
          <p className="small muted num">{sch.doneParts} parti fatte su {sch.totalParts}</p>
          <p className="small num">Fine prevista: <b>{sch.end ? shortDate(sch.end) : "–"}</b></p>
          <p className="small muted num">MCQ tra {mcqDays} giorni · mancano circa {formatMinutes(minutesOf(sch.remainingParts))}</p>
        </div>
      </section>

      {note && (
        <div className="replan fade-in" role="status">
          <b>Il piano si è aggiornato.</b> L'ultima volta sono rimaste {note.missed} {note.missed === 1 ? "parte" : "parti"}: le ho spostate nei prossimi giorni.
          {note.to > note.from ? ` Ora bastano ${note.to} parti al giorno (circa ${formatMinutes(minutesOf(note.to))}).` : ` Il minimo resta ${note.to} parti al giorno.`}
        </div>
      )}

      <section className={`card today-card ${sch.todayDone >= sch.todayTarget && sch.todayTarget > 0 ? "won" : ""}`} aria-label="Oggi">
        <div className="spread">
          <h2>Oggi</h2>
          <span className="small num" style={{ fontWeight: 750 }}>{restToday ? "giorno libero" : `${todayDone}/${sch.todayTarget} parti`}</span>
        </div>
        {!restToday && <Progress value={todayDone} max={Math.max(1, sch.todayTarget)} size="big" />}
        <p className="small">
          {restToday
            ? "Oggi è il giorno della partita: niente obbligo. Se vuoi, 2 minuti di ripasso."
            : sch.todayLeft > 0
              ? <>Bastano <b>{formatMinutes(minutesOf(sch.todayLeft))}</b>: {sch.todayCodes.map((c) => `${c.count} ${c.count === 1 ? "parte" : "parti"} della ${c.code}`).join(" e ")}.</>
              : <>✓ Fatto per oggi. Tutto quello che fai adesso è vantaggio per domani.</>}
        </p>
      </section>

      <div className="hero compact">
        {saved && <div className="saved"><Icon.check /> Giornata salvata</div>}
        <button className={`go small-go ${action.kind === "part" ? "" : "calm"}`} onClick={go} aria-label={`${action.label}: ${action.sub}`}>
          <Icon.play />
          <span className="go-label">{action.label}</span>
        </button>
        <p className="muted small">{action.sub}</p>
      </div>

      <section className="card stack" aria-label="Questa settimana" style={{ gap: 10 }}>
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
              <span className="wb-day">{w.rest ? "⚽" : WD[weekday(w.date)]}</span>
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

function Ring({ percent }: { percent: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 110 110" role="img" aria-label={`${percent}% del corso`}>
      <defs>
        <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--brand)" />
        </linearGradient>
      </defs>
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="11" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="url(#ringg)" strokeWidth="11" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 55 55)" className="ring-arc" />
      <text x="55" y="61" textAnchor="middle" className="ring-text">{percent}%</text>
    </svg>
  );
}

/* ——— Lezione con voce e carte ——— */

const RATES = [0.9, 1, 1.15, 1.3];

function LessonSession({ p, lesson, index, onDone }: { p: Presentation; lesson: LessonPack; index: number; onDone: () => void }) {
  const s = useStore();
  const part = lesson.parts[index]!;
  const sentences = useMemo(() => splitSentences(part.narration), [part.narration]);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showText, setShowText] = useState(!ttsAvailable());
  const [card, setCard] = useState(false);
  const reader = useRef<Reader | null>(null);
  const doneCount = p.steps.filter((x) => x.done).length;
  const rate = s.settings.voiceRate || 1;

  const play = (from: number) => {
    reader.current?.stop();
    setEnded(false);
    setPlaying(true);
    reader.current = readSentences(sentences, {
      from,
      rate,
      voiceName: s.settings.voiceName,
      onSentence: setCur,
      onEnd: () => {
        setPlaying(false);
        setEnded(true);
        setCur(sentences.length - 1);
      },
    });
  };

  // Parte da sola: la sessione nasce da un tocco, la voce è già sbloccata.
  useEffect(() => {
    let alive = true;
    if (ttsAvailable()) void voicesReady().then(() => alive && play(0));
    return () => {
      alive = false;
      reader.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Lo schermo resta acceso durante la lezione.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  const shown = ended ? part.keyPoints.length : Math.max(1, Math.ceil(((cur + 1) / sentences.length) * part.keyPoints.length));

  return (
    <div className="stack fade-in" style={{ gap: 16 }}>
      <div className="session-head">
        <button
          className="icon-btn"
          aria-label="Chiudi senza segnare questa parte"
          onClick={() => {
            if (confirm("Chiudere? Questa parte non viene segnata.")) {
              reader.current?.stop();
              cancelStep();
            }
          }}
        >
          <Icon.close />
        </button>
        <div className="grow">
          <p className="tiny">{p.code} · {lesson.title}</p>
          <p className="small muted num">Parte {index + 1} di {p.steps.length}</p>
        </div>
        <button className="btn sm" onClick={() => setCard(true)}><Icon.plus /> Flashcard</button>
      </div>

      <Progress value={doneCount} max={p.steps.length} size="big" />

      <div className="card lesson-card stack" style={{ gap: 12 }}>
        <span className="listen-label"><Icon.headphones /> {playing ? "Ascolta" : ended ? "Fatto l'ascolto" : "Pronto"}</span>
        <p className="step-title">{part.title}</p>
        <ul className="keypoints">
          {part.keyPoints.slice(0, shown).map((k, i) => (
            <li key={i} className="pop">{k}</li>
          ))}
        </ul>
        {ended && <p className="analogy pop">⚽ {part.analogy}</p>}
        <ParagoneButton presentationId={p.id} concept={part.title} context={part.narration} />
      </div>

      {showText ? (
        <div className="card soft narration">
          {sentences.map((t, i) => (
            <span key={i} className={i === cur && playing ? "now" : ""}>{t} </span>
          ))}
        </div>
      ) : (
        <p className="caption" aria-live="polite">{sentences[cur]}</p>
      )}

      <div className="row">
        <button className="btn grow" onClick={() => (playing ? (reader.current?.stop(), setPlaying(false)) : play(ended ? 0 : cur))}>
          {playing ? <><Icon.pause /> Pausa</> : <><Icon.play /> {ended ? "Riascolta" : "Ascolta"}</>}
        </button>
        <button
          className="btn"
          aria-label="Velocità della voce"
          onClick={() => {
            const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1;
            setState((d) => void (d.settings.voiceRate = next));
            if (playing) setTimeout(() => play(cur), 0);
          }}
        >
          {rate}×
        </button>
        <button className="btn" onClick={() => setShowText(!showText)}>{showText ? "Nascondi" : "Testo"}</button>
      </div>

      <button
        className={`btn field huge block ${ended ? "pulse" : ""}`}
        onClick={() => {
          reader.current?.stop();
          onDone();
        }}
      >
        <Icon.check /> Fatto
      </button>

      {card && <CardSheet presentationId={p.id} onClose={() => setCard(false)} />}
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
        <p className="tiny">La lezione di questa presentazione non è ancora nell'app. Caricala da Altro → Aggiungi lezione dal PDF.</p>
        <a className="small" href={COURSE_URL} target="_blank" rel="noreferrer">Per ora: apri il corso e premi play <Icon.external /></a>
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
          <p style={{ fontWeight: 750, color: chosen === q.answer ? "var(--field)" : "var(--alarm)" }}>{chosen === q.answer ? "Giusta." : "Non proprio."}</p>
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
    if (!lesson || text.trim().length < 3) return;
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
      <textarea aria-label="Cosa ricordi" placeholder="Due righe, con parole tue. Anche un paragone col campo." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      {aiBusy && <div className="card soft small">Il tutor sta leggendo quello che hai scritto…</div>}
      {ai && (
        <div className="card stack fade-in tutor" style={{ gap: 8 }}>
          <div className="spread">
            <h2>Il tutor</h2>
            <span className="pill gold" aria-label={`${ai.score} su 5`}>{"★".repeat(ai.score)}{"☆".repeat(5 - ai.score)}</span>
          </div>
          {ai.praise && <p className="small">{ai.praise}</p>}
          {ai.got.map((g, i) => <p key={`g${i}`} className="small" style={{ color: "var(--field)" }}>✓ {g}</p>)}
          {ai.missing.map((m, i) => <p key={`m${i}`} className="small" style={{ color: "var(--ink-2)" }}>○ {m}</p>)}
          {ai.fix && <p className="small" style={{ color: "var(--alarm)" }}>Attento: {ai.fix}</p>}
          {ai.tip && <p className="analogy">⚽ {ai.tip}</p>}
        </div>
      )}
      {aiError && <p className="tiny">{aiError} Intanto ecco il confronto semplice:</p>}
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

function Finished({ p, hasExercise, onReview, onExercise, onClose }: { p: Presentation; hasExercise: boolean; onReview: () => void; onExercise: () => void; onClose: () => void }) {
  return (
    <div className="hero fade-in">
      <div className="trophy pop">🏁</div>
      <div className="saved"><Icon.check /> {p.code} finita</div>
      <p className="page-title" style={{ fontSize: 34 }}>Presentazione chiusa.</p>
      <p className="muted">{p.title}</p>
      <div className="stack" style={{ width: "100%" }}>
        <button className="btn primary block" onClick={onReview}>Ripasso 10 minuti</button>
        {hasExercise && <button className="btn block" onClick={onExercise}>Esercizio pratico</button>}
        <button className="link-btn" onClick={onClose}>Basta per oggi</button>
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

function ParagoneButton({ presentationId, concept, context }: { presentationId: string; concept: string; context: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Paragone | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (res) {
    return (
      <div className="card soft stack fade-in" style={{ gap: 6 }}>
        <p className="small">{res.simple}</p>
        <p className="analogy">⚽ {res.analogy}</p>
        {res.remember && <p className="tiny"><b>Da ricordare:</b> {res.remember}</p>}
        <p className="tiny">Salvato in Ripasso → Spiegami.</p>
      </div>
    );
  }
  return (
    <>
      <button
        className="btn sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await aiPost<Paragone>("/api/paragone", { concept, context });
          setBusy(false);
          if (!r.ok) return setError(r.error);
          setRes(r.data);
          saveExplanation({ presentationId, concept, text: r.data.simple, analogy: r.data.analogy });
        }}
      >
        {busy ? "Penso a un esempio…" : "Non mi è chiaro: spiegamelo con un paragone"}
      </button>
      {error && <p className="tiny" style={{ color: "var(--alarm)" }}>{error}</p>}
    </>
  );
}

/* ——— Lezione con audio vero (Marco e Luca): va anche a schermo bloccato ——— */

const AUDIO_RATES = [1, 1.15, 1.3, 0.9];

function AudioLessonSession({ p, lesson, index, audio, onDone }: { p: Presentation; lesson: LessonPack; index: number; audio: AudioPart; onDone: () => void }) {
  const s = useStore();
  const part = lesson.parts[index]!;
  const el = useRef<HTMLAudioElement | null>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showText, setShowText] = useState(false);
  const [card, setCard] = useState(false);
  const doneCount = p.steps.filter((x) => x.done).length;
  const replay = !!s.timer?.replay;
  const rate = AUDIO_RATES.includes(s.settings.voiceRate) ? s.settings.voiceRate : 1;
  const view = s.settings.lessonView ?? "cartoon";
  const cur = lineAt(audio.lines, t);
  const progress = audio.duration > 0 ? Math.min(1, t / audio.duration) : 0;
  const shown = ended ? part.keyPoints.length : Math.max(1, Math.ceil(progress * part.keyPoints.length));
  // "Tocca a te": a caso, una domanda del dialogo la fa rispondere a te prima della risposta vera
  const [turn] = useState(() => pickTurn(turnsFor(p.code, index), audio.lines, Math.random()));
  const [turnState, setTurnState] = useState<"attesa" | "domanda" | "fatto">("attesa");

  useEffect(() => {
    if (!turn || turnState !== "attesa" || !playing) return;
    const id = window.setInterval(() => {
      const a = el.current;
      if (!a || document.visibilityState !== "visible") return; // a schermo spento l'ascolto non si interrompe
      if (a.currentTime >= turn.at && a.currentTime < turn.at + 2) {
        a.pause();
        navigator.vibrate?.(30);
        setTurnState("domanda");
      } else if (a.currentTime >= turn.at + 2) setTurnState("fatto"); // superata (es. salto in avanti)
    }, 50);
    return () => window.clearInterval(id);
  }, [turn, turnState, playing]);

  useEffect(() => {
    const a = el.current;
    if (!a) return;
    a.playbackRate = rate;
    a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `${p.code} · ${part.title}`, artist: "Marco e Luca", album: "Setanta Coach", artwork: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }] });
      navigator.mediaSession.setActionHandler("play", () => void a.play());
      navigator.mediaSession.setActionHandler("pause", () => a.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => (a.currentTime = Math.max(0, a.currentTime - 10)));
      navigator.mediaSession.setActionHandler("seekforward", () => (a.currentTime = Math.min(a.duration, a.currentTime + 10)));
    }
    return () => a.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const toggle = () => {
    const a = el.current;
    if (!a) return;
    if (a.paused) {
      if (ended) {
        a.currentTime = 0;
        setEnded(false);
      }
      void a.play().then(() => setBlocked(false));
    } else a.pause();
  };

  return (
    <div className="stack fade-in" style={{ gap: 16 }}>
      <audio
        ref={el}
        src={audio.src}
        preload="auto"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
        }}
      />
      <div className="session-head">
        <button className="icon-btn" aria-label={replay ? "Chiudi il riascolto" : "Chiudi senza segnare questa parte"} onClick={() => (replay || confirm("Chiudere? Questa parte non viene segnata.")) && cancelStep()}>
          <Icon.close />
        </button>
        <div className="grow">
          <p className="tiny">{p.code} · {lesson.title}</p>
          <p className="small muted num">{replay ? `Riascolto · parte ${index + 1} di ${p.steps.length}` : `Parte ${index + 1} di ${p.steps.length}`}</p>
        </div>
        <button className="btn sm" onClick={() => setCard(true)}><Icon.plus /> Flashcard</button>
      </div>

      <Progress value={doneCount} max={p.steps.length} size="big" />

      <div className="view-switch" role="tablist" aria-label="Come vuoi la lezione">
        <button className={view === "cartoon" ? "on" : ""} onClick={() => setState((d) => void (d.settings.lessonView = "cartoon"))}>🎬 Cartone</button>
        <button className={view === "audio" ? "on" : ""} onClick={() => setState((d) => void (d.settings.lessonView = "audio"))}>🎧 Solo ascolto</button>
      </div>

      {view === "cartoon" ? (
        <>
          <Cartoon audioRef={el} audio={audio} keyPoints={part.keyPoints} analogy={part.analogy} title={part.title} />
          <p className="step-title" style={{ fontSize: 20 }}>{part.title}</p>
          <ParagoneButton presentationId={p.id} concept={part.title} context={part.narration} />
        </>
      ) : (
        <>
      <div className="card lesson-card stack" style={{ gap: 12 }}>
        <span className="listen-label"><Icon.headphones /> {playing ? "Marco e Luca" : ended ? "Fatto l'ascolto" : "Pronto"}</span>
        <p className="step-title">{part.title}</p>
        <ul className="keypoints">
          {part.keyPoints.slice(0, shown).map((k, i) => <li key={i} className="pop">{k}</li>)}
        </ul>
        {ended && <p className="analogy pop">⚽ {part.analogy}</p>}
        <ParagoneButton presentationId={p.id} concept={part.title} context={part.narration} />
      </div>

      {showText ? (
        <div className="card soft stack" style={{ gap: 6 }}>
          {audio.lines.map((l, i) => (
            <p key={i} className={`small ${i === cur && playing ? "now-line" : ""}`}><b>{l.who === "M" ? "Marco" : "Luca"}:</b> {l.text}</p>
          ))}
        </div>
      ) : (
        <p className="caption" aria-live="polite"><b>{audio.lines[cur]?.who === "M" ? "Marco" : "Luca"}:</b> {audio.lines[cur]?.text}</p>
      )}

        </>
      )}

      <div className="timer-bar" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>

      <div className="row">
        <button className="btn grow" onClick={() => el.current && (el.current.currentTime = Math.max(0, el.current.currentTime - 10))} aria-label="Indietro di 10 secondi">−10 s</button>
        <button className="btn primary grow" onClick={toggle}>{playing ? <><Icon.pause /> Pausa</> : <><Icon.play /> {ended ? "Riascolta" : blocked ? "Ascolta" : "Riprendi"}</>}</button>
        <button
          className="btn"
          aria-label="Velocità"
          onClick={() => {
            const next = AUDIO_RATES[(AUDIO_RATES.indexOf(rate) + 1) % AUDIO_RATES.length] ?? 1;
            setState((d) => void (d.settings.voiceRate = next));
            if (el.current) el.current.playbackRate = next;
          }}
        >
          {rate}×
        </button>
        <button className="btn" onClick={() => setShowText(!showText)}>{showText ? "Nascondi" : "Testo"}</button>
      </div>

      <button className={`btn field huge block ${ended ? "pulse" : ""}`} onClick={() => { el.current?.pause(); onDone(); }}>
        <Icon.check /> Fatto
      </button>
      {card && <CardSheet presentationId={p.id} onClose={() => setCard(false)} />}
      {turn && turnState === "domanda" && (
        <TurnSheet
          code={p.code}
          turn={turn.turn}
          asker={audio.lines[turn.turn.line]!}
          onDone={() => {
            setTurnState("fatto");
            void el.current?.play();
          }}
        />
      )}
    </div>
  );
}

/** Frasi di Marco dopo la tua risposta (file in public/audio/turni). */
const MARCO_SAYS = {
  giusto: ["Esatto. Hai ragionato da preparatore.", "Bravo! Proprio così.", "Giusto. Luca, prendi appunti.", "Perfetto: è il ragionamento giusto."],
  sbagliato: ["Quasi. Ragioniamoci un attimo insieme.", "Ci sei vicino. Guarda bene qui.", "Tranquillo, è l'errore più comune. Vediamo perché.", "Non proprio. Ma ci arriviamo in un attimo."],
} as const;

/** "Tocca a te": rispondi tu al posto di chi risponde nel dialogo, Marco ti corregge, poi senti la risposta vera. */
function TurnSheet({ code, turn, asker, onDone }: { code: string; turn: Turn; asker: AudioLine; onDone: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [say, setSay] = useState(0);
  const voice = useRef<HTMLAudioElement | null>(null);
  const right = chosen === turn.answer;
  useEffect(() => () => voice.current?.pause(), []);
  const finish = () => {
    voice.current?.pause();
    onDone();
  };
  return (
    <Sheet label="Tocca a te" onClose={finish}>
      <span className="tag">🎯 Tocca a te</span>
      <p className="tiny">{asker.who === "M" ? "Marco ti chiede:" : "Luca chiede. Rispondi tu, prima di Marco:"}</p>
      <h2 className="step-title" style={{ fontSize: 21 }}>{turn.question}</h2>
      <div className="stack" style={{ gap: 8 }}>
        {turn.options.map((o, k) => {
          const cls = chosen == null ? "" : k === turn.answer ? "right" : k === chosen ? "wrong" : "";
          return (
            <button
              key={k}
              className={`btn option ${cls}`}
              disabled={chosen != null}
              onClick={() => {
                setChosen(k);
                recordAnswer(`T-${code}-${turn.part}-${turn.line}`, k === turn.answer, "check");
                if (k !== turn.answer) navigator.vibrate?.(80);
                // Marco risponde a voce: complimenti o correzione gentile
                const n = Math.floor(Math.random() * 4);
                setSay(n);
                voice.current = new Audio(`/audio/turni/${k === turn.answer ? "giusto" : "sbagliato"}-${n + 1}.mp3`);
                void voice.current.play().catch(() => {});
              }}
            >
              <span className="letter">{"ABCD"[k]}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {chosen != null && (
        <div className="card soft stack fade-in" style={{ gap: 8 }}>
          <p style={{ fontWeight: 750, color: right ? "var(--field)" : "var(--alarm)" }}>
            <span className="turn-who">Marco</span> {MARCO_SAYS[right ? "giusto" : "sbagliato"][say]}
          </p>
          <p className="small muted">{turn.why}</p>
          <button className="btn primary block" onClick={finish}>
            <Icon.play /> Senti la risposta di {asker.who === "M" ? "Luca" : "Marco"}
          </button>
        </div>
      )}
      {chosen == null && (
        <button className="btn ghost sm" onClick={finish}>
          Salta questa domanda
        </button>
      )}
    </Sheet>
  );
}
