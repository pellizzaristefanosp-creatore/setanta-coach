# Setanta Coach

PWA per studiare con costanza il modulo "Allenamento della Forza 2" del Setanta College.
Vite + React + TypeScript; dati nel telefono (localStorage), backup in JSON.

```bash
npm install
npm run dev       # sviluppo
npm test          # test della logica (piano, serie, SM-2, .ics)
npm run build     # build in dist/
```

- Dati del corso: `src/data/seed.ts` (modificabili anche dall'app, Altro → Corso).
- Domande del quiz: `src/data/questions.json` (36, dalle presentazioni 5.1, 6.1, 7.1); altre si importano dall'app.
- Logica pura e testata: `src/lib/plan.ts`, `streak.ts`, `sm2.ts`, `ics.ts`.

## Variabili su Vercel

- `APP_CODE`: codice che l'app manda alle funzioni intelligenti (lo si scrive in Altro → Funzioni intelligenti).
- `OPENAI_API_KEY`: tutor del «Cosa ricordi?» (`api/richiamo`), paragoni (`api/paragone`), lezioni dai PDF (`api/lezione`).
- `ANTHROPIC_API_KEY` (facoltativa): usata per le lezioni dai PDF solo se manca la chiave OpenAI.
