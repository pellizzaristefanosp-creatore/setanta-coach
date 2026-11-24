import { useEffect, useRef } from "react";

/** Miele che cola dal bordo in alto e qualche ape che vola piano dietro le carte. Fermo con "Riduci movimento". */
export function BeeBackground() {
  const cv = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = cv.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bees = Array.from({ length: 4 }, (_, i) => ({ x: Math.random(), y: 0.18 + Math.random() * 0.66, sp: 0.01 + Math.random() * 0.01, ph: Math.random() * 6, dir: i % 2 ? 1 : -1, s: 0.45 + Math.random() * 0.2 }));
    const size = () => {
      c.width = innerWidth * devicePixelRatio;
      c.height = innerHeight * devicePixelRatio;
    };
    size();
    addEventListener("resize", size);
    const bee = (x: number, y: number, s: number, flap: number, dir: number) => {
      g.save();
      g.translate(x, y);
      g.scale(s * dir, s);
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.strokeStyle = "rgba(61,38,20,0.3)";
      g.lineWidth = 1;
      g.save();
      g.translate(-2, -7);
      g.scale(1, 0.4 + 0.6 * flap);
      g.beginPath();
      g.ellipse(0, -6, 6, 9, -0.4, 0, 7);
      g.fill();
      g.stroke();
      g.restore();
      g.fillStyle = "#e9a53a";
      g.beginPath();
      g.ellipse(0, 0, 11, 7.5, 0, 0, 7);
      g.fill();
      g.fillStyle = "#3d2614";
      for (const sx of [-3, 3]) g.fillRect(sx - 1.6, -7, 3.2, 14);
      g.beginPath();
      g.arc(11, -1, 5, 0, 7);
      g.fill();
      g.restore();
    };
    let raf = 0;
    const fly = (t: number) => {
      g.clearRect(0, 0, c.width, c.height);
      const W = c.width, H = c.height, k = devicePixelRatio;
      for (const b of bees) {
        if (!reduce) {
          b.x += (b.dir * b.sp) / 60;
          if (b.x > 1.1) b.x = -0.1;
          if (b.x < -0.1) b.x = 1.1;
        }
        const y = (b.y + (reduce ? 0 : Math.sin(t / 900 + b.ph) * 0.03)) * H;
        bee(b.x * W, y, b.s * k, reduce ? 1 : Math.abs(Math.sin(t / 28 + b.ph)), b.dir);
      }
      if (!reduce && document.visibilityState === "visible") raf = requestAnimationFrame(fly);
    };
    raf = requestAnimationFrame(fly);
    const vis = () => { if (document.visibilityState === "visible" && !reduce) raf = requestAnimationFrame(fly); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  const drips = [
    { l: "8%", w: 14, h: 34, t: 7, d: 0 },
    { l: "23%", w: 10, h: 22, t: 9, d: 1.2 },
    { l: "47%", w: 18, h: 44, t: 8, d: 0.6 },
    { l: "71%", w: 12, h: 28, t: 10, d: 2 },
    { l: "88%", w: 15, h: 38, t: 7.5, d: 1.6 },
  ];
  return (
    <div className="bee-bg" aria-hidden="true">
      <div className="honey-top">
        <div className="band" />
        {drips.map((d, i) => (
          <span key={i} className="drip" style={{ left: d.l, ["--w" as string]: `${d.w}px`, ["--h" as string]: `${d.h}px`, ["--t" as string]: `${d.t}s`, ["--d" as string]: `${d.d}s` }} />
        ))}
      </div>
      <canvas ref={cv} className="bees" />
    </div>
  );
}

/** Il favo che si riempie di miele con l'onda: la percentuale del libro. */
export function HoneyCell({ percent }: { percent: number }) {
  const wave = useRef<SVGPathElement | null>(null);
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const draw = (t: number) => {
      const k = reduce ? 1 : Math.min(1, Math.max(0, (t - t0 - 300) / 1600));
      const shown = percent * (1 - Math.pow(1 - k, 3));
      const level = 146 - (142 * shown) / 100, amp = reduce ? 0 : 3.5;
      let d = `M0 150 L0 ${level}`;
      for (let x = 0; x <= 132; x += 6) d += ` L${x} ${level + Math.sin(x / 14 + t / 600) * amp}`;
      wave.current?.setAttribute("d", `${d} L132 150 Z`);
      if (!reduce && document.visibilityState === "visible") raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [percent]);
  return (
    <svg className="honey-cell" viewBox="0 0 132 150" role="img" aria-label={`${percent}% del libro`}>
      <defs>
        <clipPath id="hexclip"><path d="M66 2 128 38v74L66 148 4 112V38Z" /></clipPath>
        <linearGradient id="honeyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6d38a" /><stop offset="1" stopColor="#e2a24f" /></linearGradient>
      </defs>
      <path d="M66 2 128 38v74L66 148 4 112V38Z" fill="#f7ead0" />
      <g clipPath="url(#hexclip)"><path ref={wave} fill="url(#honeyg)" /></g>
      <path d="M66 2 128 38v74L66 148 4 112V38Z" fill="none" stroke="#d4964a" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
