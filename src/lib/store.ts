import { useSyncExternalStore } from "react";
import { makePresentation, seedState } from "../data/seed";
import { today } from "./dates";
import { isDone } from "./plan";
import { BADGES, BOSS_TO_WIN, POINTS, dailyChallenge, earnedBadges, level, totalXp, weeklyChallenge } from "./game";
import { LessonPackSchema, type LessonPack } from "./lesson";
import { cardsForPart, lessonFor, syncLessons } from "./lessons";
import { newCard, review, type Grade } from "./sm2";
import { weekStart } from "./dates";
import type { Explanation, Question, QuizResult, State, XpKind } from "./types";

const KEY = "setanta-coach:v1";
const STEP_MS = 2 * 60 * 1000;

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && parsed.version === 1) {
        const merged: State = { ...seedState(), ...parsed, settings: { ...seedState().settings, ...parsed.settings } };
        // Le presentazioni già fatte prima dell'app avevano una data finta: non contano per sfide e premi.
        merged.presentations.forEach((p) => p.doneAt === "2026-11-17" && (p.doneAt = "2026-10-31"));
        syncLessons(merged);
        // Chi aveva già iniziato una lezione prima di questa versione: riparte dall'ultima lasciata a metà.
        if (!merged.lastPresentationId) {
          const half = merged.presentations
            .filter((p) => p.steps.some((x) => x.done) && p.steps.some((x) => !x.done))
            .sort((a, b) => b.code.localeCompare(a.code, "it", { numeric: true }))[0];
          if (half) merged.lastPresentationId = half.id;
        }
        return merged;
      }
    }
  } catch {
    /* localStorage non disponibile o dati rotti: si riparte dal seed */
  }
  const fresh = seedState();
  syncLessons(fresh);
  return fresh;
}

let state: State = load();
const listeners = new Set<() => void>();
queueMicrotask(() => persist());

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* spazio pieno o modalità privata */
  }
}

export function getState(): State {
  return state;
}

/* ——— Avvisi del gioco (punti, premi): non si salvano ——— */

export type Toast = { id: number; text: string; big?: boolean };
let toasts: Toast[] = [];
let toastId = 0;
const toastListeners = new Set<() => void>();
export function pushToast(text: string, big = false) {
  toasts = [...toasts, { id: ++toastId, text, big }];
  toastListeners.forEach((l) => l());
  const id = toastId;
  setTimeout(() => dismissToast(id), big ? 3800 : 1800);
}
export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  toastListeners.forEach((l) => l());
}
export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
}

/* ——— Feste a tutto schermo per premi, livelli, sfide e partite ——— */

export type Celebration = { id: number; kind: "badge" | "level" | "daily" | "weekly" | "boss"; icon: string; title: string; subtitle: string; points: number };
let celebrations: Celebration[] = [];
let celebrationId = 0;
const celebrationListeners = new Set<() => void>();
export function celebrate(c: Omit<Celebration, "id">) {
  celebrations = [...celebrations, { ...c, id: ++celebrationId }];
  celebrationListeners.forEach((l) => l());
}
export function dismissCelebration(id: number) {
  celebrations = celebrations.filter((c) => c.id !== id);
  celebrationListeners.forEach((l) => l());
}
export function useCelebrations(): Celebration[] {
  return useSyncExternalStore(
    (l) => {
      celebrationListeners.add(l);
      return () => celebrationListeners.delete(l);
    },
    () => celebrations,
    () => celebrations,
  );
}

function award(s: State, kind: XpKind, times = 1) {
  if (times <= 0) return;
  s.xp.push({ date: today(), kind, points: POINTS[kind] * times });
}

