// "Campo e Scienza" · Ep. 5.1 · Azione 1 — versione con la grafica da film d'animazione.
// Scene: immagini dei personaggi (concept art coerente) animate con movimenti di camera, bocca sulle sillabe
// (toppa "bocca aperta" dosata dai visemi) e battito delle palpebre. Dentro il corpo: sarcomero procedurale.
import * as THREE from "three";

const W = 720, H = 1280;
const TL = await (await fetch("../out/timeline.json")).json();
window.TIMING = { DURATION: TL.DURATION };
const L = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const T = TL.T;
const PATCH = await (await fetch("../../concept/patches.json")).json();

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const bt = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function word(id, w) { const l = L[id], i = l.al.chars.join("").indexOf(w); if (i < 0) throw new Error(w); return l.start + l.al.start[i]; }
const endOf = (id) => L[id].start + L[id].dur;

// ——— immagini ———
const names = ["palla", "luca", "marco_campo", "scena", "luca_sorpreso", "marco_camera", "luca_esulta", "scena_finale"];
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const IMG = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await loadImg(`../../concept/${n}.png`)])));
const P = Object.fromEntries(await Promise.all(Object.keys(PATCH).map(async (k) => [k, await loadImg(`../../concept/patch_${k}.png`)])));

// ——— lip-sync: quanto è aperta la bocca (0–1), con anticipo e smorzamento ———
function openRaw(l, tt) {
  const al = l.al; let tag = false;
  for (let i = 0; i < al.chars.length; i++) {
    const ch = al.chars[i];
    if (ch === "[") tag = true;
    if (!tag && al.start[i] <= tt && tt < al.end[i]) {
      const c = ch.toLowerCase();
      if ("aàáoò".includes(c)) return 1;
      if ("eèé".includes(c)) return 0.75;
      if ("iìuù".includes(c)) return 0.5;
      if ("mbp".includes(c)) return 0;
      if (/[a-zç']/.test(c)) return 0.35;
      return 0;
    }
    if (ch === "]") tag = false;
  }
  return 0;
}
function mouth(who, t) {
  let acc = 0, n = 0;
  for (let dt = -0.06; dt <= 0.02; dt += 0.01) {
    const tt = t + 0.04 + dt;
    for (const l of TL.lines) if (l.who === who && tt >= l.start && tt < l.start + l.dur) acc += openRaw(l, tt - l.start);
    n++;
  }
  return smooth(0.12, 0.7, acc / n);
}
function blink(t, seed) {
  const r = rng(seed); let tt = 0.9;
  while (tt < 200) { if (t >= tt && t < tt + 0.16) return Math.sin(bt(t, tt, tt + 0.16) * Math.PI); tt += 2.2 + r() * 3.8; }
  return 0;
}

// ——— canvas principale ———
const cv = document.createElement("canvas"); cv.width = W; cv.height = H; document.getElementById("stage").prepend(cv);
const ctx = cv.getContext("2d");

/** disegna un'immagine 1024×1536 in un riquadro, con centro e zoom (camera virtuale) + toppe */
function drawShot(t, s, box = [0, 0, W, H]) {
  const img = IMG[s.img]; const [bx, by, bw, bh] = box;
  const k = ease(bt(t, s.a, s.b));
  let z = lerp(s.z0, s.z1, k) * (1 + 0.004 * Math.sin(t * 1.7)); // respiro della camera
  let cx = lerp(s.c0[0], s.c1[0], k), cy = lerp(s.c0[1], s.c1[1], k);
  if (s.bob) cy += s.bob(t);
  if (s.shake) { const a = s.shake(t); cx += Math.sin(t * 70) * a; cy += Math.cos(t * 53) * a; }
  const aspect = bw / bh; let ch = 1536 / z, cw = ch * aspect;
  if (cw > 1024) { cw = 1024 / 1; ch = cw / aspect; }
  const sx = clamp(cx - cw / 2, 0, 1024 - cw), sy = clamp(cy - ch / 2, 0, 1536 - ch);
  ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  ctx.filter = s.filter?.(t) ?? "none";
  ctx.drawImage(img, sx, sy, cw, ch, bx, by, bw, bh);
  const sc = bw / cw;
  const patch = (key, alpha) => {
    if (alpha <= 0.01 || !P[key]) return;
    const [px, py] = PATCH[key]; const p = P[key];
    ctx.globalAlpha = alpha; ctx.drawImage(p, bx + (px - sx) * sc, by + (py - sy) * sc, p.width * sc, p.height * sc); ctx.globalAlpha = 1;
  };
  if (s.mouth) patch(`${s.mouthKey ?? s.img}_mouth`, s.frozen?.(t) ? 0 : mouth(s.mouth, t));
  if (s.eyes) patch(`${s.img}_eyes`, s.frozen?.(t) ? 0 : blink(t, s.seed ?? 7));
  ctx.restore();
}

// ——— dentro il corpo (Three.js, fuori schermo) ———
const SH = Math.round(H * 0.6);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, SH); renderer.outputColorSpace = THREE.SRGBColorSpace;
const sarcScene = new THREE.Scene(); sarcScene.background = new THREE.Color(0xfdf3e4);
sarcScene.add(new THREE.HemisphereLight(0xfff4e6, 0xb08a60, 1.5)); { const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(3, 5, 6); sarcScene.add(k); }
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
const sarc = new THREE.Group(); sarcScene.add(sarc);
const zd = [-1, 1].map((sx) => {
  const g = new THREE.Group(); sarc.add(g);
  const pts = []; for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3(k % 2 ? 0.18 : -0.18, -1.9 + k * 0.475, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 64, 0.07, 10), mat(0x2563c9)));
  return { g, sx };
});
const actins = [];
for (const z of zd) for (const y of [-1.35, -0.45, 0.45, 1.35]) for (const d of [-0.25, 0.25]) {
  const g = new THREE.Group(); z.g.add(g); g.position.set(0, y, d);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 12), mat(0x2f7a4c)); m.rotation.z = Math.PI / 2; m.position.x = -z.sx * 1.25; g.add(m);
  const sites = []; for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mat(0x7a3fb0)); s.position.set(-z.sx * (0.7 + k * 0.45), y < 0 ? 0.06 : -0.06, 0); s.scale.setScalar(0.01); g.add(s); sites.push(s); }
  actins.push({ m, sites });
}
const heads = [];
for (const y of [-0.9, 0, 0.9]) for (const d of [-0.25, 0.25]) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.6, 16), mat(0xc4471d)); m.rotation.z = Math.PI / 2; m.position.set(0, y, d); sarc.add(m);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) for (const up of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sx * (0.55 + k * 0.45), y + up * 0.12, d); sarc.add(pv);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), mat(0xc4471d)); arm.position.y = up * 0.13; pv.add(arm);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), mat(0xe0683a)); hd.position.y = up * 0.28; pv.add(hd);
    heads.push({ pv, sx, up, ph: rng(Math.round((y + 2) * 100 + k * 13 + (sx + 2) * 7 + (up + 2) * 3 + (d + 1) * 5))() });
  }
}
const ions = []; { const r = rng(42); for (let k = 0; k < 18; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), mat(0xf2c14e)); s.userData = { x: (r() - 0.5) * 4.6, y: 2.6 + r() * 1.5, d: (r() - 0.5) * 0.8, delay: r() * 0.9 }; s.visible = false; sarcScene.add(s); ions.push(s); } }
const sarcCam = new THREE.PerspectiveCamera(32, W / SH, 0.1, 50);
const E = { sarc: word("l05", "sarcomero") - 0.5, actin: word("l05", "actina"), myo: word("l05", "miosina"), ca: word("l06", "calcio"), site: word("l06", "siti"), attach: word("l06", "aggancia"), pull: word("l06", "tira"), rel: word("l06", "molla"), cyc: word("l06", "Più") };
function renderSarc(t) {
  const contraction = ease(bt(t, E.cyc, E.cyc + 2.6));
  zd.forEach((z) => (z.g.position.x = z.sx * lerp(3.15, 2.35, contraction)));
  sarc.scale.setScalar(0.6 + 0.4 * back(bt(t, E.sarc, E.sarc + 0.9)));
  sarc.rotation.y = -0.22 + Math.sin(t * 0.25) * 0.06; sarc.rotation.x = 0.12;
  const pa = Math.max(0, 1 - Math.abs(t - E.actin - 0.6) / 0.9);
  actins.forEach((a) => a.m.scale.set(1 + pa * 0.7, 1, 1 + pa * 0.7));
  ions.forEach((s) => { const k = bt(t, E.ca + s.userData.delay * 0.6, E.ca + 1.4 + s.userData.delay * 0.6); s.visible = k > 0; s.position.set(s.userData.x, lerp(s.userData.y, -0.2 + (s.userData.x % 1.2), ease(k)), s.userData.d + 0.6); });
  const sk = back(bt(t, E.site, E.site + 0.6));
  actins.forEach((a) => a.sites.forEach((s, i) => s.scale.setScalar(Math.max(0.01, sk * (1 + 0.15 * Math.sin(t * 6 + i))))));
  const pm = Math.max(0, 1 - Math.abs(t - E.myo - 0.6) / 0.9);
  heads.forEach((h) => {
    const reach = ease(bt(t, E.attach, E.attach + 0.35)), stroke = ease(bt(t, E.pull, E.pull + 0.45)), rel = ease(bt(t, E.rel, E.rel + 0.35));
    let ang = lerp(0, -0.35, reach) + lerp(0, 0.9, stroke), lift = lerp(0, 0.1, reach) * (1 - rel);
    if (t > E.cyc) { const c = ((t - E.cyc) * 1.6 + h.ph) % 1; ang = c < 0.25 ? lerp(0.55, -0.35, ease(c / 0.25)) : c < 0.6 ? lerp(-0.35, 0.55, ease((c - 0.25) / 0.35)) : 0.55; lift = c < 0.6 ? 0.1 : 0; }
    h.pv.rotation.z = h.sx * h.up * ang; h.pv.scale.y = 1 + lift + pm * 0.25;
  });
  sarcCam.position.set(0, 0.4, lerp(15.5, 13.8, bt(t, T.sarcIn, T.sarcOut))); sarcCam.lookAt(0, 0, 0);
  renderer.render(sarcScene, sarcCam);
}

