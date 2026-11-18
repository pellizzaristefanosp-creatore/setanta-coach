import { useState, type JSX } from "react";
import { Celebration } from "./Celebration";
import { dismissToast, useStore, useToasts } from "./lib/store";
import { Review } from "./screens/Review";
import { Settings } from "./screens/Settings";
import { Status, todayIncomplete } from "./screens/Status";
import { Today, type Intent } from "./screens/Today";
import { Icon } from "./ui";

type Tab = "oggi" | "ripasso" | "situazione" | "altro";
const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: "oggi", label: "Oggi", icon: Icon.today },
  { id: "ripasso", label: "Ripasso", icon: Icon.cards },
  { id: "situazione", label: "Situazione", icon: Icon.chart },
  { id: "altro", label: "Altro", icon: Icon.gear },
];

export default function App() {
  const s = useStore();
  // All'apertura si parte sempre da Oggi: niente debiti in faccia, solo il bottone.
  const [tab, setTab] = useState<Tab>("oggi");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [visit, setVisit] = useState(0);
  const inSession = tab === "oggi" && s.timer != null;

  const go = (t: Tab, i?: Intent) => {
    setIntent(i ?? null);
    setVisit((v) => v + 1);
    setTab(t);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <main className={`app ${inSession ? "full" : ""}`}>
        {tab === "oggi" && <Today goTo={go} />}
        {tab === "ripasso" && <Review key={visit} intent={intent} onIntentDone={() => setIntent(null)} />}
        {tab === "situazione" && <Status />}
        {tab === "altro" && <Settings />}
      </main>
      <Toasts />
      <Celebration />
      {!inSession && (
        <div className="tabbar">
          <nav aria-label="Sezioni">
            {TABS.map((t) => (
              <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
                <t.icon />
                {t.label}
                {t.id === "situazione" && todayIncomplete(s) && <span className="dot" aria-label="sessione di oggi non finita" />}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

function Toasts() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast ${t.big ? "big" : ""}`} onClick={() => dismissToast(t.id)}>
          {t.text}
        </button>
      ))}
    </div>
  );
}
