// Romanian deadlift nella pagina unica (stessa biomeccanica di rdl.js).
import { B, LOAD, REP, KEYS, pose } from "./rdl.js";
import { view, drawSide, drawNearArm, plate, ground, comDot, trail, board, pill, table, arrow, C } from "./disegno.js";
export { B, KEYS, pose };
export const meta = { id: "rdl", nome: "Romanian deadlift", vista: "lato", durata: REP * 3, errore: REP * 2 - 0.3, fonti: ["NSCA, Essentials of Strength Training and Conditioning", "Winter 2009"] };
export function render(g, W, H, t, wrong, { compact = false } = {}) {
  compact ? g.clearRect(0, 0, W, H) : board(g, W, H);
  const P = pose(t, wrong), V = view(g, 3.55, 360, 1080);
  if (!compact) { g.font = "900 36px Inter"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(meta.nome, W / 2, 62); g.font = "600 19px Inter"; g.fillStyle = "rgba(207,228,255,0.75)"; g.fillText(`Atleta 1,80 m · 78 kg · bilanciere ${LOAD} kg · vista di lato`, W / 2, 92); }
  pill(g, wrong > 0.5 ? "Errore: schiena tonda, bilanciere lontano" : "Corretto", W / 2, compact ? 330 : 140, wrong > 0.5 ? C.bad : C.ok, 24);
  ground(V, W);
  const c = t % REP, pts = []; for (let k = 0; k <= c; k += 0.08) pts.push(pose(t - c + k, wrong).J.hand); trail(V, pts);
  drawSide(V, B, P.J, { bad: wrong > 0.5 ? { busto: true, collo: true } : {}, nearArm: false });
  drawNearArm(V, P.J); plate(V, P.J.hand); // il disco copre mano e avambraccio
  const hp = V.X(P.J.hip), bp = V.X(P.J.hand), lev = Math.abs(P.J.hand[0] - P.J.hip[0]);
  g.strokeStyle = C.gold; g.lineWidth = 4; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(hp[0], hp[1]); g.lineTo(bp[0], hp[1]); g.lineTo(bp[0], bp[1]); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.gold; g.beginPath(); g.arc(hp[0], hp[1], 8, 0, 7); g.fill();
  pill(g, `leva sull'anca ${lev.toFixed(0)} cm`, Math.max(150, hp[0] - 30), hp[1] - 64, C.gold, 18);
  const cm = V.X(P.com), mt = B.M + LOAD;
  arrow(g, [cm[0], cm[1] + 14], [cm[0], cm[1] + 14 + mt * 0.95], C.force); arrow(g, [V.ox, V.floorY - 4], [V.ox, V.floorY - 4 - mt * 0.95], C.react);
  comDot(V, P.com);
  const off = Math.abs(P.com[0]) < 0.05 ? 0 : P.com[0], okC = Math.abs(off) <= 3, okB = P.gap >= 0 && P.gap <= 3;
  if (P.key) pill(g, P.key, W / 2, 1150, C.gold, 26);
  if (!compact) {
    table(g, 24, 180, 230, "Angoli", [["Busto", `${(P.a.busto + (P.a.lombare ?? 0)).toFixed(0)}°`], ["Anca", `${P.anca.toFixed(0)}°`], ["Ginocchio", `${P.a.ginocchio.toFixed(0)}°`], ["Caviglia", `${P.a.caviglia.toFixed(0)}°`], ["Spalla", `${P.a.spalla.toFixed(0)}°`], ["Collo", `${P.a.collo.toFixed(0)}°`]]);
    table(g, W - 330, 180, 306, "Controlli", [[`${okC ? "✓" : "✗"} baricentro ${off >= 0 ? "+" : ""}${off.toFixed(1)} cm dal mesopiede`, undefined, okC ? C.ok : C.bad], [`${okB ? "✓" : "✗"} bilanciere a ${P.gap.toFixed(1)} cm dalle gambe`, undefined, okB ? C.ok : C.bad], ["✓ piedi fermi a terra", undefined, C.ok]]);
    pill(g, `peso ${mt} kg`, 110, V.floorY - 60, C.force, 17); pill(g, "reazione del suolo", W - 120, V.floorY - 60, C.ok, 17);
    g.font = "600 16px Inter"; g.fillStyle = "rgba(207,228,255,0.55)"; g.textAlign = "center"; g.fillText("NSCA · Winter 2009 · Schema semplificato", W / 2, 1250);
  }
}
export function checks() {
  const f = []; const b = pose(0).J;
  for (let t = 0; t < REP * 2; t += 1 / 30) { const P = pose(t); if (Math.abs(P.com[0]) > 3) f.push(`${t.toFixed(2)}s baricentro`); if (P.gap < 0 || P.gap > 3) f.push(`${t.toFixed(2)}s bilanciere`);
    if (Math.abs(P.a.busto - P.anca + P.a.ginocchio - P.a.caviglia) > 0.01) f.push("relazione angoli"); for (const k of ["heel", "toe"]) if (P.J[k][0] !== b[k][0] || P.J[k][1] !== b[k][1]) f.push(`${k} si muove`); }
  const bt = pose(2.5); return { f, info: `fondo: busto ${bt.a.busto.toFixed(0)}°, ginocchio ${bt.a.ginocchio.toFixed(0)}°, bilanciere a ${bt.J.hand[1].toFixed(0)} cm (ginocchio ${bt.J.knee[1].toFixed(0)} cm)` };
}
