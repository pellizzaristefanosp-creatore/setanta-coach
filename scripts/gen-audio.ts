// Crea gli audio delle lezioni dai dialoghi (ElevenLabs, modello v4).
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx tsx scripts/gen-audio.ts 4.5 5.1 [--budget 20000]
// La chiave la mette il proxy della sessione: qui si manda un segnaposto.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VOICES = { M: "JBFqnCBsd6RMkjVDRZzb", L: "bIHbv24MWmeRgasZH58o" } as const; // Marco = George, Luca = Will
const MODEL = "eleven_v4";
const GAP = 0.35; // secondi tra una battuta e l'altra
const THINK = 1.2; // dopo una domanda di Marco: tempo per rispondere nella testa
const PARALLEL = 3;

type Line = { who: "M" | "L"; text: string };
type Dialogue = { code: string; parts: { part: number; lines: Line[] }[] };
export type AudioPart = { src: string; duration: number; lines: { who: "M" | "L"; start: number; text: string }[] };

const args = process.argv.slice(2);
const budgetIdx = args.indexOf("--budget");
const budget = budgetIdx >= 0 ? Number(args[budgetIdx + 1]) : Infinity;
const codes = args.filter((a, i) => !a.startsWith("--") && i !== budgetIdx + 1);
let spent = 0;

const tmp = join(tmpdir(), "setanta-audio");
mkdirSync(tmp, { recursive: true });

function duration(file: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

function silence(seconds: number): string {
  const f = join(tmp, `gap-${seconds}.mp3`);
  if (!existsSync(f)) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(seconds), "-b:a", "128k", f]);
  return f;
}

async function tts(line: Line, out: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[line.who]}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": "proxy-injected", "content-type": "application/json" },
      body: JSON.stringify({ text: line.text, model_id: MODEL, language_code: "it" }),
    });
    if (res.ok) {
      spent += Number(res.headers.get("character-cost") ?? 0);
      writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      return;
    }
    const body = await res.text();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error("ElevenLabs: troppi tentativi");
}

const clean = (t: string) => t.replace(/\[[^\]]*\]\s*/g, "").trim();

async function makePart(code: string, part: number, lines: Line[]): Promise<AudioPart> {
  const dir = join(tmp, code, String(part));
  mkdirSync(dir, { recursive: true });
  const pieces: string[] = [];
  const timed: AudioPart["lines"] = [];
  let t = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const f = join(dir, `${String(i).padStart(2, "0")}.mp3`);
    if (!existsSync(f)) await tts(line, f);
    timed.push({ who: line.who, start: Math.round(t * 100) / 100, text: clean(line.text) });
    pieces.push(f);
    t += duration(f);
    const pause = line.who === "M" && clean(line.text).endsWith("?") && lines[i + 1]?.who === "L" ? THINK : GAP;
    if (i < lines.length - 1) {
      pieces.push(silence(pause));
      t += pause;
    }
  }
  const list = join(dir, "list.txt");
  writeFileSync(list, pieces.map((p) => `file '${p}'`).join("\n"));
  const outDir = join("public", "audio", code);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${part + 1}.mp3`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-ac", "1", "-ar", "24000", "-b:a", "48k", out]);
  return { src: `/audio/${code}/${part + 1}.mp3`, duration: Math.round(duration(out) * 10) / 10, lines: timed };
}

for (const code of codes) {
  const dialogue = JSON.parse(readFileSync(`src/data/dialogues/${code}.json`, "utf8")) as Dialogue;
  const manifestFile = `src/data/audio/${code}.json`;
  mkdirSync("src/data/audio", { recursive: true });
  const manifest: { code: string; parts: Record<string, AudioPart> } = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : { code, parts: {} };
  const todo = dialogue.parts.filter((p) => !manifest.parts[String(p.part)]);
  console.log(`${code}: ${todo.length} parti da fare`);
  for (let i = 0; i < todo.length; i += PARALLEL) {
    if (spent >= budget) {
      console.log(`Budget raggiunto (${spent} crediti): mi fermo.`);
      break;
    }
    const batch = todo.slice(i, i + PARALLEL);
    const results = await Promise.all(batch.map((p) => makePart(code, p.part, p.lines)));
    batch.forEach((p, k) => (manifest.parts[String(p.part)] = results[k]!));
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
    console.log(`  ${code}: ${Object.keys(manifest.parts).length}/${dialogue.parts.length} · crediti usati in questa corsa: ${spent}`);
  }
  if (Object.keys(manifest.parts).length === dialogue.parts.length) rmSync(join(tmp, code), { recursive: true, force: true });
}
console.log(`Fatto. Crediti usati: ${spent}`);
