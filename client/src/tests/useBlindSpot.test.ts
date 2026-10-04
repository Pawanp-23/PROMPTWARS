import { describe, expect, it } from 'vitest';
import { draftFromIntake, isComplete, toRequest } from '../hooks/useBlindSpot';
import { marksFor } from '../lib/highlight';
import { INTERNSHIP_SAMPLE } from '../lib/sample';

describe('toRequest', () => {
  it('trims fields, splits options, and caps reflections at 12', () => {
    const reflections = Array.from({ length: 15 }, (_, i) => ({
      findingId: `f${i}`,
      area: 'academics' as const,
      question: 'q?',
      status: 'considered' as const,
    }));
    const request = toRequest({ ...INTERNSHIP_SAMPLE, decision: '  Take it?  ' }, reflections);
    expect(request.decision).toBe('Take it?');
    expect(request.options).toHaveLength(2);
    expect(request.reflections).toHaveLength(12);
    expect(toRequest(INTERNSHIP_SAMPLE, []).reflections).toBeUndefined();
  });
});

describe('draftFromIntake / isComplete', () => {
  const fields = {
    decision: 'Should I take the internship?',
    options: ['Take it', 'Skip it'],
    context: 'Overlaps with exams.',
    reasons: 'Good stipend.',
  };

  it('maps intake fields to a complete draft', () => {
    const draft = draftFromIntake(fields);
    expect(draft.options).toBe('Take it\nSkip it');
    expect(isComplete(draft)).toBe(true);
  });

  it('flags drafts that still need the form', () => {
    expect(isComplete(draftFromIntake({ ...fields, reasons: '' }))).toBe(false);
    expect(isComplete(draftFromIntake({ ...fields, options: [] }))).toBe(false);
  });
});

describe('marksFor', () => {
  it('highlights focus, assumption and both sides of a conflict, but not overlooked areas', () => {
    const marks = marksFor({
      focus: [{ area: 'finances', quote: 'stipend' }],
      findings: [
        {
          id: 'f1',
          type: 'conflict',
          area: 'academics',
          quote: 'a',
          quoteB: 'b',
          insight: '',
          question: '?',
        },
        {
          id: 'f2',
          type: 'overlooked',
          area: 'alternatives',
          quote: 'x',
          insight: '',
          question: '?',
        },
      ],
    });
    expect(marks).toEqual([
      { quote: 'stipend', kind: 'focus' },
      { quote: 'a', kind: 'conflict' },
      { quote: 'b', kind: 'conflict' },
    ]);
  });
});
