import { z } from "zod/v4";

/**
 * "Tocca a te": durante il dialogo, a caso, l'audio si ferma dopo una domanda e risponde lo studente.
 * Ogni turno è legato a una battuta-domanda del dialogo (parte, indice della battuta); la risposta vera
 * è la battuta dopo, che riparte subito dopo la scelta.
 */
export const TurnSchema = z.object({
  part: z.number().int().min(0),
  line: z.number().int().min(0).describe("Indice della battuta-domanda nel dialogo della parte"),
  question: z.string().describe("La domanda riscritta chiara e breve, max 18 parole"),
  options: z.array(z.string()).length(4).describe("Quattro risposte brevi, max 14 parole l'una"),
  answer: z.number().int().min(0).max(3),
  why: z.string().describe("Il ragionamento giusto in parole semplici, max 28 parole"),
});

export const TurnPackSchema = z.object({ code: z.string(), turns: z.array(TurnSchema) });

export type Turn = z.infer<typeof TurnSchema>;
export type TurnPack = z.infer<typeof TurnPackSchema>;
