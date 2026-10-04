import { useEffect, useMemo, useRef, useState } from 'react';
import { computeCoverage } from '../../shared/coverage';
import type { AnalyzeRequest, AnalyzeResponse, Coverage, Reflection } from '../../shared/schema';
import { BlindSpotCard, type CardState } from './components/BlindSpotCard';
import { DecisionForm } from './components/DecisionForm';
import { HighlightedText } from './components/HighlightedText';
import { ShadowMap } from './components/ShadowMap';
import { Summary } from './components/Summary';
import { analyze } from './lib/api';
import { parseOptions, type Mark } from './lib/highlight';
import { EMPTY_DRAFT, type DecisionDraft } from './lib/sample';

type Stage = 'input' | 'review' | 'summary';

/** Marks to highlight in the user's text: what they focused on, assumptions, and conflicts. */
function marksFor(result: AnalyzeResponse): Mark[] {
  const marks: Mark[] = result.focus.map((f) => ({ quote: f.quote, kind: 'focus' }));
  for (const finding of result.findings) {
    if (finding.type === 'overlooked') continue;
    if (finding.quote) marks.push({ quote: finding.quote, kind: finding.type });
    if (finding.quoteB) marks.push({ quote: finding.quoteB, kind: finding.type });
  }
  return marks;
}

export function App() {
  const [stage, setStage] = useState<Stage>('input');
  const [draft, setDraft] = useState<DecisionDraft>(EMPTY_DRAFT);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [initialCoverage, setInitialCoverage] = useState<Coverage | null>(null);
  const [pastReflections, setPastReflections] = useState<Reflection[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Move focus to the new section heading so keyboard and screen-reader users land on the results.
    if (stage === 'review') headingRef.current?.focus();
    if (stage === 'summary') document.getElementById('summary-title')?.focus();
  }, [stage, result]);

  /** Reflections from the current cards that the user has actually marked. */
  const currentReflections = useMemo<Reflection[]>(
    () =>
      (result?.findings ?? []).flatMap((finding) => {
        const card = cards[finding.id];
        if (!card?.status) return [];
        return [
          {
            findingId: finding.id,
            area: finding.area,
            question: finding.question,
            status: card.status,
            note: card.note.trim() || undefined,
          },
        ];
      }),
    [result, cards],
  );

  const allReflections = useMemo(
    () => [...pastReflections, ...currentReflections],
    [pastReflections, currentReflections],
  );

  // The map lights up live as the user reflects, using the same logic as the server.
  const liveCoverage = useMemo(
    () => (result ? computeCoverage(result.focus, allReflections) : null),
    [result, allReflections],
  );

  const run = async (reflections: Reflection[]) => {
    const request: AnalyzeRequest = {
      decision: draft.decision.trim(),
      options: parseOptions(draft.options),
      context: draft.context.trim(),
      reasons: draft.reasons.trim(),
      reflections: reflections.length ? reflections.slice(-12) : undefined,
    };
    if (!request.options.length) {
      setError('Please add at least one option.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await analyze(request);
      setResult(response);
      setCards({});
      setPastReflections(reflections);
      if (!initialCoverage) setInitialCoverage(response.coverage);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStage('input');
    setResult(null);
    setInitialCoverage(null);
    setPastReflections([]);
    setCards({});
    setError('');
  };

  const userText = [draft.reasons, draft.context].filter(Boolean).join('\n\n');

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <div>
            <h1>BlindSpot</h1>
            <p className="tagline">See what you’re not seeing.</p>
          </div>
        </div>
        <p className="promise">
          An AI thinking companion that examines your reasoning.{' '}
          <strong>It never decides for you.</strong>
        </p>
      </header>

      <main id="main">
        <div role="alert" aria-live="assertive" className={error ? 'error' : 'visually-hidden'}>
          {error}
        </div>
        <p className="visually-hidden" aria-live="polite">
          {busy ? 'Analyzing your reasoning…' : ''}
        </p>

        {stage === 'input' && (
          <DecisionForm draft={draft} onChange={setDraft} onSubmit={() => run([])} busy={busy} />
        )}

        {stage === 'review' && result && liveCoverage && (
          <>
            <section className="card" aria-labelledby="spotlight-title">
              <h2 id="spotlight-title" ref={headingRef} tabIndex={-1}>
                2. Spotlight: where your reasoning is focused
              </h2>
              <div className="spotlight">
                <div>
                  <p className="legend">
                    <span className="mark-focus">focus</span>
                    <span className="mark-assumption">assumption</span>
                    <span className="mark-conflict">conflict</span>
                  </p>
                  <HighlightedText text={userText} marks={marksFor(result)} />
                </div>
                <ShadowMap coverage={liveCoverage} />
              </div>
            </section>

            <section aria-labelledby="spots-title">
              <h2 id="spots-title" className="section-title">
                3. Blind spots to examine
              </h2>
              <p className="muted">
                Mark each one. Answers are yours; BlindSpot only asks.
                {result.blockedCount > 0 &&
                  ` (${result.blockedCount} AI suggestion${result.blockedCount > 1 ? 's were' : ' was'} removed because ${result.blockedCount > 1 ? 'they' : 'it'} tried to decide for you.)`}
              </p>
              <div className="spots">
                {result.findings.map((finding) => (
                  <BlindSpotCard
                    key={finding.id}
                    finding={finding}
                    state={cards[finding.id] ?? { note: '' }}
                    onChange={(state) => setCards((prev) => ({ ...prev, [finding.id]: state }))}
                  />
                ))}
              </div>
            </section>

            <div className="actions sticky">
              <button
                type="button"
                className="btn ghost"
                disabled={busy || !currentReflections.length}
                onClick={() => run(allReflections)}
              >
                {busy ? 'Re-scanning…' : '4. Re-scan with my reflections'}
              </button>
              <button type="button" className="btn primary" onClick={() => setStage('summary')}>
                5. See my reasoning summary
              </button>
            </div>
          </>
        )}

        {stage === 'summary' && liveCoverage && initialCoverage && (
          <Summary
            decision={draft.decision}
            before={initialCoverage}
            after={liveCoverage}
            reflections={allReflections}
            onRestart={restart}
          />
        )}
      </main>

      <footer className="site-footer">
        Built for PromptWars · THE BLIND SPOT · Powered by Google Gemini
      </footer>
    </>
  );
}
