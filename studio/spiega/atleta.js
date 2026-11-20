// Ste visto di lato per gli esercizi: scheletro semplice con angoli (gradi, 0 = verso destra, 90 = verso il basso).
const D = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

export const SEG = { torso: 150, thigh: 112, shin: 108, uarm: 78, farm: 74, foot: 34, head: 36 };
const C = { skin: "#f1c6a3", skin2: "#d9a582", top: "#2f9a5c", top2: "#237647", shorts: "#f4f2ec", shorts2: "#d8d4ca", sock: "#2f9a5c", sock2: "#237647", shoe: "#1f1a16", hair: "#6b4226", line: "#1e1410" };

const v = (a, len) => [Math.cos(a * D) * len, Math.sin(a * D) * len];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];

/** posizioni di tutte le articolazioni da anca e angoli */
export function joints(hip, A) {
  const sh = add(hip, v(A.torso, SEG.torso));
  const head = add(sh, v(A.head ?? A.torso, SEG.head + 14));
  const leg = (th, sn) => { const k = add(hip, v(th, SEG.thigh)); const a = add(k, v(sn, SEG.shin)); return { k, a, toe: add(a, v(A.foot ?? 0, SEG.foot)) }; };
  const arm = (ua, fa) => { const e = add(sh, v(ua, SEG.uarm)); const w = add(e, v(fa, SEG.farm)); return { e, w }; };
  return { hip, sh, head, L1: leg(A.thigh, A.shin), L2: leg(A.thigh2 ?? A.thigh, A.shin2 ?? A.shin), R1: arm(A.uarm, A.farm), R2: arm(A.uarm2 ?? A.uarm, A.farm2 ?? A.farm) };
}

/** anca ricavata dalla caviglia appoggiata a terra (per gli esercizi in piedi) */
export function hipFromAnkle(ankle, A) {
  const s = v(A.shin, SEG.shin), t = v(A.thigh, SEG.thigh);
  return [ankle[0] - s[0] - t[0], ankle[1] - s[1] - t[1]];
}

function limb(g, a, b, w, col) {
  g.lineCap = "round"; g.strokeStyle = C.line; g.lineWidth = w + 7; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
}

export function drawSide(g, J, opt = {}) {
  const far = opt.far ?? true;
  // arto lontano (più scuro) prima
  if (far) {
    limb(g, J.hip, J.L2.k, 34, C.shorts2); limb(g, J.L2.k, J.L2.a, 28, C.sock2); limb(g, J.L2.a, J.L2.toe, 18, C.shoe);
    limb(g, J.sh, J.R2.e, 24, C.top2); limb(g, J.R2.e, J.R2.w, 20, C.skin2);
  }
  // busto
  limb(g, J.hip, J.sh, 58, C.top);
  limb(g, J.hip, add(J.hip, [(J.sh[0] - J.hip[0]) * 0.18, (J.sh[1] - J.hip[1]) * 0.18]), 60, C.shorts);
  // testa
  g.fillStyle = C.line; g.beginPath(); g.arc(J.head[0], J.head[1], SEG.head + 4, 0, 7); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.arc(J.head[0], J.head[1], SEG.head, 0, 7); g.fill();
  g.fillStyle = C.hair; for (const [dx, dy] of [[-12, -22], [8, -26], [22, -14], [-24, -6], [0, -32]]) { g.beginPath(); g.arc(J.head[0] + dx, J.head[1] + dy, 15, 0, 7); g.fill(); }
  // gamba e braccio vicini
  limb(g, J.hip, J.L1.k, 36, C.shorts); limb(g, J.L1.k, J.L1.a, 30, C.sock); limb(g, J.L1.a, J.L1.toe, 20, C.shoe);
  limb(g, J.sh, J.R1.e, 26, C.top); limb(g, J.R1.e, J.R1.w, 22, C.skin);
  for (const w of [J.R1.w]) { g.fillStyle = C.line; g.beginPath(); g.arc(w[0], w[1], 15, 0, 7); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.arc(w[0], w[1], 11, 0, 7); g.fill(); }
}

export function bar(g, p, plate = true) {
  if (plate) { g.fillStyle = C.line; g.beginPath(); g.arc(p[0], p[1], 50, 0, 7); g.fill(); g.fillStyle = "#3b6fd1"; g.beginPath(); g.arc(p[0], p[1], 45, 0, 7); g.fill(); g.fillStyle = "#cfd8e6"; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); }
}

