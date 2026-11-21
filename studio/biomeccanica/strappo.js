// Strappo (snatch) e tirata (snatch pull), di lato. Presa larga: nella vista di lato le braccia sembrano più corte (armK).
// Tirate a braccia tese col bilanciere a contatto delle gambe; altezze del bilanciere in % della statura (Harbili 2012: picco 69–72 %).
// Traiettoria a S: verso l'atleta nella prima tirata, in fuori nella seconda, di nuovo indietro nella ricezione.
import { body, chain, centerOfMass, legGap, armToBar, lerp, clamp, R } from "./modello.js";
import { view, drawSide, drawNearArm, plate, ground, comDot, trail, board, pill, table, arrow, C } from "./disegno.js";

export const B = body(180, 78);
export const LOAD = 50, ARMK = 0.83; // kg; proiezione delle braccia con la presa larga (~34° di abduzione) [Probabile]
const L = B.L, ARM = (L.uarm + L.farm + L.grip) * ARMK;

/** risolve ginocchio e caviglia per avere il bilanciere all'altezza h (cm), a contatto delle gambe, baricentro sul punto tx */
function pullPose(busto, h, { tallone = 0, collo = -8, gap = 1, tx = 0 } = {}) {
  const solveC = (gin) => { // caviglia per l'equilibrio
    let lo = -25, hi = 50, sp = 0;
    for (let i = 0; i < 32; i++) { const c = (lo + hi) / 2; sp = armToBar(B, { busto, ginocchio: gin, caviglia: c, collo, tallone, armK: ARMK }, gap);
      const J = chain(B, { busto, ginocchio: gin, caviglia: c, spalla: sp, collo, tallone, armK: ARMK }); if (centerOfMass(B, J, LOAD, J.hand)[0] < tx) lo = c; else hi = c; }
    return { caviglia: (lo + hi) / 2, spalla: sp };
  };
  let lo = -2, hi = 140, best;
  for (let i = 0; i < 30; i++) { const gin = (lo + hi) / 2, s = solveC(gin), J = chain(B, { busto, ginocchio: gin, collo, tallone, armK: ARMK, ...s });
    best = { busto, ginocchio: gin, collo, tallone, armK: ARMK, ...s }; if (J.hand[1] > h) lo = gin; else hi = gin; }
  return best;
}
/** sopra la testa a braccia tese: bilanciere sul mesopiede, baricentro sul mesopiede */
function overheadPose(busto, ginocchio, collo = 0) {
  let lo = -25, hi = 60, a;
  for (let i = 0; i < 40; i++) {
    const c = (lo + hi) / 2, J0 = chain(B, { busto, ginocchio, caviglia: c, collo, spalla: 0, armK: ARMK });
    const arm = Math.asin(clamp((0 - J0.sh[0]) / ARM, -1, 1)) / R; // angolo dal verticale verso l'alto
    a = { busto, ginocchio, caviglia: c, collo, bracciaAss: arm, armK: ARMK };
    const J = chain(B, a); if (centerOfMass(B, J, LOAD, J.hand)[0] < 0) lo = c; else hi = c;
  }
  return a;
}

