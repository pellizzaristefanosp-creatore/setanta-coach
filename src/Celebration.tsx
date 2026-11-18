import { useEffect, useRef, useState } from "react";
import { dismissCelebration, useCelebrations, type Celebration as C } from "./lib/store";

/** Festa a tutto schermo quando vinci qualcosa: una alla volta, si chiude con un tocco. */
export function Celebration() {
  const list = useCelebrations();
  const current = list[0];
  if (!current) return null;
  return <Party key={current.id} c={current} />;
}

const COLORS = ["#c4471d", "#d99a25", "#2f7a4c", "#e0683a", "#f2c14e", "#fbe3d6"];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function Party({ c }: { c: C }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const reduced = prefersReducedMotion();

  // Coriandoli: due esplosioni dai lati del centro, con gravità e attrito.
  useEffect(() => {
    if (reduced) return;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (cv.width = window.innerWidth * dpr);
    const h = (cv.height = window.innerHeight * dpr);
    type P = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; color: string; shape: number; life: number };
    const parts: P[] = [];
    const burst = (n: number, delay: number) =>
      setTimeout(() => {
        for (let i = 0; i < n; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
          const speed = (8 + Math.random() * 10) * dpr;
          parts.push({
            x: w / 2 + (Math.random() - 0.5) * 60 * dpr,
            y: h * 0.42,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: (4 + Math.random() * 5) * dpr,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.3,
            color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
            shape: Math.random() < 0.6 ? 0 : 1,
            life: 1,
          });
        }
      }, delay);
    burst(90, 120);
    burst(60, 520);
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.32 * dpr;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h * 0.75) p.life -= 0.02;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i]!.life <= 0 || parts[i]!.y > h + 40) parts.splice(i, 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Punti che contano, suono e vibrazione.
  useEffect(() => {
    fanfare();
    navigator.vibrate?.([30, 60, 30, 60, 120]);
    const close = setTimeout(() => setCanClose(true), 900);
    if (c.points <= 0) return () => clearTimeout(close);
    const start = performance.now();
    const dur = reduced ? 1 : 900;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setPoints(Math.round(c.points * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    const begin = setTimeout(() => (raf = requestAnimationFrame(step)), reduced ? 0 : 450);
    return () => {
      clearTimeout(close);
      clearTimeout(begin);
      cancelAnimationFrame(raf);
    };
  }, [c.points, reduced]);

  const label = { badge: "Nuovo premio", level: "Livello su", daily: "Sfida vinta", weekly: "Sfida vinta", boss: "Partita vinta" }[c.kind];

  return (
    <div
      className={`party ${c.kind}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${label}: ${c.title}`}
      onClick={() => canClose && dismissCelebration(c.id)}
    >
      <canvas ref={canvas} className="party-confetti" aria-hidden="true" />
      <div className="party-stage">
        <div className="party-medal" aria-hidden="true">
          <span className="party-rays" />
          <span className="party-ring" />
          <span className="party-icon">{c.icon}</span>
          <span className="party-shine" />
        </div>
        <p className="party-label">{label}</p>
        <h2 className="party-title">{c.title}</h2>
        <p className="party-sub">{c.subtitle}</p>
        {c.points > 0 && <p className="party-points num">+{points} pt</p>}
        <button className="btn primary party-btn" onClick={(e) => { e.stopPropagation(); dismissCelebration(c.id); }}>Avanti</button>
      </div>
    </div>
  );
}

let actx: AudioContext | null = null;
/** Piccola fanfara: arpeggio maggiore con un accordo finale. */
function fanfare() {
  try {
    actx ??= new AudioContext();
    if (actx.state === "suspended") void actx.resume();
    const t0 = actx.currentTime + 0.05;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, t0 + i * 0.09, 0.16, 0.18));
    [523.25, 659.25, 783.99].forEach((f) => tone(f, t0 + 0.42, 0.55, 0.1));
  } catch {
    /* niente audio */
  }
}

function tone(freq: number, at: number, len: number, vol: number) {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = "triangle";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(actx.destination);
  o.start(at);
  o.stop(at + len + 0.02);
}
