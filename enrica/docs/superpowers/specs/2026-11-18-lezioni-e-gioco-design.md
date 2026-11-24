# Lezioni dentro l'app e gioco — progetto

Data: 18/11/2026. Approvato dall'utente in chat ("b, e nel gioco per ora non cambio nulla").

## Perché

L'utente non vuole aprire il sito Setanta: vuole studiare tutto dentro l'app. Fatica a iniziare e molla a metà; impara con
esempi semplici dal calcio e dalla palestra. L'app deve sembrare un gioco (premi, sfide) e spingerlo a finire entro le date
calcolate su quanto manca prima dell'esame.

## Obiettivi

- Lezioni complete dentro l'app per ogni presentazione: una parte per slide (~2 minuti), letta dalla voce del telefono,
  con carte animate dei punti chiave, paragone dal campo, domanda veloce dopo ogni parte.
- Flashcard, domande d'esame ed esercizi pratici già pronti per ogni lezione.
- Importazione di una lezione nuova dal PDF (strada B): il telefono legge il testo del PDF, il server chiede a Claude il
  pacchetto lezione, l'app costruisce il percorso da sola.
- Gioco: punti, livelli (Panchina → Convocato → Titolare → Vice-capitano → Capitano → Campione), sfida del giorno, sfida della
  settimana, partita di fine unità (10 domande, 7 per vincere), premi, ritmo verso il traguardo.
- "Allenatore": il bottone unico fa sempre la cosa più utile adesso (parte nuova → flashcard scadute → partita di fine unità
  → quiz sugli argomenti deboli mescolati).

## Non obiettivi

- Video veri (si usano carte animate + voce). Voci a pagamento. Account e sincronizzazione tra dispositivi (fase 2).

## Anti-obiettivi

- Copiare i testi del corso sul sito pubblico: le lezioni sono riscritte con parole nostre, fatti d'esame inclusi.
- Mostrare il debito all'apertura (resta in Situazione). Notifiche o sfide che fanno sentire in colpa.

## Approcci considerati

- A. Tutto nel telefono senza IA: lezioni generate con regole → domande povere. Scartata dall'utente.
- **B. Lezioni scritte da Claude** (scelta): incluse quelle dei PDF già ricevuti (scritte in questa sessione) e importazione
  dal PDF via funzione serverless Vercel con `claude-opus-5-5` e output strutturato (Zod). Costo ~0,15–0,20 $ a lezione.
- C. Scrivere tutto a mano ogni volta in chat: lento per l'utente, scartata come unica via (resta possibile).

## Come

- Formato: `src/lib/lesson.ts` (`LessonPackSchema`, `LESSON_GUIDE`), pacchetti inclusi in `src/data/lessons/*.json`,
  importati in localStorage. Controllo: `npx tsx scripts/check-lesson.ts <file>`.
- Voce: Web Speech API (`speechSynthesis`, voce it-IT), frase per frase; la carta mostra i punti chiave man mano.
- Gioco e allenatore: funzioni pure testate in `src/lib/game.ts` e `src/lib/coach.ts`.
- Ritmo: confronto tra parti previste a oggi dal piano e parti fatte; obiettivo del giorno = parti della presentazione di oggi
  + un terzo del ritardo (massimo 6).
- Importazione: `pdfjs-dist` nel browser → `POST /api/lezione` (testo + codice di accesso `APP_CODE`) → Claude →
  pacchetto validato → salvato. Servono `ANTHROPIC_API_KEY` e `APP_CODE` nelle variabili di Vercel.

## Lasciato a chi costruisce

Punteggi esatti, testi dei premi, aspetto delle carte animate (palette calda già in uso).
