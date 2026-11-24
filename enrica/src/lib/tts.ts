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

/* ——— Due voci per il dialogo: il maestro Tonino (voce maschile) ed Enrica (voce femminile) ——— */

const MALE = /luca|cosimo|diego|riccardo|giorgio|alessandro|paolo|marco|andrea|roberto|giuseppe|male|uomo|itc|itd|-x-itd|-x-itc/i;
const FEMALE = /alice|federica|emma|paola|elsa|isabella|chiara|carla|silvia|bianca|female|donna|kda|itb|-x-kda|-x-itb/i;

export type DialogueVoices = { m: { voice?: SpeechSynthesisVoice; pitch: number }; e: { voice?: SpeechSynthesisVoice; pitch: number } };

/** Sceglie una voce maschile e una femminile; se il telefono ne ha una sola, cambia il tono. */
export function dialogueVoices(): DialogueVoices {
  const voices = italianVoices();
  const better = (v: SpeechSynthesisVoice) => (/enhanced|premium|migliorata|avanzata/i.test(v.name) ? 0 : 1);
  const sorted = [...voices].sort((a, b) => better(a) - better(b));
  const m = sorted.find((v) => MALE.test(v.name) || MALE.test(v.voiceURI));
  const e = sorted.find((v) => FEMALE.test(v.name) || FEMALE.test(v.voiceURI)) ?? sorted.find((v) => v !== m);
  if (m && e && m !== e) return { m: { voice: m, pitch: 0.95 }, e: { voice: e, pitch: 1.05 } };
  const one = m ?? e ?? sorted[0];
  return { m: { voice: one, pitch: 0.75 }, e: { voice: one, pitch: 1.25 } };
}

/** Dice una battuta; onWord(charIndex) a ogni parola (dove il telefono lo permette). */
export function speakLine(text: string, v: { voice?: SpeechSynthesisVoice; pitch: number }, rate: number, on: { onEnd: () => void; onWord?: (charIndex: number) => void }): () => void {
  if (!ttsAvailable()) {
    const id = window.setTimeout(on.onEnd, Math.max(1500, text.length * 55));
    return () => window.clearTimeout(id);
  }
  let alive = true;
  const parts = splitSentences(text);
  let offset = 0;
  const say = (i: number) => {
    if (!alive) return;
    if (i >= parts.length) return on.onEnd();
    const u = new SpeechSynthesisUtterance(parts[i]);
    u.lang = "it-IT";
    if (v.voice) u.voice = v.voice;
    u.pitch = v.pitch;
    u.rate = rate;
    const base = offset;
    u.onboundary = (e) => alive && e.name !== "sentence" && on.onWord?.(base + e.charIndex);
    u.onend = () => {
      offset += parts[i]!.length + 1;
      say(i + 1);
    };
    u.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      offset += parts[i]!.length + 1;
      say(i + 1);
    };
    speechSynthesis.speak(u);
  };
  speechSynthesis.cancel();
  say(0);
  return () => {
    alive = false;
    speechSynthesis.cancel();
  };
}
