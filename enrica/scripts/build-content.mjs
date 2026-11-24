// Copia le lezioni di Enrica da content/*.json nei file che l'app legge (src/data/…). Uso: node scripts/build-content.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const D = "src/data";
for (const d of ["lessons", "dialogues", "games", "turns"]) mkdirSync(`${D}/${d}`, { recursive: true });
const files = readdirSync("content").filter((f) => /^\d\.\d\.json$/.test(f)).sort();
const index = [];
for (const f of files) {
  const L = JSON.parse(readFileSync(`content/${f}`, "utf8"));
  const parts = L.parts.map((p, i) => ({
    slide: i + 1,
    title: p.title,
    narration: p.dialogue.map((d) => d.text).join(" "),
    keyPoints: p.keyPoints,
    analogy: p.analogy,
    check: p.check,
    science: p.science,
    tip: p.tip,
  }));
  const lesson = { version: 1, code: L.code, unit: L.unit, title: L.title, pages: L.pages, summary: L.summary, parts, flashcards: L.flashcards, questions: L.questions, exercises: L.exercises };
  writeFileSync(`${D}/lessons/${L.code}.json`, JSON.stringify(lesson, null, 1) + "\n");
  writeFileSync(`${D}/dialogues/${L.code}.json`, JSON.stringify({ code: L.code, parts: L.parts.map((p, i) => ({ part: i, lines: p.dialogue })) }, null, 1) + "\n");
  const sl = (x) => { const { part, ...rest } = x; return { ...rest, slide: part + 1 }; };
  writeFileSync(`${D}/games/${L.code}.json`, JSON.stringify({ code: L.code, order: L.games.order.map(sl), who: L.games.who.map(sl), truefalse: L.games.truefalse.map(sl) }, null, 1) + "\n");
  writeFileSync(`${D}/turns/${L.code}.json`, JSON.stringify({ code: L.code, turns: L.turns }, null, 1) + "\n");
  index.push({ code: L.code, title: L.title, pages: L.pages, parts: L.parts.map((p) => p.title) });
}
writeFileSync(`${D}/chapters.json`, JSON.stringify(index, null, 1) + "\n");
console.log(`${files.length} lezioni copiate`);
