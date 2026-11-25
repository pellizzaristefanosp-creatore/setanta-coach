import { setBookmarkHere, useStore } from "./lib/store";

/** Lezione aperta per dare un'occhiata: il segnalibro resta dov'eri, a meno che tu non scelga di ripartire da qui. */
export function PeekBar() {
  const s = useStore();
  const bm = s.bookmark ? s.presentations.find((x) => x.id === s.bookmark!.presentationId) : undefined;
  return (
    <div className="replan" role="status" style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span className="grow small">Stai dando un'occhiata. {bm ? <>Il tuo segnalibro resta al capitolo <b>{bm.code}</b>.</> : null}</span>
      <button className="btn sm" onClick={setBookmarkHere}>📌 Riparti da qui</button>
    </div>
  );
}
