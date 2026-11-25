import { useEffect, useMemo, useRef, useState } from "react";
import { Seal } from "../beeFx";
import type { AudioPart } from "../lib/audio";
import { drawScene, SCENE_RATIO } from "../lib/beeScene";
import { pickTurnLine, WHO, type DLine } from "../lib/dialogue";
import type { LessonPack } from "../lib/lesson";
import { comparePresentationCode } from "../lib/plan";
import { cancelStep, savePositionTime, setState, startReplay, startStepAt, useStore } from "../lib/store";
import { dialogueVoices } from "../lib/tts";
import { turnsFor, type Turn } from "../lib/turns";
import type { Presentation } from "../lib/types";
import { Icon, Progress } from "../ui";
import { type BeePart, TurnSheet, useAfter } from "./DialogueSession";
import { CardSheet } from "./Today";
import { PeekBar } from "../PeekBar";

const RATES = [0.9, 1, 1.15, 1.3];

/**
 * La puntata: audio con le voci di Giuliano ed Enrica e la scena animata disegnata dal telefono (prato, arnia,
 * personaggi che parlano, carte dei concetti). Sotto, la chiacchierata scritta con la parola detta accesa.
 * Si ricorda il secondo esatto: se chiudi l'app, rientrando riparti da lì.
 */
