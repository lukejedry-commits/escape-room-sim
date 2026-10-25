/**
 * Unit tests: timer freeze, gate clears candle, chapter HUD, overtime flame,
 * tab-away pause / catch-up clear.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { createTimer, SESSION_MS, OVERTIME_PENALTY_INTERVAL_MS } from '../src/timer.js';
import { createGateSystem } from '../src/gates.js';
import { chapterHudText, currentChapterIndex, CHAPTERS, ESCAPE_LABEL } from '../src/chapters.js';
import { flameColorForOvertime, COLORS, OVERTIME_HOT_MS } from '../src/materials.js';
import { buildGrayboxColliders, resolveCylinderAabbs } from '../src/colliders.js';
import { createInventory } from '../src/inventory.js';

function testTimerFreezeOnPause() {
  const t = createTimer({ sessionMs: 60_000, penaltyIntervalMs: 30_000 });
  t.tick(5_000);
  assert.equal(t.elapsedMs, 5_000);
  t.setPaused(true);
  t.tick(10_000);
  assert.equal(t.elapsedMs, 5_000, 'pause must freeze timer');
  t.setPaused(false);
  t.tick(2_000);
  assert.equal(t.elapsedMs, 7_000);
  console.log('PASS timer freeze on pause');
}

function testTimerFreezeOnExamine() {
  const t = createTimer({ sessionMs: 60_000 });
  t.tick(1_000);
  t.setExamining(true);
  t.tick(50_000);
  assert.equal(t.elapsedMs, 1_000, 'examine must freeze timer');
  t.setExamining(false);
  t.tick(500);
  assert.equal(t.elapsedMs, 1_500);
  console.log('PASS timer freeze on examine');
}

function testOvertimePenaltyIncrements() {
  const sessionMs = 1_000;
  const interval = 30_000;
  const t = createTimer({ sessionMs, penaltyIntervalMs: interval });
  t.tick(sessionMs);
  assert.equal(t.overtimePenalty, 0);
  t.tick(interval);
  assert.equal(t.overtimePenalty, 1);
  t.tick(interval);
  assert.equal(t.overtimePenalty, 2);
  t.setPaused(true);
  t.tick(interval * 3);
  assert.equal(t.overtimePenalty, 2, 'frozen overtime must not accumulate');
  console.log('PASS overtime penalty increments');
}

function testGateClearsCandleFlag() {
  const gates = createGateSystem(4);
  assert.deepEqual(gates.getCleared(), [false, false, false, false]);
  assert.equal(gates.clearGate(0), true);
  assert.equal(gates.isCleared(0), true);
  assert.equal(gates.clearGate(0), false, 'already cleared');
  assert.equal(gates.clearGate(2), true);
  assert.deepEqual(gates.getCleared(), [true, false, true, false]);
  console.log('PASS gate clear lights candle flag');
}

function testChapterHudRule() {
  assert.equal(CHAPTERS.length, 4);
  assert.equal(CHAPTERS[0].title, 'The Threshold');
  assert.equal(CHAPTERS[1].title, 'The Silent Chapel');
  assert.equal(CHAPTERS[2].title, 'The Reliquary');
  assert.equal(CHAPTERS[3].title, 'The Open Door');

  const gates = createGateSystem(4);
  assert.equal(currentChapterIndex(gates), 0);
  assert.equal(chapterHudText(gates), 'Next · The Threshold');

  gates.clearGate(0);
  assert.equal(currentChapterIndex(gates), 1);
  assert.equal(chapterHudText(gates), 'Next · The Silent Chapel');

  gates.clearGate(1);
  assert.equal(chapterHudText(gates), 'Next · The Reliquary');

  gates.clearGate(2);
  assert.equal(chapterHudText(gates), 'Next · The Open Door');

  gates.clearGate(3);
  assert.equal(currentChapterIndex(gates), 4);
  assert.equal(chapterHudText(gates), `Next · ${ESCAPE_LABEL}`);
  console.log('PASS chapter HUD next-title rule');
}

function testOvertimeFlameColors() {
  assert.equal(flameColorForOvertime(0), COLORS.litFlame);
  assert.equal(flameColorForOvertime(1), COLORS.overtimeFlameWarm);
  assert.equal(flameColorForOvertime(OVERTIME_HOT_MS), COLORS.overtimeFlameWarm);
  assert.equal(flameColorForOvertime(OVERTIME_HOT_MS + 1), COLORS.overtimeFlameHot);
  assert.equal(COLORS.overtimeFlameWarm, 0xff9a40);
  assert.equal(COLORS.overtimeFlameHot, 0xff6a4a);
  console.log('PASS overtime flame colour stub');
}

/**
 * Models the main-loop contract for tab-away:
 * while paused (visibility), large wall dt must not advance the soft timer;
 * on resume, catch-up is cleared by discarding the gap (only the next real frame ticks).
 */
function testTabAwayNoCatchUp() {
  const t = createTimer({ sessionMs: 60 * 60 * 1000 });
  t.tick(5_000);
  assert.equal(t.elapsedMs, 5_000);

  // Tab hidden → setPaused(true) via same path
  t.setPaused(true);
  const tabAwayMs = 120_000;
  t.tick(tabAwayMs);
  assert.equal(t.elapsedMs, 5_000, 'timer must not run while tabbed away');

  // Resume: clearCatchUp discards the gap; only a normal frame dt applies
  t.setPaused(false);
  const frameDt = 16;
  t.tick(frameDt);
  assert.equal(t.elapsedMs, 5_000 + frameDt, 'resume must not dump tab-away gap into timer');
  console.log('PASS tab-away pause / no catch-up');
}

function testBlurPauseSamePath() {
  const t = createTimer({ sessionMs: 60_000 });
  t.tick(1_000);
  // window blur uses the same setPaused(true) path
  t.setPaused(true);
  t.tick(45_000);
  assert.equal(t.elapsedMs, 1_000);
  t.setPaused(false);
  t.tick(100);
  assert.equal(t.elapsedMs, 1_100);
  console.log('PASS blur pause same setPaused path');
}

function testDefaultsMatchSpec() {
  assert.equal(SESSION_MS, 60 * 60 * 1000);
  assert.equal(OVERTIME_PENALTY_INTERVAL_MS, 30 * 1000);
  console.log('PASS session defaults');
}


function testWallCollidersBlockHallEdge() {
  const boxes = buildGrayboxColliders();
  assert.equal(boxes.length, 8, '4 walls + 4 pillars');
  const radius = 0.35;
  const hit = resolveCylinderAabbs({ x: 0, z: -7.9 }, radius, boxes);
  assert.ok(hit.z >= -7.75 + radius - 0.02, `should stop before north wall, got z=${hit.z}`);
  const pillar = resolveCylinderAabbs({ x: 4, z: -4 }, radius, boxes);
  const dx = pillar.x - 4;
  const dz = pillar.z - (-4);
  assert.ok(Math.hypot(dx, dz) >= radius - 0.02, 'center inside pillar must be pushed out');
  console.log('PASS wall colliders block hall edge / pillar');
}

function testHotbarDefaultEightSlots() {
  const inv = createInventory();
  assert.equal(inv.slots.length, 8);
  console.log('PASS hotbar default 8 slots');
}

testTimerFreezeOnPause();
testTimerFreezeOnExamine();
testOvertimePenaltyIncrements();
testGateClearsCandleFlag();
testChapterHudRule();
testOvertimeFlameColors();
testTabAwayNoCatchUp();
testBlurPauseSamePath();
testDefaultsMatchSpec();
testWallCollidersBlockHallEdge();
testHotbarDefaultEightSlots();
console.log('All tests passed.');
