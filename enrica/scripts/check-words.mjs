// Controlla che la revisione della punteggiatura non abbia cambiato le parole dei dialoghi.
// Uso: node scripts/check-words.mjs <cartella-originali> content/1.1.json [...]
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
const [dir, ...files] = process.argv.slice(2);
const words = (t) => t.toLowerCase().normalize("NFC").replace(/[’]/g, "'").match(/[\p{L}\p{N}']+/gu)?.join(" ") ?? "";
let bad = 0;
for (const f of files) {
  const a = JSON.parse(readFileSync(join(dir, basename(f)), "utf8")), b = JSON.parse(readFileSync(f, "utf8"));
  const errs = [];
  a.parts.forEach((p, i) => {
    const q = b.parts[i];
    if (!q || q.dialogue.length !== p.dialogue.length) return errs.push(`parte ${i}: numero di battute cambiato`);
    p.dialogue.forEach((d, j) => {
      const e = q.dialogue[j];
      if (e.who !== d.who) errs.push(`parte ${i} battuta ${j}: chi parla è cambiato`);
      if (words(e.text) !== words(d.text)) errs.push(`parte ${i} battuta ${j}: parole cambiate\n    prima: ${d.text}\n    dopo:  ${e.text}`);
    });
    const { dialogue: _a, ...ra } = p, { dialogue: _b, ...rb } = q;
    if (JSON.stringify(ra) !== JSON.stringify(rb)) errs.push(`parte ${i}: cambiato qualcosa fuori dal dialogo`);
  });
  for (const k of Object.keys(a)) if (k !== "parts" && JSON.stringify(a[k]) !== JSON.stringify(b[k])) errs.push(`campo ${k} cambiato`);
  if (errs.length) { bad++; console.log(`✗ ${f}\n  - ${errs.slice(0, 8).join("\n  - ")}`); } else console.log(`OK ${f}`);
}
process.exit(bad ? 1 : 0);
