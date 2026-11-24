// Scrive i turni "Tocca a te" di ogni lezione (src/data/turns/<codice>.json) dai dialoghi Marco/Luca, con OpenAI.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx tsx scripts/gen-turns.ts [codici...]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { TurnPackSchema } from "../src/lib/turnSchema";

const GUIDE = `Sei un preparatore atletico e un ottimo insegnante. In un dialogo tra Marco (preparatore) e Luca (calciatore)
ci sono domande seguite da una risposta. In alcuni momenti l'app si ferma e fa rispondere lo STUDENTE al posto di chi risponde.
Per ogni domanda candidata che ricevi crea una domanda a scelta multipla che verifica se lo studente ha capito il CONCETTO,
cioè come si ragiona, non se ricorda le parole.
Regole:
- La risposta giusta è il contenuto della battuta di risposta del dialogo, detto in breve. Niente fatti fuori dal testo.
- Le tre sbagliate sono ragionamenti sbagliati plausibili, gli errori tipici di chi ha capito a metà. Mai assurde, mai
  trabocchetti di parole. Stessa lunghezza e stile della giusta.
- "question": la domanda riscritta in modo chiaro e completo, comprensibile da sola, max 18 parole.
- "options": 4, max 14 parole l'una. "answer": indice della giusta; varia la posizione tra le domande.
- "why": il ragionamento giusto in parole semplici, max 28 parole, che spiega PERCHÉ (non ripete solo la risposta).
- Se una domanda candidata non ha una risposta di contenuto (battuta, scherzo, domanda retorica), scartala.
Rispondi con JSON: {"turns":[{"part","line","question","options","answer","why"}]}, usando part e line della candidata.`;

const clean = (s: string) => s.replace(/\[[^\]]*\]\s*/g, "").trim();

async function ask(input: string): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: "Bearer proxy-injected", "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-6.2-sol", instructions: GUIDE, input: `${input}\n\nRispondi in JSON.`, text: { format: { type: "json_object" } }, max_output_tokens: 12000 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { output?: { type: string; content?: { text?: string }[] }[] };
  return JSON.parse((data.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join(""));
}

const args = process.argv.slice(2);
const codes = args.length ? args : readdirSync("src/data/dialogues").map((f) => f.replace(".json", ""));
for (const code of codes) {
  const out = `src/data/turns/${code}.json`;
  if (existsSync(out)) { console.log(code, "già fatto"); continue; }
  const d = JSON.parse(readFileSync(`src/data/dialogues/${code}.json`, "utf8")) as { parts: { part: number; lines: { who: "M" | "L"; text: string }[] }[] };
  const lesson = JSON.parse(readFileSync(`src/data/lessons/${code}.json`, "utf8"));
  const cands: { part: number; line: number; q: string; a: string; ctx: string }[] = [];
  for (const p of d.parts) p.lines.forEach((l, i) => {
    const next = p.lines[i + 1];
    if (clean(l.text).endsWith("?") && next && next.who !== l.who && clean(next.text).split(" ").length >= 6)
      cands.push({ part: p.part, line: i, q: clean(l.text), a: clean(next.text), ctx: p.lines.slice(Math.max(0, i - 2), i).map((x) => clean(x.text)).join(" ") });
  });
  if (cands.length === 0) { console.log(code, "nessuna domanda"); continue; }
  const text = lesson.parts.map((p: { slide: number; narration: string }, i: number) => `PARTE ${i} (slide ${p.slide}): ${p.narration}`).join("\n");
  const list = cands.map((c) => `- part ${c.part}, line ${c.line}\n  contesto: ${c.ctx}\n  DOMANDA: ${c.q}\n  RISPOSTA DEL DIALOGO: ${c.a}`).join("\n");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = (await ask(`Lezione ${code}. Testo della lezione:\n${text}\n\nDomande candidate:\n${list}`)) as { turns?: unknown[] };
      const parsed = TurnPackSchema.safeParse({ code, turns: raw.turns ?? [] });
      if (!parsed.success) { console.log(code, "non valido, riprovo"); continue; }
      const keys = new Set(cands.map((c) => `${c.part}:${c.line}`));
      const turns = parsed.data.turns.filter((t) => keys.has(`${t.part}:${t.line}`) && new Set(t.options).size === 4);
      writeFileSync(out, JSON.stringify({ code, turns }, null, 1) + "\n");
      const pos = [0, 1, 2, 3].map((k) => turns.filter((t) => t.answer === k).length).join("/");
      console.log(code, `ok · ${turns.length} domande su ${cands.length} candidate · posizioni giuste ${pos}`);
      break;
    } catch (e) { console.log(code, "errore:", (e as Error).message); }
  }
}
