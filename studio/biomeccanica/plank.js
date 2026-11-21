// Plank sui gomiti, di lato. Appoggi fissi: avambracci e punte. Corretto: spalla–anca–caviglia in linea, collo neutro.
// Errore (McGill): anche ~10 cm sotto la linea, anca in iperestensione, collo esteso ~−25°.
import { body, lerp, clamp, R } from "./modello.js";
import { view, drawSide, drawNearArm, board, pill, table, arrow, comDot, C } from "./disegno.js";

export const B = body(180, 78);
export const meta = { id: "plank", nome: "Plank sui gomiti", vista: "lato", durata: 12, errore: 6.5, fonti: ["McGill, Low Back Disorders", "Winter 2009"] };
export const KEYS = [
  { nome: "Tenuta corretta", t: 0, abbassamento_anca_cm: 0, collo: 0, nota: "spalla sopra il gomito, corpo in linea, respiro" },
  { nome: "Errore", t: 0, abbassamento_anca_cm: 10, collo: -25, nota: "anche che cadono, lombare inarcata, testa estesa" },
];
const dir = (a) => [Math.sin(a * R), Math.cos(a * R)];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

/** pose: la testa guarda a destra, i piedi sono a sinistra */
export function pose(t, wrong = 0) {
  const { L } = B;
  const breath = Math.sin(t * 2 * Math.PI / 4) * 0.25; // solo il respiro (ciclo di 4 s)
  const elbow = [0, 3.5], sh = [0, 3.5 + L.uarm + breath * 0.3]; // gomito a terra (spessore avambraccio), omero verticale
  const hand = [L.farm + L.grip * 0.5, 3.5], wrist = [L.farm, 3.5];
  const toe = [-(L.trunk + L.thigh + L.shank) - 14, 0];
  const ankle = [toe[0] + 8, 12]; // in punta: caviglia ~9 cm da terra
  const lineAng = Math.atan2(sh[0] - ankle[0], sh[1] - ankle[1]) / R; // direzione caviglia→spalla
  const drop = 10 * wrong;
  // anca: sulla linea (corretto) oppure ruotata attorno alla spalla di quanto serve per scendere di `drop` cm
  const back = lineAng + 180; // dalla spalla verso i piedi
  const alpha = Math.asin(clamp(drop / L.trunk, 0, 0.9)) / R;
  const hip = add(sh, dir(back - alpha), L.trunk);
  // ginocchio: cinematica inversa tra anca e caviglia (si piega pochissimo verso il basso)
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1], d = Math.min(Math.hypot(dx, dy), L.thigh + L.shank - 0.01);
  const a0 = Math.atan2(dy, dx), aa = Math.acos(clamp((L.thigh ** 2 + d * d - L.shank ** 2) / (2 * L.thigh * d), -1, 1));
  const knee = [hip[0] + Math.cos(a0 - aa) * L.thigh, hip[1] + Math.sin(a0 - aa) * L.thigh];
  const mid = [lerp(hip[0], sh[0], 0.5), lerp(hip[1], sh[1], 0.5) - wrong * 1.5 + breath];
  const trunkA = Math.atan2(sh[0] - hip[0], sh[1] - hip[1]) / R;
  const collo = -25 * wrong;
  const headA = trunkA + collo;
  const head = add(sh, dir(headA), L.headC);
  const heel = [ankle[0] - 2, 18], ball = [toe[0] + 2, 3];
  const J = { ankle, heel, ball, toe, knee, hip, mid, sh, head, headA, elbow, wrist, hand };
  // deviazione dell'anca dalla linea spalla–caviglia
  const vx = sh[0] - ankle[0], vy = sh[1] - ankle[1], dev = ((hip[0] - ankle[0]) * vy - (hip[1] - ankle[1]) * vx) / Math.hypot(vx, vy);
  const thighA = Math.atan2(hip[0] - knee[0], hip[1] - knee[1]) / R;
  const angoli = { busto: trunkA, anca: thighA - trunkA, ginocchio: Math.abs(thighA - Math.atan2(knee[0] - ankle[0], knee[1] - ankle[1]) / R), collo, spalla: 90 };
  // baricentro e reazioni: gomiti e punte si dividono il peso secondo le leve
  const m = B.m, P = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const parts = [[2 * m.foot, ankle], [2 * m.shank, P(knee, ankle, 0.567)], [2 * m.thigh, P(hip, knee, 0.567)], [m.trunk, mid], [m.head, head], [2 * m.uarm, P(sh, elbow, 0.436)], [2 * (m.farm + m.hand), P(elbow, hand, 0.5)]];
  let mx = 0, my = 0, mt = 0; for (const [mm, p] of parts) { mx += mm * p[0]; my += mm * p[1]; mt += mm; }
  const com = [mx / mt, my / mt];
  const elbowShare = (com[0] - toe[0]) / (elbow[0] - toe[0]);
  return { J, com, dev, angoli, elbowShare, contacts: { elbow, toe } };
}