const pct = (p) => (p / 100) * B.H; // altezza in % della statura
// fotogrammi chiave dello strappo (tempi da Harbili 2012 / Gourgoulis 2000, adattati)
function snatchKeys(wrong) {
  return [
    { nome: "Partenza", t: 0, mode: "pull", busto: 55, h: 22.5 },
    { nome: "Ginocchio (fine prima tirata)", t: 0.4, curva: "in", mode: "pull", busto: lerp(52, 66, wrong), h: pct(29) },
    { nome: "Tasca / alto coscia", t: 0.58, curva: "lineare", mode: "pull", busto: 12, h: pct(44), gap: 1.5 },
    { nome: "Massima estensione", t: 0.68, curva: "lineare", mode: "pull", busto: -6, h: null, tallone: 8, tx: 3, gap: lerp(2, 10, wrong) },
    { nome: "Scrollata (braccia tese)", t: 0.76, curva: "lineare", mode: "pull", busto: -6, h: null, tallone: 9, tx: 3, shrug: 1, gap: lerp(2, 10, wrong) },
    { nome: "Tirata sotto: gomiti alti", t: 0.84, curva: "lineare", mode: "free", busto: 0, ginocchio: 22, tallone: 2, dh: pct(6), dx: lerp(1, 8, wrong) },
    { nome: "Rotazione (picco)", t: 1.0, curva: "lineare", mode: "free", busto: 18, ginocchio: 75, tallone: 0, h: pct(70), x: lerp(-1.5, 8, wrong) },
    { nome: "Incastro", t: 1.18, mode: "over", busto: lerp(24, 34, wrong), ginocchio: 118, arco: 1 },
    { nome: "Incastro (tenuta)", t: 1.7, mode: "over", busto: lerp(24, 34, wrong), ginocchio: 118 },
    { nome: "In piedi", t: 2.9, mode: "over", busto: 2, ginocchio: 4 },
  ];
}
function pullKeys(wrong) {
  return [
    { nome: "Partenza", t: 0, mode: "pull", busto: 55, h: 22.5 },
    { nome: "Ginocchio (fine prima tirata)", t: 0.4, curva: "in", mode: "pull", busto: lerp(52, 66, wrong), h: pct(29) },
    { nome: "Tasca / alto coscia", t: 0.58, curva: "lineare", mode: "pull", busto: 12, h: pct(44), gap: 1.5 },
    { nome: "Massima estensione", t: 0.68, curva: "lineare", mode: "pull", busto: -6, h: null, tallone: 8, tx: 3 },
    { nome: "Scrollata", t: 0.8, curva: "out", mode: "pull", busto: -6, h: null, tallone: 9, tx: 3, shrug: 1 },
    { nome: "Ritorno in piedi", t: 1.4, mode: "pull", busto: 2, h: null, tallone: 0 },
    { nome: "Discesa controllata", t: 2.6, mode: "pull", busto: 55, h: 22.5 },
  ];
}

const cache = new Map();
function solveKey(k, prev) {
  const id = JSON.stringify(k); if (cache.has(id)) return cache.get(id);
  let a;
  if (k.mode === "pull") {
    if (k.h == null) { // massima estensione: ginocchio quasi dritto, altezza data dal corpo
      let lo = -25, hi = 50, sp = 0; const gin = k.shrug ? 2 : 3;
      for (let i = 0; i < 32; i++) { const c = (lo + hi) / 2; sp = armToBar(B, { busto: k.busto, ginocchio: gin, caviglia: c, tallone: k.tallone ?? 0, collo: -8, armK: ARMK }, k.gap ?? 1.5);
        const J = chain(B, { busto: k.busto, ginocchio: gin, caviglia: c, spalla: sp, tallone: k.tallone ?? 0, collo: -8, armK: ARMK }); if (centerOfMass(B, J, LOAD, J.hand)[0] < (k.tx ?? 0)) lo = c; else hi = c; }
      a = { busto: k.busto, ginocchio: gin, caviglia: (lo + hi) / 2, spalla: sp, tallone: k.tallone ?? 0, collo: -8, armK: ARMK };
    } else a = pullPose(k.busto, k.h, { tallone: k.tallone ?? 0, gap: k.gap ?? 1, tx: k.tx ?? 0 });
    // la scrollata è nelle spalle che salgono col corpo in estensione (tallone e ginocchio), non nelle braccia
    a.bar = chain(B, a).hand;
  } else if (k.mode === "over") { a = overheadPose(k.busto, k.ginocchio); a.bar = chain(B, a).hand; }
  else { // libero: corpo dato, bilanciere su un punto della traiettoria, gomiti alti
    const base = { busto: k.busto, ginocchio: k.ginocchio, tallone: k.tallone ?? 0, collo: -4, armK: ARMK };
    let lo = -25, hi = 60; for (let i = 0; i < 30; i++) { const c = (lo + hi) / 2, J = chain(B, { ...base, caviglia: c, spalla: 0 }); if (centerOfMass(B, J)[0] < 0) lo = c; else hi = c; }
    base.caviglia = (lo + hi) / 2;
    const bar = k.h != null ? [k.x ?? 0, k.h] : [prev.bar[0] + (k.dx ?? 0), prev.bar[1] + (k.dh ?? 0)];
    a = { ...base, mani: bar, bar };
  }
  cache.set(id, a); return a;
}

function build(keysFn, wrong) {
  const keys = keysFn(wrong); let prev = null;
  return keys.map((k) => { const a = solveKey(k, prev); prev = a; return { ...k, a }; });
}
const BUILT = new Map();
function keysFor(lift, wrong) { const id = lift + (wrong > 0.5 ? "w" : "c"); if (!BUILT.has(id)) BUILT.set(id, build(lift === "strappo" ? snatchKeys : pullKeys, wrong > 0.5 ? 1 : 0)); return BUILT.get(id); }

