// Prof e Ste: personaggi vettoriali originali, disegnati su canvas 2D con uno scheletro semplice.
// Parlano (bocca dai visemi della voce), sbattono le palpebre, guardano, gesticolano.
// Coordinate locali: origine ai piedi, y verso l'alto negativa (canvas), altezza circa 620 unità.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;

export const LOOK = {
  PROF: { skin: "#e8b48f", skinShade: "#cf9670", hair: "#2f2219", beard: "#4a3122", top: "#e5652b", topShade: "#c24f1c", pants: "#d75a24", shoe: "#1f1a16", cap: "#22201e", accent: "#f2c24b", height: 1 },
  STE: { skin: "#f1c6a3", skinShade: "#d9a582", hair: "#6b4226", beard: null, top: "#2f9a5c", topShade: "#237647", pants: "#f4f2ec", shoe: "#1f1a16", cap: null, accent: "#ffffff", height: 0.95 },
};

// pose: angoli in radianti dal braccio giù; positivo = verso l'esterno/l'alto (per ogni lato).
// fs/fe: spalla e gomito del braccio davanti (lato destro dello schermo), bs/be: braccio dietro (lato sinistro).
export const POSES = {
  idle: { fs: 0.14, fe: 0.12, bs: 0.14, be: 0.12, lean: 0 },
  explain: { fs: 0.55, fe: 1.25, bs: 0.35, be: 0.9, lean: 0.02 },
  point: { fs: 2.35, fe: 0.25, bs: 0.14, be: 0.1, lean: -0.03 },
  think: { fs: -0.25, fe: 2.75, bs: 0.14, be: 0.2, lean: 0.02 },
  surprise: { fs: 2.55, fe: 0.35, bs: 2.55, be: 0.35, lean: -0.03 },
  shrug: { fs: 0.55, fe: 1.85, bs: 0.55, be: 1.85, lean: 0 },
  pullR: { fs: 1.45, fe: 0.1, bs: -1.35, be: -0.05, lean: -0.1 },
  pullL: { fs: -1.35, fe: -0.05, bs: 1.45, be: 0.1, lean: 0.1 },
};

export function mixPose(a, b, k) {
  const o = {};
  for (const key of Object.keys(POSES.idle)) o[key] = lerp(a[key], b[key], k);
  return o;
}

function roundedLimb(g, x1, y1, x2, y2, w, color) {
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}

function outline(g, fn, w = 6) { // contorno scuro morbido sotto la forma
  g.save(); g.strokeStyle = "rgba(30,20,15,0.9)"; g.lineWidth = w; g.lineJoin = "round"; fn(true); g.restore(); fn(false);
}

/**
 * Disegna un personaggio.
 * s = { x, y, scale, flip, pose, mouth:{open,wide,round}, blink, brow, browTilt, look:[x,y], headTilt, bob, expr:"smile"|"neutral"|"wow", number }
 */
