// Trascrizione di ogni puntata per l'app: battute con chi parla, testo pulito e tempo di ogni parola (dall'allineamento delle voci).
// Uso: node trascrizioni.mjs <cartella-public-video>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const OUT = process.argv[2];
function words(al, offset) {
  const out = []; let tag = false, cur = "", t0 = 0;
  al.chars.forEach((ch, i) => {
    if (ch === "[") { tag = true; return; } if (tag) { if (ch === "]") tag = false; return; }
    if (/\s/.test(ch)) { if (cur) out.push({ w: cur, s: +(offset + t0).toFixed(2) }); cur = ""; return; }
    if (!cur) t0 = al.start[i]; cur += ch;
  });
  if (cur) out.push({ w: cur, s: +(offset + t0).toFixed(2) });
  return out.map((x) => ({ ...x, w: x.w.replace("Pròf", "Prof") }));
}
function build(tl) { return { durata: tl.DURATION, battute: tl.lines.map((l) => { const w = words(l.al, l.start); return { chi: l.chi === "PROF" ? "Prof" : "Ste", inizio: +l.start.toFixed(2), fine: +(l.start + l.dur).toFixed(2), testo: w.map((x) => x.w).join(" "), parole: w }; }) }; }
const codes = ["4.1", "4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "6.1", "6.2", "6.3", "7.1", "7.2", "7.3"];
for (const c of codes) writeFileSync(`${OUT}/${c}-puntata.json`, JSON.stringify(build(JSON.parse(readFileSync(`puntate/${c}/out/timeline.json`, "utf8")))));
writeFileSync(`${OUT}/5.1-actina-miosina.json`, JSON.stringify(build(JSON.parse(readFileSync("out/timeline.json", "utf8")))));
console.log("trascrizioni", codes.length + 1);