const sm = (x) => x * x * (3 - 2 * x);
const MEMO = new Map();
export function pose(t, wrong = 0, lift = "strappo") {
  const mk = `${lift}|${wrong > 0.5 ? 1 : 0}|${Math.round(t * 1000)}`; if (MEMO.has(mk)) return MEMO.get(mk);
  const out = poseRaw(t, wrong, lift); if (MEMO.size > 20000) MEMO.clear(); MEMO.set(mk, out); return out;
}
function poseRaw(t, wrong = 0, lift = "strappo") {
  const K = keysFor(lift, wrong), REP = lift === "strappo" ? 3.6 : 3.2, c = Math.min(t % REP, K.at(-1).t);
  let i = K.findIndex((k, j) => c >= k.t && c < (K[j + 1]?.t ?? Infinity)); if (i < 0) i = K.length - 1;
  const A = K[i], Bk = K[Math.min(i + 1, K.length - 1)], u = Bk === A ? 0 : clamp((c - A.t) / (Bk.t - A.t));
  const k = Bk.curva === "lineare" ? u : Bk.curva === "in" ? u ** 1.5 : Bk.curva === "out" ? 1 - (1 - u) ** 1.6 : sm(u);
  let a;
  if (A.mode === "pull" && Bk.mode === "pull") {
    a = pullPose(lerp(A.busto, Bk.busto, k), lerp(A.h ?? A.a.bar[1], Bk.h ?? Bk.a.bar[1], k), { gap: lerp(A.gap ?? 1, Bk.gap ?? 1, k), tallone: lerp(A.tallone ?? 0, Bk.tallone ?? 0, k), tx: lerp(A.tx ?? 0, Bk.tx ?? 0, k) });
  } else {
    const f = (n) => lerp(A.a[n] ?? 0, Bk.a[n] ?? 0, k);
    a = { busto: f("busto"), ginocchio: f("ginocchio"), caviglia: f("caviglia"), tallone: f("tallone"), collo: f("collo"), armK: ARMK };
    // bilanciere: interpolato sulla traiettoria; braccia tese → gomiti dalla cinematica inversa
    // verso l'incastro il bilanciere passa sopra la testa (arco), non attraverso
    a.mani = [lerp(A.a.bar[0], Bk.a.bar[0], k) - (Bk.arco ? 6 * Math.sin(Math.PI * k) : 0), lerp(A.a.bar[1], Bk.a.bar[1], k) + (Bk.arco ? 16 * Math.sin(Math.PI * k) : 0)];
  }
  const J = chain(B, a);
  const com = centerOfMass(B, J, LOAD, J.hand);
  return { a, J, com, bar: J.hand, key: u < 0.08 ? A.nome : u > 0.92 ? Bk.nome : null, phase: A.nome, gap: legGap(B, J, J.hand), anca: a.busto - a.caviglia + a.ginocchio, REP };
}

export function makeRender(lift, meta) {
  return function render(g, W, H, t, wrong, { compact = false } = {}) {
    compact ? g.clearRect(0, 0, W, H) : board(g, W, H);
    const P = pose(t, wrong, lift), V = view(g, 3.05, 330, 1110);
    if (!compact) { g.font = "900 36px Inter"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(meta.nome, W / 2, 62); g.font = "600 19px Inter"; g.fillStyle = "rgba(207,228,255,0.75)"; g.fillText(`Atleta 1,80 m · 78 kg · bilanciere ${LOAD} kg · presa larga · vista di lato`, W / 2, 92); }
    pill(g, wrong > 0.5 ? meta.erroreTesto : "Corretto", W / 2, compact ? 330 : 140, wrong > 0.5 ? C.bad : C.ok, 22);
    ground(V, W);
    const c = t % P.REP, pts = []; for (let k = 0; k <= c; k += 0.02) pts.push(pose(t - c + k, wrong, lift).bar); trail(V, pts);
    drawSide(V, B, P.J, { nearArm: false, bad: wrong > 0.5 ? (lift === "strappo" ? {} : { anca: c > 0.2 && c < 0.7 }) : {} });
    plate(V, P.bar); drawNearArm(V, P.J); comDot(V, P.com);
    const bq = V.X(P.bar); g.font = "800 20px Inter"; g.fillStyle = C.gold; g.textAlign = "left"; g.fillText(`${(P.bar[1] / 100).toFixed(2).replace(".", ",")} m`, bq[0] + 76, bq[1] + 6);
    if (P.key) pill(g, P.key, W / 2, 1175, C.gold, 23);
    if (!compact) {
      table(g, 24, 180, 230, "Angoli", [["Busto", `${P.a.busto.toFixed(0)}°`], ["Anca", `${P.anca.toFixed(0)}°`], ["Ginocchio", `${P.a.ginocchio.toFixed(0)}°`], ["Caviglia", `${(P.a.caviglia - P.J.beta).toFixed(0)}°`], ["Tallone su", `${(P.a.tallone ?? 0).toFixed(0)} cm`], ["Bilanciere", `${(P.bar[1] / B.H * 100).toFixed(0)}% statura`]]);
      table(g, W - 330, 180, 306, "Controlli", meta.controlli(P, wrong));
      g.font = "600 16px Inter"; g.fillStyle = "rgba(207,228,255,0.55)"; g.textAlign = "center"; g.fillText("Harbili 2012 · Gourgoulis 2000 · Garhammer 1985 · Everett · Winter 2009", W / 2, 1250);
    }
  };
}

