// Pallof press in piedi: elastico ancorato a destra dell'atleta all'altezza dello sterno. Vista dall'alto (sopra) e di fronte (sotto).
// La leva dell'elastico rispetto al tronco cresce da ~8 a ~58 cm quando le braccia si distendono.
// Corretto: spalle e bacino non ruotano, mani sulla linea mediana. Errore: rotazione verso l'ancoraggio ~15°, mani fuori linea.
import { body, lerp, clamp, R } from "./modello.js";
import { board, pill, table, arrow, drawFront, C } from "./disegno.js";

export const B = body(180, 78);
export const meta = { id: "pallof", nome: "Pallof press in piedi", vista: "alto + fronte", durata: 13.5, errore: 8.7, fonti: ["McGill, Low Back Disorders", "NSCA, Essentials of Strength Training and Conditioning"] };
export const CYC = 4.5, ANCHOR = 160, BAND_N = 90; // ancoraggio a 160 cm di lato; forza dell'elastico ~90 N (≈9 kg) [Ipotesi]
export const KEYS = [
  { nome: "Mani al petto", t: 0, distanza_mani_petto_cm: 8, rotazione_spalle: 0 },
  { nome: "Braccia distese", t: 1.0, distanza_mani_petto_cm: 58, rotazione_spalle: 0 },
  { nome: "Tenuta", t: 3.0, distanza_mani_petto_cm: 58, rotazione_spalle: 0 },
  { nome: "Ritorno", t: 4.0, distanza_mani_petto_cm: 8, rotazione_spalle: 0 },
];
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

export function pose(t, wrong = 0) {
  const c = t % CYC, ext = c < 1 ? sm(c) : c < 3 ? 1 : c < 4 ? 1 - sm(c - 3) : 0;
  const reach = lerp(8, 58, ext);
  const rot = 15 * wrong * ext; // gradi verso l'ancoraggio (a destra)
  const handOff = 8 * wrong * ext; // cm fuori dalla linea mediana
  // vista dall'alto: x a destra, y in avanti; centro del petto = (0,0)
  const shW = 0.22 * B.H, chestD = 11;
  const rotP = (p, a) => [p[0] * Math.cos(a * R) + p[1] * Math.sin(a * R), -p[0] * Math.sin(a * R) + p[1] * Math.cos(a * R)];
  const shL = rotP([-shW / 2, 0], rot), shR = rotP([shW / 2, 0], rot);
  const hand = rotP([handOff, chestD + reach], rot * 0.4);
  const bandLen = Math.hypot(ANCHOR - hand[0], hand[1] - (chestD + 30));
  const lever = reach; // leva dell'elastico rispetto al tronco = distanza mani–petto (8 → 58 cm)
  const moment = (BAND_N * (lever / 100)); // N·m attorno all'asse verticale (forza laterale × leva) [Probabile]
  return { ext, reach, rot, handOff, shL, shR, hand, lever, moment, bandLen };
}

