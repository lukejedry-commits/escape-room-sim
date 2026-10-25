import * as THREE from 'three';
import { buildGrayboxScene } from './scene.js';
import { createControls } from './controls.js';
import { collidersFromScene, createColliderDebugGroup } from './colliders.js';
import { createTimer } from './timer.js';
import { createGateSystem } from './gates.js';
import { createInventory, makePlaceholderKey } from './inventory.js';
import { chapterHudText } from './chapters.js';
import { createInspectOverlay } from './inspect.js';

export { createTimer } from './timer.js';
export { createGateSystem } from './gates.js';
export { chapterHudText, currentChapterIndex, CHAPTERS } from './chapters.js';
export { flameColorForOvertime, COLORS } from './materials.js';

/** Bump when collision/interact systems change so playtesters can confirm cache. */
const BUILD_ID = 'pause-1';

const canvas = document.getElementById('game');
const chapterEl = document.getElementById('chapter-cue');
const timerEl = document.getElementById('timer');
const overtimeEl = document.getElementById('overtime-penalty');
const pauseOverlay = document.getElementById('pause-overlay');
const inspectHint = document.getElementById('inspect-hint');
const clickPrompt = document.getElementById('click-prompt');
const hotbarEl = document.getElementById('hotbar');
const buildEl = document.getElementById('build-id');
if (buildEl) buildEl.textContent = BUILD_ID;
const titleOverlay = document.getElementById('title-overlay');
const btnResume = document.getElementById('btn-resume');
const btnSettings = document.getElementById('btn-settings');
const btnQuitTitle = document.getElementById('btn-quit-title');
const btnEnter = document.getElementById('btn-enter');
const settingsStub = document.getElementById('settings-stub');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 80);
const { scene, syncCandlesFromGates, updateOvertimeFlames } = buildGrayboxScene();

const wallColliders = collidersFromScene(scene);
const controls = createControls(camera, canvas, wallColliders);
let colliderDebug = null;
function toggleColliderDebug() {
  if (colliderDebug) {
    scene.remove(colliderDebug);
    colliderDebug = null;
    return false;
  }
  colliderDebug = createColliderDebugGroup(wallColliders, scene);
  return true;
}
const timer = createTimer();
const gates = createGateSystem(4);
const inventory = createInventory(8);
const inspect = createInspectOverlay(renderer);

let paused = false;
/** True when pause was caused by tab-away / blur (auto-resume on focus). */
let pausedByVisibility = false;
let examining = false;
let lastT = performance.now();
let lastChapterText = '';

/** Drop any wall-clock gap so resume never catch-up-ticks the soft timer. */
function clearCatchUp(now = performance.now()) {
  lastT = now;
}

function showChapterCue(text, { fade = true } = {}) {
  if (text === lastChapterText) return;
  lastChapterText = text;
  chapterEl.textContent = text;
  if (!fade) {
    chapterEl.classList.remove('chapter-fade');
    chapterEl.style.animation = 'none';
    chapterEl.style.opacity = '0.7';
    return;
  }
  chapterEl.style.animation = 'none';
  void chapterEl.offsetWidth;
  chapterEl.style.animation = '';
  chapterEl.classList.remove('chapter-fade');
  void chapterEl.offsetWidth;
  chapterEl.classList.add('chapter-fade');
}

function refreshChapterHud({ fade = true } = {}) {
  showChapterCue(chapterHudText(gates), { fade });
}

refreshChapterHud({ fade: true });
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

function setPaused(next, { fromVisibility = false } = {}) {
  const was = paused;
  paused = !!next;
  if (fromVisibility) {
    if (paused) pausedByVisibility = true;
    else pausedByVisibility = false;
  } else if (paused) {
    // Manual Esc pause — do not auto-resume on focus
    pausedByVisibility = false;
  }
  timer.setPaused(paused);
  controls.setEnabled(!paused && !examining);
  const showPauseMenu = paused && !examining && !isOnTitle();
  pauseOverlay.classList.toggle('hidden', !showPauseMenu);
  if (paused) {
    controls.exitLock();
  }
  // Resume always clears catch-up so a long tab-away cannot dump dt into the timer
  if (was && !paused) {
    clearCatchUp();
  }
}

function setExamining(next) {
  examining = !!next;
  timer.setExamining(examining);
  controls.setEnabled(!paused && !examining);
  if (examining) {
    controls.exitLock();
    pauseOverlay.classList.add('hidden');
  }
}


function isOnTitle() {
  return titleOverlay && !titleOverlay.classList.contains('hidden');
}

function showTitle() {
  closeInspect();
  titleOverlay.classList.remove('hidden');
  pauseOverlay.classList.add('hidden');
  settingsStub?.classList.add('hidden');
  clickPrompt.classList.add('hidden');
  setPaused(true, { fromVisibility: false });
  controls.exitLock();
}