// ——— montaggio ———
const FERMI = word("l04", "Fermi");
const freezeF = (t) => (t > FERMI ? `saturate(${lerp(1, 0.2, bt(t, FERMI, FERMI + 0.25))}) sepia(${0.18 * bt(t, FERMI, FERMI + 0.25)}) contrast(1.06)` : "none");
const SHOTS = [
  { a: 0, b: T.l01 - 0.05, img: "palla", z0: 1.05, z1: 1.35, c0: [560, 760], c1: [600, 720], shake: (t) => 10 * Math.max(0, 1 - Math.abs(t - (T.l01 - 0.5)) / 0.35) },
  { a: T.l01 - 0.05, b: L.l02.start - 0.15, img: "luca", z0: 1.25, z1: 1.45, c0: [512, 600], c1: [512, 520], mouth: "L", eyes: true, seed: 3 },
  { a: L.l02.start - 0.15, b: L.l03.start - 0.15, img: "marco_campo", z0: 1.2, z1: 1.32, c0: [540, 640], c1: [540, 600], mouth: "M", eyes: true, seed: 5 },
  { a: L.l03.start - 0.15, b: L.l04.start - 0.15, img: "scena", z0: 1.0, z1: 1.12, c0: [512, 780], c1: [560, 740], mouth: "L" },
  { a: L.l04.start - 0.15, b: FERMI - 0.05, img: "marco_campo", z0: 1.38, z1: 1.45, c0: [540, 560], c1: [540, 560], mouth: "M", eyes: true, seed: 9 },
  { a: FERMI - 0.05, b: T.sarcIn, img: "scena", z0: 1.0, z1: 4.2, c0: [560, 780], c1: [735, 930], filter: freezeF, mouth: "L", frozen: () => true },
  { a: T.backIn, b: L.l08.start - 0.1, img: "luca_sorpreso", z0: 1.2, z1: 1.42, c0: [530, 640], c1: [530, 560], mouth: "L", eyes: true, seed: 11 },
  { a: L.l08.start - 0.1, b: L.l09.start - 0.1, img: "marco_campo", z0: 1.45, z1: 1.55, c0: [530, 540], c1: [530, 520], mouth: "M", eyes: true, seed: 13 },
  { a: L.l09.start - 0.1, b: L.l10.start - 0.2, img: "marco_camera", z0: 1.1, z1: 1.38, c0: [500, 760], c1: [500, 650], mouth: "M", eyes: true, seed: 17 },
  { a: L.l10.start - 0.2, b: L.l11.start - 0.1, img: "luca_esulta", z0: 1.0, z1: 1.1, c0: [512, 760], c1: [512, 700], bob: (t) => -Math.max(0, Math.sin(bt(t, L.l10.start - 0.1, L.l10.start + 0.5) * Math.PI)) * 40 },
  { a: L.l11.start - 0.1, b: 999, img: "scena_finale", z0: 1.05, z1: 1.2, c0: [512, 760], c1: [470, 700], mouth: "M", mouthKey: "scena_finale" },
];
const BOTTOM = { a: T.sarcIn, b: T.backIn, img: "scena_finale", z0: 1.0, z1: 1.08, c0: [512, 520], c1: [512, 500], mouth: "M", mouthKey: "scena_finale" };

