# 02 · Architettura e piano di stagione

## Decisioni prese
- Prova tecnica fatta (studio/spike): un modello creato da Blender con scheletro e shape key ("bocca aperta")
  viene esportato in glTF e caricato e deformato in Three.js nel browser senza schermo. **La catena funziona.**
- Riferimento di mestiere per il movimento: i 12 principi dell'animazione degli animatori Disney
  (Thomas e Johnston, *The Illusion of Life*, 1981) [Certo]. Si prende il **mestiere**, non l'aspetto: personaggi,
  mondo e stile restano originali.

## Questioni aperte (da decidere al Gate B)
1. Approvare l'architettura ibrida qui sotto.
2. Approvare il piano di stagione (quali lezioni hanno un video).

## a) Le strade possibili
| Strada | Cosa garantisce | Cosa non garantisce |
|---|---|---|
| 3D riggato controllabile | personaggi sempre uguali, gesti e bocca a comando, scienza precisa | richiede costruire gli asset bene |
| AI video | immagini belle e veloci | personaggi che cambiano, scienza inventata → **vietata** dal prompt |
| Motion graphics | grafici e lavagna chiarissimi | nessun personaggio |
| 2D riggato (Rive) | leggero, nel telefono | meno profondità; lo strumento di editing è online e non raggiungibile qui |
| Ibrido | il meglio di ogni parte | più pezzi da tenere insieme |

## b) Matrice (1–5, pesata)
| Opzione | Movimento 25% | Identità 20% | Scienza 20% | Costo 15% | Fattibile qui 10% | Tempo 10% | **Totale** |
|---|---|---|---|---|---|---|---|
| Solo Three.js con primitive (oggi) | 2 | 5 | 5 | 5 | 5 | 5 | **4,10** |
| Solo Blender + Cycles | 4 | 5 | 5 | 5 | 3 | 1 | **4,10** |
| **Ibrido: asset Blender + render Three.js (+ Cycles per i pezzi fissi)** | 4 | 5 | 5 | 5 | 5 | 4 | **4,65** |
| Remotion come montatore | = | = | = | 4 | 4 | 4 | non serve per il pilota |
| AI video per i personaggi | 3 | 1 | 1 | 2 | 1 | 4 | **1,85** (vietata) |

[Probabile] Remotion è gratis per i singoli; non porta qualità in più rispetto al nostro montatore a fotogrammi,
quindi non lo aggiungo ora.

## c) Architettura raccomandata (MVP) — Livello 3
```
PDF lezione ─► scaletta episodio (LLM + schema) ─► dialogo Marco/Luca (struttura 4.4 + tono 4.8b)
     │                                                    │
     ▼                                                    ▼
storyboard JSON (scene, inquadrature, gesti, fonti) ◄── voci ElevenLabs con timestamp per carattere
     │
     ▼
"Bottega" Blender (bpy, senza schermo)          Render Three.js (browser senza schermo, deterministico)
- marco_v1.glb, luca_v1.glb:                    - carica gli asset versionati
  modello scolpito con subdivision,             - shading cartoon morbido + contorno + luce a 3 punti
  scheletro con dita, shape key                 - lip-sync: visemi → shape key, con anticipo e coarticolazione
  (visemi + espressioni)                        - gesti: clip della libreria + molle per overlapping
- palestra / campo / sala tattica .glb          - occhi: saccadi, battito, sguardo motivato
- libreria pose e gesti (azioni)                - scene scientifiche procedurali (sarcomero…)
     │                                                    │
     └──► pezzi fissi (sigla, transizione firma,          ▼
          gag ricorrenti) in Cycles, una volta    fotogrammi → ffmpeg (voce, musica, effetti) → MP4 9:16
```
Perché così: Blender dà personaggi veri (forme, scheletro, faccia che si deforma); Three.js li anima e li disegna
in minuti invece che in ore; i pezzi che si vedono in ogni puntata si fanno una volta al massimo della qualità.

Rischi e rimedi
| Rischio | Rimedio |
|---|---|
| Personaggi costruiti a codice senza scultore | forme guidate da bozzetti approvati al Gate C; se non bastano, opzione B/C del documento costi |
| Movimento "da robot" | 12 principi applicati con controlli automatici (6.7) e revisione del movimento con l'agente `impeccable-motion-reviewer` |
| Render Cycles lento qui | solo per i pezzi fissi, la notte |
| Tempo tolto allo studio | prima gli esami: piano ridotto sotto |

## d) Costi
| Voce | Costo | Ipotesi |
|---|---|---|
| Sviluppo, asset, render | **0 €** | Blender, Three.js, ffmpeg gratis; lavoro mio |
| Voce per azione di 2 min | ~800 crediti ElevenLabs | ~1.800 caratteri × 0,455; dentro l'abbonamento già pagato |
| Musica ed effetti | 0 € | da sintetizzare o da librerie libere raggiungibili; licenza verificata prima |
| Costi mensili nuovi | 0 € | |

## e) Piano di stagione
Il video si fa dove un processo si capisce meglio guardandolo. Priorità ★★★ = sicuramente video.
| Episodio | Cosa si vede | Priorità |
|---|---|---|
| 4.5 Anti-rotazione | forze che fanno ruotare il tronco e il core che resiste (lavagna + Luca) | ★★ |
| 5.1 Aspetti neuromuscolari | sarcomero, filamenti che scorrono, unità motorie | ★★★ **pilota** |
| 5.2 Tipi di ipertrofia e ormoni | cosa cresce dentro la fibra | ★★★ |
| 5.3 Meccanismi dell'ipertrofia | tensione meccanica, stress metabolico, danno | ★★★ |
| 6.1–6.3 Variabili | volume, intensità, frequenza sulla lavagna tattica | ★★ |
| 7.1–7.3 Strappo | fasi del movimento con Luca che le esegue | ★★ (animazione difficile: dopo il pilota) |
| 8–12 | da decidere quando escono i PDF | — |

Calendario [Ipotesi, dipende dal Gate C]:
- entro fine novembre: bibbia e personaggi approvati, pilota (5.1, azione 1);
- entro il 14/12: 5.1, 5.2, 5.3 (un'azione ciascuna, quella del concetto più difficile);
- entro il 07/01: 4.5 e 6.x, più gli episodi 8–12 solo se non tolgono tempo allo studio.

## Skill usate nelle prossime fasi
- `storytelling-and-narrative` e `scripting-and-storyboarding`: bibbia della serie, archi, scalette, storyboard.
- `ai-voiceover`: regia delle voci (enfasi, tono secco di Marco, Luca spaccone).
- Agente `impeccable-motion-reviewer`: revisione del movimento su fotogrammi catturati.
Le skill di AI video (Runway, Veo, Kling…) **non** si usano per personaggi e scienza, come chiede il prompt.

## Cosa NON si potrà ottenere
- Livello 4 (lungometraggio) per le puntate automatiche: solo per sigla, transizione e gag fisse.
- Personaggi scolpiti a mano da un artista: con la strada gratuita le forme sono fatte a codice, curate ma più semplici.
