import { askJson, checkAccess, json, readBody } from "./_lib/ai";

/** POST /api/richiamo — commenta quello che lo studente ricorda delle ultime parti. */

const SYSTEM = `Sei un tutor gentile ma preciso per il corso "Allenamento della Forza 2". Lo studente è un calciatore e preparatore atletico.
Ti do: il testo delle ultime parti della lezione, i punti chiave e quello che lo studente ricorda (scritto in fretta, anche con errori).
Valuta quanto ha capito. Rispondi SOLO con JSON:
{"score": 1-5, "praise": "una frase su cosa ha capito bene", "got": ["punti chiave ricordati, max 4"], "missing": ["punti importanti mancanti o sbagliati, detti in modo semplice, max 4"], "fix": "se ha scritto qualcosa di sbagliato, la correzione in una frase, altrimenti stringa vuota", "tip": "un consiglio pratico per ricordare, con un esempio dal calcio, 1-2 frasi"}
Italiano semplice, dai del tu, incoraggiante. Basati solo sul testo della lezione.`;

type Body = { recall?: unknown; points?: unknown; text?: unknown };

export async function POST(request: Request): Promise<Response> {
  const denied = checkAccess(request);
  if (denied) return denied;
  const body = await readBody<Body>(request);
  const recall = typeof body?.recall === "string" ? body.recall.slice(0, 2000) : "";
  const text = typeof body?.text === "string" ? body.text.slice(0, 6000) : "";
  const points = Array.isArray(body?.points) ? body.points.filter((p): p is string => typeof p === "string").slice(0, 20) : [];
  if (recall.trim().length < 3) return json({ error: "Scrivi almeno qualche parola." }, 400);
  try {
    const out = (await askJson(SYSTEM, `Testo della lezione:\n${text}\n\nPunti chiave:\n- ${points.join("\n- ")}\n\nCosa ricorda lo studente:\n${recall}`, { maxOutputTokens: 1000 })) as Record<string, unknown>;
    const str = (k: string) => (typeof out[k] === "string" ? (out[k] as string) : "");
    const list = (k: string) => (Array.isArray(out[k]) ? (out[k] as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 4) : []);
    const score = Math.min(5, Math.max(1, Math.round(Number(out.score) || 3)));
    return json({ score, praise: str("praise"), got: list("got"), missing: list("missing"), fix: str("fix"), tip: str("tip") });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
