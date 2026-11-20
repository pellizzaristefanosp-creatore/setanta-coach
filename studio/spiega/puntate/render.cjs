// Fotogrammi di una puntata: node puntate/render.cjs <codice> <cartella>
const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const [code, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 720, height: 1280 } });
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(`http://127.0.0.1:8765/studio/spiega/puntata.html?code=${code}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 30000 }).catch(() => {});
  if (errors.length) { console.log("ERRORI", errors); await b.close(); process.exit(1); }
  const { DURATION } = await p.evaluate(() => window.TIMING);
  const stage = await p.$("#c");
  const only = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
  const times = only ?? Array.from({ length: Math.ceil(DURATION * 30) }, (_, i) => i / 30);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate((t) => window.renderFrame(t), times[i]);
    await stage.screenshot({ path: `${out}/${String(i).padStart(5, "0")}.png` });
  }
  console.log("fotogrammi", times.length, errors.length ? errors : "");
  await b.close();
})();
