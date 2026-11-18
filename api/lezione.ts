import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LESSON_GUIDE, LessonPackSchema } from "../src/lib/lesson";

/**
 * POST /api/lezione — riceve il testo di un PDF (letto nel telefono) e restituisce il pacchetto lezione.
 * Servono le variabili d'ambiente ANTHROPIC_API_KEY e APP_CODE (il codice che l'app manda nell'intestazione).
 */

const MAX_CHARS = 120_000;

type Body = { text?: unknown; code?: unknown; title?: unknown; unit?: unknown };

export async function POST(request: Request): Promise<Response> {
  {
    const expected = process.env.APP_CODE;
    if (!expected || request.headers.get("x-app-code") !== expected) return json({ error: "Codice di accesso sbagliato." }, 401);
    if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Manca la chiave di Claude sul server." }, 500);

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return json({ error: "Richiesta non valida." }, 400);
    }
    const text = typeof body.text === "string" ? body.text : "";
    const code = typeof body.code === "string" ? body.code : "";
    const title = typeof body.title === "string" ? body.title : "";
    const unit = typeof body.unit === "number" ? body.unit : Number(code.split(".")[0]);
    if (text.length < 500) return json({ error: "Il PDF sembra vuoto o è un'immagine senza testo." }, 400);
    if (text.length > MAX_CHARS) return json({ error: "Il PDF è troppo lungo per una sola lezione." }, 400);
    if (!/^\d{1,2}\.\d{1,2}$/.test(code)) return json({ error: "Codice della presentazione non valido (es. 7.2)." }, 400);

    const client = new Anthropic();
    try {
      const response = await client.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 32000,
        output_config: { effort: "medium", format: zodOutputFormat(LessonPackSchema) },
        system: LESSON_GUIDE,
        messages: [
          {
            role: "user",
            content: `Presentazione ${code} "${title}" (unità ${unit}). Usa version 1, code "${code}", unit ${unit}.\n\nTesto del PDF:\n\n${text}`,
          },
        ],
      });
      if (response.stop_reason === "refusal") return json({ error: "Claude non ha potuto preparare questa lezione." }, 502);
      if (response.stop_reason === "max_tokens") return json({ error: "La lezione era troppo lunga. Riprova." }, 502);
      const lesson = response.parsed_output;
      if (!lesson) return json({ error: "Risposta incompleta. Riprova." }, 502);
      return json({ lesson: { ...lesson, code, unit } });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return json({ error: "La chiave di Claude sul server non è valida." }, 500);
      if (error instanceof Anthropic.RateLimitError) return json({ error: "Troppe richieste: riprova tra un minuto." }, 429);
      if (error instanceof Anthropic.APIError) return json({ error: `Errore di Claude (${error.status}). Riprova.` }, 502);
      return json({ error: "Errore inatteso. Riprova." }, 500);
    }
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
