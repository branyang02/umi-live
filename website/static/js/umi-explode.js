// Scroll-driven exploded view of the UMI-Live handheld unit.
// Mount: <div class="umi-explode" data-umi-explode data-model="./static/models/umi-explode.glb" data-timeline="./static/models/umi-explode.json"></div>
// Parts move along precomputed, collision-checked keyframe paths (CAD units: mm, Z up).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
const LABEL_SPAN = 0.07;                // scroll progress each callout takes to draw in
const LABEL_WINDOW = [0.24, 0.86];      // callout entrances are spread evenly across this part of the scroll

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
function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// Leaves the host's static fallback figure in place when motion is reduced, WebGL is missing,
// or the data or model can't be loaded.
export async function mountExplode(host, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ((reduce && !opts.force) || !webglAvailable()) return;
  let D = opts.data;
  if (!D) {
    try { D = await (await fetch(host.dataset.timeline)).json(); } catch { return; }
  }
  const fallbackHTML = host.innerHTML;
  host.classList.add('is-live');

  host.innerHTML = `
    <div class="umi-explode__stage">
      <canvas class="umi-explode__canvas" role="img" aria-label="3D model of the UMI-Live handheld unit that separates into its components as you scroll"></canvas>
      <svg class="umi-explode__leaders" aria-hidden="true"></svg>
      <div class="umi-explode__labels"></div>
      <div class="umi-explode__hint" aria-hidden="true"><span class="umi-explode__bar"><i></i></span></div>
      <p class="umi-explode__status" role="status">Loading 3D model…</p>
    </div>`;
  const stage = host.querySelector('.umi-explode__stage');
  const canvas = host.querySelector('canvas');
  const bar = host.querySelector('.umi-explode__bar i');
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
    el.style.opacity = '0';
    labelLayer.appendChild(el);
    const path = document.createElementNS(NS, 'path'); path.setAttribute('class', 'umi-explode__leader'); svg.appendChild(path);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '0'); dot.setAttribute('class', 'umi-explode__dot'); svg.appendChild(dot);
    path.style.opacity = dot.style.opacity = '0';
    const pts = D.labels[k].map(([g, a]) => ({ g, a: new THREE.Vector3(...a) }));
    return { el, path, dot, pts, ai: 0, side: 1, x: 0, y: 0, dx: 0, dy: 0, w: 120, h: 20 };
  });
  svg.style.opacity = labelLayer.style.opacity = '1';
  // when each callout's part reaches its final position (last keyframe of its motion)
  for (const c of callouts) c.lands = Math.max(...c.pts.map(p => D.keys[p.g] ? D.keys[p.g][D.keys[p.g].length - 1][0] : 0));
  // order callouts by how soon their part lands, then give them evenly spaced entrances;
  // a label that arrives before its part has landed simply rides along with it
  [...callouts].sort((a, b) => a.lands - b.lands).forEach((c, i, arr) => {
    c.start = LABEL_WINDOW[0] + (arr.length > 1 ? i / (arr.length - 1) : 0) * (LABEL_WINDOW[1] - LABEL_WINDOW[0]);
  });
  const firstStart = callouts.length ? Math.min(...callouts.map(c => c.start)) : 1;
  // the view eases out to make room for the label columns as the first callouts arrive
  const labelsIn = (t) => ease(clamp01((t - firstStart) / 0.2));
  const backOut = (x) => { const k = 1.7; x -= 1; return x * x * ((k + 1) * x + k) + 1; };
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
    for (const c of callouts) c.r = Math.max(2.4, Math.min(3.5, fs * 0.22));
    labelRoom = 0;
    for (const c of callouts) { c.w = c.el.offsetWidth || 120; c.h = c.el.offsetHeight || 20; labelRoom = Math.max(labelRoom, c.w); }
    labelRoom += Math.round(fs * (narrow ? 2.2 : 3.4));
    labelPad = Math.round(fs * (narrow ? 1.4 : 2.4));
    assignSides();
    dirty = true;
  }

  // ---------- camera ----------
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), look = new THREE.Vector3(), center = new THREE.Vector3();
  // scroll sets a slowly swinging base view; dragging adds an orbit offset on top (degrees)
  function placeCamera(t, dAz = 0, dEl = 0, zoom = 1) {
    const e = ease(clamp01((t - 0.06) / 0.8));
    const az = THREE.MathUtils.degToRad((narrow ? 66 - 34 * e : 46 - 26 * e) + dAz);
    const el = THREE.MathUtils.degToRad(Math.min(75, Math.max(-12, 17 - 7 * e + dEl)));
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
    const dist = (Math.max(hh / (tanV * usableH / H), hw / (tanV * usableW / H)) + hd) * zoom;
    camera.position.copy(fwd).multiplyScalar(dist).add(look);
    // keep the depth range tight around the model so nearly coincident CAD faces don't flicker
    camera.near = Math.max(1, dist - hd * 1.5 - 40); camera.far = dist + hd * 1.5 + 40; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0); camera.lookAt(look);
    camera.updateMatrixWorld();   // so projections made before the next render use this pose
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
  // initial sides from the default final view; updateCallouts keeps them right as the view turns
  function assignSides() {
    if (!callouts.length) return;
    placeCamera(1, 0, 0);
    const [x0, x1] = screenExtent(1);
    for (const c of callouts) {
      const xs = c.pts.map(p => { offsetOf(p.g, 1, tmp); return project(v2.copy(p.a).add(tmp), corner).x; });
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      c.side = (mean - x0) < (x1 - mean) ? -1 : 1;
      c.ai = xs.indexOf(c.side < 0 ? Math.min(...xs) : Math.max(...xs));   // the part nearest that side
      c.flipAt = -1e9;
    }
  }
  const FLIP_MS = 260;   // a label that changes sides fades back in over this long
  function updateCallouts(t) {
    if (labelsIn(t) <= 0) {
      for (const c of callouts) { c.el.style.opacity = '0'; c.path.style.opacity = '0'; c.dot.style.opacity = '0'; c.shown = 0; }
      return;
    }
    const [x0, x1] = screenExtent(t);
    // Sides are judged from where each part ends up (final pose) as seen from the current camera,
    // so labels stay put while scrolling and only swap when dragging turns the model around.
    const [f0, f1] = screenExtent(1);
    const xc = (f0 + f1) / 2, hyst = (f1 - f0) * 0.04, now = performance.now();
    flipping = false;
    for (const c of callouts) {
      const fin = c.pts.map(p => { offsetOf(p.g, 1, tmp); return project(v2.copy(p.a).add(tmp), corner).x; });
      const mean = fin.reduce((a, x) => a + x, 0) / fin.length;
      const want = c.side < 0 ? (mean > xc + hyst ? 1 : -1) : (mean < xc - hyst ? -1 : 1);
      if (want !== c.side) { c.side = want; c.flipAt = now; }
      let best = 0; fin.forEach((x, i) => { if (c.side * x > c.side * fin[best]) best = i; });
      c.ai = best;
      const p = c.pts[best]; offsetOf(p.g, t, tmp); project(v2.copy(p.a).add(tmp), corner);
      c.dx = corner.x; c.dy = corner.y; c.y = c.dy;
      c.flip = clamp01((now - c.flipAt) / FLIP_MS);
      if (c.flip < 1) flipping = true;
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
      // staged entrance: dot pops on the part, the leader draws out to the column, then the text slides in
      const k = clamp01((t - c.start) / LABEL_SPAN);
      const kDot = clamp01(k / 0.3), kLine = ease(clamp01((k - 0.12) / 0.5)) * ease(c.flip), kText = ease(clamp01((k - 0.45) / 0.55)) * ease(c.flip);
      const slide = (1 - kText) * (narrow ? 8 : 16) * c.side;
      c.el.style.transform = `translate(${left + slide}px, ${c.y - c.h / 2}px)`;
      c.el.style.opacity = kText.toFixed(3);
      c.el.classList.toggle('is-right', c.side > 0);
      const end = edge - c.side * 6;                      // leader stops just short of the text
      const knee = end - c.side * (narrow ? 8 : 18);      // any elbow sits just before the text
      // leader polyline, drawn out from the dot by kLine of its length (geometry, not dash styles,
      // so the browser repaints it cleanly every frame)
      const pts = Math.abs(c.y - c.dy) < 0.5 ? [[c.dx, c.dy], [end, c.y]] : [[c.dx, c.dy], [knee, c.dy], [end, c.y]];
      let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let left2 = total * kLine, d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length && left2 > 0; i++) {
        const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), f = Math.min(1, left2 / (sl || 1));
        d += ` L${(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f).toFixed(1)},${(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f).toFixed(1)}`;
        left2 -= sl;
      }
      c.path.setAttribute('d', kLine > 0 ? d : 'M0,0');
      c.path.style.opacity = kLine > 0 ? '1' : '0';
      c.dot.setAttribute('cx', c.dx); c.dot.setAttribute('cy', c.dy);
      c.dot.setAttribute('r', (c.r * (kDot > 0 ? backOut(kDot) : 0)).toFixed(2));
      c.dot.style.opacity = kDot > 0 ? '1' : '0';
    }
  }

  // ---------- scroll ----------
  let target = 0, prog = 0, dirty = true, visible = true, flipping = false;
  // ---------- drag to orbit ----------
  // Mouse drags orbit both ways; touch drags orbit sideways only, so vertical swipes still scroll the page.
  let orbAz = 0, orbEl = 0, velAz = 0, velEl = 0, drag = null, resetting = false, zoomFix = 1;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', moved: false };
    velAz = velEl = 0; resetting = false;
    canvas.setPointerCapture(e.pointerId); host.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    const k = 180 / Math.max(480, Math.min(W, 1400));   // about half a turn per screen width
    velAz = -dx * k; velEl = drag.touch ? 0 : dy * k * 0.8;
    orbAz += velAz; orbEl = Math.min(58, Math.max(-28, orbEl + velEl));
    dirty = true;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null; host.classList.remove('is-dragging');
    if (reduce) velAz = velEl = 0;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('dblclick', () => { resetting = true; velAz = velEl = 0; dirty = true; });   // back to the default view
  function readScroll() {
    const r = host.getBoundingClientRect(); const len = host.offsetHeight - innerHeight;
    target = clamp01(-r.top / Math.max(1, len));
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { layout(); readScroll(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) dirty = true; }).observe(host);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !fastMat) return;
    const dp = target - prog; prog += Math.abs(dp) < 1e-5 || reduce ? dp : dp * 0.12;
    // coast after a flick, or glide home after a double-click
    if (!drag && (Math.abs(velAz) > 0.01 || Math.abs(velEl) > 0.01)) {
      orbAz += velAz; orbEl = Math.min(58, Math.max(-28, orbEl + velEl)); velAz *= 0.92; velEl *= 0.92;
    } else if (!drag) { velAz = velEl = 0; }
    if (resetting) {
      orbAz = ((orbAz % 360) + 540) % 360 - 180;   // take the short way round
      orbAz *= 0.85; orbEl *= 0.85;
      if (Math.abs(orbAz) < 0.05 && Math.abs(orbEl) < 0.05) { orbAz = orbEl = 0; resetting = false; }
    }
    const still = Math.abs(dp) < 1e-5 && !drag && velAz === 0 && velEl === 0 && !resetting && !flipping;
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

    // Fit, then check the model's real on-screen width against the room the labels need and back
    // the camera off if it would crowd them (the box-based fit can under-estimate after a drag).
    placeCamera(t, orbAz, orbEl, zoomFix);
    {
      const [x0, x1] = screenExtent(t);
      const need = Math.max(16, W * 0.03) + (labelRoom + Math.max(10, labelPad)) * labelsIn(t);
      const avail = Math.max(40, W / 2 - need), half = Math.max(W / 2 - x0, x1 - W / 2);
      const want = Math.min(3, Math.max(1, zoomFix * half / avail));
      if (Math.abs(want - zoomFix) > 1e-3) {
        zoomFix = want > zoomFix ? want : zoomFix + (want - zoomFix) * 0.25;   // back off at once, ease back in
        placeCamera(t, orbAz, orbEl, zoomFix);
        dirty = true;
      }
    }
    renderer.render(scene, camera);
    updateCallouts(t);
    bar.style.transform = `scaleX(${t.toFixed(4)})`;
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
  const onError = () => { host.classList.remove('is-live', 'is-ready'); host.innerHTML = fallbackHTML; visible = false; };
  const loader = new GLTFLoader();
  if (opts.model instanceof ArrayBuffer) loader.parse(opts.model, '', onModel, onError);
  else loader.load(opts.model || host.dataset.model, onModel, undefined, onError);

  layout(); readScroll(); requestAnimationFrame(frame);
}

for (const el of document.querySelectorAll('[data-umi-explode][data-model]')) mountExplode(el);
