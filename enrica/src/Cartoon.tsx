import { useEffect, useRef, useState, type RefObject } from "react";
import { lineAt, type AudioPart } from "./lib/audio";
import { drawPerson, POSES2, mixPose2 } from "./lib/personaggi2";

/**
 * Cartone animato della lezione: il Prof (preparatore) e Ste (calciatore) in palestra, con la grafica nuova.
 * Usa l'audio già pronto: chi parla muove la bocca e gesticola, la frase va nel fumetto,
 * i punti chiave arrivano come cartelli. Niente video da scaricare: si disegna nel telefono.
 * Non collega l'audio al WebAudio, così a schermo bloccato l'ascolto continua.
 */
export function Cartoon({ audioRef, audio, keyPoints, analogy, title }: { audioRef: RefObject<HTMLAudioElement | null>; audio: AudioPart; keyPoints: string[]; analogy: string; title: string }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        setT(a.currentTime);
        setPlaying(!a.paused && !a.ended);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [audioRef]);

  const i = lineAt(audio.lines, t);
  const line = audio.lines[i];
  const next = audio.lines[i + 1];
  const lineEnd = next ? next.start : audio.duration;
  // Parla davvero solo dentro la durata stimata della battuta (le pause restano a bocca chiusa).
  const speakingWindow = Math.max(0.6, (lineEnd - (line?.start ?? 0)) - (next && line?.who === "M" && line.text.trim().endsWith("?") ? 1.2 : 0.35));
  const talking = playing && !!line && t - line.start < speakingWindow;
  const who = line?.who ?? "M";
  // Bocca: apertura che varia come una voce (somma di onde), chiusa sulle pause.
  const mouth = talking ? Math.max(0, 0.35 + 0.35 * Math.sin(t * 17) + 0.3 * Math.sin(t * 7.3 + 1)) : 0;
  const progress = audio.duration ? t / audio.duration : 0;
  const shownPoints = Math.min(keyPoints.length, Math.floor(progress * (keyPoints.length + 1)));
  const ended = audio.duration > 0 && t >= audio.duration - 0.3;
  const sinceLine = line ? t - line.start : 9;

  return (
    <div className="cartoon" aria-label={`Cartone: ${title}`}>
      <svg viewBox="0 0 360 300" className="cartoon-svg" role="img" aria-hidden="true">
        <Scene />
        {/* cartello del punto chiave */}
        {shownPoints > 0 && !ended && (
          <g key={`kp${shownPoints}`} className="sign-in">
            <rect x="70" y="18" width="220" height="44" rx="10" fill="#fff" stroke="#c4471d" strokeWidth="2.5" />
            <foreignObject x="76" y="20" width="208" height="40">
              <div className="sign-text">{keyPoints[shownPoints - 1]}</div>
            </foreignObject>
          </g>
        )}
      </svg>
      <People t={t} who={who} talking={talking} mouth={mouth} sinceLine={sinceLine} />
      <div className="cartoon-caption">
        {line && !ended && (
          <div key={i} className={`bubble ${who === "M" ? "left" : "right"}`}>
            <b>{who === "M" ? "Prof" : "Ste"}</b> {line.text.replace(/\[[^\]]*\]\s*/g, "").replace(/\bLuca\b/g, "Ste").replace(/\bMarco\b/g, "Prof")}
          </div>
        )}
        {ended && <div className="bubble center pop">⚽ {analogy}</div>}
      </div>
    </div>
  );
}

function Scene() {
  return (
    <g>
      <rect x="0" y="0" width="360" height="300" fill="#fbefd9" />
      {/* parete con spalliera e finestra */}
      <rect x="0" y="0" width="360" height="205" fill="#f6e2c2" />
      <rect x="250" y="70" width="80" height="60" rx="6" fill="#dff0f7" stroke="#e8cfa6" strokeWidth="4" />
      <line x1="290" y1="70" x2="290" y2="130" stroke="#e8cfa6" strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <line key={k} x1="18" y1={88 + k * 18} x2="62" y2={88 + k * 18} stroke="#d9b98a" strokeWidth="4" strokeLinecap="round" />
      ))}
      <line x1="18" y1="80" x2="18" y2="205" stroke="#c9a46f" strokeWidth="5" />
      <line x1="62" y1="80" x2="62" y2="205" stroke="#c9a46f" strokeWidth="5" />
      {/* pavimento */}
      <rect x="0" y="205" width="360" height="95" fill="#e9c99a" />
      <rect x="0" y="205" width="360" height="6" fill="#dcb582" />
      <rect x="110" y="250" width="140" height="18" rx="9" fill="#2f7a4c" opacity=".85" />
      {/* pallone e kettlebell */}
      <g transform="translate(318 238)">
        <circle r="16" fill="#fff" stroke="#2b2118" strokeWidth="2" />
        <polygon points="0,-6 6,-2 4,5 -4,5 -6,-2" fill="#2b2118" />
      </g>
      <g transform="translate(40 232)">
        <path d="M-10 -8 a10 10 0 0 1 20 0" fill="none" stroke="#2b2118" strokeWidth="4" />
        <circle cy="6" r="14" fill="#3a3a3a" />
      </g>
    </g>
  );
}

/** Prof (a sinistra) e Ste (a destra) disegnati sopra la palestra: chi parla muove la bocca e gesticola. */
function People({ t, who, talking, mouth, sinceLine }: { t: number; who: string; talking: boolean; mouth: number; sinceLine: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current, g = c?.getContext("2d");
    if (!c || !g) return;
    g.clearRect(0, 0, c.width, c.height);
    const blink = (seed: number) => { const p = (t + seed) % 3.7; return p < 0.12 ? 1 - Math.abs(p - 0.06) / 0.06 : 0; };
    const gesture = (on: boolean) => {
      if (!on) return POSES2.idle;
      const k = Math.min(1, sinceLine / 0.4), phase = Math.floor(sinceLine / 2.2) % 2;
      return mixPose2(POSES2.idle, phase ? POSES2.point : POSES2.explain, k);
    };
    const hop = (on: boolean) => (on && sinceLine < 0.35 ? -Math.sin((sinceLine / 0.35) * Math.PI) * 8 : 0);
    const profOn = who === "M" && talking, steOn = who === "L" && talking;
    drawPerson(g, "PROF", { x: 215, y: 560, scale: 2.3, t, pose: gesture(profOn), mouth: { open: profOn ? mouth * 0.8 : 0, wide: 0.2 }, blink: blink(1.3), look: [0.6, 0], brow: profOn ? 0.3 : 0, bob: hop(profOn) });
    drawPerson(g, "STE", { x: 505, y: 560, scale: 2.3, t, pose: gesture(steOn), mirror: true, mouth: { open: steOn ? mouth * 0.8 : 0, wide: 0.2 }, blink: blink(0.2), look: [-0.6, 0], brow: steOn ? 0.3 : 0, bob: hop(steOn) });
  });
  return <canvas ref={ref} className="cartoon-people" width={720} height={600} aria-hidden="true" />;
}
