import { AREAS, type Area } from './areas.js';
import type { Coverage, FocusItem, Reflection } from './schema.js';

/**
 * Exploration score (0–100): how thoroughly the decision has been examined, NOT whether the
 * choice is good. 60% area coverage, 40% share of blind-spot questions the user has reflected on.
 */
export function explorationScore(coverage: Coverage, reflected: number, total: number): number {
  const reflectedShare = total > 0 ? Math.min(reflected, total) / total : 0;
  return Math.round(coverage.percent * 0.6 + reflectedShare * 100 * 0.4);
}

/**
 * Light & Shadow coverage. An area is "lit" when the user's own reasoning relies on it,
 * or when they have consciously examined it (marked considered or not relevant).
 * Everything else stays in shadow: a potential blind spot.
 */
export function computeCoverage(focus: FocusItem[], reflections: Reflection[] = []): Coverage {
  const lit = new Set<Area>(focus.map((item) => item.area));
  for (const reflection of reflections) {
    if (reflection.status !== 'unknown') lit.add(reflection.area);
  }

  const covered = AREAS.filter((area) => lit.has(area));
  const shadow = AREAS.filter((area) => !lit.has(area));
  const percent = Math.round((covered.length / AREAS.length) * 100);

  return { covered, shadow, percent };
}
