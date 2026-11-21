/**
 * Video animati delle lezioni (Prof e Ste), uno per lezione, legato alla parte che rappresenta.
 * Partono da soli all'inizio di quella parte, con i rumori di sottofondo bassi; poi resta il cartone con le voci.
 * File in public/video/. Ste: maglia verde, numero 5 e PELLIZZARI dietro.
 */
export type LessonVideo = {
  code: string;
  part: number;
  src: string;
  poster: string;
  caption: string;
  /** il video ha già le voci del Prof e di Ste: il dialogo della parte parte dopo, per non sovrapporsi */
  voices?: boolean;
};

export const LESSON_VIDEOS: LessonVideo[] = [
  {
    code: "4.1",
    part: 2,
    src: "/video/4.1-puntata.mp4",
    poster: "/video/4.1-puntata.jpg",
    caption: "Il core è un cilindro: Più che addominali",
    voices: true,
  },
  {
    code: "4.2",
    part: 3,
    src: "/video/4.2-puntata.mp4",
    poster: "/video/4.2-puntata.jpg",
    caption: "RDL: il tronco lavora: Anche indietro, colonna neutra",
    voices: true,
  },
  {
    code: "4.3",
    part: 2,
    src: "/video/4.3-puntata.mp4",
    poster: "/video/4.3-puntata.jpg",
    caption: "Plank: non fare l’arco: Addominali attivi, niente arco",
    voices: true,
  },
  {
    code: "4.4",
    part: 3,
    src: "/video/4.4-puntata.mp4",
    poster: "/video/4.4-puntata.jpg",
    caption: "Un peso, busto dritto: Il peso tira, tu resisti",
    voices: true,
  },
  {
    code: "4.5",
    part: 5,
    src: "/video/4.5-puntata.mp4",
    poster: "/video/4.5-puntata.jpg",
    caption: "Pallof press in piedi: Mani avanti, busto fermo",
    voices: true,
  },
  {
    code: "5.2",
    part: 1,
    src: "/video/5.2-puntata.mp4",
    poster: "/video/5.2-puntata.jpg",
    caption: "In parallelo o in fila?: Parallelo: larghezza. Serie: lunghezza.",
    voices: true,
  },
  {
    code: "5.3",
    part: 0,
    src: "/video/5.3-puntata.mp4",
    poster: "/video/5.3-puntata.jpg",
    caption: "Tre meccanismi, un muscolo: Tre meccanismi, tensione favorita",
    voices: true,
  },
  {
    code: "6.1",
    part: 7,
    src: "/video/6.1-puntata.mp4",
    poster: "/video/6.1-puntata.jpg",
    caption: "Il peso non dice tutto: Peso e sforzo, due cose",
    voices: true,
  },
  {
    code: "6.2",
    part: 8,
    src: "/video/6.2-puntata.mp4",
    poster: "/video/6.2-puntata.jpg",
    caption: "Il tempo di una ripetizione: Discesa, pausa, salita",
    voices: true,
  },
  {
    code: "6.3",
    part: 5,
    src: "/video/6.3-puntata.mp4",
    poster: "/video/6.3-puntata.jpg",
    caption: "Il drop set classico: Meno peso, continui la serie",
    voices: true,
  },
  {
    code: "7.1",
    part: 9,
    src: "/video/7.1-puntata.mp4",
    poster: "/video/7.1-puntata.jpg",
    caption: "La tripla estensione: Tre articolazioni, una spinta",
    voices: true,
  },
  {
    code: "7.2",
    part: 18,
    src: "/video/7.2-puntata.mp4",
    poster: "/video/7.2-puntata.jpg",
    caption: "Lo strappo in un gesto: Tutte le fasi, un gesto",
    voices: true,
  },
  {
    code: "7.3",
    part: 4,
    src: "/video/7.3-puntata.mp4",
    poster: "/video/7.3-puntata.jpg",
    caption: "La tirata da strappo: Potenza senza incastro",
    voices: true,
  },
  {
    code: "5.1",
    part: 3,
    src: "/video/5.1-actina-miosina.mp4",
    poster: "/video/5.1-actina-miosina.jpg",
    caption: "Actina e miosina, passo per passo: il calcio scopre i siti, la miosina aggancia, tira e lascia.",
    voices: true,
  },
];

/** la puntata della lezione (con `part`, solo se è legata a quella parte) */
export function lessonVideo(code: string, part?: number): LessonVideo | undefined {
  return LESSON_VIDEOS.find((v) => v.code === code && (part === undefined || v.part === part));
}
