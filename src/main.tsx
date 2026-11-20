import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Aggiornamenti: sull'iPhone l'app installata non ricarica da sola quando torna in primo piano,
// quindi controlliamo noi se c'è una versione nuova (all'apertura, al ritorno nell'app e ogni 30 minuti).
// Con autoUpdate la versione nuova si installa e la pagina si ricarica da sola.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => void registration.update().catch(() => {});
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
    window.setInterval(check, 30 * 60 * 1000);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
