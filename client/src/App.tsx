import { useEffect, useMemo, useRef, useState } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { computeCoverage } from '../../shared/coverage';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Coverage,
  IntakeResponse,
  Reflection,
} from '../../shared/schema';
import { BlindSpotCard, type CardState } from './components/BlindSpotCard';
import { DecisionForm } from './components/DecisionForm';
import { HighlightedText } from './components/HighlightedText';
import { Kpis } from './components/Kpis';
import { VoiceAgent } from './components/VoiceAgent';
import { Reveal } from './components/Reveal';
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

  const run = async (reflections: Reflection[], source: DecisionDraft = draft) => {
    const request: AnalyzeRequest = {
      decision: source.decision.trim(),
      options: parseOptions(source.options),
      context: source.context.trim(),
      reasons: source.reasons.trim(),
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

  /** Voice intake finished: fill the form and go straight to the analysis when it's complete. */
  const handleVoiceComplete = (fields: IntakeResponse['fields']) => {
    const next: DecisionDraft = {
      decision: fields.decision,
      options: fields.options.join('\n'),
      context: fields.context,
      reasons: fields.reasons,
    };
    setDraft(next);
    if (next.decision.length >= 5 && next.options && next.reasons.length >= 5) {
      void run([], next);
    } else {
      document.getElementById('write')?.scrollIntoView({ behavior: 'smooth' });
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

  const steps: { id: Stage; label: string }[] = [
    { id: 'input', label: 'Describe' },
    { id: 'review', label: 'Examine' },
    { id: 'summary', label: 'Decide' },
  ];

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <a className="wordmark" href="/" aria-label="BlindSpot home">
              <span className="logo" aria-hidden="true" />
              BlindSpot
            </a>
            <ol className="stepper" aria-label="Progress">
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className={step.id === stage ? 'active' : undefined}
                  aria-current={step.id === stage ? 'step' : undefined}
                >
                  <span className="mono">0{index + 1}</span> {step.label}
                </li>
              ))}
            </ol>
          </div>
        </header>

        <main id="main" className="shell">
          <div role="alert" aria-live="assertive" className={error ? 'error' : 'visually-hidden'}>
            {error}
          </div>
          <p className="visually-hidden" aria-live="polite">
            {busy ? 'Analyzing your reasoning…' : ''}
          </p>

          {stage === 'input' && (
            <>
              <Reveal>
                <section className="hero" aria-labelledby="hero-title">
                  <p className="eyebrow">The Blind Spot · A thinking companion</p>
                  <h1 id="hero-title">
                    <span className="hero-quiet">Every decision has a blind spot.</span>
                    <br />
                    Find yours before you commit.
                  </h1>
                  <p className="hero-sub">
                    Talk through a decision you’re facing. BlindSpot maps what your reasoning
                    covers, surfaces the assumptions and conflicts you missed, and asks better
                    questions. It never decides for you.
                  </p>
                </section>
              </Reveal>

              <Reveal delay={0.1}>
                <VoiceAgent onComplete={handleVoiceComplete} />
              </Reveal>

              <section className="how" aria-labelledby="how-title">
                <h2 id="how-title" className="section-title">
                  Three steps. No verdicts.
                </h2>
                <ol className="how-grid">
                  <li>
                    <span className="mono muted">01</span>
                    <h3>Spotlight</h3>
                    <p>
                      See which parts of life your reasoning lights up, and which sit in shadow.
                    </p>
                  </li>
                  <li>
                    <span className="mono muted">02</span>
                    <h3>Examine</h3>
                    <p>
                      Work through overlooked factors, unstated assumptions and conflicts in your
                      own words.
                    </p>
                  </li>
                  <li>
                    <span className="mono muted">03</span>
                    <h3>Decide</h3>
                    <p>
                      Leave with a reasoning summary and open questions. The choice stays yours.
                    </p>
                  </li>
                </ol>
              </section>

              <section id="write" aria-labelledby="write-title" className="write">
                <h2 id="write-title" className="section-title">
                  Prefer to write it down?
                </h2>
                <DecisionForm
                  draft={draft}
                  onChange={setDraft}
                  onSubmit={() => run([])}
                  busy={busy}
                />
              </section>
            </>
          )}

          {stage === 'input' && busy && (
            <div className="panel skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          {stage === 'review' && result && liveCoverage && (
            <>
              <Reveal>
                <header className="dash-head">
                  <p className="eyebrow">Analysis</p>
                  <h1 id="dash-title" ref={headingRef} tabIndex={-1}>
                    {draft.decision}
                  </h1>
                  <Kpis
                    coverage={liveCoverage}
                    findings={result.findings}
                    reflected={currentReflections.length}
                  />
                </header>
              </Reveal>

              <Reveal delay={0.08}>
                <section className="panel" aria-labelledby="spotlight-title">
                  <div className="panel-head">
                    <p className="eyebrow">01 · Spotlight</p>
                    <h2 id="spotlight-title">Where your reasoning is focused</h2>
                  </div>
                  <div className="spotlight">
                    <div>
                      <p className="legend" aria-label="Highlight legend">
                        <span className="key key-focus">Focus</span>
                        <span className="key key-assumption">Assumption</span>
                        <span className="key key-conflict">Conflict</span>
                      </p>
                      <HighlightedText text={userText} marks={marksFor(result)} />
                    </div>
                    <ShadowMap coverage={liveCoverage} />
                  </div>
                </section>
              </Reveal>

              <section aria-labelledby="spots-title">
                <div className="panel-head">
                  <p className="eyebrow">02 · Examine</p>
                  <h2 id="spots-title">Blind spots worth a second look</h2>
                  <p className="muted">
                    Mark each one as you think it through. The answers are yours; BlindSpot only
                    asks.
                  </p>
                  {result.blockedCount > 0 && (
                    <p className="guard-note">
                      <span className="mono">Guard</span> {result.blockedCount} AI suggestion
                      {result.blockedCount > 1 ? 's were' : ' was'} removed for trying to decide for
                      you.
                    </p>
                  )}
                </div>
                <div className="spots">
                  {result.findings.map((finding, index) => (
                    <Reveal key={finding.id} delay={0.15 + index * 0.06} className="spot-cell">
                      <BlindSpotCard
                        index={index}
                        finding={finding}
                        state={cards[finding.id] ?? { note: '' }}
                        onChange={(state) => setCards((prev) => ({ ...prev, [finding.id]: state }))}
                      />
                    </Reveal>
                  ))}
                </div>
              </section>

              <div className="actionbar">
                <p className="mono muted">{liveCoverage.percent}% examined</p>
                <div className="actions">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy || !currentReflections.length}
                    onClick={() => run(allReflections)}
                  >
                    {busy ? 'Re-scanning…' : 'Re-scan with my reflections'}
                  </button>
                  <button type="button" className="btn primary" onClick={() => setStage('summary')}>
                    See my reasoning summary
                  </button>
                </div>
              </div>
            </>
          )}

          {stage === 'summary' && liveCoverage && initialCoverage && (
            <Reveal>
              <Summary
                decision={draft.decision}
                before={initialCoverage}
                after={liveCoverage}
                reflections={allReflections}
                onRestart={restart}
              />
            </Reveal>
          )}
        </main>

        <footer className="footer">
          <div className="shell footer-inner">
            <span>BlindSpot</span>
            <span className="mono">PromptWars · The Blind Spot · Gemini</span>
          </div>
        </footer>
      </MotionConfig>
    </LazyMotion>
  );
}
