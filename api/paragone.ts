import { askJson, checkAccess, json, readBody } from "./_lib/ai";

/** POST /api/paragone — un paragone dal calcio o dalla palestra per un concetto della lezione. */

const SYSTEM = `Sei un preparatore atletico che spiega a un calciatore che studia "Allenamento della Forza 2".
Ti do un concetto e il contesto della lezione. Rispondi SOLO con JSON:
{"simple": "il concetto detto semplice, 1-2 frasi", "analogy": "un paragone concreto dal calcio o dalla palestra, 2-3 frasi", "remember": "una frase da ricordare per l'esame"}
Italiano semplice, frasi corte, dai del tu. Resta fedele ai fatti del contesto: non inventare numeri o fatti.`;

type Body = { concept?: unknown; context?: unknown };

export async function POST(request: Request): Promise<Response> {
  const denied = checkAccess(request);
  if (denied) return denied;
  const body = await readBody<Body>(request);
  const concept = typeof body?.concept === "string" ? body.concept.slice(0, 300) : "";
  const context = typeof body?.context === "string" ? body.context.slice(0, 4000) : "";
  if (!concept.trim()) return json({ error: "Scrivi il concetto." }, 400);
  try {
    const out = (await askJson(SYSTEM, `Concetto: ${concept}\n\nContesto della lezione:\n${context || "(nessuno)"}`, { maxOutputTokens: 800 })) as Record<string, unknown>;
    const pick = (k: string) => (typeof out[k] === "string" ? (out[k] as string) : "");
    if (!pick("analogy")) return json({ error: "Risposta incompleta, riprova." }, 502);
    return json({ simple: pick("simple"), analogy: pick("analogy"), remember: pick("remember") });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
