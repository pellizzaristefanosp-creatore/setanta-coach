import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { LESSON_GUIDE, LessonPackSchema } from "../src/lib/lesson.js";
import { askJson, json, readBody } from "./_lib/ai.js";

/**
 * POST /api/lezione — riceve il testo di un PDF (letto nel telefono) e restituisce il pacchetto lezione.
 * Usa OpenAI se c'è OPENAI_API_KEY, altrimenti Claude (ANTHROPIC_API_KEY). Serve anche APP_CODE.
 */

const MAX_CHARS = 120_000;
const SCHEMA = JSON.stringify(z.toJSONSchema(LessonPackSchema));

type Body = { text?: unknown; code?: unknown; title?: unknown; unit?: unknown };

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.APP_CODE;
  if (!expected || request.headers.get("x-app-code") !== expected) return json({ error: "Codice di accesso sbagliato." }, 401);
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return json({ error: "Manca la chiave dell'IA sul server." }, 500);

  const body = await readBody<Body>(request);
  if (!body) return json({ error: "Richiesta non valida." }, 400);
  const text = typeof body.text === "string" ? body.text : "";
  const code = typeof body.code === "string" ? body.code : "";
  const title = typeof body.title === "string" ? body.title : "";
  const unit = typeof body.unit === "number" ? body.unit : Number(code.split(".")[0]);
  if (text.length < 500) return json({ error: "Il PDF sembra vuoto o è un'immagine senza testo." }, 400);
  if (text.length > MAX_CHARS) return json({ error: "Il PDF è troppo lungo per una sola lezione." }, 400);
  if (!/^\d{1,2}\.\d{1,2}$/.test(code)) return json({ error: "Codice della presentazione non valido (es. 7.2)." }, 400);

  const prompt = `Presentazione ${code} "${title}" (unità ${unit}). Usa version 1, code "${code}", unit ${unit}.\n\nTesto del PDF:\n\n${text}`;
  try {
    const lesson = process.env.OPENAI_API_KEY ? await withOpenAI(prompt) : await withClaude(prompt);
    return json({ lesson: { ...lesson, code, unit } });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}

async function withOpenAI(prompt: string) {
  const system = `${LESSON_GUIDE}\n\nRispondi SOLO con un oggetto JSON valido che rispetta questo JSON Schema:\n${SCHEMA}`;
  let last = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await askJson(system, attempt === 0 ? prompt : `${prompt}\n\nIl tentativo precedente non rispettava lo schema: ${last}. Correggi.`, { maxOutputTokens: 32000 });
    const r = LessonPackSchema.safeParse(out);
    if (r.success) return r.data;
    last = r.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }
  throw new Error("La lezione non è venuta completa. Riprova.");
}

async function withClaude(prompt: string) {
  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 32000,
      output_config: { effort: "medium", format: zodOutputFormat(LessonPackSchema) },
      system: LESSON_GUIDE,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new Error("Claude non ha potuto preparare questa lezione.");
    if (response.stop_reason === "max_tokens") throw new Error("La lezione era troppo lunga. Riprova.");
    if (!response.parsed_output) throw new Error("Risposta incompleta. Riprova.");
    return response.parsed_output;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new Error("La chiave di Claude sul server non è valida.");
    if (error instanceof Anthropic.RateLimitError) throw new Error("Troppe richieste: riprova tra un minuto.");
    if (error instanceof Anthropic.APIError) throw new Error(`Errore di Claude (${error.status}). Riprova.`);
    throw error;
  }
}
