// Controlla un pacchetto lezione: npx tsx scripts/check-lesson.ts src/data/lessons/5.1.json
import { readFileSync } from "node:fs";
import { LessonPackSchema } from "../src/lib/lesson";

let failed = false;
for (const file of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const r = LessonPackSchema.safeParse(data);
  if (!r.success) {
    failed = true;
    console.log(`✗ ${file}`);
    for (const issue of r.error.issues.slice(0, 15)) console.log(`  ${issue.path.join(".")}: ${issue.message}`);
    continue;
  }
  const p = r.data;
  const words = p.parts.map((x) => x.narration.split(/\s+/).length);
  const bad = p.parts.flatMap((x, i) => (x.check.answer > 3 ? [i] : []));
  const dist = [0, 0, 0, 0];
  p.questions.forEach((q) => dist[q.answer]!++);
  const outOfRange = [...p.flashcards, ...p.questions].filter((x) => x.part < 0 || x.part >= p.parts.length).length;
  console.log(`✓ ${file}: ${p.parts.length} parti (parole ${Math.min(...words)}–${Math.max(...words)}), ${p.flashcards.length} flashcard, ${p.questions.length} domande (risposte ${dist.join("/")}), ${p.exercises.length} esercizi${outOfRange ? `, ⚠ ${outOfRange} riferimenti 'part' fuori range` : ""}${bad.length ? " ⚠ check" : ""}`);
  if (outOfRange) failed = true;
}
process.exit(failed ? 1 : 0);
