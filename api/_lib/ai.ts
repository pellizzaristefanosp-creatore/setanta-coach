/**
 * Utilità comuni delle funzioni intelligenti (server).
 * Le chiavi stanno solo nelle variabili d'ambiente di Vercel, mai nel browser.
 */

export const OPENAI_MODEL = "gpt-6.2-sol";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

/** Controlla il codice di accesso dell'app; restituisce una risposta d'errore o null se va bene. */
export function checkAccess(request: Request): Response | null {
  const expected = process.env.APP_CODE;
  if (!expected || request.headers.get("x-app-code") !== expected) return json({ error: "Codice di accesso sbagliato. Controllalo in Altro." }, 401);
  if (!process.env.OPENAI_API_KEY) return json({ error: "Manca la chiave di OpenAI sul server." }, 500);
  return null;
}

export async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Chiede a OpenAI una risposta in JSON (Responses API). Lancia un Error con un messaggio in italiano. */
export async function askJson(system: string, user: string, opts: { maxOutputTokens?: number } = {}): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: system,
      input: `${user}\n\nRispondi in JSON.`,
      text: { format: { type: "json_object" } },
      max_output_tokens: opts.maxOutputTokens ?? 2000,
    }),
  });
  if (res.status === 401) throw new Error("La chiave di OpenAI sul server non è valida.");
  if (res.status === 429) throw new Error("Credito OpenAI finito o troppe richieste: riprova più tardi.");
  if (!res.ok) {
    console.error("OpenAI", res.status, (await res.text()).slice(0, 500));
    throw new Error(`Errore di OpenAI (${res.status}). Riprova.`);
  }
  const data = (await res.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[]; status?: string };
  const text = (data.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .map((c) => c.text ?? "")
    .join("");
  if (!text) throw new Error(data.status === "incomplete" ? "Risposta troppo lunga, riprova." : "Risposta vuota, riprova.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Risposta non leggibile, riprova.");
  }
}
