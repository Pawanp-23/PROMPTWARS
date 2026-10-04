import { AREAS, type Area } from './areas.js';
import type { Coverage, FocusItem, Reflection } from './schema.js';

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
