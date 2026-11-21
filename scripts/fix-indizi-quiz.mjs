// Toglie gli indizi dalle domande a scelta multipla: le risposte sbagliate diventano dello stesso genere e numero
// della giusta, di lunghezza simile e plausibili; la risposta giusta non cambia mai.
// Uso: node scripts/fix-indizi.mjs 4.3   (serve OpenAI; scrive i file in src/data)
import { readFileSync, writeFileSync } from "node:fs";

const CODE = "quiz";
const D = "src/data";
const file = JSON.parse(readFileSync(`${D}/questions.json`, "utf8"));
const RULES = `Sei un esperto di valutazione (item writing) e di scienze motorie. Ripari domande a scelta multipla di una lezione:
lo studente indovina la risposta giusta perché è la più lunga o perché il genere/numero/articolo la tradisce.
Per ogni domanda riscrivi SOLO le opzioni sbagliate (la giusta resta IDENTICA, carattere per carattere) così:
- stesso genere grammaticale, stesso numero e stessa costruzione iniziale della giusta (articolo, preposizione: se la giusta inizia con "All'", anche le altre con "Alla/Al/All'..." coerenti con la domanda);
- lunghezza simile alla giusta: ognuna tra il 75% e il 125% dei caratteri della giusta;
- plausibili per chi non ha studiato, ma chiaramente sbagliate secondo il testo della lezione; niente "tutte le precedenti", niente assurdità, niente sinonimi della giusta;
- nessuna opzione deve contenere parole della domanda che la giusta non ha (niente indizi).
Puoi ritoccare la domanda solo se contiene un indizio grammaticale verso una sola risposta (es. "Quale è la..." con un'opzione sola femminile): in quel caso rendila neutra senza cambiarne il senso.
Rispondi SOLO con JSON: {"items":[{"id":"...","question":"...","options":["...","...","...","..."]}]} con la giusta nella STESSA posizione di prima.`;

async function ask(instructions, input) {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: "Bearer proxy-injected", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-6.2-sol", instructions, input: `${input}\n\nRispondi in JSON.`, text: { format: { type: "json_object" } }, max_output_tokens: 16000 }) });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      return JSON.parse(d.output.filter((o) => o.type === "message").flatMap((o) => o.content).map((c) => c.text ?? "").join(""));
    } catch (e) { console.error(CODE, "riprovo:", e.message); }
  }
  return { items: [] };
}

const len = (s) => s.length;
function ok(orig, nu) {
  if (!nu || !Array.isArray(nu.options) || nu.options.length !== orig.options.length) return false;
  if (nu.options[orig.answer] !== orig.options[orig.answer]) return false;
  const L = len(orig.options[orig.answer]);
  return nu.options.every((o, i) => typeof o === "string" && o.trim() && (i === orig.answer || (len(o) >= L * 0.7 && len(o) <= L * 1.35 && o !== orig.options[orig.answer])))
    && typeof nu.question === "string" && nu.question.length > 8;
}

let fixed = 0, kept = 0;
const groups = {};
for (const q of file.questions) (groups[q.presentation] ??= []).push(q);
for (const [code, qs] of Object.entries(groups)) {
  let TEXT = "";
  try { const L = JSON.parse(readFileSync(`${D}/lessons/${code}.json`, "utf8")); TEXT = L.parts.map((p) => `${p.title}: ${p.narration}`).join("\n").slice(0, 14000); } catch {}
  const out = await ask(RULES, `Testo della lezione ${code}:\n${TEXT}\n\nDomande:\n${JSON.stringify(qs.map((q) => ({ id: q.id, question: q.question, options: q.options, giusta: q.answer })))}`);
  const by = Object.fromEntries((out.items ?? []).map((x) => [x.id, x]));
  for (const q of qs) { const nu = by[q.id]; if (ok(q, nu)) { q.options = nu.options; q.question = nu.question; fixed++; } else kept++; }
}
writeFileSync(`${D}/questions.json`, JSON.stringify(file, null, 2) + "\n");
console.log(JSON.stringify({ quiz: file.questions.length, sistemate: fixed, lasciate: kept }));
