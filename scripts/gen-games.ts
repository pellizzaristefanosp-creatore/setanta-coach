// Scrive i giochi di ogni lezione (src/data/games/<codice>.json) dal pacchetto lezione, con OpenAI.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx tsx scripts/gen-games.ts [codici...]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod/v4";
import { GamePackSchema } from "../src/lib/gameSchema";

const GUIDE = `Sei un preparatore atletico e un ottimo insegnante. Dal testo di una lezione del corso "Allenamento della Forza 2"
crei giochi per ripassare. Lo studente è un calciatore e preparatore atletico che prepara un esame a risposta multipla.
Regole d'oro:
- Usa SOLO i fatti del testo. Niente numeri, nomi o relazioni che il testo non dice. Usa i termini del testo.
- Ogni elemento ha "slide" = il numero di slide da cui viene.
- Italiano semplice, frasi brevi.
"order": da 1 a 4 sequenze. Solo processi o elenchi che il testo presenta DAVVERO in un ordine preciso
  (fasi, passaggi, catene causa-effetto, dal più al meno). 4–7 passaggi, nell'ordine giusto, ognuno max 9 parole,
  tutti diversi tra loro. Se la lezione non ha processi ordinati, metti una sola sequenza tratta dal riepilogo.
"who": 6–8 indovinelli. Tre indizi dal più difficile al più facile; non scrivere la risposta né una sua parte negli indizi.
  "answer" 1–4 parole; "distractors" tre concetti sbagliati ma plausibili, presi dalla stessa lezione.
"truefalse": 14–16 frasi, metà vere e metà false. Le false contengono gli errori tipici (cose che uno studente confonde),
  mai trabocchetti sulle parole. "why" spiega in breve.
Rispondi con un oggetto JSON: {"code","order":[{"title","steps","slide"}],"who":[{"clues","answer","distractors","slide"}],"truefalse":[{"text","true","why","slide"}]}`;

async function ask(input: string): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: "Bearer proxy-injected", "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-6.2-sol", instructions: GUIDE, input: `${input}\n\nRispondi in JSON.`, text: { format: { type: "json_object" } }, max_output_tokens: 8000 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { output?: { type: string; content?: { text?: string }[] }[] };
  const text = (data.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("");
  return JSON.parse(text);
}

const args = process.argv.slice(2);
const codes = args.length ? args : readdirSync("src/data/lessons").map((f) => f.replace(".json", ""));
for (const code of codes) {
  const out = `src/data/games/${code}.json`;
  if (existsSync(out)) { console.log(code, "già fatto"); continue; }
  const lesson = JSON.parse(readFileSync(`src/data/lessons/${code}.json`, "utf8"));
  const text = lesson.parts.map((p: { slide: number; title: string; narration: string; keyPoints: string[] }) => `SLIDE ${p.slide} · ${p.title}\n${p.narration}\nPunti chiave: ${p.keyPoints.join("; ")}`).join("\n\n");
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    try {
      const raw = (await ask(`Lezione ${code} · ${lesson.title}\n\n${text}`)) as Record<string, unknown>;
      raw.code = code;
      const parsed = GamePackSchema.safeParse(raw);
      if (!parsed.success) { console.log(code, "non valido:", z.prettifyError(parsed.error).slice(0, 300)); continue; }
      const p = parsed.data;
      const slides = new Set(lesson.parts.map((x: { slide: number }) => x.slide));
      const bad = [...p.order, ...p.who, ...p.truefalse].filter((x) => !slides.has(x.slide)).length;
      const dup = p.who.some((w) => w.distractors.includes(w.answer)) || p.order.some((o) => new Set(o.steps).size !== o.steps.length);
      if (bad || dup) { console.log(code, "slide sbagliate o doppioni, riprovo"); continue; }
      writeFileSync(out, JSON.stringify(p, null, 1) + "\n");
      console.log(code, `ok · ${p.order.length} ordini, ${p.who.length} indovinelli, ${p.truefalse.length} vero/falso`);
      ok = true;
    } catch (e) { console.log(code, "errore:", (e as Error).message); }
  }
}
