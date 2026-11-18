// Controllo incrociato: un secondo passaggio confronta ogni elemento dei giochi con il testo della lezione.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx tsx scripts/check-games.ts [codici...]
import { readdirSync, readFileSync } from "node:fs";
const SYS = `Sei un revisore scientifico severo. Ricevi il testo di una lezione e un elenco numerato di elementi di gioco.
Per ogni elemento controlla SOLO contro il testo: è corretto e sostenuto dal testo? Per "order": l'ordine è quello del testo?
Per "who": la risposta è l'unica giusta tra le opzioni dati gli indizi? Per "tf": il valore vero/falso è giusto?
Rispondi in JSON: {"problems":[{"n":numero,"reason":"breve motivo"}]}. Se è tutto corretto: {"problems":[]}.`;
const codes = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync("src/data/games").map((f) => f.replace(".json", ""));
for (const code of codes) {
  const lesson = JSON.parse(readFileSync(`src/data/lessons/${code}.json`, "utf8"));
  const g = JSON.parse(readFileSync(`src/data/games/${code}.json`, "utf8"));
  const text = lesson.parts.map((p: { slide: number; narration: string }) => `SLIDE ${p.slide}: ${p.narration}`).join("\n");
  const items: string[] = [];
  for (const o of g.order) items.push(`order (slide ${o.slide}) "${o.title}": ${o.steps.join(" > ")}`);
  for (const w of g.who) items.push(`who (slide ${w.slide}): indizi: ${w.clues.join(" / ")} · risposta: ${w.answer} · opzioni sbagliate: ${w.distractors.join(", ")}`);
  for (const t of g.truefalse) items.push(`tf (slide ${t.slide}): "${t.text}" = ${t.true ? "VERO" : "FALSO"} · perché: ${t.why}`);
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: "Bearer proxy-injected", "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-6.2-sol", instructions: SYS, input: `TESTO:\n${text}\n\nELEMENTI:\n${items.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nRispondi in JSON.`, text: { format: { type: "json_object" } }, max_output_tokens: 3000 }),
  });
  const data = (await res.json()) as { output?: { type: string; content?: { text?: string }[] }[] };
  const out = JSON.parse((data.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("") || "{}");
  const probs = (out.problems ?? []) as { n: number; reason: string }[];
  console.log(`${code}: ${probs.length} da rivedere`);
  for (const p of probs) console.log(`   #${p.n} ${items[p.n - 1]?.slice(0, 160)}\n      → ${p.reason}`);
}
