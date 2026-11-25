import type { ChecklistItem, Exams, Presentation, Question, Settings, State, Unit } from "../lib/types";
import questionsFile from "./questions.json";

/**
 * Dati del corso "Allenamento della Forza 2" (Setanta College, ottobre 2026).
 * Fonte: pagina del corso (programmazione, argomenti, esame e MCQ) e PDF delle presentazioni.
 * Tutto si può cambiare dall'app (Altro → Corso).
 */

export const UNITS: Unit[] = [
  { n: 1, title: "Lo Squat", topic: "Tecnica, esecuzione e varianti dello squat", release: "2026-10-05" },
  { n: 2, title: "Manubri e bilancieri", topic: "Panca piana, stacco da terra e overhead press", release: "2026-10-12" },
  { n: 3, title: "Allenamento con manubri", topic: "Tecniche ed esercizi fondamentali con i manubri", release: "2026-10-19" },
  { n: 4, title: "Core", topic: "Esercizi anti-flessione, anti-estensione, anti-rotazione", release: "2026-10-26" },
  { n: 5, title: "Ipertrofia", topic: "Meccanismi, adattamenti neuromuscolari e ormonali", release: "2026-11-02" },
  { n: 6, title: "Variabili dell'ipertrofia", topic: "Variabili e strategie per l'allenamento dell'ipertrofia", release: "2026-11-09" },
  { n: 7, title: "Introduzione alle alzate olimpiche", topic: "Tecnica dello strappo e le sue varianti", release: "2026-11-16" },
  { n: 8, title: "Alzate olimpiche", topic: "Tecnica della girata, spinta e relative varianti", release: "2026-11-23" },
  { n: 9, title: "Variabili dell'allenamento della forza", topic: "Fattori neuromuscolari e variabili dell'allenamento della forza", release: "2026-11-30" },
  { n: 10, title: "Sviluppo della forza", topic: "Forza massimale, eccentrica e isometrica per la prestazione", release: "2026-12-07" },
  { n: 11, title: "Periodizzazione", topic: "Modelli di periodizzazione e applicazioni negli sport di squadra", release: "2026-12-14" },
  { n: 12, title: "Monitorare l'allenamento", topic: "Monitoraggio dell'allenamento, della fatica e delle sue cause", release: "2026-12-21" },
  { n: 13, title: "Esame pratico", topic: "Power Clean: checklist NSCA, 4 aree di miglioramento e correttivi", release: "2026-11-25" },
];

