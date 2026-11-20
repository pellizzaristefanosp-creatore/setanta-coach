// Scrive il copione di una puntata (spec.json) dalla lezione, con la lavagna già legata alle parole.
// Uso: node puntate/gen-spec.mjs 4.3   (dalla cartella studio/spiega)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const CODE = process.argv[2];
const APP = process.env.APP ?? "/tmp/claude-0/-home-user/56ad1aee-3375-5891-a125-b037f2837f32/scratchpad/wt-giochi";
const PIANO = JSON.parse(readFileSync("puntate/piano.json", "utf8"))[CODE];
const lesson = JSON.parse(readFileSync(`${APP}/src/data/lessons/${CODE}.json`, "utf8"));
const dial = JSON.parse(readFileSync(`${APP}/src/data/dialogues/${CODE}.json`, "utf8"));
const who = (w) => (w === "M" ? "PROF" : "STE");
const partText = (p) => dial.parts[p].lines.map((l) => `${who(l.who)}: ${l.text}`).join("\n");
const all = dial.parts.map((p, i) => `--- parte ${i} ---\n${partText(i)}`).join("\n");
const [tipo, esercizio] = PIANO.lavagna.split(":");

const SCHEMI = {
  cilindro: `{"tipo":"cilindro","titolo":"...","quando":{"battuta":"p1"},"pareti":[{"dove":"davanti|dietro|sopra|sotto","testo":"max 3 parole","battuta":"p2","parola":"..."}]} (3 o 4 pareti, ognuna con un "dove" diverso)`,
  esercizio: `{"tipo":"esercizio","esercizio":"${esercizio}","titolo":"...","quando":{"battuta":"p1","parola":"..."},"frecce":[{"punto":"anca|spalle|mani","direzione":"giu|su|destra|sinistra|avanti","colore":"rosso|verde","testo":"max 2 parole","battuta":"p2","parola":"..."}]} (0-2 frecce: rosso = la forza che disturba, verde = come resisti)`,
  carry: `{"tipo":"carry","titolo":"...","quando":{"battuta":"p1","parola":"..."},"frecce":[{"colore":"rosso","testo":"max 2 parole","battuta":"p2","parola":"..."},{"colore":"verde","testo":"max 2 parole","battuta":"p3","parola":"..."}]}`,
  ipertrofia: `{"tipo":"ipertrofia","titolo":"...","quando":{"battuta":"p1"},"passi":[{"modo":"parallelo|serie|sarcoplasmatica","testo":"max 5 parole","battuta":"p2","parola":"..."}]} (i passi nell'ordine della lezione, solo i modi che la lezione nomina)`,
  confronto: `{"tipo":"confronto","titolo":"...","quando":{"battuta":"p1"},"colonne":[{"titolo":"max 3 parole","icona":"un emoji","voci":["max 6 parole"],"battuta":"p2","parola":"..."}]} (2 o 3 colonne)`,
  barre: `{"tipo":"barre","titolo":"...","quando":{"battuta":"p1"},"barre":[{"etichetta":"max 3 parole","cifra":"es. 70%","valore":0-100,"battuta":"p2","parola":"..."}]} (2-5 barre; cifre e valori SOLO se detti nella lezione, valore = altezza relativa)`,
  tempo: `{"tipo":"tempo","titolo":"...","quando":{"battuta":"p1","parola":"..."},"fasi":[{"nome":"Eccentrica","secondi":3,"movimento":"giu"},{"nome":"Pausa","secondi":1,"movimento":"fermo"},{"nome":"Concentrica","secondi":1,"movimento":"su"}]} (numeri presi dall'esempio della lezione)`,
};

