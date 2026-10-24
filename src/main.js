import * as THREE from 'three';
import { buildGrayboxScene } from './scene.js';
import { createControls } from './controls.js';
import { createTimer } from './timer.js';
import { createGateSystem } from './gates.js';
export { createTimer } from './timer.js';
export { createGateSystem } from './gates.js';
import { createInventory, makePlaceholderKey } from './inventory.js';

const canvas = document.getElementById('game');
const chapterEl = document.getElementById('chapter-cue');
const timerEl = document.getElementById('timer');
const overtimeEl = document.getElementById('overtime-penalty');
const pauseOverlay = document.getElementById('pause-overlay');
const inspectHint = document.getElementById('inspect-hint');
const clickPrompt = document.getElementById('click-prompt');
const hotbarEl = document.getElementById('hotbar');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 80);
const { scene, keyGroup, syncCandlesFromGates } = buildGrayboxScene();

const controls = createControls(camera, canvas);
const timer = createTimer();
const gates = createGateSystem(4);
const inventory = createInventory(5);

let paused = false;
let examining = false;
let lastT = performance.now();

chapterEl.textContent = 'Chapter 1 · Hall';
clickPrompt.classList.remove('hidden');

const raycaster = new THREE.Raycaster();
const ndcCenter = new THREE.Vector2(0, 0);

function findInspectable(obj) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.inspectable) return o;
    o = o.parent;
  }
  return null;
}

function getLookTarget() {
  raycaster.setFromCamera(ndcCenter, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits) {
    const target = findInspectable(h.object);
    if (target) return { target, distance: h.distance };
  }
  return null;
}

function renderHotbar() {
  const slots = inventory.slots;
  const nodes = hotbarEl.querySelectorAll('.slot');
  nodes.forEach((node, i) => {
    const item = slots[i];
    if (item) {
      node.classList.remove('empty');
      node.classList.add('filled');
      node.textContent = item.label;
    } else {
      node.classList.add('empty');
      node.classList.remove('filled');
      node.textContent = '';
    }
  });
}

function setPaused(next) {
  paused = next;
  timer.setPaused(paused);
  controls.setEnabled(!paused && !examining);
  pauseOverlay.classList.toggle('hidden', !paused);
  if (paused) controls.exitLock();
}

function setExamining(next) {
  examining = next;
  timer.setExamining(examining);
  controls.setEnabled(!paused && !examining);
}

function tryInspect() {
  const hit = getLookTarget();
  if (!hit || hit.distance > 3.5) return;

  const { target } = hit;
  const kind = target.userData.kind;

  if (kind === 'key' && target.userData.pickable) {
    if (inventory.canAdd()) {
      inventory.add(makePlaceholderKey());
      target.visible = false;
      target.userData.pickable = false;
      renderHotbar();
      inspectHint.textContent = 'Picked up: Old iron key';
      inspectHint.classList.remove('hidden');
      setTimeout(() => inspectHint.classList.add('hidden'), 1800);
    }
    return;
  }

  // Click-to-inspect freezes the soft timer briefly while the cue shows
  setExamining(true);
  inspectHint.textContent = `Inspecting: ${target.userData.label || target.name}`;
  inspectHint.classList.remove('hidden');
  setTimeout(() => {
    inspectHint.classList.add('hidden');
    setExamining(false);
  }, 900);
}

/** Stub exposed for design / console testing. */
window.clearGate = function clearGate(i) {
  const ok = gates.clearGate(i);
  if (ok) syncCandlesFromGates(gates);
  return ok;
};

window.__escapeRoom = { timer, gates, inventory, setPaused };

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

canvas.addEventListener('click', () => {
  if (paused) return;
  if (!controls.pointerLocked) {
    controls.requestLock();
    clickPrompt.classList.add('hidden');
    return;
  }
  tryInspect();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    setPaused(!paused);
  }
  // Digits select hotbar slots
  if (e.code >= 'Digit1' && e.code <= 'Digit5') {
    inventory.setSelected(Number(e.code.slice(-1)) - 1);
  }
});

function updateHud() {
  timerEl.textContent = timer.formatRemaining();
  if (timer.isOvertime) {
    overtimeEl.textContent = `Overtime penalty: ${timer.overtimePenalty}`;
    overtimeEl.classList.remove('hidden');
  } else {
    overtimeEl.classList.add('hidden');
  }

  if (!paused && !examining && controls.pointerLocked) {
    const hit = getLookTarget();
    if (hit && hit.distance <= 3.5) {
      const label = hit.target.userData.label || hit.target.name;
      const action = hit.target.userData.pickable ? 'Click to take' : 'Click to inspect';
      inspectHint.textContent = `${action}: ${label}`;
      inspectHint.classList.remove('hidden');
    } else if (!examining) {
      // don't hide mid-inspect timeout message unless empty look
      if (!inspectHint.textContent.startsWith('Inspecting') && !inspectHint.textContent.startsWith('Picked')) {
        inspectHint.classList.add('hidden');
      }
    }
  }
}

function frame(now) {
  const dtMs = now - lastT;
  lastT = now;
  const dt = Math.min(dtMs / 1000, 0.05);

  timer.tick(dtMs);
  if (!paused && !examining) {
    controls.update(dt);
  }

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

renderHotbar();
syncCandlesFromGates(gates);
requestAnimationFrame(frame);