/** Dopo ogni azione: sfide completate e premi nuovi, con il loro avviso. */
function settle(s: State) {
  const d = today();
  const daily = dailyChallenge(s, d);
  if (daily.complete && daily.done > 0 && !s.challenges[`d:${d}`]) {
    s.challenges[`d:${d}`] = d;
    award(s, "daily");
    queueMicrotask(() => celebrate({ kind: "daily", icon: "🎯", title: "Sfida del giorno vinta", subtitle: "Hai fatto quello che serviva oggi.", points: POINTS.daily }));
  }
  const w = weekStart(d);
  const weekly = weeklyChallenge(s, d);
  if (weekly.complete && weekly.done > 0 && !s.challenges[`w:${w}`]) {
    s.challenges[`w:${w}`] = d;
    award(s, "weekly");
    queueMicrotask(() => celebrate({ kind: "weekly", icon: "📅", title: "Settimana vinta", subtitle: "Tutte le presentazioni della settimana, chiuse.", points: POINTS.weekly }));
  }
  for (const id of earnedBadges(s, d)) {
    s.badges[id] = d;
    const b = BADGES.find((x) => x.id === id);
    if (b) queueMicrotask(() => celebrate({ kind: "badge", icon: b.icon, title: b.name, subtitle: b.how, points: 0 }));
  }
}

