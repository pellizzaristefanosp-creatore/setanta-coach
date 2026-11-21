// Suitcase carry, vista di fronte: kettlebell da 24 kg nella mano destra (a sinistra sullo schermo), camminata sul posto.
// Ciclo del passo (Perry e Burnfield 2010): 1,1 s, appoggio 60 %, oscillazione 40 %, bacino ±4°, baricentro ±2 cm.
// Corretto: spalle orizzontali (±2°), busto quasi verticale. Errore: busto inclinato verso il carico ~8°, spalla carica giù, kettlebell che oscilla.
import { body, lerp, clamp, R } from "./modello.js";
import { board, pill, table, arrow, drawFront, C } from "./disegno.js";

export const B = body(180, 78);
export const KB = 24;
export const meta = { id: "carry", nome: "Suitcase carry", vista: "fronte", durata: 12, errore: 6.6, fonti: ["Perry e Burnfield 2010", "McGill, Low Back Disorders", "Winter 2009"] };
export const T = 1.1, STANCE = 0.6;
export const KEYS = [
  { nome: "Appoggio destro (metà)", fase: 0.3, bacino_obliquita: -4, baricentro_laterale_cm: -2, baricentro_verticale_cm: 2 },
  { nome: "Doppio appoggio", fase: 0.6, bacino_obliquita: 0, baricentro_laterale_cm: 0, baricentro_verticale_cm: -2 },
  { nome: "Appoggio sinistro (metà)", fase: 0.8, bacino_obliquita: 4, baricentro_laterale_cm: 2, baricentro_verticale_cm: 2 },
];
const H = B.H;
// misure frontali (cm, frazioni di statura): anche 0,1 H tra i centri, spalle 0,22 H tra i centri
const HIPW = 0.1 * H, SHW = 0.22 * H, HIPY = 0.53 * H, SHY = 0.818 * H, ANKY = 0.039 * H;

/** fase del passo di una gamba (0 = contatto del tallone) */
const phase = (t, side) => (((t / T) + (side > 0 ? 0 : 0.5)) % 1 + 1) % 1;

export function pose(t, wrong = 0) {
  // gamba destra (side -1, a sinistra sullo schermo) e sinistra (side +1)
  const legs = [-1, 1].map((side) => {
    const p = phase(t, side), swing = p >= STANCE ? Math.sin(Math.PI * (p - STANCE) / (1 - STANCE)) : 0;
    return { side, p, swing, lift: swing * 9, knee: swing * 60 };
  });
  const stance = legs.find((l) => l.swing === 0 && l.p < STANCE && (l.p > 0.1 && l.p < 0.5)) ?? null;
  // bacino: scende dal lato della gamba in volo (obliquità ±4°); baricentro verso la gamba d'appoggio (±2 cm), su a metà appoggio (±2 cm)
  const pr = (t / T) * 2 * Math.PI;
  const obl = 4 * Math.sin(pr); // + = lato sinistro (schermo destra) più basso
  const comX0 = 2 * -Math.sin(pr), comY0 = 2 * Math.cos(2 * pr - Math.PI * 0.2);
  // carico: il corretto compensa con il busto appena inclinato dal lato opposto, spalle orizzontali
  const lean = lerp(2.2, -8, wrong); // gradi; + = verso la gamba sinistra (lontano dal carico)
  const shTilt = lerp(0, -6, wrong) + 1.2 * Math.sin(pr) * (1 - wrong); // + = spalla sinistra più bassa
  const pelvis = [comX0 * 0.9, HIPY + comY0 - 1];
  const hipL = [pelvis[0] + (HIPW / 2) * Math.cos(obl * R), pelvis[1] - (HIPW / 2) * Math.sin(obl * R)];
  const hipR = [pelvis[0] - (HIPW / 2) * Math.cos(obl * R), pelvis[1] + (HIPW / 2) * Math.sin(obl * R)];
  const neck = [pelvis[0] + Math.sin(lean * R) * (SHY - HIPY), pelvis[1] + Math.cos(lean * R) * (SHY - HIPY)];
  const shL = [neck[0] + (SHW / 2) * Math.cos(shTilt * R), neck[1] - (SHW / 2) * Math.sin(shTilt * R)];
  const shR = [neck[0] - (SHW / 2) * Math.cos(shTilt * R), neck[1] + (SHW / 2) * Math.sin(shTilt * R)];
  const head = [neck[0] + Math.sin(lean * 0.6 * R) * B.L.headC, neck[1] + Math.cos(lean * 0.6 * R) * B.L.headC];
  // braccia: destra tesa col kettlebell (pende in verticale, oscilla se sbagliato), sinistra che oscilla poco
  const armL = B.L.uarm + B.L.farm + B.L.grip * 0.5;
  const swingKb = wrong * 9 * Math.sin(pr + 0.6);
  const handR = [shR[0] - 7 + Math.sin(swingKb * R) * armL * 0.2, shR[1] - armL];
  const handL = [shL[0] + 7, shL[1] - armL + 2];
  const feet = legs.map((l) => {
    const hip = l.side < 0 ? hipR : hipL, x = l.side * (HIPW / 2 + 1.5);
    const ankle = [x, ANKY + l.lift];
    const kneeY = lerp(hip[1], ankle[1], 0.5) + l.knee * 0.06;
    return { ...l, hip, ankle, knee: [lerp(hip[0], ankle[0], 0.5), kneeY] };
  });
  // baricentro del sistema (corpo + kettlebell)
  const kb = [handR[0], handR[1] - 15];
  const comBody = [pelvis[0] + Math.sin(lean * R) * 12, HIPY + 6 + comY0];
  const com = [(comBody[0] * B.M + kb[0] * KB) / (B.M + KB), (comBody[1] * B.M + kb[1] * KB) / (B.M + KB)];
  const shoulderTilt = Math.atan2(shL[1] - shR[1], shL[0] - shR[0]) / R;
  return { feet, hipL, hipR, pelvis, neck, shL, shR, head, handR, handL, kb, swingKb, com, obl, lean, shoulderTilt, comY0 };
}

