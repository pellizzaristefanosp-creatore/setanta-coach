// Voci con i tempi di ogni lettera (ElevenLabs v4, chiave messa dal proxy). Uso: node voce.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const V = { M: "JBFqnCBsd6RMkjVDRZzb", L: "bIHbv24MWmeRgasZH58o" };
const d = JSON.parse(readFileSync("dialogo.json", "utf8")); let spent = 0;
for (const l of d.lines) {
  const mp3 = `out/${l.id}.mp3`, js = `out/${l.id}.json`;
  if (existsSync(js)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${V[l.who]}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": "proxy-injected", "content-type": "application/json" },
    body: JSON.stringify({ text: l.text, model_id: "eleven_v4", language_code: "it" }) });
  if (!r.ok) { console.log("ERRORE", l.id, r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  spent += Number(r.headers.get("character-cost") ?? 0);
  const j = await r.json(); writeFileSync(mp3, Buffer.from(j.audio_base64, "base64"));
  const a = j.alignment; writeFileSync(js, JSON.stringify({ chars: a.characters, start: a.character_start_times_seconds, end: a.character_end_times_seconds }));
  console.log(l.id, "ok");
}
console.log("crediti", spent);
