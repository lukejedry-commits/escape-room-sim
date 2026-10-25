import * as THREE from 'three';

/**
 * Static AABB wall/pillar colliders + horizontal cylinder (capsule body) resolve.
 * Prefer collidersFromScene() so boxes track live meshes; hardcoded graybox is fallback/tests.
 */

/**
 * @typedef {{ minX: number, maxX: number, minZ: number, maxZ: number, label?: string }} Aabb
 */

const COLLIDER_NAMES = new Set(['wall', 'pillar', 'pedestal']);

/** Graybox hall fallback (walls ±8 thick 0.5, pillars 1.2 at ±4). */
export function buildGrayboxColliders() {
  const wallT = 0.5;
  const hall = 8;
  const halfT = wallT / 2;
  /** @type {Aabb[]} */
  const boxes = [
    { minX: -hall, maxX: hall, minZ: -hall - halfT, maxZ: -hall + halfT, label: 'wall-n' },
    { minX: -hall, maxX: hall, minZ: hall - halfT, maxZ: hall + halfT, label: 'wall-s' },
    { minX: -hall - halfT, maxX: -hall + halfT, minZ: -hall, maxZ: hall, label: 'wall-w' },
    { minX: hall - halfT, maxX: hall + halfT, minZ: -hall, maxZ: hall, label: 'wall-e' },
  ];
  const pillarHalf = 0.6;
  for (const [x, z] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ]) {
    boxes.push({
      minX: x - pillarHalf,
      maxX: x + pillarHalf,
      minZ: z - pillarHalf,
      maxZ: z + pillarHalf,
      label: 'pillar',
    });
  }
  return boxes;
}

/**
 * Build XZ AABBs from scene meshes named wall / pillar / pedestal.
 * Uses Box3.setFromObject so colliders track the meshes the player sees.
 * @param {THREE.Object3D} root
 * @returns {Aabb[]}
 */
export function collidersFromScene(root) {
  /** @type {Aabb[]} */
  const boxes = [];
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!COLLIDER_NAMES.has(obj.name)) return;
    box.setFromObject(obj);
    if (box.isEmpty()) return;
    boxes.push({
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
      label: obj.name,
    });
  });
  return boxes;
}

/**
 * Optional debug wire boxes parented under `parent` (usually the scene).
 * @param {Aabb[]} boxes
 * @param {THREE.Object3D} parent
 * @returns {THREE.Group}
 */
export function createColliderDebugGroup(boxes, parent) {
  const group = new THREE.Group();
  group.name = 'collider-debug';
  const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, depthWrite: false });
  for (const b of boxes) {
    const w = b.maxX - b.minX;
    const d = b.maxZ - b.minZ;
    const y = 1.2;
    const geo = new THREE.BoxGeometry(w, y, d);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, mat);
    line.position.set((b.minX + b.maxX) / 2, y / 2, (b.minZ + b.maxZ) / 2);
    group.add(line);
  }
  parent.add(group);
  return group;
}

/**
 * Push a horizontal circle (player footprint) out of overlapping AABBs.
 * @param {{ x: number, z: number }} pos
 * @param {number} radius
 * @param {Aabb[]} boxes
 * @param {number} [passes=2]
 */
export function resolveCylinderAabbs(pos, radius, boxes, passes = 2) {
  let x = pos.x;
  let z = pos.z;
  for (let pass = 0; pass < passes; pass++) {
    for (const b of boxes) {
      const nearestX = Math.max(b.minX, Math.min(x, b.maxX));
      const nearestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - nearestX;
      const dz = z - nearestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radius * radius && distSq > 0) continue;

      if (distSq < 1e-10) {
        const penLeft = x - b.minX + radius;
        const penRight = b.maxX - x + radius;
        const penNear = z - b.minZ + radius;
        const penFar = b.maxZ - z + radius;
        const minPen = Math.min(penLeft, penRight, penNear, penFar);
        if (minPen === penLeft) x = b.minX - radius;
        else if (minPen === penRight) x = b.maxX + radius;
        else if (minPen === penNear) z = b.minZ - radius;
        else z = b.maxZ + radius;
        continue;
      }

      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      x += dx * push;
      z += dz * push;
    }
  }
  return { x, z };
}
