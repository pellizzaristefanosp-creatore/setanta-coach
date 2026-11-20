import { writeFileSync } from "node:fs";
let spent = 0;
for (const [id, text, d] of [
  ["hum", "Soft futuristic science lab ambience, gentle low hologram hum, faint electronic shimmer, calm, no music, no voices", 22],
  ["gym", "Indoor gym ambience, soft and distant: weights clinking far away, light room reverb, no music, no voices", 8],
  ["whoosh", "A smooth deep cinematic whoosh zooming into something, short", 2],
  ["tick", "A soft gentle UI pop click, subtle", 1],
]) {
  const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", { method: "POST", headers: { "xi-api-key": "proxy-injected", "content-type": "application/json" }, body: JSON.stringify({ text, duration_seconds: d, prompt_influence: 0.5 }) });
  spent += Number(r.headers.get("character-cost") ?? 0); writeFileSync(`out/sfx_${id}.mp3`, Buffer.from(await r.arrayBuffer()));
}
console.log("crediti", spent);