export function SceneSession({ p, lesson, index, audio, onDone }: { p: Presentation; lesson: LessonPack; index: number; audio: AudioPart; onDone: () => void }) {
  const s = useStore();
  const part = lesson.parts[index] as BeePart;
  const el = useRef<HTMLAudioElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const replay = !!s.timer?.replay;
  const returnTo = s.timer?.returnTo;
  const savedT = replay ? 0 : Math.min(audio.duration - 1, s.timer?.posT ?? 0);
  const [t, setT] = useState(savedT);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [card, setCard] = useState(false);
  const [autoOn, setAutoOn] = useState(true);
  const [showSci, setShowSci] = useState(false);
  const rate = RATES.includes(s.settings.voiceRate) ? s.settings.voiceRate : 1;
  const doneCount = p.steps.filter((x) => x.done).length;
  const lines = audio.lines;
  const dl: DLine[] = useMemo(() => lines.map((l) => ({ who: l.who === "E" ? "E" : "M", text: l.text })), [lines]);
  const cur = lines.reduce((k, l, i) => (t >= l.start - 0.05 ? i : k), -1);

  // "Tocca a te": a volte, dopo una domanda di Giuliano, l'audio si ferma e rispondi tu
  const [turn] = useState<Turn | null>(() => (replay ? null : pickTurnLine(turnsFor(lesson.code, index), dl, Math.random())));
  const turnAt = turn ? (lines[turn.line + 1]?.start ?? Infinity) - 0.15 : Infinity;
  const [turnState, setTurnState] = useState<"attesa" | "domanda" | "fatto">(() => (savedT > turnAt ? "fatto" : "attesa"));

  const ensureAnalyser = () => {
    if (analyser.current || !el.current) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(el.current);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      an.connect(ctx.destination);
      analyser.current = an;
      void ctx.resume();
    } catch {
      /* senza analizzatore la bocca si muove a ritmo */
    }
  };
  const play = () => {
    const a = el.current;
    if (!a) return;
    ensureAnalyser();
    if (ended) { a.currentTime = 0; setEnded(false); }
    a.playbackRate = rate;
    void a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };
  const pause = () => el.current?.pause();

  // parte da sola (la sessione nasce da un tocco); rientrando a metà aspetta "Riprendi"
  useEffect(() => {
    const a = el.current;
    if (!a) return;
    a.currentTime = savedT;
    if (savedT < 1) play();
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: `${p.code} · ${part.title}`, artist: "Giuliano ed Enrica", album: "L'Alveare di Enrica", artwork: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }] });
    return () => a.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // schermo acceso durante la lezione
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  // la scena: un fotogramma a ogni giro dello schermo
  useEffect(() => {
    let raf = 0, lastSave = 0;
    const buf = new Uint8Array(512);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const a = el.current, cv = canvas.current;
      if (a && cv) {
        const w = Math.round(cv.clientWidth * Math.min(2, devicePixelRatio || 1));
        if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * SCENE_RATIO); }
        let level = 0;
        if (!a.paused) {
          if (analyser.current) { analyser.current.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); level = Math.min(1, m / 50); }
          else level = 0.45 + 0.4 * Math.sin(performance.now() / 70);
        }
        const tt = a.currentTime;
        const ctx = cv.getContext("2d");
        if (ctx) drawScene(ctx, { lines, duration: audio.duration, t: reduce ? Math.floor(tt) : tt, level, title: `${lesson.code} · ${lesson.title}`, keyPoints: part.keyPoints, special: lesson.code === "1.1" && index === 0 ? "1.1/0" : undefined });
        setT((p) => (Math.abs(p - tt) > 0.12 ? tt : p));
        if (!replay && performance.now() - lastSave > 2000 && !a.paused) { lastSave = performance.now(); savePositionTime(tt); }
        if (turn && turnState === "attesa" && tt >= turnAt && tt < turnAt + 2 && !a.paused && document.visibilityState === "visible") { a.pause(); navigator.vibrate?.(30); setTurnState("domanda"); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, audio.duration, lesson.code, lesson.title, part.keyPoints, index, replay, turn, turnState, turnAt]);

  // la chat segue la battuta detta
  const chat = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = chat.current, item = box?.querySelector<HTMLElement>(`[data-i="${cur}"]`);
    if (box && item) box.scrollTo({ top: item.offsetTop - box.clientHeight / 2 + item.clientHeight / 2, behavior: "smooth" });
  }, [cur]);

  const ordered = [...s.presentations].sort((a, b) => comparePresentationCode(a.code, b.code));
  const pi = ordered.findIndex((x) => x.id === p.id);
  const openPart = (pp: Presentation, stepIdx: number) => {
    const st = pp.steps[stepIdx];
    if (!st) return;
    if (st.done) startReplay(pp.id, st.id, returnTo ?? (replay ? undefined : s.timer?.stepId));
    else startStepAt(pp.id, st.id, { peek: !!s.timer?.peek });
  };
  const goPrev = () => { pause(); if (index > 0) return openPart(p, index - 1); const prev = ordered[pi - 1]; if (prev) openPart(prev, prev.steps.length - 1); };
  const goNext = () => { pause(); if (index + 1 < p.steps.length) return openPart(p, index + 1); const nx = ordered[pi + 1]; if (nx) openPart(nx, Math.max(0, nx.steps.findIndex((x) => !x.done))); };
  const close = () => { pause(); if (replay && returnTo) startStepAt(p.id, returnTo); else if (replay || confirm("Chiudere? La lezione resta qui: riparti da questo punto.")) cancelStep(); };

  useAfter(ended && !replay && autoOn && !card && turnState !== "domanda", 2600, onDone);
  const progress = audio.duration > 0 ? Math.min(1, t / audio.duration) : 0;
  const shownPoints = ended ? part.keyPoints.length : Math.max(1, Math.ceil(progress * part.keyPoints.length));
  const resumed = savedT >= 1 && !playing && !ended;

  return (
    <div className="stack fade-in" style={{ gap: 14 }}>
      <audio ref={el} src={audio.src} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setEnded(true); }} />
      <div className="session-head">
        <button className="icon-btn" aria-label={replay ? "Chiudi il riascolto" : "Chiudi"} onClick={close}><Icon.close /></button>
        <div className="grow">
          <p className="tiny">{p.code} · {lesson.title}</p>
          <p className="small muted num">{replay ? `Riascolto · parte ${index + 1} di ${p.steps.length}` : `Parte ${index + 1} di ${p.steps.length}`} · {part.title}</p>
        </div>
        <button className="btn sm" onClick={() => setCard(true)}><Icon.plus /> Flashcard</button>
      </div>
      {s.timer?.peek && !s.timer.replay && <PeekBar />}

      <Progress value={doneCount} max={p.steps.length} size="big" />

      <div className="scene-wrap" onClick={() => (playing ? pause() : play())}>
        <canvas ref={canvas} className="scene-canvas" aria-label={`Scena animata: ${part.title}`} />
        {!playing && <span className="scene-play" aria-hidden="true"><Icon.play /></span>}
      </div>

      <div className="timer-bar" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>
      <div className="row">
        <button className="btn grow" aria-label="Indietro di 10 secondi" onClick={() => el.current && (el.current.currentTime = Math.max(0, el.current.currentTime - 10))}>−10 s</button>
        <button className="btn primary grow" onClick={() => (playing ? pause() : play())}>
          {playing ? <><Icon.pause /> Pausa</> : <><Icon.play /> {ended ? "Riascolta" : resumed || blocked || t > 0.5 ? "Riprendi" : "Ascolta"}</>}
        </button>
        <button className="btn" aria-label="Velocità" onClick={() => { const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1; setState((d) => void (d.settings.voiceRate = next)); if (el.current) el.current.playbackRate = next; }}>{rate}×</button>
      </div>
      {resumed && <p className="tiny center muted">Eri arrivata qui: tocca «Riprendi» e si continua da questo punto.</p>}

      <div className="chat" ref={chat} aria-label="La chiacchierata" aria-live="polite">
        {lines.map((l, i) => {
          if (i > cur && !ended) return null;
          const now = i === cur && playing;
          const end = lines[i + 1]?.start ?? audio.duration;
          const said = now ? Math.floor(l.text.length * Math.min(1, (t - l.start) / Math.max(0.3, end - l.start - 0.4))) : l.text.length;
          return (
            <button key={i} data-i={i} className={`bubble ${l.who === "E" ? "ste" : "prof"} ${now ? "now" : ""} pop`} onClick={() => { if (el.current) { el.current.currentTime = l.start; play(); } }}>
              <span className="who">{WHO[l.who === "E" ? "E" : "M"]}</span>
              <span className="text">{now ? <><span>{l.text.slice(0, said)}</span><span className="unsaid">{l.text.slice(said)}</span></> : l.text}</span>
            </button>
          );
        })}
      </div>

      <div className="card lesson-card stack" style={{ gap: 10 }}>
        <span className="listen-label">🍯 Da ricordare</span>
        <ul className="keypoints">{part.keyPoints.slice(0, shownPoints).map((k, i) => <li key={i} className="pop">{k}</li>)}</ul>
        {ended && <p className="analogy pop">🏡 {part.analogy}</p>}
      </div>
      {(ended || showSci) && part.tip && <div className="card tip-card pop"><span className="listen-label">🐝 Il consiglio di Giuliano</span><p className="small">{part.tip}</p></div>}
      {part.science && (ended || showSci ? (
        <div className="card science-card pop">
          <div className="science-head"><Seal /><span className="listen-label">Cosa dice la scienza</span></div>
          <p className="small">{part.science.text}</p>
          <a className="tiny source" href={part.science.url} target="_blank" rel="noreferrer">Fonte: {part.science.source} ↗</a>
        </div>
      ) : <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowSci(true)}>🔬 Cosa dice la scienza</button>)}

      <div className="session-foot three">
        <button className="btn" onClick={goPrev}>← Precedente</button>
        <button className={`btn field ${ended ? "pulse" : ""}`} onClick={() => { pause(); onDone(); }}><Icon.check /> {replay && returnTo ? "Torna" : "Fatto"}</button>
        <button className="btn" onClick={goNext}>Prossima →</button>
      </div>
      {ended && !replay && autoOn && <p className="tiny center muted">Finita: tra un attimo la domanda… <button className="link-btn" onClick={() => setAutoOn(false)}>aspetta</button></p>}
      {card && <CardSheet presentationId={p.id} onClose={() => setCard(false)} />}
      {turn && turnState === "domanda" && (
        <TurnSheet code={lesson.code} turn={turn} rate={rate} voices={dialogueVoices()} onDone={() => { setTurnState("fatto"); play(); }} />
      )}
    </div>
  );
}
