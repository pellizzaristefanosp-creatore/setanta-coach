// Prova verticale 30 s: professore 3D stilizzato (Marco) + sarcomero procedurale.
// Rendering deterministico a fotogrammi: window.renderFrame(t) disegna l'istante t (secondi).
import * as THREE from "three";

const W = 720, H = 1280, FPS = 30;
const align = await (await fetch("../out/alignment.json")).json();
const S1 = align.s01, S2 = align.s02;
const S1_END = S1.end.at(-1);
const TRANS = S1_END + 0.35; // inizio transizione
const T2 = TRANS + 0.75; // inizio audio scena 2
export const DURATION = T2 + S2.end.at(-1) + 0.9;
window.TIMING = { T2, DURATION };

// ——— utilità ———
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }; // slow in / slow out
const easeOutBack = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const between = (t, a, b) => clamp((t - a) / (b - a));
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function wordTime(al, word, offset, nth = 0) {
  let idx = -1; for (let k = 0; k <= nth; k++) idx = al.chars.indexOf(word, idx + 1);
  if (idx < 0) throw new Error("parola non trovata: " + word);
  return al.start[idx] + offset;
}

// ——— renderer ———
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("stage").prepend(renderer.domElement);

const toon = (color) => {
  const g = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  g.minFilter = g.magFilter = THREE.NearestFilter; g.needsUpdate = true;
  return new THREE.MeshToonMaterial({ color, gradientMap: g });
};
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x2b2118, side: THREE.BackSide });
function withOutline(mesh, k = 1.045) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE); o.scale.setScalar(k); mesh.add(o); return mesh;
}
function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xb08a60, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9b0, 1.6); rim.position.set(-4, 3, -5); scene.add(rim);
}

// ——— studio (ambiente) ———
function studioBackground() {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#fbe7c8"); gr.addColorStop(0.62, "#f6dcb6"); gr.addColorStop(0.63, "#e5c08e"); gr.addColorStop(1, "#dcb07a");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ——— professore (Marco, asset unico) ———
const SKIN = 0xe9b48c, SUIT = 0xc4471d, HAIR = 0x3a2418, BEARD = 0x5b3a26, DARK = 0x2b2118;
function makeProfessor() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const torso = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.85, 8, 24), toon(SUIT)));
  torso.position.y = 0.55; body.add(torso);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.02), toon(0xfbe3d6)); stripe.position.set(0, 0.6, 0.6); body.add(stripe);
  const whistle = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.08), toon(0xd99a25)), 1.12); whistle.position.set(0, 0.75, 0.64); body.add(whistle);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 16), toon(SKIN)); neck.position.y = 1.25; body.add(neck);

  const head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  const skull = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.56, 40, 30), toon(SKIN)), 1.035); skull.scale.set(1, 1.05, 0.95); head.add(skull);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.57, 40, 30, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), toon(BEARD)); beard.scale.set(1.0, 1.05, 0.97); head.add(beard);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.58, 40, 30, 0, Math.PI * 2, 0, Math.PI * 0.42), toon(HAIR)); hair.scale.set(1, 1.05, 0.97); head.add(hair);
  const cap = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.6, 40, 30, 0, Math.PI * 2, 0, Math.PI * 0.38), toon(DARK)), 1.03); cap.position.y = 0.04; head.add(cap);
  const brim = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32, 1, false, -Math.PI / 2, Math.PI), toon(DARK)), 1.05); brim.position.set(0, 0.36, 0.32); brim.rotation.x = 0.18; brim.scale.z = 1.1; head.add(brim);
  const nose = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), toon(0xdf9f78)), 1.08); nose.position.set(0, -0.02, 0.55); head.add(nose);
  const ears = [-1, 1].map((sx) => { const e = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), toon(SKIN)), 1.08); e.position.set(sx * 0.55, 0, 0); e.scale.set(0.6, 1, 0.8); head.add(e); return e; });
  void ears;
  const eyes = [-1, 1].map((sx) => {
    const g = new THREE.Group(); g.position.set(sx * 0.2, 0.12, 0.47); head.add(g);
    const white = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), toon(0xffffff)), 1.1); white.scale.set(0.9, 1.05, 0.6); g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), new THREE.MeshBasicMaterial({ color: DARK })); pupil.position.z = 0.06; g.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.02, 0.025, 0.11); g.add(glint);
    const brow = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), toon(HAIR)), 1.1); brow.rotation.z = Math.PI / 2; brow.position.set(sx * 0.2, 0.3, 0.5); head.add(brow);
    return { g, pupil, brow, sx };
  });
  const mouth = new THREE.Group(); mouth.position.set(0, -0.24, 0.5); head.add(mouth);
  const mouthIn = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshBasicMaterial({ color: 0x5a1e12 })); mouthIn.scale.set(1, 0.2, 0.35); mouth.add(mouthIn);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff })); teeth.position.set(0, 0.03, 0.05); mouth.add(teeth);

  function arm(sx) {
    const shoulder = new THREE.Group(); shoulder.position.set(sx * 0.68, 0.95, 0); body.add(shoulder);
    const upper = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 6, 16), toon(SUIT))); upper.position.y = -0.3; shoulder.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.6; shoulder.add(elbow);
    const fore = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.38, 6, 16), toon(SUIT))); fore.position.y = -0.26; elbow.add(fore);
    const hand = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), toon(SKIN)), 1.06); hand.position.y = -0.55; elbow.add(hand);
    const finger = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), toon(SKIN)), 1.1); finger.position.set(0, -0.7, 0.04); elbow.add(finger);
    return { shoulder, elbow, finger, sx };
  }
  const armR = arm(-1), armL = arm(1); // destro del personaggio = sinistra dello schermo
  return { root, body, torso, head, eyes, mouth, mouthIn, teeth, armR, armL };
}