export function drawCharacter(g, who, s) {
  const L = LOOK[who];
  const P = s.pose;
  g.save();
  g.translate(s.x, s.y + (s.bob ?? 0));
  g.scale(s.scale * (s.flip ? -1 : 1), s.scale);
  g.rotate(P.lean ?? 0);
  const H = 620 * L.height;
  const hipY = -H * 0.42, shoulderY = -H * 0.72, neckY = -H * 0.76;
  const breath = Math.sin((s.t ?? 0) * 1.7) * 2;

  // ——— braccio dietro ———
  const arm = (side, sh, el) => {
    const sx = side * 58, sy = shoulderY + 10;
    const ux = sx + side * Math.sin(sh) * 92, uy = sy + Math.cos(sh) * 92;
    const a2 = sh + el;
    const hx = ux + side * Math.sin(a2) * 84, hy = uy + Math.cos(a2) * 84;
    const sleeve = side > 0 ? L.top : L.topShade;
    roundedLimb(g, sx, sy, ux, uy, 40, "#1e1410"); roundedLimb(g, ux, uy, hx, hy, 36, "#1e1410");
    roundedLimb(g, sx, sy, ux, uy, 32, sleeve); roundedLimb(g, ux, uy, hx, hy, 28, who === "STE" ? L.skin : sleeve);
    g.fillStyle = "#1e1410"; g.beginPath(); g.arc(hx, hy, 19, 0, 7); g.fill();
    g.fillStyle = L.skin; g.beginPath(); g.arc(hx, hy, 15, 0, 7); g.fill();
    return [hx, hy];
  };
  const backHand = arm(-1, P.bs, P.be);

  // ——— gambe ———
  for (const side of [-1, 1]) {
    const x = side * 30;
    roundedLimb(g, x, hipY, x + side * 4, -40, 50, "#1e1410");
    roundedLimb(g, x, hipY, x + side * 4, -40, 42, who === "STE" ? L.skin : L.pants);
    if (who === "STE") { // pantaloncini e calzettoni
      g.fillStyle = "#1e1410"; g.beginPath(); g.roundRect(x - 30, hipY - 10, 60, 92, 14); g.fill();
      g.fillStyle = L.pants; g.beginPath(); g.roundRect(x - 26, hipY - 6, 52, 84, 12); g.fill();
      roundedLimb(g, x + side * 2, -140, x + side * 4, -40, 44, "#1e1410"); roundedLimb(g, x + side * 2, -140, x + side * 4, -40, 38, L.top);
    }
    g.fillStyle = "#1e1410"; g.beginPath(); g.ellipse(x + side * 10, -18, 40, 22, 0, 0, 7); g.fill();
    g.fillStyle = L.shoe; g.beginPath(); g.ellipse(x + side * 10, -20, 35, 18, 0, 0, 7); g.fill();
  }

  // ——— busto ———
  outline(g, (o) => {
    g.fillStyle = o ? "transparent" : L.top;
    g.beginPath();
    g.moveTo(-70, shoulderY + 4); g.quadraticCurveTo(0, shoulderY - 18 - breath, 70, shoulderY + 4);
    g.lineTo(62, hipY + 20); g.quadraticCurveTo(0, hipY + 34, -62, hipY + 20); g.closePath();
    if (o) g.stroke(); else g.fill();
  }, 8);
  g.fillStyle = L.topShade; g.beginPath(); g.moveTo(20, shoulderY + 6); g.quadraticCurveTo(70, shoulderY + 10, 62, hipY + 20); g.quadraticCurveTo(40, hipY + 30, 20, hipY + 28); g.fill();
  if (who === "PROF") {
    g.strokeStyle = "#fbe3d6"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, shoulderY - 6); g.lineTo(0, hipY + 28); g.stroke(); // zip
    g.strokeStyle = "#3a2a20"; g.lineWidth = 3; g.beginPath(); g.moveTo(-22, shoulderY - 6); g.quadraticCurveTo(0, shoulderY + 70, 22, shoulderY - 6); g.stroke(); // cordino
    g.fillStyle = L.accent; g.strokeStyle = "#1e1410"; g.lineWidth = 3; g.beginPath(); g.roundRect(-12, shoulderY + 58, 24, 14, 4); g.fill(); g.stroke(); // fischietto
  } else {
    g.fillStyle = "#ffffff"; g.font = "900 64px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(s.number ?? 5), 0, (shoulderY + hipY) / 2 + 6);
    g.strokeStyle = "#ffffff"; g.lineWidth = 4; g.beginPath(); g.moveTo(-18, shoulderY - 6); g.lineTo(0, shoulderY + 14); g.lineTo(18, shoulderY - 6); g.stroke(); // scollo a V
  }

  // ——— testa ———
  const hr = 92;
  g.save();
  g.translate(0, neckY - hr * 0.75);
  g.rotate((s.headTilt ?? 0) + Math.sin((s.t ?? 0) * 0.9) * 0.02);
  // collo
  roundedLimb(g, 0, hr * 0.5, 0, hr * 0.95, 38, "#1e1410"); roundedLimb(g, 0, hr * 0.5, 0, hr * 0.95, 30, L.skinShade);
  // orecchie
  for (const side of [-1, 1]) { g.fillStyle = "#1e1410"; g.beginPath(); g.ellipse(side * hr * 0.95, 8, 18, 24, 0, 0, 7); g.fill(); g.fillStyle = L.skin; g.beginPath(); g.ellipse(side * hr * 0.95, 8, 14, 20, 0, 0, 7); g.fill(); }
  // faccia
  outline(g, (o) => { g.beginPath(); g.ellipse(0, 0, hr, hr * 1.05, 0, 0, 7); if (o) g.stroke(); else { const gr = g.createRadialGradient(-25, -30, 10, 0, 0, hr * 1.1); gr.addColorStop(0, L.skin); gr.addColorStop(1, L.skinShade); g.fillStyle = gr; g.fill(); } }, 8);
  // guance
  g.fillStyle = "rgba(230,110,90,0.18)"; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * 52, 28, 18, 11, 0, 0, 7); g.fill(); }
  // barba (Prof)
  if (L.beard) {
    g.fillStyle = L.beard; g.beginPath();
    g.moveTo(-hr * 0.9, 0); g.quadraticCurveTo(-hr * 0.95, hr * 0.9, 0, hr * 1.08); g.quadraticCurveTo(hr * 0.95, hr * 0.9, hr * 0.9, 0);
    g.quadraticCurveTo(hr * 0.6, hr * 0.45, 0, hr * 0.42); g.quadraticCurveTo(-hr * 0.6, hr * 0.45, -hr * 0.9, 0); g.fill();
  }
  // occhi
  const blink = clamp(s.blink ?? 0), look = s.look ?? [0, 0];
  for (const side of [-1, 1]) {
    const ex = side * 34, ey = -8;
    g.fillStyle = "#ffffff"; g.strokeStyle = "#1e1410"; g.lineWidth = 3.5;
    g.beginPath(); g.ellipse(ex, ey, 19, 23 * (1 - blink * 0.92), 0, 0, 7); g.fill(); g.stroke();
    if (blink < 0.8) {
      g.fillStyle = who === "STE" ? "#3d7bd6" : "#5a3a22"; g.beginPath(); g.arc(ex + look[0] * 7, ey + look[1] * 6, 11 * (1 - blink * 0.5), 0, 7); g.fill();
      g.fillStyle = "#120c08"; g.beginPath(); g.arc(ex + look[0] * 7, ey + look[1] * 6, 6, 0, 7); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ex + look[0] * 7 + 4, ey + look[1] * 6 - 4, 3, 0, 7); g.fill();
    }
    // sopracciglia
    const by = ey - 34 - (s.brow ?? 0) * 12, tilt = (s.browTilt ?? 0) * side;
    g.strokeStyle = L.hair; g.lineWidth = 9; g.lineCap = "round";
    g.beginPath(); g.moveTo(ex - 16, by + 4 + tilt * 8); g.quadraticCurveTo(ex, by - 4, ex + 16, by + 2 - tilt * 8); g.stroke();
  }
  // naso
  g.fillStyle = L.skinShade; g.beginPath(); g.ellipse(0, 22, 13, 10, 0, 0, 7); g.fill();
  // bocca: visemi
  const m = s.mouth ?? { open: 0, wide: 0, round: 0 };
  const mw = 26 + m.wide * 12 - m.round * 10, mh = 3 + m.open * 26 + m.round * 6;
  const my = 52 + (L.beard ? 4 : 0);
  if (mh < 6) { // bocca chiusa: sorriso o neutra
    g.strokeStyle = "#5a1e12"; g.lineWidth = 5; g.lineCap = "round";
    const sm = s.expr === "smile" ? 8 : s.expr === "wow" ? 0 : 3;
    g.beginPath(); g.moveTo(-mw * 0.8, my - sm * 0.4); g.quadraticCurveTo(0, my + sm, mw * 0.8, my - sm * 0.4); g.stroke();
  } else {
    g.fillStyle = "#1e1410"; g.beginPath(); g.ellipse(0, my + mh * 0.3, mw + 3, mh / 2 + 3, 0, 0, 7); g.fill();
    g.fillStyle = "#6b1f16"; g.beginPath(); g.ellipse(0, my + mh * 0.3, mw, mh / 2, 0, 0, 7); g.fill();
    if (mh > 12) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, my + mh * 0.3 - mh / 2 + 4, mw * 0.75, 4, 0, 0, 7); g.fill(); }
    if (mh > 16) { g.fillStyle = "#e0606a"; g.beginPath(); g.ellipse(0, my + mh * 0.3 + mh / 2 - 6, mw * 0.55, 5, 0, 0, 7); g.fill(); }
  }
  // capelli / cappellino
  if (L.cap) {
    outline(g, (o) => { g.beginPath(); g.moveTo(-hr * 1.02, -hr * 0.35); g.quadraticCurveTo(-hr, -hr * 1.25, 0, -hr * 1.2); g.quadraticCurveTo(hr, -hr * 1.25, hr * 1.02, -hr * 0.35); g.closePath(); if (o) g.stroke(); else { g.fillStyle = L.cap; g.fill(); } }, 8);
    g.fillStyle = L.cap; g.beginPath(); g.ellipse(hr * 0.55, -hr * 0.35, hr * 0.75, 16, -0.05, 0, 7); g.fill(); // visiera
    g.fillStyle = "#3a3633"; g.beginPath(); g.arc(0, -hr * 1.14, 7, 0, 7); g.fill();
  } else {
    g.fillStyle = L.hair; // ricci
    const curls = [[-70, -60, 30], [-40, -90, 32], [-5, -100, 34], [30, -95, 32], [65, -70, 30], [80, -35, 24], [-85, -30, 24], [-20, -70, 28], [20, -70, 28], [50, -50, 22], [-55, -45, 22]];
    for (const [cx, cy, r] of curls) { g.beginPath(); g.arc(cx, cy, r + 3, 0, 7); g.fillStyle = "#1e1410"; g.fill(); }
    for (const [cx, cy, r] of curls) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = L.hair; g.fill(); }
    g.fillStyle = "rgba(255,255,255,0.12)"; for (const [cx, cy, r] of curls.slice(0, 6)) { g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, 7); g.fill(); }
  }
  g.restore(); // testa

  // ——— braccio davanti ———
  const frontHand = arm(1, P.fs, P.fe);
  g.restore();
  return { backHand, frontHand };
}

