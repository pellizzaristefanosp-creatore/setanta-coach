import { useEffect, useState } from "react";
import { askTeacher } from "./lib/ask";
import type { LessonPack } from "./lib/lesson";
import { saveAsked } from "./lib/store";
import { Icon } from "./ui";

/**
 * Alla fine di una parte: "Hai qualche domanda?". Sì → scrivi la domanda e risponde il prof; No (o niente per 8
 * secondi) → si va avanti da soli. Le domande restano salvate.
 */
export function AskStep({ lesson, part, teacher, onDone }: { lesson: LessonPack; part: number; teacher: string; onDone: () => void }) {
  const [stage, setStage] = useState<"ask" | "write" | "busy" | "answer">("ask");
  const [left, setLeft] = useState(8);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ answer: string; example?: string; source: string } | null>(null);

  useEffect(() => {
    if (stage !== "ask") return;
    if (left <= 0) return onDone();
    const id = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => window.clearTimeout(id);
  }, [stage, left, onDone]);

  const send = async () => {
    setStage("busy");
    const r = await askTeacher(lesson, part, q.trim());
    setRes(r);
    saveAsked(lesson.code, part, q.trim(), r.answer || "(senza risposta: chiedila nella chat)");
    setStage("answer");
  };

  return (
    <div className="stack fade-in" style={{ gap: 14, paddingTop: 12 }}>
      <span className="tag" style={{ alignSelf: "flex-start" }}>💬 Domande</span>
      {stage === "ask" && (
        <>
          <h1 className="step-title">Hai qualche domanda per {teacher}?</h1>
          <p className="small muted">Su «{lesson.parts[part]?.title}». Se qualcosa non ti è chiaro, chiedilo adesso.</p>
          <div className="row">
            <button className="btn primary grow huge" onClick={() => setStage("write")}>Sì</button>
            <button className="btn grow huge" onClick={onDone}>No, avanti</button>
          </div>
          <p className="tiny center muted">Si va avanti da soli tra {left} secondi…</p>
        </>
      )}
      {(stage === "write" || stage === "busy") && (
        <>
          <h1 className="step-title">Cosa vuoi chiedere?</h1>
          <textarea aria-label="La tua domanda" placeholder="Scrivi come parli, anche in modo disordinato." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <button className="btn primary huge block" disabled={q.trim().length < 3 || stage === "busy"} onClick={() => void send()}>
            {stage === "busy" ? `${teacher} ci pensa…` : "Chiedi"}
          </button>
          <button className="link-btn" onClick={onDone}>Lascia stare, avanti</button>
        </>
      )}
      {stage === "answer" && res && (
        <>
          <p className="small muted">Hai chiesto: «{q}»</p>
          <div className="card stack" style={{ gap: 8 }}>
            <span className="listen-label">{teacher} risponde</span>
            {res.answer ? <p className="small" style={{ whiteSpace: "pre-line" }}>{res.answer}</p> : <p className="small">Su questo la lezione non dice abbastanza. La domanda è salvata: chiedila nella chat con Claude e la rivediamo insieme.</p>}
            {res.example && <p className="analogy">💡 {res.example}</p>}
            {res.source === "lezione" && <p className="tiny muted">Risposta presa dal testo della lezione. Se non ti basta, la domanda è salvata: chiedila nella chat.</p>}
          </div>
          <div className="row">
            <button className="btn grow" onClick={() => { setQ(""); setRes(null); setStage("write"); }}>Altra domanda</button>
            <button className="btn primary grow" onClick={onDone}><Icon.check /> Ho capito, avanti</button>
          </div>
        </>
      )}
    </div>
  );
}
