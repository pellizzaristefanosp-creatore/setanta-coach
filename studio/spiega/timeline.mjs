import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const c = JSON.parse(readFileSync("copione.json", "utf8"));
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const gap = { s1: 0.8, p1: 0.5, p2: 0.4, p3: 0.4, p4: 0.5, s2: 0.6, p5: 0.4 };
let t = 0; const lines = [];
for (const b of c.battute) { t += gap[b.id] ?? 0.4; const al = JSON.parse(readFileSync(`out/${b.id}.json`, "utf8")); const d = dur(`out/${b.id}.mp3`); lines.push({ id: b.id, chi: b.chi, start: +t.toFixed(3), dur: +d.toFixed(3), al }); t += d; }
const DURATION = +(t + 2.2).toFixed(2);
writeFileSync("out/timeline.json", JSON.stringify({ lines, DURATION }));
console.log(DURATION, lines.map((l) => `${l.id}@${l.start}`).join(" "));
