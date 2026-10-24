/**
 * Unit tests: timer freeze, gate clears candle state, overtime penalty.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { createTimer, SESSION_MS, OVERTIME_PENALTY_INTERVAL_MS } from '../src/timer.js';
import { createGateSystem } from '../src/gates.js';

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
  t.tick(interval); // first 30s overtime bucket
  assert.equal(t.overtimePenalty, 1);
  t.tick(interval); // second bucket
  assert.equal(t.overtimePenalty, 2);
  // freeze should not add penalty
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
  // Candle sync is: lit iff gate cleared — modeled here as the flag the scene reads
  const candleLit = gates.getCleared();
  assert.equal(candleLit[0], true);
  assert.equal(candleLit[1], false);
  assert.equal(candleLit[2], true);
  console.log('PASS gate clear lights candle flag');
}

function testDefaultsMatchSpec() {
  assert.equal(SESSION_MS, 60 * 60 * 1000);
  assert.equal(OVERTIME_PENALTY_INTERVAL_MS, 30 * 1000);
  console.log('PASS session defaults');
}

testTimerFreezeOnPause();
testTimerFreezeOnExamine();
testOvertimePenaltyIncrements();
testGateClearsCandleFlag();
testDefaultsMatchSpec();
console.log('All tests passed.');
