// Renderizza la prova: un PNG per fotogramma, poi ffmpeg con l'audio.
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
(async () => {
  const out = process.argv[2] || "studio/out/frames";
  const only = process.argv[3] ? process.argv[3].split(",").map(Number) : null; // istanti di prova
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 720, height: 1280 } });
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto("http://127.0.0.1:8765/studio/episodio/web/index2.html");
  await p.waitForFunction(() => window.READY === true, null, { timeout: 30000 }).catch(() => {});
  if (errors.length) { console.log("ERRORI", errors); }
  const { DURATION, T2 } = await p.evaluate(() => window.TIMING);
  const stage = await p.$("#stage");
  const times = only ?? Array.from({ length: Math.ceil(DURATION * 30) }, (_, i) => i / 30);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate((t) => window.renderFrame(t), times[i]);
    await stage.screenshot({ path: `${out}/${String(i).padStart(5, "0")}.png` });
  }
  console.log(JSON.stringify({ DURATION, T2, frames: times.length, errors }));
  await b.close();
})();
