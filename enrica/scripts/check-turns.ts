// Controllo incrociato dei turni "Tocca a te": la risposta giusta è sostenuta dalla lezione e dal dialogo? è l'unica giusta?
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx tsx scripts/check-turns.ts [codici...]
import { readdirSync, readFileSync } from "node:fs";
const SYS = `Sei un revisore scientifico severo. Ricevi il testo di una lezione e domande a scelta multipla numerate, ognuna con
la risposta indicata come giusta. Per ogni domanda verifica SOLO contro il testo: la risposta indicata è corretta? è l'UNICA
corretta (nessuna delle altre è anch'essa vera)? Il "perché" è corretto? Rispondi in JSON {"problems":[{"n":numero,"reason":"breve"}]}.`;
const codes = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync("src/data/turns").map((f) => f.replace(".json", ""));
for (const code of codes) {
  const lesson = JSON.parse(readFileSync(`src/data/lessons/${code}.json`, "utf8"));
  const t = JSON.parse(readFileSync(`src/data/turns/${code}.json`, "utf8")).turns as { question: string; options: string[]; answer: number; why: string }[];
  const text = lesson.parts.map((p: { slide: number; narration: string }) => `SLIDE ${p.slide}: ${p.narration}`).join("\n");
  const items = t.map((q, i) => `${i + 1}. ${q.question}\n   ${q.options.map((o, k) => `${"ABCD"[k]}) ${o}`).join("  ")}\n   GIUSTA: ${"ABCD"[q.answer]} · perché: ${q.why}`).join("\n");
  const res = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: "Bearer proxy-injected", "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-6.2-sol", instructions: SYS, input: `TESTO:\n${text}\n\nDOMANDE:\n${items}\n\nRispondi in JSON.`, text: { format: { type: "json_object" } }, max_output_tokens: 4000 }) });
  const data = (await res.json()) as { output?: { type: string; content?: { text?: string }[] }[] };
  const out = JSON.parse((data.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("") || "{}");
  const probs = (out.problems ?? []) as { n: number; reason: string }[];
  console.log(`${code}: ${probs.length} da rivedere su ${t.length}`);
  for (const p of probs) console.log(`  #${p.n} ${t[p.n - 1]?.question}\n     → ${p.reason}`);
}
