import type { ReactNode } from "react";

const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Icon = {
  play: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" fill="currentColor" /></svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={3}><path d="M5 12.5 10 17 19 7" /></svg>
  ),
  close: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  headphones: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="5" height="7" rx="2" /><rect x="16" y="14" width="5" height="7" rx="2" /></svg>
  ),
  today: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none" /></svg>
  ),
  cards: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><rect x="3" y="6" width="14" height="14" rx="3" /><path d="M7 3h11a3 3 0 0 1 3 3v11" /></svg>
  ),
  chart: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  ),
  gear: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  ),
  alert: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
  ),
  pause: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><path d="M12 5v14M5 12h14" /></svg>
  ),
  external: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
  ),
  fire: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.8 2-5 .2 1.8 1 3 2 3 0-3 1-6 1-8Z" /></svg>
  ),
};

export function Progress({ value, max, size }: { value: number; max: number; size?: "big" | "thin" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`progress ${size ?? ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={`${value} di ${max}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Sheet({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet fade-in" role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Box({ on }: { on: boolean }) {
  return <span className={`box ${on ? "on" : ""}`}>{on && <Icon.check />}</span>;
}

/** Salva un file: su iPhone apre il foglio di condivisione (Salva su File), altrove scarica. */
export async function saveFile(name: string, content: string, type: string, preferShare = true) {
  const file = new File([content], name, { type });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (preferShare && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return;
    } catch {
      /* annullato: si prova con il download */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

let ctx: AudioContext | null = null;
/** Da chiamare dentro un tocco: su iPhone l'audio si sblocca solo così. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* niente audio */
  }
}

export function beep() {
  try {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.22].forEach((offset, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = i === 0 ? 660 : 880;
      g.gain.setValueAtTime(0.0001, t + offset);
      g.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(t + offset);
      o.stop(t + offset + 0.2);
    });
    navigator.vibrate?.(200);
  } catch {
    /* niente audio */
  }
}

export function formatClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
