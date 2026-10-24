/**
 * Story-locked chapter titles mapped 1:1 to stage candles / gates 0–3.
 *
 * HUD display rule:
 * - Current chapter index = first uncleared gate (0 if none cleared).
 * - While any gate remains uncleared, HUD shows `Next · <title of current>`.
 *   Example: at start → "Next · The Threshold"; after clearing gate 0 →
 *   "Next · The Silent Chapel".
 * - Once all four gates are cleared, HUD shows `Next · Escape`
 *   (final beat beyond The Open Door).
 * Fade (~1.5s) runs whenever the displayed string changes.
 */
export const CHAPTERS = [
  { index: 0, title: 'The Threshold' },
  { index: 1, title: 'The Silent Chapel' },
  { index: 2, title: 'The Reliquary' },
  { index: 3, title: 'The Open Door' },
];

export const ESCAPE_LABEL = 'Escape';

/** First uncleared gate index, or CHAPTERS.length when all cleared. */
export function currentChapterIndex(gates) {
  const n = gates.count ?? CHAPTERS.length;
  for (let i = 0; i < n; i++) {
    if (!gates.isCleared(i)) return i;
  }
  return n;
}

/** Text shown in the top-center chapter cue. */
export function chapterHudText(gates) {
  const i = currentChapterIndex(gates);
  if (i >= CHAPTERS.length) return `Next · ${ESCAPE_LABEL}`;
  return `Next · ${CHAPTERS[i].title}`;
}
