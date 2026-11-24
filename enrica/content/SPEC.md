# Come si scrive una lezione per l'app di Enrica

Enrica è una donna adulta che inizia l'apicoltura e studia il libro **"Apicoltura tecnica e pratica" di Alessandro
Pistoia**. Non è un'esperta e non è una scienziata. L'app la accompagna capitolo per capitolo seguendo l'indice del libro
(numeri di pagina qui sotto). **Il testo del libro NON lo abbiamo**: hai solo i titoli dei capitoli e dei paragrafi. Non
dire mai "il libro dice…" e non inventare cosa c'è nel libro. Insegna l'argomento di quel paragrafo con conoscenze solide di
apicoltura e con la ricerca scientifica.

## Lingua

- Italiano **molto semplice**, frasi corte, dai del "tu" a Enrica.
- Usa le parole tecniche quando servono, e spiegale subito la prima volta: "la covata, cioè uova, larve e pupe".
- Paragoni presi dalla casa, dalla cucina, dall'orto, dalla famiglia (mai dal calcio o dalla palestra).
- Niente elenchi infiniti di numeri: solo i numeri che servono davvero, e veri.

## Fatti e scienza (regola non negoziabile)

- Non inventare **nessun** numero, studio, autore, legge o data. Ogni dato che non è conoscenza apistica di base va
  verificato con una ricerca (strumenti: WebSearch; PubMed via ToolSearch "PubMed"; pagine di IZSVe, CREA-API,
  Ministero della Salute, EFSA, FAO, Apimondia, Università).
- Per ogni parte scrivi un riquadro **"Cosa dice la scienza"** (`science`): 25–60 parole semplici, con una fonte vera e
  verificata (`source`: "Autore et al. anno, Rivista" o "IZSVe 2024"; `url`: DOI o link alla pagina vera). Se sulla pratica
  tradizionale la ricerca recente ha aggiunto o cambiato qualcosa, dillo con gentilezza ("Oggi sappiamo anche che…").
- Norme italiane (anagrafe apistica/BDA, denuncia degli alveari, registro dei trattamenti, etichetta del miele, HACCP,
  Aethina e Vespa velutina): verifica sulle fonti ufficiali e scrivi solo quello che hai trovato. Se una regola può essere
  cambiata, scrivi "controlla sempre con la tua ASL o la tua associazione".
- Farmaci veterinari: nomina solo i principi attivi autorizzati (es. acido ossalico, acido formico, timolo, amitraz) e
  ricorda sempre "segui l'etichetta e il veterinario". Mai dosi inventate.
- Se non trovi una fonte affidabile per un dato, **non scriverlo**.

## Formato: un file JSON per lezione, `content/<codice>.json`

```json
{
  "code": "1.1",
  "unit": 1,
  "title": "La società delle api",
  "pages": "15–26",
  "summary": "Due frasi semplici su cosa impara Enrica.",
  "parts": [
    {
      "title": "Titolo breve della parte (dal paragrafo dell'indice)",
      "keyPoints": ["2–5 punti chiave", "max 12 parole l'uno"],
      "analogy": "Un paragone di casa, 1–2 frasi.",
      "tip": "Consiglio pratico per quando sarà davanti all'arnia, max 35 parole.",
      "science": { "text": "25–60 parole", "source": "Seeley 2010, Honeybee Democracy (Princeton University Press)", "url": "https://…" },
      "check": { "question": "…", "options": ["…", "…", "…", "…"], "answer": 2, "explanation": "max 25 parole" },
      "dialogue": [
        { "who": "M", "text": "Battuta del Giuliano." },
        { "who": "E", "text": "Battuta di Enrica." }
      ]
    }
  ],
  "flashcards": [{ "front": "domanda breve", "back": "risposta breve", "part": 0 }],
  "questions": [{ "question": "…", "options": ["…", "…", "…", "…"], "answer": 1, "explanation": "…", "part": 0 }],
  "exercises": [{ "title": "…", "prompt": "Un caso pratico: «Apri l'arnia e vedi…». Cosa fai?", "modelAnswer": "60–150 parole" }],
  "games": {
    "order": [{ "title": "Cosa si mette in ordine", "steps": ["4–7 passi nell'ordine GIUSTO", "max 9 parole l'uno"], "part": 0 }],
    "who": [{ "clues": ["indizio difficile", "medio", "facile"], "answer": "1–4 parole", "distractors": ["…", "…", "…"], "part": 0 }],
    "truefalse": [{ "text": "max 16 parole", "true": true, "why": "max 18 parole", "part": 0 }]
  },
  "turns": [{ "part": 0, "line": 4, "question": "max 18 parole", "options": ["max 14 parole", "…", "…", "…"], "answer": 0, "why": "max 28 parole" }]
}
```

### Parti
- Una parte per ogni paragrafo (o due paragrafi piccoli insieme) dell'indice del capitolo: **4–7 parti**.
- `dialogue`: la lezione vera. Il **Giuliano** (`"M"`, apicoltore anziano, paziente, simpatico) spiega; **Enrica**
  (`"E"`) fa domande da principiante, ripete con parole sue, a volte risponde. **10–16 battute, 200–300 parole in tutto**
  (circa 2 minuti di ascolto). Battute brevi (max 40 parole), parlate, naturali. Niente indicazioni di scena tra parentesi.
  La prima battuta della prima parte saluta Enrica e dice di cosa parla il capitolo.
- Almeno una volta per parte Giuliano fa a Enrica una **domanda** ("Secondo te, perché…?") e la battuta subito dopo è la
  risposta giusta di Enrica (o Enrica che ci arriva). Quella è la base dei `turns`.

### Domande senza trucchi (tutte: check, questions, turns)
- 4 opzioni, una sola giusta, posizione della giusta **variata** (0, 1, 2, 3 distribuite).
- Le sbagliate: stesso genere, numero e costruzione iniziale della giusta, **lunghezza simile (75–125% dei caratteri della
  giusta)**, plausibili per chi non ha studiato. Niente "tutte le precedenti". La domanda non deve tradire la risposta.
- `who` (Chi sono io?): indizi in prima persona **senza** aggettivi o participi che rivelano genere/numero ("mi usi", "servo
  a"); i 3 distractors della stessa categoria, stesso genere e numero, lunghezza simile.

### Quantità per lezione
- flashcards ≥ 8 (almeno 1 per parte), questions 10–14, exercises 2–3 (casi pratici "cosa fai se…"),
  games: order 1–3, who 4–6, truefalse 10–14; turns: 1 per parte, `line` = indice (da 0) nel `dialogue` di quella parte di
  una battuta di Giuliano che è una domanda, seguita da una battuta di Enrica.

## Controllo

Prima di finire, fai girare: `node scripts/check-content.mjs content/<codice>.json` (dalla cartella `enrica`).
Deve dire OK. Correggi finché lo dice.