export function setState(update: (draft: State) => void) {
  const draft = structuredClone(state);
  const before = level(totalXp(state));
  update(draft);
  settle(draft);
  const after = level(totalXp(draft));
  if (after.index > before.index) queueMicrotask(() => celebrate({ kind: "level", icon: "⬆️", title: `Sei ${after.name}!`, subtitle: after.next ? `Prossimo livello: ${after.next}.` : "Livello massimo raggiunto.", points: 0 }));
  state = draft;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ——— Sessione ——— */

/** Se la presentazione non esiste ancora (unità appena uscita), la crea con 10 passi. */
export function ensurePresentation(code: string, title: string): string {
  const existing = state.presentations.find((p) => p.code === code);
  if (existing) return existing.id;
  const p = makePresentation(code, title);
  setState((s) => {
    s.presentations.push(p);
  });
  return p.id;
}

export function startStep(presentationId: string) {
  const p = state.presentations.find((x) => x.id === presentationId);
  const step = p?.steps.find((s) => !s.done);
  if (!p || !step) return;
  const now = Date.now();
  setState((s) => {
    s.timer = { presentationId, stepId: step.id, startedAt: now, endsAt: now + STEP_MS };
    s.lastPresentationId = presentationId;
  });
}

/** Fa una parte precisa scelta da "Le tue lezioni" (anche fuori ordine): conta come una parte normale. */
export function startStepAt(presentationId: string, stepId: string) {
  const now = Date.now();
  setState((s) => {
    s.timer = { presentationId, stepId, startedAt: now, endsAt: now + STEP_MS };
    s.lastPresentationId = presentationId;
  });
}

/** Riascolto di una parte già fatta (lezioni passate): niente spunte né punti, solo i minuti di studio. */
export function startReplay(presentationId: string, stepId: string, returnTo?: string) {
  const now = Date.now();
  setState((s) => {
    s.timer = { presentationId, stepId, startedAt: now, endsAt: now + STEP_MS, replay: true, ...(returnTo ? { returnTo } : {}) };
  });
}

export function finishReplay() {
  const t = state.timer;
  if (!t) return;
  const minutes = Math.max(0, Math.min(15, Math.round(((Math.min(Date.now(), t.endsAt) - t.startedAt) / 60_000) * 10) / 10));
  const d = today();
  setState((s) => {
    const l = s.log[d] ?? { minutes: 0, steps: 0 };
    s.log[d] = { minutes: Math.round((l.minutes + minutes) * 10) / 10, steps: l.steps };
    // dal tasto "Parte precedente": si torna alla parte che stavi facendo
    s.timer = t.returnTo ? { presentationId: t.presentationId, stepId: t.returnTo, startedAt: Date.now(), endsAt: Date.now() + STEP_MS } : null;
  });
}

export function addMinute() {
  setState((s) => {
    if (!s.timer) return;
    if (s.timer.pausedLeft != null) s.timer.pausedLeft += 60_000;
    else s.timer.endsAt += 60_000;
  });
}

export function togglePause() {
  setState((s) => {
    const t = s.timer;
    if (!t) return;
    if (t.pausedLeft != null) {
      t.endsAt = Date.now() + t.pausedLeft;
      delete t.pausedLeft;
    } else {
      t.pausedLeft = Math.max(0, t.endsAt - Date.now());
    }
  });
}

/** Chiude il passo in corso: lo segna fatto e registra i minuti nella giornata. */
export function finishStep() {
  const t = state.timer;
  if (!t) return;
  const elapsed = t.pausedLeft != null ? t.endsAt - t.startedAt - t.pausedLeft : Math.min(Date.now(), t.endsAt) - t.startedAt;
  const minutes = Math.max(0, Math.min(15, Math.round((elapsed / 60_000) * 10) / 10));
  const d = today();
  pushToast(`+${POINTS.part}`);
  setState((s) => {
    const p = s.presentations.find((x) => x.id === t.presentationId);
    const step = p?.steps.find((x) => x.id === t.stepId);
    if (step && !step.done) {
      step.done = true;
      award(s, "part");
      const lesson = p ? lessonFor(s, p.code) : undefined;
      const idx = p ? p.steps.findIndex((x) => x.id === t.stepId) : -1;
      if (lesson && p && idx >= 0) {
        const have = new Set(s.cards.map((c) => c.id));
        for (const c of cardsForPart(lesson, idx, p.id, d)) if (!have.has(c.id)) s.cards.push(c);
      }
    }
    if (p && isDone(p) && !p.doneAt) {
      p.doneAt = d;
      award(s, "presentation");
    }
    const l = s.log[d] ?? { minutes: 0, steps: 0 };
    s.log[d] = { minutes: Math.round((l.minutes + minutes) * 10) / 10, steps: l.steps + 1 };
    s.timer = null;
  });
}

export function cancelStep() {
  setState((s) => {
    s.timer = null;
  });
}

export function toggleStepDone(presentationId: string, stepId: string) {
  const d = today();
  setState((s) => {
    const p = s.presentations.find((x) => x.id === presentationId);
    const step = p?.steps.find((x) => x.id === stepId);
    if (!p || !step) return;
    step.done = !step.done;
    if (isDone(p)) p.doneAt ??= d;
    else delete p.doneAt;
  });
}

export function saveRecall(presentationId: string, afterStep: number, text: string) {
  setState((s) => {
    const p = s.presentations.find((x) => x.id === presentationId);
    p?.recalls.push({ afterStep, text, date: today() });
    award(s, "recall");
  });
  pushToast(`Richiamo · +${POINTS.recall}`);
}

/* ——— Flashcard ——— */

export function addCard(front: string, back: string, presentationId?: string) {
  setState((s) => {
    s.cards.push(newCard(front, back, today(), presentationId));
  });
}

export function gradeCard(id: string, grade: Grade) {
  setState((s) => {
    const i = s.cards.findIndex((c) => c.id === id);
    if (i >= 0) s.cards[i] = review(s.cards[i]!, grade, today());
    award(s, "card");
  });
}

export function deleteCard(id: string) {
  setState((s) => {
    s.cards = s.cards.filter((c) => c.id !== id);
  });
}

/** Il ripasso conta anche come giornata: minuti nel registro, senza passi. */
export function logMinutes(minutes: number) {
  const d = today();
  setState((s) => {
    const l = s.log[d] ?? { minutes: 0, steps: 0 };
    s.log[d] = { minutes: Math.round((l.minutes + minutes) * 10) / 10, steps: l.steps };
  });
}

/* ——— Domande, partite, esercizi ——— */

/** Risposta a una domanda d'esame (quiz, partita o domanda veloce dopo una parte). */
export function recordAnswer(questionId: string, correct: boolean, kind: "quiz" | "check" = "quiz") {
  setState((s) => {
    const a = s.answers[questionId] ?? { seen: 0, wrong: 0, last: today(), lastCorrect: true };
    s.answers[questionId] = { seen: a.seen + 1, wrong: a.wrong + (correct ? 0 : 1), last: today(), lastCorrect: correct };
    if (correct) award(s, kind);
  });
  if (correct) pushToast(`+${POINTS[kind]}`);
}

export function saveBossResult(unit: number, correct: number) {
  const won = correct >= BOSS_TO_WIN;
  setState((s) => {
    const prev = s.bosses[String(unit)];
    const firstWin = won && !prev?.won;
    s.bosses[String(unit)] = { won: won || !!prev?.won, best: Math.max(prev?.best ?? 0, correct), date: today() };
    if (firstWin) award(s, "boss");
  });
  if (won) celebrate({ kind: "boss", icon: "🏆", title: `Unità ${unit} vinta`, subtitle: `${correct} risposte giuste su 10.`, points: POINTS.boss });
}

export function markExercise(id: string) {
  setState((s) => {
    if (s.exercisesDone[id]) return;
    s.exercisesDone[id] = today();
    award(s, "exercise");
  });
  pushToast(`Esercizio · +${POINTS.exercise}`);
}

/** Fine di un gioco per studiare: punti se almeno il 70% è giusto. */
export function finishGame(game: "order" | "who" | "tf", right: number, total: number) {
  if (total === 0 || right / total < 0.7) return;
  setState((s) => award(s, "game"));
  pushToast(`${game === "order" ? "Metti in ordine" : game === "who" ? "Chi sono?" : "Vero o falso"} · +${POINTS.game}`);
}

/** Salva una lezione importata (validata) e costruisce il suo percorso. */
export function importLesson(data: unknown): { ok: true; lesson: LessonPack } | { ok: false; error: string } {
  const r = LessonPackSchema.safeParse(data);
  if (!r.success) return { ok: false, error: "La lezione ricevuta non è completa. Riprova." };
  const lesson = r.data;
  setState((s) => {
    s.lessons = [...(s.lessons ?? []).filter((l) => l.code !== lesson.code), lesson];
    if (!s.units.some((u) => u.n === lesson.unit)) return;
    syncLessons(s);
  });
  return { ok: true, lesson };
}

/* ——— Spiegazioni, quiz, backup ——— */

export function saveExplanation(e: Omit<Explanation, "id" | "created"> & { id?: string }) {
  setState((s) => {
    const i = e.id ? s.explanations.findIndex((x) => x.id === e.id) : -1;
    if (i >= 0) s.explanations[i] = { ...s.explanations[i]!, ...e, id: s.explanations[i]!.id };
    else s.explanations.unshift({ ...e, id: uid("exp"), created: today() });
  });
}

export function deleteExplanation(id: string) {
  setState((s) => {
    s.explanations = s.explanations.filter((x) => x.id !== id);
  });
}

export function saveQuizResult(r: Omit<QuizResult, "id" | "date">) {
  setState((s) => {
    s.quizResults.unshift({ ...r, id: uid("quiz"), date: today() });
  });
}

/** Valida e aggiunge domande da un JSON; restituisce quante ne ha aggiunte e gli errori. */
export function importQuestions(text: string): { added: number; errors: string[] } {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { added: 0, errors: ["Il file non è un JSON valido."] };
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return { added: 0, errors: ["Manca l'elenco «questions»."] };
  const valid: Question[] = [];
  list.forEach((q: Partial<Question>, i) => {
    const ok =
      q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => typeof o === "string") && Number.isInteger(q.answer) && q.answer! >= 0 && q.answer! <= 3;
    if (!ok) errors.push(`Domanda ${i + 1}: servono «question», 4 «options» e «answer» da 0 a 3.`);
    else valid.push({ ...(q as Question), id: q.id ?? uid("q") });
  });
  setState((s) => {
    const ids = new Set(s.questions.map((q) => q.id));
    for (const q of valid) {
      if (ids.has(q.id)) s.questions = s.questions.filter((x) => x.id !== q.id);
      s.questions.push(q);
    }
  });
  return { added: valid.length, errors };
}

export function exportBackup(): string {
  return JSON.stringify({ ...state, timer: null }, null, 2);
}

export function importBackup(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as State;
    if (parsed?.version !== 1 || !Array.isArray(parsed.presentations)) return "Questo file non è un backup di Setanta Coach.";
    setState((s) => {
      Object.assign(s, seedState(), parsed, { timer: null, settings: { ...seedState().settings, ...parsed.settings } });
      syncLessons(s);
    });
    return null;
  } catch {
    return "Il file non è un JSON valido.";
  }
}

export function resetAll() {
  setState((s) => {
    Object.assign(s, seedState());
    syncLessons(s);
  });
}