export function render(g, W, H, t, wrong, { compact = false } = {}) {
  compact ? g.clearRect(0, 0, W, H) : board(g, W, H);
  const P = pose(t, wrong), red = wrong > 0.5;
  if (!compact) {
    g.font = "900 36px Inter"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(meta.nome, W / 2, 62);
    g.font = "600 19px Inter"; g.fillStyle = "rgba(207,228,255,0.75)"; g.fillText("Elastico ancorato a destra, all'altezza dello sterno", W / 2, 92);
  }
  pill(g, red ? "Errore: il busto ruota verso l'elastico" : "Corretto: busto fermo, mani al centro", W / 2, compact ? 300 : 140, red ? C.bad : C.ok, 23);
  // ——— vista dall'alto ———
  const s = 3.2, cx = 300, cy = 640; // petto
  const T = (p) => [cx + p[0] * s, cy - p[1] * s];
  g.font = "700 18px Inter"; g.fillStyle = "rgba(207,228,255,0.6)"; g.textAlign = "left"; g.fillText("vista dall'alto", 30, cy - 260);
  const anchor = T([ANCHOR / 2.2, 41]); // ancoraggio (fuori scala orizzontale per stare nella lavagna)
  g.fillStyle = "#cfe4ff"; g.beginPath(); g.arc(anchor[0], anchor[1], 16, 0, 7); g.fill();
  // piedi e bacino
  for (const sd of [-1, 1]) { const f = T([sd * 20, -4]); g.fillStyle = C.line; g.beginPath(); g.ellipse(f[0], f[1] - 20, 16, 40, 0, 0, 7); g.fill(); g.fillStyle = C.shoe; g.beginPath(); g.ellipse(f[0], f[1] - 20, 12, 36, 0, 0, 7); g.fill(); }
  const pel = T([0, 0]); g.save(); g.translate(pel[0], pel[1]); g.rotate((P.rot * 0.3 * Math.PI) / 180); g.fillStyle = C.line; g.beginPath(); g.ellipse(0, 0, 19 * s, 10 * s, 0, 0, 7); g.fill(); g.fillStyle = C.shorts; g.beginPath(); g.ellipse(0, 0, 18 * s, 9 * s, 0, 0, 7); g.fill(); g.restore();
  // elastico
  const hd = T(P.hand); g.strokeStyle = "#ffd34d"; g.lineWidth = 6; g.beginPath(); g.moveTo(...anchor); g.lineTo(...hd); g.stroke();
  // braccia
  for (const sh of [P.shL, P.shR]) { const a = T(sh); g.lineCap = "round"; g.strokeStyle = C.line; g.lineWidth = 30; g.beginPath(); g.moveTo(...a); g.lineTo(...hd); g.stroke(); g.strokeStyle = C.skin; g.lineWidth = 23; g.beginPath(); g.moveTo(...a); g.lineTo(...hd); g.stroke(); }
  // spalle e testa
  g.save(); g.translate(cx, cy); g.rotate((P.rot * Math.PI) / 180);
  g.fillStyle = red ? C.bad : C.line; g.beginPath(); g.ellipse(0, 0, 0.11 * B.H * s + 22, 11 * s + 4, 0, 0, 7); g.fill(); g.fillStyle = C.top; g.beginPath(); g.ellipse(0, 0, 0.11 * B.H * s + 18, 11 * s, 0, 0, 7); g.fill();
  g.fillStyle = C.line; g.beginPath(); g.arc(0, -4, B.L.headR * s + 3, 0, 7); g.fill(); g.fillStyle = C.hair; g.beginPath(); g.arc(0, -4, B.L.headR * s, 0, 7); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.arc(0, -4 - B.L.headR * s * 0.7, 9, 0, 7); g.fill(); // naso
  g.restore();
  g.fillStyle = C.line; g.beginPath(); g.arc(hd[0], hd[1], 16, 0, 7); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.arc(hd[0], hd[1], 12, 0, 7); g.fill();
  // linea mediana e leva
  g.setLineDash([10, 8]); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx, cy - 250); g.stroke(); g.setLineDash([]);
  g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 40, cy); g.lineTo(cx - 40, hd[1]); g.stroke();
  pill(g, `leva ${P.lever.toFixed(0)} cm`, cx - 110, (cy + hd[1]) / 2, C.gold, 18);
  arrow(g, [hd[0] + 20, hd[1] + 30], [hd[0] + 20 + 40 + P.ext * 50, hd[1] + 30], C.bad);
  pill(g, "l'elastico tira", hd[0] + 110, hd[1] + 70, C.bad, 17);
  if (red) pill(g, `spalle ruotate ${P.rot.toFixed(0)}°`, cx + 160, cy + 40, C.bad, 19);
  // ——— vista di fronte ———
  const fs = 2.05, fx = 360, fy = 1170, F = (p) => [fx + p[0] * fs, fy - p[1] * fs];
  g.font = "700 18px Inter"; g.fillStyle = "rgba(207,228,255,0.6)"; g.textAlign = "left"; g.fillText("vista di fronte", 30, 790);
  g.strokeStyle = "rgba(207,228,255,0.4)"; g.lineWidth = 4; g.beginPath(); g.moveTo(30, fy); g.lineTo(W - 30, fy); g.stroke();
  const cr = Math.cos((P.rot * Math.PI) / 180), shift = Math.sin((P.rot * Math.PI) / 180) * 8, hw = 0.11 * B.H;
  const hy = 0.53 * B.H, sy = 0.818 * B.H;
  const feet = [-1, 1].map((side) => ({ side, swing: 0, hip: [side * 9, hy], knee: [side * 15, 0.285 * B.H], ankle: [side * 21, 0.039 * B.H] }));
  const hf = [P.handOff * 1.3 + shift, 128];
  const shL = [-hw * cr + shift, sy], shR = [hw * cr + shift, sy];
  const el = (sh) => [lerp(sh[0], hf[0], lerp(0.15, 0.55, P.ext)), lerp(120, 134, P.ext)];
  const FP = { feet, hipL: [9, hy], hipR: [-9, hy], shL, shR, neck: [shift, sy], head: [shift * 0.6, sy + B.L.headC], handL: hf, handR: hf, elbowL: el(shL), elbowR: el(shR) };
  drawFront(g, F, fs, B, FP, { red });
  const hfp = F(hf);
  const anc = F([150, 128]); g.fillStyle = "#cfe4ff"; g.fillRect(anc[0] - 6, anc[1] - 10, 12, fy - anc[1] + 10);
  g.strokeStyle = "#ffd34d"; g.lineWidth = 5; g.beginPath(); g.moveTo(anc[0], anc[1]); g.lineTo(...hfp); g.stroke();
  g.setLineDash([10, 8]); g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, 820); g.stroke(); g.setLineDash([]);
  if (!compact) {
    table(g, W - 270, 180, 246, "Dall'alto", [["Mani–petto", `${P.reach.toFixed(0)} cm`], ["Leva", `${P.lever.toFixed(0)} cm`], ["Momento ~", `${P.moment.toFixed(0)} N·m`], ["Rotazione spalle", `${P.rot.toFixed(0)}°`, red ? C.bad : "#fff"], ["Mani dal centro", `${P.handOff.toFixed(0)} cm`, red ? C.bad : "#fff"]]);
    g.font = "600 16px Inter"; g.fillStyle = "rgba(207,228,255,0.55)"; g.textAlign = "center"; g.fillText("McGill · NSCA · forza dell'elastico ipotizzata · Schema semplificato", W / 2, 1250);
  }
}

export function checks() {
  const f = [];
  for (let t = 0; t < CYC * 2; t += 1 / 30) { const P = pose(t, 0); if (Math.abs(P.rot) > 0.01 || Math.abs(P.handOff) > 0.01) f.push(`${t.toFixed(2)}s rotazione`); }
  const out = pose(2, 0), inn = pose(0, 0);
  if (Math.abs(inn.lever - 8) > 1 || Math.abs(out.lever - 58) > 1) f.push(`leva ${inn.lever.toFixed(0)}→${out.lever.toFixed(0)} cm`);
  if (Math.abs(pose(2, 1).rot - 15) > 0.5) f.push("errore: rotazione non 15°");
  return { f, info: `mani–petto ${inn.reach.toFixed(0)} → ${out.reach.toFixed(0)} cm; errore: rotazione ${pose(2, 1).rot.toFixed(0)}°, mani fuori linea ${pose(2, 1).handOff.toFixed(0)} cm` };
}
