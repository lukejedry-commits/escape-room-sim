/** Shared material color constants for the gothic graybox. */
export const COLORS = {
  limestone: 0xc4b8a4,
  slate: 0x4a4e55,
  bronze: 0x6b4a2e,
  iron: 0x3a3d42,
  candleKey: 0xffb060,
  fog: 0x1a1820,
  candleBody: 0x2a2218,
  candleWax: 0xe8dcc8,
  unlitWick: 0x2a2218,
  litFlame: 0xffb060,
  /** Past 1:00 overtime */
  overtimeFlameWarm: 0xff9a40,
  /** After ~10 more minutes overtime */
  overtimeFlameHot: 0xff6a4a,
  moonlight: 0x8aa8c8,
  hemiSky: 0x2a3040,
  hemiGround: 0x1a1410,
};

export const OVERTIME_WARM_MS = 0;
export const OVERTIME_HOT_MS = 10 * 60 * 1000;

/**
 * Flame colour for lit candles given overtime duration.
 * Stub-friendly: pure function of overtimeMs.
 */
export function flameColorForOvertime(overtimeMs) {
  if (overtimeMs > OVERTIME_HOT_MS) return COLORS.overtimeFlameHot;
  if (overtimeMs > OVERTIME_WARM_MS && overtimeMs > 0) return COLORS.overtimeFlameWarm;
  // At exactly 0 overtime (not yet past 1:00) keep normal lit flame.
  // Once isOvertime, overtimeMs > 0 → warm immediately past 1:00.
  if (overtimeMs > 0) return COLORS.overtimeFlameWarm;
  return COLORS.litFlame;
}
