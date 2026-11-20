/**
 * Video animati delle lezioni (Prof e Ste), uno per lezione, legato alla parte che rappresenta.
 * Partono da soli all'inizio di quella parte, con i rumori di sottofondo bassi; poi resta il cartone con le voci.
 * File in public/video/. Ste: maglia verde, numero 5 e PELLIZZARI dietro.
 */
export type LessonVideo = { code: string; part: number; src: string; poster: string; caption: string };

export const LESSON_VIDEOS: LessonVideo[] = [
  { code: "5.1", part: 3, src: "/video/5.1-fune.mp4", poster: "/video/5.1-fune.jpg", caption: "Come nel tiro alla fune a mani alternate: afferri, tiri, lasci e riafferri." },
];

export function lessonVideo(code: string, part: number): LessonVideo | undefined {
  return LESSON_VIDEOS.find((v) => v.code === code && v.part === part);
}
