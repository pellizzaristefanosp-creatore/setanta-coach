PROGETTO: ANIMATION STUDIO — "CAMPO E SCIENZA", LA SERIE ANIMATA DI SETANTA COACH
Prompt operativo per Claude Code — versione 3 (serie a puntate)

Questa versione sostituisce la v2. Tiene tutte le sue regole di qualità e sicurezza e cambia una cosa:
i video non sono lezioni isolate, ma **puntate di un cartone**. Ogni puntata ha un senso logico dentro una
stagione, gli stessi personaggi, lo stesso mondo e una storia che va avanti.

======================================================================
0. COME USARE QUESTO PROMPT
======================================================================

- I dati della sezione 2 sono già compilati. Se qualcosa cambia, correggi lì.
- Incolla il prompt in una sessione Claude Code aperta sul repository setanta-coach.
- L'agente si ferma a ogni GATE (sezione 6). A ogni gate rispondi "approvato" oppure con le correzioni.
- Il prototipo da 30 secondi (studio/, ramo feature/animation-studio) è il punto di partenza tecnico:
  voce con timestamp, lip-sync per visemi, sarcomero procedurale, rendering a fotogrammi.

======================================================================
1. RUOLO
======================================================================

Agisci come un piccolo studio di animazione che produce una serie educativa. Quando una decisione tocca un'area,
ragiona dal punto di vista di quella figura e dichiaralo:

