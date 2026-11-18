import { useEffect, useRef, useState } from "react";
import { addDays, dayMonth, shortDate, today } from "../lib/dates";
import { buildPlan, currentItem, daySaved, isDone } from "../lib/plan";
import {
  addCard,
  addMinute,
  cancelStep,
  ensurePresentation,
  finishStep,
  getState,
  saveRecall,
  startStep,
  togglePause,
  toggleStepDone,
  useStore,
} from "../lib/store";
import type { Presentation } from "../lib/types";
import { Box, Icon, Progress, Sheet, beep, formatClock, unlockAudio } from "../ui";

type Phase = "idle" | "recall" | "again" | "finished";

const COURSE_URL = "https://online.setantacollege.com/my/";

export function Today({ goTo }: { goTo: (tab: "ripasso" | "situazione") => void }) {
  const s = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastPid, setLastPid] = useState<string | null>(null);
  const now = today();

  if (s.timer) {
    const p = s.presentations.find((x) => x.id === s.timer!.presentationId);
    if (p) {
      return (
        <Session
          p={p}
          onDone={() => {
            finishStep();
            const after = getState().presentations.find((x) => x.id === p.id)!;
            const done = after.steps.filter((x) => x.done).length;
            setLastPid(p.id);
            if (isDone(after)) setPhase(done % 3 === 0 ? "recall" : "finished");
            else setPhase(done % 3 === 0 ? "recall" : "again");
          }}
        />
      );
    }
  }

  const last = lastPid ? s.presentations.find((x) => x.id === lastPid) : undefined;

  if (phase === "recall" && last) {
    return <RecallStep p={last} onNext={() => setPhase(isDone(last) ? "finished" : "again")} />;
  }

  if (phase === "again" && last) {
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
              startStep(last.id);
              setPhase("idle");
            }}
          >
            Sì
          </button>
          <button className="link-btn" onClick={() => setPhase("idle")}>Basta per oggi</button>
        </div>
        <Progress value={last.steps.filter((x) => x.done).length} max={last.steps.length} size="big" />
        <p className="tiny">{last.code} · {last.steps.filter((x) => x.done).length} di {last.steps.length} parti</p>
      </div>
    );
  }

  if (phase === "finished" && last) {
    return <Finished p={last} onReview={() => goTo("ripasso")} onClose={() => setPhase("idle")} />;
  }

  // ——— Schermata iniziale: un solo bottone ———
  const item = currentItem(s, now);
  const saved = daySaved(s, now);
  const finishedToday = s.presentations.find((p) => p.doneAt === now && isDone(p));

  const start = () => {
    unlockAudio();
    if (!item) {
      goTo("ripasso");
      return;
    }
    const id = item.kind === "real" ? item.presentation.id : ensurePresentation(item.code, item.title);
    startStep(id);
  };

  if (!item) {
    const next = s.units.filter((u) => u.release > now).sort((a, b) => a.release.localeCompare(b.release))[0];
    return (
      <div className="hero fade-in">
        <button className="go calm" onClick={start}>
          <Icon.play />
          <span>Solo 2 minuti<br />di ripasso</span>
        </button>
        <p className="muted">{next ? `Nuova unità il ${dayMonth(next.release)}.` : "Hai finito tutte le presentazioni."}</p>
      </div>
    );
  }

  const p = item.kind === "real" ? item.presentation : null;
  const doneSteps = p ? p.steps.filter((x) => x.done).length : 0;
  const total = p ? p.steps.length : 10;
  const tomorrow = buildPlan(s, now).find((d) => d.date === addDays(now, 1));

  return (
    <div className="hero fade-in">
      {saved && <div className="saved"><Icon.check /> Giornata salvata</div>}
      <button className="go" onClick={start} aria-label="Solo 2 minuti: parti adesso">
        <Icon.play />
        <span>{saved ? <>Ancora<br />2 minuti</> : <>Solo<br />2 minuti</>}</span>
      </button>
      <div className="stack" style={{ width: "100%", gap: 8 }}>
        <Progress value={doneSteps} max={total} size="big" />
        <p className="tiny">
          {finishedToday ? `${finishedToday.code} finita oggi. Questa è la prossima: ` : ""}
          {p ? `${p.code} · ${p.title}` : item.kind === "placeholder" ? `${item.code} · ${item.title}` : ""}
        </p>
        {finishedToday && tomorrow?.kind === "study" && <p className="tiny">Domani da piano: {shortDate(tomorrow.date)}</p>}
      </div>
    </div>
  );
}

function Session({ p, onDone }: { p: Presentation; onDone: () => void }) {
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

  // Lo schermo resta acceso durante il timer, dove il telefono lo permette.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  return (
    <div className="stack fade-in" style={{ gap: 18 }}>
      <div className="session-head">
        <button
          className="icon-btn"
          aria-label="Chiudi senza salvare questa parte"
          onClick={() => {
            if (confirm("Chiudere? Questa parte non viene segnata.")) cancelStep();
          }}
        >
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
        <a className="small" href={COURSE_URL} target="_blank" rel="noreferrer">Apri il corso e premi play <Icon.external /></a>
      </div>

      <p className={`clock ${paused ? "paused" : ""}`} aria-live="off">{formatClock(left)}</p>

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

function RecallStep({ p, onNext }: { p: Presentation; onNext: () => void }) {
  const done = p.steps.filter((x) => x.done).length;
  const [text, setText] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [showCard, setShowCard] = useState(false);
  const last3 = p.steps.filter((x) => x.done).slice(-3);

  return (
    <div className="stack fade-in" style={{ gap: 16, paddingTop: 12 }}>
      <div className="saved pop" style={{ alignSelf: "flex-start" }}><Icon.check /> {done} parti fatte</div>
      <h1 className="page-title">Cosa ricordi di queste parti?</h1>
      <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
        {last3.map((x) => <li key={x.id}>{x.title}</li>)}
      </ul>
      <textarea
        aria-label="Cosa ricordi"
        placeholder="Due righe, con parole tue. Anche un paragone col campo."
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      {showCard ? (
        <div className="card stack">
          <label className="field">Domanda<input type="text" value={front} onChange={(e) => setFront(e.target.value)} /></label>
          <label className="field">Risposta<input type="text" value={back} onChange={(e) => setBack(e.target.value)} /></label>
        </div>
      ) : (
        <button className="btn" onClick={() => setShowCard(true)}><Icon.plus /> Crea anche una flashcard</button>
      )}
      <button
        className="btn primary huge block"
        onClick={() => {
          if (text.trim()) saveRecall(p.id, done, text.trim());
          if (front.trim() && back.trim()) addCard(front.trim(), back.trim(), p.id);
          onNext();
        }}
      >
        Avanti
      </button>
      <button className="link-btn" onClick={onNext}>Salta</button>
    </div>
  );
}

function Finished({ p, onReview, onClose }: { p: Presentation; onReview: () => void; onClose: () => void }) {
  return (
    <div className="hero fade-in">
      <div className="saved pop"><Icon.check /> {p.code} finita</div>
      <p className="page-title" style={{ fontSize: 36 }}>Presentazione chiusa.</p>
      <p className="muted">{p.title}</p>
      <div className="stack" style={{ width: "100%" }}>
        <button className="btn primary block" onClick={onReview}>Ripasso 10 minuti</button>
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
