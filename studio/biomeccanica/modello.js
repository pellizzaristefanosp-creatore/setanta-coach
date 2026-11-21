// Modello biomeccanico 2D di lato (guarda a destra). Unità: cm, kg, gradi. Funziona nel browser e in Node.
// Proporzioni e masse dei segmenti: Winter, Biomechanics and Motor Control of Human Movement (2009), tabella antropometrica.
export const R = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;

/** atleta tipo: calciatore adulto (statura e massa modificabili) */
export function body(H = 180, M = 78) {
  return {
    H, M,
    L: { // lunghezze (frazioni di statura, Winter)
      footLen: 0.152 * H, ankleH: 0.039 * H, shank: 0.246 * H, thigh: 0.245 * H, trunk: 0.288 * H,
      uarm: 0.186 * H, farm: 0.146 * H, grip: 0.054 * H, headC: 0.11 * H, headR: 0.064 * H,
    },
    m: { // masse (frazioni di massa, Winter); arti contati due volte
      foot: 0.0145 * M, shank: 0.0465 * M, thigh: 0.1 * M, trunk: 0.497 * M, head: 0.081 * M,
      uarm: 0.028 * M, farm: 0.016 * M, hand: 0.006 * M,
    },
    com: { shank: 0.567, thigh: 0.567, trunk: 0.5, uarm: 0.436, farm: 0.43 }, // dal distale per gamba/coscia (0.433 dal prossimale)
    w: { thigh: 7.5, shank: 5, trunk: 12 }, // mezzo spessore in cm (per contatto col bilanciere)
  };
}

const dir = (a) => [Math.sin(a * R), Math.cos(a * R)]; // angolo dalla verticale (y in alto), avanti = +
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
export const BAR = { r: 1.4, plateR: 22.5 };

/**
 * Catena cinematica diretta dal piede appoggiato. Assi: x avanti, y in alto, origine = mesopiede a terra.
 * a = { busto, ginocchio, caviglia, collo, spalla, gomito, lombare? }
 */
export function chain(B, a) {
  const { L } = B;
  const ankle = [-0.25 * L.footLen, L.ankleH]; // caviglia a un quarto dal tallone → mesopiede in x=0
  const heel = [ankle[0] - 0.2 * L.footLen, 0], toe = [heel[0] + L.footLen, 0];
  const shankA = a.caviglia, thighA = a.caviglia - a.ginocchio, trunkA = a.busto;
  const knee = add(ankle, dir(shankA), L.shank);
  const hip = add(knee, dir(thighA), L.thigh);
  // busto: se c'è una flessione lombare (errore), la parte alta si piega di più
  const lumb = a.lombare ?? 0;
  const mid = add(hip, dir(trunkA - lumb / 2), L.trunk * 0.5);
  const sh = add(mid, dir(trunkA + lumb / 2), L.trunk * 0.5);
  const headA = trunkA + lumb / 2 + (a.collo ?? 0);
  const head = add(sh, dir(headA), L.headC);
  // braccio: spalla misurata dal busto; 0 = lungo il fianco (verso il basso)
  const armA = 180 + trunkA + lumb / 2 - (a.spalla ?? 0); // verso il basso = 180
  const elbow = add(sh, dir(armA), L.uarm);
  const wrist = add(elbow, dir(armA - (a.gomito ?? 0)), L.farm);
  const hand = add(wrist, dir(armA - (a.gomito ?? 0)), L.grip);
  return { ankle, heel, toe, knee, hip, mid, sh, head, headA, elbow, wrist, hand, angles: { shankA, thighA, trunkA, armA } };
}

/** baricentro del corpo (+ carico opzionale in un punto) */
export function centerOfMass(B, J, load = 0, loadAt = null) {
  const { m, com } = B;
  const P = (p, d, k) => [lerp(d[0], p[0], k), lerp(d[1], p[1], k)]; // k dal distale
  const parts = [
    [2 * m.foot, [(J.heel[0] + J.toe[0]) / 2, J.ankle[1] / 2]],
    [2 * m.shank, P(J.knee, J.ankle, com.shank)],
    [2 * m.thigh, P(J.hip, J.knee, com.thigh)],
    [m.trunk, J.mid],
    [m.head, J.head],
    [2 * m.uarm, P(J.elbow, J.sh, 1 - com.uarm)],
    [2 * m.farm, P(J.wrist, J.elbow, 1 - com.farm)],
    [2 * m.hand, J.hand],
  ];
  if (load && loadAt) parts.push([load, loadAt]);
  let mx = 0, my = 0, mt = 0;
  for (const [mm, p] of parts) { mx += mm * p[0]; my += mm * p[1]; mt += mm; }
  return [mx / mt, my / mt];
}

/** distanza con segno dal fronte della gamba (positiva = davanti alla superficie) */
export function legGap(B, J, p) {
  const segs = [[J.hip, J.knee, B.w.thigh], [J.knee, J.ankle, B.w.shank]];
  let best = null;
  for (const [a, b, w] of segs) {
    const v = [b[0] - a[0], b[1] - a[1]], L2 = v[0] ** 2 + v[1] ** 2;
    const t = clamp(((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / L2);
    const q = [a[0] + v[0] * t, a[1] + v[1] * t];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    const side = (p[0] - q[0]) * -v[1] + (p[1] - q[1]) * v[0] < 0 ? -1 : 1; // normale verso avanti
    if (!best || d - w < best.d) best = { d: d - w, s: side * d - w - BAR.r };
  }
  return best.s;
}

/** angolo della spalla che porta il bilanciere (braccia tese) a `gap` cm dalle gambe */
export function armToBar(B, a, gap) {
  let lo = -40, hi = 120;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2, J = chain(B, { ...a, spalla: mid });
    if (legGap(B, J, J.hand) < gap) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** caviglia (inclinazione della tibia) che mette il baricentro sopra il mesopiede */
export function balance(B, a, load, gap) {
  let lo = -15, hi = 45, sp = 0;
  for (let i = 0; i < 40; i++) {
    const c = (lo + hi) / 2; sp = armToBar(B, { ...a, caviglia: c }, gap);
    const J = chain(B, { ...a, caviglia: c, spalla: sp });
    if (centerOfMass(B, J, load, J.hand)[0] < 0) lo = c; else hi = c;
  }
  return { caviglia: (lo + hi) / 2, spalla: sp };
}
