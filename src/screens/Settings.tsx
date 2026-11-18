import { useRef, useState } from "react";
import { DEFAULT_STEPS, makePresentation } from "../data/seed";
import { WEEKDAYS, dayMonth, today } from "../lib/dates";
import { buildIcs, shiftTime } from "../lib/ics";
import { comparePresentationCode } from "../lib/plan";
import { exportBackup, importBackup, importQuestions, resetAll, setState, useStore } from "../lib/store";
import type { Presentation } from "../lib/types";
import { Icon, saveFile } from "../ui";
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
