// Scroll-driven exploded view of the UMI-Live CAD: scrolling down through the section pulls the
// modules apart, scrolling back up puts them together. The stage is sticky for a short stretch only,
// and the static exploded figure stays in place when motion is reduced or WebGL is unavailable.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const section = document.querySelector("#hardware-components");
const track = section && section.querySelector(".explode-track");
const stage = track && track.querySelector(".explode-stage");
const canvas = stage && stage.querySelector("canvas");
const labelLayer = stage && stage.querySelector(".explode-labels");
const hint = stage && stage.querySelector(".explode-hint span");
// Version tags: GitHub Pages lets browsers reuse files for 10 minutes, so bump these with the assets.
const MODEL_URL = "./static/models/umi-live-cad.glb?v=20261025-v3";
const LAYOUT_URL = "./static/models/umi-live-explode.json?v=20261025-v3";

// Fraction of the pinned scroll spent assembled (start) and fully exploded (end).
const HOLD_START = 0.06;
const HOLD_END = 0.14;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (error) {
    return false;
  }
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (section && track && stage && canvas && labelLayer && webglAvailable() && !reduceMotion.matches) {
  section.classList.add("explode-ready");
  let started = false;
  const observer = new IntersectionObserver((entries) => {
    if (!started && entries.some((entry) => entry.isIntersecting)) {
      started = true;
      observer.disconnect();
      start().catch((error) => {
        console.error("Exploded view failed to load:", error);
        section.classList.remove("explode-ready");
      });
    }
  }, { rootMargin: "120% 0px" });
  observer.observe(section);
}

const smoother = (t) => t * t * t * (t * (6 * t - 15) + 10);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;