const ctrl = (P) => { const off = P.com[0], okC = Math.abs(off) <= 3 || P.a.tallone > 0.5; const inPull = P.a.mani == null && P.bar[1] < 105;
  return [[`${okC ? "✓" : "✗"} baricentro ${off >= 0 ? "+" : ""}${off.toFixed(1)} cm dal mesopiede`, undefined, okC ? C.ok : C.bad], inPull ? [`${P.gap <= 3 ? "✓" : "✗"} bilanciere a ${P.gap.toFixed(1)} cm dalle gambe`, undefined, P.gap <= 3 ? C.ok : C.bad] : [`bilanciere ${(P.bar[1] / 100).toFixed(2).replace(".", ",")} m`, undefined, "#cfe4ff"], ["✓ punte ferme a terra", undefined, C.ok]]; };
export const metaStrappo = { id: "strappo", nome: "Lo strappo", vista: "lato", durata: 3.6 * 3, errore: 3.6 * 2 - 0.2, erroreTesto: "Errore: bilanciere lontano, ricezione davanti", controlli: ctrl, fonti: ["Harbili 2012", "Gourgoulis 2000", "Garhammer 1985", "Everett, Olympic Weightlifting", "Winter 2009"] };
export const meta = metaStrappo;
export const render = makeRender("strappo", metaStrappo);
export const KEYS = snatchKeys(0);

export function checksFor(lift) {
  const f = []; const REP = lift === "strappo" ? 3.6 : 3.2; const toe0 = pose(0, 0, lift).J.toe;
  let peak = 0, v1 = 0, v2 = 0, prev = null;
  for (let t = 0; t < REP; t += 1 / 120) {
    const P = pose(t, 0, lift);
    if (t < 1.01) peak = Math.max(peak, P.bar[1]);
    if (prev) { const v = (P.bar[1] - prev) * 120 / 100; if (t < 0.4) v1 = Math.max(v1, v); else if (t < 1.0) v2 = Math.max(v2, v); }
    prev = P.bar[1];
    if (P.a.mani == null && P.bar[1] < 100 && (P.gap < 0 || P.gap > 3)) f.push(`${t.toFixed(2)}s bilanciere a ${P.gap.toFixed(1)} cm`);
    if (t < 0.5 && Math.abs(P.com[0]) > 3) f.push(`${t.toFixed(2)}s baricentro ${P.com[0].toFixed(1)}`);
    if (Math.hypot(P.J.toe[0] - toe0[0], P.J.toe[1] - toe0[1]) > 1e-6) f.push(`${t.toFixed(2)}s punte si muovono`);
    const hd = Math.hypot(P.bar[0] - P.J.head[0], P.bar[1] - P.J.head[1]); if (hd < B.L.headR + 1.4) f.push(`${t.toFixed(2)}s bilanciere nella testa`);
  }
  const knee = pose(0.4, 0, lift).bar[1], peakPct = (peak / B.H) * 100;
  if (lift === "strappo" && (peakPct < 68 || peakPct > 73)) f.push(`picco ${peakPct.toFixed(0)}% della statura`);
  return { f, info: `bilanciere: partenza ${pose(0, 0, lift).bar[1].toFixed(1)} cm, fine prima tirata ${knee.toFixed(0)} cm, picco ${peak.toFixed(0)} cm (${peakPct.toFixed(0)}% statura); velocità max prima tirata ${v1.toFixed(2)} m/s, seconda ${v2.toFixed(2)} m/s` };
}
export const checks = () => checksFor("strappo");
