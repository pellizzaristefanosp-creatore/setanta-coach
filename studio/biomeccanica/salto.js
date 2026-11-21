// Salto verticale da fermo con contromovimento e slancio delle braccia (tripla estensione), di lato.
// Altezza del baricentro ~40 cm (calciatore, 40–50 cm con le braccia); volo t = 2√(2h/g); stacco v = √(2gh).
// Fondo del contromovimento: ginocchio ~90° (70–100°). Estensione in sequenza anca → ginocchio → caviglia (Bobbert e van Ingen Schenau 1988).
import { body, chain, centerOfMass, balanceAt, interp, lerp, clamp } from "./modello.js";
import { view, drawSide, ground, comDot, trail, board, pill, table, arrow, C } from "./disegno.js";

export const B = body(180, 78);
export const G = 981; // cm/s²
export const meta = { id: "salto", nome: "Tripla estensione: il salto", vista: "lato", durata: 9, errore: 5.6, fonti: ["Linthorne 2001", "McMahon 2018", "Bobbert e van Ingen Schenau 1988", "Winter 2009"] };
const F = ["busto", "ginocchio", "spalla", "tallone", "collo"];
// fotogrammi a terra prima dello stacco (s)
export const KEYS = [
  { nome: "In piedi", t: 0, busto: 2, ginocchio: 4, spalla: 0, tallone: 0 },
  { nome: "Inizio contromovimento", t: 0.4, busto: 4, ginocchio: 8, spalla: 10, tallone: 0 },
  { nome: "Discesa e braccia indietro", t: 0.72, busto: 30, ginocchio: 60, spalla: -50, tallone: 0 },
  { nome: "Fondo (ginocchio ~90°)", t: 0.95, busto: 45, ginocchio: 90, spalla: -60, tallone: 0 },
  { nome: "Prima l'anca", t: 1.08, busto: 22, ginocchio: 72, spalla: 40, tallone: 0 },
  { nome: "Poi il ginocchio", t: 1.18, busto: 8, ginocchio: 30, spalla: 130, tallone: 3 },
  { nome: "Stacco: caviglia", t: 1.25, busto: 2, ginocchio: 3, spalla: 170, tallone: 13 },
];
const WRONG_TAKEOFF = { busto: 12, ginocchio: 22, spalla: 120, tallone: 4 };
export const AFTER = [ // atterraggio (t relativo al contatto)
  { nome: "Contatto sulle punte", t: 0, busto: 4, ginocchio: 10, spalla: 150, tallone: 10 },
  { nome: "Ammortizzo", t: 0.22, busto: 28, ginocchio: 55, spalla: 50, tallone: 0 },
  { nome: "Risalita", t: 0.6, busto: 8, ginocchio: 12, spalla: 5, tallone: 0 },
  { nome: "In piedi", t: 1.0, busto: 2, ginocchio: 4, spalla: 0, tallone: 0 },
];
export const REP = 4.5;
const h = (wrong) => lerp(40, 25, wrong); // cm di salita del baricentro

function ground_(a) { // caviglia: baricentro sul mesopiede, o verso i metatarsi col tallone su
  const tx = lerp(0, 0.48 * B.L.footLen, clamp(a.tallone / 13));
  return { ...a, caviglia: balanceAt(B, a, tx), gomito: 10 };
}
export function pose(t, wrong = 0) {
  const c = t % REP, H = h(wrong), tf = 2 * Math.sqrt((2 * H) / G), v0 = Math.sqrt(2 * G * H);
  const T0 = KEYS.at(-1).t;
  const keys = KEYS.map((k, i) => (i === KEYS.length - 1 ? { ...k, ...Object.fromEntries(Object.entries(WRONG_TAKEOFF).map(([f, v]) => [f, lerp(k[f], v, wrong)])) } : k));
  let a, phase, dy = 0, key = null;
  if (c < T0) { const I = interp(keys, c, F); a = ground_(I); phase = "a terra"; key = I.key; }
  else if (c < T0 + tf) {
    const u = c - T0; const I = interp(keys, T0, F);
    a = { ...ground_(I) }; a.ginocchio = lerp(a.ginocchio, a.ginocchio + 6, u / tf); dy = v0 * u - (G * u * u) / 2; phase = "in volo"; key = u < 0.06 ? "Stacco" : Math.abs(u - tf / 2) < 0.04 ? "Punto più alto" : null;
    // in volo il corpo resta quello dello stacco: la tibia non si risistema
    const base = ground_(interp(keys, T0, F)); a.caviglia = base.caviglia;
  } else {
    const u = c - T0 - tf; const aft = AFTER.map((k) => (wrong > 0.5 && k.nome === "Ammortizzo" ? { ...k, ginocchio: 18, busto: 10 } : k));
    const I = interp(aft, u, F); a = ground_(I); phase = "a terra"; key = I.key;
  }
  const J = chain(B, { ...a, dy });
  const com = centerOfMass(B, J);
  return { a, J, com, dy, phase, key, H, tf, v0, anca: a.busto - a.caviglia + a.ginocchio, takeoffCom: centerOfMass(B, chain(B, ground_(interp(keys, T0, F))))[1] };
}

