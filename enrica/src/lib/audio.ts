/** Audio delle lezioni (dialoghi Marco e Luca), creati da scripts/gen-audio.ts. */
export type AudioLine = { who: "M" | "L"; start: number; text: string };
export type AudioPart = { src: string; duration: number; lines: AudioLine[] };

const manifests = Object.values(
  import.meta.glob<{ default: { code: string; parts: Record<string, AudioPart> } }>("../data/audio/*.json", { eager: true }),
).map((m) => m.default);

const byCode = new Map(manifests.map((m) => [m.code, m.parts]));

export function audioFor(code: string, partIndex: number): AudioPart | undefined {
  return byCode.get(code)?.[String(partIndex)];
}

export function hasAudio(code: string): boolean {
  return (Object.keys(byCode.get(code) ?? {}).length ?? 0) > 0;
}

/** Indice della battuta che si sente al tempo t. */
export function lineAt(lines: AudioLine[], t: number): number {
  let i = 0;
  while (i + 1 < lines.length && lines[i + 1]!.start <= t) i++;
  return i;
}
