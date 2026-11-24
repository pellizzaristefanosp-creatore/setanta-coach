import { useEffect, useMemo, useRef, useState } from "react";
import { Enrica, Tonino as Adamo } from "../Characters";
import { Seal } from "../beeFx";
import { dialogueFor, pickTurnLine, WHO, type DLine } from "../lib/dialogue";
import type { LessonPack } from "../lib/lesson";
import { comparePresentationCode } from "../lib/plan";
import { cancelStep, recordAnswer, savePosition, setState, startReplay, startStepAt, useStore } from "../lib/store";
import { dialogueVoices, speakLine, ttsAvailable, voicesReady, type DialogueVoices } from "../lib/tts";
import { turnsFor, type Turn } from "../lib/turns";
import type { Presentation } from "../lib/types";
import { Icon, Progress, Sheet } from "../ui";
import { CardSheet } from "./Today";

type Science = { text: string; source: string; url: string };
export type BeePart = LessonPack["parts"][number] & { science?: Science; tip?: string };

const RATES = [0.9, 1, 1.15, 1.3];

function useAfter(active: boolean, ms: number, fn: () => void) {
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; });
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => cb.current(), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
}

/**
 * La lezione come una chiacchierata: Frate Adamo spiega, Enrica chiede. Due voci del telefono (gratis, anche
 * senza rete), le battute compaiono come in una chat e la parola detta si accende. Si ricorda la battuta a cui eri:
 * se chiudi l'app, rientrando riparti da lì. Finito l'ascolto si va avanti da soli.
 */
