/** Puntate del cartone "Campo e Scienza" già pronte, per lezione. I file stanno in public/video/. */
export type Episode = { code: string; title: string; subtitle: string; src: string; poster: string; minutes: number };

export const EPISODES: Episode[] = [
  {
    code: "5.1",
    title: "Nervi saldi",
    subtitle: "Luca alza 15 kg in più, ma il metro non mente. Cos'è l'ipertrofia?",
    src: "/video/5.1-nervi-saldi.mp4",
    poster: "/video/5.1-nervi-saldi.jpg",
    minutes: 1,
  },
];

export function episodesFor(code: string | null): Episode[] {
  return code ? EPISODES.filter((e) => e.code === code) : EPISODES;
}
