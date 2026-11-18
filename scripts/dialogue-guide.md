# Come scrivere i dialoghi delle lezioni (Marco e Luca)

Ogni parte della lezione diventa una breve chiacchierata tra due amici, da ascoltare in 60–90 secondi.

- **Marco** (M): preparatore atletico esperto, caldo, sicuro, ironico quanto basta. Spiega con parole semplici.
- **Luca** (L): calciatore che studia il corso. Curioso, a volte sbaglia o fa l'obiezione tipica ("Ma non basta…?").

Perché così (ricerca sull'apprendimento):
- stile da conversazione, al "tu", parole di tutti i giorni (principio di personalizzazione);
- chi ascolta un dialogo con domande profonde ("perché?", "come faccio a capire se…?") impara più che da un monologo;
- Marco ogni tanto chiede prima a Luca "secondo te…?" e lascia un attimo: chi ascolta prova a rispondere nella testa (richiamo attivo);
- un esempio concreto dal calcio o dalla palestra per ogni idea, spesso tirato fuori da Luca;
- alla fine una frase che riassume il punto chiave (Luca o Marco).

Regole:
- Usa SOLO i fatti della narrazione e dei punti chiave della parte: tutti i numeri, nomi, definizioni e raccomandazioni d'esame devono esserci, nessun fatto nuovo.
- 900–1300 caratteri per parte in totale (tag esclusi), 8–14 battute, battute corte (max 2 frasi).
- Indicazioni di recitazione in inglese tra parentesi quadre all'inizio della battuta, quando servono: [excited], [curious], [thoughtful], [laughs], [warmly], [serious], [emphatic], [confident], [cheerfully], [surprised], [pause]. Massimo una o due per battuta, non in ogni battuta.
- Puntini "..." per le pause, una parola in MAIUSCOLO al massimo per battuta per l'enfasi.
- Niente saluti ripetuti in ogni parte: solo la prima parte della lezione può aprire ("Allora Luca, oggi…"), l'ultima può chiudere.
- I termini inglesi del corso (plank, hip hinge, snatch…) restano come sono.
- Numeri scritti come si dicono quando aiuta la voce ("sessanta-novanta secondi", "uno virgola cinque").

Formato del file `src/data/dialogues/<codice>.json`:
{"code":"4.5","parts":[{"part":0,"lines":[{"who":"M","text":"[excited] Allora..."},{"who":"L","text":"..."}]}, ...]}
Una voce per ogni parte della lezione, nello stesso ordine (part = indice da 0).
