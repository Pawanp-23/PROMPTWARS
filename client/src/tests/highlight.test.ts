import { describe, expect, it } from 'vitest';
import { buildSegments, parseOptions } from '../lib/highlight';
import { summaryText } from '../components/Summary';

describe('buildSegments', () => {
  it('marks quotes case-insensitively and keeps surrounding text', () => {
    const segments = buildSegments('The stipend is good and close to home.', [
      { quote: 'STIPEND is good', kind: 'focus' },
      { quote: 'close to home', kind: 'assumption' },
    ]);
    expect(segments).toEqual([
      { text: 'The ' },
      { text: 'stipend is good', kind: 'focus' },
      { text: ' and ' },
      { text: 'close to home', kind: 'assumption' },
      { text: '.' },
    ]);
  });

  it('ignores quotes that are missing or overlap an earlier mark', () => {
    const segments = buildSegments('abc def', [
      { quote: 'abc de', kind: 'focus' },
      { quote: 'c def', kind: 'conflict' },
      { quote: 'zzz', kind: 'assumption' },
    ]);
    expect(segments.filter((s) => s.kind)).toEqual([{ text: 'abc de', kind: 'focus' }]);
  });
});

describe('parseOptions', () => {
  it('splits lines, trims, drops blanks and caps at five', () => {
    expect(parseOptions(' A \n\nB\nC\nD\nE\nF')).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('summaryText', () => {
  it('lists open questions and never contains a verdict', () => {
    const text = summaryText({
      decision: 'Take the internship?',
      before: { covered: ['finances'], shadow: ['academics'], percent: 13 },
      after: { covered: ['finances', 'academics'], shadow: [], percent: 25 },
      reflections: [
        { findingId: 'f1', area: 'academics', question: 'How will exams fit?', status: 'unknown' },
      ],
    });
    expect(text).toContain('- How will exams fit?');
    expect(text).toContain('13% → 25%');
    expect(text).toContain('BlindSpot does not decide. I do.');
    expect(text).not.toMatch(/you should|recommend/i);
  });
});