async function start() {
  const [gltf, layout] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL),
    fetch(LAYOUT_URL).then((response) => response.json())
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0xffffff, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-0.6, 1.2, 0.8);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0xdfe6e4, 0.6));

  // One group per module, keyed by the "<module>__<material>" node names from the export.
  const modules = {};
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const id = object.name.split("__")[0];
    const info = layout.modules[id];
    if (!info) return;
    if (!modules[id]) {
      const group = new THREE.Group();
      scene.add(group);
      // Each part follows a list of moves, each over its own window of the explode progress;
      // `offset` is where all of them together leave it.
      const moves = info.moves.map((m) => ({ offset: new THREE.Vector3(...m.offset), start: m.start, end: m.end }));
      const offset = moves.reduce((sum, m) => sum.add(m.offset), new THREE.Vector3());
      modules[id] = { group, info, moves, offset };
    }
    object.material.side = THREE.DoubleSide;
    modules[id].group.add(object.clone());
  });

  // Camera target: centres of the assembled and the fully exploded layouts.
  const boxOf = (exploded) => {
    const box = new THREE.Box3();
    for (const { info, offset } of Object.values(modules)) {
      const lo = new THREE.Vector3(...info.bbox[0]);
      const hi = new THREE.Vector3(...info.bbox[1]);
      if (exploded) { lo.add(offset); hi.add(offset); }
      box.expandByPoint(lo).expandByPoint(hi);
    }
    return box;
  };
  const assembled = boxOf(false).getBoundingSphere(new THREE.Sphere());
  const exploded = boxOf(true).getBoundingSphere(new THREE.Sphere());

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  const target = new THREE.Vector3();

  // Labels. Wide screens: a dot on the part, a leader line, and the name off to the side.
  // Phones: a numbered marker on the part and a legend under the device.
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "explode-leaders");
  labelLayer.append(svg);
  const legend = document.createElement("ol");
  legend.className = "explode-legend";
  labelLayer.append(legend);
  const labels = Object.entries(modules)
    .filter(([, m]) => m.info.label)
    .sort(([, a], [, b]) => b.info.centre[1] + b.offset.y - (a.info.centre[1] + a.offset.y))  // top to bottom
    .map(([id, m], i) => {
      const text = document.createElement("span");
      text.className = "explode-label";
      text.textContent = m.info.label;
      const badge = document.createElement("span");
      badge.className = "explode-num";
      badge.textContent = i + 1;
      labelLayer.append(text, badge);
      const item = document.createElement("li");
      item.innerHTML = `<span class="explode-num">${i + 1}</span>`;
      item.append(m.info.label);
      legend.append(item);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", "3");
      svg.append(line, dot);
      return { id, module: m, text, badge, line, dot };
    });

  let width = 0;
  let height = 0;
  let narrow = false;
  let legendHeight = 0;
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    narrow = width < 640;
    stage.classList.toggle("explode-stage--narrow", narrow);
    legendHeight = narrow ? legend.offsetHeight + 64 : 0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    // label sizes are fixed while scrolling, so measure them here rather than every frame
    for (const label of labels) {
      label.w = label.text.offsetWidth;
      label.h = label.text.offsetHeight;
    }
  }

  function progress() {
    const rect = track.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    return span > 0 ? clamp01(-rect.top / span) : 0;
  }

  const anchor = new THREE.Vector3();
  const corner = new THREE.Vector3();
  function render(p) {
    const e = clamp01((p - HOLD_START) / (1 - HOLD_START - HOLD_END));

    for (const m of Object.values(modules)) {
      m.group.position.set(0, 0, 0);
      for (const move of m.moves) {
        move.local = smoother(clamp01((e - move.start) / Math.max(move.end - move.start, 1e-3)));
        m.group.position.addScaledVector(move.offset, move.local);
      }
      // label timing: parts that move show theirs once their last move lands, parts that stay near the end
      m.local = m.moves.length ? m.moves[m.moves.length - 1].local : e;
    }

    stage.style.setProperty("--explode-progress", e.toFixed(4));
    if (hint) hint.textContent = e < 0.97 ? "Scroll to take it apart" : "Scroll up to reassemble";

    // Camera: a slow quarter turn while the parts separate, pulled back just enough that every part
    // stays inside the frame (less the label columns at the sides).
    const k = smoother(e);
    const az = THREE.MathUtils.degToRad(lerp(-68, -42, k));
    const el = THREE.MathUtils.degToRad(lerp(14, 20, k));
    target.copy(assembled.center).lerp(exploded.center, k);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    camera.position.copy(target).add(dir);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    // On phones the legend takes the bottom of the stage: fit above it and shift the image up.
    const legendRoom = legendHeight * k;
    camera.setViewOffset(width, height, 0, legendRoom / 2, width, height);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 0.9 * (1 - legendRoom / height);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 0.9 * camera.aspect * lerp(0.95, narrow ? 0.92 : 0.6, k);
    const view = camera.matrixWorldInverse;
    let dist = 0;
    for (const m of Object.values(modules)) {
      const [lo, hi] = m.info.bbox;
      for (let c = 0; c < 8; c++) {
        corner.set(c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]).add(m.group.position).applyMatrix4(view);
        // the camera sits 1 unit back along dir; a corner nearer than the target (z > -1) needs more room
        const zc = corner.z + 1;
        dist = Math.max(dist, Math.abs(corner.x) / tanH + zc, Math.abs(corner.y) / tanV + zc);
      }
    }
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);

    // Labels sit in a column on each side of the device, in the order of their parts, spread
    // apart so they never overlap; a leader runs from each part to its label.
    const centre = target.clone().project(camera);
    const cx = (centre.x * 0.5 + 0.5) * width;
    const columnGap = Math.min(width * 0.27, 420);
    const gap = 12;
    const sides = { left: [], right: [] };
    for (const label of labels) {
      const { module: m } = label;
      anchor.set(...m.info.centre).add(m.group.position).project(camera);
      label.x = (anchor.x * 0.5 + 0.5) * width;
      label.y = (-anchor.y * 0.5 + 0.5) * height;
      label.alpha = clamp01((m.local - 0.7) / 0.3);
      sides[label.x < cx ? "left" : "right"].push(label);
    }
    legend.style.opacity = narrow ? clamp01((e - 0.8) / 0.2) : 0;
    for (const label of labels) {
      label.badge.style.opacity = narrow ? label.alpha : 0;
      label.badge.style.transform = `translate(${label.x}px, ${label.y}px) translate(-50%, -50%)`;
      if (narrow) {
        label.text.style.opacity = 0;
        label.line.style.opacity = 0;
        label.dot.style.opacity = 0;
      }
    }
    for (const [side, list] of narrow ? [] : Object.entries(sides)) {
      list.sort((a, b) => a.y - b.y);
      const step = (a, b) => (a.h + b.h) / 2 + gap;  // centre-to-centre distance for two labels
      list.forEach((label, i) => { label.ty = Math.max(label.y, i ? list[i - 1].ty + step(list[i - 1], label) : 24); });
      for (let i = list.length - 1; i >= 0; i--) {  // pull back up if the column ran off the bottom
        const limit = i === list.length - 1 ? height - 24 : list[i + 1].ty - step(list[i], list[i + 1]);
        list[i].ty = Math.min(list[i].ty, limit);
      }
      const left = side === "left";
      for (const label of list) {
        const w = label.w;
        const tx = left ? cx - columnGap : cx + columnGap;
        const textX = left ? tx - 8 - w : tx + 8;
        label.text.style.opacity = label.alpha;
        label.text.style.transform = `translate(${textX}px, ${label.ty}px) translateY(-50%)`;
        const bend = left ? tx + 18 : tx - 18;
        label.line.setAttribute("points", `${label.x},${label.y} ${bend},${label.ty} ${tx},${label.ty}`);
        label.line.style.opacity = label.alpha;
        label.dot.setAttribute("cx", label.x);
        label.dot.setAttribute("cy", label.y);
        label.dot.style.opacity = label.alpha;
      }
    }
  }

  // The parts glide toward the scroll position instead of jumping with each wheel notch:
  // the shown progress eases toward the target with a ~0.12 s time constant.
  let shown = progress();
  let goal = shown;
  let running = false;
  let last = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    shown += (goal - shown) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(goal - shown) < 2e-4) shown = goal;
    render(shown);
    if (shown !== goal) requestAnimationFrame(frame);
    else running = false;
  }
  const schedule = () => {
    goal = progress();
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => { resize(); render(shown); });
  resize();
  render(shown);
  document.fonts?.ready.then(() => { resize(); render(shown); });
  section.classList.add("explode-loaded");
}
