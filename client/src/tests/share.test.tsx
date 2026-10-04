// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Summary from '../components/Summary';
import { App } from '../App';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

const saved = {
  decision: 'Should I accept the internship?',
  before: { covered: ['finances'], shadow: ['academics'], percent: 13 },
  after: { covered: ['finances', 'academics'], shadow: [], percent: 25 },
  reflections: [
    { findingId: 'f1', area: 'academics', question: 'How will exams fit?', status: 'unknown' },
  ],
} as const;

describe('save and share', () => {
  it('saves the summary and shows a share link', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'abc123XYZ_' }), { status: 201 }));
    render(
      <Summary
        decision={saved.decision}
        before={{
          ...saved.before,
          covered: [...saved.before.covered],
          shadow: [...saved.before.shadow],
        }}
        after={{ ...saved.after, covered: [...saved.after.covered], shadow: [] }}
        reflections={saved.reflections.map((r) => ({ ...r }))}
        onRestart={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save & get a share link' }));
    expect(await screen.findByRole('link', { name: /\?s=abc123XYZ_/ })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/summaries',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('opens a shared summary from the ?s= link, read-only', async () => {
    window.history.replaceState(null, '', '/?s=abc123XYZ_');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(saved), { status: 200 }),
    );
    render(<App />);
    expect(await screen.findByText('Shared reasoning summary')).toBeTruthy();
    expect(screen.getByText('How will exams fit?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save & get a share link' })).toBeNull();
  });

  it('explains an expired or missing link', async () => {
    window.history.replaceState(null, '', '/?s=missing1234');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'This summary was not found or has expired.' }), {
        status: 404,
      }),
    );
    render(<App />);
    expect(await screen.findByText('This summary was not found or has expired.')).toBeTruthy();
  });
});
