import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { CLOSING_LINE, hasEnough, intakeTurn, MAX_USER_TURNS } from '../engine/intake.js';
import type { IntakeRequest, IntakeResponse } from '../../shared/schema.js';
import { fakeClient } from './fixtures.js';

const emptyFields = { decision: '', options: [], context: '', reasons: '' };
const fullFields = {
  decision: 'Should I accept the internship?',
  options: ['Accept', 'Decline', ''],
  context: 'Overlaps with my 5th semester.',
  reasons: 'The stipend is good and it is close to home.',
};

const turn = (overrides: Partial<IntakeResponse>): IntakeResponse => ({
  reply: 'What options are you choosing between?',
  done: false,
  fields: emptyFields,
  ...overrides,
});

const history = (userTurns: number): IntakeRequest => ({
  history: Array.from({ length: userTurns }, (_, i) => [
    { role: 'agent' as const, text: `Question ${i}?` },
    { role: 'user' as const, text: `Answer ${i}` },
  ]).flat(),
});

describe('intakeTurn', () => {
  it('passes the next question through while the interview continues', async () => {
    const result = await intakeTurn(history(1), fakeClient(turn({})));
    expect(result.done).toBe(false);
    expect(result.reply).toBe('What options are you choosing between?');
  });

  it('replaces any reply that steers the decision', async () => {
    const result = await intakeTurn(
      history(2),
      fakeClient(turn({ reply: 'Honestly, you should take it. Why do you hesitate?' })),
    );
    expect(result.reply).not.toMatch(/should/i);
    expect(result.reply.endsWith('?')).toBe(true);
  });

  it('finishes with a neutral closing line once the fields are complete', async () => {
    const result = await intakeTurn(
      history(4),
      fakeClient(turn({ done: true, reply: 'Great choice!', fields: fullFields })),
    );
    expect(result.done).toBe(true);
    expect(result.reply).toBe(CLOSING_LINE);
    expect(result.fields.options).toEqual(['Accept', 'Decline']);
  });

  it('does not finish early when the model claims done without reasons', async () => {
    const result = await intakeTurn(
      history(2),
      fakeClient(turn({ done: true, fields: { ...fullFields, reasons: '' } })),
    );
    expect(result.done).toBe(false);
  });

  it(`ends after ${MAX_USER_TURNS} answers so the user is never stuck`, async () => {
    const result = await intakeTurn(history(MAX_USER_TURNS), fakeClient(turn({})));
    expect(result.done).toBe(true);
  });

  it('rejects malformed model output', async () => {
    await expect(intakeTurn(history(1), fakeClient('nope'))).rejects.toThrow();
  });
});

describe('hasEnough', () => {
  it('requires a decision, an option, and reasons', () => {
    expect(hasEnough(fullFields)).toBe(true);
    expect(hasEnough({ ...fullFields, options: [' '] })).toBe(false);
    expect(hasEnough(emptyFields)).toBe(false);
  });
});

describe('POST /api/intake', () => {
  it('returns the next turn', async () => {
    const res = await request(createApp({ client: fakeClient(turn({})) }))
      .post('/api/intake')
      .send(history(1));
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('?');
  });

  it('rejects an empty or oversized conversation', async () => {
    const app = createApp({ client: fakeClient(turn({})) });
    expect((await request(app).post('/api/intake').send({ history: [] })).status).toBe(400);
    expect((await request(app).post('/api/intake').send(history(8))).status).toBe(400);
  });
});
