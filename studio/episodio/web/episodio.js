// "Campo e Scienza" · Ep. 5.1 · Azione 1 (video di esempio)
// Rendering deterministico: window.renderFrame(t) disegna l'istante t. Personaggi: asset Blender versionati.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const W = 720, H = 1280;
const TL = await (await fetch("../out/timeline.json")).json(); // { lines: [{id, who, start, dur, al}], T: {...}, DURATION }
window.TIMING = { DURATION: TL.DURATION };
const L = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const T = TL.T;

// ——— utilità ———
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const bt = (t, a, b) => clamp((t - a) / (b - a));
const D = THREE.MathUtils.degToRad;
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** istante (assoluto) in cui una parola inizia dentro una battuta */
function word(id, w, nth = 0) {
  const l = L[id], txt = l.al.chars.join(""); let i = -1;
  for (let k = 0; k <= nth; k++) i = txt.indexOf(w, i + 1);
  if (i < 0) throw new Error(`parola "${w}" non trovata in ${id}`);
  return l.start + l.al.start[i];
}
const endOf = (id) => L[id].start + L[id].dur;

// ——— renderer ———
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("stage").prepend(renderer.domElement);

// ——— il campo ———
const field = new THREE.Scene();
function skyTex() {
  const c = document.createElement("canvas"); c.width = 4; c.height = 512; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#7fb6e8"); gr.addColorStop(0.55, "#cfe6f5"); gr.addColorStop(1, "#fbe7c8");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
field.background = skyTex();
field.fog = new THREE.Fog(0xdfeaf0, 18, 60);
const hemi = new THREE.HemisphereLight(0xfff3e2, 0x5d7a3a, 1.35); field.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 2.6); sun.position.set(4, 7, 5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 1, far: 25 }); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
field.add(sun);
const rim = new THREE.DirectionalLight(0xffd6a8, 1.8); rim.position.set(-3, 3, -5); field.add(rim);
function grassTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d");
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#5f9a3c" : "#6aa845"; g.fillRect(0, i * 64, 512, 64); }
  const r = rng(7); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${30 + r() * 40},${70 + r() * 60},${20 + r() * 30},0.25)`; g.fillRect(r() * 512, r() * 512, 1.5, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const grass = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.95 }));
grass.rotation.x = -Math.PI / 2; grass.position.z = -15; grass.receiveShadow = true; field.add(grass);
const lineMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f0, roughness: 0.8 });
const area = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.7, 64, 1, Math.PI, Math.PI), lineMat); area.rotation.x = -Math.PI / 2; area.position.set(0, 0.005, -7.5); field.add(area);
const box = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.1), lineMat); box.rotation.x = -Math.PI / 2; box.position.set(0, 0.005, -6.5); field.add(box);
// porta con rete
const GOAL_Z = -10;
const post = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
for (const x of [-3.66, 3.66]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.44, 16), post); p.position.set(x, 1.22, GOAL_Z); p.castShadow = true; field.add(p); }
const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.44, 16), post); bar.rotation.z = Math.PI / 2; bar.position.set(0, 2.44, GOAL_Z); field.add(bar);
const netGeo = new THREE.PlaneGeometry(7.3, 2.4, 60, 20);
const net = new THREE.LineSegments(new THREE.WireframeGeometry(netGeo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
net.position.set(0, 1.2, GOAL_Z - 1.2); field.add(net);
const netBasePos = netGeo.attributes.position.array.slice();
// spalti lontani
const stands = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 3), new THREE.MeshStandardMaterial({ color: 0x9fb3c8, roughness: 1 })); stands.position.set(0, 2, -26); field.add(stands);
// pallone
function ballTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#fbfbf6"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#1d1d1d";
  const r = rng(3); for (let i = 0; i < 14; i++) { const x = (i % 7) * 75 + (i > 6 ? 37 : 0), y = i > 6 ? 170 : 70; g.beginPath(); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + r(); g.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); } g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), new THREE.MeshStandardMaterial({ map: ballTex(), roughness: 0.45 }));
ball.castShadow = true; field.add(ball);
// cartello "10" sulla maglia di Luca
function numberTex() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.font = "900 190px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("10", 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ——— personaggi ———
const loader = new GLTFLoader();
const load = (u) => new Promise((res, rej) => loader.load(u, (g) => res(g.scene), undefined, rej));
const [marcoScene, lucaScene] = await Promise.all([load("../../assets/out/marco_v1.glb"), load("../../assets/out/luca_v1.glb")]);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();

function makeChar(scene, x, ry, seed) {
  const holder = new THREE.Group(); holder.add(scene); holder.position.x = x; holder.rotation.y = ry; field.add(holder);
  const n = {};
  scene.traverse((o) => {
    n[o.name] = o;
    if (o.isMesh) {
      o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.name.startsWith("Eye") || o.name.startsWith("Glint") ? 0.15 : 0.72 });
      if (o.name === "Body" || o.name === "Head") o.material.emissive = new THREE.Color(0x2a0f05); // finto subsurface caldo
      o.castShadow = true; o.receiveShadow = o.name === "Body";
    }
  });
  holder.updateMatrixWorld(true);
  const hq = holder.getWorldQuaternion(new THREE.Quaternion()).invert();
  const rest = new Map();
  scene.traverse((o) => rest.set(o, { q: o.quaternion.clone(), p: o.position.clone(), c: hq.clone().multiply(o.getWorldQuaternion(new THREE.Quaternion())) }));
  return { holder, n, rest, seed, x, ry, pose: {} };
}
const marco = makeChar(marcoScene, -0.62, D(32), 11);
const luca = makeChar(lucaScene, 0.62, D(-32), 23);
{ // numero 10 sulla schiena/davanti della maglia: decal sul petto
  const chest = luca.n.chest; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: numberTex(), transparent: true }));
  const rc = luca.rest.get(chest).c.clone().invert();
  m.position.copy(new THREE.Vector3(0.0, 0.02, 0.165).applyQuaternion(rc)); m.quaternion.copy(rc); chest.add(m);
}

/** ruota un nodo con angoli (gradi) espressi nello spazio del personaggio: x avanti/indietro, y gira, z di lato */
function rot(ch, node, [x = 0, y = 0, z = 0]) {
  const r = ch.rest.get(node); _q.setFromEuler(_e.set(D(x), D(y), D(z), "YXZ"));
  _q2.copy(r.c).invert().multiply(_q).multiply(r.c); node.quaternion.copy(r.q).multiply(_q2);
}
function offset(ch, node, parent, [x = 0, y = 0, z = 0]) {
  const r = ch.rest.get(node), pc = ch.rest.get(parent).c;
  _v.set(x, y, z).applyQuaternion(pc.clone().invert()); node.position.copy(r.p).add(_v);
}

// pose: gradi per osso, lato sinistro (L = +x del personaggio); il destro si specchia
const P = {
  idle: { upper_arm: [0, 0, -14], forearm: [-18, 0, 0], hand: [0, 0, 0] },
  open: { upper_arm: [-25, 0, 8], forearm: [-62, -25, 0], hand: [0, 0, 15] },
  flex: { upper_arm: [0, 0, 78], forearm: [0, 0, 105], hand: [0, 0, 0] },
  up: { upper_arm: [-10, 0, 150], forearm: [0, 0, 10], hand: [0, 0, 0] },
  shrug: { upper_arm: [-8, 0, 2], forearm: [-80, -30, 0], hand: [0, 0, 25], shoulder: [0, 0, 14] },
  point: { upper_arm: [-82, 10, 0], forearm: [-8, 0, 0], hand: [0, 0, 0] },
  pointUp: { upper_arm: [-160, 0, 10], forearm: [-10, 0, 0], hand: [0, 0, 0] },
  whistle: { upper_arm: [-55, 0, -22], forearm: [-128, -10, 0], hand: [0, 0, 0] },
  hip: { upper_arm: [8, 0, 36], forearm: [-10, 0, -100], hand: [0, 0, 0] },
  chin: { upper_arm: [-40, 0, -18], forearm: [-140, 0, 0], hand: [0, 0, 0] },
  together: { upper_arm: [-60, 0, -6], forearm: [-50, 40, 0], hand: [0, 0, 0] },
  apart: { upper_arm: [-55, 0, 30], forearm: [-40, -10, 0], hand: [0, 0, 0] },
};
const ARM = ["shoulder", "upper_arm", "forearm", "hand"];
const mirror = ([x, y, z]) => [x, -y, -z];
/** keys: [tempo, {L:posa, R:posa}, durata]; con anticipo (piccolo contro-movimento) e overshoot morbido */
function armPose(t, keys, side) {
  let cur = P.idle, prev = P.idle, k = 1;
  for (const [tk, pose, dur = 0.45] of keys) {
    const p = P[pose[side] ?? pose.B ?? "idle"];
    if (t < tk - 0.1) break;
    prev = mix(prev, cur, k); cur = p; k = t < tk ? -0.07 * Math.sin(bt(t, tk - 0.1, tk) * Math.PI) : back(bt(t, tk, tk + dur)) * 0.92 + ease(bt(t, tk, tk + dur)) * 0.08;
  }
  return mix(prev, cur, k);
}
function mix(a, b, k) {
  const o = {};
  for (const bone of ARM) { const A = a[bone] ?? [0, 0, 0], B = b[bone] ?? [0, 0, 0]; o[bone] = [0, 1, 2].map((i) => lerp(A[i], B[i], k)); }
  return o;
}

// ——— lip-sync: visemi dalle lettere, con anticipo e smorzamento a finestra (deterministico) ———
function visemeRaw(l, tt) {
  const al = l.al; let tag = false;
  for (let i = 0; i < al.chars.length; i++) {
    const ch = al.chars[i];
    if (ch === "[") tag = true;
    if (!tag && al.start[i] <= tt && tt < al.end[i]) {
      const c = ch.toLowerCase();
      if ("aàá".includes(c)) return [1, 0.2, 0];
      if ("eèé".includes(c)) return [0.55, 0.7, 0];
      if ("iì".includes(c)) return [0.3, 0.9, 0];
      if ("oò".includes(c)) return [0.65, 0, 0.8];
      if ("uù".includes(c)) return [0.35, 0, 1];
      if ("mbp".includes(c)) return [0, 0, 0];
      if ("fv".includes(c)) return [0.12, 0.3, 0];
      if (/[a-zç']/.test(c)) return [0.3, 0.25, 0];
      return [0, 0, 0];
    }
    if (ch === "]") tag = false;
  }
  return [0, 0, 0];
}
function viseme(who, t) {
  const acc = [0, 0, 0]; let n = 0;
  for (let dt = -0.07; dt <= 0.025; dt += 0.0125) { // la bocca anticipa il suono di ~40 ms
    const tt = t + 0.04 + dt;
    for (const l of TL.lines) if (l.who === who && tt >= l.start && tt < l.start + l.dur) { const v = visemeRaw(l, tt - l.start); acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2]; }
    n++;
  }
  return acc.map((x) => x / n);
}
const speaking = (who, t) => TL.lines.some((l) => l.who === who && t >= l.start && t < l.start + l.dur);

function blink(t, seed) {
  const r = rng(seed); let tt = 0.6;
  while (tt < 120) { if (t >= tt && t < tt + 0.14) return Math.sin((bt(t, tt, tt + 0.14)) * Math.PI); tt += 2 + r() * 4; }
  return 0;
}
function saccade(t, seed) { const r = rng(seed); let tt = 0, x = 0, y = 0; while (tt <= t) { x = (r() - 0.5) * 0.008; y = (r() - 0.5) * 0.005; tt += 0.9 + r() * 1.6; } return [x, y]; }

/** anima un personaggio all'istante t; cfg: funzioni del copione */
function animate(ch, who, t, cfg) {
  const n = ch.n;
  // respiro, peso, piccoli movimenti
  const breath = Math.sin(t * 1.6 + ch.seed) * 1.2;
  rot(ch, n.hips, [0, Math.sin(t * 0.4 + ch.seed) * 2, Math.sin(t * 0.37 + ch.seed) * 1.5 + (cfg.hipsZ?.(t) ?? 0)]);
  ch.holder.position.y = cfg.jump?.(t) ?? 0;
  const lean = cfg.lean?.(t) ?? 0;
  rot(ch, n.spine, [breath * 0.4 + lean, (cfg.turn?.(t) ?? 0) * 0.3, 0]);
  rot(ch, n.chest, [breath + lean * 0.5, (cfg.turn?.(t) ?? 0) * 0.4, cfg.chestZ?.(t) ?? 0]);
  const [vo, vw, vr] = viseme(who, t);
  const talk = vo;
  const [hx, hy, hz] = cfg.head?.(t) ?? [0, 0, 0];
  rot(ch, n.neck, [hx * 0.3, hy * 0.3, hz * 0.3]);
  rot(ch, n.head, [hx * 0.7 + Math.sin(t * 2.3 + ch.seed) * 1.2 + talk * 4, hy * 0.7 + Math.sin(t * 0.7 + ch.seed) * 2.5, hz * 0.7]);
  // braccia
  const keys = cfg.arms?.(t) ?? [];
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    const pose = armPose(t, keys, side);
    for (const b of ARM) {
      const node = n[b + side]; if (!node) continue;
      let a = pose[b]; if (s < 0) a = mirror(a);
      // dita mai ferme
      rot(ch, node, b === "hand" ? [a[0] + Math.sin(t * 1.3 + s) * 3, a[1], a[2]] : a);
    }
    rot(ch, n["fingers" + side], [s * 0 + (cfg.fist?.(t) ? 70 : 12 + Math.sin(t * 0.9 + s) * 6), 0, 0]);
    rot(ch, n["thumb" + side], [cfg.fist?.(t) ? 40 : 5, 0, 0]);
  }
  // gambe: leggero spostamento del peso
  const w = Math.sin(t * 0.37 + ch.seed);
  rot(ch, n.thighL, [w * 1.5, 0, -1.5 * w]); rot(ch, n.thighR, [-w * 1.5, 0, -1.5 * w]);
  rot(ch, n.shinL, [Math.max(0, w) * 3, 0, 0]); rot(ch, n.shinR, [Math.max(0, -w) * 3, 0, 0]);
  if (cfg.legs) cfg.legs(t, n, ch);
  // faccia
  const m = n.Mouth, dict = m.morphTargetDictionary, inf = m.morphTargetInfluences;
  const ex = cfg.face?.(t) ?? {};
  inf[dict.open] = clamp(vo * 0.95 + (ex.open ?? 0)); inf[dict.wide] = clamp(vw * 0.6); inf[dict.round] = clamp(vr * 0.85);
  inf[dict.smile] = clamp(ex.smile ?? 0.15); inf[dict.frown] = clamp(ex.frown ?? 0);
  n.Teeth.visible = vo > 0.25 || (ex.smile ?? 0) > 0.6;
  const bl = Math.max(blink(t, ch.seed + 5), ex.squint ?? 0);
  const [sx, sy] = saccade(t, ch.seed); const look = ex.look ?? [0, 0];
  for (const [side, s] of [["L", 1], ["R", -1]]) {
    rot(ch, n["Lid" + side], [lerp(-62, 82, clamp(bl + (ex.lid ?? 0))), 0, 0]);
    for (const part of ["Iris", "Pupil", "Glint"]) offset(ch, n[part + side], n.head, [sx + look[0], sy + look[1], 0]);
    const br = ex.brow ?? 0, tilt = (ex.browTilt ?? 0) * s, asym = side === "L" ? ex.browL ?? 0 : 0;
    offset(ch, n["Brow" + side], n.head, [0, (br + asym) * 0.025, 0]);
    rot(ch, n["Brow" + side], [0, 0, tilt * 14]);
  }
  void talk;
}

// ——— dentro il corpo: sarcomero procedurale ———
const sarcScene = new THREE.Scene(); sarcScene.background = new THREE.Color(0xfdf3e4);
sarcScene.add(new THREE.HemisphereLight(0xfff4e6, 0xb08a60, 1.5)); { const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(3, 5, 6); sarcScene.add(k); }
const toon = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
const sarc = new THREE.Group(); sarcScene.add(sarc);
const ROWS_A = [-1.35, -0.45, 0.45, 1.35], ROWS_M = [-0.9, 0, 0.9];
const zd = [-1, 1].map((sx) => {
  const g = new THREE.Group(); sarc.add(g);
  const pts = []; for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3(k % 2 ? 0.18 : -0.18, -1.9 + k * 0.475, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 64, 0.07, 10), toon(0x2563c9)));
  return { g, sx };
});
const actins = [];
for (const z of zd) for (const y of ROWS_A) for (const d of [-0.25, 0.25]) {
  const g = new THREE.Group(); z.g.add(g); g.position.set(0, y, d);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 12), toon(0x2f7a4c)); m.rotation.z = Math.PI / 2; m.position.x = -z.sx * 1.25; g.add(m);
  const sites = []; for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), toon(0x7a3fb0)); s.position.set(-z.sx * (0.7 + k * 0.45), y < 0 ? 0.06 : -0.06, 0); s.scale.setScalar(0.01); g.add(s); sites.push(s); }
  actins.push({ m, sites });
}
const heads = [];
for (const y of ROWS_M) for (const d of [-0.25, 0.25]) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.6, 16), toon(0xc4471d)); m.rotation.z = Math.PI / 2; m.position.set(0, y, d); sarc.add(m);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) for (const up of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sx * (0.55 + k * 0.45), y + up * 0.12, d); sarc.add(pv);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), toon(0xc4471d)); arm.position.y = up * 0.13; pv.add(arm);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), toon(0xe0683a)); hd.position.y = up * 0.28; pv.add(hd);
    heads.push({ pv, sx, up, ph: rng(Math.round((y + 2) * 100 + k * 13 + (sx + 2) * 7 + (up + 2) * 3 + (d + 1) * 5))() });
  }
}
const ions = []; { const r = rng(42); for (let k = 0; k < 18; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), toon(0xf2c14e)); s.userData = { x: (r() - 0.5) * 4.6, y: 2.6 + r() * 1.5, d: (r() - 0.5) * 0.8, delay: r() * 0.9 }; s.visible = false; sarcScene.add(s); ions.push(s); } }
const sarcCam = new THREE.PerspectiveCamera(32, W / (H * 0.6), 0.1, 50);
function animateSarc(t) {
  const E = { sarc: word("l05", "sarcomero") - 0.5, actin: word("l05", "actina"), myo: word("l05", "miosina"), ca: word("l06", "calcio"), site: word("l06", "siti"), attach: word("l06", "aggancia"), pull: word("l06", "tira"), rel: word("l06", "molla"), cyc: word("l06", "Più") };
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
  return E;
}

// ——— copione: gesti, facce, sguardi ———
const toward = (deg) => deg; // gradi di rotazione testa verso l'altro
const MC = {
  arms: () => [
    [word("l02", "Bello") - 0.1, { R: "hip", L: "hip" }, 0.5],
    [word("l02", "dentro"), { L: "open", R: "hip" }, 0.45],
    [word("l04", "Quasi"), { L: "hip", R: "hip" }, 0.4],
    [word("l04", "Fermi") - 0.35, { R: "whistle", L: "hip" }, 0.3],
    [word("l04", "Entriamo") + 0.2, { R: "idle", L: "idle" }, 0.5],
    [T.sarcIn + 0.2, { L: "pointUp", R: "idle" }, 0.6],
    [word("l06", "tira"), { L: "apart", R: "apart" }, 0.4],
    [word("l06", "Più") + 0.2, { L: "together", R: "together" }, 2.2],
    [T.backIn, { L: "idle", R: "idle" }, 0.5],
    [word("l08", "centravanti"), { L: "point", R: "idle" }, 0.45],
    [word("l09", "Tocca"), { R: "point", L: "idle" }, 0.45],
    [word("l09", "Tre"), { R: "idle", L: "idle" }, 0.5],
    [word("l11", "Bravo"), { L: "hip", R: "hip" }, 0.45],
    [word("l11", "testa") - 0.2, { R: "chin", L: "hip" }, 0.45],
  ],
  head: (t) => {
    const toCam = t > word("l09", "Tocca") - 0.3 && t < endOf("l09") + 0.3 ? -32 * ease(bt(t, word("l09", "Tocca") - 0.3, word("l09", "Tocca"))) : 0;
    const up = t > T.sarcIn && t < T.backIn ? -14 : 0;
    const tilt = t > word("l11", "testa") - 0.3 && t < T.end ? 8 : 0;
    return [up + (t > word("l02", "Bello") && t < endOf("l02") ? 3 : 0), toward(18) + toCam, tilt];
  },
  face: (t) => {
    const f = { smile: 0.12, brow: 0, look: [0, 0] };
    if (t > word("l02", "Bello") && t < endOf("l02")) { f.squint = 0.25; f.browL = 0.7; f.smile = 0.05; } // sopracciglio alzato, impassibile
    if (t > T.sarcIn && t < T.backIn) { f.brow = 0.4; f.smile = 0.35; f.look = [0, 0.006]; }
    if (t > L.l08.start && t < endOf("l08")) { f.squint = 0.2; f.smile = 0.45; f.browL = 0.5; }
    if (t > L.l09.start && t < endOf("l09")) { f.brow = 0.6; f.smile = 0.3; }
    if (t > L.l11.start) { f.squint = 0.3; f.smile = 0.25; f.browL = 0.8; }
    return f;
  },
  lean: (t) => (t > L.l09.start && t < endOf("l09") ? 6 : 0),
};
const LC = {
  arms: () => [
    [0.0, { L: "flex", R: "flex" }, 0.1],
    [word("l01", "potenza") - 0.1, { L: "flex", R: "flex" }, 0.3],
    [endOf("l01") + 0.2, { L: "idle", R: "idle" }, 0.6],
    [word("l03", "Facile"), { L: "open", R: "idle" }, 0.4],
    [word("l03", "elastico") - 0.35, { L: "apart", R: "apart" }, 0.3],
    [word("l03", "elastico") + 0.1, { L: "together", R: "together" }, 0.25],
    [endOf("l03") + 0.3, { L: "idle", R: "idle" }, 0.5],
    [T.sarcIn + 1.0, { R: "chin", L: "idle" }, 0.6],
    [T.backIn - 0.2, { L: "idle", R: "idle" }, 0.4],
    [word("l07", "Scivolano") - 0.15, { L: "open", R: "open" }, 0.35],
    [endOf("l07") + 0.4, { L: "hip", R: "idle" }, 0.5],
    [L.l10.start - 0.15, { L: "up", R: "up" }, 0.3],
    [word("l11", "Ora"), { L: "shrug", R: "shrug" }, 0.4],
    [word("l11", "testa") + 0.1, { L: "idle", R: "idle" }, 0.7],
  ],
  fist: (t) => t < endOf("l01") + 0.2 || (t > L.l10.start - 0.15 && t < word("l11", "Ora")),
  head: (t) => {
    let x = 0, y = -18, z = 0;
    if (t < endOf("l01")) { x = -6; y = 10; z = 6; }
    if (t > T.sarcIn && t < T.backIn) { x = -16; y = -6; }
    if (t > word("l07", "Aspetta") && t < word("l07", "Scivolano")) { z = -9; x = 4; }
    if (t > word("l11", "Ora") && t < T.end) { x = 10; }
    return [x, y, z];
  },
  face: (t) => {
    const f = { smile: 0.3 };
    if (t < endOf("l01") + 0.4) { f.smile = 0.9; f.brow = 0.3; }
    if (t > L.l03.start && t < endOf("l03")) { f.smile = 0.7; f.browL = 0.6; }
    if (t > word("l04", "Quasi") && t < word("l04", "Entriamo")) { f.smile = 0.0; f.frown = 0.4; f.brow = -0.2; }
    if (t > T.sarcIn && t < T.backIn) { f.brow = 0.7; f.smile = 0.2; f.open = 0.1; f.look = [0, 0.008]; }
    if (t > word("l07", "Aspetta") && t < word("l07", "Scivolano")) { f.brow = 0.9; f.browTilt = 0.4; f.smile = 0; }
    if (t > word("l07", "Scivolano") && t < endOf("l08")) { f.brow = 1; f.smile = 0.85; }
    if (t > L.l10.start - 0.15 && t < word("l11", "Ora")) { f.smile = 1; f.brow = 0.8; }
    if (t > word("l11", "Ora")) { f.smile = 0; f.frown = 0.6; f.brow = -0.3; f.lid = 0.25; }
    return f;
  },
  jump: (t) => { const a = L.l10.start - 0.1; const k = bt(t, a, a + 0.55); return k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.22 : 0; },
  lean: (t) => (t > word("l11", "Ora") && t < T.end ? 8 * ease(bt(t, word("l11", "Ora"), word("l11", "Ora") + 0.4)) : t < endOf("l01") ? -6 : 0),
};

// ——— inquadrature ———
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 120);
const look = new THREE.Vector3();
function shot(t) {
  const M = (x, y, z) => [x, y, z];
  const shots = [
    [0, T.l01 - 0.05, (k) => ({ p: M(lerp(1.6, 1.1, k), lerp(0.35, 0.6, k), lerp(-1.5, -4.0, k)), l: M(lerp(0.2, 0.6, k), lerp(0.4, 1.3, k), GOAL_Z), fov: 34 })],
    [T.l01 - 0.05, L.l02.start - 0.15, (k) => ({ p: M(lerp(0.15, 0.22, k), lerp(0.95, 1.05, k), lerp(2.9, 2.55, k)), l: M(0.6, 1.72, 0), fov: 32 })],
    [L.l02.start - 0.15, L.l03.start - 0.15, (k) => ({ p: M(-0.12, 1.95, lerp(2.5, 2.3, k)), l: M(-0.62, 1.86, 0), fov: 28 })],
    [L.l03.start - 0.15, word("l04", "Fermi") - 0.05, (k) => ({ p: M(0.1, 1.45, lerp(6.0, 5.6, k)), l: M(0, 1.25, 0), fov: 30 })],
    [word("l04", "Fermi") - 0.05, T.sarcIn, (k) => { const e = ease(bt(t, word("l04", "Entriamo") - 0.2, T.sarcIn)); return { p: M(lerp(1.4, 0.76, e), lerp(1.5, 0.75, e), lerp(4.4, 0.45, e)), l: M(0.66, lerp(1.4, 0.75, e), 0), fov: 30 }; }],
    [T.sarcIn, T.backIn, () => ({ p: M(0, 1.65, 4.8), l: M(0, 1.6, 0), fov: 30, split: true })],
    [T.backIn, L.l08.start - 0.1, (k) => ({ p: M(0.08, 2.0, lerp(2.15, 1.95, k)), l: M(0.62, 1.96, 0), fov: 28 })],
    [L.l08.start - 0.1, L.l09.start - 0.1, (k) => ({ p: M(-0.15, 1.95, lerp(2.25, 2.1, k)), l: M(-0.62, 1.9, 0), fov: 28 })],
    [L.l09.start - 0.1, L.l10.start - 0.2, (k) => ({ p: M(-0.58, 1.97, lerp(2.3, 1.85, ease(k))), l: M(-0.62, 1.92, 0), fov: 28 })],
    [L.l10.start - 0.2, L.l11.start - 0.1, (k) => ({ p: M(0.5, 1.5, lerp(5.2, 4.9, k)), l: M(0.6, 1.6, 0), fov: 30 })],
    [L.l11.start - 0.1, 999, (k) => ({ p: M(0.05, 1.45, lerp(5.6, 5.2, k)), l: M(0, 1.25, 0), fov: 30 })],
  ];
  for (const [a, b, f] of shots) if (t >= a && t < b) return f(bt(t, a, Math.min(b, a + 6)));
  return shots.at(-1)[2](1);
}

// ——— overlay ———
const $ = (id) => document.getElementById(id);
function pop(el, k) { el.style.opacity = String(clamp(k)); el.style.transform = `translateY(${(1 - back(k)) * 14}px) scale(${0.92 + 0.08 * back(k)})`; }
function subtitle(t) {
  for (const l of TL.lines) {
    if (t >= l.start - 0.05 && t < l.start + l.dur + 0.25) {
      const plain = l.al.chars.join("").replace(/\[[^\]]*\]\s*/g, "").trim();
      return `<b class="${l.who}">${l.who === "M" ? "Marco" : "Luca"}</b>${plain}`;
    }
  }
  return "";
}

// ——— un fotogramma ———
const netPos = netGeo.attributes.position;
window.renderFrame = (t) => {
  // pallone al rallentatore e rete che si gonfia
  const kb = bt(t, 0.2, T.l01 - 0.4);
  const p0 = new THREE.Vector3(0.9, 0.25, -1.2), p1 = new THREE.Vector3(0.9, 1.5, GOAL_Z - 0.9);
  ball.position.lerpVectors(p0, p1, easeOut(kb)); ball.position.y += Math.sin(kb * Math.PI) * 0.9; ball.rotation.x = -t * 9; ball.rotation.z = t * 2;
  if (t > T.l01 + 1.5) ball.position.set(0.3, 0.11, GOAL_Z - 1.6);
  const hit = bt(t, T.l01 - 0.55, T.l01 + 0.6);
  for (let i = 0; i < netPos.count; i++) {
    const x = netBasePos[i * 3], y = netBasePos[i * 3 + 1]; const d = Math.hypot(x - 0.9, y - 0.3);
    netPos.setZ(i, -Math.sin(hit * Math.PI) * Math.exp(-d * d * 0.6) * 0.7);
  }
  net.geometry.dispose(); net.geometry = new THREE.WireframeGeometry(netGeo);

  animate(marco, "M", t, MC);
  animate(luca, "L", t, LC);
  const s = shot(t);
  cam.fov = s.fov; cam.aspect = W / (s.split ? H * 0.4 : H); cam.updateProjectionMatrix();
  cam.position.set(...s.p); look.set(...s.l); cam.lookAt(look);
  renderer.setScissorTest(true);
  const freeze = t > word("l04", "Fermi") && t < T.sarcIn ? 1 : 0;
  $("stage").classList.toggle("freeze", !!freeze);
  if (s.split) {
    animateSarc(t);
    const top = Math.round(H * 0.6);
    renderer.setViewport(0, H - top, W, top); renderer.setScissor(0, H - top, W, top); renderer.render(sarcScene, sarcCam);
    renderer.setViewport(0, 0, W, H - top); renderer.setScissor(0, 0, W, H - top); renderer.render(field, cam);
    $("divider").style.top = top - 3 + "px"; $("divider").style.opacity = "1";
    const E = animateSarc(t);
    pop($("note"), bt(t, T.sarcIn, T.sarcIn + 0.5)); pop($("src"), bt(t, T.sarcIn, T.sarcIn + 0.5));
    pop($("lab-actin"), bt(t, E.actin, E.actin + 0.4)); pop($("lab-myosin"), bt(t, E.myo, E.myo + 0.4));
    pop($("lab-ca"), bt(t, E.ca, E.ca + 0.4) * (1 - bt(t, E.cyc, E.cyc + 0.4))); pop($("lab-site"), bt(t, E.site, E.site + 0.4) * (1 - bt(t, E.cyc, E.cyc + 0.4)));
    pop($("lab-slide"), bt(t, E.cyc + 0.6, E.cyc + 1.0));
  } else {
    renderer.setViewport(0, 0, W, H); renderer.setScissor(0, 0, W, H); renderer.render(field, cam);
    $("divider").style.opacity = "0";
    for (const id of ["note", "src", "lab-actin", "lab-myosin", "lab-ca", "lab-site", "lab-slide"]) $(id).style.opacity = "0";
  }
  renderer.setScissorTest(false);
  // titoli e grafiche
  pop($("tag"), bt(t, 0.3, 0.8) * (1 - bt(t, T.l01 + 1.6, T.l01 + 2.0)));
  $("subtitle").innerHTML = subtitle(t); $("subtitle").style.opacity = $("subtitle").innerHTML && t < T.end ? "1" : "0";
  $("subtitle").style.bottom = s.split ? "22px" : "60px";
  // fischio: lampo + "PAUSA"
  pop($("pause"), freeze * bt(t, word("l04", "Fermi"), word("l04", "Fermi") + 0.25));
  // conto alla rovescia
  const c3 = word("l09", "Tre"), c2 = word("l09", "due"), c1 = word("l09", "uno");
  const cd = t >= c3 && t < L.l10.start ? (t < c2 ? "3" : t < c1 ? "2" : "1") : "";
  $("count").textContent = cd; pop($("count"), cd ? back(bt(t, cd === "3" ? c3 : cd === "2" ? c2 : c1, (cd === "3" ? c3 : cd === "2" ? c2 : c1) + 0.25)) : 0);
  pop($("question"), bt(t, word("l09", "cosa"), word("l09", "cosa") + 0.3) * (1 - bt(t, L.l10.start - 0.1, L.l10.start + 0.15)));
  pop($("answer"), bt(t, L.l10.start + 0.1, L.l10.start + 0.4) * (1 - bt(t, L.l10.start + 1.4, L.l10.start + 1.8)));
  // iride verso la coscia e ritorno
  const close = bt(t, T.sarcIn - 0.45, T.sarcIn - 0.05), open = bt(t, T.sarcIn + 0.05, T.sarcIn + 0.45);
  const close2 = bt(t, T.backIn - 0.35, T.backIn - 0.05), open2 = bt(t, T.backIn + 0.05, T.backIn + 0.4);
  let r = 100; if (t < T.sarcIn + 0.5 && t > T.sarcIn - 0.5) r = t < T.sarcIn ? (1 - ease(close)) * 100 : ease(open) * 100;
  if (t < T.backIn + 0.5 && t > T.backIn - 0.4) r = t < T.backIn ? (1 - ease(close2)) * 100 : ease(open2) * 100;
  $("iris").style.clipPath = `circle(${r}% at 50% 52%)`; $("iris").style.opacity = r >= 99.9 ? "0" : "1";
  // chiusura e scena dopo i titoli
  pop($("endcard"), bt(t, T.end, T.end + 0.4) * (1 - bt(t, T.post - 0.3, T.post)));
  pop($("post"), bt(t, T.post, T.post + 0.4));
  $("curtain").style.opacity = String(Math.max(bt(t, T.end - 0.2, T.end + 0.3) * 0.88, 1 - bt(t, 0, 0.35)));
};
window.READY = true;
