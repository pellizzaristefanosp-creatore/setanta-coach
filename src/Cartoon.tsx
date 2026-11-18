import { useEffect, useRef, useState, type RefObject } from "react";
import { lineAt, type AudioPart } from "./lib/audio";

/**
 * Cartone animato della lezione: Marco (preparatore) e Luca (calciatore) in palestra.
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
        <Marco active={who === "M" && talking} mouth={who === "M" ? mouth : 0} bounce={who === "M" ? sinceLine : 9} />
        <Luca active={who === "L" && talking} mouth={who === "L" ? mouth : 0} bounce={who === "L" ? sinceLine : 9} />
      </svg>
      <div className="cartoon-caption">
        {line && !ended && (
          <div key={i} className={`bubble ${who === "M" ? "left" : "right"}`}>
            <b>{who === "M" ? "Marco" : "Luca"}</b> {line.text}
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

type CharProps = { active: boolean; mouth: number; bounce: number };

function jump(bounce: number) {
  // piccolo saltello all'inizio di ogni battuta
  return bounce < 0.35 ? -Math.sin((bounce / 0.35) * Math.PI) * 6 : 0;
}

function Marco({ active, mouth, bounce }: CharProps) {
  return (
    <g transform={`translate(105 ${88 + jump(bounce)})`} className={`char ${active ? "speaking" : ""}`}>
      {/* gambe */}
      <rect x="-22" y="118" width="17" height="52" rx="7" fill="#7a2a12" />
      <rect x="5" y="118" width="17" height="52" rx="7" fill="#7a2a12" />
      <ellipse cx="-14" cy="172" rx="14" ry="7" fill="#2b2118" />
      <ellipse cx="14" cy="172" rx="14" ry="7" fill="#2b2118" />
      {/* corpo: tuta */}
      <rect x="-32" y="52" width="64" height="74" rx="20" fill="#c4471d" />
      <rect x="-3" y="54" width="6" height="70" fill="#fbe3d6" opacity=".9" />
      {/* braccio che gesticola */}
      <g className="arm-gesture" style={{ transformOrigin: "26px 62px" }}>
        <rect x="22" y="58" width="14" height="50" rx="7" fill="#c4471d" />
        <circle cx="29" cy="110" r="8" fill="#e9b48c" />
      </g>
      <rect x="-36" y="58" width="14" height="50" rx="7" fill="#c4471d" />
      <circle cx="-29" cy="110" r="8" fill="#e9b48c" />
      {/* fischietto */}
      <path d="M-12 54 Q0 78 12 54" fill="none" stroke="#2b2118" strokeWidth="1.5" />
      <rect x="-5" y="74" width="10" height="6" rx="2" fill="#d99a25" />
      {/* testa */}
      <rect x="-8" y="40" width="16" height="16" fill="#e9b48c" />
      <circle cx="0" cy="18" r="30" fill="#e9b48c" />
      {/* barba e capelli */}
      <path d="M-28 22 Q0 62 28 22 Q22 46 0 48 Q-22 46 -28 22" fill="#5b3a26" opacity=".9" />
      <path d="M-30 10 Q-28 -16 0 -14 Q28 -16 30 10 Q22 -2 0 -2 Q-22 -2 -30 10" fill="#3a2418" />
      {/* cappellino */}
      <path d="M-30 4 Q0 -28 30 4 Z" fill="#2b2118" />
      <rect x="10" y="0" width="30" height="7" rx="3" fill="#2b2118" />
      <Face mouth={mouth} />
    </g>
  );
}

function Luca({ active, mouth, bounce }: CharProps) {
  return (
    <g transform={`translate(255 ${92 + jump(bounce)})`} className={`char ${active ? "speaking" : ""}`}>
      {/* gambe e scarpini */}
      <rect x="-20" y="112" width="15" height="54" rx="7" fill="#f2d2b6" />
      <rect x="5" y="112" width="15" height="54" rx="7" fill="#f2d2b6" />
      <rect x="-21" y="140" width="17" height="22" rx="4" fill="#fff" />
      <rect x="4" y="140" width="17" height="22" rx="4" fill="#fff" />
      <ellipse cx="-13" cy="168" rx="13" ry="6" fill="#c4471d" />
      <ellipse cx="13" cy="168" rx="13" ry="6" fill="#c4471d" />
      {/* pantaloncini */}
      <rect x="-26" y="100" width="52" height="26" rx="8" fill="#fff" />
      {/* maglia */}
      <rect x="-30" y="48" width="60" height="62" rx="18" fill="#2f7a4c" />
      <text x="0" y="90" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">10</text>
      <g className="arm-gesture" style={{ transformOrigin: "-24px 58px" }}>
        <rect x="-38" y="54" width="13" height="46" rx="6.5" fill="#2f7a4c" />
        <circle cx="-31.5" cy="102" r="7.5" fill="#f2d2b6" />
      </g>
      <rect x="25" y="54" width="13" height="46" rx="6.5" fill="#2f7a4c" />
      <circle cx="31.5" cy="102" r="7.5" fill="#f2d2b6" />
      {/* testa */}
      <rect x="-7" y="36" width="14" height="16" fill="#f2d2b6" />
      <circle cx="0" cy="14" r="28" fill="#f2d2b6" />
      {/* capelli spettinati */}
      <path d="M-28 10 Q-30 -20 -6 -18 Q-2 -28 8 -20 Q30 -22 28 8 Q20 -6 10 -4 Q4 -12 -2 -4 Q-14 -8 -28 10" fill="#8a5a2b" />
      <Face mouth={mouth} young />
    </g>
  );
}

function Face({ mouth, young }: { mouth: number; young?: boolean }) {
  return (
    <g>
      <g className="eyes">
        <ellipse cx="-10" cy="14" rx="3.6" ry="4.4" fill="#2b2118" />
        <ellipse cx="10" cy="14" rx="3.6" ry="4.4" fill="#2b2118" />
        <circle cx="-9" cy="12.5" r="1.2" fill="#fff" />
        <circle cx="11" cy="12.5" r="1.2" fill="#fff" />
      </g>
      <path d={`M-15 ${young ? 5 : 6} q5 -4 10 0 M5 ${young ? 5 : 6} q5 -4 10 0`} stroke="#2b2118" strokeWidth="2" fill="none" strokeLinecap="round" />
      {young && <><circle cx="-17" cy="24" r="4" fill="#f0a08a" opacity=".5" /><circle cx="17" cy="24" r="4" fill="#f0a08a" opacity=".5" /></>}
      {mouth > 0.05 ? (
        <ellipse cx="0" cy="29" rx={6 + mouth * 2} ry={1.5 + mouth * 6} fill="#5a1e12" />
      ) : (
        <path d="M-7 28 Q0 33 7 28" stroke="#5a1e12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}