export function render(g, W, Hc, t, wrong, { compact = false } = {}) {
  compact ? g.clearRect(0, 0, W, Hc) : board(g, W, Hc);
  const P = pose(t, wrong), s = 3.3, ox = W / 2, fy = 1080;
  const X = (p) => [ox + p[0] * s, fy - p[1] * s];
  const cap = (a, b, wcm, col, out = C.line) => { const A = X(a), Bp = X(b); g.lineCap = "round"; g.strokeStyle = out; g.lineWidth = wcm * s + 6; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); g.strokeStyle = col; g.lineWidth = wcm * s; g.beginPath(); g.moveTo(...A); g.lineTo(...Bp); g.stroke(); };
  if (!compact) {
    g.font = "900 36px Inter"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(meta.nome, W / 2, 62);
    g.font = "600 19px Inter"; g.fillStyle = "rgba(207,228,255,0.75)"; g.fillText(`Atleta 1,80 m · 78 kg · kettlebell ${KB} kg nella destra · vista di fronte`, W / 2, 92);
  }
  pill(g, wrong > 0.5 ? "Errore: busto verso il peso" : "Corretto: spalle orizzontali", W / 2, compact ? 330 : 140, wrong > 0.5 ? C.bad : C.ok, 24);
  g.strokeStyle = "rgba(207,228,255,0.4)"; g.lineWidth = 4; g.beginPath(); g.moveTo(30, fy); g.lineTo(W - 30, fy); g.stroke();
  // verticale di riferimento al centro
  g.setLineDash([12, 10]); g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(ox, 330); g.lineTo(ox, fy); g.stroke(); g.setLineDash([]);
  const red = wrong > 0.5;
  drawFront(g, X, s, B, P, { red, redArm: red });
  // kettlebell 24 kg (sfera ~21 cm, maniglia)
  const kb = X(P.kb), hr = X(P.handR);
  g.strokeStyle = C.line; g.lineWidth = 9; g.beginPath(); g.moveTo(hr[0] - 16, hr[1] + 4); g.quadraticCurveTo(hr[0], hr[1] - 14, hr[0] + 16, hr[1] + 4); g.stroke();
  g.fillStyle = C.line; g.beginPath(); g.arc(kb[0], kb[1], 10.5 * s + 4, 0, 7); g.fill(); g.fillStyle = "#3a3f47"; g.beginPath(); g.arc(kb[0], kb[1], 10.5 * s, 0, 7); g.fill();
  g.fillStyle = "#fff"; g.font = "800 20px Inter"; g.fillText("24", kb[0], kb[1] + 8);
  g.fillStyle = C.line; g.beginPath(); g.arc(hr[0], hr[1], 13, 0, 7); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.arc(hr[0], hr[1], 9, 0, 7); g.fill();
  // linea delle spalle e frecce
  const sL = X(P.shL), sR = X(P.shR);
  g.strokeStyle = Math.abs(P.shoulderTilt) <= 2 ? C.ok : C.bad; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(sR[0] - 60, sR[1] + (sR[1] - sL[1]) / (sL[0] - sR[0]) * 60); g.lineTo(sL[0] + 60, sL[1] - (sR[1] - sL[1]) / (sL[0] - sR[0]) * 60); g.stroke(); g.setLineDash([]);
  arrow(g, [kb[0], kb[1] + 10.5 * s + 6], [kb[0], kb[1] + 10.5 * s + 6 + KB * 2.2], C.force);
  const cm = X(P.com); arrow(g, [cm[0], cm[1] + 12], [cm[0], cm[1] + 12 + (B.M + KB) * 1.2], C.force);
  g.fillStyle = "#ff3b3b"; g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(cm[0], cm[1], 11, 0, 7); g.fill(); g.stroke();
  pill(g, `spalle ${P.shoulderTilt >= 0 ? "+" : ""}${P.shoulderTilt.toFixed(0)}°`, sL[0] + 110, sL[1] - 30, Math.abs(P.shoulderTilt) <= 2 ? C.ok : C.bad, 18);
  if (!compact) {
    table(g, 24, 180, 250, "Frontale", [["Bacino (obliquità)", `${P.obl.toFixed(0)}°`], ["Busto (laterale)", `${P.lean.toFixed(0)}°`, red ? C.bad : "#fff"], ["Spalle", `${P.shoulderTilt.toFixed(0)}°`, Math.abs(P.shoulderTilt) <= 2 ? "#fff" : C.bad], ["Baricentro vert.", `${P.comY0 >= 0 ? "+" : ""}${P.comY0.toFixed(1)} cm`], ["Fase del passo", `${(((t / T) % 1) * 100).toFixed(0)}%`]]);
    table(g, W - 300, 180, 276, "Controlli", [[`${Math.abs(P.shoulderTilt) <= 2 ? "✓" : "✗"} spalle orizzontali ±2°`, undefined, Math.abs(P.shoulderTilt) <= 2 ? C.ok : C.bad], [`${Math.abs(P.obl) <= 4.01 ? "✓" : "✗"} bacino entro ±4°`, undefined, C.ok], [`ciclo ${T} s · appoggio 60%`, undefined, "#cfe4ff"]]);
    g.font = "600 16px Inter"; g.fillStyle = "rgba(207,228,255,0.55)"; g.textAlign = "center"; g.fillText("Perry e Burnfield 2010 · McGill · Winter 2009 · Schema semplificato", W / 2, 1250);
  }
}

export function checks() {
  const f = [];
  for (let t = 0; t < 6; t += 1 / 30) {
    const P = pose(t, 0);
    if (Math.abs(P.shoulderTilt) > 2) f.push(`${t.toFixed(2)}s spalle ${P.shoulderTilt.toFixed(1)}°`);
    if (Math.abs(P.obl) > 4.01) f.push(`${t.toFixed(2)}s bacino ${P.obl.toFixed(1)}°`);
    if (Math.abs(P.comY0) > 2.01) f.push(`${t.toFixed(2)}s baricentro verticale ${P.comY0.toFixed(1)} cm`);
    const inAir = P.feet.filter((x) => x.swing > 0).length; if (inAir > 1) f.push(`${t.toFixed(2)}s due piedi in volo`);
  }
  const w = pose(1, 1); if (Math.abs(w.lean) < 7) f.push("errore: busto poco inclinato");
  return { f, info: `spalle max ${Math.max(...Array.from({ length: 180 }, (_, i) => Math.abs(pose(i / 30, 0).shoulderTilt))).toFixed(1)}°, errore busto ${pose(1, 1).lean.toFixed(0)}°` };
}
