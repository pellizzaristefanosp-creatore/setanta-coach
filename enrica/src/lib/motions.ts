/**
 * I movimenti dei pulsanti (tema delle api), messi una volta sola per tutta l'app:
 * 1 goccia di miele che si allarga dove tocchi · 2 esagono che si trasforma (icone e barra) · 3 molla morbida quando premi
 * (CSS) · 4 miele che riempie il pulsante "Fatto" e la scritta "Fatto!" · 5 cerchio disegnato a mano attorno alla
 * risposta giusta. Gli altri (pennarello, sigillo, cifre a palette, macchina da scrivere, numeri che salgono, carte che si
 * girano) stanno nei componenti. Con "Riduci movimento" non parte niente.
 */
const PRESS = ".btn, .go, .option, .tab, .icon-btn, .cal-chip, .lib-entry, .gamebar";

export function installMotions() {
  if (typeof window === "undefined") return;
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (reduce()) return;
      const b = (e.target as HTMLElement | null)?.closest<HTMLElement>(PRESS);
      if (!b || (b as HTMLButtonElement).disabled) return;
      const r = b.getBoundingClientRect();
      const d = document.createElement("span");
      d.className = "blob";
      d.style.left = `${e.clientX - r.left}px`;
      d.style.top = `${e.clientY - r.top}px`;
      b.appendChild(d);
      window.setTimeout(() => d.remove(), 950);
      if (b.matches(".icon-btn, .tab")) {
        b.classList.remove("morph");
        void b.offsetWidth;
        b.classList.add("morph");
      }
    },
    { passive: true },
  );

  document.addEventListener("click", (e) => {
    if (reduce()) return;
    const b = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn.field");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const w = document.createElement("span");
    w.className = "wipe";
    w.style.left = `${(e as MouseEvent).clientX - r.left || r.width / 2}px`;
    w.style.top = `${(e as MouseEvent).clientY - r.top || r.height / 2}px`;
    const t = document.createElement("span");
    t.className = "wipe-txt";
    t.textContent = "Fatto!";
    b.append(w, t);
    window.setTimeout(() => { w.remove(); t.remove(); }, 1300);
  });

  // cerchio a mano attorno alla risposta giusta, appena compare
  const circle = (el: Element) => {
    if (reduce() || el.querySelector(".circ")) return;
    const c = document.createElement("span");
    c.className = "circ";
    c.innerHTML = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M60 3 C 20 0, 2 10, 4 22 C 7 36, 60 40, 88 30 C 104 22, 96 4, 52 4"/></svg>';
    el.appendChild(c);
  };
  new MutationObserver((list) => {
    for (const m of list) {
      const el = m.target as Element;
      if (el instanceof HTMLElement && el.classList.contains("option") && el.classList.contains("right")) circle(el);
    }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
}
