// Atleta di lato con regole del corpo vero: piedi fermi, ginocchio risolto con la cinematica inversa,
// braccia che pendono col peso, bilanciere sopra il centro del piede. Guarda a destra.
const D = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const S = { thigh: 122, shin: 116, torso: 158, uarm: 82, farm: 80, neck: 22, head: 34, foot: 50, heel: 14 };
const C = { skin: "#f1c6a3", skin2: "#d9a582", top: "#2f9a5c", top2: "#237647", shorts: "#f4f2ec", shorts2: "#cfcac0", sock: "#2f9a5c", sock2: "#237647", shoe: "#1f1a16", hair: "#6b4226", line: "#1e1410" };

/** ginocchio da anca e caviglia (due segmenti), piegato in avanti (verso destra) */
export function knee(hip, ankle) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), S.thigh + S.shin - 0.01);
  const a = Math.acos((S.thigh ** 2 + d * d - S.shin ** 2) / (2 * S.thigh * d));
  const base = Math.atan2(dy, dx);
  const ang = base - a; // ginocchio davanti (destra) quando la gamba va verso il basso
  return [hip[0] + Math.cos(ang) * S.thigh, hip[1] + Math.sin(ang) * S.thigh];
}
/** gomito da spalla e mano, piegato indietro/in basso (bend: +1 o -1) */
export function elbow(sh, hand, bend = 1) {
  const dx = hand[0] - sh[0], dy = hand[1] - sh[1];
  const d = Math.min(Math.hypot(dx, dy), S.uarm + S.farm - 0.01);
  const a = Math.acos((S.uarm ** 2 + d * d - S.farm ** 2) / (2 * S.uarm * d));
  const ang = Math.atan2(dy, dx) + bend * a;
  return [sh[0] + Math.cos(ang) * S.uarm, sh[1] + Math.sin(ang) * S.uarm];
}
/** anca dalla caviglia: distanza data dalla flessione del ginocchio, spostamento orizzontale dato */
export function hipFrom(ankle, dx, kneeFlex) {
  const d = Math.sqrt(S.thigh ** 2 + S.shin ** 2 - 2 * S.thigh * S.shin * Math.cos((180 - kneeFlex) * D));
  return [ankle[0] + dx, ankle[1] - Math.sqrt(Math.max(0, d * d - dx * dx))];
}
/** spalla e testa dal busto (lean in gradi dalla verticale, avanti = positivo) */
export function trunk(hip, lean, neckFlex = 0) {
  const sh = [hip[0] + Math.sin(lean * D) * S.torso, hip[1] - Math.cos(lean * D) * S.torso];
  const h = lean + neckFlex;
  const head = [sh[0] + Math.sin(h * D) * (S.neck + S.head), sh[1] - Math.cos(h * D) * (S.neck + S.head)];
  return { sh, head, headAng: h };
}

function seg(g, a, b, w, col) {
  g.lineCap = "round";
  g.strokeStyle = C.line; g.lineWidth = w + 6; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
}
function foot(g, ankle, col, heelUp = 0) {
  const toe = [ankle[0] + S.foot * Math.cos(-heelUp * D), ankle[1] + 12 + S.foot * Math.sin(-heelUp * D) * -1];
  const heel = [ankle[0] - S.heel, ankle[1] + 12 - Math.sin(heelUp * D) * 30];
  g.lineCap = "round"; g.strokeStyle = C.line; g.lineWidth = 26; g.beginPath(); g.moveTo(...heel); g.lineTo(...toe); g.stroke();
  g.strokeStyle = col; g.lineWidth = 20; g.beginPath(); g.moveTo(...heel); g.lineTo(...toe); g.stroke();
}

/**
 * P = { ankle, hip, lean, neckFlex, hands:[near, far], heelUp, bend:[near, far] }
 * tutte le articolazioni derivano da qui, così niente si stacca o scivola.
 */
