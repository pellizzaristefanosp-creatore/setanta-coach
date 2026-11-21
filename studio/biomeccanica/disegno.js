// Disegno condiviso: Ste con le proporzioni vere (Winter), di lato, di fronte e dall'alto. Unità del modello: cm, y in alto.
import { lerp } from "./modello.js";
export const C = { skin: "#f1c6a3", skin2: "#d9a582", top: "#2f9a5c", top2: "#237647", shorts: "#f4f2ec", shorts2: "#cfcac0", sock: "#2f9a5c", sock2: "#237647", shoe: "#1f1a16", hair: "#6b4226", line: "#1e1410", bad: "#ff5a5a", ok: "#47e3a6", gold: "#ffe08a", force: "rgba(255,138,76,0.95)", react: "rgba(71,227,166,0.85)" };

/** vista: s = px per cm, (ox, floorY) = punto del modello (0,0) sullo schermo */
export function view(g, s, ox, floorY) {
  const X = (p) => [ox + p[0] * s, floorY - p[1] * s];
  const line = (A, Bp, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); };
  const seg = (a, b, wcm, col, out = C.line) => { g.lineCap = "round"; line(X(a), X(b), wcm * s + 6, out); line(X(a), X(b), wcm * s, col); };
  const poly = (pts, wcm, col, out = C.line) => { const P = pts.map(X); g.lineCap = "round"; g.lineJoin = "round"; for (const [c, w] of [[out, wcm * s + 6], [col, wcm * s]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(...P[0]); for (const p of P.slice(1)) g.lineTo(...p); g.stroke(); } };
  const dot = (p, rpx, col, out = C.line) => { const q = X(p); g.fillStyle = out; g.beginPath(); g.arc(q[0], q[1], rpx + 3, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(q[0], q[1], rpx, 0, 7); g.fill(); };
  return { g, s, ox, floorY, X, seg, poly, dot };
}

export function arrow(g, from, to, col, w = 7) {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(...from); g.lineTo(...to); g.stroke();
  g.beginPath(); g.moveTo(to[0] + Math.cos(a) * 12, to[1] + Math.sin(a) * 12); g.lineTo(to[0] + Math.cos(a + 2.5) * 18, to[1] + Math.sin(a + 2.5) * 18); g.lineTo(to[0] + Math.cos(a - 2.5) * 18, to[1] + Math.sin(a - 2.5) * 18); g.fill();
}
export function pill(g, text, x, y, col, size = 24) {
  g.font = `800 ${size}px Inter`; g.textAlign = "center"; const w = g.measureText(text).width + 28;
  g.fillStyle = "rgba(8,16,32,0.9)"; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.roundRect(x - w / 2, y - size * 0.85, w, size * 1.7, 14); g.fill(); g.stroke();
  g.fillStyle = col; g.fillText(text, x, y + size * 0.35);
}
export function board(g, W, H) {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#081428"); bg.addColorStop(1, "#04070f"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(90,160,255,0.07)"; g.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
}
/** tabella: righe [nome, valore testo, colore?] */
export function table(g, x, y, w, title, rows) {
  const h = 44 + rows.length * 28;
  g.fillStyle = "rgba(8,16,32,0.85)"; g.beginPath(); g.roundRect(x, y, w, h, 16); g.fill();
  g.textAlign = "left"; g.font = "800 18px Inter"; g.fillStyle = "#cfe4ff"; g.fillText(title, x + 16, y + 28);
  rows.forEach(([n, v, col], i) => {
    const yy = y + 58 + i * 28;
    if (v === undefined) { g.font = "700 15px Inter"; g.fillStyle = col ?? "#cfe4ff"; g.fillText(n, x + 16, yy); return; }
    g.font = "600 17px Inter"; g.fillStyle = "rgba(207,228,255,0.8)"; g.textAlign = "left"; g.fillText(n, x + 16, yy);
    g.textAlign = "right"; g.font = "800 18px Inter"; g.fillStyle = col ?? "#fff"; g.fillText(v, x + w - 16, yy); g.textAlign = "left";
  });
  return h;
}

/** testa di lato (guarda nella direzione headA) */
function headSide(V, J, r, red) {
  const { g } = V, h = V.X(J.head);
  const ha = (J.headA * Math.PI) / 180, up = [Math.sin(ha), -Math.cos(ha)], fw = [Math.cos(ha), Math.sin(ha)];
  g.fillStyle = red ? C.bad : C.line; g.beginPath(); g.arc(h[0], h[1], r + 3, 0, 7); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.arc(h[0], h[1], r, 0, 7); g.fill();
  g.fillStyle = C.hair; for (const [u, f] of [[0.85, -0.45], [0.95, 0.05], [0.75, 0.5], [0.45, -0.85], [0.05, -0.98]]) { g.beginPath(); g.arc(h[0] + (up[0] * u + fw[0] * f) * r, h[1] + (up[1] * u + fw[1] * f) * r, r * 0.42, 0, 7); g.fill(); }
  g.fillStyle = C.line; g.beginPath(); g.arc(h[0] + fw[0] * r * 0.55 + up[0] * r * 0.1, h[1] + fw[1] * r * 0.55 + up[1] * r * 0.1, 4, 0, 7); g.fill();
  g.fillStyle = C.skin2; g.beginPath(); g.arc(h[0] - fw[0] * r * 0.1, h[1] - fw[1] * r * 0.1, r * 0.22, 0, 7); g.fill();
}

/** Ste di lato. bad = segmenti sbagliati in rosso: { busto, collo, anca, gambe } */
export function drawSide(V, B, J, { bad = {}, nearArm = true } = {}) {
  const far = (p) => [p[0] - 1.5, p[1] + 0.5];
  const foot = (J2, col) => V.poly([J2.heel, J2.ball, J2.toe], 6.3, col);
  const farJ = { heel: far(J.heel), ball: far(J.ball), toe: far(J.toe) };
  V.poly([far(J.hip), far(J.knee)], 14, C.shorts2, bad.gambe ? C.bad : C.line); V.poly([far(J.knee), far(J.ankle)], 10, C.sock2); foot(farJ, "#141110"); V.seg(far(J.ankle), far(J.ball), 7, "#141110");
  V.poly([far(J.sh), far(J.elbow)], 8.5, C.top2); V.poly([far(J.elbow), far(J.hand)], 7, C.skin2);
  const waist = [lerp(J.hip[0], J.mid[0], 0.45), lerp(J.hip[1], J.mid[1], 0.45)];
  V.poly([waist, J.mid, J.sh], 24, C.top, bad.busto ? C.bad : C.line);
  V.poly([J.hip, waist], 23, C.shorts, bad.anca ? C.bad : C.line);
  const neck = [lerp(J.sh[0], J.head[0], 0.45), lerp(J.sh[1], J.head[1], 0.45)];
  V.seg(J.sh, neck, 10, C.skin, bad.collo ? C.bad : C.line);
  headSide(V, J, B.L.headR * V.s * 1.08, bad.collo);
  V.poly([J.hip, J.knee], 15, C.shorts, bad.gambe ? C.bad : C.line); V.poly([J.knee, J.ankle], 10.5, C.sock); V.seg(J.ankle, J.ball, 7.5, C.shoe); foot(J, C.shoe);
  if (nearArm) drawNearArm(V, J);
}
export function drawNearArm(V, J) {
  V.poly([J.sh, J.elbow], 9, C.top); V.poly([J.elbow, J.wrist, J.hand], 7.5, C.skin);
  const h = V.X(J.hand), g = V.g; g.fillStyle = C.line; g.beginPath(); g.arc(h[0], h[1], 15, 0, 7); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.arc(h[0], h[1], 11, 0, 7); g.fill();
}
/** disco olimpico (raggio 22,5 cm) visto di lato */
export function plate(V, p) {
  const { g, s } = V, q = V.X(p);
  g.fillStyle = C.line; g.beginPath(); g.arc(q[0], q[1], 22.5 * s + 4, 0, 7); g.fill();
  g.fillStyle = "rgba(59,111,209,0.92)"; g.beginPath(); g.arc(q[0], q[1], 22.5 * s, 0, 7); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 4; g.beginPath(); g.arc(q[0], q[1], 16 * s, 0, 7); g.stroke();
  g.fillStyle = "#cfd8e6"; g.beginPath(); g.arc(q[0], q[1], 9, 0, 7); g.fill();
}
/** pavimento, verticale del mesopiede e baricentro */
export function ground(V, W, label = true) {
  const { g } = V; g.strokeStyle = "rgba(207,228,255,0.4)"; g.lineWidth = 4; g.beginPath(); g.moveTo(30, V.floorY); g.lineTo(W - 30, V.floorY); g.stroke();
  g.setLineDash([12, 10]); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(V.ox, 330); g.lineTo(V.ox, V.floorY); g.stroke(); g.setLineDash([]);
  if (label) { g.font = "700 17px Inter"; g.fillStyle = "rgba(255,255,255,0.6)"; g.textAlign = "center"; g.fillText("mesopiede", V.ox, V.floorY + 28); }
}
export function comDot(V, p) { const { g } = V, q = V.X(p); g.fillStyle = "#ff3b3b"; g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(q[0], q[1], 11, 0, 7); g.fill(); g.stroke(); }
export function trail(V, pts, col = "rgba(255,224,138,0.75)") { const { g } = V; if (pts.length < 2) return; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); pts.map(V.X).forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); }

