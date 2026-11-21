// Scrive dati.json: per ogni esercizio meta, modello, fotogrammi chiave e i valori calcolati dei fotogrammi chiave.
import { writeFileSync } from "node:fs";
const out = [];
for (const id of ["rdl-es", "plank", "carry", "pallof", "salto", "strappo", "tirata"]) {
  const M = await import(`./${id}.js`);
  const { controlli, erroreTesto, ...meta } = M.meta;
  const keys = (M.KEYS ?? []).map((k) => ({ ...k }));
  const calcolati = keys.filter((k) => typeof k.t === "number").map((k) => {
    const P = M.pose(k.t, 0); const r = (x) => (typeof x === "number" ? +x.toFixed(1) : x);
    const ang = P.a ? Object.fromEntries(Object.entries(P.a).filter(([, v]) => typeof v === "number").map(([n, v]) => [n, r(v)])) : P.angoli;
    return { nome: k.nome, tempo_s: k.t, angoli: ang, baricentro_cm_dal_mesopiede: P.com ? r(P.com[0]) : undefined, bilanciere_cm: P.bar ? P.bar.map(r) : P.J?.hand && id === "rdl-es" ? P.J.hand.map(r) : undefined };
  });
  out.push({ ...meta, modello: { statura_cm: 180, massa_kg: 78, segmenti: "Winter 2009" }, fotogrammi_chiave: keys, verifica: calcolati, controlli: M.checks().info });
}
writeFileSync("dati.json", JSON.stringify(out, null, 1));
console.log("dati.json", out.length, "esercizi");
