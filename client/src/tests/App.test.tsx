// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { App } from '../App';
import type { AnalyzeResponse } from '../../../shared/schema';

const response: AnalyzeResponse = {
  focus: [{ area: 'finances', quote: 'the stipend is good' }],
  findings: [
    {
      id: 'f1',
      type: 'overlooked',
      area: 'academics',
      insight: 'The internship overlaps with your semester.',
      question: 'How will your exams fit around a 10am–6pm job?',
    },
    {
      id: 'f2',
      type: 'assumption',
      area: 'learning_growth',
      quote: 'it will give me industry experience',
      insight: 'Experience depends on real work and mentorship.',
      question: 'What will you actually work on, and who will mentor you?',
    },
  ],
  coverage: { covered: ['finances'], shadow: [], percent: 13 },
  blockedCount: 1,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function noViolations(container: HTMLElement) {
  // color-contrast needs a real layout engine, which jsdom lacks.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

describe('App', () => {
  it('renders an accessible form', async () => {
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByLabelText('What decision are you facing?')).toBeTruthy();
    await noViolations(container);
  });

  it('runs the internship example end to end without ever giving a verdict', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Try the internship example' }));
    await user.click(screen.getByRole('button', { name: 'Find my blind spots' }));

    expect(await screen.findByText('How will your exams fit around a 10am–6pm job?')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analyze',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByText(/removed for trying to decide/)).toBeTruthy();
    await noViolations(container);

    // Reflecting on an overlooked area lights it up immediately.
    await user.click(screen.getAllByLabelText('Considered')[0]);
    expect(screen.getAllByText(/25% of areas examined/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'See my reasoning summary' }));
    expect(screen.getByRole('heading', { name: 'Your decision, your call' })).toBeTruthy();
    expect(screen.getByText(/BlindSpot doesn’t decide\./)).toBeTruthy();
    expect(container.textContent).not.toMatch(/you should|I recommend/i);
  });

  it('shows a friendly error and keeps the input when the API fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'The AI could not analyze this right now.' }), {
        status: 502,
      }),
    );
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Try the internship example' }));
    await user.click(screen.getByRole('button', { name: 'Find my blind spots' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'The AI could not analyze this right now.',
    );
    expect(
      (screen.getByLabelText('What decision are you facing?') as HTMLInputElement).value,
    ).toContain('internship');
  });
});
