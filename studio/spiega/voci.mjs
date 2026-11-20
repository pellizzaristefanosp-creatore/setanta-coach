// Voci con i tempi di ogni lettera (ElevenLabs v4). Prof = George, Ste = Will.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const V = { PROF: "JBFqnCBsd6RMkjVDRZzb", STE: "bIHbv24MWmeRgasZH58o" };
const c = JSON.parse(readFileSync("copione.json", "utf8")); let spent = 0;
for (const b of c.battute) {
  if (existsSync(`out/${b.id}.json`)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${V[b.chi]}/with-timestamps?output_format=mp3_44100_128`, { method: "POST",
    headers: { "xi-api-key": "proxy-injected", "content-type": "application/json" }, body: JSON.stringify({ text: b.testo, model_id: "eleven_v4", language_code: "it" }) });
  if (!r.ok) { console.log("ERRORE", b.id, r.status); continue; }
  spent += Number(r.headers.get("character-cost") ?? 0);
  const j = await r.json(); writeFileSync(`out/${b.id}.mp3`, Buffer.from(j.audio_base64, "base64"));
  writeFileSync(`out/${b.id}.json`, JSON.stringify({ chars: j.alignment.characters, start: j.alignment.character_start_times_seconds, end: j.alignment.character_end_times_seconds }));
}
console.log("crediti", spent);
