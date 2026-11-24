// Controlla un file di dialoghi: npx tsx scripts/check-dialogue.ts src/data/dialogues/4.5.json
import { readFileSync } from "node:fs";

let failed = false;
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8")) as { code: string; parts: { part: number; lines: { who: string; text: string }[] }[] };
  const lesson = JSON.parse(readFileSync(`src/data/lessons/${d.code}.json`, "utf8")) as { parts: unknown[] };
  const problems: string[] = [];
  if (d.parts.length !== lesson.parts.length) problems.push(`parti ${d.parts.length} ma la lezione ne ha ${lesson.parts.length}`);
  const sizes: number[] = [];
  d.parts.forEach((p, i) => {
    if (p.part !== i) problems.push(`parte ${i}: indice ${p.part}`);
    if (!p.lines.every((l) => (l.who === "M" || l.who === "L") && l.text.trim())) problems.push(`parte ${i}: battuta non valida`);
    const chars = p.lines.map((l) => l.text.replace(/\[[^\]]*\]/g, "").trim()).join(" ").length;
    sizes.push(chars);
    if (chars < 700 || chars > 1500) problems.push(`parte ${i}: ${chars} caratteri`);
    if (p.lines.length < 6 || p.lines.length > 16) problems.push(`parte ${i}: ${p.lines.length} battute`);
  });
  const total = sizes.reduce((a, b) => a + b, 0);
  if (problems.length) {
    failed = true;
    console.log(`✗ ${file}\n  ${problems.join("\n  ")}`);
  } else console.log(`✓ ${file}: ${d.parts.length} parti, ${Math.min(...sizes)}–${Math.max(...sizes)} caratteri, totale ${total}`);
}
process.exit(failed ? 1 : 0);