export function arrow(g, from, to, color, label, k = 1) {
  if (k <= 0.01) return;
  const p = [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
  g.save(); g.globalAlpha = clamp(k * 1.5); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 10; g.lineCap = "round";
  g.shadowColor = color; g.shadowBlur = 14;
  g.beginPath(); g.moveTo(...from); g.lineTo(...p); g.stroke();
  const a = Math.atan2(p[1] - from[1], p[0] - from[0]);
  g.beginPath(); g.moveTo(p[0] + Math.cos(a) * 14, p[1] + Math.sin(a) * 14); g.lineTo(p[0] + Math.cos(a + 2.5) * 22, p[1] + Math.sin(a + 2.5) * 22); g.lineTo(p[0] + Math.cos(a - 2.5) * 22, p[1] + Math.sin(a - 2.5) * 22); g.fill();
  g.shadowBlur = 0;
  if (label) { g.font = "800 22px Inter"; g.textAlign = "center"; g.fillText(label, p[0] + Math.cos(a) * 40, p[1] + Math.sin(a) * 40 + 8); }
  g.restore();
}

/** pose degli esercizi in funzione del tempo u (secondi dall'inizio), ritorna {J, extra} */
export function exercisePose(type, u) {
  const loop = (period) => (u % period) / period;
  const FLOOR = 760;
  if (type === "plank") { // a cicli: corpo dritto (giusto) e anche che cadono con la schiena inarcata (sbagliato)
    const c = loop(6), sag = c < 0.45 ? 0 : c < 0.55 ? ease((c - 0.45) / 0.1) : c < 0.92 ? 1 : 1 - ease((c - 0.92) / 0.08);
    const shake = Math.sin(u * 18) * 1.2;
    const A = { torso: lerp(181, 192, sag), head: lerp(185, 196, sag), thigh: lerp(12, 3, sag), shin: lerp(12, 8, sag), foot: 75, uarm: 90, farm: 180 };
    const sh = [180, FLOOR - SEG.uarm - 4 + shake];
    const t = v(A.torso, SEG.torso), hip = [sh[0] - t[0], sh[1] - t[1]];
    return { J: joints(hip, A), floor: FLOOR, scale: 1.45, badge: sag > 0.5 ? { text: "No: schiena inarcata", color: "#ff5a5a" } : { text: "Sì: corpo in linea", color: "#47e3a6" } };
  }
  if (type === "hinge") { // stacco rumeno: busto dritto che si inclina, anca indietro
    const c = loop(4.2), k = c < 0.45 ? ease(c / 0.45) : c < 0.6 ? 1 : 1 - ease((c - 0.6) / 0.4);
    const A = { torso: lerp(266, 200, k), head: lerp(268, 205, k), thigh: lerp(92, 80, k), shin: lerp(90, 96, k), foot: 180, uarm: 90, farm: 90 };
    const hip = hipFromAnkle([330, FLOOR - 12], A);
    return { J: joints(hip, A), floor: FLOOR, barAt: "hand", k, scale: 1.25 };
  }
  if (type === "pallof") {
    const c = loop(3.6), k = c < 0.35 ? ease(c / 0.35) : c < 0.65 ? 1 : 1 - ease((c - 0.65) / 0.35);
    const A = { torso: 268, head: 270, thigh: 95, shin: 85, foot: 180, uarm: lerp(130, 178, k), farm: lerp(240, 180, k), thigh2: 85, shin2: 95 };
    const hip = hipFromAnkle([380, FLOOR - 12], A);
    return { J: joints(hip, A), floor: FLOOR, band: true, k, scale: 1.25 };
  }
  if (type === "tripla") { // carico → estensione esplosiva di caviglie, ginocchia, anche
    const c = loop(3), k = c < 0.4 ? ease(c / 0.4) * 0 : c < 0.55 ? ease((c - 0.4) / 0.15) : c < 0.8 ? 1 : 1 - ease((c - 0.8) / 0.2);
    const A = { torso: lerp(240, 268, k), head: lerp(245, 270, k), thigh: lerp(55, 92, k), shin: lerp(115, 88, k), foot: lerp(180, 120, k), uarm: lerp(95, 75, k), farm: lerp(95, 70, k) };
    const ankle = [360, FLOOR - 12 - k * 22];
    const hip = hipFromAnkle(ankle, A);
    return { J: joints(hip, A), floor: FLOOR, barAt: "hand", k, joints3: true, scale: 1.25 };
  }
  if (type === "snatch" || type === "snatch_pull") {
    // fotogrammi chiave: partenza, prima tirata (bilanciere al ginocchio), seconda tirata (tripla estensione), incastro, in piedi
    const KF = [
      { n: "Partenza", torso: 215, head: 222, thigh: 20, shin: 115, foot: 180, uarm: 90, farm: 90 },
      { n: "Prima tirata", torso: 225, head: 232, thigh: 60, shin: 98, foot: 180, uarm: 90, farm: 90 },
      { n: "Seconda tirata", torso: 268, head: 272, thigh: 95, shin: 88, foot: 125, uarm: 70, farm: 60 },
      { n: "Incastro", torso: 250, head: 255, thigh: 15, shin: 120, foot: 180, uarm: 260, farm: 265 },
      { n: "In piedi", torso: 268, head: 270, thigh: 92, shin: 90, foot: 180, uarm: 262, farm: 266 },
    ];
    const seq = type === "snatch" ? [0, 1, 2, 3, 4] : [0, 1, 2, 1];
    const per = type === "snatch" ? 1.25 : 1.1;
    const tot = seq.length * per + 0.8, cu = u % tot;
    const i = Math.min(seq.length - 1, Math.floor(cu / per)), f = ease(clamp((cu - i * per) / (per * 0.6)));
    const a = KF[seq[i]], b = KF[seq[Math.min(seq.length - 1, i + 1)]] ?? a;
    const last = i === seq.length - 1;
    const A = {}; for (const key of ["torso", "head", "thigh", "shin", "foot", "uarm", "farm"]) A[key] = last ? a[key] : lerp(a[key], b[key], f);
    const ankle = [360, FLOOR - 12 - (A.foot < 160 ? 18 : 0)];
    const hip = hipFromAnkle(ankle, A);
    return { J: joints(hip, A), floor: FLOOR, barAt: "hand", phase: (last || f < 0.5 ? a : b).n, scale: 1.2 };
  }
  return null;
}
