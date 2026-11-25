import { aiPost } from "./ai";
import type { LessonPack } from "./lesson";

/**
 * "Hai qualche domanda?": la risposta del prof. Con il codice delle funzioni intelligenti risponde l'IA dal testo della
 * lezione; senza (o se il server non risponde) cerca nella lezione le frasi che parlano di quello che hai chiesto.
 */
const STOP = new Set("della delle dello degli dalla dalle come cosa perché perche quando quale quali quanto quanti sono essere fare fatto anche ancora molto poco questo questa quello quella però pero allora oppure nella nelle negli sulla sulle sugli tutto tutti tutte ogni dove mentre dopo prima sempre senza dentro fuori ciao scusa capito capisco".split(" "));
const words = (t: string) => (t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]{4,}/g) ?? []).filter((w) => !STOP.has(w));
const stem = (w: string) => w.slice(0, Math.max(4, w.length - 2));

export function localAnswer(lesson: LessonPack, part: number, question: string): string {
  const q = new Set(words(question).map(stem));
  if (q.size === 0) return "";
  const pool: { text: string; bonus: number }[] = [];
  lesson.parts.forEach((p, i) => {
    const near = i === part ? 1.5 : 1;
    for (const s of p.narration.split(/(?<=[.!?…])\s+/)) pool.push({ text: s, bonus: near });
    for (const k of p.keyPoints) pool.push({ text: k, bonus: near * 1.2 });
  });
  for (const f of lesson.flashcards) pool.push({ text: f.back, bonus: 1.3 });
  const scored = pool
    .map((x) => ({ ...x, score: words(x.text).map(stem).filter((w) => q.has(w)).length * x.bonus }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return scored.filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true))).slice(0, 3).map((x) => "• " + (/[.!?…]$/.test(x.text.trim()) ? x.text.trim() : x.text.trim() + ".")).join("\n");
}

export async function askTeacher(lesson: LessonPack, part: number, question: string): Promise<{ answer: string; example?: string; source: "ai" | "lezione" | "nessuna" }> {
  const context = lesson.parts.map((p, i) => `[parte ${i + 1}${i === part ? ", quella appena fatta" : ""}] ${p.title}: ${p.narration}`).join("\n").slice(0, 6000);
  const r = await aiPost<{ answer: string; example: string }>("/api/domanda", { question, context });
  if (r.ok && r.data.answer) return { answer: r.data.answer, example: r.data.example, source: "ai" };
  const local = localAnswer(lesson, part, question);
  return local ? { answer: local, source: "lezione" } : { answer: "", source: "nessuna" };
}
