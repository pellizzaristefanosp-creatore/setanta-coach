import { askJson, checkAccess, json, readBody } from "./_lib/ai.js";

/** POST /api/domanda — risponde alla domanda dello studente alla fine di una parte, partendo dal testo della lezione. */
const SYSTEM = `Sei l'insegnante della lezione: paziente, chiaro, simpatico. Lo studente ti fa una domanda alla fine di una parte.
Rispondi in italiano semplice, frasi corte, dai del tu, usa le parole tecniche solo se servono e spiegale.
Parti dal testo della lezione che ti do; se la domanda va oltre, rispondi con conoscenze solide e dillo ("fuori dalla lezione").
Non inventare numeri, studi o regole: se non sei sicuro, dillo e consiglia dove controllare.
Rispondi SOLO con JSON: {"answer": "max 120 parole", "example": "un esempio pratico, 1-2 frasi"}`;

type Body = { question?: unknown; context?: unknown };

export async function POST(request: Request): Promise<Response> {
  const denied = checkAccess(request);
  if (denied) return denied;
  const body = await readBody<Body>(request);
  const question = typeof body?.question === "string" ? body.question.slice(0, 800) : "";
  const context = typeof body?.context === "string" ? body.context.slice(0, 6000) : "";
  if (question.trim().length < 3) return json({ error: "Scrivi la domanda." }, 400);
  try {
    const out = (await askJson(SYSTEM, `Testo della lezione:\n${context}\n\nDomanda dello studente:\n${question}`, { maxOutputTokens: 900 })) as Record<string, unknown>;
    return json({ answer: typeof out.answer === "string" ? out.answer : "", example: typeof out.example === "string" ? out.example : "" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Il prof non riesce a rispondere adesso." }, 502);
  }
}