// ——— scena 1: studio ———
const scene1 = new THREE.Scene();
scene1.background = studioBackground();
lights(scene1);
const prof1 = makeProfessor(); scene1.add(prof1.root); prof1.root.position.set(0, -1.2, 0);
const shelf = withOutline(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.4), toon(0xc9a46f)), 1.02); shelf.position.set(-1.6, 1.4, -1.5); scene1.add(shelf);
[["#2f7a4c", -2.1], ["#c4471d", -1.8], ["#d99a25", -1.55]].forEach(([c, x], i) => { const b = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5 + i * 0.06, 0.32), toon(new THREE.Color(c))), 1.04); b.position.set(x, 1.7 + i * 0.03, -1.5); scene1.add(b); });
const ball = withOutline(new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), toon(0xffffff)), 1.04); ball.position.set(1.7, -1.05, -0.4); scene1.add(ball);
const cam1 = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);

// ——— scena 2: sarcomero (procedurale, parametrico) ———
const scene2 = new THREE.Scene(); scene2.background = new THREE.Color(0xfdf3e4); lights(scene2);
const sarc = new THREE.Group(); scene2.add(sarc);
const ACTIN_C = 0x2f7a4c, MYO_C = 0xc4471d, Z_C = 0x2563c9;
const ROWS_ACTIN = [-1.35, -0.45, 0.45, 1.35], ROWS_MYO = [-0.9, 0, 0.9];
const zDiscs = [-1, 1].map((sx) => {
  const g = new THREE.Group(); sarc.add(g);
  const pts = []; for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3((k % 2 ? 0.18 : -0.18), -1.9 + k * 0.475, 0));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 64, 0.07, 10), toon(Z_C)); g.add(tube);
  return { g, sx };
});
const actins = []; // per lato: filamenti sottili ancorati alle estremità
for (const z of zDiscs) for (const y of ROWS_ACTIN) for (const d of [-0.25, 0.25]) {
  const g = new THREE.Group(); z.g.add(g);
  const len = 2.5;
  const m = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 12), toon(ACTIN_C)), 1.12); m.rotation.z = Math.PI / 2; m.position.x = -z.sx * len / 2; g.add(m);
  g.position.set(0, y, d);
  const sites = [];
  for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), toon(0x7a3fb0)); s.position.set(-z.sx * (0.7 + k * 0.45), 0.06 * (y < 0 ? -1 : 1) * -1, 0); s.scale.setScalar(0.01); g.add(s); sites.push(s); }
  actins.push({ g, sites, sx: z.sx, y });
}
const heads = [];
for (const y of ROWS_MYO) for (const d of [-0.25, 0.25]) {
  const m = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.6, 16), toon(MYO_C)), 1.08); m.rotation.z = Math.PI / 2; m.position.set(0, y, d); sarc.add(m);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) for (const up of [-1, 1]) {
    if (Math.abs(y + up * 0.45) > 1.5) continue;
    const pivot = new THREE.Group(); pivot.position.set(sx * (0.55 + k * 0.45), y + up * 0.12, d); sarc.add(pivot);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), toon(MYO_C)); arm.position.y = up * 0.13; pivot.add(arm);
    const hd = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), toon(0xe0683a)), 1.12); hd.position.y = up * 0.28; pivot.add(hd);
    heads.push({ pivot, sx, up, phase: rng(Math.round((y + 2) * 100 + k * 13 + (sx + 2) * 7 + (up + 2) * 3 + (d + 1) * 5))() });
  }
}
const ions = []; const r2 = rng(42);
for (let k = 0; k < 18; k++) { const s = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), toon(0xf2c14e)), 1.15); s.userData = { x: (r2() - 0.5) * 4.6, y: 2.6 + r2() * 1.5, d: (r2() - 0.5) * 0.8, delay: r2() * 0.9 }; s.visible = false; scene2.add(s); ions.push(s); }
const cam2 = new THREE.PerspectiveCamera(32, W / (H * 0.6), 0.1, 50);
const prof2 = makeProfessor(); const scene2b = new THREE.Scene(); scene2b.background = studioBackground(); lights(scene2b); scene2b.add(prof2.root); prof2.root.position.set(0, -1.4, 0);
const cam2b = new THREE.PerspectiveCamera(28, W / (H * 0.4), 0.1, 50);