/** Visemi italiani dal carattere che si sente all'istante tt di una battuta (ElevenLabs con tempi per lettera). */
export function visemeAt(al, tt) {
  let tag = false;
  for (let i = 0; i < al.chars.length; i++) {
    const ch = al.chars[i];
    if (ch === "[") tag = true;
    if (!tag && al.start[i] <= tt && tt < al.end[i]) {
      const c = ch.toLowerCase();
      if ("aàá".includes(c)) return { open: 1, wide: 0.3, round: 0 };
      if ("eèé".includes(c)) return { open: 0.55, wide: 0.8, round: 0 };
      if ("iì".includes(c)) return { open: 0.3, wide: 1, round: 0 };
      if ("oò".includes(c)) return { open: 0.7, wide: 0, round: 0.85 };
      if ("uù".includes(c)) return { open: 0.35, wide: 0, round: 1 };
      if ("mbp".includes(c)) return { open: 0, wide: 0, round: 0 };
      if ("fv".includes(c)) return { open: 0.12, wide: 0.4, round: 0 };
      if (/[a-z']/.test(c)) return { open: 0.3, wide: 0.3, round: 0 };
      return { open: 0, wide: 0, round: 0 };
    }
    if (ch === "]") tag = false;
  }
  return { open: 0, wide: 0, round: 0 };
}

/** Bocca morbida: media dei visemi in una piccola finestra, con anticipo di 40 ms (come nei cartoni). */
export function mouthFor(lines, who, t) {
  const acc = { open: 0, wide: 0, round: 0 }; let n = 0;
  for (let dt = -0.06; dt <= 0.02; dt += 0.01) {
    const tt = t + 0.04 + dt;
    for (const l of lines) if (l.chi === who && tt >= l.start && tt < l.start + l.dur) { const v = visemeAt(l.al, tt - l.start); acc.open += v.open; acc.wide += v.wide; acc.round += v.round; }
    n++;
  }
  return { open: acc.open / n, wide: acc.wide / n, round: acc.round / n };
}

export function blinkAt(t, seed) {
  let s = seed, tt = 0.7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  while (tt < 300) { if (t >= tt && t < tt + 0.15) return Math.sin(((t - tt) / 0.15) * Math.PI); tt += 2 + rnd() * 3.5; }
  return 0;
}
