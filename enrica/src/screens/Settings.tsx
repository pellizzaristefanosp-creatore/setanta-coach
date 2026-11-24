import { useEffect, useRef, useState } from "react";
import { italianVoices, pickVoice, readSentences, ttsAvailable, unlockSpeech, voicesReady } from "../lib/tts";
import { WEEKDAYS, today } from "../lib/dates";
import { buildIcs, shiftTime } from "../lib/ics";
import { exportBackup, importBackup, resetAll, setState, useStore } from "../lib/store";
import { saveFile } from "../ui";

const HOOKS = ["dopo cena", "dopo pranzo", "con il caffè", "appena sveglia", "prima di dormire"];


export function Settings() {
  const s = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const customHook = !HOOKS.includes(s.settings.hook);

  const exportIcs = () => {
    const ics = buildIcs({ start: today(), until: "2027-01-10", time: s.settings.time, hook: s.settings.hook, restDay: s.settings.restDay, stamp: new Date() });
    void saveFile("alveare-promemoria.ics", ics, "text/calendar", false);
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

      <SmartSettings />
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
          <p className="tiny">Mai nel giorno libero. Massimo 2 al giorno.</p>
        </div>
        <button className="btn primary block" onClick={exportIcs}>Esporta promemoria (.ics)</button>
        <p className="tiny">
          Sul telefono: tocca, poi «Aggiungi tutti» nel Calendario. Il Calendario non sa se hai studiato: il secondo avviso suona sempre. Se hai già
          fatto i tuoi 2 minuti, ignoralo. Se cambi orario, esporta di nuovo (prima cancella il vecchio calendario «Alveare di Enrica»).
        </p>
      </section>

      <section className="card stack">
        <h2>Obiettivo</h2>
        <label className="field">
          Finire il libro entro
          <input type="date" value={s.exams.mcqTarget} onChange={(e) => e.target.value && setState((d) => void (d.exams.mcqTarget = e.target.value))} />
        </label>
        <p className="tiny">Il piano di ogni giorno si calcola da questa data. Puoi cambiarla quando vuoi.</p>
      </section>

      <section className="card stack">
        <h2>Backup</h2>
        <p className="small muted">I dati stanno solo su questo telefono. Fai un backup ogni tanto.</p>
        <button className="btn block" onClick={() => void saveFile(`alveare-backup-${today()}.json`, exportBackup(), "application/json")}>Esporta backup</button>
        <input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={() => readFile(backupInput.current, (t) => {
          if (!confirm("Sostituire i dati di questo telefono con il backup?")) return;
          setMsg(importBackup(t) ?? "Backup caricato.");
        })} />
        <button className="btn block" onClick={() => backupInput.current?.click()}>Importa backup</button>
        <button className="btn danger block" onClick={() => confirm("Cancellare tutto e ripartire dall'inizio del libro?") && resetAll()}>Ricomincia da zero</button>
      </section>
      <p className="tiny center">L'Alveare di Enrica · versione 1</p>
    </div>
  );
}

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

/* ——— Codice per le funzioni intelligenti ——— */

function SmartSettings() {
  const s = useStore();
  const [code, setCode] = useState(s.settings.appCode ?? "");
  const saved = !!s.settings.appCode && code.trim() === s.settings.appCode;
  return (
    <section className="card stack">
      <h2>Funzioni intelligenti</h2>
      <p className="small muted">Il tutor che corregge il «Cosa ricordi?», i paragoni dal campo su richiesta e le lezioni nuove dai PDF. Serve internet e il codice di accesso.</p>
      <div className="row">
        <input type="text" aria-label="Codice di accesso" placeholder="Codice di accesso" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
        <button className="btn primary" disabled={!code.trim() || saved} onClick={() => setState((d) => void (d.settings.appCode = code.trim()))}>{saved ? "Salvato" : "Salva"}</button>
      </div>
    </section>
  );
}