// ——— eventi dalla voce (scena 2) ———
const E = {
  sarc: wordTime(S2, "sarcomero", T2) - 0.6,
  actin: wordTime(S2, "actina", T2),
  myo: wordTime(S2, "miosina", T2),
  ca: wordTime(S2, "calcio", T2),
  site: wordTime(S2, "sito", T2),
  attach: wordTime(S2, "aggancia", T2),
  pull: wordTime(S2, "tira", T2),
  release: wordTime(S2, "molla", T2),
  cycles: wordTime(S2, "Più", T2),
  ends: wordTime(S2, "estremità", T2),
  sliding: wordTime(S2, "scorrevoli", T2),
};
const E1 = { sai: wordTime(S1, "Sai", 0), porta: wordTime(S1, "porta", 0), entriamo: wordTime(S1, "Entriamo", 0), vicino: wordTime(S1, "vicino", 0) };

// ——— lip-sync: visemi dai caratteri, con anticipo e coarticolazione ———
function visemeAt(al, t, offset) {
  const tt = t - offset + 0.04; // la bocca anticipa il suono di ~40 ms
  let inTag = false;
  for (let i = 0; i < al.chars.length; i++) {
    const ch = al.chars[i];
    if (ch === "[") inTag = true;
    if (!inTag && al.start[i] <= tt && tt < al.end[i]) {
      const c = ch.toLowerCase();
      if ("aàá".includes(c)) return [1.0, 1.0];
      if ("eèé".includes(c)) return [0.6, 1.12];
      if ("iì".includes(c)) return [0.35, 1.25];
      if ("oò".includes(c)) return [0.78, 0.72];
      if ("uù".includes(c)) return [0.45, 0.58];
      if ("mbp".includes(c)) return [0.02, 0.92];
      if ("fv".includes(c)) return [0.14, 1.02];
      if (/[a-zç]/.test(c)) return [0.3, 1.0];
      return [0, 1];
    }
    if (ch === "]") inTag = false;
  }
  return [0, 1];
}
function energy(al, t, offset) { const [o] = visemeAt(al, t, offset); return o; }

