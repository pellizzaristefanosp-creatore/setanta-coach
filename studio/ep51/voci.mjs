import { readFileSync, writeFileSync, existsSync } from "node:fs";
let spent = 0;
for (const l of JSON.parse(readFileSync(process.argv[2] ?? "battute.json", "utf8"))) {
  if (existsSync(`out/${l.id}.mp3`)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${l.voice}?output_format=mp3_44100_128`, { method: "POST",
    headers: { "xi-api-key": "proxy-injected", "content-type": "application/json" }, body: JSON.stringify({ text: l.text, model_id: "eleven_v4", language_code: "it" }) });
  if (!r.ok) { console.log("ERRORE", l.id, r.status, (await r.text()).slice(0, 200)); continue; }
  spent += Number(r.headers.get("character-cost") ?? 0); writeFileSync(`out/${l.id}.mp3`, Buffer.from(await r.arrayBuffer())); console.log(l.id, "ok");
}
console.log("crediti", spent);
