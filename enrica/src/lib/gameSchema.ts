import { z } from "zod/v4";

/** Schema dei giochi di una lezione (usato dall'app e dallo script che li scrive). */
export const OrderItemSchema = z.object({
  title: z.string().describe("Cosa si mette in ordine, es. 'Dalla decisione alla contrazione'"),
  steps: z.array(z.string()).min(4).max(7).describe("I passaggi nell'ordine GIUSTO, max 9 parole l'uno"),
  slide: z.number().int(),
});

export const WhoItemSchema = z.object({
  clues: z.array(z.string()).length(3).describe("Tre indizi dal più difficile al più facile, senza dire la risposta"),
  answer: z.string().describe("Il concetto da indovinare, 1–4 parole"),
  distractors: z.array(z.string()).length(3).describe("Tre risposte sbagliate ma plausibili, della stessa lezione"),
  slide: z.number().int(),
});

export const TrueFalseSchema = z.object({
  text: z.string().describe("Una frase breve, max 16 parole"),
  true: z.boolean(),
  why: z.string().describe("Perché è vera o falsa, max 18 parole"),
  slide: z.number().int(),
});

export const GamePackSchema = z.object({
  code: z.string(),
  order: z.array(OrderItemSchema).min(1).max(5),
  who: z.array(WhoItemSchema).min(4).max(10),
  truefalse: z.array(TrueFalseSchema).min(10).max(20),
});

export type GamePack = z.infer<typeof GamePackSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type WhoItem = z.infer<typeof WhoItemSchema>;
export type TrueFalseItem = z.infer<typeof TrueFalseSchema>;
