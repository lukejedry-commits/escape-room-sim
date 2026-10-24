import * as THREE from 'three';
import { COLORS, flameColorForOvertime } from './materials.js';
import { CHAPTERS } from './chapters.js';

/**
 * Gothic castle graybox: limestone walls, slate floor,
 * bronze lock prop, iron key, four stage candles.
 */
export function buildGrayboxScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.fog);
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.02);

  const limestoneMat = new THREE.MeshStandardMaterial({
    color: COLORS.limestone,
    roughness: 0.92,
    metalness: 0.05,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: COLORS.slate,
    roughness: 0.88,
    metalness: 0.08,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: COLORS.bronze,
    roughness: 0.55,
    metalness: 0.65,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: COLORS.iron,
    roughness: 0.7,
    metalness: 0.9,
  });

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 16), slateMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  // Stone block walls (simple hall)
  const wallH = 4;
  const wallT = 0.5;
  const wallDefs = [
    { w: 16, d: wallT, x: 0, z: -8 },
    { w: 16, d: wallT, x: 0, z: 8 },
    { w: wallT, d: 16, x: -8, z: 0 },
    { w: wallT, d: 16, x: 8, z: 0 },
  ];
  for (const w of wallDefs) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, wallH, w.d), limestoneMat);
    mesh.position.set(w.x, wallH / 2, w.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'wall';
    scene.add(mesh);
  }

  // Interior pillar blocks for graybox interest
  const pillarGeo = new THREE.BoxGeometry(1.2, wallH, 1.2);
  for (const [x, z] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ]) {
    const p = new THREE.Mesh(pillarGeo, limestoneMat);
    p.position.set(x, wallH / 2, z);
    p.castShadow = true;
    p.name = 'pillar';
    scene.add(p);
  }

  // Bronze lock prop (click target)
  const lockGroup = new THREE.Group();
  lockGroup.name = 'bronze-lock';
  lockGroup.userData.inspectable = true;
  lockGroup.userData.label = 'Bronze lock';
  lockGroup.userData.kind = 'lock';
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), bronzeMat);
  const lockShackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI),
    bronzeMat
  );
  lockShackle.position.y = 0.28;
  lockShackle.rotation.z = Math.PI;
  lockGroup.add(lockBody, lockShackle);
  lockGroup.position.set(0, 1.2, -7.6);
  scene.add(lockGroup);

  // Placeholder iron key on a pedestal (pickable)
  const keyGroup = new THREE.Group();
  keyGroup.name = 'placeholder-key';
  keyGroup.userData.inspectable = true;
  keyGroup.userData.pickable = true;
  keyGroup.userData.label = 'Old iron key';
  keyGroup.userData.kind = 'key';
  const keyShaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), ironMat);
  const keyBow = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), ironMat);
  keyBow.position.z = 0.2;
  const keyBit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), ironMat);
  keyBit.position.set(0.06, 0, -0.14);
  keyGroup.add(keyShaft, keyBow, keyBit);
  keyGroup.position.set(2.5, 0.85, -2);
  keyGroup.rotation.y = 0.4;
  scene.add(keyGroup);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8), limestoneMat);
  pedestal.position.set(2.5, 0.35, -2);
  pedestal.name = 'pedestal';
  scene.add(pedestal);

  // Four stage candles along the back wall
  const candles = [];
  const candleXs = [-4.5, -1.5, 1.5, 4.5];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group();
    group.name = `candle-${i}`;
    group.userData.candleIndex = i;
    group.userData.inspectable = true;
    group.userData.label = CHAPTERS[i]?.title
      ? `Candle · ${CHAPTERS[i].title}`
      : `Stage candle ${i + 1}`;
    group.userData.kind = 'candle';

    // Dark body + pale wax tip
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.42, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.candleBody, roughness: 0.9 })
    );
    body.position.y = 0.22;
    body.name = 'body';

    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.045, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.candleWax, roughness: 0.75 })
    );
    wax.position.y = 0.5;
    wax.name = 'wax';

    const wick = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshStandardMaterial({
        color: COLORS.unlitWick,
        emissive: 0x000000,
        emissiveIntensity: 1,
      })
    );
    wick.position.y = 0.62;
    wick.name = 'wick';

    // Point light ~1.0 only when that gate is cleared
    const flameLight = new THREE.PointLight(COLORS.candleKey, 0, 5, 2);
    flameLight.position.y = 0.7;
    flameLight.name = 'flame-light';

    group.add(body, wax, wick, flameLight);
    group.position.set(candleXs[i], 1.1, -7.55);
    scene.add(group);
    candles.push({ group, body, wax, wick, flameLight, lit: false });
  }

  // Cool moonlight + hemisphere — low light budget for graybox
  const amb = new THREE.AmbientLight(0x2a3040, 0.15);
  scene.add(amb);
  const moon = new THREE.DirectionalLight(COLORS.moonlight, 0.3);
  moon.position.set(-3, 8, 4);
  moon.name = 'moonlight';
  scene.add(moon);
  const hemi = new THREE.HemisphereLight(COLORS.hemiSky, COLORS.hemiGround, 0.35);
  hemi.name = 'hemisphere';
  scene.add(hemi);

  function setCandleLit(i, lit, overtimeMs = 0) {
    const c = candles[i];
    if (!c) return;
    c.lit = !!lit;
    if (lit) {
      const flame = flameColorForOvertime(overtimeMs);
      c.wick.material.emissive.setHex(flame);
      c.wick.material.color.setHex(flame);
      c.flameLight.color.setHex(flame);
      c.flameLight.intensity = 1.0;
    } else {
      c.wick.material.emissive.setHex(0x000000);
      c.wick.material.color.setHex(COLORS.unlitWick);
      c.flameLight.intensity = 0;
    }
  }

  function syncCandlesFromGates(gates, overtimeMs = 0) {
    for (let i = 0; i < candles.length; i++) {
      setCandleLit(i, gates.isCleared(i), overtimeMs);
    }
  }

  /** Update flame colours for already-lit candles as overtime progresses. */
  function updateOvertimeFlames(overtimeMs) {
    for (const c of candles) {
      if (!c.lit) continue;
      const flame = flameColorForOvertime(overtimeMs);
      c.wick.material.emissive.setHex(flame);
      c.wick.material.color.setHex(flame);
      c.flameLight.color.setHex(flame);
    }
  }

  return {
    scene,
    lockGroup,
    keyGroup,
    candles,
    setCandleLit,
    syncCandlesFromGates,
    updateOvertimeFlames,
    limestoneMat,
    slateMat,
    bronzeMat,
    ironMat,
  };
}
