import { useEffect, useMemo, useRef, useState } from "react";
import { aiPost, type Paragone } from "../lib/ai";
import { pickQuestions, weakCount } from "../lib/coach";
import { shortDate, today } from "../lib/dates";
import { BOSS_QUESTIONS, BOSS_TO_WIN, bossStatus } from "../lib/game";
import { allLessons, allQuestions } from "../lib/lessons";
import { dueCards, type Grade } from "../lib/sm2";
import {
  deleteCard,
  deleteExplanation,
  getState,
  gradeCard,
  logMinutes,
  markExercise,
  recordAnswer,
  saveBossResult,
  saveExplanation,
  saveQuizResult,
  useStore,
} from "../lib/store";
import type { Card, Explanation, Question } from "../lib/types";
import { Icon, Progress, beep, formatClock, unlockAudio } from "../ui";
import { CardSheet, type Intent } from "./Today";

type Mode = "flash" | "quiz" | "esercizi" | "spiega";

export function Review({ intent, onIntentDone }: { intent?: Intent | null; onIntentDone?: () => void }) {
  const [mode, setMode] = useState<Mode>(() =>
    intent?.kind === "boss" || intent?.kind === "quiz" ? "quiz" : intent?.kind === "exercise" ? "esercizi" : "flash",
  );
  return (
    <div className="stack fade-in" style={{ gap: 16 }}>
      <h1 className="page-title">Ripasso</h1>
      <div className="seg" role="tablist">
        <button className={mode === "flash" ? "on" : ""} onClick={() => setMode("flash")}>Carte</button>
        <button className={mode === "quiz" ? "on" : ""} onClick={() => setMode("quiz")}>Quiz</button>
        <button className={mode === "esercizi" ? "on" : ""} onClick={() => setMode("esercizi")}>Esercizi</button>
        <button className={mode === "spiega" ? "on" : ""} onClick={() => setMode("spiega")}>Spiegami</button>
      </div>
      {mode === "flash" && <Flashcards autostart={intent?.kind === "cards"} onStarted={onIntentDone} />}
      {mode === "quiz" && <Quiz intent={intent} onStarted={onIntentDone} />}
      {mode === "esercizi" && <Exercises code={intent?.kind === "exercise" ? intent.code : undefined} />}
      {mode === "spiega" && <Explanations />}
    </div>
  );
}

/* ——— Flashcard ——— */

const REVIEW_MS = 10 * 60 * 1000;

