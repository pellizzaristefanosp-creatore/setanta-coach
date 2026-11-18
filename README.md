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
