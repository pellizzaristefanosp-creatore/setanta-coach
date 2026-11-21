// Romanian deadlift: fotogrammi chiave sugli angoli, il resto si calcola (equilibrio e contatto del bilanciere).
import { body, chain, balance, centerOfMass, legGap, lerp, clamp } from "./modello.js";

export const B = body(180, 78);
export const LOAD = 60; // kg sul bilanciere
// [tempo s, busto, ginocchio, collo] — ginocchio 5–20°, busto al fondo 65–75° (calciatore mobile)
export const KEYS = [
  { nome: "Partenza", t: 0, busto: 3, ginocchio: 8, collo: 0 },
  { nome: "Metà discesa", t: 1.2, busto: 35, ginocchio: 16, collo: 0 },
  { nome: "Fondo", t: 2.4, busto: 70, ginocchio: 20, collo: 0 },
  { nome: "Fondo (pausa)", t: 2.8, busto: 70, ginocchio: 20, collo: 0 },
  { nome: "Risalita", t: 3.6, busto: 30, ginocchio: 14, collo: 0 },
  { nome: "In piedi", t: 4.3, busto: 3, ginocchio: 8, collo: 0 },
];
export const REP = 4.9; // durata della ripetizione con la sosta in alto
// errore: bilanciere staccato ~12 cm, schiena arrotondata, testa alzata → baricentro sulle punte
export const WRONG = { gap: 12, lombare: 26, collo: -25 };

const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
function anglesAt(u) {
  const c = u % REP;
  let i = KEYS.findIndex((k, j) => c >= k.t && c < (KEYS[j + 1]?.t ?? Infinity));
  if (i < 0 || i === KEYS.length - 1) return { ...KEYS.at(-1), key: KEYS.at(-1).nome };
  const a = KEYS[i], b = KEYS[i + 1], k = ease((c - a.t) / (b.t - a.t));
  return { busto: lerp(a.busto, b.busto, k), ginocchio: lerp(a.ginocchio, b.ginocchio, k), collo: lerp(a.collo, b.collo, k), key: k < 0.08 ? a.nome : k > 0.92 ? b.nome : null };
}

/** posa completa al tempo u; wrong = 0..1 (quanto è sbagliata) */
export function pose(u, wrong = 0) {
  const A = anglesAt(u);
  const depth = clamp((A.busto - 3) / 67); // 0 in piedi, 1 al fondo
  const ok = balance(B, A, LOAD, 1);
  let a = { ...A, ...ok, gomito: 0 };
  if (wrong > 0) {
    const w = wrong * depth;
    const bad = { ...A, collo: lerp(A.collo, WRONG.collo, wrong), lombare: WRONG.lombare * w, ginocchio: A.ginocchio * (1 - 0.4 * w), caviglia: ok.caviglia, gomito: 0 };
    bad.spalla = (function () { // braccia tese col bilanciere lontano dalle gambe
      let lo = -40, hi = 120; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, J = chain(B, { ...bad, spalla: m }); if (legGap(B, J, J.hand) < lerp(1, WRONG.gap, wrong) * Math.max(0.15, depth)) lo = m; else hi = m; }
      return (lo + hi) / 2; })();
    a = bad;
  }
  const J = chain(B, a);
  const com = centerOfMass(B, J, LOAD, J.hand);
  return { a, J, com, gap: legGap(B, J, J.hand), anca: a.busto + (a.lombare ?? 0) - a.caviglia + a.ginocchio, key: A.key, depth };
}