function Flashcards({ autostart, onStarted }: { autostart?: boolean; onStarted?: () => void }) {
  const s = useStore();
  const [running, setRunning] = useState(() => !!autostart && dueCards(getState().cards, today()).length > 0);
  useEffect(() => {
    if (autostart) onStarted?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [adding, setAdding] = useState(false);
  const due = dueCards(s.cards, today());

  if (running) return <ReviewSession onEnd={() => setRunning(false)} />;

  return (
    <div className="stack">
      <div className="card stack center">
        <p className="big-num">{due.length}</p>
        <p className="muted">{due.length === 1 ? "carta da ripassare oggi" : "carte da ripassare oggi"}</p>
        <button
          className="btn primary block"
          disabled={due.length === 0}
          onClick={() => {
            unlockAudio();
            setRunning(true);
          }}
        >
          Ripasso 10 minuti
        </button>
        {s.cards.length === 0 && <p className="tiny">Le carte arrivano da sole quando fai le parti di una lezione. Puoi anche crearne qui sotto.</p>}
      </div>
      <button className="btn block" onClick={() => setAdding(true)}><Icon.plus /> Nuova flashcard</button>
      {s.cards.length > 0 && (
        <details className="card">
          <summary>Tutte le carte ({s.cards.length})</summary>
          <ul className="plan-list">
            {s.cards.map((c) => (
              <li key={c.id}>
                <div className="grow">
                  <p className="small" style={{ fontWeight: 650 }}>{c.front}</p>
                  <p className="tiny">Prossimo ripasso: {shortDate(c.due)}</p>
                </div>
                <button className="link-btn" onClick={() => confirm("Eliminare questa carta?") && deleteCard(c.id)}>Elimina</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {adding && <CardSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function ReviewSession({ onEnd }: { onEnd: () => void }) {
  const s = useStore();
  const [queue, setQueue] = useState<string[]>(() => dueCards(s.cards, today()).map((c) => c.id));
  const [show, setShow] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [reviewed, setReviewed] = useState(0);
  const ended = useRef(false);
  const card: Card | undefined = s.cards.find((c) => c.id === queue[0]);
  const left = REVIEW_MS - (now - startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    logMinutes(Math.round(((Date.now() - startedAt) / 60_000) * 10) / 10);
  };

  const over = left <= 0 || !card;
  useEffect(() => {
    if (over && !ended.current) {
      if (left <= 0) beep();
      finish();
    }
  });

  if (over) {
    return (
      <div className="card stack center pop">
        <p className="big-num">{reviewed}</p>
        <p className="muted">carte ripassate. Bravo.</p>
        <button className="btn primary block" onClick={onEnd}>Chiudi</button>
      </div>
    );
  }

  const grade = (g: Grade) => {
    gradeCard(card.id, g);
    setReviewed((n) => n + 1);
    setShow(false);
    // "Non ricordo": la carta torna in fondo alla coda una volta.
    setQueue((q) => (g === 1 && !q.slice(1).includes(card.id) ? [...q.slice(1), card.id] : q.slice(1)));
  };

  return (
    <div className="stack">
      <div className="spread">
        <span className="pill num">{formatClock(left)}</span>
        <span className="tiny">{queue.length} rimaste</span>
        <button
          className="link-btn"
          onClick={() => {
            finish();
            onEnd();
          }}
        >
          Basta
        </button>
      </div>
      <Progress value={REVIEW_MS - left} max={REVIEW_MS} size="thin" />
      <div className="card flash" onClick={() => setShow(true)}>
        <p>{card.front}</p>
        {show ? <p className="answer">{card.back}</p> : <p className="tiny">Pensa alla risposta, poi tocca</p>}
      </div>
      {show ? (
        <div className="grades">
          <button className="btn danger" onClick={() => grade(1)}>Non<br />ricordo</button>
          <button className="btn" onClick={() => grade(3)}>Difficile</button>
          <button className="btn" onClick={() => grade(4)}>Bene</button>
          <button className="btn field" onClick={() => grade(5)}>Facile</button>
        </div>
      ) : (
        <button className="btn primary block" onClick={() => setShow(true)}>Mostra la risposta</button>
      )}
    </div>
  );
}

/* ——— Quiz ——— */

const Q_SECONDS = 54;
const SIM_QUESTIONS = 50;
const SIM_SECONDS = 45 * 60;

type QuizConfig = { mode: "allenamento" | "simulazione" | "partita"; questions: Question[]; unit?: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function bossConfig(unit: number): QuizConfig {
  return { mode: "partita", unit, questions: shuffle(pickQuestions(getState(), BOSS_QUESTIONS, today(), { unit })) };
}

function Quiz({ intent, onStarted }: { intent?: Intent | null; onStarted?: () => void }) {
  const s = useStore();
  const [config, setConfig] = useState<QuizConfig | null>(() => {
    if (intent?.kind === "boss") return bossConfig(intent.unit);
    if (intent?.kind === "quiz") return { mode: "allenamento", questions: pickQuestions(getState(), 10, today()) };
    return null;
  });
  useEffect(() => {
    if (intent?.kind === "boss" || intent?.kind === "quiz") onStarted?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [unit, setUnit] = useState<number | "all">("all");
  const questions = useMemo(() => allQuestions(s), [s]);
  const units = useMemo(() => [...new Set(questions.map((q) => q.unit).filter((u): u is number => u != null))].sort((a, b) => a - b), [questions]);
  const pool = unit === "all" ? questions : questions.filter((q) => q.unit === unit);
  const bosses = bossStatus(s);
  const weak = weakCount(s);

  if (config) return <QuizRun config={config} onEnd={() => setConfig(null)} />;

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Allenamento</h2>
        <p className="small muted">10 domande, {Q_SECONDS} secondi l'una. L'app sceglie prima quelle che sbagli e mescola le unità.</p>
        <label className="field">
          Unità
          <select value={unit} onChange={(e) => setUnit(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">Tutte, mescolate ({questions.length} domande)</option>
            {units.map((u) => (
              <option key={u} value={u}>Unità {u} ({questions.filter((q) => q.unit === u).length})</option>
            ))}
          </select>
        </label>
        <button
          className="btn primary block"
          disabled={pool.length === 0}
          onClick={() => setConfig({ mode: "allenamento", questions: pickQuestions(s, 10, today(), unit === "all" ? {} : { unit }) })}
        >
          Inizia
        </button>
        {weak > 0 && <p className="tiny">{weak} domande sbagliate l'ultima volta: torneranno finché non le azzecchi.</p>}
      </div>
      <div className="card stack">
        <h2>Partite di fine unità</h2>
        <p className="small muted">{BOSS_QUESTIONS} domande sull'unità: con {BOSS_TO_WIN} giuste la vinci. Si sbloccano quando hai finito tutte le presentazioni dell'unità.</p>
        <ul className="plan-list">
          {bosses
            .filter((b) => b.questions > 0 || b.state !== "bloccata")
            .map((b) => (
              <li key={b.unit}>
                <span className="grow small">
                  <b>Unità {b.unit}</b> · {b.title}
                  {b.state === "bloccata" && b.missing.length > 0 && <span className="tiny" style={{ display: "block" }}>Mancano: {b.missing.join(", ")}</span>}
                  {b.best != null && <span className="tiny" style={{ display: "block" }}>Record: {b.best}/{BOSS_QUESTIONS}</span>}
                </span>
                {b.state === "vinta" && <span className="pill gold">🏆 vinta</span>}
                {b.state === "pronta" && <button className="btn sm primary" onClick={() => setConfig(bossConfig(b.unit))}>Gioca</button>}
                {b.state === "bloccata" && <span className="pill">🔒</span>}
              </li>
            ))}
        </ul>
      </div>
      <div className="card stack">
        <h2>Simulazione esame</h2>
        <p className="small muted">
          {SIM_QUESTIONS} domande in 45 minuti, come il vero MCQ. Niente risposte durante: le vedi alla fine.
          {questions.length < SIM_QUESTIONS && ` Per ora ci sono ${questions.length} domande: la simulazione usa quelle, con il tempo in proporzione.`}
        </p>
        <button className="btn block" disabled={questions.length === 0} onClick={() => setConfig({ mode: "simulazione", questions: shuffle(questions).slice(0, SIM_QUESTIONS) })}>
          Inizia la simulazione
        </button>
      </div>
      {s.quizResults.length > 0 && (
        <div className="card">
          <h2>Risultati</h2>
          <ul className="plan-list">
            {s.quizResults.slice(0, 8).map((r) => (
              <li key={r.id}>
                <span className="d">{shortDate(r.date)}</span>
                <span className="grow small">{r.mode === "simulazione" ? "Simulazione" : "Allenamento"}</span>
                <span className={`pill ${r.correct / r.total >= 0.7 ? "green" : r.correct / r.total >= 0.5 ? "gold" : "red"}`}>
                  {r.correct}/{r.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="tiny">Ogni lezione nuova porta le sue domande.</p>
    </div>
  );
}

function QuizRun({ config, onEnd }: { config: QuizConfig; onEnd: () => void }) {
  const sim = config.mode === "simulazione";
  const boss = config.mode === "partita";
  const blind = sim || boss; // niente risposte durante: come all'esame
  const qs = config.questions;
  const totalMs = (sim ? Math.round((SIM_SECONDS * qs.length) / SIM_QUESTIONS) : Q_SECONDS) * 1000;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => qs.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [clockStart, setClockStart] = useState(() => Date.now());
  const [quizStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const q = qs[i];
  const left = totalMs - (now - clockStart);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const end = (final: (number | null)[]) => {
    setDone(true);
    const correct = final.filter((a, k) => a === qs[k]!.answer).length;
    if (blind) final.forEach((a, k) => a != null && recordAnswer(qs[k]!.id, a === qs[k]!.answer));
    if (boss && config.unit != null) saveBossResult(config.unit, correct);
    else saveQuizResult({ mode: config.mode === "simulazione" ? "simulazione" : "allenamento", total: qs.length, correct, seconds: Math.round((Date.now() - quizStart) / 1000) });
  };

  const next = (final = answers) => {
    setRevealed(false);
    if (i + 1 >= qs.length) end(final);
    else {
      setI(i + 1);
      if (!sim) setClockStart(Date.now());
    }
  };

  useEffect(() => {
    if (done || left > 0) return;
    if (sim) end(answers);
    else if (boss) next(answers); // tempo scaduto: la domanda resta senza risposta
    else if (!revealed) {
      recordAnswer(q!.id, false);
      setRevealed(true); // tempo scaduto: mostra la risposta
    }
  });

  if (done) {
    const correct = answers.filter((a, k) => a === qs[k]!.answer).length;
    const wrong = qs.map((qq, k) => ({ qq, a: answers[k] })).filter((x) => x.a !== x.qq.answer);
    return (
      <div className="stack">
        <div className="card stack center pop">
          {boss && <p className="trophy">{correct >= BOSS_TO_WIN ? "🏆" : "⚽"}</p>}
          <p className="big-num">{correct}/{qs.length}</p>
          <p className="muted">
            {boss
              ? correct >= BOSS_TO_WIN
                ? `Unità ${config.unit} vinta!`
                : `Ne servivano ${BOSS_TO_WIN}. Ripassa gli errori qui sotto e gioca la rivincita.`
              : `${Math.round((correct / qs.length) * 100)}% giuste`}
          </p>
          <button className="btn primary block" onClick={onEnd}>Chiudi</button>
        </div>
        {wrong.length > 0 && (
          <div className="card stack">
            <h2>Da rivedere</h2>
            {wrong.map(({ qq, a }) => (
              <div key={qq.id} className="stack" style={{ gap: 4, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <p className="small" style={{ fontWeight: 700 }}>{qq.question}</p>
                {a != null && <p className="small" style={{ color: "var(--alarm)" }}>Tua: {qq.options[a]}</p>}
                <p className="small" style={{ color: "var(--field)" }}>Giusta: {qq.options[qq.answer]}</p>
                {qq.explanation && <p className="tiny">{qq.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!q) return null;
  const chosen = answers[i];

  return (
    <div className="stack">
      <div className="spread">
        <span className="small muted num">Domanda {i + 1} di {qs.length}</span>
        <span className={`pill num ${left < 10_000 ? "red" : ""}`}>{formatClock(left)}</span>
      </div>
      <div className="timer-bar"><span style={{ width: `${Math.max(0, (left / totalMs) * 100)}%` }} /></div>
      <div className="card"><p style={{ fontWeight: 700, fontSize: 19 }}>{q.question}</p></div>
      <div className="stack" style={{ gap: 8 }}>
        {q.options.map((o, k) => {
          const state = revealed ? (k === q.answer ? "right" : k === chosen ? "wrong" : "") : chosen === k ? "right" : "";
          return (
            <button
              key={k}
              className={`btn option ${state}`}
              disabled={revealed}
              onClick={() => {
                const nextAnswers = answers.map((a, n) => (n === i ? k : a));
                setAnswers(nextAnswers);
                if (blind) next(nextAnswers);
                else {
                  recordAnswer(q.id, k === q.answer);
                  setRevealed(true);
                }
              }}
            >
              <span className="letter">{"ABCD"[k]}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="card soft stack fade-in">
          <p style={{ fontWeight: 700, color: chosen === q.answer ? "var(--field)" : "var(--alarm)" }}>
            {chosen === q.answer ? "Giusta." : chosen == null ? "Tempo scaduto." : "Sbagliata."}
          </p>
          {q.explanation && <p className="small muted">{q.explanation}</p>}
          <button className="btn primary block" onClick={() => next()}>{i + 1 >= qs.length ? "Vedi il risultato" : "Avanti"}</button>
        </div>
      )}
      <button
        className="link-btn"
        onClick={() => {
          if (confirm(blind ? "Chiudere? Conta come consegnata." : "Chiudere il quiz?")) end(answers);
        }}
      >
        {blind ? "Consegna adesso" : "Chiudi"}
      </button>
    </div>
  );
}

/* ——— Spiegamelo semplice ——— */

function Explanations() {
  const s = useStore();
  const [editing, setEditing] = useState<Partial<Explanation> | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const titled = (id?: string) => s.presentations.find((p) => p.id === id);

  if (editing) {
    return (
      <div className="card stack fade-in">
        <h2>{editing.id ? "Modifica" : "Nuova spiegazione"}</h2>
        <label className="field">Concetto<input type="text" placeholder="es. Rate coding" value={editing.concept ?? ""} onChange={(e) => setEditing({ ...editing, concept: e.target.value })} /></label>
        <label className="field">Detto semplice<textarea placeholder="Cos'è, in una o due frasi." value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} /></label>
        <label className="field">Paragone da campo o palestra<textarea placeholder="È come quando…" value={editing.analogy ?? ""} onChange={(e) => setEditing({ ...editing, analogy: e.target.value })} /></label>
        <button
          className="btn block"
          disabled={!editing.concept?.trim() || busy}
          onClick={async () => {
            setBusy(true);
            setAiError(null);
            const lesson = allLessons(s).find((l) => `p-${l.code}` === editing.presentationId);
            const r = await aiPost<Paragone>("/api/paragone", { concept: editing.concept, context: lesson ? lesson.parts.map((x) => x.narration).join("\n").slice(0, 4000) : "" });
            setBusy(false);
            if (!r.ok) return setAiError(r.error);
            setEditing({ ...editing, text: r.data.simple, analogy: r.data.analogy + (r.data.remember ? `\nDa ricordare: ${r.data.remember}` : "") });
          }}
        >
          {busy ? "Penso a un esempio…" : "✨ Scrivilo tu per me"}
        </button>
        {aiError && <p className="tiny" style={{ color: "var(--alarm)" }}>{aiError}</p>}
        <label className="field">
          Presentazione
          <select value={editing.presentationId ?? ""} onChange={(e) => setEditing({ ...editing, presentationId: e.target.value || undefined })}>
            <option value="">—</option>
            {s.presentations.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
          </select>
        </label>
        <button
          className="btn primary block"
          disabled={!editing.concept?.trim()}
          onClick={() => {
            saveExplanation({ id: editing.id, concept: editing.concept!.trim(), text: editing.text?.trim() ?? "", analogy: editing.analogy?.trim() ?? "", presentationId: editing.presentationId });
            setEditing(null);
          }}
        >
          Salva
        </button>
        {editing.id && <button className="btn danger block" onClick={() => { deleteExplanation(editing.id!); setEditing(null); }}>Elimina</button>}
        <button className="link-btn" onClick={() => setEditing(null)}>Annulla</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <button className="btn primary block" onClick={() => setEditing({})}><Icon.plus /> Nuova spiegazione</button>
      {s.explanations.length === 0 && <p className="tiny center">Un concetto, una frase semplice, un paragone col campo. Lo scrivi o lo incolli tu.</p>}
      {s.explanations.map((e) => (
        <button key={e.id} className="card stack" style={{ textAlign: "left", gap: 6 }} onClick={() => setEditing(e)}>
          <div className="spread">
            <h2>{e.concept}</h2>
            {titled(e.presentationId) && <span className="pill">{titled(e.presentationId)!.code}</span>}
          </div>
          {e.text && <p className="small">{e.text}</p>}
          {e.analogy && <p className="small" style={{ color: "var(--brand)" }}>⚽ {e.analogy}</p>}
        </button>
      ))}
    </div>
  );
}

/* ——— Esercizi pratici delle lezioni ——— */

function Exercises({ code }: { code?: string }) {
  const s = useStore();
  const lessons = allLessons(s).sort((a, b) => a.code.localeCompare(b.code, "it", { numeric: true }));
  const [open, setOpen] = useState<string | null>(code ? `${code}#0` : null);
  const [answer, setAnswer] = useState("");
  const [shown, setShown] = useState(false);

  if (lessons.length === 0) return <p className="tiny center">Gli esercizi arrivano con le lezioni.</p>;

  if (open) {
    const [c, i] = open.split("#");
    const lesson = lessons.find((l) => l.code === c);
    const ex = lesson?.exercises[Number(i)];
    if (lesson && ex) {
      return (
        <div className="card stack fade-in">
          <span className="tag" style={{ alignSelf: "flex-start" }}>{lesson.code} · Esercizio</span>
          <h2>{ex.title}</h2>
          <p>{ex.prompt}</p>
          <textarea aria-label="La tua risposta" placeholder="Scrivi la tua risposta, anche a punti." value={answer} onChange={(e) => setAnswer(e.target.value)} />
          {shown ? (
            <div className="card soft stack fade-in">
              <p className="small" style={{ fontWeight: 750 }}>Risposta di riferimento</p>
              <p className="small">{ex.modelAnswer}</p>
              <button
                className="btn primary block"
                onClick={() => {
                  markExercise(open);
                  setOpen(null);
                  setAnswer("");
                  setShown(false);
                }}
              >
                Fatto
              </button>
            </div>
          ) : (
            <button className="btn primary block" onClick={() => setShown(true)}>Confronta con la risposta</button>
          )}
          <button className="link-btn" onClick={() => setOpen(null)}>Indietro</button>
        </div>
      );
    }
  }

  return (
    <div className="stack">
      {lessons.map((l) => (
        <div key={l.code} className="card">
          <h2>{l.code} · {l.title}</h2>
          <ul className="plan-list">
            {l.exercises.map((e, i) => {
              const id = `${l.code}#${i}`;
              return (
                <li key={id}>
                  <span className="grow small">{e.title}</span>
                  {s.exercisesDone[id] ? <span className="pill green">fatto</span> : <button className="btn sm" onClick={() => setOpen(id)}>Apri</button>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
