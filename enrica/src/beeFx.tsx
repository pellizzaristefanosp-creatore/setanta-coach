import { useEffect, useState } from "react";

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Cifre a palette, come i tabelloni delle stazioni: girano e si fermano sul numero. */
export function Flap({ n }: { n: number }) {
  const digits = String(n).split("");
  const [shown, setShown] = useState<string[]>(() => (reduced() ? digits : digits.map(() => "0")));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const ds = String(n).split("");
    if (reduced()) return void setShown(ds);
    let k = 0;
    const id = window.setInterval(() => {
      k++;
      setShown(ds.map((d, i) => (k < 6 + i * 3 ? String((Math.random() * 10) | 0) : d)));
      setTick(k);
      if (k >= 6 + ds.length * 3) window.clearInterval(id);
    }, 90);
    return () => window.clearInterval(id);
  }, [n]);
  return (
    <span className="flap" aria-label={String(n)}>
      {shown.map((d, i) => <span key={`${i}-${tick}`} className={tick < 6 + i * 3 ? "go-flip" : ""} aria-hidden="true">{d}</span>)}
    </span>
  );
}

/** Frase scritta lettera per lettera, con il cursore. */
export function Typewriter({ text }: { text: string }) {
  const [i, setI] = useState(() => (reduced() ? text.length : 0));
  useEffect(() => {
    if (reduced()) return;
    setI(0);
    const id = window.setInterval(() => setI((x) => (x >= text.length ? (window.clearInterval(id), x) : x + 1)), 32);
    return () => window.clearInterval(id);
  }, [text]);
  return <span aria-label={text}><span aria-hidden="true">{text.slice(0, i)}</span>{i < text.length && <span className="caret" aria-hidden="true" />}</span>;
}

/** Sigillo che gira: "verificato dalla scienza". */
export function Seal() {
  return (
    <span className="seal" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs><path id="sealpath" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" /></defs>
        <g className="ring"><text fontSize="11" fontWeight="800" letterSpacing="2.4" fill="#8a7058"><textPath href="#sealpath">SCIENZA · RICERCA · FONTI VERE ·</textPath></text></g>
      </svg>
      <span className="mid">🔬</span>
    </span>
  );
}