const $ = (id) => document.getElementById(id);
function pop(el, k) { el.style.opacity = String(clamp(k)); el.style.transform = `translateY(${(1 - back(k)) * 14}px) scale(${0.92 + 0.08 * back(k)})`; }
function subtitle(t) {
  for (const l of TL.lines) if (t >= l.start - 0.05 && t < l.start + l.dur + 0.25) return [l.who, l.al.chars.join("").replace(/\[[^\]]*\]\s*/g, "").trim()];
  return null;
}

window.renderFrame = (t) => {
  ctx.fillStyle = "#14100c"; ctx.fillRect(0, 0, W, H);
  const split = t >= T.sarcIn && t < T.backIn;
  if (split) {
    renderSarc(t);
    ctx.drawImage(renderer.domElement, 0, 0, W, SH);
    drawShot(t, BOTTOM, [0, SH, W, H - SH]);
    ctx.fillStyle = "#2b2118"; ctx.fillRect(0, SH - 3, W, 6);
    pop($("note"), bt(t, T.sarcIn, T.sarcIn + 0.5)); pop($("src"), bt(t, T.sarcIn, T.sarcIn + 0.5));
    pop($("lab-actin"), bt(t, E.actin, E.actin + 0.4)); pop($("lab-myosin"), bt(t, E.myo, E.myo + 0.4));
    pop($("lab-ca"), bt(t, E.ca, E.ca + 0.4) * (1 - bt(t, E.cyc, E.cyc + 0.4))); pop($("lab-site"), bt(t, E.site, E.site + 0.4) * (1 - bt(t, E.cyc, E.cyc + 0.4)));
    pop($("lab-slide"), bt(t, E.cyc + 0.6, E.cyc + 1.0));
  } else {
    const s = SHOTS.find((x) => t >= x.a && t < x.b) ?? SHOTS.at(-1);
    drawShot(t, s);
    for (const id of ["note", "src", "lab-actin", "lab-myosin", "lab-ca", "lab-site", "lab-slide"]) $(id).style.opacity = "0";
  }
  // vignetta cinematografica leggera
  const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 0.75); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.35)");
  if (!split) { ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  pop($("tag"), bt(t, 0.3, 0.8) * (1 - bt(t, T.l01 + 1.6, T.l01 + 2.0)));
  const sub = subtitle(t);
  const el = $("subtitle"); el.replaceChildren();
  if (sub && t < T.end) { const b = document.createElement("b"); b.className = sub[0]; b.textContent = sub[0] === "M" ? "Marco" : "Luca"; el.append(b, sub[1]); el.style.opacity = "1"; } else el.style.opacity = "0";
  el.style.bottom = split ? "22px" : "64px";
  pop($("pause"), (t > FERMI && t < T.sarcIn ? 1 : 0) * bt(t, FERMI, FERMI + 0.25));
  const c3 = word("l09", "Tre"), c2 = word("l09", "due"), c1 = word("l09", "uno");
  const cd = t >= c3 && t < L.l10.start ? (t < c2 ? "3" : t < c1 ? "2" : "1") : "";
  $("count").textContent = cd; pop($("count"), cd ? back(bt(t, cd === "3" ? c3 : cd === "2" ? c2 : c1, (cd === "3" ? c3 : cd === "2" ? c2 : c1) + 0.25)) : 0);
  pop($("question"), bt(t, word("l09", "cosa"), word("l09", "cosa") + 0.3) * (1 - bt(t, L.l10.start - 0.1, L.l10.start + 0.15)));
  pop($("answer"), bt(t, L.l10.start + 0.1, L.l10.start + 0.4) * (1 - bt(t, L.l10.start + 1.4, L.l10.start + 1.8)));
  const close = bt(t, T.sarcIn - 0.45, T.sarcIn - 0.05), open = bt(t, T.sarcIn + 0.05, T.sarcIn + 0.45);
  const close2 = bt(t, T.backIn - 0.35, T.backIn - 0.05), open2 = bt(t, T.backIn + 0.05, T.backIn + 0.4);
  let r = 100; if (t < T.sarcIn + 0.5 && t > T.sarcIn - 0.5) r = t < T.sarcIn ? (1 - ease(close)) * 100 : ease(open) * 100;
  if (t < T.backIn + 0.5 && t > T.backIn - 0.4) r = t < T.backIn ? (1 - ease(close2)) * 100 : ease(open2) * 100;
  $("iris").style.clipPath = `circle(${r}% at 50% 52%)`; $("iris").style.opacity = r >= 99.9 ? "0" : "1";
  pop($("endcard"), bt(t, T.end, T.end + 0.4) * (1 - bt(t, T.post - 0.3, T.post)));
  pop($("post"), bt(t, T.post, T.post + 0.4));
  $("curtain").style.opacity = String(Math.max(bt(t, T.end - 0.2, T.end + 0.3) * 0.88, 1 - bt(t, 0, 0.35)));
};
window.READY = true;