// ——— animazione del professore ———
const mouthState = { s1: { o: 0, w: 1 }, s2: { o: 0, w: 1 } };
function blinkAt(t, seed) {
  const r = rng(seed); let tt = 0.8;
  while (tt < 60) { const next = tt + 2 + r() * 4; if (t >= tt && t < tt + 0.13) return 1 - Math.abs((t - tt) / 0.065 - 1); tt = next; }
  return 0;
}
function saccade(t, seed) { const r = rng(seed); let tt = 0, x = 0, y = 0; while (tt <= t) { x = (r() - 0.5) * 0.03; y = (r() - 0.5) * 0.02; tt += 1.2 + r() * 1.8; } return [x, y]; }
function poseArm(a, sh, el, side) { a.shoulder.rotation.set(sh[0], 0, side * sh[1]); a.elbow.rotation.set(el, 0, 0); }
function animateProf(p, t, al, offset, ms, cfg) {
  const talk = energy(al, t, offset);
  const [to, tw] = visemeAt(al, t, offset);
  ms.o = lerp(ms.o, to, 0.55); ms.w = lerp(ms.w, tw, 0.45); // coarticolazione morbida
  p.mouthIn.scale.set(0.9 * ms.w, 0.12 + ms.o * 0.75, 0.35);
  p.teeth.visible = ms.o > 0.35;
  // respirazione, peso, micro-movimenti della testa
  p.torso.scale.y = 1 + Math.sin(t * 1.7) * 0.012;
  p.body.position.x = Math.sin(t * 0.45) * 0.035;
  p.body.rotation.z = Math.sin(t * 0.45 + 0.6) * 0.018;
  p.head.rotation.x = -0.05 + Math.sin(t * 2.1) * 0.015 + talk * 0.03 + (cfg.headX?.(t) ?? 0);
  p.head.rotation.y = Math.sin(t * 0.7) * 0.06 + (cfg.headY?.(t) ?? 0);
  p.head.rotation.z = cfg.tilt?.(t) ?? 0;
  // occhi: saccadi + battito
  const [sx, sy] = saccade(t, cfg.seed);
  const blink = blinkAt(t, cfg.seed + 1);
  for (const e of p.eyes) { e.pupil.position.x = sx + (cfg.look?.(t)?.[0] ?? 0); e.pupil.position.y = sy + (cfg.look?.(t)?.[1] ?? 0); e.g.scale.y = 1 - blink * 0.92; const br = cfg.brows?.(t) ?? 0; e.brow.position.y = 0.3 + br * 0.08; e.brow.rotation.y = 0; e.brow.rotation.x = 0; e.brow.rotation.z = Math.PI / 2 + e.sx * (cfg.browTilt?.(t) ?? 0); }
  const arms = cfg.arms(t);
  poseArm(p.armR, arms.r[0], arms.r[1], -1);
  poseArm(p.armL, arms.l[0], arms.l[1], 1);
}
const REST = { r: [[0.05, 0.12], -0.15], l: [[0.05, 0.12], -0.15] };
function mixPose(a, b, k) { const m = (x, y) => lerp(x, y, k); return { r: [[m(a.r[0][0], b.r[0][0]), m(a.r[0][1], b.r[0][1])], m(a.r[1], b.r[1])], l: [[m(a.l[0][0], b.l[0][0]), m(a.l[0][1], b.l[0][1])], m(a.l[1], b.l[1])] }; }
const OPEN = { r: [[-0.35, 0.55], -0.9], l: [[-0.35, 0.55], -0.9] };
const POINT_UP = { r: [[-2.5, 0.25], -0.15], l: [[0.05, 0.14], -0.25] };
const POINT_FWD = { r: [[-1.4, 0.15], -0.2], l: [[0.05, 0.14], -0.2] };
const HANDS_APART = { r: [[-1.1, 0.75], -0.6], l: [[-1.1, 0.75], -0.6] };
const HANDS_TOGETHER = { r: [[-1.2, 0.18], -0.95], l: [[-1.2, 0.18], -0.95] };
function gesture(t, keys) { // keys: [time, pose, dur]; anticipation: piccolo contro-movimento
  let cur = REST;
  for (const [tk, pose, dur = 0.5] of keys) {
    if (t < tk - 0.12) break;
    const antic = t < tk ? between(t, tk - 0.12, tk) : 0;
    const k = t >= tk ? ease(between(t, tk, tk + dur)) : -0.06 * Math.sin(antic * Math.PI);
    cur = mixPose(cur, pose, clamp(k, -0.1, 1));
  }
  return cur;
}