export function render(g, W, Hc, t, wrong, { compact = false } = {}) {
  compact ? g.clearRect(0, 0, W, Hc) : board(g, W, Hc);
  const P = pose(t, wrong), V = view(g, 3.1, 330, 1100);
  if (!compact) { g.font = "900 36px Inter"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(meta.nome, W / 2, 62); g.font = "600 19px Inter"; g.fillStyle = "rgba(207,228,255,0.75)"; g.fillText("Salto da fermo, contromovimento e slancio delle braccia · vista di lato", W / 2, 92); }
  pill(g, wrong > 0.5 ? "Errore: estensione incompleta, atterraggio rigido" : "Corretto: anca, ginocchio, caviglia", W / 2, compact ? 330 : 140, wrong > 0.5 ? C.bad : C.ok, 22);
  ground(V, W);
  // parabola del baricentro durante la ripetizione
  const c = t % REP, pts = []; for (let k = 0; k <= c; k += 0.03) pts.push(pose(t - c + k, wrong).com); trail(V, pts, "rgba(255,90,90,0.6)");
  drawSide(V, B, P.J, { bad: wrong > 0.5 && P.phase !== "in volo" && c > 1.0 ? { gambe: true } : wrong > 0.5 && c > 1.0 && c < 1.4 ? { gambe: true } : {} });
  comDot(V, P.com);
  // sequenza delle articolazioni: si accendono quando si estendono
  if (c > 0.95 && c < 1.3) for (const [k, n, from] of [["hip", "anca", 0.95], ["knee", "ginocchio", 1.08], ["ankle", "caviglia", 1.18]]) { if (c < from) continue; const q = V.X(P.J[k]); g.fillStyle = C.gold; g.beginPath(); g.arc(q[0], q[1], 12, 0, 7); g.fill(); g.font = "800 20px Inter"; g.textAlign = "left"; g.fillText(n, q[0] + 22, q[1] + 7); }
  if (P.phase === "in volo") { const top = V.X([P.com[0], P.takeoffCom + P.H]), base = V.X([P.com[0] - 30, P.takeoffCom]);
    g.setLineDash([8, 6]); g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.moveTo(base[0] - 40, base[1]); g.lineTo(base[0] + 160, base[1]); g.moveTo(base[0] - 40, top[1]); g.lineTo(base[0] + 160, top[1]); g.stroke(); g.setLineDash([]);
    pill(g, `+${P.H.toFixed(0)} cm`, base[0] - 70, (top[1] + base[1]) / 2, C.gold, 20); }
  else { const cm = V.X(P.com); arrow(g, [cm[0], cm[1] + 14], [cm[0], cm[1] + 14 + B.M * 1.2], C.force); }
  if (P.key) pill(g, P.key, W / 2, 1170, C.gold, 24);
  if (!compact) {
    table(g, 24, 180, 230, "Angoli", [["Busto", `${P.a.busto.toFixed(0)}°`], ["Anca", `${P.anca.toFixed(0)}°`], ["Ginocchio", `${P.a.ginocchio.toFixed(0)}°`, wrong > 0.5 ? C.bad : "#fff"], ["Caviglia", `${(P.a.caviglia - P.J.beta).toFixed(0)}°`], ["Spalla", `${P.a.spalla.toFixed(0)}°`], ["Tallone su", `${P.a.tallone.toFixed(0)} cm`]]);
    table(g, W - 330, 180, 306, "Salto", [[`baricentro +${P.H.toFixed(0)} cm`, undefined, "#cfe4ff"], [`volo ${P.tf.toFixed(2).replace(".", ",")} s = 2√(2h/g)`, undefined, "#cfe4ff"], [`stacco ${(P.v0 / 100).toFixed(1).replace(".", ",")} m/s = √(2gh)`, undefined, "#cfe4ff"], [`fase: ${P.phase}`, undefined, C.gold]]);
    g.font = "600 16px Inter"; g.fillStyle = "rgba(207,228,255,0.55)"; g.textAlign = "center"; g.fillText("Linthorne 2001 · McMahon 2018 · Bobbert 1988 · Winter 2009 · Schema semplificato", W / 2, 1250);
  }
}

export function checks() {
  const f = []; const b = pose(0).J; let maxDy = 0;
  for (let t = 0; t < REP; t += 1 / 120) { const P = pose(t); maxDy = Math.max(maxDy, P.dy);
    if (P.phase === "a terra" && P.a.tallone === 0 && Math.abs(P.com[0]) > 3) f.push(`${t.toFixed(2)}s baricentro ${P.com[0].toFixed(1)}`);
    if (P.phase === "a terra") for (const k of ["toe"]) if (Math.hypot(P.J[k][0] - b[k][0], P.J[k][1] - b[k][1]) > 1e-6) f.push(`${t.toFixed(2)}s punte si muovono`); }
  const P = pose(0); const want = 2 * Math.sqrt((2 * 40) / G);
  if (Math.abs(P.tf - want) > 1e-9 || Math.abs(maxDy - 40) > 0.5) f.push(`volo ${P.tf} / salita ${maxDy}`);
  const bottom = pose(0.95); if (bottom.a.ginocchio < 70 || bottom.a.ginocchio > 100) f.push("ginocchio al fondo fuori 70–100");
  return { f, info: `salita ${maxDy.toFixed(1)} cm, volo ${P.tf.toFixed(3)} s, stacco ${(P.v0 / 100).toFixed(2)} m/s, ginocchio al fondo ${bottom.a.ginocchio.toFixed(0)}°` };
}
