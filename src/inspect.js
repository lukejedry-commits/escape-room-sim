import * as THREE from 'three';
import { COLORS } from './materials.js';

/**
 * Click-to-inspect orbit view.
 * Black void backdrop; soft key #ffb060 ~0.9 upper-left;
 * cool fill #8aa8c8 ~0.25 opposite; no fog.
 * Metals keep their roughness (engraving-friendly).
 */
export function createInspectOverlay(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 20);
  camera.position.set(0, 0.15, 1.2);

  const key = new THREE.DirectionalLight(COLORS.candleKey, 0.9);
  key.position.set(-2.2, 2.4, 1.6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(COLORS.moonlight, 0.25);
  fill.position.set(2.0, 0.4, -1.2);
  scene.add(fill);

  const amb = new THREE.AmbientLight(0x202028, 0.12);
  scene.add(amb);

  const pivot = new THREE.Group();
  scene.add(pivot);

  let active = false;
  let cloneRoot = null;
  let yaw = 0.35;
  let pitch = 0.15;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const distance = 1.15;

  function clearClone() {
    if (!cloneRoot) return;
    pivot.remove(cloneRoot);
    cloneRoot.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      // Do not dispose shared materials from the world mesh
    });
    cloneRoot = null;
  }

  function fitClone(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.2);
    const scale = 0.55 / maxDim;
    root.scale.setScalar(scale);
  }

  function open(sourceObject) {
    clearClone();
    cloneRoot = sourceObject.clone(true);
    // Keep material roughness/metalness as authored (engravings readable)
    cloneRoot.traverse((o) => {
      if (o.isLight) o.visible = false;
    });
    fitClone(cloneRoot);
    pivot.add(cloneRoot);
    yaw = 0.45;
    pitch = 0.18;
    active = true;
    updateCamera();
  }

  function close() {
    active = false;
    dragging = false;
    clearClone();
  }

  function updateCamera() {
    const cp = Math.cos(pitch);
    camera.position.set(
      Math.sin(yaw) * cp * distance,
      Math.sin(pitch) * distance + 0.05,
      Math.cos(yaw) * cp * distance
    );
    camera.lookAt(0, 0, 0);
  }

  function onPointerDown(e) {
    if (!active) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerMove(e) {
    if (!active || !dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw -= dx * 0.005;
    pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.005));
    updateCamera();
  }

  function onPointerUp() {
    dragging = false;
  }

  function resize(w, h) {
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }

  function render() {
    if (!active) return false;
    renderer.render(scene, camera);
    return true;
  }

  return {
    get active() {
      return active;
    },
    open,
    close,
    render,
    resize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
