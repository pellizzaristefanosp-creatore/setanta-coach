// Mix audio dell'azione: voci ai loro tempi + effetti e base sintetizzati con ffmpeg (nessuna licenza esterna).
// Uso: node mix.mjs  → out/mix.wav (loudness −16 LUFS, picco ≤ −1 dBTP)
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const TL = JSON.parse(readFileSync("out/timeline.json", "utf8"));
const L = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const word = (id, w) => { const l = L[id]; const i = l.al.chars.join("").indexOf(w); return l.start + l.al.start[i]; };
const T = TL.T, DUR = TL.DURATION;
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
const sr = 44100;
// effetti
ff(["-f", "lavfi", "-i", `sine=f=55:d=0.25,afade=t=out:st=0:d=0.25,volume=2.2`, "out/fx_kick.wav"]);
ff(["-f", "lavfi", "-i", `anoisesrc=c=pink:d=2.0:a=0.5,bandpass=f=900:w=600,afade=t=in:d=0.5,afade=t=out:st=1.2:d=0.8,volume=0.5`, "out/fx_whoosh.wav"]);
ff(["-f", "lavfi", "-i", `anoisesrc=c=white:d=0.6:a=0.4,highpass=f=2500,afade=t=out:st=0.05:d=0.55,volume=0.7`, "out/fx_net.wav"]);
ff(["-f", "lavfi", "-i", `sine=f=2950:d=0.55`, "-af", "vibrato=f=28:d=0.35,afade=t=in:d=0.02,afade=t=out:st=0.4:d=0.15,volume=0.35", "out/fx_whistle.wav"]);
ff(["-f", "lavfi", "-i", `anoisesrc=c=pink:d=1.0:a=0.5,bandpass=f=500:w=400,afade=t=in:d=0.7,afade=t=out:st=0.75:d=0.25,volume=0.7`, "out/fx_dive.wav"]);
ff(["-f", "lavfi", "-i", `sine=f=1320:d=0.35`, "-f", "lavfi", "-i", `sine=f=1760:d=0.45`, "-filter_complex", "[0][1]amix=inputs=2,afade=t=out:st=0.05:d=0.4,volume=0.6", "out/fx_ding.wav"]);
ff(["-f", "lavfi", "-i", `sine=f=880:d=0.12,afade=t=out:st=0:d=0.12,volume=0.35`, "out/fx_tick.wav"]);
// base: accordo morbido (do maggiore aperto) con apertura epica e calo durante la spiegazione
const pad = [130.81, 196.0, 261.63, 329.63].map((f) => `sine=f=${f}:d=${DUR}`);
ff([...pad.flatMap((p) => ["-f", "lavfi", "-i", p]), "-filter_complex",
  `amix=inputs=4,lowpass=f=1200,tremolo=f=0.25:d=0.25,volume='if(lt(t,2.6),0.5*t/2.6+0.1, if(lt(t,${T.sarcIn}),0.18, if(lt(t,${T.backIn}),0.12, if(lt(t,${T.end}),0.16,0.3))))':eval=frame,afade=t=in:d=0.4,afade=t=out:st=${DUR - 1.2}:d=1.2`, "out/pad.wav"]);
const fx = [
  ["out/fx_kick.wav", 0.18], ["out/fx_whoosh.wav", 0.25], ["out/fx_net.wav", T.l01 - 0.55],
  ["out/fx_whistle.wav", word("l04", "Fermi") - 0.45], ["out/fx_dive.wav", T.sarcIn - 0.75], ["out/fx_dive.wav", T.backIn - 0.6],
  ["out/fx_tick.wav", word("l09", "Tre")], ["out/fx_tick.wav", word("l09", "due")], ["out/fx_tick.wav", word("l09", "uno")],
  ["out/fx_ding.wav", L.l10.start + 0.1],
];
const ins = [...TL.lines.map((l) => [`out/${l.id}.mp3`, l.start]), ...fx];
const args = ["-i", "out/pad.wav"]; const parts = [];
ins.forEach(([f, t], i) => { args.push("-i", f); parts.push(`[${i + 1}:a]aresample=${sr},adelay=${Math.round(t * 1000)}:all=1[a${i}]`); });
// ducking: la base scende quando parlano
const voices = TL.lines.map((_, i) => `[a${i}]`).join("");
const filt = [...parts,
  `${voices}amix=inputs=${TL.lines.length}:normalize=0,asplit=2[v][vk]`,
  `[0:a]aresample=${sr}[pad]`, `[pad][vk]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=350[padd]`,
  `${fx.map((_, i) => `[a${TL.lines.length + i}]`).join("")}amix=inputs=${fx.length}:normalize=0[fx]`,
  `[v][padd][fx]amix=inputs=3:normalize=0,atrim=0:${DUR},loudnorm=I=-16:TP=-1.5:LRA=11[out]`];
ff([...args, "-filter_complex", filt.join(";"), "-map", "[out]", "-ar", String(sr), "out/mix.wav"]);
console.log("mix ok", DUR);