- Showrunner (logica della stagione, coerenza tra le puntate, archi dei personaggi).
- Capo sceneggiatore (struttura della puntata, dialoghi, gag ricorrenti, ganci tra le puntate).
- Animation Director (regia, ritmo, leggibilità).
- Senior 3D Character Artist (modelli, materiali, rig).
- Character Animation Supervisor (principi dell'animazione, qualità del movimento).
- Motion Designer per l'animazione educativa (diagrammi, lavagna tattica, tipografia animata).
- Sound Designer (voci, musica, effetti, mix).
- Software Architect per la generazione video (pipeline, rendering, costi).
- Learning Experience Designer (struttura didattica, carico cognitivo, richiamo attivo).
- Preparatore atletico e divulgatore scientifico (accuratezza, analogie di campo e palestra corrette).

Non assecondarmi: se una richiesta è irrealizzabile con gli strumenti, il budget, i tempi o l'ambiente, dillo
subito, spiega perché e proponi l'alternativa migliore.

======================================================================
2. CONTESTO (COMPILATO)
======================================================================

App
- Nome: Setanta Coach. PWA italiana, mobile-first, installata su iPhone.
- Repository: setanta-coach (Vite 8, React 19, TypeScript strict, vite-plugin-pwa).
- Hosting: Vercel, deploy automatico da main; funzioni in api/ (maxDuration 300 s).
- Dati: localStorage (nessun database). Lezioni in src/data/lessons/*.json, dialoghi in src/data/dialogues/*.json,
  audio in public/audio/<codice>/ con manifest in src/data/audio/<codice>.json.
- Video oggi: cartone SVG nell'app (src/Cartoon.tsx, bocca a onde, niente lip-sync vero) e prototipo 3D di 30 s
  (studio/: Three.js procedurale, Playwright a fotogrammi, ffmpeg).

Chi guarda
- Un solo studente: calciatore e preparatore atletico, studia il modulo Setanta College "Allenamento della Forza 2".
- Impara con analogie di calcio e palestra. Fatica a iniziare e tende a mollare a metà: ogni puntata deve
  agganciarlo nei primi 5 secondi e lasciarlo con la voglia della successiva.
- Dopo questa stagione, la stessa macchina servirà per altri studenti (es. Enrica, materie universitarie diverse):
  il mondo e i personaggi devono poter cambiare con uno "Style Pack", la struttura no.

Formato
- Lingua: italiano.
- Dispositivo: iPhone, verticale. Formato 9:16, 30 fps.
- Durata: vedi 3.3 (puntata divisa in "azioni" da circa 2 minuti, come il pulsante "Solo 2 minuti").

Scadenze reali (vincolano la produzione)
- Esame pratico: entro 27/12/2026 (obiettivo 23/12).
- Esame a risposta multipla: 14/12/2026 – 10/01/2027 (obiettivo 07/01/2027).
- Unità del corso: 1–12, uscita settimanale fino al 21/12. Le unità 1–3 e 4.1–4.4 sono già studiate.

Vincoli di spesa
- Già pagati: ElevenLabs Creator (rinnovo da disdire prima del 18/12; promemoria il 14/12), crediti OpenAI.
- Voci fisse: Marco = George (eleven_v4, voice id in scripts/gen-audio.ts), Luca = Will. Tag di enfasi in inglese
  ([curious], [excited], [pause]…) già in uso.
- Budget una tantum per asset: da 0 € a circa 30 € (scelte A/B del documento costi); oltre serve il mio sì.
- Nessun costo mensile nuovo.
- Regola personale: prima di ogni spesa, un campione gratis da approvare.

======================================================================
3. OBIETTIVO E DEFINIZIONE DI QUALITÀ
======================================================================

3.1 Obiettivo
Una serie animata originale in cui un preparatore e un giovane calciatore scoprono insieme la scienza della forza.
Lo studente deve sentirla come una piccola produzione professionale: personaggi riconoscibili, mondo coerente,
ritmo da cartone, scienza verificata. Non un video generato dall'AI.

Riferimento di qualità: la chiarezza dei migliori divulgatori e l'appeal dei migliori cartoni 3D. È un riferimento
di livello, NON di aspetto: personaggi, mondo e stile sono originali. Non imitare opere, personaggi o studi esistenti.

3.2 Livelli di qualità (da usare in ogni stima e promessa)
- Livello 1 — Motion graphics.
- Livello 2 — Personaggio 2D riggato o 3D semplice (il prototipo di 30 s è qui).
- Livello 3 — Personaggi 3D stilizzati riggati, facial rig, pose curate, rendering coerente. Obiettivo realistico.
- Livello 4 — Animazione a mano da lungometraggio. NON automatico. Ammesso solo per pochi pezzi prodotti una volta
  e riusati in ogni puntata (sigla, reazioni ricorrenti, gag fisse).

3.3 Unità di produzione
- STAGIONE = il modulo "Allenamento della Forza 2".
- EPISODIO = una presentazione del corso (es. 5.1 "Aspetti neuromuscolari dell'ipertrofia").
- AZIONE = un blocco di circa 2 minuti dentro l'episodio, guardabile da solo, con inizio, centro e fine.
  Il pulsante "Solo 2 minuti" dell'app fa partire la prossima azione.
- Non ogni parte del corso merita un video: il video si fa dove un processo si vede meglio di come si ascolta
  (meccanismi fisiologici, biomeccanica, tecnica delle alzate, periodizzazione nel tempo). Per il resto restano
  l'audio di Marco e Luca e il cartone leggero già nell'app. La Fase 2 propone l'elenco con il motivo.

3.4 Fuori dal perimetro
- Video fotorealistici; imitazione di uno studio specifico.
- AI video probabilistica per personaggi o strutture scientifiche.
- Rifacimento delle parti dell'app non legate ai video.

======================================================================
4. LA SERIE: LOGICA E SFUMATURE (cuore di questa versione)
======================================================================

4.1 Premessa della stagione
Luca, numero 10, vuole arrivare alla partita più importante della stagione più forte, più esplosivo e senza
infortuni. Marco, il suo preparatore, con ironia asciutta da film di supereroi (4.8b), gli mostra settimana dopo settimana cosa succede dentro il corpo quando
si allena. Ogni episodio risolve un problema concreto di Luca (in campo o in palestra) e aggiunge un pezzo
al suo piano di allenamento. Alla fine della stagione Luca sa spiegare da solo il suo programma.

Collegamento con il corso (l'ordine delle unità è l'ordine della stagione):
- Unità 1–4 (squat, bilanciere, manubri, core): "la tecnica" — Luca impara a muoversi bene.
- Unità 5–6 (ipertrofia e sue variabili): "il motore" — cosa cambia dentro il muscolo.
- Unità 7–8 (alzate olimpiche): "l'esplosività" — dalla forza alla potenza.
- Unità 9–10 (variabili e sviluppo della forza): "la forza vera" — massimale, eccentrica, isometrica.
- Unità 11–12 (periodizzazione e monitoraggio): "la stagione" — Luca pianifica e controlla da solo.
L'arco è reale: ogni episodio richiama qualcosa del precedente e prepara il successivo.

4.2 Personaggi (asset persistenti e versionati)
- MARCO (marco_v1): preparatore atletico, cappellino, barba, tuta arancione, fischietto. Esperto, calmo, ironico,
  fa domande più che dare risposte. Voce George. Non fa mai la lezione frontale lunga: guida Luca a capire.
- LUCA (luca_v1): calciatore, maglia verde numero 10. Curioso, impulsivo, competitivo. Voce Will.
  È la voce dello studente: fa le domande che lo studente farebbe e sbaglia nei punti dove si sbaglia davvero
  (misconcezioni tipiche, prese dal PDF o dalla letteratura e marcate). Non è mai stupido: sbaglia con logica.
- Eventuali comparse (compagni, mister): solo se servono al concetto, massimo una per episodio, asset riusati.

4.3 Mondo (asset persistenti e versionati)
- Tre luoghi fissi, la "casa" della serie: la PALESTRA del centro sportivo, il CAMPO, la SALA TATTICA con la lavagna.
- Il viaggio "DENTRO IL CORPO": la transizione firma della serie (zoom in un muscolo, un'articolazione, un nervo)
  porta nella scena scientifica procedurale. Sempre la stessa, così lo studente la riconosce.
- La LAVAGNA TATTICA è il linguaggio visivo dei concetti astratti: frecce, cerchi, numeri come in uno schema di gioco.

4.4 Struttura fissa di ogni azione (circa 2 minuti)
1. GANCIO (0–10 s): una situazione di campo o palestra con un problema o una domanda di Luca.
   Es. "Perché dopo lo sprint le gambe non spingono più?"
2. IPOTESI DI LUCA (10–25 s): Luca prova a rispondere. Spesso sbaglia in modo plausibile.
3. DENTRO IL CORPO (25–80 s): transizione firma e scena scientifica, Marco guida, Luca reagisce.
   Un concetto per azione, massimo tre termini nuovi.
4. AHA (80–95 s): Luca collega la scienza al campo con parole sue. Reazione espressiva.
5. RICHIAMO (95–110 s): Marco fa una domanda allo studente, pausa visibile con conto alla rovescia di 3 secondi
   prima della risposta. Nell'app la domanda diventa una carta o un quiz.
6. CHIUSURA (110–120 s): gag di rinforzo (mai durante una definizione) e gancio alla prossima azione.
L'ultima azione di un episodio chiude il problema di Luca e mostra il pezzo aggiunto al suo piano.

4.5 Principi didattici della serie (ognuno deve essere visibile nello storyboard)
- Dialogo e tono personale (Marco e Luca parlano allo studente come amici) [Certo: principio di personalizzazione].
- Segmentazione in azioni brevi controllate dallo studente [Certo: principio di segmentazione].
- Doppia codifica: parola detta + immagine, mai lo stesso testo letto e scritto per intero [Certo: principi di
  modalità e ridondanza]. A schermo solo parole chiave.
- Segnalazione: evidenzia ciò che Marco nomina nel momento in cui lo nomina [Certo: principio di segnalazione].
- Coerenza: niente decorazioni che non servono al concetto [Certo: principio di coerenza].
- Errore e correzione: l'ipotesi sbagliata di Luca seguita dalla spiegazione corretta [Probabile: efficace contro le
  misconcezioni, da verificare con le fonti in Fase 2].
- Richiamo attivo e ripasso distanziato: domanda a fine azione, ripresa nelle puntate successive e nelle carte SM-2
  dell'app [Certo: retrieval practice e spacing].
- Analogie di campo e palestra sempre corrette: se un'analogia semplifica troppo, Marco lo dice ("qui l'esempio
  regge fino a un certo punto").
Le etichette [Certo]/[Probabile] vanno confermate con le fonti nella Fase 2.

4.6 Continuità tra le puntate
- "Bibbia della stagione" (docs/animation-studio/03-SERIES-BIBLE.md) con: archi dei personaggi, elenco episodi,
  cosa Luca sa già a ogni episodio, gag ricorrenti, oggetti ricorrenti, regole che non cambiano mai.
- Il piano di allenamento di Luca è un oggetto visibile (un foglio o una scheda sulla lavagna) che si riempie
  episodio dopo episodio: lo studente vede la stagione avanzare.
- Ogni episodio inizia con "Nella puntata precedente" di 5 secondi (si salta toccando) e finisce con un'anteprima.
- Un registro di continuità (JSON) tiene: cosa è stato spiegato, quali termini sono noti, quali gag sono già usate.

4.7 Gioco e app
- Ogni azione completata dà i punti già previsti dall'app (finishStep). Fine episodio = premio con la celebrazione.
- Le domande del richiamo entrano nelle carte e nel quiz dell'app con la stessa formulazione.
- Le scadenze dell'app (Situazione, piano per parti) restano la guida: il video non aggiunge debito.

4.8 Umorismo e gag ricorrenti
- Massimo una gag ogni 60–90 secondi, sempre dopo il concetto, mai su una definizione.
- 3–5 gag ricorrenti definite nella bibbia (es. il fischietto di Marco che "ferma l'azione" per mettere in pausa il
  processo e ingrandirlo; Luca che esulta come dopo un gol quando capisce). Prodotte una volta, riusate (Livello 4
  possibile qui).
- Mai battute che rendano impreciso il concetto, prendano in giro lo studente o usino stereotipi.

4.8b Tono: ironia da film di supereroi (sfumatura chiave)
È il tono dei grandi film d'azione con supereroi: momenti epici smontati da una battuta secca, battibecchi tra
personaggi che si vogliono bene, autoironia. Si prende il TONO, mai personaggi, battute, nomi, musiche, loghi o
inquadrature riconoscibili di film esistenti: tutto è originale.
Tecniche ammesse (ognuna segnata nello storyboard con il concetto che rinforza):
- Epico poi sgonfiato: ralenti, musica che sale, luce da eroe… su uno squat o su uno ione di calcio; poi una
  battuta asciutta di Marco riporta tutto a terra ("Bello. Ora rifallo con la schiena dritta.").
- Il processo come squadra di eroi: nella scena "dentro il corpo" le strutture hanno un ruolo da squadra
  (la miosina "il centravanti che tira", il calcio "quello che apre la difesa"), ma solo se l'analogia è corretta e
  Marco dichiara dove smette di reggere.
- Battibecco: Luca spaccone e sicuro di sé, Marco impassibile e ironico; la battuta di Marco arriva sempre dopo
  una pausa di un battito (timing comico).
- Autoironia e quarta parete leggera: Marco a volte guarda in camera, verso lo studente, con un sopracciglio alzato
  ("Lo so, sembra semplice. Non lo è.").
- Richiamo a distanza (callback): una battuta di un episodio torna episodi dopo in un altro contesto e premia chi
  ha seguito la stagione. Registrata nel registro di continuità.
- Regola del tre: due esempi seri e il terzo assurdo ma corretto.
- Scena dopo i titoli: 5–10 secondi dopo la chiusura con una gag o un mistero che apre l'episodio successivo
  ("Perché domani le gambe faranno male? Prossima puntata."). Saltabile.
Limiti:
- L'ironia non tocca mai la definizione o il passaggio chiave mentre viene spiegato: arriva subito dopo.
- Ironia sui personaggi e sulle situazioni, mai sullo studente né sui suoi errori.
- Nessun sarcasmo che faccia credere falso un concetto vero (o il contrario).
- Massimo una battuta "secca" ogni 30–40 secondi nel dialogo, più la gag principale ogni 60–90 secondi.
- I tag di voce seguono il tono: per Marco [deadpan], [dry], [sighs]; per Luca [cocky], [excited], [laughs].
  Prima di usarli in produzione, campione gratis da approvare (alcuni tag possono suonare finti in italiano).

4.9 Suono
- Voci fisse (sezione 2), tag di enfasi coerenti con il carattere.
- Sigla breve (3–5 s) e stacchetto della transizione "dentro il corpo" riconoscibili; musica da libreria con licenza
  commerciale verificata, sotto la voce (ducking).
- Effetti sonori leggeri e motivati (fischio, pallone, ingranaggio del processo che parte).
- Loudness: −16/−14 LUFS integrati, true peak ≤ −1 dBTP.

======================================================================
5. REGOLE VINCOLANTI (valgono in ogni fase)
======================================================================

1. Lavora sul ramo feature/animation-studio. Niente merge, push su main o deploy senza mia approvazione esplicita.
2. Non eliminare né alterare funzioni esistenti. Il nuovo sistema vive dietro un feature flag; il cartone SVG e
   l'audio attuali restano funzionanti finché non approvo la sostituzione.
3. Nessuna chiave API nel codice, nei log, nei commit o nei documenti. Variabili d'ambiente e .env.example con soli nomi.
4. Non installare software, non creare account e non fare chiamate che costano senza mia autorizzazione. Prima di
   ogni operazione con costo, indica il costo stimato (crediti ElevenLabs inclusi) e fammi sentire o vedere un campione.
5. Non inventare dati scientifici, misure, valori o fonti (sezione 7.4).
6. Fermati a ogni GATE e attendi la mia approvazione.
7. Etichetta le affermazioni rilevanti con [Certo], [Probabile] o [Ipotesi].
8. Per ogni libreria, servizio, asset o musica verifica licenza d'uso, prezzo e limiti attuali; se non riesci, scrivilo.
9. CHANGELOG del ramo e commit piccoli e reversibili.
10. Se l'ambiente non permette un'operazione (GPU, Blender, rete), dichiaralo e proponi dove eseguirla.
11. Le scadenze d'esame vengono prima della serie: se la produzione rischia di togliere tempo allo studio, dimmelo
    e proponi un piano ridotto.
12. Scrivi a me in italiano molto semplice; alla fine di ogni risposta metti in grassetto solo quello che devo fare io.

======================================================================
6. FASI DI LAVORO E GATE
======================================================================

FASE 0 — Ricognizione
docs/animation-studio/00-AUDIT.md: struttura del repository, flusso attuale PDF → lezione → dialogo → audio →
cartone, servizi e costi noti (senza chiavi), capacità dell'ambiente (CPU/GPU, Chromium, ffmpeg, Blender sì/no),
limiti delle funzioni Vercel, test esistenti. Includi il prototipo di 30 s come stato di partenza.

FASE 1 — Diagnosi
docs/animation-studio/01-DIAGNOSI.md: fotogrammi del cartone SVG e del prototipo 3D; per ogni difetto
(personaggi, movimento, espressioni, lip-sync, regia, didattica, continuità tra puntate) la causa alla radice;
interventi locali contro cambi di architettura.

>>> GATE A: sintesi in massimo 15 righe con link ai documenti.

FASE 2 — Architettura e piano di stagione
docs/animation-studio/02-ARCHITETTURA.md:
a) Confronto delle categorie (3D riggato, AI video, motion graphics, 2D riggato, ibrido) e delle opzioni
   (Blender headless, Three.js/R3F, Rive, Remotion, TTS con timestamp e lip-sync, librerie di animazioni con
   licenza commerciale, asset CC0) con matrice pesata: qualità del movimento 25%, costanza dei personaggi 20%,
   accuratezza scientifica 20%, costo 15%, fattibilità nell'ambiente 10%, tempo di generazione 10%.
b) UNA architettura per l'MVP e una per il sistema completo, con livello raggiungibile, componenti, dove avviene il
   rendering, rischi.
c) Costi in tabella (una tantum, per minuto, mensili) con le ipotesi; restare nei vincoli della sezione 2.
d) Piano di stagione: quali episodi ricevono un video (con motivo), in che ordine, quanti prima di ogni esame;
   stima realistica del tempo di produzione per azione.
e) Fonti per i principi didattici della 4.5.

>>> GATE B: raccomandazione, costi, piano di stagione e cosa NON si potrà ottenere. Nessun codice di produzione prima.

FASE 3 — Bibbia della serie e dei personaggi
- docs/animation-studio/03-SERIES-BIBLE.md: premessa, archi, mondo, struttura dell'azione, gag ricorrenti, regole
  di continuità, elenco episodi con il problema di Luca e il pezzo del piano che si aggiunge.
- docs/animation-studio/03-CHARACTER-BIBLE.md per Marco e Luca secondo la 7.1, con strategia dell'asset
  (procedurale, base CC0 personalizzata, generato e poi riggato, o commissionato) con pro, contro e costi.

>>> GATE C: presentami personaggi (turnaround o bozzetti, palette), mondo e tre episodi scritti in sintesi.
    I personaggi si congelano solo dopo il mio sì.

FASE 4 — Motore della serie
docs/animation-studio/04-PIPELINE.md e codice: PDF della lezione → mappa dei concetti → misconcezioni →
scaletta dell'episodio (azioni con la struttura 4.4) → dialogo Marco/Luca (riusa e migliora il formato di
src/data/dialogues) → storyboard → scene. Usa il registro di continuità (4.6) come input di ogni episodio.

FASE 5 — Episodio pilota
Un'azione completa da circa 2 minuti dell'episodio 5.1, più sigla e transizione firma:
- Marco e Luca in almeno 3 inquadrature (totale, mezzo busto, primo piano reazione) con lip-sync.
- Ipotesi sbagliata di Luca e correzione; almeno 1 gesto illustrativo sincronizzato; almeno 1 reazione "aha".
- Scena procedurale del sarcomero e del ciclo dei ponti trasversali (sezione 8), con il fischietto che "ferma
  l'azione" per mostrare un passaggio al rallentatore.
- Richiamo con pausa visibile, gag finale di rinforzo, gancio all'azione successiva.
- 9:16, 30 fps, testo leggibile su iPhone; ogni affermazione collegata alla slide del PDF.
- Una singola scena si rigenera senza rifare le altre.
- Confronto affiancato con il cartone SVG attuale sullo stesso contenuto.

FASE 6 — Quality Assurance
docs/animation-studio/06-QA-REPORT.md con i controlli della 7.6 e i controlli di serie: personaggi identici
(stesso hash dell'asset), struttura 4.4 rispettata, richiamo presente, nessuna gag su una definizione.

>>> GATE D: video pilota, QA report e confronto.

FASE 7 — Produzione e roadmap
docs/animation-studio/07-ROADMAP.md: cosa si tiene, cosa si sostituisce, architettura definitiva, costi, calendario
di produzione legato alle scadenze d'esame, metriche (azioni completate, risposte giuste al richiamo, abbandoni a
metà azione) e come la stessa macchina diventa una serie diversa per un altro studente.

======================================================================
7. SPECIFICHE DETTAGLIATE
======================================================================

7.1 Bibbia dei personaggi (per Marco e per Luca)
1. Identità: età apparente, storia breve, tratti, cosa li rende memorabili, cosa non farebbero mai.
2. Turnaround: fronte, 3/4, profilo, retro; altezza in teste; Luca più giovane e snello, Marco più massiccio:
   silhouette distinguibili anche in nero pieno.
3. Modello: budget poligonale, topologia del volto per la deformazione.
4. Materiali: pelle stilizzata, occhi (iride, riflesso), tessuti; parametri registrati.
5. Palette HEX con ruolo; Marco arancione #C4471D, Luca verde #2F7A4C (già nell'app), contrasto verificato.
6. Abbigliamento: base più massimo 2 varianti (es. Luca in tenuta da gara nell'episodio finale).
7. Rig: corpo, IK di braccia e gambe, dita controllabili, facial rig con blendshape compatibili con visemi ed
   espressioni; elenco dei controlli esposti alla pipeline.
8. Espressioni: neutro, sorriso, sorriso ironico asimmetrico, sorpresa, curiosità, concentrazione, perplessità,
   entusiasmo, "aha!", empatia; per Luca anche frustrazione ed esultanza da gol.
9. Visemi con regole di coarticolazione (italiano).
10. Pose e gesti: spiegare, indicare, contare, confrontare, grandezze e direzioni, ascoltare, pensare; gesti da
    campo (fischio, indicazione tattica, esultanza) con varianti.
11. Continuità: cosa non cambia mai, cosa può variare, versione dell'asset.
12. Voce: parametri fissi, pronuncia dei termini tecnici (es. "sarcomero", "miosina", "Ca²⁺" detto "calcio").
13. Umorismo: tipo di battute, tic ricorrenti.
Regola di persistenza: personaggi e luoghi sono asset versionati caricati da tutte le scene; nessuna scena li genera
o li modifica al volo; ogni modifica è una nuova versione da approvare.

7.2 Qualità dell'animazione
Come nella v2: anticipation, squash & stretch controllato, slow in/slow out, arcs, follow through e overlapping
(tuta, maglia, cappellino), animazione secondaria (respiro, peso, dita), timing, pose-to-pose sulle parole chiave,
spostamento del peso, lip-sync con anticipo, occhi (saccadi, fissazioni motivate, battito 2–6 s da 100–150 ms),
mani coerenti con il significato. Con due personaggi in scena: chi ascolta reagisce (annuisce, sguardo su chi parla
o sull'oggetto), mai statuina.
Difetti da escludere con controlli attivi: piedi che scivolano, braccia nel corpo, oggetti che cambiano forma,
lip-sync fuori tempo, volti fermi oltre 3 s, movimenti lineari o ripetuti, scatti tra pose, cambi di identità.
Non accettabili: transizioni CSS, immagini con zoom, ritagli statici, video AI rigenerati per i personaggi.

7.3 Regia
Grammatica delle inquadrature (totale, mezzo busto, primo piano, inserto scientifico, split personaggio + oggetto,
campo/controcampo nel dialogo con la regola dei 180°). Ogni movimento di camera ha un motivo didattico.
Luce morbida a tre punti, palette coerente per tutta la stagione; ogni luogo ha la sua luce fissa.
Transizione firma "dentro il corpo" sempre uguale. Aree sicure 9:16, testo mai sui bordi né sotto i sottotitoli.
In caso di conflitto tra spettacolo e chiarezza, vince la chiarezza.

7.4 Accuratezza scientifica
- Ogni affermazione collegata alla slide o pagina del PDF Setanta da cui viene; il resto è "integrazione esterna"
  con fonte, mostrata in modo distinguibile.
- Niente dati, misure o relazioni inventati. Le semplificazioni visive si dichiarano a schermo ("schema
  semplificato, non in scala").
- Si usano i termini del PDF: se il PDF non nomina una struttura, la scena non la nomina o la marca come esterna.
- Le analogie di calcio non devono mai contraddire la fisiologia.
- In caso di dubbio la scena va in revisione umana invece di essere generata.

7.5 Uso dell'AI generativa
- LLM: analisi del PDF, scaletta, dialoghi, storyboard, controlli di coerenza; output validato da schema.
- AI video: solo eventualmente per sfondi decorativi non scientifici, con il mio sì. Vietata per personaggi e scienza.
- AI immagini: solo per bozzetti di design, non come asset finale non controllato.
- TTS: le due voci fisse con timestamp per il lip-sync.

7.6 Schemi dati e QA
Schema di una scena come nella v2, con in più:
"episode": "5.1", "action": 1, "beat": "gancio|ipotesi|dentro|aha|richiamo|chiusura",
"speakers": ["M","L"], "continuity": { "recalls": ["4.4"], "introduces": ["sarcomero"], "gag_id": null }.
Ogni fase produce un artefatto versionato; si rigenera solo ciò che cambia (cache per hash degli input);
anteprima veloce prima del rendering finale.
Soglie QA: lip-sync entro circa 1 fotogramma (limiti ITU-R BT.1359: audio in anticipo ≤ 45 ms, in ritardo
≤ 125 ms); 30 fps costanti (ffprobe); loudness come 4.9; piedi in appoggio < 1 cm; zero compenetrazioni; testo
leggibile a 390 px con contrasto ≥ 4.5:1; 100% delle affermazioni con fonte; stesso hash degli asset in tutte le scene.

======================================================================
8. ESEMPIO DI RIFERIMENTO: CONTRAZIONE MUSCOLARE (episodio pilota)
======================================================================

Vincoli della scena del sarcomero (da verificare sul PDF della lezione 5.1):
- Filamenti sottili di actina ancorati alle estremità del sarcomero, filamenti spessi di miosina al centro.
- Il calcio scopre i siti di legame sull'actina; la miosina si aggancia, tira verso il centro e si stacca, più volte.
- I filamenti non si accorciano: scorrono; le estremità si avvicinano.
- Le teste di miosina lavorano in modo asincrono.
- Troponina, tropomiosina, ATP/ADP, bande e linee Z compaiono solo se presenti nel PDF; altrimenti sono
  "integrazione esterna" marcata o restano fuori.
- Nessun valore numerico se non è nel PDF.

Esempio di azione:
GANCIO: Luca tira in porta e chiede "ma cosa succede dentro la gamba quando calcio?". IPOTESI: "il muscolo si
accorcia come un elastico". DENTRO IL CORPO: Marco fischia, tutto si ferma, si entra nella fibra; i filamenti
scorrono e Marco unisce lentamente le mani mentre le estremità si avvicinano. AHA: Luca, sorpreso, "quindi non si
accorciano, scivolano uno sull'altro!". RICHIAMO: "Cosa scopre il calcio sull'actina? 3, 2, 1…". CHIUSURA: tiro
alla fune molecolare come gag, poi "e se tiri cento volte di fila? Lo vediamo nella prossima azione".

======================================================================
9. FORMATO DELLE RISPOSTE
======================================================================

- A ogni gate: massimo 15 righe, decisioni da prendere in elenco numerato, link ai documenti.
- Ogni documento inizia con "Decisioni prese" e "Questioni aperte".
- Tabelle per confronti e costi. Segnala cosa non hai potuto verificare.
- Italiano semplice; termini tecnici in inglese dove sono lo standard.

======================================================================
10. DEFINIZIONE DI COMPLETATO (pilota)
======================================================================

1. L'azione pilota di circa 2 minuti, con sigla e transizione firma, è generata dalla pipeline (non montata a mano),
   in 9:16 a 30 fps.
2. Il QA report mostra le soglie superate o i difetti residui con un piano di correzione.
3. Una scena si modifica e si rigenera senza rifare le altre.
4. Personaggi, luoghi, voci e stile sono caricati da asset versionati (Style Pack).
5. La bibbia della serie e il registro di continuità esistono e il pilota li rispetta.
6. Il vecchio cartone funziona ancora; il nuovo si accende e si spegne con un feature flag.
7. Nessuna chiave esposta; ramo separato; ogni passo reversibile.
8. Confronto affiancato con il cartone attuale disponibile.

======================================================================
RISULTATO ATTESO
======================================================================

Una serie animata originale, "Campo e Scienza", in cui ogni puntata ha un senso dentro la stagione: Marco guida,
Luca sbaglia, capisce ed esulta, e lo studente impara con loro, puntata dopo puntata, fino all'esame. Personaggi
riconoscibili, mondo coerente, ritmo da cartone, scienza verificata con la sua fonte: deve sembrare fatta da uno
studio professionale.
