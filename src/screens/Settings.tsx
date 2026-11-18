import { useEffect, useRef, useState } from "react";
import { allLessons } from "../lib/lessons";
import { guessCode, pagesToText, pdfPages } from "../lib/pdf";
import { italianVoices, pickVoice, readSentences, ttsAvailable, unlockSpeech, voicesReady } from "../lib/tts";
import { DEFAULT_STEPS, makePresentation } from "../data/seed";
import { WEEKDAYS, dayMonth, today } from "../lib/dates";
import { buildIcs, shiftTime } from "../lib/ics";
import { comparePresentationCode } from "../lib/plan";
import { exportBackup, importBackup, importLesson, importQuestions, resetAll, setState, useStore } from "../lib/store";
import type { Presentation } from "../lib/types";
import { Box, Icon, saveFile } from "../ui";
import { StepList } from "./Today";

const HOOKS = ["dopo l'allenamento", "dopo cena", "dopo pranzo", "appena sveglio", "in macchina"];

const QUESTION_PROMPT = `Ti incollo le Note scritte di un'unità del corso "Allenamento della Forza 2" (Setanta College).
Scrivi 15 domande a scelta multipla in italiano, stile esame MCQ, basate SOLO su questo testo.
Regole: 4 opzioni plausibili, una sola giusta, risposta giusta in posizioni diverse, niente "tutte le precedenti".
Rispondi SOLO con JSON valido in questa forma:
{"version":1,"questions":[{"id":"8.1-01","presentation":"8.1","unit":8,"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"Slide N: perché è giusta."}]}
"answer" è la posizione della risposta giusta (0 = prima, 3 = quarta).`;

