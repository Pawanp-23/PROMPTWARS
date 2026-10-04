// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('VoiceAgent', () => {
  it('works without a microphone: typed answers fill the form and open the analysis', async () => {
    const user = userEvent.setup();
    const fields = {
      decision: 'Should I accept the internship?',
      options: ['Accept', 'Decline'],
      context: 'Overlaps with my semester.',
      reasons: 'The stipend is good.',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ reply: 'Thank you.', done: true, fields }))
      .mockResolvedValueOnce(
        json({
          focus: [],
          findings: [
            {
              id: 'f1',
              type: 'overlooked',
              area: 'academics',
              insight: 'It overlaps with exams.',
              question: 'How will exams fit around work?',
            },
          ],
          coverage: { covered: [], shadow: [], percent: 0 },
          blockedCount: 0,
        }),
      );

    render(<App />);
    expect(screen.getByRole('button', { name: 'Start voice conversation' })).toBeTruthy();

    await user.type(screen.getByLabelText('Type your answer'), 'I got an internship offer');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('How will exams fit around work?')).toBeTruthy();
    const intakeBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(intakeBody.history.at(-1)).toEqual({ role: 'user', text: 'I got an internship offer' });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/analyze');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(fields.decision);
  });
});