export function DialogueSession({ p, lesson, index, onDone }: { p: Presentation; lesson: LessonPack; index: number; onDone: () => void }) {
  const s = useStore();
  const part = lesson.parts[index] as BeePart;
  const lines: DLine[] = useMemo(() => dialogueFor(lesson.code, index) ?? [{ who: "M", text: part.narration }], [lesson.code, index, part.narration]);
  const replay = !!s.timer?.replay;
  const returnTo = s.timer?.returnTo;
  const saved = Math.min(lines.length - 1, s.timer?.pos ?? 0);
  const [cur, setCur] = useState(saved);
  const [word, setWord] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [card, setCard] = useState(false);
  const [autoOn, setAutoOn] = useState(true);
  const [showSci, setShowSci] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const voices = useRef<DialogueVoices | null>(null);
  const rate = RATES.includes(s.settings.voiceRate) ? s.settings.voiceRate : 1;
  const doneCount = p.steps.filter((x) => x.done).length;

  // "Tocca a te": a volte, dopo una domanda di Frate Adamo, la voce si ferma e rispondi tu
  const [turn] = useState<Turn | null>(() => (replay ? null : pickTurnLine(turnsFor(lesson.code, index), lines, Math.random())));
  const [turnState, setTurnState] = useState<"attesa" | "domanda" | "fatto">(() => (turn && saved > turn.line ? "fatto" : "attesa"));
  const turnRef = useRef(turnState);
  turnRef.current = turnState;

  const halt = () => {
    stop.current?.();
    stop.current = null;
    setPlaying(false);
  };

  const play = (from: number) => {
    halt();
    if (!voices.current) voices.current = dialogueVoices();
    setEnded(false);
    setPlaying(true);
    const say = (i: number) => {
      if (i >= lines.length) {
        setPlaying(false);
        setEnded(true);
        setWord(-1);
        return;
      }
      setCur(i);
      setWord(-1);
      savePosition(i);
      const l = lines[i]!;
      stop.current = speakLine(l.text, l.who === "M" ? voices.current!.m : voices.current!.e, rate, {
        onWord: setWord,
        onEnd: () => {
          if (turn && i === turn.line && turnRef.current === "attesa") {
            setPlaying(false);
            navigator.vibrate?.(30);
            setTurnState("domanda");
            return;
          }
          say(i + 1);
        },
      });
    };
    say(from);
  };

  // parte da sola se la sessione nasce da un tocco; rientrando nell'app a metà aspetta "Riprendi"
  const resumed = saved > 0;
  useEffect(() => {
    let alive = true;
    if (!resumed && ttsAvailable()) void voicesReady().then(() => alive && play(0));
    return () => {
      alive = false;
      stop.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // lo schermo resta acceso durante la lezione
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  // la chat segue la battuta detta
  const chat = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = chat.current, item = box?.querySelector<HTMLElement>(`[data-i="${cur}"]`);
    if (box && item) box.scrollTo({ top: item.offsetTop - box.clientHeight / 2 + item.clientHeight / 2, behavior: "smooth" });
  }, [cur]);

  // ← Precedente / Prossima →, anche tra una lezione e l'altra
  const ordered = [...s.presentations].sort((a, b) => comparePresentationCode(a.code, b.code));
  const pi = ordered.findIndex((x) => x.id === p.id);
  const openPart = (pp: Presentation, stepIdx: number) => {
    const st = pp.steps[stepIdx];
    if (!st) return;
    if (st.done) startReplay(pp.id, st.id, returnTo ?? (replay ? undefined : s.timer?.stepId));
    else startStepAt(pp.id, st.id);
  };
  const goPrev = () => {
    halt();
    if (index > 0) return openPart(p, index - 1);
    const prev = ordered[pi - 1];
    if (prev) openPart(prev, prev.steps.length - 1);
  };
  const goNext = () => {
    halt();
    if (index + 1 < p.steps.length) return openPart(p, index + 1);
    const nx = ordered[pi + 1];
    if (nx) openPart(nx, Math.max(0, nx.steps.findIndex((x) => !x.done)));
  };
  const close = () => {
    halt();
    if (replay && returnTo) startStepAt(p.id, returnTo);
    else if (replay || confirm("Chiudere? La lezione resta qui: riparti da questo punto.")) cancelStep();
  };

  useAfter(ended && !replay && autoOn && !card && turnState !== "domanda", 2600, () => { halt(); onDone(); });
  const progress = lines.length > 1 ? (ended ? 1 : cur / (lines.length - 1)) : ended ? 1 : 0;
  const talking = playing ? lines[cur]?.who : undefined;
  const shownPoints = ended ? part.keyPoints.length : Math.max(1, Math.ceil(progress * part.keyPoints.length));

  return (
    <div className="stack fade-in" style={{ gap: 14 }}>
      <div className="session-head">
        <button className="icon-btn" aria-label={replay ? "Chiudi il riascolto" : "Chiudi"} onClick={close}><Icon.close /></button>
        <div className="grow">
          <p className="tiny">{p.code} · {lesson.title}</p>
          <p className="small muted num">{replay ? `Riascolto · parte ${index + 1} di ${p.steps.length}` : `Parte ${index + 1} di ${p.steps.length}`}</p>
        </div>
        <button className="btn sm" onClick={() => setCard(true)}><Icon.plus /> Flashcard</button>
      </div>

      <Progress value={doneCount} max={p.steps.length} size="big" />

      <div className="duo" aria-hidden="true">
        <div className={`duo-who ${talking === "M" ? "on" : ""}`}><Adamo talking={talking === "M"} /><span>Frate Adamo</span></div>
        <div className="duo-title">
          <p className="step-title">{part.title}</p>
        </div>
        <div className={`duo-who ${talking === "E" ? "on" : ""}`}><Enrica talking={talking === "E"} /><span>Enrica</span></div>
      </div>

      <div className="chat" ref={chat} aria-label="La chiacchierata" aria-live="polite">
        {lines.map((l, i) => {
          if (i > cur && !ended) return null;
          const now = i === cur && playing;
          return (
            <button key={i} data-i={i} className={`bubble ${l.who === "M" ? "prof" : "ste"} ${now ? "now" : ""} pop`} onClick={() => play(i)}>
              <span className="who">{WHO[l.who]}</span>
              <span className="text">{now && word >= 0 ? <Lit text={l.text} at={word} /> : l.text}</span>
            </button>
          );
        })}
      </div>

      <div className="timer-bar" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>

      <div className="row">
        <button className="btn primary grow" onClick={() => (playing ? halt() : play(ended ? 0 : cur))}>
          {playing ? <><Icon.pause /> Pausa</> : <><Icon.play /> {ended ? "Riascolta" : resumed || cur > 0 ? "Riprendi" : "Ascolta"}</>}
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
      </div>
      {resumed && !playing && !ended && cur > 0 && <p className="tiny center muted">Eri arrivata qui: tocca «Riprendi» e si continua da questa frase.</p>}

      <div className="card lesson-card stack" style={{ gap: 10 }}>
        <span className="listen-label">🍯 Da ricordare</span>
        <ul className="keypoints">
          {part.keyPoints.slice(0, shownPoints).map((k, i) => <li key={i} className="pop">{k}</li>)}
        </ul>
        {ended && <p className="analogy pop">🏡 {part.analogy}</p>}
      </div>

      {(ended || showSci) && part.tip && (
        <div className="card tip-card pop"><span className="listen-label">🐝 Il consiglio di Frate Adamo</span><p className="small">{part.tip}</p></div>
      )}
      {part.science && (ended || showSci ? (
        <div className="card science-card pop">
          <div className="science-head"><Seal /><span className="listen-label">Cosa dice la scienza</span></div>
          <p className="small">{part.science.text}</p>
          <a className="tiny source" href={part.science.url} target="_blank" rel="noreferrer">Fonte: {part.science.source} ↗</a>
        </div>
      ) : (
        <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowSci(true)}>🔬 Cosa dice la scienza</button>
      ))}

      <div className="session-foot three">
        <button className="btn" onClick={goPrev}>← Precedente</button>
        <button className={`btn field ${ended ? "pulse" : ""}`} onClick={() => { halt(); onDone(); }}>
          <Icon.check /> {replay && returnTo ? "Torna" : "Fatto"}
        </button>
        <button className="btn" onClick={goNext}>Prossima →</button>
      </div>
      {ended && !replay && autoOn && <p className="tiny center muted">Finita: tra un attimo la domanda… <button className="link-btn" onClick={() => setAutoOn(false)}>aspetta</button></p>}
      {card && <CardSheet presentationId={p.id} onClose={() => setCard(false)} />}
      {turn && turnState === "domanda" && (
        <TurnSheet
          code={lesson.code}
          turn={turn}
          rate={rate}
          voices={voices.current}
          onDone={() => {
            setTurnState("fatto");
            turnRef.current = "fatto";
            play(turn.line + 1);
          }}
        />
      )}
    </div>
  );
}