export function render(g, W, H, t, wrong, { compact = false } = {}) {
  compact ? g.clearRect(0, 0, W, H) : board(g, W, H);
  const P = pose(t, wrong), s = 2.85, V = view(g, s, 585, 900);
  if (!compact) {
    g.font = "900 36px Inter"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(meta.nome, W / 2, 62);
    g.font = "600 19px Inter"; g.fillStyle = "rgba(207,228,255,0.75)"; g.fillText("Atleta 1,80 m · 78 kg · vista di lato · appoggi: avambracci e punte", W / 2, 92);
  }
  pill(g, wrong > 0.5 ? "Errore: anche che cadono, testa estesa" : "Corretto: corpo in linea", W / 2, compact ? 600 : 140, wrong > 0.5 ? C.bad : C.ok, 24);
  g.strokeStyle = "rgba(207,228,255,0.4)"; g.lineWidth = 4; g.beginPath(); g.moveTo(20, V.floorY); g.lineTo(W - 20, V.floorY); g.stroke();
  drawSide(V, B, P.J, { bad: wrong > 0.5 ? { anca: true, busto: true, collo: true } : {} });
  // linea ideale spalla–caviglia
  const A = V.X(P.J.ankle), S = V.X(P.J.sh);
  g.setLineDash([12, 10]); g.strokeStyle = "rgba(71,227,166,0.8)"; g.lineWidth = 3; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(A[0] - 30, A[1] + (A[1] - S[1]) / (S[0] - A[0]) * 30); g.lineTo(S[0] + 40, S[1] - (A[1] - S[1]) / (S[0] - A[0]) * 40); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  // forze: peso dal baricentro, reazioni a gomiti e punte (proporzionali)
  const cm = V.X(P.com), Wt = B.M * 1.4;
  arrow(g, [cm[0], cm[1] + 12], [cm[0], cm[1] + 12 + Wt], C.force);
  const E = V.X(P.contacts.elbow), T = V.X(P.contacts.toe);
  arrow(g, [E[0], E[1] - 2], [E[0], E[1] - 2 - Wt * P.elbowShare], C.react);
  arrow(g, [T[0], T[1] - 2], [T[0], T[1] - 2 - Wt * (1 - P.elbowShare)], C.react);
  comDot(V, P.com);
  if (wrong > 0.5) { const h = V.X(P.J.hip); arrow(g, [h[0], h[1] - 70], [h[0], h[1] - 8], C.bad); pill(g, `anca ${Math.abs(P.dev).toFixed(0)} cm sotto la linea`, h[0], h[1] - 100, C.bad, 20); }
  pill(g, `gomiti ${(P.elbowShare * 100).toFixed(0)}%`, E[0], V.floorY + 44, "#47e3a6", 18);
  pill(g, `punte ${((1 - P.elbowShare) * 100).toFixed(0)}%`, T[0] + 30, V.floorY + 44, "#47e3a6", 18);
  if (!compact) {
    const ok = Math.abs(P.dev) <= 1;
    table(g, 24, 180, 230, "Angoli", [["Busto (dall'orizz.)", `${(90 - Math.abs(P.angoli.busto)).toFixed(0)}°`], ["Anca", `${P.angoli.anca.toFixed(0)}°`, wrong > 0.5 ? C.bad : "#fff"], ["Ginocchio", `${P.angoli.ginocchio.toFixed(0)}°`], ["Collo", `${P.angoli.collo.toFixed(0)}°`, wrong > 0.5 ? C.bad : "#fff"], ["Spalla", "90°"]]);
    table(g, W - 330, 180, 306, "Controlli", [[`${ok ? "✓" : "✗"} anca a ${Math.abs(P.dev).toFixed(1)} cm dalla linea`, undefined, ok ? C.ok : C.bad], ["✓ gomiti e punte fermi", undefined, C.ok], ["✓ spalla sopra il gomito", undefined, C.ok]]);
    g.font = "600 16px Inter"; g.fillStyle = "rgba(207,228,255,0.55)"; g.textAlign = "center"; g.fillText("McGill, Low Back Disorders · Winter 2009 · Schema semplificato", W / 2, 1250);
  }
}

export function checks() {
  const f = [], b = pose(0);
  for (let t = 0; t < 8; t += 1 / 30) {
    const P = pose(t, 0);
    if (Math.abs(P.dev) > 1) f.push(`${t.toFixed(2)}s anca a ${P.dev.toFixed(1)} cm dalla linea`);
    for (const k of ["elbow", "toe"]) if (Math.hypot(P.contacts[k][0] - b.contacts[k][0], P.contacts[k][1] - b.contacts[k][1]) > 1e-9) f.push(`${t.toFixed(2)}s ${k} si è mosso`);
  }
  const w = pose(0, 1); if (Math.abs(w.dev) < 4 || Math.abs(w.dev) > 12) f.push(`errore: anca a ${w.dev.toFixed(1)} cm (atteso 4–12)`);
  return { f, info: `anca dalla linea: corretto ${pose(0).dev.toFixed(1)} cm, errore ${pose(0, 1).dev.toFixed(1)} cm; gomiti ${(pose(0).elbowShare * 100).toFixed(0)}% del peso` };
}
