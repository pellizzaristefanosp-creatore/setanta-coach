import { askJson, checkAccess, json, readBody } from "./_lib/ai.js";

/** POST /api/richiamo — commenta quello che lo studente ricorda delle ultime parti. */

const SYSTEM = `Sei un tutor preciso e incoraggiante per il corso "Allenamento della Forza 2". Lo studente è un calciatore e preparatore atletico
che fa fatica a iniziare e tende a mollare: correggilo DAVVERO, ma con calma e senza giudicarlo.
Ti do: il testo delle ultime parti della lezione, i punti chiave e quello che lo studente ricorda (scritto in fretta, anche con errori).
Confronta frase per frase con il testo. Rispondi SOLO con JSON:
{"score": 1-5,
 "praise": "una frase su cosa ha capito bene (concreta, non generica)",
 "got": ["punti chiave ricordati giusti, max 4"],
 "errors": [{"wrong": "la sua frase o idea sbagliata o imprecisa, citata breve", "right": "come si dice giusto e perché, max 25 parole"}],
 "missing": ["punti importanti che non ha detto, in modo semplice, max 3"],
 "corrected": "quello che ha scritto, riscritto giusto e completo con le SUE parole e lo stesso tono, max 70 parole",
 "tip": "un modo per ricordare, con un esempio dal calcio, 1-2 frasi"}
Se non ci sono errori, "errors" è []. Italiano semplice, dai del tu. Basati solo sul testo della lezione: niente fatti esterni.`;

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
    const out = (await askJson(SYSTEM, `Testo della lezione:\n${text}\n\nPunti chiave:\n- ${points.join("\n- ")}\n\nCosa ricorda lo studente:\n${recall}`, { maxOutputTokens: 1500 })) as Record<string, unknown>;
    const str = (k: string) => (typeof out[k] === "string" ? (out[k] as string) : "");
    const list = (k: string) => (Array.isArray(out[k]) ? (out[k] as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 4) : []);
    const score = Math.min(5, Math.max(1, Math.round(Number(out.score) || 3)));
    const errors = Array.isArray(out.errors)
      ? (out.errors as unknown[])
          .filter((e): e is { wrong: string; right: string } => !!e && typeof (e as { wrong?: unknown }).wrong === "string" && typeof (e as { right?: unknown }).right === "string")
          .slice(0, 4)
      : [];
    return json({ score, praise: str("praise"), got: list("got"), errors, missing: list("missing").slice(0, 3), corrected: str("corrected"), fix: errors[0]?.right ?? "", tip: str("tip") });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
