import { z } from "zod/v4";

/**
 * Pacchetto lezione: tutto quello che serve per studiare una presentazione dentro l'app.
 * Lo scrive Claude (a mano per le lezioni incluse, dall'API per quelle importate) a partire dal PDF.
 * Testi in parole nostre: mai copiare i testi del corso.
 */

export const CheckSchema = z.object({
  question: z.string().describe("Domanda veloce di verifica sulla parte appena ascoltata"),
  options: z.array(z.string()).length(4),
  answer: z.number().int().min(0).max(3).describe("Indice della risposta giusta (0–3)"),
  explanation: z.string().describe("Perché è giusta, max 25 parole"),
});

export const PartSchema = z.object({
  slide: z.number().int().describe("Numero di pagina della slide nel PDF"),
  title: z.string().describe("Titolo breve della parte"),
  narration: z
    .string()
    .describe("Testo che la voce legge: 180–260 parole, italiano semplice, frasi corte, parla al 'tu', parole tue (mai copiare il PDF)"),
  keyPoints: z.array(z.string()).min(2).max(5).describe("Punti chiave mostrati sulle carte, max 12 parole l'uno"),
  analogy: z.string().describe("Paragone concreto dal calcio o dalla palestra, 1–2 frasi"),
  check: CheckSchema,
});

export const FlashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  part: z.number().int().describe("Indice (da 0) della parte a cui si riferisce"),
});

export const LessonQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string(),
  part: z.number().int().describe("Indice (da 0) della parte a cui si riferisce"),
});

export const ExerciseSchema = z.object({
  title: z.string(),
  prompt: z.string().describe("Esercizio pratico da preparatore atletico, es. scrivi una scheda o analizza un caso"),
  modelAnswer: z.string().describe("Una buona risposta di riferimento, 60–150 parole"),
});

export const LessonPackSchema = z.object({
  version: z.literal(1),
  code: z.string().describe("Codice della presentazione, es. '5.1'"),
  unit: z.number().int(),
  title: z.string(),
  summary: z.string().describe("Di cosa parla, 2 frasi"),
  parts: z.array(PartSchema).min(3),
  flashcards: z.array(FlashcardSchema).min(8),
  questions: z.array(LessonQuestionSchema).min(10),
  exercises: z.array(ExerciseSchema).min(2).max(4),
});

export type LessonPack = z.infer<typeof LessonPackSchema>;
export type LessonPart = z.infer<typeof PartSchema>;

/** Istruzioni comuni per chi scrive una lezione (umano o API). */
export const LESSON_GUIDE = `Sei un preparatore atletico esperto e un ottimo insegnante. Trasforma il testo di una presentazione del corso
"Allenamento della Forza 2" in una lezione da studiare in un'app.
Lo studente è un calciatore e preparatore atletico: capisce il linguaggio tecnico, ma molla se legge testi lunghi.
Impara con esempi semplici e paragoni dal calcio e dalla palestra.

Regole:
- Una parte per ogni slide con contenuto (salta copertina e indice). Usa il numero di pagina come "slide".
- "narration": 180–260 parole, da ascoltare in circa 2 minuti. Italiano semplice, frasi corte, dai del tu.
  Spiega con parole tue: non copiare frasi del testo originale. Tieni TUTTI i fatti d'esame: numeri, percentuali,
  definizioni, nomi di studi e autori, confronti, raccomandazioni. Non aggiungere fatti che non sono nel testo.
- "keyPoints": 2–5 punti chiave brevi, quelli che servono all'esame.
- "analogy": un paragone concreto dal calcio o dalla palestra.
- "check": una domanda veloce a 4 opzioni sulla parte, una sola giusta.
- "flashcards": almeno 1 per parte con contenuto, domanda e risposta brevi.
- "questions": 12–15 domande stile MCQ d'esame, 4 opzioni plausibili, una sola giusta, posizione della giusta variata,
  niente "tutte le precedenti". Basate solo sul testo.
- "exercises": 2–3 esercizi pratici (es. "scrivi una seduta per…", "un atleta ti dice… cosa rispondi?") con risposta modello.`;
