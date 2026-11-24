// Controlla i file delle lezioni di Enrica (content/*.json). Uso: node scripts/check-content.mjs content/1.1.json [...]
import { readFileSync } from "node:fs";
import { z } from "zod/v4";

const s = z.string().trim().min(1);
const mcq = z.object({ question: s, options: z.array(s).length(4), answer: z.number().int().min(0).max(3), explanation: s });
const Part = z.object({
  title: s,
  keyPoints: z.array(s).min(2).max(5),
  analogy: s,
  tip: s,
  science: z.object({ text: s, source: s, url: z.string().url() }),
  check: mcq,
  dialogue: z.array(z.object({ who: z.enum(["M", "E"]), text: s })).min(10).max(18),
});
const Lesson = z.object({
  code: z.string().regex(/^\d\.\d$/),
  unit: z.number().int(),
  title: s,
  pages: s,
  summary: s,
  parts: z.array(Part).min(4).max(7),
  flashcards: z.array(z.object({ front: s, back: s, part: z.number().int() })).min(8),
  questions: z.array(mcq.extend({ part: z.number().int() })).min(10).max(14),
  exercises: z.array(z.object({ title: s, prompt: s, modelAnswer: s })).min(2).max(3),
  games: z.object({
    order: z.array(z.object({ title: s, steps: z.array(s).min(4).max(7), part: z.number().int() })).min(1).max(3),
    who: z.array(z.object({ clues: z.array(s).length(3), answer: s, distractors: z.array(s).length(3), part: z.number().int() })).min(4).max(6),
    truefalse: z.array(z.object({ text: s, true: z.boolean(), why: s, part: z.number().int() })).min(10).max(14),
  }),
  turns: z.array(z.object({ part: z.number().int(), line: z.number().int(), question: s, options: z.array(s).length(4), answer: z.number().int().min(0).max(3), why: s })),
});

const words = (t) => t.split(/\s+/).filter(Boolean).length;
let bad = 0;
for (const f of process.argv.slice(2)) {
  const errs = [];
  let L;
  try {
    L = JSON.parse(readFileSync(f, "utf8"));
  } catch (e) {
    console.log(`✗ ${f}: JSON non valido: ${e.message}`);
    bad++;
    continue;
  }
  const r = Lesson.safeParse(L);
  if (!r.success) for (const i of r.error.issues.slice(0, 15)) errs.push(`${i.path.join(".")}: ${i.message}`);
  else {
    const np = L.parts.length;
    const inRange = (p, where) => (p >= 0 && p < np) || errs.push(`${where}: part ${p} fuori dalle parti (0–${np - 1})`);
    L.parts.forEach((p, i) => {
      const w = p.dialogue.reduce((a, d) => a + words(d.text), 0);
      if (w < 170 || w > 340) errs.push(`parts.${i}.dialogue: ${w} parole (servono 200–300)`);
      p.dialogue.forEach((d, j) => words(d.text) > 48 && errs.push(`parts.${i}.dialogue.${j}: battuta troppo lunga (${words(d.text)} parole)`));
      p.dialogue.forEach((d, j) => /[[\]]/.test(d.text) && errs.push(`parts.${i}.dialogue.${j}: niente parentesi quadre`));
      const sw = words(p.science.text);
      if (sw < 18 || sw > 75) errs.push(`parts.${i}.science.text: ${sw} parole (servono 25–60)`);
      if (!L.flashcards.some((c) => c.part === i)) errs.push(`flashcards: manca una carta per la parte ${i}`);
    });
    if (L.parts[0].dialogue[0].who !== "M") errs.push("parts.0.dialogue.0: deve iniziare Tonino (M)");
    const all = [...L.parts.map((p, i) => ({ ...p.check, where: `parts.${i}.check` })), ...L.questions.map((q, i) => ({ ...q, where: `questions.${i}` })), ...L.turns.map((q, i) => ({ ...q, where: `turns.${i}` }))];
    const pos = [0, 0, 0, 0];
    for (const q of all) {
      pos[q.answer]++;
      const g = q.options[q.answer].length;
      q.options.forEach((o, k) => {
        if (k === q.answer) return;
        if (o.length < g * 0.6 || o.length > g * 1.45) errs.push(`${q.where}.options.${k}: lunghezza ${o.length} troppo diversa dalla giusta (${g}): indizio`);
      });
      if (new Set(q.options).size !== 4) errs.push(`${q.where}: opzioni ripetute`);
    }
    const tot = all.length;
    pos.forEach((n, k) => n > tot * 0.45 && errs.push(`la risposta giusta è troppo spesso la ${"ABCD"[k]} (${n} su ${tot})`));
    L.questions.forEach((q, i) => inRange(q.part, `questions.${i}`));
    L.flashcards.forEach((q, i) => inRange(q.part, `flashcards.${i}`));
    for (const k of ["order", "who", "truefalse"]) L.games[k].forEach((q, i) => inRange(q.part, `games.${k}.${i}`));
    L.games.who.forEach((w, i) => {
      if (w.distractors.includes(w.answer)) errs.push(`games.who.${i}: la risposta è tra le sbagliate`);
      const g = w.answer.length;
      w.distractors.forEach((d, k) => (d.length < Math.min(g * 0.5, g - 4) || d.length > Math.max(g * 1.6, g + 6)) && errs.push(`games.who.${i}.distractors.${k}: lunghezza troppo diversa`));
    });
    L.turns.forEach((t, i) => {
      inRange(t.part, `turns.${i}`);
      const d = L.parts[t.part]?.dialogue;
      if (!d) return;
      if (d[t.line]?.who !== "M" || !d[t.line]?.text.includes("?")) errs.push(`turns.${i}: la battuta ${t.line} della parte ${t.part} non è una domanda di Tonino`);
      if (d[t.line + 1]?.who !== "E") errs.push(`turns.${i}: dopo la battuta ${t.line} deve rispondere Enrica`);
    });
    const tf = L.games.truefalse.filter((x) => x.true).length;
    if (tf === 0 || tf === L.games.truefalse.length) errs.push("games.truefalse: servono sia vere sia false");
  }
  if (errs.length) {
    bad++;
    console.log(`✗ ${f}\n  - ${errs.join("\n  - ")}`);
  } else console.log(`OK ${f}: ${L.parts.length} parti, ${L.questions.length} domande, ${L.turns.length} turni`);
}
process.exit(bad ? 1 : 0);
