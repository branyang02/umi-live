// Scroll-driven exploded view of the UMI-Live handheld unit.
// Mount: <div class="umi-explode" data-umi-explode data-model="./static/models/umi-explode.glb" data-timeline="./static/models/umi-explode.json"></div>
// Parts move along precomputed, collision-checked keyframe paths (CAD units: mm, Z up).
import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/environments/RoomEnvironment.js';

// Callouts shown once the parts have separated: [key in data.labels, text, short text for phones]
const LABELS = [
  ['lidar', 'LiDAR', 'LiDAR'],
  ['lcd', 'LCD screen', 'LCD'],
  ['buttons', 'Operator-facing buttons', 'Buttons'],
  ['pi', 'Raspberry Pi 5', 'Pi 5'],
  ['camera', 'Camera', 'Camera'],
  ['aruco', 'ArUco tag locations', 'ArUco tags'],
  ['fingers', 'Redesigned gripper fingers', 'Fingers'],
  ['battery', 'Removable battery module', 'Battery'],
];
const LABEL_IN = [0.9, 0.95];   // scroll progress over which the callouts fade in

const ease = (x) => { x = Math.min(Math.max(x, 0), 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

function interp(keys, t, out) {
  if (t <= keys[0][0]) return out.fromArray(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) {
      const f = t1 > t0 ? ease((t - t0) / (t1 - t0)) : 1;
      return out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    }
  }
  return out.fromArray(keys[keys.length - 1][1]);
}
function interp1(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) return a + (b - a) * (t1 > t0 ? ease((t - t0) / (t1 - t0)) : 1);
  }
  return keys[keys.length - 1][1];
}
export async function mountExplode(host, opts = {}) {
  const D = opts.data || await (await fetch(host.dataset.timeline)).json();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  host.innerHTML = `
    <div class="umi-explode__stage">
      <canvas class="umi-explode__canvas" role="img" aria-label="3D model of the UMI-Live handheld unit that separates into its components as you scroll"></canvas>
      <svg class="umi-explode__leaders" aria-hidden="true"></svg>
      <div class="umi-explode__labels"></div>
      <div class="umi-explode__hint"><span class="umi-explode__hint-text">Scroll to take it apart</span><span class="umi-explode__bar"><i></i></span></div>
      <p class="umi-explode__status" role="status">Loading 3D model…</p>
    </div>`;
  const stage = host.querySelector('.umi-explode__stage');
  const canvas = host.querySelector('canvas');
  const bar = host.querySelector('.umi-explode__bar i');
  const hintText = host.querySelector('.umi-explode__hint-text');
  const status = host.querySelector('.umi-explode__status');
  const svg = host.querySelector('.umi-explode__leaders');
  const labelLayer = host.querySelector('.umi-explode__labels');

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.035).texture;
  const camera = new THREE.PerspectiveCamera(24, 1, 5, 8000);
  const key = new THREE.DirectionalLight(0xffffff, 1.1); scene.add(key);
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root); // CAD is Z-up
  const toWorld = (v, out) => out.set(v.x, v.z, -v.y);

  // ---------- callouts ----------
  // Each label sits in a column just outside the model on the side nearest its part, at the part's height,
  // joined by a short horizontal leader (with a small elbow only when labels have to make room for each other).
  const NS = 'http://www.w3.org/2000/svg';
  const callouts = LABELS.filter(([k]) => D.labels && D.labels[k]).map(([k, text, short]) => {
    const el = document.createElement('div'); el.className = 'umi-explode__label';
    el.innerHTML = `<span class="long">${text}</span><span class="short">${short}</span>`;
    labelLayer.appendChild(el);
    const path = document.createElementNS(NS, 'path'); path.setAttribute('class', 'umi-explode__leader'); svg.appendChild(path);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '3.5'); dot.setAttribute('class', 'umi-explode__dot'); svg.appendChild(dot);
    const pts = D.labels[k].map(([g, a]) => ({ g, a: new THREE.Vector3(...a) }));
    return { el, path, dot, pts, ai: 0, side: 1, x: 0, y: 0, dx: 0, dy: 0, w: 120, h: 20 };
  });
  const labelsIn = (t) => ease(clamp01((t - LABEL_IN[0]) / (LABEL_IN[1] - LABEL_IN[0])));
  let labelRoom = 0, labelPad = 28;   // px each side needs for the widest label plus its leader; model-to-text gap

  // ---------- state ----------
  const groups = {}; const fasteners = []; let fastMat = null;
  const tmp = new THREE.Vector3(), v2 = new THREE.Vector3(), corner = new THREE.Vector3(), wc = new THREE.Vector3();
  const box = new THREE.Box3(), gb = new THREE.Box3();
  const R = new THREE.Matrix4(), pv = new THREE.Vector3();

  function offsetOf(g, t, out) { return D.keys[g] ? interp(D.keys[g], t, out) : out.set(0, 0, 0); }
  function boundsAt(t) {
    box.makeEmpty();
    for (const g in D.bounds) {
      const b = D.bounds[g]; const p = D.latch[g] ? offsetOf(D.latch[g].parent, t, tmp) : offsetOf(g, t, tmp);
      gb.min.set(b[0][0] + p.x, b[0][1] + p.y, b[0][2] + p.z); gb.max.set(b[1][0] + p.x, b[1][1] + p.y, b[1][2] + p.z); box.union(gb);
    }
    return box;
  }

  // ---------- layout ----------
  let W = 1, H = 1, narrow = false;
  function layout() {
    const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    narrow = W < 640;
    host.classList.toggle('is-narrow', narrow);
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // label text scales with the stage so it stays in proportion to the model
    const fs = Math.max(narrow ? 9 : 10, Math.min(17, Math.min(W, H * 1.6) * 0.0125));
    host.style.setProperty('--ux-label-size', fs.toFixed(2) + 'px');
    for (const c of callouts) c.dot.setAttribute('r', Math.max(2.4, Math.min(3.5, fs * 0.22)).toFixed(2));
    labelRoom = 0;
    for (const c of callouts) { c.w = c.el.offsetWidth || 120; c.h = c.el.offsetHeight || 20; labelRoom = Math.max(labelRoom, c.w); }
    labelRoom += Math.round(fs * (narrow ? 2.2 : 3.4));
    labelPad = Math.round(fs * (narrow ? 1.1 : 1.7));
    assignSides();
    dirty = true;
  }

  // ---------- camera ----------
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), look = new THREE.Vector3(), center = new THREE.Vector3();
  function placeCamera(t, px, py) {
    const e = ease(clamp01((t - 0.06) / 0.8));
    const az = THREE.MathUtils.degToRad((narrow ? 66 - 34 * e : 46 - 26 * e) + px * 5), el = THREE.MathUtils.degToRad(17 - 7 * e - py * 3);
    toWorld(v2.set(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)), fwd).normalize();
    boundsAt(t); box.getCenter(center); toWorld(center, look);
    up.set(0, 1, 0); right.crossVectors(up, fwd).normalize(); up.crossVectors(fwd, right).normalize();
    // fit to the projected corners of every part's own box (tighter than one box around everything)
    let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity, hd = 0;
    for (const g in D.bounds) {
      const b = D.bounds[g]; const p = D.latch[g] ? offsetOf(D.latch[g].parent, t, tmp) : offsetOf(g, t, tmp);
      for (let i = 0; i < 8; i++) {
        corner.set((i & 1 ? b[1][0] : b[0][0]) + p.x, (i & 2 ? b[1][1] : b[0][1]) + p.y, (i & 4 ? b[1][2] : b[0][2]) + p.z);
        toWorld(corner, wc).sub(look);
        const r = wc.dot(right), u = wc.dot(up);
        r0 = Math.min(r0, r); r1 = Math.max(r1, r); u0 = Math.min(u0, u); u1 = Math.max(u1, u); hd = Math.max(hd, Math.abs(wc.dot(fwd)));
      }
    }
    look.addScaledVector(right, (r0 + r1) / 2).addScaledVector(up, (u0 + u1) / 2);
    const hw = (r1 - r0) / 2, hh = (u1 - u0) / 2;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // make room for the callout columns as they arrive
    const side = Math.max(16, W * (narrow ? 0.04 : 0.12));
    const usableW = W - 2 * (side + Math.max(0, labelRoom + 16 - side) * labelsIn(t));
    const usableH = H * (narrow ? 0.78 : 0.8);
    const dist = Math.max(hh / (tanV * usableH / H), hw / (tanV * usableW / H)) + hd;
    camera.position.copy(fwd).multiplyScalar(dist).add(look);
    // keep the depth range tight around the model so nearly coincident CAD faces don't flicker
    camera.near = Math.max(1, dist - hd * 1.5 - 40); camera.far = dist + hd * 1.5 + 40; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0); camera.lookAt(look);
    key.position.copy(camera.position).addScaledVector(right, -dist * 0.6).addScaledVector(up, dist * 0.8);
  }
  function project(vModel, out) { toWorld(vModel, wc).project(camera); return out.set((wc.x * 0.5 + 0.5) * W, (-wc.y * 0.5 + 0.5) * H, 0); }
  // screen-space horizontal extent of the model at time t (camera must already be placed)
  function screenExtent(t) {
    let x0 = Infinity, x1 = -Infinity;
    for (const g in D.bounds) {
      const b = D.bounds[g]; const p = D.latch[g] ? offsetOf(D.latch[g].parent, t, tmp) : offsetOf(g, t, tmp);
      for (let i = 0; i < 8; i++) {
        corner.set((i & 1 ? b[1][0] : b[0][0]) + p.x, (i & 2 ? b[1][1] : b[0][1]) + p.y, (i & 4 ? b[1][2] : b[0][2]) + p.z);
        const sx = project(corner, v2).x; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
      }
    }
    return [x0, x1];
  }
  // each label goes on the side of the model nearest its part, decided once from the final pose
  function assignSides() {
    if (!callouts.length) return;
    placeCamera(1, 0, 0);
    const [x0, x1] = screenExtent(1);
    for (const c of callouts) {
      const xs = c.pts.map(p => { offsetOf(p.g, 1, tmp); return project(v2.copy(p.a).add(tmp), corner).x; });
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      c.side = (mean - x0) < (x1 - mean) ? -1 : 1;
      c.ai = xs.indexOf(c.side < 0 ? Math.min(...xs) : Math.max(...xs));   // the part nearest that side
    }
  }
  function updateCallouts(t) {
    const op = labelsIn(t);
    svg.style.opacity = labelLayer.style.opacity = op.toFixed(3);
    if (op <= 0) return;
    const [x0, x1] = screenExtent(t);
    for (const c of callouts) {
      const p = c.pts[c.ai]; offsetOf(p.g, t, tmp); project(v2.copy(p.a).add(tmp), corner);
      c.dx = corner.x; c.dy = corner.y; c.y = c.dy;
    }
    const top = narrow ? 40 : 48, bottom = H - (narrow ? 84 : 92), gap = narrow ? 6 : 10;
    for (const s of [-1, 1]) {
      const col = callouts.filter(c => c.side === s).sort((a, b) => a.y - b.y);
      for (let i = 0; i < col.length; i++) { col[i].y = Math.max(col[i].y, top + col[i].h / 2); if (i) col[i].y = Math.max(col[i].y, col[i - 1].y + (col[i - 1].h + col[i].h) / 2 + gap); }
      for (let i = col.length - 1; i >= 0; i--) { col[i].y = Math.min(col[i].y, bottom - col[i].h / 2); if (i < col.length - 1) col[i].y = Math.min(col[i].y, col[i + 1].y - (col[i + 1].h + col[i].h) / 2 - gap); }
    }
    const pad = Math.max(10, labelPad);   // space between the model and the start of the text
    for (const c of callouts) {
      // text edge that faces the model
      const edge = c.side < 0 ? Math.max(c.w + 8, x0 - pad) : Math.min(W - c.w - 8, x1 + pad);
      const left = c.side < 0 ? edge - c.w : edge;
      c.el.style.transform = `translate(${left}px, ${c.y - c.h / 2}px)`;
      c.el.classList.toggle('is-right', c.side > 0);
      const end = edge - c.side * 6;                      // leader stops just short of the text
      const knee = end - c.side * (narrow ? 8 : 18);      // any elbow sits just before the text
      const d = Math.abs(c.y - c.dy) < 0.5
        ? `M${c.dx},${c.dy} L${end},${c.y}`
        : `M${c.dx},${c.dy} L${knee},${c.dy} L${end},${c.y}`;
      c.path.setAttribute('d', d);
      c.dot.setAttribute('cx', c.dx); c.dot.setAttribute('cy', c.dy);
    }
  }

  // ---------- scroll ----------
  let target = 0, prog = 0, dirty = true, px = 0, py = 0, tpx = 0, tpy = 0, visible = true;
  function readScroll() {
    const r = host.getBoundingClientRect(); const len = host.offsetHeight - innerHeight;
    target = clamp01(-r.top / Math.max(1, len));
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { layout(); readScroll(); });
  host.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; tpx = e.clientX / innerWidth - 0.5; tpy = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) dirty = true; }).observe(host);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !fastMat) return;
    const dp = target - prog; prog += Math.abs(dp) < 1e-5 || reduce ? dp : dp * 0.12;
    px += (tpx - px) * 0.06; py += (tpy - py) * 0.06;
    const still = Math.abs(dp) < 1e-5 && Math.abs(tpx - px) < 1e-4 && Math.abs(tpy - py) < 1e-4;
    if (!dirty && still) return;
    dirty = false;
    const t = prog;

    for (const g in groups) {
      const L = D.latch[g];
      if (L) {
        offsetOf(L.parent, t, tmp); const ang = THREE.MathUtils.degToRad(interp1(L.keys, t));
        pv.fromArray(L.pivot); R.makeRotationX(ang); v2.copy(pv).applyMatrix4(R);
        for (const o of groups[g]) { o.rotation.set(ang, 0, 0); o.position.copy(tmp).add(pv).sub(v2); }
      } else { offsetOf(g, t, tmp); for (const o of groups[g]) o.position.copy(tmp); }
    }
    const fu = t / D.fastEnd;
    const op = 1 - ease(clamp01((fu - 0.35) / 0.65));
    fastMat.opacity = op; fastMat.depthWrite = op > 0.98;
    const mu = ease(clamp01(fu / 0.8));
    for (const f of fasteners) { f.o.visible = op > 0.003; if (f.d) f.o.position.copy(f.d).multiplyScalar(f.l * mu); }

    placeCamera(t, px, py);
    renderer.render(scene, camera);
    updateCallouts(t);
    bar.style.transform = `scaleX(${t.toFixed(4)})`;
    hintText.textContent = t > 0.97 ? 'Scroll up to reassemble' : 'Scroll to take it apart';
  }

  // ---------- load ----------
  const onModel = (gltf) => {
    gltf.scene.traverse((o) => {
      if (o.name?.startsWith('G_')) { const g = o.name.slice(2).split('__')[0]; (groups[g] ??= []).push(o); }
      if (o.name?.startsWith('F_')) { const f = D.fast[o.name.slice(2)]; fasteners.push({ o, d: f ? new THREE.Vector3(...f.d) : null, l: f ? f.l : 0 }); }
    });
    for (const f of fasteners) f.o.traverse((m) => { if (m.isMesh) { fastMat ??= m.material.clone(); m.material = fastMat; } });
    fastMat ??= new THREE.MeshStandardMaterial();
    fastMat.transparent = true;
    root.add(gltf.scene);
    status.remove(); host.classList.add('is-ready');
    layout(); readScroll(); prog = target; dirty = true;
  };
  const onError = () => { status.textContent = 'The 3D model could not be loaded.'; };
  const loader = new GLTFLoader();
  if (opts.model instanceof ArrayBuffer) loader.parse(opts.model, '', onModel, onError);
  else loader.load(opts.model || host.dataset.model, onModel, undefined, onError);

  layout(); readScroll(); requestAnimationFrame(frame);
}

for (const el of document.querySelectorAll('[data-umi-explode][data-model]')) mountExplode(el);
