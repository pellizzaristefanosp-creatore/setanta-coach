// Una puntata dal copione al video: voci → tempi → fotogrammi → mix → mp4 (1080×1920) → controllo con trascrizione.
// Uso (da studio/spiega, con il server http su :8765 dalla radice del repo): node puntate/fai.mjs 4.3
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const CODE = process.argv[2], DIR = `puntate/${CODE}`, OUT = `${DIR}/out`;
const spec = JSON.parse(readFileSync(`${DIR}/spec.json`, "utf8"));
const V = { PROF: "JBFqnCBsd6RMkjVDRZzb", STE: "bIHbv24MWmeRgasZH58o" };
mkdirSync(OUT, { recursive: true });

// 1. voci con i tempi di ogni lettera
for (const b of spec.battute) {
  if (existsSync(`${OUT}/${b.id}.json`)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${V[b.chi]}/with-timestamps?output_format=mp3_44100_128`, { method: "POST",
    headers: { "xi-api-key": "proxy-injected", "content-type": "application/json" }, body: JSON.stringify({ text: b.testo, model_id: "eleven_v4", language_code: "it" }) });
  if (!r.ok) throw new Error(`voce ${b.id}: ${r.status} ${await r.text()}`);
  const j = await r.json(); writeFileSync(`${OUT}/${b.id}.mp3`, Buffer.from(j.audio_base64, "base64"));
  writeFileSync(`${OUT}/${b.id}.json`, JSON.stringify({ chars: j.alignment.characters, start: j.alignment.character_start_times_seconds, end: j.alignment.character_end_times_seconds }));
}

// 2. tempi: pause più lunghe al cambio di scena
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
let t = 0.7; const lines = []; let prev = null;
for (const b of spec.battute) {
  t += prev == null ? 0 : prev.scena !== b.scena ? 1.1 : prev.chi !== b.chi ? 0.45 : 0.3;
  const al = JSON.parse(readFileSync(`${OUT}/${b.id}.json`, "utf8")), d = dur(`${OUT}/${b.id}.mp3`);
  lines.push({ id: b.id, chi: b.chi, start: +t.toFixed(3), dur: +d.toFixed(3), al }); t += d; prev = b;
}
const DURATION = +(t + 2).toFixed(2);
writeFileSync(`${OUT}/timeline.json`, JSON.stringify({ lines, DURATION }));
console.log("durata", DURATION);

if (process.env.STOP) process.exit(0);
// 3. fotogrammi
const frames = `${OUT}/frames`;
if (process.env.SKIP !== "render") { rmSync(frames, { recursive: true, force: true }); mkdirSync(frames); execFileSync("node", ["puntate/render.cjs", CODE, frames], { stdio: "inherit" }); }

// 4. mix: voci, palestra all'inizio e alla fine, ronzio sulla lavagna, whoosh ai cambi
const S = "out"; // effetti già fatti per la 5.1
const L = Object.fromEntries(lines.map((l) => [l.id, l]));
const lav = spec.battute.filter((b) => b.scena === "lavagna"), last = spec.battute.at(-1);
const tIn = L[lav[0].id].start - 0.3, tOut = last.scena === "palestra" ? L[last.id].start - 0.25 : DURATION;
const args = [], f = [];
lines.forEach((l, i) => { args.push("-i", `${OUT}/${l.id}.mp3`); f.push(`[${i}:a]aresample=44100,adelay=${Math.round(l.start * 1000)}:all=1[v${i}]`); });
const n = lines.length;
args.push("-i", `${S}/sfx_gym.mp3`, "-i", `${S}/sfx_hum.mp3`, "-i", `${S}/sfx_whoosh.mp3`, "-i", `${S}/sfx_gym.mp3`, "-i", `${S}/sfx_whoosh.mp3`);
f.push(
  `[${n}:a]aresample=44100,loudnorm=I=-32:TP=-8,atrim=0:${(tIn + 1).toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${tIn.toFixed(2)}:d=1[gym]`,
  `[${n + 1}:a]aresample=44100,aloop=loop=3:size=2e6,atrim=0:${(tOut - tIn).toFixed(2)},loudnorm=I=-33:TP=-8,afade=t=in:d=1,afade=t=out:st=${Math.max(0, tOut - tIn - 1.2).toFixed(2)}:d=1.2,adelay=${Math.round(tIn * 1000)}:all=1[hum]`,
  `[${n + 2}:a]aresample=44100,loudnorm=I=-22:TP=-3,adelay=${Math.round((tIn + 0.4) * 1000)}:all=1[wh]`,
  `[${n + 3}:a]aresample=44100,loudnorm=I=-32:TP=-8,atrim=0:${Math.max(0.1, DURATION - tOut).toFixed(2)},afade=t=in:d=0.5,afade=t=out:st=${Math.max(0, DURATION - tOut - 1).toFixed(2)}:d=1,adelay=${Math.round(tOut * 1000)}:all=1[gym2]`,
  `[${n + 4}:a]aresample=44100,loudnorm=I=-24:TP=-4,adelay=${Math.round(Math.max(0, tOut - 0.3) * 1000)}:all=1[wh2]`,
  `${lines.map((_, i) => `[v${i}]`).join("")}amix=inputs=${n}:normalize=0,loudnorm=I=-16:TP=-1.5,aresample=44100,apad=whole_dur=${DURATION}[vo]`,
  ...["gym", "hum", "wh", "gym2", "wh2"].map((x) => `[${x}]apad=whole_dur=${DURATION}[${x}p]`),
  `[vo][gymp][hump][whp][gym2p][wh2p]amix=inputs=6:normalize=0:duration=first:dropout_transition=0,atrim=0:${DURATION},alimiter=limit=0.9[out]`,
);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args, "-filter_complex", f.join(";"), "-map", "[out]", "-ar", "44100", `${OUT}/mix.wav`]);

// 5. video finale e versione per l'app
const mp4 = `${DIR}/puntata-${CODE}.mp4`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", `${frames}/%05d.png`, "-i", `${OUT}/mix.wav`, "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-shortest", mp4]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf", "scale=720:1280", "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", `${DIR}/app.mp4`]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(L[lav[0].id].start + 2.5), "-i", mp4, "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "4", `${DIR}/app.jpg`]);

// 6. controllo: la trascrizione deve seguire il copione
const fd = new FormData(); fd.append("model", "gpt-4o-mini-transcribe"); fd.append("language", "it");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${OUT}/mix.wav`, "-ac", "1", "-b:a", "64k", `${OUT}/qa.mp3`]);
fd.append("file", new Blob([readFileSync(`${OUT}/qa.mp3`)], { type: "audio/mpeg" }), "qa.mp3");
const q = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: "Bearer proxy-injected" }, body: fd });
const heard = q.ok ? (await q.json()).text : `trascrizione non riuscita ${q.status}`;
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\[[^\]]*\]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
const want = norm(spec.battute.map((b) => b.testo).join(" ")), got = new Set(norm(heard));
const missing = want.filter((w) => w.length > 3 && !got.has(w));
writeFileSync(`${OUT}/qa.txt`, `${heard}\n\nmancano: ${missing.join(", ")}`);
console.log(JSON.stringify({ code: CODE, DURATION, mp4, missing }));