/** Ste di fronte. P = { feet:[{hip,knee,ankle,side,swing}], hipL, hipR, shL, shR, neck, head, handL, handR, elbowL?, elbowR? } */
export function drawFront(g, X, s, B, P, { red = false, redArm = false } = {}) {
  const cap = (a, b, wcm, col, out = C.line) => { const A = X(a), Bp = X(b); g.lineCap = "round"; g.strokeStyle = out; g.lineWidth = wcm * s + 6; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); g.strokeStyle = col; g.lineWidth = wcm * s; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); };
  // gambe (la gamba in volo un po' più scura)
  for (const f of P.feet) {
    const col = f.swing > 0 ? C.sock2 : C.sock;
    cap(f.hip, f.knee, 15, C.shorts); cap(f.knee, f.ankle, 10.5, col);
    const a = X(f.ankle); g.fillStyle = C.line; g.beginPath(); g.ellipse(a[0] + f.side * 4, a[1] + 10, 10 * s * 0.5 + 3, 8, 0, 0, 7); g.fill(); g.fillStyle = C.shoe; g.beginPath(); g.ellipse(a[0] + f.side * 4, a[1] + 10, 10 * s * 0.5, 6, 0, 0, 7); g.fill();
  }
  // bacino e busto
  cap(P.hipR, P.hipL, 22, C.shorts);
  const trunk = [[P.shR[0] + 4, P.shR[1] - 4], [P.hipR[0] - 2, P.hipR[1] + 6], [P.hipL[0] + 2, P.hipL[1] + 6], [P.shL[0] - 4, P.shL[1] - 4]].map(X);
  g.fillStyle = red ? C.bad : C.line; g.beginPath(); g.moveTo(...trunk[0]); trunk.slice(1).forEach((p) => g.lineTo(...p)); g.closePath(); g.lineJoin = "round"; g.lineWidth = 46; g.strokeStyle = red ? C.bad : C.line; g.stroke(); g.fill();
  g.fillStyle = C.top; g.strokeStyle = C.top; g.lineWidth = 36; g.beginPath(); g.moveTo(...trunk[0]); trunk.slice(1).forEach((p) => g.lineTo(...p)); g.closePath(); g.stroke(); g.fill();
  const n = X([lerp(P.shR[0], P.shL[0], 0.5), lerp(P.shR[1], P.hipR[1], 0.35)]); g.fillStyle = "#fff"; g.font = "900 40px Inter"; g.textAlign = "center"; g.fillText("5", n[0], n[1] + 14);
  // braccia
  if (P.elbowL) { cap(P.shL, P.elbowL, 8.5, C.top); cap(P.shR, P.elbowR, 8.5, C.top); cap(P.elbowL, P.handL, 7.5, C.skin); cap(P.elbowR, P.handR, 7.5, C.skin); } else {
  cap(P.shL, P.handL, 8.5, C.top); cap([lerp(P.shL[0], P.handL[0], 0.45), lerp(P.shL[1], P.handL[1], 0.45)], P.handL, 7.5, C.skin);
  cap(P.shR, P.handR, 8.5, C.top, redArm ? C.bad : C.line); cap([lerp(P.shR[0], P.handR[0], 0.45), lerp(P.shR[1], P.handR[1], 0.45)], P.handR, 7.5, C.skin); }
  // collo e testa con il viso
  cap(P.neck, [lerp(P.neck[0], P.head[0], 0.5), lerp(P.neck[1], P.head[1], 0.5)], 10, C.skin);
  const h = X(P.head), r = B.L.headR * s * 1.08;
  g.fillStyle = C.skin2; for (const sd of [-1, 1]) { g.beginPath(); g.arc(h[0] + sd * r, h[1] + 2, r * 0.25, 0, 7); g.fill(); }
  g.fillStyle = C.line; g.beginPath(); g.arc(h[0], h[1], r + 3, 0, 7); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.arc(h[0], h[1], r, 0, 7); g.fill();
  g.fillStyle = C.hair; for (const [dx, dy] of [[-0.6, -0.65], [-0.2, -0.85], [0.25, -0.85], [0.62, -0.6], [0, -0.95]]) { g.beginPath(); g.arc(h[0] + dx * r, h[1] + dy * r, r * 0.42, 0, 7); g.fill(); }
  g.fillStyle = C.line; for (const sd of [-1, 1]) { g.beginPath(); g.arc(h[0] + sd * r * 0.35, h[1] + r * 0.05, 3.5, 0, 7); g.fill(); }
  g.strokeStyle = C.line; g.lineWidth = 2.5; g.beginPath(); g.arc(h[0], h[1] + r * 0.3, r * 0.25, 0.2, Math.PI - 0.2); g.stroke();
}