const GUIDE = `Sei lo sceneggiatore di un cartone educativo italiano per uno studente di scienze motorie (Ste, calciatore, numero 5) e il suo Prof.
Scrivi UNA puntata breve (40-55 secondi parlati) che spiega un solo concetto della lezione, con ironia leggera (una battuta secca in stile Marvel, mai volgare).
Regole ferree:
- Solo fatti presenti nel testo della lezione. Niente numeri, nomi o studi inventati.
- 6-8 battute. La prima è di Ste, in palestra (scena "palestra"): una domanda curiosa o un dubbio da calciatore. Le centrali sono sulla lavagna (scena "lavagna"). L'ultima, in palestra, chiude con una battuta ironica che ripete il concetto.
- Ogni battuta max 25 parole, italiano parlato naturale e semplice. Ste chiama il Prof scrivendo esattamente "Pròf".
- Puoi mettere all'inizio della battuta UN tag di emozione in inglese tra parentesi quadre: [curious] [warmly] [serious] [emphatic] [surprised] [dry] [laughs] [thoughtful]; e [pause] in mezzo.
- Ogni battuta ha "gesto" scelto tra: explain, point, think, surprise, shrug (oppure niente).
- La lavagna ha 1 o 2 elementi. Ogni elemento e ogni sua voce appare nel momento in cui si sente una parola: "parola" deve essere copiata ESATTAMENTE da quella battuta (una parola o due consecutive, senza tag). Se manca "parola", l'elemento appare all'inizio della battuta.
- Primo elemento possibile, facoltativo: {"tipo":"parola","testo":"max 3 parole","sotto":"max 8 parole","quando":{...}} per il nome del concetto.
- Elemento principale obbligatorio (dopo l'eventuale "parola"): ${SCHEMI[tipo]}
- "reazioni": 1-2 momenti in cui chi ascolta reagisce: {"chi":"STE|PROF","gesto":"surprise|think|shrug","quando":{"battuta":"...","parola":"..."}}.
- "finale": scritta di chiusura max 5 parole.
Rispondi con JSON: {"titolo":"max 6 parole","battute":[{"id":"s1","chi":"STE","scena":"palestra","gesto":"think","testo":"..."}, {"id":"p1","chi":"PROF","scena":"lavagna",...}],"lavagna":[...],"reazioni":[...],"finale":"..."}
Gli id: s1,s2,... per Ste, p1,p2,... per il Prof, nell'ordine in cui parlano.`;

const input = `Lezione ${CODE}: ${lesson.title}\nConcetto della puntata: ${PIANO.idea}\nParte principale (parte ${PIANO.part}):\n${partText(PIANO.part)}\n\nTutta la lezione, per controllare i fatti:\n${all}\n\nRispondi in JSON.`;

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\[[^\]]*\]\s*/g, "");
function check(spec) {
  const errs = [], ids = new Set(spec.battute.map((b) => b.id));
  const T = Object.fromEntries(spec.battute.map((b) => [b.id, norm(b.testo)]));
  const cue = (c, where) => { if (!c) return; if (!ids.has(c.battuta)) errs.push(`${where}: battuta ${c.battuta}`); else if (c.parola && !T[c.battuta].includes(norm(c.parola))) errs.push(`${where}: "${c.parola}" non è in ${c.battuta}`); };
  if (spec.battute[0].scena !== "palestra" || spec.battute.at(-1).scena !== "palestra") errs.push("prima e ultima battuta in palestra");
  if (!spec.battute.some((b) => b.scena === "lavagna")) errs.push("nessuna battuta sulla lavagna");
  for (const e of spec.lavagna) { cue(e.quando, e.tipo); for (const k of ["voci", "colonne", "barre", "frecce", "pareti", "passi"]) for (const v of Array.isArray(e[k]) ? e[k] : []) if (typeof v === "object") cue(v, `${e.tipo}.${k}`); }
  for (const r of spec.reazioni ?? []) cue(r.quando, "reazione");
  if (!spec.lavagna.some((e) => e.tipo === tipo)) errs.push(`manca l'elemento ${tipo}`);
  const lav0 = spec.battute.find((b) => b.scena === "lavagna").id;
  for (const e of spec.lavagna) if (spec.battute.findIndex((b) => b.id === e.quando.battuta) < spec.battute.findIndex((b) => b.id === lav0)) errs.push(`${e.tipo} appare prima della lavagna`);
  const words = spec.battute.reduce((s, b) => s + norm(b.testo).split(/\s+/).length, 0);
  if (words > 150) errs.push(`troppo lunga: ${words} parole`);
  return errs;
}

let spec, errs = [], extra = "";
for (let tent = 0; tent < 3; tent++) {
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: "Bearer proxy-injected", "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-6.2-sol", instructions: GUIDE, input: input + extra, text: { format: { type: "json_object" } }, max_output_tokens: 8000 }) });
  if (!r.ok) { console.log("ERRORE", r.status, await r.text()); process.exit(1); }
  const data = await r.json();
  spec = JSON.parse(data.output.filter((o) => o.type === "message").flatMap((o) => o.content).map((c) => c.text ?? "").join(""));
  errs = check(spec);
  if (!errs.length) break;
  console.log("riprovo:", errs.join("; "));
  extra = `\n\nLa tua risposta precedente aveva questi errori, correggili:\n${errs.join("\n")}\nRisposta precedente:\n${JSON.stringify(spec)}`;
}
if (errs.length) { console.log("ERRORI", errs); process.exit(1); }
spec.code = CODE; spec.part = PIANO.part; spec.fonte = `Lezione ${CODE}`; spec.semplificato = true;
mkdirSync(`puntate/${CODE}/out`, { recursive: true });
writeFileSync(`puntate/${CODE}/spec.json`, JSON.stringify(spec, null, 1));
console.log(spec.battute.map((b) => `${b.chi} [${b.scena}] ${b.testo}`).join("\n"));
