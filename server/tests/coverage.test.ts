import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../../shared/coverage.js';
import { AREAS } from '../../shared/areas.js';

describe('computeCoverage', () => {
  it('lights only the areas the user relied on', () => {
    const coverage = computeCoverage([
      { area: 'finances', quote: 'stipend' },
      { area: 'finances', quote: 'pay' },
      { area: 'health_time', quote: 'close' },
    ]);
    expect(coverage.covered).toEqual(['finances', 'health_time']);
    expect(coverage.shadow).toHaveLength(AREAS.length - 2);
    expect(coverage.percent).toBe(25);
  });

  it('lights areas the user consciously examined, but not open questions', () => {
    const coverage = computeCoverage(
      [],
      [
        { findingId: 'f1', area: 'academics', question: 'q?', status: 'considered' },
        { findingId: 'f2', area: 'alternatives', question: 'q?', status: 'not_relevant' },
        { findingId: 'f3', area: 'long_term_career', question: 'q?', status: 'unknown' },
      ],
    );
    expect(coverage.covered).toEqual(['academics', 'alternatives']);
    expect(coverage.shadow).toContain('long_term_career');
  });

  it('returns 0% for empty reasoning and 100% when everything is covered', () => {
    expect(computeCoverage([]).percent).toBe(0);
    expect(computeCoverage(AREAS.map((area) => ({ area, quote: 'x' }))).percent).toBe(100);
  });
});