// ——— overlay ———
const $ = (id) => document.getElementById(id);
function show(el, k, x, y) { el.style.opacity = String(clamp(k)); el.style.transform = `translateY(${(1 - easeOutBack(k)) * 12}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; if (x != null) { el.style.left = x + "px"; el.style.top = y + "px"; } }
function subtitleAt(al, t, offset) {
  const plain = []; let inTag = false;
  for (let i = 0; i < al.chars.length; i++) { const ch = al.chars[i]; if (ch === "[") inTag = true; if (!inTag) plain.push({ ch, s: al.start[i] }); if (ch === "]") inTag = false; }
  const text = plain.map((p) => p.ch).join("");
  const sentences = []; let st = 0;
  text.replace(/[^.?!:]+[.?!:]+/g, (m, idx) => { sentences.push({ s: plain[idx]?.s ?? 0, text: m.trim() }); st = idx + m.length; return m; });
  if (st < text.length) sentences.push({ s: plain[st]?.s ?? 0, text: text.slice(st).trim() });
  const tt = t - offset; let cur = sentences[0];
  for (const s of sentences) if (s.s <= tt + 0.05) cur = s;
  return cur?.text ?? "";
}

// ——— un fotogramma ———
window.renderFrame = (t) => {
  renderer.setScissorTest(true);
  if (t < TRANS + 0.4) {
    // Scena 1: totale → mezzo busto con push-in motivato ("entriamo")
    const push = ease(between(t, E1.entriamo - 0.2, TRANS + 0.4));
    cam1.position.set(lerp(0.2, 0.05, push), lerp(0.4, 0.7, push), lerp(10.5, 4.6, push));
    cam1.lookAt(0, lerp(-0.1, 0.45, push), 0);
    animateProf(prof1, t, S1, 0, mouthState.s1, {
      seed: 11,
      brows: (tt) => (tt > E1.sai - 0.2 && tt < E1.porta + 0.6 ? ease(between(tt, E1.sai - 0.2, E1.sai + 0.2)) : 0) * 0.9,
      browTilt: (tt) => (tt > E1.sai && tt < E1.porta + 0.6 ? 0.25 : 0),
      tilt: (tt) => (tt > E1.sai && tt < E1.porta + 0.5 ? 0.08 * ease(between(tt, E1.sai, E1.sai + 0.4)) : 0),
      arms: (tt) => gesture(tt, [[E1.sai, OPEN, 0.5], [E1.porta + 0.4, REST, 0.6], [E1.entriamo, POINT_FWD, 0.55]]),
      look: () => [0, 0],
    });
    renderer.setViewport(0, 0, W, H); renderer.setScissor(0, 0, W, H);
    renderer.render(scene1, cam1);
    for (const id of ["lab-actin", "lab-myosin", "lab-ca", "lab-site", "lab-ends", "title", "note", "src", "divider"]) $(id).style.opacity = "0";
    $("subtitle").style.bottom = "54px";
    $("subtitle").innerHTML = `<b>Marco</b>${subtitleAt(S1, t, 0)}`;
  } else {
    // Scena 2: split — sarcomero sopra (inserto 3D), professore sotto
    const tt = t;
    const contraction = ease(between(tt, E.cycles, E.sliding + 0.6)); // le estremità si avvicinano
    const zx = lerp(3.15, 2.35, contraction);
    zDiscs.forEach((z) => (z.g.position.x = z.sx * zx));
    const build = ease(between(tt, E.sarc, E.sarc + 0.9));
    sarc.scale.setScalar(0.6 + 0.4 * easeOutBack(build));
    sarc.rotation.y = -0.22 + Math.sin(tt * 0.25) * 0.06;
    sarc.rotation.x = 0.12;
    // filamenti evidenziati quando nominati
    const pulseA = Math.max(0, 1 - Math.abs(tt - E.actin - 0.6) / 0.9);
    const pulseM = Math.max(0, 1 - Math.abs(tt - E.myo - 0.6) / 0.9);
    actins.forEach((a) => a.g.children[0].scale.set(1 + pulseA * 0.6, 1, 1 + pulseA * 0.6));
    // calcio che arriva
    ions.forEach((s) => { const k = between(tt, E.ca + s.userData.delay * 0.6, E.ca + 1.4 + s.userData.delay * 0.6); s.visible = k > 0; s.position.set(s.userData.x, lerp(s.userData.y, -0.2 + (s.userData.x % 1.2), ease(k)), s.userData.d + 0.6); });
    // siti di legame scoperti
    const siteK = easeOutBack(between(tt, E.site, E.site + 0.6));
    actins.forEach((a) => a.sites.forEach((s, i) => s.scale.setScalar(Math.max(0.01, siteK * (1 + 0.15 * Math.sin(tt * 6 + i))))));
    // teste di miosina: aggancio → colpo → rilascio, poi cicli asincroni
    heads.forEach((h) => {
      let ang = 0; // angolo verso il centro
      const reach = ease(between(tt, E.attach, E.attach + 0.35));
      const stroke = ease(between(tt, E.pull, E.pull + 0.45));
      const rel = ease(between(tt, E.release, E.release + 0.35));
      ang = lerp(0, -0.35, reach) + lerp(0, 0.9, stroke);
      let lift = lerp(0, 0.1, reach) * (1 - rel);
      if (tt > E.cycles) { // asincrono: ognuna col suo ritmo
        const c = ((tt - E.cycles) * 1.6 + h.phase) % 1;
        ang = c < 0.25 ? lerp(0.55, -0.35, ease(c / 0.25)) : c < 0.6 ? lerp(-0.35, 0.55, ease((c - 0.25) / 0.35)) : 0.55;
        lift = c < 0.6 ? 0.1 : 0;
      }
      h.pivot.rotation.z = -h.sx * h.up * ang * -1;
      h.pivot.scale.y = 1 + lift + pulseM * 0.25;
    });
    cam2.position.set(0, 0.4, lerp(15.5, 13.5, ease(between(tt, T2, DURATION))));
    cam2.lookAt(0, 0, 0);
    animateProf(prof2, tt, S2, T2, mouthState.s2, {
      seed: 23,
      brows: (x) => (x > E.release + 0.2 && x < E.cycles + 1.5 ? 0.9 : x > E.sliding - 0.2 ? 1 : 0.15),
      browTilt: (x) => (x > E.sliding - 0.2 ? -0.1 : 0),
      tilt: (x) => (x > E.release && x < E.cycles + 1 ? -0.07 : 0),
      look: (x) => (x < E.ends ? [0, 0.025] : [0, 0]),
      arms: (x) => gesture(x, [[E.sarc, POINT_UP, 0.6], [E.ca, OPEN, 0.5], [E.attach, POINT_UP, 0.5], [E.ends - 0.3, HANDS_APART, 0.45], [E.ends + 0.2, HANDS_TOGETHER, 1.6], [E.sliding + 0.6, OPEN, 0.6]]),
    });
    cam2b.position.set(0, 0.55, 5.2); cam2b.lookAt(0, -0.05, 0);
    const topH = Math.round(H * 0.6);
    renderer.setViewport(0, H - topH, W, topH); renderer.setScissor(0, H - topH, W, topH); renderer.render(scene2, cam2);
    renderer.setViewport(0, 0, W, H - topH); renderer.setScissor(0, 0, W, H - topH); renderer.render(scene2b, cam2b);
    $("divider").style.top = topH - 3 + "px"; $("divider").style.opacity = "1";
    show($("note"), between(tt, E.sarc, E.sarc + 0.5)); show($("src"), between(tt, E.sarc, E.sarc + 0.5));
    show($("lab-actin"), between(tt, E.actin, E.actin + 0.4), 40, 600);
    show($("lab-myosin"), between(tt, E.myo, E.myo + 0.4), 400, 600);
    show($("lab-ca"), between(tt, E.ca, E.ca + 0.4) * (1 - between(tt, E.attach + 1.5, E.attach + 2)), 40, 90);
    show($("lab-site"), between(tt, E.site, E.site + 0.4) * (1 - between(tt, E.cycles, E.cycles + 0.5)), 420, 90);
    show($("lab-ends"), between(tt, E.ends, E.ends + 0.4) * (1 - between(tt, E.sliding - 0.3, E.sliding)), 200, 90);
    const tk = between(tt, E.sliding - 0.3, E.sliding + 0.3);
    $("title").style.opacity = String(tk); $("title").style.top = topH - 80 + "px";
    $("subtitle").style.bottom = "28px";
    $("subtitle").innerHTML = `<b>Marco</b>${subtitleAt(S2, tt, T2)}`;
  }
  // transizione a iride motivata ("entriamo in una fibra")
  const close = between(t, TRANS - 0.1, TRANS + 0.35), open = between(t, TRANS + 0.4, TRANS + 0.75);
  const r = t < TRANS + 0.4 ? ease(close) * 75 : (1 - ease(open)) * 75;
  $("iris").style.clipPath = `circle(${r}% at 50% 45%)`;
  renderer.setScissorTest(false);
};
window.READY = true;
