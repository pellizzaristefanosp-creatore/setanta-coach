// Mix audio della spiegazione: voci ai loro tempi, palestra all'inizio, ologramma nel laboratorio, whoosh dello zoom, click dei passi.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const TL = JSON.parse(readFileSync("out/timeline.json", "utf8"));
const L = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const word = (id, w) => { const l = L[id]; const i = l.al.chars.join("").indexOf(w); return l.start + l.al.start[i]; };
const D = TL.DURATION, zoom = word("p1", "Zoomiamo"), come = process.argv[2] === "cartone" ? word("p5", "Come") : D;
const ticks = [word("p4", "aggancia"), word("p4", "tira"), word("p4", "lascia"), word("p4", "ricomincia")];
const ins = [...TL.lines.map((l) => [`out/${l.id}.mp3`, l.start])];
const args = []; const parts = [];
ins.forEach(([f, t], i) => { args.push("-i", f); parts.push(`[${i}:a]aresample=44100,adelay=${Math.round(t * 1000)}:all=1[v${i}]`); });
const n = ins.length;
args.push("-i", "out/sfx_gym.mp3", "-i", "out/sfx_hum.mp3", "-i", "out/sfx_whoosh.mp3", ...ticks.flatMap(() => ["-i", "out/sfx_tick.mp3"]), "-i", "out/sfx_gym.mp3");
const fx = [
  `[${n}:a]aresample=44100,loudnorm=I=-32:TP=-8,atrim=0:${(zoom + 1).toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${zoom.toFixed(2)}:d=1[gym]`,
  `[${n + 1}:a]aresample=44100,aloop=loop=2:size=2e6,atrim=0:${(come - zoom).toFixed(2)},loudnorm=I=-33:TP=-8,afade=t=in:d=1,afade=t=out:st=${(come - zoom - 1.2).toFixed(2)}:d=1.2,adelay=${Math.round(zoom * 1000)}:all=1[hum]`,
  `[${n + 3 + ticks.length}:a]aresample=44100,loudnorm=I=-32:TP=-8,atrim=0:${Math.max(0.1, D - come).toFixed(2)},afade=t=in:d=0.5,afade=t=out:st=${Math.max(0, D - come - 1).toFixed(2)}:d=1,adelay=${Math.round(come * 1000)}:all=1[gym2]`,
  `[${n + 2}:a]aresample=44100,loudnorm=I=-22:TP=-3,adelay=${Math.round((zoom + 0.1) * 1000)}:all=1[wh]`,
  ...ticks.map((t, k) => `[${n + 3 + k}:a]aresample=44100,loudnorm=I=-26:TP=-6,adelay=${Math.round(t * 1000)}:all=1[t${k}]`),
];
const mix = [
  ...parts, ...fx,
  `${TL.lines.map((_, i) => `[v${i}]`).join("")}amix=inputs=${n}:normalize=0,loudnorm=I=-16:TP=-1.5,aresample=44100,apad=whole_dur=${D}[vo]`,
  // tutti i pezzi lunghi uguali: amix non deve mai far cadere un ingresso a metà
  ...["gym", "hum", "wh", "gym2", ...ticks.map((_, k) => `t${k}`)].map((x) => `[${x}]apad=whole_dur=${D}[${x}p]`),
  `[vo][gymp][hump][whp][gym2p]${ticks.map((_, k) => `[t${k}p]`).join("")}amix=inputs=${5 + ticks.length}:normalize=0:duration=first:dropout_transition=0,atrim=0:${D},alimiter=limit=0.9[out]`,
];
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args, "-filter_complex", mix.join(";"), "-map", "[out]", "-ar", "44100", process.argv[2] === "cartone" ? "out/mix-cartone.wav" : "out/mix.wav"]);
console.log("mix ok", D);
