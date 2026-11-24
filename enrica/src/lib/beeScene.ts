// @ts-nocheck
/**
 * La scena animata delle lezioni (prato, arnia, Giuliano ed Enrica, illustrazioni dei concetti), disegnata su canvas
 * nel telefono mentre parte l'audio. Spazio di disegno 1080 × 1240, scalato al canvas.
 */
const W = 1080, SH = 1240;
let g: CanvasRenderingContext2D = null;
const SERIF = '"Fraunces", Georgia, serif', SANS = '"Nunito", sans-serif';
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function hexP(x, y, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; g[i ? "lineTo" : "moveTo"](x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); }
function radial(x, y, r, stops) { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; }
function linear(x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; }

/* elementi fissi generati una volta */
const CLOUDS = Array.from({ length: 5 }, (_, i) => ({ x: rnd() * 1400 - 200, y: 120 + rnd() * 260, s: 0.7 + rnd() * 0.7, v: 6 + rnd() * 8 }));
const GRASS = Array.from({ length: 160 }, () => ({ x: rnd() * W, h: 30 + rnd() * 50, ph: rnd() * 6, c: rnd() }));
const FLOWERS = Array.from({ length: 26 }, () => ({ x: rnd() * W, y: 1020 + rnd() * 190, s: 0.7 + rnd() * 0.6, ph: rnd() * 6, k: rnd() < 0.5 }));
const POLLEN = Array.from({ length: 40 }, () => ({ x: rnd() * W, y: rnd() * SH, r: 2 + rnd() * 5, v: 4 + rnd() * 10, ph: rnd() * 6 }));
const FLYERS = Array.from({ length: 9 }, (_, i) => ({ a: rnd() * 6, sp: 0.35 + rnd() * 0.4, rx: 140 + rnd() * 220, ry: 50 + rnd() * 90, cy: 600 + rnd() * 120 }));

function cloud(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = "rgba(255,252,240,.85)"; for (const [cx, cy, r] of [[0, 0, 50], [45, -20, 60], [100, 0, 48], [50, 18, 55]]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); } g.restore(); }