/** La parola che la voce sta dicendo, accesa. */
function Lit({ text, at }: { text: string; at: number }) {
  const end = text.slice(at).search(/\s/);
  const stop = end < 0 ? text.length : at + end;
  return <>{text.slice(0, at)}<mark className="w-now">{text.slice(at, stop)}</mark>{text.slice(stop)}</>;
}

const TONINO_SAYS = {
  giusto: ["Brava Enrica, proprio così!", "Esatto. Hai l'occhio dell'apicoltrice.", "Giusto! Vedi che ci arrivi?", "Perfetto, è proprio questo."],
  sbagliato: ["Quasi. Ragioniamoci insieme.", "Ci sei vicina, guarda bene qui.", "Tranquilla, è l'errore più comune.", "Non proprio, ma ci arriviamo subito."],
} as const;

function TurnSheet({ code, turn, rate, voices, onDone }: { code: string; turn: Turn; rate: number; voices: DialogueVoices | null; onDone: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [say, setSay] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  const right = chosen === turn.answer;
  const finish = () => {
    stop.current?.();
    onDone();
  };
  return (
    <Sheet label="Tocca a te" onClose={finish}>
      <span className="tag">🎯 Tocca a te</span>
      <p className="tiny">Frate Adamo ti chiede:</p>
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
                const n = Math.floor(Math.random() * 4);
                setSay(n);
                if (voices) stop.current = speakLine(TONINO_SAYS[k === turn.answer ? "giusto" : "sbagliato"][n] ?? "", voices.m, rate, { onEnd: () => {} });
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
            <span className="turn-who">Frate Adamo</span> {TONINO_SAYS[right ? "giusto" : "sbagliato"][say]}
          </p>
          <p className="small muted">{turn.why}</p>
          <button className="btn primary block" onClick={finish}><Icon.play /> Senti cosa risponde Enrica</button>
        </div>
      )}
      {chosen == null && <button className="btn ghost sm" onClick={finish}>Salta questa domanda</button>}
    </Sheet>
  );
}