export function Settings() {
  const s = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const questionsInput = useRef<HTMLInputElement>(null);
  const customHook = !HOOKS.includes(s.settings.hook);

  const exportIcs = () => {
    const ics = buildIcs({ start: today(), until: "2027-01-10", time: s.settings.time, hook: s.settings.hook, restDay: s.settings.restDay, stamp: new Date() });
    void saveFile("setanta-promemoria.ics", ics, "text/calendar", false);
  };

  const readFile = (input: HTMLInputElement | null, cb: (text: string) => void) => {
    const f = input?.files?.[0];
    if (!f) return;
    f.text().then(cb);
    input.value = "";
  };

  return (
    <div className="stack fade-in" style={{ gap: 16 }}>
      <h1 className="page-title">Altro</h1>
      {msg && <div className="okbar" role="status" onClick={() => setMsg(null)}>{msg}</div>}

      <ImportLesson />
      <VoiceSettings />

      <section className="card stack">
        <h2>Promemoria</h2>
        <p className="small muted">Aggancia lo studio a una cosa che fai già.</p>
        <div className="chips">
          {HOOKS.map((h) => (
            <button key={h} className={`chip ${s.settings.hook === h ? "on" : ""}`} onClick={() => setState((d) => void (d.settings.hook = h))}>{h}</button>
          ))}
        </div>
        <label className="field">
          Oppure scrivilo tu
          <input type="text" placeholder="es. dopo la doccia" value={customHook ? s.settings.hook : ""} onChange={(e) => setState((d) => void (d.settings.hook = e.target.value || HOOKS[0]!))} />
        </label>
        <div className="row">
          <label className="field grow">
            Orario
            <input type="time" value={s.settings.time} onChange={(e) => e.target.value && setState((d) => void (d.settings.time = e.target.value))} />
          </label>
          <label className="field grow">
            Giorno partita
            <select value={s.settings.restDay} onChange={(e) => setState((d) => void (d.settings.restDay = Number(e.target.value)))}>
              {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
            </select>
          </label>
        </div>
        <div className="card soft stack" style={{ gap: 4 }}>
          <p className="small"><b>{s.settings.time}</b> · «2 minuti. Solo play.»</p>
          <p className="small"><b>{shiftTime(s.settings.time, 120)}</b> · «Anche 1 minuto vale»</p>
          <p className="tiny">Mai nel giorno partita. Massimo 2 al giorno.</p>
        </div>
        <button className="btn primary block" onClick={exportIcs}>Esporta promemoria (.ics)</button>
        <p className="tiny">
          Sul telefono: tocca, poi «Aggiungi tutti» nel Calendario. Il Calendario non sa se hai studiato: il secondo avviso suona sempre. Se hai già
          fatto i tuoi 2 minuti, ignoralo. Se cambi orario, esporta di nuovo (prima cancella il vecchio calendario «Setanta Coach»).
        </p>
      </section>

      <section className="card stack">
        <h2>Corso</h2>
        <p className="small muted">Quando esce un'unità, aggiungi le presentazioni. Se te lo scordi, il bottone «Solo 2 minuti» le crea da solo con 10 parti.</p>
        {s.units.map((u) => (
          <UnitEditor key={u.n} n={u.n} />
        ))}
      </section>

      <section className="card stack">
        <h2>Obiettivi</h2>
        <div className="row">
          <label className="field grow">
            MCQ
            <input type="date" value={s.exams.mcqTarget} min="2026-12-14" max="2027-01-10" onChange={(e) => e.target.value && setState((d) => void (d.exams.mcqTarget = e.target.value))} />
          </label>
          <label className="field grow">
            Esame pratico
            <input type="date" value={s.exams.practicalTarget} min="2026-12-14" max="2026-12-27" onChange={(e) => e.target.value && setState((d) => void (d.exams.practicalTarget = e.target.value))} />
          </label>
        </div>
        <p className="tiny">MCQ aperto dal 14 dic (09:00) al 10 gen (23:59): 50 domande, 45 minuti, un tentativo. Esame pratico su Turnitin dal 14 dic, scadenza 27 dic alle 23:59.</p>
      </section>

      <section className="card stack">
        <h2>Domande del quiz</h2>
        <p className="small muted">{s.questions.length} domande caricate (unità {[...new Set(s.questions.map((q) => q.unit))].sort((a, b) => (a ?? 0) - (b ?? 0)).join(", ")}).</p>
        <input ref={questionsInput} type="file" accept="application/json,.json" hidden onChange={() => readFile(questionsInput.current, (t) => {
          const r = importQuestions(t);
          setMsg(r.errors.length ? `Aggiunte ${r.added}. Problemi: ${r.errors.slice(0, 2).join(" ")}` : `Aggiunte ${r.added} domande.`);
        })} />
        <button className="btn block" onClick={() => questionsInput.current?.click()}>Importa JSON</button>
        <button
          className="btn block"
          onClick={() => {
            void navigator.clipboard?.writeText(QUESTION_PROMPT).then(() => setMsg("Prompt copiato. Incollalo in Claude insieme alle Note scritte."));
          }}
        >
          Copia il prompt per Claude
        </button>
      </section>

      <section className="card stack">
        <h2>Backup</h2>
        <p className="small muted">I dati stanno solo su questo telefono. Fai un backup ogni tanto.</p>
        <button className="btn block" onClick={() => void saveFile(`setanta-backup-${today()}.json`, exportBackup(), "application/json")}>Esporta backup</button>
        <input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={() => readFile(backupInput.current, (t) => {
          if (!confirm("Sostituire i dati di questo telefono con il backup?")) return;
          setMsg(importBackup(t) ?? "Backup caricato.");
        })} />
        <button className="btn block" onClick={() => backupInput.current?.click()}>Importa backup</button>
        <button className="btn danger block" onClick={() => confirm("Cancellare tutto e ripartire dai dati del corso?") && resetAll()}>Ricomincia da zero</button>
      </section>
      <p className="tiny center">Setanta Coach · versione 1</p>
    </div>
  );
}

function UnitEditor({ n }: { n: number }) {
  const s = useStore();
  const u = s.units.find((x) => x.n === n)!;
  const ps = s.presentations.filter((p) => p.unit === n).sort((a, b) => comparePresentationCode(a.code, b.code));
  const released = u.release <= today();

  const add = () => {
    const nextIndex = ps.length + 1;
    const title = prompt(`Titolo della presentazione ${n}.${nextIndex}`, "") ?? "";
    setState((d) => {
      d.presentations.push(makePresentation(`${n}.${nextIndex}`, title.trim() || `${u.title} – parte ${nextIndex}`));
    });
  };

  return (
    <details>
      <summary>
        <span className="grow">{n}. {u.title}</span>
        <span className={`pill ${released ? "" : "gold"}`}>{released ? `${ps.length} pres.` : `esce il ${dayMonth(u.release)}`}</span>
      </summary>
      <div className="stack" style={{ paddingBottom: 12 }}>
        <p className="tiny">{u.topic}</p>
        {ps.map((p) => <PresentationEditor key={p.id} p={p} />)}
        <button className="btn sm" onClick={add}><Icon.plus /> Aggiungi presentazione {n}.{ps.length + 1}</button>
      </div>
    </details>
  );
}

function PresentationEditor({ p }: { p: Presentation }) {
  const update = (fn: (x: Presentation) => void) =>
    setState((d) => {
      const x = d.presentations.find((y) => y.id === p.id);
      if (x) fn(x);
    });
  const done = p.steps.filter((x) => x.done).length;

  return (
    <div className="card soft stack" style={{ gap: 8, padding: 12 }}>
      <div className="row">
        <span className="pill">{p.code}</span>
        <input type="text" aria-label={`Titolo ${p.code}`} value={p.title} onChange={(e) => update((x) => void (x.title = e.target.value))} />
      </div>
      <div className="spread">
        <span className="small muted num">{done}/{p.steps.length} parti</span>
        <div className="row">
          <button className="btn sm" aria-label="Togli una parte" disabled={p.steps.length <= 1} onClick={() => update((x) => void x.steps.pop())}>−</button>
          <button
            className="btn sm"
            aria-label="Aggiungi una parte"
            onClick={() =>
              update((x) => {
                const k = x.steps.length + 1;
                x.steps.push({ id: `${x.id}-s${k}-${Date.now().toString(36)}`, title: `Slide ${k + 2}`, done: false });
                delete x.doneAt;
              })
            }
          >
            +
          </button>
        </div>
      </div>
      <details>
        <summary className="small">Parti e spunte</summary>
        <StepList p={p} />
        <div className="row" style={{ paddingTop: 8 }}>
          <button className="btn sm grow" onClick={() => update((x) => { x.steps.forEach((st) => (st.done = true)); x.doneAt ??= today(); })}>Tutte fatte</button>
          <button className="btn sm grow" onClick={() => update((x) => { x.steps.forEach((st) => (st.done = false)); delete x.doneAt; })}>Azzera</button>
        </div>
      </details>
      {p.steps.length === DEFAULT_STEPS && p.steps[0]?.title === "Slide 3" && <p className="tiny">Numero di parti stimato: correggilo quando vedi la presentazione.</p>}
    </div>
  );
}

/* ——— Lezioni nuove dai PDF (anche più di una, anche dal .zip della cartella) ——— */

type Job = { id: string; file: string; code: string; title: string; text: string; pages: number; pick: boolean; status: "attesa" | "preparo" | "pronta" | "errore"; error?: string };

function ImportLesson() {
  const s = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reading, setReading] = useState(false);
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [appCode, setAppCode] = useState(s.settings.appCode ?? "");
  const have = new Set(allLessons(s).map((l) => l.code));
  const lessons = [...have].sort((a, b) => a.localeCompare(b, "it", { numeric: true }));
  const update = (id: string, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const onFiles = async () => {
    const files = [...(input.current?.files ?? [])];
    input.current!.value = "";
    if (files.length === 0) return;
    setReading(true);
    setProblem(null);
    try {
      const pdfs = await expandFiles(files);
      if (pdfs.length === 0) setProblem("Non ho trovato PDF nei file scelti.");
      const found: Job[] = [];
      for (const f of pdfs) {
        try {
          const pages = await pdfPages(f);
          const g = guessCode(f.name.split("/").pop() ?? f.name, pages[0] ?? "");
          found.push({ id: `${f.name}-${found.length}`, file: f.name.split("/").pop() ?? f.name, code: g?.code ?? "", title: g?.title ?? "", text: pagesToText(pages), pages: pages.length, pick: !(g && have.has(g.code)), status: "attesa" });
        } catch {
          found.push({ id: `${f.name}-${found.length}`, file: f.name, code: "", title: "", text: "", pages: 0, pick: false, status: "errore", error: "Non riesco a leggerlo" });
        }
      }
      found.sort((a, b) => a.code.localeCompare(b.code, "it", { numeric: true }));
      setJobs(found);
    } catch {
      setProblem("Non riesco ad aprire questi file.");
    } finally {
      setReading(false);
    }
  };

  const runAll = async () => {
    setState((d) => void (d.settings.appCode = appCode.trim()));
    setRunning(true);
    for (const j of jobs) {
      if (!j.pick || j.status === "pronta") continue;
      if (!/^\d{1,2}\.\d{1,2}$/.test(j.code)) {
        update(j.id, { status: "errore", error: "Scrivi il codice, es. 7.2" });
        continue;
      }
      update(j.id, { status: "preparo", error: undefined });
      try {
        const res = await fetch("/api/lezione", {
          method: "POST",
          headers: { "content-type": "application/json", "x-app-code": appCode.trim() },
          body: JSON.stringify({ text: j.text, code: j.code, title: j.title, unit: Number(j.code.split(".")[0]) }),
        });
        const data = (await res.json().catch(() => ({}))) as { lesson?: unknown; error?: string };
        if (!res.ok || !data.lesson) {
          update(j.id, { status: "errore", error: data.error ?? `Errore ${res.status}` });
          if (res.status === 401 || res.status === 500) break; // codice o chiave sbagliati: inutile continuare
          continue;
        }
        const r = importLesson(data.lesson);
        update(j.id, r.ok ? { status: "pronta" } : { status: "errore", error: r.error });
      } catch {
        update(j.id, { status: "errore", error: "Senza rete. Riprova con internet." });
      }
    }
    setRunning(false);
  };

  const picked = jobs.filter((j) => j.pick && j.status !== "pronta").length;

  return (
    <section className="card stack">
      <h2>Aggiungi lezioni dai PDF</h2>
      <p className="small muted">
        Scegli uno o più PDF delle Note scritte, oppure il file .zip di «Download folder». Claude prepara ogni lezione: voce, carte, domande, flashcard ed
        esercizi. Circa 1–3 minuti a lezione.
      </p>
      <input ref={input} type="file" multiple accept="application/pdf,.pdf,application/zip,.zip" hidden onChange={() => void onFiles()} />
      {!running && <button className="btn primary block" onClick={() => input.current?.click()}>{jobs.length ? "Scegli altri file" : "Scegli i PDF o lo .zip"}</button>}
      {reading && <p className="small">Leggo i file nel telefono…</p>}
      {problem && <div className="alarm" role="alert"><span>{problem}</span></div>}
      {jobs.length > 0 && (
        <div className="stack fade-in" style={{ gap: 8 }}>
          {jobs.map((j) => (
            <div key={j.id} className="card soft row" style={{ padding: 10, gap: 8 }}>
              <button className="check" style={{ width: "auto", minHeight: 44 }} aria-pressed={j.pick} aria-label={`Prepara ${j.code || j.file}`} disabled={running || j.status === "pronta"} onClick={() => update(j.id, { pick: !j.pick })}>
                <Box on={j.pick || j.status === "pronta"} />
              </button>
              <input type="text" inputMode="decimal" aria-label="Codice" value={j.code} disabled={running} onChange={(e) => update(j.id, { code: e.target.value })} style={{ width: 70, minHeight: 40, padding: "8px 10px" }} />
              <span className="grow small" style={{ lineHeight: 1.25 }}>
                {j.title || j.file}
                <span className="tiny" style={{ display: "block" }}>
                  {j.status === "attesa" && (have.has(j.code) ? "già nell'app: rifalla solo se vuoi" : `${j.pages} pagine`)}
                  {j.status === "preparo" && "Claude la sta preparando…"}
                  {j.status === "pronta" && "✓ pronta"}
                  {j.status === "errore" && <span style={{ color: "var(--alarm)" }}>{j.error}</span>}
                </span>
              </span>
            </div>
          ))}
          <label className="field">Codice di accesso<input type="text" value={appCode} onChange={(e) => setAppCode(e.target.value)} autoComplete="off" disabled={running} /></label>
          <button className="btn primary block" disabled={running || picked === 0 || !appCode.trim()} onClick={() => void runAll()}>
            {running ? "Preparo… non chiudere l'app" : `Prepara ${picked} ${picked === 1 ? "lezione" : "lezioni"}`}
          </button>
        </div>
      )}
      <p className="tiny">Lezioni nell'app: {lessons.join(", ") || "nessuna"}.</p>
    </section>
  );
}

/** I .zip si aprono nel telefono: restano solo i PDF. */
async function expandFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type.includes("zip")) {
      const { unzipSync } = await import("fflate");
      const entries = unzipSync(new Uint8Array(await f.arrayBuffer()), { filter: (e) => /\.pdf$/i.test(e.name) && !e.name.includes("__MACOSX") });
      for (const [name, data] of Object.entries(entries)) out.push(new File([new Uint8Array(data)], name, { type: "application/pdf" }));
    } else if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
      out.push(f);
    }
  }
  return out;
}

