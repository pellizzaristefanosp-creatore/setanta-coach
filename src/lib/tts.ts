/**
 * Voce della lezione con la sintesi vocale del telefono (gratis, anche senza rete).
 * Si legge frase per frase: su iPhone le frasi lunghe a volte si interrompono, e così la carta sa a che punto siamo.
 */

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÚÈÉ0-9"«(])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ttsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

const PREFERRED = ["Alice", "Federica", "Emma", "Paola", "Luca", "Google italiano", "Elsa", "Isabella"];

export function italianVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("it"));
}

export function pickVoice(name?: string): SpeechSynthesisVoice | undefined {
  const voices = italianVoices();
  if (name) {
    const v = voices.find((x) => x.name === name);
    if (v) return v;
  }
  const enhanced = voices.find((v) => /enhanced|premium|migliorata|avanzata/i.test(v.name));
  if (enhanced) return enhanced;
  for (const p of PREFERRED) {
    const v = voices.find((x) => x.name.includes(p));
    if (v) return v;
  }
  return voices[0];
}

/** Le voci arrivano in ritardo su alcuni browser: aspetta fino a 1,5 secondi. */
export function voicesReady(): Promise<void> {
  if (!ttsAvailable() || speechSynthesis.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

export type Reader = { stop: () => void; pause: () => void; resume: () => void };

/** Legge le frasi da `from` in poi; chiama onSentence(i) a ogni frase e onEnd alla fine. */
export function readSentences(
  sentences: string[],
  opts: { from?: number; rate: number; voiceName?: string; onSentence: (i: number) => void; onEnd: () => void },
): Reader {
  let stopped = false;
  if (!ttsAvailable()) {
    opts.onEnd();
    return { stop() {}, pause() {}, resume() {} };
  }
  speechSynthesis.cancel();
  const voice = pickVoice(opts.voiceName);
  const speak = (i: number) => {
    if (stopped) return;
    if (i >= sentences.length) {
      opts.onEnd();
      return;
    }
    opts.onSentence(i);
    const u = new SpeechSynthesisUtterance(sentences[i]);
    u.lang = "it-IT";
    if (voice) u.voice = voice;
    u.rate = opts.rate;
    u.onend = () => speak(i + 1);
    u.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      speak(i + 1);
    };
    speechSynthesis.speak(u);
  };
  speak(opts.from ?? 0);
  return {
    stop() {
      stopped = true;
      speechSynthesis.cancel();
    },
    pause() {
      speechSynthesis.pause();
    },
    resume() {
      speechSynthesis.resume();
    },
  };
}

/** Da chiamare dentro un tocco: su iPhone la voce parte solo se il primo "speak" nasce da un gesto. */
export function unlockSpeech() {
  if (!ttsAvailable()) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    /* niente voce */
  }
}
