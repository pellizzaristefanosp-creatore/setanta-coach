import { useSyncExternalStore } from "react";
import { makePresentation, seedState } from "../data/seed";
import { today } from "./dates";
import { isDone } from "./plan";
import { newCard, review, type Grade } from "./sm2";
import type { Explanation, Question, QuizResult, State } from "./types";

const KEY = "setanta-coach:v1";
const STEP_MS = 2 * 60 * 1000;

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && parsed.version === 1) return { ...seedState(), ...parsed };
    }
  } catch {
    /* localStorage non disponibile o dati rotti: si riparte dal seed */
  }
  return seedState();
}

let state: State = load();
const listeners = new Set<() => void>();

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

export function setState(update: (draft: State) => void) {
  const draft = structuredClone(state);
  update(draft);
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
  const minutes = Math.max(0, Math.round((elapsed / 60_000) * 10) / 10);
  const d = today();
  setState((s) => {
    const p = s.presentations.find((x) => x.id === t.presentationId);
    const step = p?.steps.find((x) => x.id === t.stepId);
    if (step) step.done = true;
    if (p && isDone(p) && !p.doneAt) p.doneAt = d;
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
  });
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
      Object.assign(s, seedState(), parsed, { timer: null });
    });
    return null;
  } catch {
    return "Il file non è un JSON valido.";
  }
}

export function resetAll() {
  setState((s) => {
    Object.assign(s, seedState());
  });
}
