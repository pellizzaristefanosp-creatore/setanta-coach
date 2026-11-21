// Controlli automatici del Romanian deadlift corretto, fotogramma per fotogramma (30 al secondo).
import { pose, REP, B } from "./rdl.js";
const fails = []; let n = 0, maxCom = 0, maxGap = 0, minGap = 99;
const base = pose(0).J;
for (let t = 0; t < REP * 2; t += 1 / 30, n++) {
  const P = pose(t), a = P.a, J = P.J;
  maxCom = Math.max(maxCom, Math.abs(P.com[0])); maxGap = Math.max(maxGap, P.gap); minGap = Math.min(minGap, P.gap);
  if (Math.abs(P.com[0]) > 3) fails.push(`${t.toFixed(2)}s baricentro ${P.com[0].toFixed(1)} cm`);
  if (P.gap < 0 || P.gap > 3) fails.push(`${t.toFixed(2)}s bilanciere a ${P.gap.toFixed(1)} cm dalle gambe`);
  if (Math.abs(a.busto - P.anca + a.ginocchio - a.caviglia) > 0.01) fails.push(`${t.toFixed(2)}s busto − anca + ginocchio ≠ caviglia`);
  for (const k of ["heel", "toe", "ankle"]) if (Math.hypot(J[k][0] - base[k][0], J[k][1] - base[k][1]) > 1e-9) fails.push(`${t.toFixed(2)}s ${k} si è mosso`);
  if (a.ginocchio < 5 || a.ginocchio > 20.01) fails.push(`${t.toFixed(2)}s ginocchio ${a.ginocchio.toFixed(1)}° fuori da 5–20`);
  if (a.busto > 75) fails.push(`${t.toFixed(2)}s busto ${a.busto.toFixed(0)}° oltre 75`);
}
const bottom = pose(2.5);
console.log(`fotogrammi ${n}: baricentro max ${maxCom.toFixed(2)} cm dal mesopiede; bilanciere tra ${minGap.toFixed(2)} e ${maxGap.toFixed(2)} cm dalle gambe`);
console.log(`al fondo: busto ${bottom.a.busto.toFixed(0)}°, anca ${bottom.anca.toFixed(0)}°, ginocchio ${bottom.a.ginocchio.toFixed(0)}°, tibia ${bottom.a.caviglia.toFixed(1)}°, bilanciere a ${bottom.J.hand[1].toFixed(0)} cm da terra (ginocchio a ${bottom.J.knee[1].toFixed(0)} cm)`);
console.log(fails.length ? `FALLITI ${fails.length}:\n` + fails.slice(0, 10).join("\n") : "tutti i controlli superati");
process.exit(fails.length ? 1 : 0);