export function drawAthlete(g, P) {
  const { sh, head, headAng } = trunk(P.hip, P.lean, P.neckFlex ?? 0);
  const k = knee(P.hip, P.ankle);
  const [hN, hF] = P.hands;
  const eN = elbow(sh, hN, P.bend?.[0] ?? 1), eF = elbow([sh[0] - 6, sh[1] + 2], hF, P.bend?.[1] ?? 1);
  const shF = [sh[0] - 6, sh[1] + 2], hipF = [P.hip[0] - 6, P.hip[1] + 2], kF = knee(hipF, [P.ankle[0] - 6, P.ankle[1]]);
  // lato lontano
  seg(g, hipF, kF, 38, C.shorts2); seg(g, kF, [P.ankle[0] - 6, P.ankle[1]], 30, C.sock2); foot(g, [P.ankle[0] - 6, P.ankle[1]], "#141110", P.heelUp ?? 0);
  seg(g, shF, eF, 26, C.top2); seg(g, eF, hF, 22, C.skin2);
  // busto: capsula dalla vita alle spalle, pantaloncini sotto
  const waist = [lerp(P.hip[0], sh[0], 0.22), lerp(P.hip[1], sh[1], 0.22)];
  seg(g, waist, sh, 66, C.top);
  seg(g, P.hip, waist, 64, C.shorts);
  // numero sulla schiena (si vede di lato solo un po')
  // testa
  const nb = [lerp(sh[0], head[0], 0.35), lerp(sh[1], head[1], 0.35)];
  seg(g, sh, nb, 26, C.skin);
  g.fillStyle = C.line; g.beginPath(); g.arc(head[0], head[1], S.head + 3, 0, 7); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.arc(head[0], head[1], S.head, 0, 7); g.fill();
  const ha = headAng * D, up = [Math.sin(ha), -Math.cos(ha)], fw = [Math.cos(ha), Math.sin(ha)];
  g.fillStyle = C.hair;
  for (const [u, f] of [[0.9, -0.5], [0.95, 0], [0.8, 0.45], [0.55, -0.85], [0.2, -1]]) { g.beginPath(); g.arc(head[0] + (up[0] * u + fw[0] * f) * S.head, head[1] + (up[1] * u + fw[1] * f) * S.head, 15, 0, 7); g.fill(); }
  g.fillStyle = C.line; g.beginPath(); g.arc(head[0] + fw[0] * 18 + up[0] * 4, head[1] + fw[1] * 18 + up[1] * 4, 4, 0, 7); g.fill(); // occhio
  // lato vicino
  seg(g, P.hip, k, 40, C.shorts); seg(g, k, P.ankle, 32, C.sock); foot(g, P.ankle, C.shoe, P.heelUp ?? 0);
  return { sh, head, knee: k, elbow: eN, drawNearArm: () => { seg(g, sh, eN, 28, C.top); seg(g, eN, hN, 24, C.skin); g.fillStyle = C.line; g.beginPath(); g.arc(hN[0], hN[1], 15, 0, 7); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.arc(hN[0], hN[1], 11, 0, 7); g.fill(); } };
}

export function plate(g, p, r = 62) {
  g.fillStyle = C.line; g.beginPath(); g.arc(p[0], p[1], r + 5, 0, 7); g.fill();
  g.fillStyle = "#3b6fd1"; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 4; g.beginPath(); g.arc(p[0], p[1], r * 0.7, 0, 7); g.stroke();
  g.fillStyle = "#cfd8e6"; g.beginPath(); g.arc(p[0], p[1], 10, 0, 7); g.fill();
}

/** Romanian deadlift: anche indietro, busto fino a ~75°, ginocchia quasi ferme, bilanciere sopra il centro del piede. */
export function rdl(u, ankle) {
  const cyc = 4.6, c = (u % cyc) / cyc;
  // 0–0.12 fermo in alto, 0.12–0.55 discesa lenta (2 s), 0.55–0.62 fermo in basso, 0.62–0.85 salita, poi fermo
  const k = c < 0.12 ? 0 : c < 0.55 ? smooth((c - 0.12) / 0.43) : c < 0.62 ? 1 : c < 0.85 ? 1 - smooth((c - 0.62) / 0.23) : 0;
  const lean = lerp(4, 74, k), kneeFlex = lerp(14, 22, k);
  const midfoot = ankle[0] + 18, armLen = S.uarm + S.farm - 4;
  // la mano pende sotto la spalla; il bilanciere deve restare sopra il centro del piede → la spalla sta sopra il piede
  const dx = midfoot - Math.sin(lean * D) * S.torso - ankle[0];
  const hip = hipFrom(ankle, dx, kneeFlex);
  const { sh } = trunk(hip, lean);
  const hand = [sh[0], sh[1] + armLen];
  return { k, P: { ankle, hip, lean, neckFlex: -lerp(0, 12, k), hands: [hand, [hand[0] - 4, hand[1]]] }, bar: hand };
}
