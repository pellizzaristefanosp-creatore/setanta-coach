// Monta i tempi dell'azione dai file voce: chi parla quando, più le pause di regia. Scrive out/timeline.json.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const d = JSON.parse(readFileSync("dialogo.json", "utf8"));
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
// pausa PRIMA di ogni battuta (secondi)
const gapBefore = { l01: 2.6, l02: 0.35, l03: 0.45, l04: 0.35, l05: 1.5, l06: 0.4, l07: 1.1, l08: 0.3, l09: 0.45, l10: 0.25, l11: 0.5 };
let t = 0; const lines = []; const T = {};
for (const l of d.lines) {
  t += gapBefore[l.id] ?? 0.35;
  const al = JSON.parse(readFileSync(`out/${l.id}.json`, "utf8"));
  const dd = dur(`out/${l.id}.mp3`);
  lines.push({ id: l.id, who: l.who, start: +t.toFixed(3), dur: +dd.toFixed(3), al });
  T[l.id] = +t.toFixed(3);
  t += dd;
}
const s = (id) => lines.find((l) => l.id === id);
T.sarcIn = +(s("l05").start - 0.6).toFixed(3);
T.sarcOut = +(s("l06").start + s("l06").dur).toFixed(3);
T.backIn = +(T.sarcOut + 0.45).toFixed(3);
T.end = +(t + 0.7).toFixed(3);
T.post = +(T.end + 2.0).toFixed(3);
const DURATION = +(T.post + 3.2).toFixed(3);
writeFileSync("out/timeline.json", JSON.stringify({ lines, T, DURATION }));
console.log(JSON.stringify({ T, DURATION }));
