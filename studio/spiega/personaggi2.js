// Prof e Ste con la grafica nuova (stessa dell'atleta biomeccanico): proporzioni vere (Winter), contorno scuro, colori piatti.
// Vista di fronte. Unità: cm (y in alto), convertiti in pixel con s.scale. Funziona su qualunque canvas 2D.
const R = Math.PI / 180;
const H = 180;
const M = { ankle: 0.039 * H, knee: 0.285 * H, hip: 0.53 * H, waist: 0.6 * H, sh: 0.818 * H, neck: 0.87 * H, head: 0.93 * H, headR: 0.068 * H, hipW: 0.1 * H, shW: 0.21 * H, uarm: 0.186 * H, farm: 0.146 * H };
const LINE = "#1e1410";
export const LOOKS = {
  STE: { skin: "#f1c6a3", skin2: "#d9a582", top: "#2f9a5c", top2: "#237647", legs: "#f4f2ec", socks: "#2f9a5c", shoe: "#1f1a16", hair: "#6b4226", number: "5", shorts: true },
  PROF: { skin: "#e2b08c", skin2: "#c8936f", top: "#e5652b", top2: "#c24f1c", legs: "#e5652b", socks: "#e5652b", shoe: "#2a2420", hair: "#2a2420", beard: "#3a2a1e", cap: "#20242c", shorts: false },
};
/** braccia nel piano frontale: u = apertura del braccio dal fianco, f = piega del gomito (+ verso l'esterno/alto, − verso il centro) */
export const POSES2 = {
  idle: { Lu: 8, Lf: 6, Ru: 8, Rf: 6 },
  explain: { Lu: 8, Lf: 6, Ru: 28, Rf: 95 },
  point: { Lu: 8, Lf: 6, Ru: 78, Rf: 8 },
  think: { Lu: 14, Lf: -70, Ru: 22, Rf: -150 },
  surprise: { Lu: 42, Lf: 70, Ru: 42, Rf: 70 },
  shrug: { Lu: 22, Lf: 85, Ru: 22, Rf: 85 },
  pull: { Lu: -45, Lf: -35, Ru: 72, Rf: 6 }, // tira una corda tesa verso la propria destra (sullo schermo)
};
export function mixPose2(a, b, k) { const o = {}; for (const key of ["Lu", "Lf", "Ru", "Rf"]) o[key] = (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * k; return o; }

/**
 * s = { x, y (pixel del punto tra i piedi a terra), scale (px per cm), pose:{Lu,Lf,Ru,Rf}, mouth:{open,wide,round},
 *       blink (0–1), look:[x,y] (−1..1), brow (0–1), browTilt, headTilt (rad), bob (px), t, flip (gira tutto: mano destra a destra) }
 */
export function drawPerson(g, who, s) {
  const L = LOOKS[who], sc = s.scale, sway = Math.sin((s.t ?? 0) * 1.3 + (who === "PROF" ? 1 : 0)) * 0.6;
  const X = (p) => [s.x + p[0] * sc, s.y - p[1] * sc + (s.bob ?? 0)];
  const lean = s.lean ?? 0; g.save(); if (lean) { g.translate(s.x, s.y); g.rotate(lean); g.translate(-s.x, -s.y); }
  const cap = (a, b, w, col, out = LINE) => { const A = X(a), Bp = X(b); g.lineCap = "round"; g.strokeStyle = out; g.lineWidth = w * sc + 5; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); g.strokeStyle = col; g.lineWidth = w * sc; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); };
  let P = s.pose ?? POSES2.idle;
  if (s.mirror) P = { Lu: P.Ru, Lf: P.Rf, Ru: P.Lu, Rf: P.Lf }; // il Prof sta a destra: indica e spiega con la mano verso Ste
  const cx = sway;
  // gambe
  for (const sd of [-1, 1]) {
    const hip = [cx + sd * M.hipW / 2, M.hip], knee = [sd * (M.hipW / 2 + 0.5), M.knee], ank = [sd * (M.hipW / 2 + 1.5), M.ankle];
    if (L.shorts) { cap(hip, [lerp(hip[0], knee[0], 0.55), lerp(hip[1], knee[1], 0.55)], 15, L.legs); cap([lerp(hip[0], knee[0], 0.5), lerp(hip[1], knee[1], 0.5)], knee, 12, L.skin); cap(knee, ank, 10.5, L.socks); }
    else { cap(hip, knee, 15, L.legs); cap(knee, ank, 12, L.legs); g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 2; const a = X([hip[0] + sd * 6, hip[1] - 4]), b = X([ank[0] + sd * 5, ank[1] + 4]); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    const f = X([ank[0] + sd * 2.5, 2.5]); g.fillStyle = LINE; g.beginPath(); g.ellipse(f[0], f[1], 7.5 * sc + 3, 3.2 * sc + 3, 0, 0, 7); g.fill(); g.fillStyle = L.shoe; g.beginPath(); g.ellipse(f[0], f[1], 7.5 * sc, 3.2 * sc, 0, 0, 7); g.fill();
  }
  // busto: trapezio dalle spalle ai fianchi
  const shL = [cx - M.shW / 2, M.sh], shR = [cx + M.shW / 2, M.sh];
  const torso = [[cx - M.shW / 2 - 1, M.sh + 3], [cx - M.hipW / 2 - 6, M.hip + 2], [cx + M.hipW / 2 + 6, M.hip + 2], [cx + M.shW / 2 + 1, M.sh + 3]].map(X);
  g.lineJoin = "round";
  for (const [col, w] of [[LINE, 11 * sc + 5], [L.top, 11 * sc]]) { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...torso[0]); torso.slice(1).forEach((p) => g.lineTo(...p)); g.closePath(); g.stroke(); g.fill(); }
  if (L.shorts) { // pantaloncini: dalla vita a metà coscia, due gambe
    for (const sd of [-1, 1]) { const a = X([cx + sd * (M.hipW / 2 - 1), M.hip + 2]), b = X([sd * (M.hipW / 2 + 1), M.hip - 15]);
      g.lineCap = "butt"; g.strokeStyle = LINE; g.lineWidth = 17 * sc + 5; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = L.legs; g.lineWidth = 17 * sc; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    const w0 = X([cx - M.hipW / 2 - 8, M.hip + 4]), w1 = X([cx + M.hipW / 2 + 8, M.hip - 6]); g.fillStyle = L.legs; g.fillRect(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1]); g.lineCap = "round";
  }
  if (L.number) { const n = X([cx, M.sh - 18]); g.fillStyle = "#fff"; g.font = `900 ${Math.round(16 * sc)}px Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(L.number, n[0], n[1]); g.textBaseline = "alphabetic"; }
  else { const a = X([cx, M.sh + 2]), b = X([cx, M.hip + 4]); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); const z = X([cx, M.sh - 10]); g.fillStyle = "#f2c14e"; g.fillRect(z[0] - 3, z[1] - 4, 6, 8); }
  // braccia
  const hands = {};
  for (const [sd, u, f, sh] of [[-1, P.Lu, P.Lf, shL], [1, P.Ru, P.Rf, shR]]) {
    const e = [sh[0] + sd * Math.sin(u * R) * M.uarm, sh[1] - Math.cos(u * R) * M.uarm];
    const h = [e[0] + sd * Math.sin((u + f) * R) * M.farm, e[1] - Math.cos((u + f) * R) * M.farm];
    cap(sh, e, 8.5, L.top); cap(e, h, 7, L.shorts ? L.skin : L.top);
    if (!L.shorts) { const w = [lerp(e[0], h[0], 0.82), lerp(e[1], h[1], 0.82)]; cap(w, h, 6.5, L.skin); }
    const hp = X(h); g.fillStyle = LINE; g.beginPath(); g.arc(hp[0], hp[1], 4.4 * sc + 2.5, 0, 7); g.fill(); g.fillStyle = L.skin; g.beginPath(); g.arc(hp[0], hp[1], 4.4 * sc, 0, 7); g.fill();
    hands[sd < 0 ? "L" : "R"] = hp;
  }
  // collo e testa
  cap([cx, M.sh], [cx, M.neck + 1], 9, L.skin);
  const hc = X([cx, M.head]), r = M.headR * sc, tilt = s.headTilt ?? 0;
  g.save(); g.translate(hc[0], hc[1]); g.rotate(tilt);
  for (const sd of [-1, 1]) { g.fillStyle = LINE; g.beginPath(); g.arc(sd * r * 0.98, r * 0.12, r * 0.26 + 2, 0, 7); g.fill(); g.fillStyle = L.skin2; g.beginPath(); g.arc(sd * r * 0.98, r * 0.12, r * 0.26, 0, 7); g.fill(); }
  g.fillStyle = LINE; g.beginPath(); g.ellipse(0, 0, r * 0.92 + 2.5, r + 2.5, 0, 0, 7); g.fill();
  g.fillStyle = L.skin; g.beginPath(); g.ellipse(0, 0, r * 0.92, r, 0, 0, 7); g.fill();
  if (L.beard) { g.fillStyle = L.beard; g.beginPath(); g.ellipse(0, r * 0.38, r * 0.86, r * 0.62, 0, 0, Math.PI); g.lineTo(-r * 0.86, r * 0.1); g.quadraticCurveTo(0, r * 0.25, r * 0.86, r * 0.1); g.fill(); }
  // occhi, sopracciglia
  const lk = s.look ?? [0, 0], bl = Math.min(1, s.blink ?? 0), brow = s.brow ?? 0, bt = s.browTilt ?? 0;
  for (const sd of [-1, 1]) {
    const ex = sd * r * 0.36, ey = -r * 0.08;
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(ex, ey, r * 0.2, r * 0.24 * (1 - bl * 0.92), 0, 0, 7); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2; g.stroke();
    if (bl < 0.8) { g.fillStyle = LINE; g.beginPath(); g.arc(ex + lk[0] * r * 0.08, ey - lk[1] * r * 0.08, r * 0.1, 0, 7); g.fill(); }
    g.strokeStyle = who === "PROF" ? L.hair : L.hair; g.lineWidth = Math.max(2.5, r * 0.11); g.lineCap = "round";
    g.beginPath(); g.moveTo(ex - r * 0.18, ey - r * 0.36 - brow * r * 0.14 + sd * bt * r * 0.08); g.lineTo(ex + r * 0.18, ey - r * 0.38 - brow * r * 0.14 - sd * bt * r * 0.08); g.stroke();
  }
  g.strokeStyle = L.skin2; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, r * 0.02); g.lineTo(-r * 0.06, r * 0.24); g.lineTo(r * 0.04, r * 0.27); g.stroke(); // naso
  // bocca (visemi dall'allineamento delle voci)
  const m = s.mouth ?? { open: 0, wide: 0, round: 0 }, mw = r * (0.26 + 0.12 * (m.wide ?? 0) - 0.1 * (m.round ?? 0)), mh = r * (0.04 + 0.3 * (m.open ?? 0));
  g.fillStyle = "#5a1f1a"; g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.ellipse(0, r * 0.5, mw, Math.max(1.5, mh), 0, 0, 7); g.fill(); g.stroke();
  if ((m.open ?? 0) > 0.25) { g.fillStyle = "#fff"; g.fillRect(-mw * 0.6, r * 0.5 - mh, mw * 1.2, mh * 0.35); }
  // capelli o cappello
  if (L.cap) {
    g.fillStyle = LINE; g.beginPath(); g.ellipse(0, -r * 0.55, r * 1.02 + 2, r * 0.62 + 2, 0, Math.PI, 0); g.fill();
    g.fillStyle = L.cap; g.beginPath(); g.ellipse(0, -r * 0.55, r * 1.0, r * 0.6, 0, Math.PI, 0); g.fill();
    g.fillStyle = LINE; g.fillRect(-r * 1.08, -r * 0.62, r * 2.16, r * 0.2); // visiera vista di fronte (fillRect: va anche sui Safari vecchi)
  } else {
    g.fillStyle = L.hair; for (const [dx, dy, rr] of [[-0.62, -0.62, 0.38], [-0.22, -0.86, 0.4], [0.22, -0.88, 0.4], [0.62, -0.62, 0.38], [0, -0.98, 0.34], [-0.85, -0.28, 0.24], [0.85, -0.28, 0.24]]) { g.beginPath(); g.arc(dx * r, dy * r, rr * r, 0, 7); g.fill(); }
  }
  g.restore();
  g.restore();
  if (lean) for (const k of Object.keys(hands)) { const [hx, hy] = hands[k], dx = hx - s.x, dy = hy - s.y; hands[k] = [s.x + dx * Math.cos(lean) - dy * Math.sin(lean), s.y + dx * Math.sin(lean) + dy * Math.cos(lean)]; }
  return hands;
}
const lerp = (a, b, k) => a + (b - a) * k;