function enterFromTitle() {
  titleOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  settingsStub?.classList.add('hidden');
  setPaused(false, { fromVisibility: false });
  clickPrompt.classList.remove('hidden');
  clearCatchUp();
}

function openPauseMenu() {
  if (isOnTitle()) return;
  settingsStub?.classList.add('hidden');
  setPaused(true, { fromVisibility: false });
}

function closeInspect() {
  if (!inspect.active) return;
  inspect.close();
  setExamining(false);
  inspectHint.classList.add('hidden');
}

function openInspect(target) {
  inspect.open(target);
  setExamining(true);
  inspectHint.textContent = `${target.userData.label || target.name} · drag to orbit · Esc to close`;
  inspectHint.classList.remove('hidden');
}

function tryInspect() {
  if (inspect.active) return;
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
      setTimeout(() => {
        if (!inspect.active) inspectHint.classList.add('hidden');
      }, 1800);
    }
    return;
  }

  openInspect(target);
}

/** Stub exposed for design / console testing. */
window.clearGate = function clearGate(i) {
  const ok = gates.clearGate(i);
  if (ok) {
    syncCandlesFromGates(gates, timer.overtimeMs);
    refreshChapterHud({ fade: true });
  }
  return ok;
};

window.__escapeRoom = {
  timer,
  gates,
  inventory,
  setPaused,
  clearCatchUp,
  refreshChapterHud,
  camera,
  controls,
  inspect,
  wallColliders,
  BUILD_ID,
  toggleColliderDebug,
  showTitle,
  enterFromTitle,
};

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  inspect.resize(w, h);
}
window.addEventListener('resize', onResize);
inspect.resize(window.innerWidth, window.innerHeight);

canvas.addEventListener('click', () => {
  if (paused) return;
  if (inspect.active) return;
  if (!controls.pointerLocked) {
    controls.requestLock();
    clickPrompt.classList.add('hidden');
    return;
  }
  tryInspect();
});

canvas.addEventListener('pointerdown', (e) => inspect.onPointerDown(e));
window.addEventListener('pointermove', (e) => inspect.onPointerMove(e));
window.addEventListener('pointerup', () => inspect.onPointerUp());

document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (isOnTitle()) return;
    if (inspect.active) {
      closeInspect();
      return;
    }
    if (paused && !pausedByVisibility) {
      setPaused(false, { fromVisibility: false });
    } else {
      openPauseMenu();
    }
  }
  if (e.code >= 'Digit1' && e.code <= 'Digit8') {
    inventory.setSelected(Number(e.code.slice(-1)) - 1);
  }
});

/**
 * Tab-away / blur: pause through the same setPaused path.
 * Timer must not run while the tab is hidden. Resume clears catch-up.
 */
function onVisibilityOrFocusChange() {
  if (document.hidden) {
    setPaused(true, { fromVisibility: true });
    return;
  }
  // Visible again: clear catch-up always; auto-resume only if we paused for the tab
  clearCatchUp();
  if (pausedByVisibility) {
    setPaused(false, { fromVisibility: true });
  }
}

document.addEventListener('visibilitychange', onVisibilityOrFocusChange);
window.addEventListener('blur', () => {
  setPaused(true, { fromVisibility: true });
});
window.addEventListener('focus', () => {
  clearCatchUp();
  if (pausedByVisibility && !document.hidden) {
    setPaused(false, { fromVisibility: true });
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
      if (!inspectHint.textContent.startsWith('Picked')) {
        inspectHint.classList.add('hidden');
      }
    }
  }
}

function frame(now) {
  const dtMs = now - lastT;
  lastT = now;
  const dt = Math.min(dtMs / 1000, 0.05);

  // Soft timer: never advances while paused or examining (inspect freezes it)
  timer.tick(dtMs);
  if (!paused && !examining) {
    controls.update(dt);
  }

  if (timer.isOvertime) {
    updateOvertimeFlames(timer.overtimeMs);
  }

  updateHud();

  if (!inspect.render()) {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

btnResume?.addEventListener('click', () => {
  setPaused(false, { fromVisibility: false });
  clickPrompt.classList.remove('hidden');
});
btnSettings?.addEventListener('click', () => {
  settingsStub?.classList.toggle('hidden');
});
btnQuitTitle?.addEventListener('click', () => {
  showTitle();
});
btnEnter?.addEventListener('click', () => {
  enterFromTitle();
});

renderHotbar();
syncCandlesFromGates(gates, 0);
// Start on title so the soft timer does not run until Enter the Keep
showTitle();
requestAnimationFrame(frame);
