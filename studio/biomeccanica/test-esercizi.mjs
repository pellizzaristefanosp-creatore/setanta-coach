// Controlli automatici dei 7 esercizi (fotogramma per fotogramma). Uscita ≠ 0 se un controllo fallisce.
const ids = ["rdl-es", "plank", "carry", "pallof", "salto", "strappo", "tirata"];
let bad = 0;
for (const id of ids) {
  const M = await import(`./${id}.js`);
  const { f, info } = M.checks();
  console.log(`${f.length ? "✗" : "✓"} ${M.meta.nome}: ${info}`);
  if (f.length) { bad++; console.log("   " + [...new Set(f)].slice(0, 6).join("\n   ")); }
}
process.exit(bad ? 1 : 0);