/** Passi di default: una slide = una nota audio di circa 2 minuti. */
function slides(from: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Slide ${from + i}`);
}

type P = { code: string; title: string; steps?: string[]; done?: boolean };

const P_LIST: P[] = [
  { code: "1.1", title: "Lo Squat", done: true },
  { code: "2.1", title: "Allenamento con manubri e bilancieri", done: true },
  { code: "2.2", title: "Panca piana", done: true },
  { code: "2.3", title: "Stacco da terra", done: true },
  { code: "2.4", title: "Overhead press & barbell row", done: true },
  { code: "3.1", title: "Manubri 1", done: true },
  { code: "3.2", title: "Manubri 2", done: true },
  { code: "3.3", title: "Complex training", done: true },
  { code: "4.1", title: "Allenamento del core", done: true },
  { code: "4.2", title: "Esercizi anti-flessione", done: true },
  { code: "4.3", title: "Esercizi anti-estensione", done: true },
  { code: "4.4", title: "Esercizi anti-flessione laterale", done: true },
  { code: "4.5", title: "Esercizi anti-rotazione" },
  {
    code: "5.1",
    title: "Aspetti neuromuscolari dell'ipertrofia",
    steps: [
      "Slide 3 · Introduzione",
      "Slide 4 · Ipertrofia",
      "Slide 5 · La contrazione muscolare (1/2)",
      "Slide 6 · La contrazione muscolare (2/2)",
      "Slide 7 · Tipi di fibre muscolari",
      "Slide 8 · Fibre muscolari",
      "Slide 9 · Risposte all'allenamento della forza",
      "Slide 10 · Adattamenti neurali",
      "Slide 11 · Le basi dell'ipertrofia: equilibrio proteico",
      "Slide 12 · Sintesi proteica (1/2)",
      "Slide 13 · Sintesi proteica (2/2)",
      "Slide 14 · Riepilogo",
    ],
  },
  { code: "5.2", title: "Tipi di ipertrofia e ormoni" },
  { code: "5.3", title: "Meccanismi dell'ipertrofia" },
  {
    code: "6.1",
    title: "Variabili dell'ipertrofia 1",
    steps: [
      "Slide 3 · Introduzione",
      "Slide 4 · Variabili per l'ipertrofia (1/2)",
      "Slide 5 · Variabili per l'ipertrofia (2/2)",
      "Slide 6 · Volume (1/3)",
      "Slide 7 · Volume (2/3)",
      "Slide 8 · Volume (3/3)",
      "Slide 9 · Frequenza",
      "Slide 10 · Carico (1/4)",
      "Slide 11 · Carico (2/4)",
      "Slide 12 · Carico (3/4)",
      "Slide 13 · Carico (4/4)",
      "Slide 14 · Cedimento muscolare",
      "Slide 15 · Riepilogo",
    ],
  },
  { code: "6.2", title: "Variabili dell'ipertrofia 2" },
  { code: "6.3", title: "Strategie per l'allenamento dell'ipertrofia" },
  {
    code: "7.1",
    title: "Alzate olimpiche",
    steps: [
      "Slide 3 · Introduzione",
      "Slide 4 · Le alzate olimpiche",
      "Slide 5",
      "Slide 6 · Caratteristiche degli atleti di weightlifting",
      "Slide 7 · Abilità nell'esecuzione delle alzate (1/2)",
      "Slide 8 · Abilità nell'esecuzione delle alzate (2/2)",
      "Slide 9 · Rischio di infortunio",
      "Slide 10 · Weightlifting e aumenti di potenza",
      "Slide 11 · Movimenti sport-specifici (1/2)",
      "Slide 12 · Movimenti sport-specifici (2/2)",
      "Slide 13 · Alzate olimpiche e giovani",
      "Slide 14",
      "Slide 15 · Riepilogo",
    ],
  },
  { code: "7.2", title: "Lo strappo" },
  { code: "7.3", title: "Le varianti dello strappo" },
  { code: "8.1", title: "La girata (Power Clean)" },
  { code: "8.2", title: "La spinta (Push Press e Push Jerk)" },
  { code: "8.3", title: "Varianti dello slancio" },
  { code: "13.1", title: "Esame pratico: come si fa" },
];

export const DEFAULT_STEPS = 10;

export function makePresentation(code: string, title: string, stepTitles?: string[], done = false, doneAt?: string): Presentation {
  const unit = Number(code.split(".")[0]);
  const titles = stepTitles && stepTitles.length > 0 ? stepTitles : slides(3, DEFAULT_STEPS);
  return {
    id: `p-${code}`,
    code,
    title,
    unit,
    steps: titles.map((t, i) => ({ id: `p-${code}-s${i + 1}`, title: t, done })),
    doneAt: done ? doneAt : undefined,
    recalls: [],
  };
}

export const EXAMS: Exams = {
  practicalOpen: "2026-12-14",
  practicalDeadline: "2026-12-27 23:59",
  practicalTarget: "2026-12-23",
  mcqOpen: "2026-12-14 09:00",
  mcqClose: "2027-01-10 23:59",
  mcqTarget: "2027-01-07",
};

export const CHECKLIST: ChecklistItem[] = [
  { id: "c1", title: "Scarica le istruzioni dell'esame pratico (PDF)", due: "2026-11-19", done: false },
  { id: "c2", title: "Scarica il template Word e la dichiarazione sull'uso dell'IA", due: "2026-11-19", done: false },
  { id: "c3", title: "Salva il link del video da visionare", due: "2026-11-19", done: false },
  { id: "c4", title: "Leggi le istruzioni (solo quello, niente altro)", due: "2026-11-21", done: false },
  { id: "c5", title: "Guarda il webinar «Allenamento della forza 2 – Esame»", due: "2026-11-25", done: false },
  { id: "c6", title: "Guarda il video da visionare e prendi 5 appunti", due: "2026-11-28", done: false },
  { id: "c7", title: "Leggi le linee guida per citare le fonti", due: "2026-12-02", done: false },
  { id: "c8", title: "Trova 3 articoli scientifici (Google Scholar / PubMed)", due: "2026-12-05", done: false },
  { id: "c9", title: "Scrivi la bozza nel template", due: "2026-12-12", done: false },
  { id: "c10", title: "Rivedi la bozza e compila la dichiarazione IA", due: "2026-12-19", done: false },
  { id: "c11", title: "Consegna su Turnitin (aperto dal 14/12)", due: "2026-12-23", done: false },
];

export const SETTINGS: Settings = {
  hook: "dopo l'allenamento",
  time: "19:00",
  restDay: 0,
  startDate: "2026-11-18",
  voiceRate: 1,
};

export function seedState(): State {
  return {
    version: 1,
    units: UNITS.map((u) => ({ ...u })),
    presentations: P_LIST.map((p) => makePresentation(p.code, p.title, p.steps, p.done, "2026-10-31")),
    cards: [],
    explanations: [],
    questions: (questionsFile as { questions: Question[] }).questions,
    quizResults: [],
    checklist: CHECKLIST.map((c) => ({ ...c })),
    exams: { ...EXAMS },
    settings: { ...SETTINGS },
    log: {},
    timer: null,
    xp: [],
    answers: {},
    bosses: {},
    badges: {},
    challenges: {},
    lessons: [],
    exercisesDone: {},
  };
}
