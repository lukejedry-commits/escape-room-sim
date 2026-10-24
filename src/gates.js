/**
 * Four stage candles: unlit until the matching gate clears.
 * clearGate(i) is a stub for design/testing.
 */
export function createGateSystem(candleCount = 4) {
  const cleared = Array.from({ length: candleCount }, () => false);

  return {
    get count() {
      return candleCount;
    },
    isCleared(i) {
      return !!cleared[i];
    },
    getCleared() {
      return cleared.slice();
    },
    /** Stub: mark gate i cleared so its candle lights. */
    clearGate(i) {
      if (i < 0 || i >= candleCount) return false;
      if (cleared[i]) return false;
      cleared[i] = true;
      return true;
    },
    reset() {
      for (let i = 0; i < candleCount; i++) cleared[i] = false;
    },
  };
}
