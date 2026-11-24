import type { ChecklistItem, Exams, Presentation, Question, Settings, State, Unit } from "../lib/types";


import chapters from "./chapters.json";

/**
 * Il percorso di Enrica: il libro "Apicoltura tecnica e pratica" di Alessandro Pistoia, capitolo per capitolo.
 * Ogni capitolo è una lezione; le parti sono i paragrafi dell'indice (pagine del libro accanto al titolo).
 */

const OPEN = "2026-11-24";

export const UNITS: Unit[] = [
  { n: 1, title: "L'ape e l'apicoltore", topic: "Biologia, ciclo di vita e apicoltura di qualità", release: OPEN },
  { n: 2, title: "L'apiario e l'arnia", topic: "Dove mettere le api, l'arnia e gli attrezzi", release: OPEN },
  { n: 3, title: "Lavorare con le api", topic: "Visite, sciamatura, regine e famiglie orfane", release: OPEN },
  { n: 4, title: "Gestire le famiglie", topic: "Saccheggio, nutrizione, nomadismo, nettare e melata", release: OPEN },
  { n: 5, title: "I prodotti dell'alveare", topic: "Miele, polline, pane d'api, pappa reale, propoli, cera, veleno", release: OPEN },
  { n: 6, title: "La difesa dell'alveare", topic: "Malattie, varroa, Aethina, vespa velutina, collasso", release: OPEN },
  { n: 7, title: "Laboratorio, etichetta e calendario", topic: "Mieleria, etichetta, calendario dei lavori e registri", release: OPEN },
];

type P = { code: string; title: string; steps?: string[]; done?: boolean };

const TITLES: [string, string][] = [
  ["1.1", "La società delle api"], ["1.2", "Il ciclo biologico"], ["1.3", "Un'apicoltura di tutela e qualità"],
  ["2.1", "L'allestimento dell'apiario familiare"], ["2.2", "L'arnia"], ["2.3", "Gli attrezzi dell'apicoltore"],
  ["3.1", "Come e quando visitare gli alveari"], ["3.2", "La sciamatura"], ["3.3", "L'allevamento delle api regina"], ["3.4", "La colonia orfana"],
  ["4.1", "Il saccheggio"], ["4.2", "La nutrizione degli alveari"], ["4.3", "Il nomadismo o transumanza"], ["4.4", "Le materie prime del miele"],
  ["5.1", "Il miele"], ["5.2", "Il polline"], ["5.3", "Il pane delle api"], ["5.4", "La pappa reale"], ["5.5", "La propoli"], ["5.6", "La cera"], ["5.7", "Il veleno"],
  ["6.1", "Le malattie e i nemici delle api"], ["6.2", "La varroatosi"], ["6.3", "Il coleottero Aethina tumida"], ["6.4", "La vespa velutina"], ["6.5", "Il collasso dell'alveare"],
  ["7.1", "Il laboratorio apistico"], ["7.2", "Confezionamento ed etichettatura"], ["7.3", "Il calendario dei lavori e i registri"],
];

const byCode = new Map((chapters as { code: string; title: string; parts: string[] }[]).map((c) => [c.code, c]));
const P_LIST: P[] = TITLES.map(([code, title]) => {
  const c = byCode.get(code);
  return { code, title: c?.title ?? title, steps: c?.parts.map((t, i) => `Parte ${i + 1} · ${t}`) };
});

/** Passi di default se una lezione non c'è ancora. */
function slides(from: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Parte ${from + i - 2}`);
}

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
  practicalOpen: "2027-03-31",
  practicalDeadline: "2027-03-31 23:59",
  practicalTarget: "2027-03-31",
  mcqOpen: "2027-03-31 09:00",
  mcqClose: "2027-03-31 23:59",
  // obiettivo: finire il libro prima che riparta la stagione in apiario
  mcqTarget: "2027-03-31",
};

export const CHECKLIST: ChecklistItem[] = [
  { id: "c1", title: "Trova un'associazione di apicoltori vicino a te", due: "2026-12-15", done: false },
  { id: "c2", title: "Chiedi come iscriverti a un corso pratico in apiario", due: "2026-12-31", done: false },
  { id: "c3", title: "Chiedi all'associazione o all'ASL come registrarti all'anagrafe apistica", due: "2027-01-31", done: false },
  { id: "c4", title: "Prepara maschera, guanti, affumicatore e leva", due: "2027-02-15", done: false },
  { id: "c5", title: "Scegli il posto per le arnie: sole del mattino, acqua vicina, riparo dal vento", due: "2027-02-28", done: false },
  { id: "c6", title: "Prenota un nucleo o uno sciame per la primavera", due: "2027-03-15", done: false },
];

export const SETTINGS: Settings = {
  hook: "dopo cena",
  time: "18:30",
  restDay: 0,
  startDate: "2026-11-24",
  voiceRate: 1,
};

export function seedState(): State {
  return {
    version: 1,
    units: UNITS.map((u) => ({ ...u })),
    presentations: P_LIST.map((p) => makePresentation(p.code, p.title, p.steps, p.done)),
    cards: [],
    explanations: [],
    questions: [] as Question[],
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
