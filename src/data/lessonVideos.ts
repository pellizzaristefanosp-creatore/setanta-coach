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
    code: "5.1",
    part: 3,
    src: "/video/5.1-actina-miosina.mp4",
    poster: "/video/5.1-actina-miosina.jpg",
    caption: "Actina e miosina, passo per passo: il calcio scopre i siti, la miosina aggancia, tira e lascia.",
    voices: true,
  },
];

export function lessonVideo(code: string, part: number): LessonVideo | undefined {
  return LESSON_VIDEOS.find((v) => v.code === code && v.part === part);
}
