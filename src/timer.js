/**
 * Soft 1-hour session timer.
 * Freezes while paused or examining. After 1h, play continues;
 * overtime accumulates a placeholder score penalty (+1 per 30s).
 * Never drives physics catch-up.
 */
export const SESSION_MS = 60 * 60 * 1000;
export const OVERTIME_PENALTY_INTERVAL_MS = 30 * 1000;

export function createTimer(options = {}) {
  const sessionMs = options.sessionMs ?? SESSION_MS;
  const penaltyIntervalMs = options.penaltyIntervalMs ?? OVERTIME_PENALTY_INTERVAL_MS;

  let elapsedMs = 0;
  let overtimePenalty = 0;
  let lastPenaltyBucket = 0;
  let frozen = false;
  let examineFreeze = false;
  let pauseFreeze = false;

  function syncFreeze() {
    frozen = pauseFreeze || examineFreeze;
  }

  return {
    get elapsedMs() {
      return elapsedMs;
    },
    get remainingMs() {
      return Math.max(0, sessionMs - elapsedMs);
    },
    get isOvertime() {
      return elapsedMs > sessionMs;
    },
    get overtimeMs() {
      return Math.max(0, elapsedMs - sessionMs);
    },
    get overtimePenalty() {
      return overtimePenalty;
    },
    get frozen() {
      return frozen;
    },
    get pauseFreeze() {
      return pauseFreeze;
    },
    get examineFreeze() {
      return examineFreeze;
    },
    setPaused(paused) {
      pauseFreeze = !!paused;
      syncFreeze();
    },
    setExamining(examining) {
      examineFreeze = !!examining;
      syncFreeze();
    },
    /**
     * Advance by wall-clock dt only when not frozen.
     * Overtime penalty is a counter only — does not affect sim stepping.
     */
    tick(dtMs) {
      if (frozen || !(dtMs > 0)) return;
      elapsedMs += dtMs;
      if (elapsedMs > sessionMs) {
        const overtime = elapsedMs - sessionMs;
        const bucket = Math.floor(overtime / penaltyIntervalMs);
        if (bucket > lastPenaltyBucket) {
          overtimePenalty += bucket - lastPenaltyBucket;
          lastPenaltyBucket = bucket;
        }
      }
    },
    formatRemaining() {
      const ms = this.isOvertime ? this.overtimeMs : this.remainingMs;
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const body = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      return this.isOvertime ? `+${body}` : body;
    },
  };
}
