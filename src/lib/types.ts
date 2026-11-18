export type ISODate = string; // "YYYY-MM-DD", sempre data locale

export type Step = { id: string; title: string; done: boolean };

export type Recall = { afterStep: number; text: string; date: ISODate };

export type Presentation = {
  id: string;
  code: string; // "5.1"
  title: string;
  unit: number;
  steps: Step[];
  doneAt?: ISODate;
  recalls: Recall[];
};

export type Unit = { n: number; title: string; topic: string; release: ISODate };

export type Card = {
  id: string;
  presentationId?: string;
  front: string;
  back: string;
  ef: number;
  interval: number;
  reps: number;
  due: ISODate;
  created: ISODate;
};

export type Explanation = {
  id: string;
  presentationId?: string;
  concept: string;
  text: string;
  analogy: string;
  created: ISODate;
};

export type Question = {
  id: string;
  presentation?: string;
  unit?: number;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type QuizResult = {
  id: string;
  date: ISODate;
  mode: "allenamento" | "simulazione";
  total: number;
  correct: number;
  seconds: number;
};

export type ChecklistItem = { id: string; title: string; due: ISODate; done: boolean };

export type Exams = {
  practicalOpen: ISODate;
  practicalDeadline: string; // "2026-12-27 23:59"
  practicalTarget: ISODate;
  mcqOpen: string;
  mcqClose: string;
  mcqTarget: ISODate;
};

export type Settings = {
  hook: string; // "dopo cena"
  time: string; // "HH:MM"
  restDay: number; // 0 = domenica … 6 = sabato
  startDate: ISODate;
  voiceRate: number; // 1 = normale
  voiceName?: string;
  appCode?: string; // codice per importare lezioni (server)
  lessonView?: "cartoon" | "audio"; // come guardare le lezioni con audio
};

export type DayLog = Record<ISODate, { minutes: number; steps: number }>;

export type ActiveTimer = {
  presentationId: string;
  stepId: string;
  startedAt: number; // ms
  endsAt: number; // ms
  pausedLeft?: number; // ms rimasti, se in pausa
};

export type XpEvent = { date: ISODate; kind: XpKind; points: number };
export type XpKind = "part" | "check" | "recall" | "card" | "quiz" | "boss" | "presentation" | "daily" | "weekly" | "exercise";

export type AnswerStat = { seen: number; wrong: number; last: ISODate; lastCorrect: boolean };

export type BossResult = { won: boolean; best: number; date: ISODate };

export type State = {
  version: 1;
  units: Unit[];
  presentations: Presentation[];
  cards: Card[];
  explanations: Explanation[];
  questions: Question[];
  quizResults: QuizResult[];
  checklist: ChecklistItem[];
  exams: Exams;
  settings: Settings;
  log: DayLog;
  timer: ActiveTimer | null;
  /* Gioco e studio intelligente */
  xp: XpEvent[];
  answers: Record<string, AnswerStat>;
  bosses: Record<string, BossResult>; // chiave = numero dell'unità
  badges: Record<string, ISODate>;
  challenges: Record<string, ISODate>; // sfide già premiate: "d:2026-11-18", "w:2026-11-16"
  lessons: import("./lesson").LessonPack[]; // lezioni importate dal PDF
  exercisesDone: Record<string, ISODate>;
  /** Ultimo piano visto (per dire quando si è ricalcolato) */
  lastPlan?: { date: ISODate; perDay: number; target: number };
  replanNote?: { date: ISODate; missed: number; from: number; to: number };
}
