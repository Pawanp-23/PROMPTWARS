import { describe, expect, it } from 'vitest';
import { groundFindings, groundFocus, isGrounded } from '../engine/quotes.js';
import type { Finding } from '../../shared/schema.js';

const source = 'The stipend is GOOD and the office is\nclose to home.';

describe('isGrounded', () => {
  it('matches verbatim quotes ignoring case and whitespace', () => {
    expect(isGrounded('the stipend is good', source)).toBe(true);
    expect(isGrounded('office is close to home', source)).toBe(true);
  });

  it('rejects invented, empty, or trivially short quotes', () => {
    expect(isGrounded('great mentorship', source)).toBe(false);
    expect(isGrounded('', source)).toBe(false);
    expect(isGrounded('is', source)).toBe(false);
    expect(isGrounded(undefined, source)).toBe(false);
  });
});

describe('groundFindings', () => {
  const base: Finding = {
    id: 'f1',
    type: 'conflict',
    area: 'finances',
    insight: 'i',
    question: 'q?',
  };

  it('removes hallucinated quotes but keeps the finding', () => {
    const [result] = groundFindings([{ ...base, quote: 'invented words' }], source);
    expect(result.quote).toBeUndefined();
    expect(result.question).toBe('q?');
  });

  it('keeps quoteB only when quote is also grounded', () => {
    const [both] = groundFindings(
      [{ ...base, quote: 'stipend is good', quoteB: 'close to home' }],
      source,
    );
    expect(both.quoteB).toBe('close to home');
    const [orphan] = groundFindings(
      [{ ...base, quote: 'nope nope', quoteB: 'close to home' }],
      source,
    );
    expect(orphan.quoteB).toBeUndefined();
  });
});

describe('groundFocus', () => {
  it('keeps only evidenced focus items', () => {
    const focus = groundFocus(
      [
        { area: 'finances', quote: 'stipend is good' },
        { area: 'academics', quote: 'my grades are fine' },
      ],
      source,
    );
    expect(focus).toEqual([{ area: 'finances', quote: 'stipend is good' }]);
  });
});