function sky(t) {
  g.fillStyle = linear(0, 0, 0, SH, [[0, "#ffd88f"], [0.45, "#ffe8b8"], [1, "#fff4d8"]]); g.fillRect(0, 0, W, SH);
  g.fillStyle = radial(820, 260, 520, [[0, "rgba(255,255,235,.95)"], [0.18, "rgba(255,240,190,.7)"], [1, "rgba(255,230,160,0)"]]); g.fillRect(0, 0, W, SH);
  g.save(); g.globalAlpha = 0.18; g.translate(820, 260); g.rotate(t * 0.02);
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.fillStyle = "#fffbe8"; g.beginPath(); g.moveTo(0, 0); g.lineTo(1400, -60); g.lineTo(1400, 60); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle = "#fffdf2"; g.beginPath(); g.arc(820, 260, 70, 0, 7); g.fill();
  for (const cd of CLOUDS) cloud(((cd.x + t * cd.v) % 1500) - 250, cd.y, cd.s);
}
function hills(t, px) {
  const layer = (base, amp, col, off, k) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, SH); for (let x = 0; x <= W; x += 20) g.lineTo(x, base + Math.sin((x + off + px * k) / 180) * amp + Math.sin((x + off) / 67) * amp * 0.25); g.lineTo(W, SH); g.fill(); };
  layer(640, 40, "#d9e3ae", 0, 0.2);
  g.fillStyle = "rgba(255,244,214,.45)"; g.fillRect(0, 560, W, 200);
  layer(720, 34, "#c2d38a", 300, 0.4);
  // filare di alberi lontani
  for (let i = 0; i < 9; i++) { const x = 40 + i * 120 + px * 0.4, y = 700 + Math.sin(i * 1.7) * 14; g.fillStyle = "#a9bf6e"; g.beginPath(); g.ellipse(x, y, 34, 46, 0, 0, 7); g.fill(); g.fillStyle = "#8aa055"; g.fillRect(x - 3, y + 30, 6, 22); }
  layer(820, 26, "#a7bd66", 120, 0.7);
  g.fillStyle = linear(0, 860, 0, SH, [[0, "#9fb85e"], [1, "#7f9a45"]]); g.beginPath(); g.moveTo(0, SH); for (let x = 0; x <= W; x += 20) g.lineTo(x, 880 + Math.sin((x + px) / 240) * 18); g.lineTo(W, SH); g.fill();
}
function hive(t) {
  g.save(); g.translate(540, 760);
  g.fillStyle = "rgba(60,50,20,.25)"; g.beginPath(); g.ellipse(0, 150, 150, 18, 0, 0, 7); g.fill();
  g.strokeStyle = "#6e5236"; g.lineWidth = 10; g.lineCap = "round"; for (const x of [-80, 80]) { g.beginPath(); g.moveTo(x, 90); g.lineTo(x * 1.1, 150); g.stroke(); }
  const box = (y, h, c1, c2) => { g.fillStyle = linear(-105, 0, 105, 0, [[0, c2], [0.35, c1], [1, c2]]); rr(-105, y, 210, h, 6); g.fill(); g.strokeStyle = "rgba(90,60,30,.45)"; g.lineWidth = 3; g.stroke();
    g.strokeStyle = "rgba(120,80,40,.18)"; g.lineWidth = 2; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(-100, y + (h * k) / 5); g.bezierCurveTo(-40, y + (h * k) / 5 - 4, 40, y + (h * k) / 5 + 4, 100, y + (h * k) / 5); g.stroke(); } };
  box(-70, 70, "#f6d38a", "#dca456"); box(0, 90, "#f9dc9a", "#e1ad62");
  g.fillStyle = linear(0, -125, 0, -70, [[0, "#c98a3e"], [1, "#a8702e"]]); g.beginPath(); g.moveTo(-125, -70); g.lineTo(-90, -120); g.lineTo(90, -120); g.lineTo(125, -70); g.closePath(); g.fill(); g.strokeStyle = "rgba(90,60,30,.5)"; g.stroke();
  g.fillStyle = "#3a2716"; rr(-40, 76, 80, 10, 4); g.fill();
  g.fillStyle = "#c48d4a"; g.beginPath(); g.moveTo(-60, 90); g.lineTo(60, 90); g.lineTo(75, 108); g.lineTo(-75, 108); g.closePath(); g.fill();
  g.restore();
  // api che entrano ed escono
  for (let i = 0; i < 5; i++) { const k = ((t * 0.35 + i / 5) % 1); const out = i % 2; const x = 540 + (out ? 1 : -1) * k * 260 * (i % 3 + 1) / 2, y = 840 - k * 160 + Math.sin(k * 12 + i) * 14; bee(x, y, 1.1 - k * 0.3, t * 45 + i, out ? -1 : 1, 1 - k); }
}