/* ——— Voce ——— */

function VoiceSettings() {
  const s = useStore();
  const [voices, setVoices] = useState<string[]>([]);
  useEffect(() => {
    void voicesReady().then(() => setVoices(italianVoices().map((v) => v.name)));
  }, []);
  if (!ttsAvailable()) return null;
  const current = pickVoice(s.settings.voiceName)?.name ?? "";
  return (
    <section className="card stack">
      <h2>Voce della lezione</h2>
      {voices.length === 0 ? (
        <p className="small muted">Il telefono non ha voci italiane attive. Su iPhone: Impostazioni → Accessibilità → Contenuto letto ad alta voce → Voci → Italiano.</p>
      ) : (
        <label className="field">
          Voce
          <select value={current} onChange={(e) => setState((d) => void (d.settings.voiceName = e.target.value))}>
            {voices.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      )}
      <div className="row">
        <span className="small muted grow">Velocità: {s.settings.voiceRate}×</span>
        <button
          className="btn sm"
          onClick={() => {
            unlockSpeech();
            readSentences(["Ciao. Questa è la voce delle tue lezioni.", "Due minuti, solo play."], { rate: s.settings.voiceRate, voiceName: s.settings.voiceName, onSentence: () => {}, onEnd: () => {} });
          }}
        >
          Prova
        </button>
      </div>
      <p className="tiny">Per una voce più naturale su iPhone scarica una voce «migliorata» italiana (Impostazioni → Accessibilità → Contenuto letto ad alta voce → Voci).</p>
    </section>
  );
}
