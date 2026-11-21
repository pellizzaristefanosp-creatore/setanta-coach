import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LessonVideo } from "./data/lessonVideos";

type Word = { w: string; s: number };
type Line = { chi: "Prof" | "Ste"; inizio: number; fine: number; testo: string; parole: Word[] };
type Transcript = { durata: number; battute: Line[] };

/**
 * La puntata animata con la sua conversazione: il video sopra, sotto le battute del Prof e di Ste come in una chat.
 * Le parole si accendono mentre vengono dette; tocchi una battuta e il video salta lì. "Schermo intero" apre
 * video e conversazione su tutto lo schermo.
 */
export function EpisodePlayer({ video, autoPlay = false, onEnded, actionLabel }: { video: LessonVideo; autoPlay?: boolean; onEnded?: () => void; actionLabel?: string }) {
  const el = useRef<HTMLVideoElement | null>(null);
  const chat = useRef<HTMLDivElement | null>(null);
  const [tr, setTr] = useState<Transcript | null>(null);
  const [t, setT] = useState(0);
  const [full, setFull] = useState(false);
  // passando a schermo intero il video si ricrea: riparte dal punto in cui era
  const resume = useRef<{ t: number; play: boolean } | null>(null);
  const toggleFull = () => { const v = el.current; resume.current = v ? { t: v.currentTime, play: !v.paused } : null; setFull(!full); };
  const src = video.transcript ?? video.src.replace(/\.mp4$/, ".json");

  useEffect(() => {
    let alive = true;
    fetch(src).then((r) => (r.ok ? r.json() : null)).then((j) => alive && setTr(j as Transcript | null)).catch(() => {});
    return () => void (alive = false);
  }, [src]);

  useEffect(() => {
    let raf = 0;
    const tick = () => { if (el.current) { const q = Math.floor(el.current.currentTime * 8) / 8; setT((p) => (p === q ? p : q)); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cur = tr ? tr.battute.findIndex((l, i) => t >= l.inizio - 0.05 && t < (tr.battute[i + 1]?.inizio ?? Infinity)) : -1;
  useEffect(() => {
    const box = chat.current, item = box?.querySelector<HTMLElement>(`[data-i="${cur}"]`);
    if (box && item) box.scrollTo({ top: item.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 2 + item.clientHeight / 2, behavior: "smooth" });
  }, [cur, full]);

  // tutto schermo: blocca lo scorrimento della pagina sotto
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, [full]);

  const seek = (s: number) => { if (el.current) { el.current.currentTime = s; void el.current.play().catch(() => {}); } };

  // a schermo intero il lettore va direttamente nella pagina (fuori dalle animazioni dei contenitori)
  const body = (
    <figure className={`episode ${full ? "full" : ""}`}>
      <div className="episode-video">
        <video ref={el} src={video.src} poster={video.poster} autoPlay={autoPlay && !resume.current} playsInline controls onEnded={onEnded} onError={onEnded}
          onLoadedMetadata={(e) => { const r = resume.current; if (!r) return; e.currentTarget.currentTime = r.t; if (r.play) void e.currentTarget.play().catch(() => {}); resume.current = null; }} />
      </div>
      <div className="episode-bar">
        <button className="btn sm" onClick={toggleFull}>{full ? "✕ Chiudi" : "⛶ Schermo intero"}</button>
        {onEnded && actionLabel && <button className="btn sm ghost" onClick={onEnded}>{actionLabel}</button>}
      </div>
      {tr && (
        <div className="episode-chat" ref={chat} aria-label="Cosa dicono">
          {tr.battute.map((l, i) => (
            <button key={i} data-i={i} className={`bubble ${l.chi === "Prof" ? "prof" : "ste"} ${i === cur ? "now" : ""} ${i < cur ? "said" : ""}`} onClick={() => seek(l.inizio)}>
              <span className="who">{l.chi}</span>
              <span className="text">
                {l.parole.map((w, j) => <span key={j} className={i < cur || (i === cur && t >= w.s) ? "w on" : "w"}>{w.w} </span>)}
              </span>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
  return full ? <>{createPortal(body, document.body)}<div className="episode-placeholder" /></> : body;
}