function bee(x, y, s, ph, dir, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.scale(s * dir, s);
  const f = 0.35 + 0.65 * Math.abs(Math.sin(ph));
  g.fillStyle = "rgba(255,255,255,.7)"; g.strokeStyle = "rgba(61,38,20,.3)"; g.lineWidth = 1;
  for (const [ox, rot] of [[-4, -0.5], [2, -0.2]]) { g.save(); g.translate(ox, -8); g.scale(1, f); g.beginPath(); g.ellipse(0, -7, 7, 12, rot, 0, 7); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = radial(-2, -3, 16, [[0, "#ffd36a"], [1, "#d98e22"]]); g.beginPath(); g.ellipse(0, 0, 14, 9.5, 0, 0, 7); g.fill();
  g.fillStyle = "#3a2414"; for (const sx of [-5, 2]) { g.beginPath(); g.ellipse(sx, 0, 2.6, 9, 0, 0, 7); g.fill(); }
  g.beginPath(); g.arc(14, -1, 6.5, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(16, -3, 1.6, 0, 7); g.fill();
  g.restore();
}

function foreground(t) {
  for (const gb of GRASS) { const sway = Math.sin(t * 1.4 + gb.ph) * 8; g.strokeStyle = gb.c < 0.5 ? "#7f9a45" : "#93ae55"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(gb.x, SH); g.quadraticCurveTo(gb.x + sway * 0.5, SH - gb.h * 0.6, gb.x + sway, SH - gb.h); g.stroke(); }
  for (const fl of FLOWERS) { const sw = Math.sin(t * 1.2 + fl.ph) * 6; g.save(); g.translate(fl.x + sw, fl.y); g.scale(fl.s, fl.s);
    g.strokeStyle = "#6f8a3c"; g.lineWidth = 3; g.beginPath(); g.moveTo(-sw / fl.s, 60); g.quadraticCurveTo(0, 30, 0, 0); g.stroke();
    for (let k = 0; k < 6; k++) { g.fillStyle = fl.k ? "#ffffff" : "#ffd6e2"; g.beginPath(); g.ellipse(Math.cos(k * 1.047) * 11, Math.sin(k * 1.047) * 11, 10, 6.5, k * 1.047, 0, 7); g.fill(); }
    g.fillStyle = radial(-2, -2, 8, [[0, "#ffe08a"], [1, "#e9a53a"]]); g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.restore(); }
}
function pollen(t) { for (const p of POLLEN) { const y = (p.y - t * p.v + 4000) % SH, x = p.x + Math.sin(t * 0.6 + p.ph) * 20; g.fillStyle = radial(x, y, p.r * 2, [[0, "rgba(255,240,180,.55)"], [1, "rgba(255,240,180,0)"]]); g.beginPath(); g.arc(x, y, p.r * 2, 0, 7); g.fill(); } }

/* ——— personaggi, più grandi e con ombre ——— */
function shadeFace(cx, cy, r, base, dark) { g.fillStyle = radial(cx - r * 0.3, cy - r * 0.35, r * 1.4, [[0, base], [0.7, base], [1, dark]]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
function giuliano(x, y, mouth, talk, t, mood) {
  const bob = talk ? Math.sin(t * 5) * 4 : Math.sin(t * 1.2) * 1.5, tilt = talk ? Math.sin(t * 2.3) * 0.03 : 0;
  g.save(); g.translate(x, y); g.fillStyle = "rgba(50,40,15,.25)"; g.beginPath(); g.ellipse(0, 0, 150, 22, 0, 0, 7); g.fill();
  g.translate(0, bob); g.scale(3.1, 3.1);
  // corpo: giacca da apicoltore
  g.fillStyle = linear(-50, -90, 50, 0, [[0, "#fbf8f0"], [1, "#ddd6c4"]]); g.beginPath(); g.moveTo(-52, 0); g.bezierCurveTo(-52, -60, -30, -78, 0, -78); g.bezierCurveTo(30, -78, 52, -60, 52, 0); g.closePath(); g.fill();
  g.strokeStyle = "rgba(120,100,70,.35)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 0); g.stroke();
  for (const yy of [-55, -38, -21]) { g.fillStyle = "#b9ad95"; g.beginPath(); g.arc(3, yy, 1.8, 0, 7); g.fill(); }
  // braccio che gesticola quando parla
  const arm = talk ? (mood === "!" ? -0.9 : -0.35) + Math.sin(t * 3.1) * 0.25 : 0.15;
  g.save(); g.translate(36, -62); g.rotate(arm); g.fillStyle = "#ece6d6"; rr(-9, 0, 18, 46, 9); g.fill(); g.fillStyle = "#f3cfae"; g.beginPath(); g.arc(0, 50, 8, 0, 7); g.fill(); g.restore();
  g.save(); g.translate(-38, -62); g.rotate(-0.12); g.fillStyle = "#e4ddcb"; rr(-9, 0, 18, 46, 9); g.fill(); g.fillStyle = "#efc9a6"; g.beginPath(); g.arc(0, 50, 8, 0, 7); g.fill(); g.restore();
  // testa
  g.save(); g.translate(0, -104); g.rotate(tilt);
  g.fillStyle = "rgba(60,60,60,.07)"; g.beginPath(); g.moveTo(-50, -22); g.quadraticCurveTo(-58, 30, -40, 56); g.lineTo(40, 56); g.quadraticCurveTo(58, 30, 50, -22); g.fill();
  shadeFace(0, 0, 28, "#f6d2b4", "#dca98a");
  g.fillStyle = "#efc3a3"; g.beginPath(); g.arc(-27, 2, 6, 0, 7); g.arc(27, 2, 6, 0, 7); g.fill();
  g.fillStyle = linear(0, 6, 0, 40, [[0, "#f4f1ea"], [1, "#d8d1c4"]]); g.beginPath(); g.moveTo(-24, 6); g.bezierCurveTo(-20, 34, -8, 42, 0, 42); g.bezierCurveTo(8, 42, 20, 34, 24, 6); g.bezierCurveTo(14, 14, -14, 14, -24, 6); g.fill();
  g.fillStyle = "#e9e4da"; g.beginPath(); g.ellipse(-8, 12, 10, 4, 0.2, 0, 7); g.ellipse(8, 12, 10, 4, -0.2, 0, 7); g.fill();
  const blink = (t % 4.3) < 0.13, brow = mood === "?" ? -3 : mood === "!" ? -2 : 0;
  g.fillStyle = "#3d2a1c"; for (const ex of [-10, 10]) { g.beginPath(); g.ellipse(ex, -4, 3.4, blink ? 0.5 : 3.6, 0, 0, 7); g.fill(); if (!blink) { g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + 1.2, -5.3, 1.1, 0, 7); g.fill(); g.fillStyle = "#3d2a1c"; } }
  g.strokeStyle = "#9b9284"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(-16, -12 + brow); g.quadraticCurveTo(-10, -16 + brow, -4, -13 + brow); g.moveTo(4, -13 + brow); g.quadraticCurveTo(10, -16 + brow, 16, -12 + brow); g.stroke();
  g.fillStyle = "#e7a98d"; g.beginPath(); g.ellipse(0, 4, 4, 3, 0, 0, 7); g.fill();
  g.fillStyle = "#6e3426"; g.beginPath(); g.ellipse(0, 18, 6.5, 1 + mouth * 6.5, 0, 0, 7); g.fill();
  // cappello con velo
  g.fillStyle = linear(0, -32, 0, -14, [[0, "#f3e8c9"], [1, "#d9c79b"]]); g.beginPath(); g.ellipse(0, -22, 52, 10, 0, 0, 7); g.fill(); g.strokeStyle = "rgba(140,110,60,.6)"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = linear(0, -58, 0, -22, [[0, "#f8efd6"], [1, "#e2d2a8"]]); g.beginPath(); g.moveTo(-28, -22); g.bezierCurveTo(-28, -48, -16, -56, 0, -56); g.bezierCurveTo(16, -56, 28, -48, 28, -22); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#c98a3e"; g.fillRect(-28, -30, 56, 6);
  g.restore(); g.restore();
}
function enrica(x, y, mouth, talk, t, mood) {
  const bob = talk ? Math.sin(t * 5 + 1) * 4 : Math.sin(t * 1.3 + 2) * 1.5, tilt = talk ? Math.sin(t * 2.1 + 1) * 0.04 : -0.02;
  g.save(); g.translate(x, y); g.fillStyle = "rgba(50,40,15,.25)"; g.beginPath(); g.ellipse(0, 0, 140, 20, 0, 0, 7); g.fill();
  g.translate(0, bob); g.scale(3.1, 3.1);
  g.fillStyle = linear(0, -120, 0, -30, [[0, "#7a5638"], [1, "#5e3f27"]]); g.beginPath(); g.moveTo(-30, -110); g.bezierCurveTo(-42, -70, -40, -40, -32, -30); g.lineTo(32, -30); g.bezierCurveTo(40, -40, 42, -70, 30, -110); g.fill();
  g.fillStyle = linear(-50, -80, 50, 0, [[0, "#b9c78f"], [1, "#8fa064"]]); g.beginPath(); g.moveTo(-50, 0); g.bezierCurveTo(-50, -56, -28, -74, 0, -74); g.bezierCurveTo(28, -74, 50, -56, 50, 0); g.closePath(); g.fill();
  g.fillStyle = "#f0c46e"; g.beginPath(); g.moveTo(-16, -72); g.quadraticCurveTo(0, -56, 16, -72); g.lineTo(10, -60); g.quadraticCurveTo(0, -52, -10, -60); g.closePath(); g.fill();
  const arm = talk ? (mood === "?" ? -0.7 : -0.3) + Math.sin(t * 2.7 + 1) * 0.22 : -0.1;
  g.save(); g.translate(-35, -58); g.rotate(-arm); g.fillStyle = "#a3b37a"; rr(-8, 0, 16, 42, 8); g.fill(); g.fillStyle = "#f3cdb0"; g.beginPath(); g.arc(0, 46, 7, 0, 7); g.fill(); g.restore();
  g.save(); g.translate(35, -58); g.rotate(0.1); g.fillStyle = "#98a870"; rr(-8, 0, 16, 42, 8); g.fill(); g.fillStyle = "#eec7a9"; g.beginPath(); g.arc(0, 46, 7, 0, 7); g.fill(); g.restore();
  g.save(); g.translate(0, -100); g.rotate(tilt);
  shadeFace(0, 0, 26, "#f6d3b8", "#deae90");
  const blink = ((t + 1.7) % 3.9) < 0.13, brow = mood === "?" ? -4 : mood === "!" ? -3 : 0;
  g.fillStyle = "#2f2118"; for (const ex of [-9, 9]) { g.beginPath(); g.ellipse(ex, -1, 3.4, blink ? 0.5 : 3.9, 0, 0, 7); g.fill(); if (!blink) { g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + 1.2, -2.5, 1.2, 0, 7); g.fill(); g.fillStyle = "#2f2118"; } }
  g.strokeStyle = "#5e3f27"; g.lineWidth = 2.4; g.lineCap = "round"; g.beginPath(); g.moveTo(-15, -9 + brow); g.quadraticCurveTo(-9, -13 + brow, -4, -10 + brow); g.moveTo(4, -10 + brow); g.quadraticCurveTo(9, -13 + brow, 15, -9 + brow); g.stroke();
  g.fillStyle = "rgba(240,150,130,.35)"; g.beginPath(); g.arc(-15, 8, 5, 0, 7); g.arc(15, 8, 5, 0, 7); g.fill();
  g.fillStyle = "#e3a58a"; g.beginPath(); g.ellipse(0, 5, 3, 2.4, 0, 0, 7); g.fill();
  g.fillStyle = "#a64c3f"; g.beginPath(); g.ellipse(0, 15, 5.5, 1 + mouth * 5.5, 0, 0, 7); g.fill();
  g.fillStyle = linear(0, -30, 0, 0, [[0, "#86603f"], [1, "#6b4a2f"]]); g.beginPath(); g.moveTo(-27, 4); g.bezierCurveTo(-30, -26, -14, -34, 2, -32); g.bezierCurveTo(18, -32, 30, -22, 27, 4); g.bezierCurveTo(22, -12, 10, -18, -2, -18); g.bezierCurveTo(-14, -16, -22, -8, -27, 4); g.fill();
  g.strokeStyle = "rgba(255,230,190,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -26); g.quadraticCurveTo(0, -31, 14, -26); g.stroke();
  g.save(); g.translate(20, -26); g.rotate(0.3); bee(0, 0, 0.55, t * 40, 1); g.restore();
  g.restore(); g.restore();
}

/* ——— illustrazioni dei concetti (carte di vetro sopra la scena) ——— */
function card(y, h, k, title) {
  g.save(); g.globalAlpha = ease(k); g.translate(0, (1 - ease(k)) * 60);
  g.shadowColor = "rgba(90,60,20,.25)"; g.shadowBlur = 40; g.shadowOffsetY = 16;
  rr(70, y, W - 140, h, 44); g.fillStyle = "rgba(255,251,242,.93)"; g.fill(); g.shadowColor = "transparent";
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#c98a3e"; rr(W / 2 - 230, y - 26, 460, 56, 28); g.fill();
  g.fillStyle = "#fffaf0"; g.font = `800 28px ${SANS}`; g.textAlign = "center"; g.fillText(title, W / 2, y + 11);
}
function queen(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = "#3a2414"; g.lineWidth = 1.6; for (const lx of [8, 16, 24]) { g.beginPath(); g.moveTo(lx, 6); g.lineTo(lx - 4, 18); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,.75)"; g.strokeStyle = "rgba(61,38,20,.35)"; g.lineWidth = 1; g.beginPath(); g.ellipse(4, -14, 9, 17, -0.4, 0, 7); g.fill(); g.stroke();
  g.fillStyle = radial(-14, -4, 34, [[0, "#ffd06a"], [1, "#c97a1a"]]); g.beginPath(); g.ellipse(-12, 0, 32, 10.5, 0, 0, 7); g.fill();
  g.fillStyle = "#3a2414"; for (const sx of [-34, -24, -14, -4]) { g.beginPath(); g.ellipse(sx, 0, 2.6, 9.5, 0, 0, 7); g.fill(); }
  g.fillStyle = radial(18, -3, 14, [[0, "#8a623a"], [1, "#5a3c20"]]); g.beginPath(); g.ellipse(18, -1, 11, 9.5, 0, 0, 7); g.fill();
  g.fillStyle = "#3a2414"; g.beginPath(); g.arc(32, -2, 7.5, 0, 7); g.fill();
  g.fillStyle = "#f2c14e"; g.strokeStyle = "#b07a1e"; g.beginPath(); g.moveTo(25, -14); g.lineTo(27, -26); g.lineTo(31, -18); g.lineTo(35, -28); g.lineTo(39, -18); g.lineTo(43, -26); g.lineTo(44, -14); g.closePath(); g.fill(); g.stroke(); g.restore(); }
function drone(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = "rgba(255,255,255,.75)"; g.strokeStyle = "rgba(61,38,20,.35)"; g.lineWidth = 1; g.beginPath(); g.ellipse(-2, -18, 12, 20, -0.35, 0, 7); g.fill(); g.stroke();
  g.fillStyle = radial(-6, -4, 24, [[0, "#e8a64e"], [1, "#a8661e"]]); g.beginPath(); g.ellipse(-6, 0, 21, 15, 0, 0, 7); g.fill();
  g.fillStyle = "#3a2414"; for (const sx of [-16, -5]) { g.beginPath(); g.ellipse(sx, 0, 3.4, 14, 0, 0, 7); g.fill(); }
  g.beginPath(); g.arc(19, -2, 12, 0, 7); g.fill(); g.fillStyle = "#1c120a"; g.beginPath(); g.ellipse(24, -7, 7, 8, 0.3, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.arc(26, -10, 2, 0, 7); g.fill(); g.restore(); }

function family(t, k, hl) {
  if (k <= 0) return;
  card(150, 520, k, "LA FAMIGLIA DELLE API");
  const cols = [[255, "Regina", "una sola", queen, 2.5], [540, "Operaie", "le figlie", (x, y, s) => bee(x, y, s, t * 30, -1), 3.6], [825, "Fuchi", "i maschi", drone, 2.6]];
  cols.forEach(([x, name, sub, draw, s], i) => {
    const on = hl === i, pulse = on ? 1 + Math.sin(t * 6) * 0.02 : 1;
    g.save(); g.translate(x, 400); g.scale(pulse * (on ? 1.08 : 1), pulse * (on ? 1.08 : 1));
    hexP(0, 0, 118); g.fillStyle = on ? linear(0, -118, 0, 118, [[0, "#ffe9b0"], [1, "#f6c96d"]]) : linear(0, -118, 0, 118, [[0, "#fbf1db"], [1, "#f1e2bf"]]); g.fill();
    g.strokeStyle = on ? "#c98a3e" : "rgba(201,138,62,.35)"; g.lineWidth = on ? 7 : 3; g.stroke();
    draw(0, Math.sin(t * 3 + i) * 5, s); g.restore();
    g.fillStyle = on ? "#5a3a14" : "#7d6550"; g.font = `600 46px ${SERIF}`; g.textAlign = "center"; g.fillText(name, x, 580);
    g.fillStyle = "#9a836c"; g.font = `700 28px ${SANS}`; g.fillText(sub, x, 620);
  });
  g.restore();
}
function superorg(t, k) {
  if (k <= 0) return;
  card(150, 520, k, "SUPERORGANISMO");
  const n = 22, r = lerp(300, 150, ease(k * 1.3 - 0.1));
  g.fillStyle = radial(W / 2, 410, 200, [[0, "rgba(246,201,109,.45)"], [1, "rgba(246,201,109,0)"]]); g.beginPath(); g.arc(W / 2, 410, 220, 0, 7); g.fill();
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * 0.7; bee(W / 2 + Math.cos(a) * r, 410 + Math.sin(a) * r * 0.55, 2.1, t * 40 + i, Math.sin(a) > 0 ? 1 : -1); }
  g.fillStyle = "#5a3a14"; g.font = `600 44px ${SERIF}`; g.textAlign = "center"; g.fillText("tante api, un unico corpo", W / 2, 615);
  g.restore();
}
function jar(t, k) {
  if (k <= 0) return;
  card(150, 520, k, "TOCCA A TE");
  g.save(); g.translate(W / 2 - 60, 420);
  g.fillStyle = "rgba(60,40,10,.15)"; g.beginPath(); g.ellipse(0, 140, 130, 16, 0, 0, 7); g.fill();
  rr(-115, -150, 230, 285, 46); g.fillStyle = linear(-115, 0, 115, 0, [[0, "rgba(200,225,240,.55)"], [0.3, "rgba(255,255,255,.75)"], [1, "rgba(190,215,232,.5)"]]); g.fill(); g.strokeStyle = "#a9c0cc"; g.lineWidth = 5; g.stroke();
  g.fillStyle = linear(0, -185, 0, -145, [[0, "#d6994c"], [1, "#a8702e"]]); rr(-125, -185, 250, 42, 12); g.fill();
  g.fillStyle = linear(0, 60, 0, 130, [[0, "#f6cf74"], [1, "#e0a243"]]); rr(-104, 62, 208, 66, 26); g.fill();
  bee(Math.sin(t * 2) * 50, -30 + Math.cos(t * 2.6) * 24, 2.6, t * 40, Math.cos(t * 2) > 0 ? 1 : -1);
  g.restore();
  g.fillStyle = "#c98a3e"; g.font = `700 150px ${SERIF}`; g.textAlign = "center"; g.fillText("?", W / 2 + 190, 460);
  g.fillStyle = "#5a3a14"; g.font = `600 40px ${SERIF}`; g.fillText("Quanto resiste da sola?", W / 2, 625);
  g.restore();
}


const ICONS = [
  [/regin/i, (x, y, s) => queen(x, y, s * 0.9)], [/fuc/i, (x, y, s) => drone(x, y, s)], [/varroa|acar/i, "mite"], [/arnia|telain|melari|cassett/i, "hive"],
  [/miele|nettare|melata|sciropp/i, "jar"], [/fior|polline|impollin/i, "flower"], [/cera|favo|cell/i, "comb"], [/affumic|fumo/i, "smoke"],
];
function icon(text, t) {
  const hit = ICONS.find(([re]) => re.test(text));
  const kind = hit ? hit[1] : "bee";
  g.save(); g.translate(W / 2, 330);
  hexP(0, 0, 105); g.fillStyle = linear(0, -105, 0, 105, [[0, "#ffe9b0"], [1, "#f6c96d"]]); g.fill(); g.strokeStyle = "#c98a3e"; g.lineWidth = 5; g.stroke();
  if (typeof kind === "function") kind(0, 0, 2.6);
  else if (kind === "hive") { g.scale(0.55, 0.55); g.translate(-540, -760); hive(t); }
  else if (kind === "jar") { g.fillStyle = linear(0, -40, 0, 60, [[0, "#f6cf74"], [1, "#e0a243"]]); rr(-45, -40, 90, 100, 22); g.fill(); g.fillStyle = "#c98a3e"; rr(-52, -58, 104, 22, 8); g.fill(); }
  else if (kind === "flower") { for (let k = 0; k < 6; k++) { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(Math.cos(k * 1.047) * 30, Math.sin(k * 1.047) * 30, 28, 17, k * 1.047, 0, 7); g.fill(); } g.fillStyle = "#e9a53a"; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); bee(40, -40, 1.6, t * 40, -1); }
  else if (kind === "comb") { for (const [dx, dy] of [[0, 0], [-34, -20], [34, -20], [-34, 20], [34, 20], [0, -40], [0, 40]]) { hexP(dx, dy, 19); g.fillStyle = "#f6d38a"; g.fill(); g.strokeStyle = "#c98a3e"; g.lineWidth = 3; g.stroke(); } }
  else if (kind === "mite") { g.fillStyle = "#7a3b22"; g.beginPath(); g.ellipse(0, 0, 40, 30, 0, 0, 7); g.fill(); g.strokeStyle = "#5a2a14"; g.lineWidth = 5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-30 + k * 20, 20); g.lineTo(-38 + k * 22, 44); g.stroke(); } }
  else if (kind === "smoke") { g.fillStyle = "#b9b2a6"; rr(-30, -10, 60, 70, 10); g.fill(); g.fillStyle = "rgba(220,220,220,.8)"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(Math.sin(t * 2 + k) * 10, -30 - k * 18, 14 + k * 4, 0, 7); g.fill(); } }
  else bee(0, 0, 3.6, t * 40, -1);
  g.restore();
}
function wrapC(text, maxW) { const out = []; let line = ""; for (const w of text.split(" ")) { const tr = line ? line + " " + w : w; if (g.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; } if (line) out.push(line); return out; }
function keyCard(t, k, text, idx, total) {
  if (k <= 0) return;
  card(150, 520, k, `DA RICORDARE · ${idx + 1} DI ${total}`);
  icon(text, t);
  g.fillStyle = "#5a3a14"; g.font = `600 44px ${SERIF}`; g.textAlign = "center";
  wrapC(text, 820).slice(0, 2).forEach((ln, i) => g.fillText(ln, W / 2, 530 + i * 54));
  g.restore();
}

export type SceneLine = { who: "M" | "E" | "L"; start: number; text: string };
export type SceneOpts = { lines: SceneLine[]; duration: number; t: number; level: number; title: string; keyPoints: string[]; special?: "1.1/0" };
let cam = 0;
/** Disegna un fotogramma. `level` = quanto è forte la voce adesso (0–1), per la bocca. */
export function drawScene(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  g = ctx; const t = o.t, L = o.lines;
  let cur = -1; L.forEach((l, i) => { if (t >= l.start) cur = i; });
  const next = cur >= 0 ? (L[cur + 1]?.start ?? o.duration) : 0;
  const speaking = cur >= 0 && t < next - 0.15 && o.level > 0.02;
  const who = cur >= 0 ? L[cur].who : null, txt = cur >= 0 ? L[cur].text.trim() : "", mood = txt.endsWith("?") ? "?" : txt.endsWith("!") ? "!" : "";
  cam = lerp(cam, who === "M" ? -60 : who === "E" ? 60 : 0, 0.03);
  const s = ctx.canvas.width / W;
  ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0);
  const zoom = 1.04 + Math.sin(t * 0.15) * 0.01;
  g.save(); g.beginPath(); g.rect(0, 0, W, SH); g.clip();
  g.translate(W / 2, SH / 2); g.scale(zoom, zoom); g.translate(-W / 2 - cam * 0.6, -SH / 2);
  sky(t); hills(t, cam); hive(t);
  for (const f of FLYERS) { const a = t * f.sp + f.a; bee(540 + Math.cos(a) * f.rx, f.cy + Math.sin(a * 1.3) * f.ry, 1, t * 45 + f.a, Math.cos(a) > 0 ? -1 : 1); }
  giuliano(270, 1150, who === "M" && speaking ? o.level : 0, who === "M" && speaking, t, who === "M" ? mood : "");
  enrica(810, 1150, who === "E" && speaking ? o.level : 0, who === "E" && speaking, t, who === "E" ? mood : "");
  foreground(t); pollen(t);
  g.restore();
  g.fillStyle = radial(W / 2, SH / 2, 900, [[0.6, "rgba(90,60,20,0)"], [1, "rgba(90,60,20,.22)"]]); g.fillRect(0, 0, W, SH);
  g.fillStyle = "rgba(255,251,242,.88)"; rr(W / 2 - 300, 46, 600, 58, 29); g.fill();
  g.fillStyle = "#8a5a1c"; g.font = `800 26px ${SANS}`; g.textAlign = "center"; g.fillText(o.title.toUpperCase().slice(0, 40), W / 2, 84);
  if (o.special === "1.1/0" && L.length >= 8) {
    const fIn = (t - L[2].start) / 0.8, fOut = (L[6].start + 3.2 - t) / 0.6;
    const end4 = L[5].start;
    let hl = -1; if (t >= L[4].start) { const p = (t - L[4].start) / (end4 - L[4].start); hl = p < 0.42 ? 0 : p < 0.78 ? 1 : 2; }
    family(t, Math.min(fIn, fOut, 1), hl);
    superorg(t, Math.min((t - (L[6].start + 3.2)) / 0.7, (L[7].start - t) / 0.5, 1));
    jar(t, Math.min((t - L[7].start) / 0.6, (L[8]?.start ?? o.duration) - t, 1));
  } else if (o.keyPoints.length) {
    // i punti chiave compaiono uno alla volta, fra il 15% e il 90% della parte
    const p = t / Math.max(1, o.duration), n = o.keyPoints.length, a = 0.15, b = 0.9;
    if (p > a && p < b) { const seg = (b - a) / n, i = Math.min(n - 1, Math.floor((p - a) / seg)), local = (p - a - i * seg) / seg;
      keyCard(t, Math.min(local * seg * o.duration / 0.6, (1 - local) * seg * o.duration / 0.5, 1), o.keyPoints[i], i, n); }
  }
  ctx.restore();
}
export const SCENE_RATIO = SH / W;
