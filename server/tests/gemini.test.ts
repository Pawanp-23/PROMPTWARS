import { describe, expect, it } from 'vitest';
import { isRetryable, withFallback } from '../engine/gemini.js';
import { ANALYSIS_SCHEMA as RESPONSE_SCHEMA } from '../engine/schemas.js';
import { AREAS } from '../../shared/areas.js';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('withFallback', () => {
  it('returns the first model that succeeds after overload errors', async () => {
    const tried: string[] = [];
    const result = await withFallback(['a', 'b', 'c'], async (model) => {
      tried.push(model);
      if (model !== 'c') throw httpError(503);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(tried).toEqual(['a', 'b', 'c']);
  });

  it('stops immediately on non-retryable errors such as a bad key', async () => {
    const tried: string[] = [];
    await expect(
      withFallback(['a', 'b'], async (model) => {
        tried.push(model);
        throw httpError(403);
      }),
    ).rejects.toThrow('HTTP 403');
    expect(tried).toEqual(['a']);
  });

  it('makes a second pass after a short backoff when every model is busy', async () => {
    let calls = 0;
    const result = await withFallback(
      ['a', 'b'],
      async () => {
        calls += 1;
        if (calls <= 2) throw httpError(503);
        return 'recovered';
      },
      { backoffMs: 1 },
    );
    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('throws the last error when every model is busy', async () => {
    await expect(
      withFallback(['a', 'b'], async () => Promise.reject(httpError(429)), { backoffMs: 1 }),
    ).rejects.toThrow('HTTP 429');
  });
});

describe('isRetryable', () => {
  it.each([429, 500, 503, 404])('retries on %i', (status) => {
    expect(isRetryable(httpError(status))).toBe(true);
  });

  it('does not retry on client errors or unknown failures', () => {
    expect(isRetryable(httpError(400))).toBe(false);
    expect(isRetryable(new Error('boom'))).toBe(false);
  });
});

describe('RESPONSE_SCHEMA', () => {
  it('constrains areas to the fixed list used for coverage', () => {
    const findings = RESPONSE_SCHEMA.properties?.findings?.items;
    expect(findings?.properties?.area?.enum).toEqual([...AREAS]);
  });
});
