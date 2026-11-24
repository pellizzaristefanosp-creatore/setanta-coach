/** Legge il testo di un PDF nel telefono (il file non va a nessun server): una stringa per pagina. */
export async function pdfPages(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
      .join("")
      .replace(/[ \t]+/g, " ")
      .trim();
    pages.push(text);
  }
  return pages;
}

/** Codice e titolo dal nome del file o dalla prima pagina, es. "7.2 - Lo Strappo". */
export function guessCode(fileName: string, firstPage: string): { code: string; title: string } | null {
  for (const src of [firstPage, fileName]) {
    const m = src.match(/(\d{1,2})\.(\d{1,2})\s*[-–]\s*([^\n.]+?)(?:\.pdf)?\s*(?:\n|$)/i);
    if (m) return { code: `${Number(m[1])}.${Number(m[2])}`, title: m[3]!.trim() };
  }
  return null;
}

/** Testo da mandare al server: pagine numerate, come nel PDF. */
export function pagesToText(pages: string[]): string {
  return pages.map((t, i) => `--- Pagina ${i + 1} ---\n${t}`).join("\n\n");
}
