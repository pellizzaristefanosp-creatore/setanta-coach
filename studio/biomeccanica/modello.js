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
  const { L } = B, F = L.footLen, k = a.armK ?? 1; // armK: braccia accorciate nella vista di lato (presa larga)
  let ankle = [-0.25 * F, L.ankleH], heel = [ankle[0] - 0.2 * F, 0];
  const ball = [heel[0] + 0.73 * F, 0], toe = [heel[0] + F, 0];
  // tallone sollevato: il piede ruota attorno ai metatarsi (le dita restano a terra)
  const beta = Math.asin(clamp((a.tallone ?? 0) / (0.73 * F), 0, 0.99));
  const rot = (p) => { const dx = p[0] - ball[0], dy = p[1] - ball[1]; return [ball[0] + dx * Math.cos(beta) + dy * Math.sin(beta), ball[1] - dx * Math.sin(beta) + dy * Math.cos(beta)]; };
  if (beta) { ankle = rot(ankle); heel = rot(heel); }
  const shankA = a.caviglia, thighA = a.caviglia - a.ginocchio, trunkA = a.busto;
  const knee = add(ankle, dir(shankA), L.shank);
  const hip = add(knee, dir(thighA), L.thigh);
  const lumb = a.lombare ?? 0;
  const mid = add(hip, dir(trunkA - lumb / 2), L.trunk * 0.5);
  const sh = add(mid, dir(trunkA + lumb / 2), L.trunk * 0.5);
  const headA = trunkA + lumb / 2 + (a.collo ?? 0);
  const head = add(sh, dir(headA), L.headC);
  let elbow, wrist, hand, armA;
  if (a.mani) { // mani su un punto (bilanciere): gomito con la cinematica inversa, gomito alto e dietro
    hand = a.mani; const u = L.uarm * (a.armKu ?? k), f = (L.farm + L.grip) * k; // armKu: braccio accorciato quando il gomito va di lato
    const dx = hand[0] - sh[0], dy = hand[1] - sh[1], d = Math.min(Math.hypot(dx, dy), u + f - 0.01);
    const base = Math.atan2(dy, dx), off = Math.acos(clamp((u * u + d * d - f * f) / (2 * u * d), -1, 1));
    const e1 = [sh[0] + Math.cos(base + off) * u, sh[1] + Math.sin(base + off) * u], e2 = [sh[0] + Math.cos(base - off) * u, sh[1] + Math.sin(base - off) * u];
    // bilanciere sotto le spalle: gomiti alti (tirata sotto); sopra le spalle: gomiti dietro e sotto il bilanciere (rotazione)
    // bilanciere sotto le spalle: gomito sopra il bilanciere con l'avambraccio il più verticale possibile (gomiti alti);
    // sopra le spalle: gomito dietro e sotto il bilanciere (rotazione e incastro)
    if (hand[1] < sh[1]) { const up = [e1, e2].filter((e) => e[1] > hand[1]); elbow = up.length ? up.reduce((b, e) => (Math.abs(e[0] - hand[0]) < Math.abs(b[0] - hand[0]) ? e : b)) : (e1[1] > e2[1] ? e1 : e2); }
    else elbow = e1[0] < e2[0] ? e1 : e2;
    wrist = [lerp(elbow[0], hand[0], L.farm / (L.farm + L.grip)), lerp(elbow[1], hand[1], L.farm / (L.farm + L.grip))];
    armA = Math.atan2(elbow[0] - sh[0], elbow[1] - sh[1]) / R;
  } else {
    armA = a.bracciaAss ?? 180 + trunkA + lumb / 2 - (a.spalla ?? 0); // verso il basso = 180, verso l'alto = 0
    elbow = add(sh, dir(armA), L.uarm * k);
    wrist = add(elbow, dir(armA - (a.gomito ?? 0)), L.farm * k);
    hand = add(wrist, dir(armA - (a.gomito ?? 0)), L.grip * k);
  }
  const J = { ankle, heel, ball, toe, knee, hip, mid, sh, head, headA, elbow, wrist, hand, beta: beta / R, angles: { shankA, thighA, trunkA, armA } };
  if (a.dy) for (const key of ["ankle", "heel", "ball", "toe", "knee", "hip", "mid", "sh", "head", "elbow", "wrist"]) J[key] = [J[key][0], J[key][1] + a.dy];
  if (a.dy && !a.mani) J.hand = [J.hand[0], J.hand[1] + a.dy];
  return J;
}

/** baricentro del corpo (+ carico opzionale in un punto) */
export function centerOfMass(B, J, load = 0, loadAt = null) {
  const { m, com } = B;
  const P = (p, d, k) => [lerp(d[0], p[0], k), lerp(d[1], p[1], k)]; // k dal distale
  const parts = [
    [2 * m.foot, [(J.heel[0] + J.toe[0]) / 2, (J.ankle[1] + J.toe[1]) / 2]],
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
  // il segmento giusto è quello all'altezza del bilanciere: tibia sotto il ginocchio, coscia sopra
  const [a, b, w] = p[1] < J.knee[1] ? [J.knee, J.ankle, B.w.shank] : [J.hip, J.knee, B.w.thigh];
  const v = [b[0] - a[0], b[1] - a[1]], L2 = v[0] ** 2 + v[1] ** 2;
  const t = clamp(((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / L2);
  const q = [a[0] + v[0] * t, a[1] + v[1] * t];
  const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
  const side = (p[0] - q[0]) * -v[1] + (p[1] - q[1]) * v[0] < 0 ? -1 : 1; // normale verso avanti
  return side * d - w - BAR.r;
}

/** angolo della spalla che porta il bilanciere (braccia tese) a `gap` cm dalle gambe */
export function armToBar(B, a, gap) {
  // dalla posizione indietro, ruota il braccio in avanti finché il bilanciere arriva a `gap` cm davanti alle gambe
  const g = (sp) => legGap(B, chain(B, { ...a, spalla: sp }), chain(B, { ...a, spalla: sp }).hand);
  let prev = -40, gp = g(prev);
  for (let sp = -39; sp <= 130; sp += 1) {
    const gs = g(sp);
    if (gp < gap && gs >= gap) { let lo = prev, hi = sp; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (g(m) < gap) lo = m; else hi = m; } return (lo + hi) / 2; }
    prev = sp; gp = gs;
  }
  return prev;
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

/** caviglia che porta il baricentro (con un carico opzionale in mano) sulla x indicata, a spalla data */
export function balanceAt(B, a, targetX = 0, load = 0) {
  let lo = -25, hi = 50;
  for (let i = 0; i < 40; i++) { const c = (lo + hi) / 2, J = chain(B, { ...a, caviglia: c }); if (centerOfMass(B, J, load, J.hand)[0] < targetX) lo = c; else hi = c; }
  return (lo + hi) / 2;
}
/** interpolazione tra fotogrammi chiave sugli angoli (curva morbida in ogni tratto) */
export function interp(keys, t, fields) {
  let i = keys.findIndex((k, j) => t >= k.t && t < (keys[j + 1]?.t ?? Infinity));
  if (i < 0) i = t < keys[0].t ? 0 : keys.length - 1;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const u = b === a ? 0 : clamp((t - a.t) / (b.t - a.t)), k = b.curva === "lineare" ? u : u * u * (3 - 2 * u);
  const out = { key: u < 0.06 ? a.nome : u > 0.94 ? b.nome : null, i, u };
  for (const f of fields) out[f] = lerp(a[f] ?? 0, b[f] ?? 0, k);
  return out;
}
