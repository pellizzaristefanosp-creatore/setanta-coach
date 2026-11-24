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
  /** trascrizione con i tempi delle parole (di solito lo stesso nome del video in .json) */
  transcript?: string;
};

export const LESSON_VIDEOS: LessonVideo[] = [];

/** la puntata della lezione (con `part`, solo se è legata a quella parte) */
export function lessonVideo(code: string, part?: number): LessonVideo | undefined {
  return LESSON_VIDEOS.find((v) => v.code === code && (part === undefined || v.part === part));
}
