import * as THREE from 'three';
import { resolveCylinderAabbs } from './colliders.js';

/**
 * WASD + mouse look with pointer lock. First-person, no player mesh.
 * Horizontal motion uses a cylinder sweep against static AABB wall boxes.
 */
export function createControls(camera, domElement, colliders = []) {
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const keys = { w: false, a: false, s: false, d: false };

  let pointerLocked = false;
  let enabled = true;
  const speed = 4.5;
  const lookSensitivity = 0.002;
  /** Horizontal capsule footprint (cylinder vs static boxes). */
  const radius = 0.35;
  let wallBoxes = Array.isArray(colliders) ? colliders : [];

  camera.position.set(0, 1.6, 5);
  camera.rotation.order = 'YXZ';

  function onKeyDown(e) {
    const k = e.code;
    if (k === 'KeyW') keys.w = true;
    if (k === 'KeyA') keys.a = true;
    if (k === 'KeyS') keys.s = true;
    if (k === 'KeyD') keys.d = true;
  }

  function onKeyUp(e) {
    const k = e.code;
    if (k === 'KeyW') keys.w = false;
    if (k === 'KeyA') keys.a = false;
    if (k === 'KeyS') keys.s = false;
    if (k === 'KeyD') keys.d = false;
  }

  function onMouseMove(e) {
    if (!pointerLocked || !enabled) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * lookSensitivity;
    euler.x -= e.movementY * lookSensitivity;
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
    camera.quaternion.setFromEuler(euler);
  }

  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === domElement;
  }

  function requestLock() {
    if (!pointerLocked) domElement.requestPointerLock?.();
  }

  function exitLock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  function setEnabled(v) {
    enabled = !!v;
    if (!enabled) {
      keys.w = keys.a = keys.s = keys.d = false;
      velocity.set(0, 0, 0);
    }
  }

  function setColliders(boxes) {
    wallBoxes = Array.isArray(boxes) ? boxes : [];
  }

  function update(dt) {
    if (!enabled) return;
    direction.set(0, 0, 0);
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;
    if (direction.lengthSq() > 0) direction.normalize();

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    velocity.set(0, 0, 0);
    velocity.addScaledVector(forward, -direction.z * speed);
    velocity.addScaledVector(right, direction.x * speed);

    camera.position.x += velocity.x * dt;
    camera.position.z += velocity.z * dt;
    if (wallBoxes.length) {
      const resolved = resolveCylinderAabbs(camera.position, radius, wallBoxes);
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }
    camera.position.y = 1.6;
  }

  function dispose() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
  }

  return {
    update,
    requestLock,
    exitLock,
    setEnabled,
    setColliders,
    dispose,
    get pointerLocked() {
      return pointerLocked;
    },
    get radius() {
      return radius;
    },
  };
}
