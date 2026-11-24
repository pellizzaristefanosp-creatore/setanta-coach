// Toglie gli indizi dalle domande a scelta multipla: le risposte sbagliate diventano dello stesso genere e numero
// della giusta, di lunghezza simile e plausibili; la risposta giusta non cambia mai.
// Uso: node scripts/fix-indizi.mjs 4.3   (serve OpenAI; scrive i file in src/data)
import { readFileSync, writeFileSync } from "node:fs";

const CODE = process.argv[2];
const D = "src/data";
const lesson = JSON.parse(readFileSync(`${D}/lessons/${CODE}.json`, "utf8"));
const turns = JSON.parse(readFileSync(`${D}/turns/${CODE}.json`, "utf8"));
const games = JSON.parse(readFileSync(`${D}/games/${CODE}.json`, "utf8"));
const TEXT = lesson.parts.map((p, i) => `[parte ${i}] ${p.title}: ${p.narration}`).join("\n").slice(0, 14000);

const RULES = `Sei un esperto di valutazione (item writing) e di scienze motorie. Ripari domande a scelta multipla di una lezione:
lo studente indovina la risposta giusta perché è la più lunga o perché il genere/numero/articolo la tradisce.
Per ogni domanda riscrivi SOLO le opzioni sbagliate (la giusta resta IDENTICA, carattere per carattere) così:
- stesso genere grammaticale, stesso numero e stessa costruzione iniziale della giusta (articolo, preposizione: se la giusta inizia con "All'", anche le altre con "Alla/Al/All'..." coerenti con la domanda);
- lunghezza simile alla giusta: ognuna tra il 75% e il 125% dei caratteri della giusta;
- plausibili per chi non ha studiato, ma chiaramente sbagliate secondo il testo della lezione; niente "tutte le precedenti", niente assurdità, niente sinonimi della giusta;
- nessuna opzione deve contenere parole della domanda che la giusta non ha (niente indizi).
Puoi ritoccare la domanda solo se contiene un indizio grammaticale verso una sola risposta (es. "Quale è la..." con un'opzione sola femminile): in quel caso rendila neutra senza cambiarne il senso.
Rispondi SOLO con JSON: {"items":[{"id":"...","question":"...","options":["...","...","...","..."]}]} con la giusta nella STESSA posizione di prima.`;

const WHO_RULES = `Gioco "Chi sono io?": tre indizi in prima persona e quattro nomi (uno giusto). Ripara:
- i tre nomi sbagliati: stessa categoria (esercizio, muscolo, test, fase...), stesso genere e numero del giusto, lunghezza simile, tutti presenti o plausibili nella lezione;
- gli indizi: niente aggettivi o participi che rivelano il genere o il numero del giusto (es. "sono usata", "siamo"); usa forme neutre ("mi usi", "servo a", "con me...") e il singolare;
- la risposta giusta resta IDENTICA, i fatti degli indizi restano quelli.
Rispondi SOLO con JSON: {"items":[{"id":"...","clues":["...","...","..."],"distractors":["...","...","..."]}]}`;

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

// tutte le domande a 4 opzioni del file, con un id e il punto dove rimetterle
const mcq = [];
lesson.parts.forEach((p, i) => p.check && mcq.push({ id: `c${i}`, q: p.check }));
(lesson.questions ?? []).forEach((q, i) => mcq.push({ id: `q${i}`, q }));
turns.turns.forEach((t, i) => mcq.push({ id: `t${i}`, q: t }));

const len = (s) => s.length;
function ok(orig, nu) {
  if (!nu || !Array.isArray(nu.options) || nu.options.length !== orig.options.length) return false;
  if (nu.options[orig.answer] !== orig.options[orig.answer]) return false;
  const L = len(orig.options[orig.answer]);
  return nu.options.every((o, i) => typeof o === "string" && o.trim() && (i === orig.answer || (len(o) >= L * 0.7 && len(o) <= L * 1.35 && o !== orig.options[orig.answer])))
    && typeof nu.question === "string" && nu.question.length > 8;
}

let fixed = 0, kept = 0;
for (let b = 0; b < mcq.length; b += 20) {
  const batch = mcq.slice(b, b + 20);
  const input = `Testo della lezione ${CODE} (${lesson.title}):\n${TEXT}\n\nDomande:\n${JSON.stringify(batch.map((x) => ({ id: x.id, question: x.q.question, options: x.q.options, giusta: x.q.answer })))}`;
  const out = await ask(RULES, input);
  const by = Object.fromEntries((out.items ?? []).map((x) => [x.id, x]));
  for (const x of batch) {
    const nu = by[x.id];
    if (ok(x.q, nu)) { x.q.options = nu.options; x.q.question = nu.question; fixed++; } else kept++;
  }
}

// chi sono io
const who = games.who.map((w, i) => ({ id: `w${i}`, w }));
const outW = await ask(WHO_RULES, `Testo della lezione ${CODE}:\n${TEXT}\n\nVoci:\n${JSON.stringify(who.map((x) => ({ id: x.id, clues: x.w.clues, answer: x.w.answer, distractors: x.w.distractors })))}`);
const byW = Object.fromEntries((outW.items ?? []).map((x) => [x.id, x]));
let wfix = 0;
for (const x of who) {
  const nu = byW[x.id], L = len(x.w.answer);
  if (nu && Array.isArray(nu.clues) && nu.clues.length === x.w.clues.length && Array.isArray(nu.distractors) && nu.distractors.length === x.w.distractors.length
    && nu.distractors.every((d) => typeof d === "string" && d !== x.w.answer && len(d) >= Math.min(L * 0.5, L - 4) && len(d) <= Math.max(L * 1.6, L + 6))) { x.w.clues = nu.clues; x.w.distractors = nu.distractors; wfix++; }
}

writeFileSync(`${D}/lessons/${CODE}.json`, JSON.stringify(lesson, null, 2) + "\n");
writeFileSync(`${D}/turns/${CODE}.json`, JSON.stringify(turns, null, 1));
writeFileSync(`${D}/games/${CODE}.json`, JSON.stringify(games, null, 1));
console.log(JSON.stringify({ code: CODE, domande: mcq.length, sistemate: fixed, lasciate: kept, chiSonoIo: `${wfix}/${who.length}` }));
