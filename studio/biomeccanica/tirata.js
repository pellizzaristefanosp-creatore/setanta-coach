// Snatch pull: le tirate dello strappo fino alla scrollata, senza incastro; poi il bilanciere torna giù controllato.
// Errore: le anche salgono prima delle spalle nella prima tirata.
import { makeRender, checksFor, pose as P0, B } from "./strappo.js";
import { C } from "./disegno.js";
export { B };
const ctrl = (P) => { const off = P.com[0], okC = Math.abs(off) <= 3 || P.a.tallone > 0.5;
  return [[`${okC ? "✓" : "✗"} baricentro ${off >= 0 ? "+" : ""}${off.toFixed(1)} cm dal mesopiede`, undefined, okC ? C.ok : C.bad], [`${P.gap <= 3 ? "✓" : "✗"} bilanciere a ${P.gap.toFixed(1)} cm dalle gambe`, undefined, P.gap <= 3 ? C.ok : C.bad], ["✓ punte ferme a terra", undefined, C.ok]]; };
export const meta = { id: "tirata", nome: "Snatch pull (tirata da strappo)", vista: "lato", durata: 3.2 * 3, errore: 3.2 * 2 - 0.2, erroreTesto: "Errore: le anche salgono prima delle spalle", controlli: ctrl, fonti: ["Harbili 2012", "Gourgoulis 2000", "Everett, Olympic Weightlifting", "Winter 2009"] };
export const pose = (t, w = 0) => P0(t, w, "tirata");
export const render = makeRender("tirata", meta);
export const checks = () => checksFor("tirata");
