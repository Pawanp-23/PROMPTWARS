import { lazy, Suspense } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { Reveal } from './components/Reveal';
import { TopBar } from './components/TopBar';
import { useBlindSpot } from './hooks/useBlindSpot';
import { LandingView } from './views/LandingView';

// Only needed after an analysis, so they are split out of the initial bundle.
const DashboardView = lazy(() => import('./views/DashboardView'));
const Summary = lazy(() => import('./components/Summary'));

/** App shell: layout, live regions, and the three stages of a BlindSpot session. */
export function App() {
  const session = useBlindSpot();
  const { stage, draft, result, liveCoverage, initialCoverage, busy, error } = session;
  const userText = [draft.reasons, draft.context].filter(Boolean).join('\n\n');

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <TopBar stage={stage} />

        <main id="main" className="shell">
          <div role="alert" aria-live="assertive" className={error ? 'error' : 'visually-hidden'}>
            {error}
          </div>
          <p className="visually-hidden" aria-live="polite">
            {busy ? 'Analyzing your reasoning…' : ''}
          </p>

          {stage === 'input' && (
            <LandingView
              draft={draft}
              busy={busy}
              onDraftChange={session.setDraft}
              onAnalyze={session.analyzeDraft}
              onIntakeComplete={session.completeIntake}
            />
          )}

          <Suspense fallback={<div className="panel skeleton" aria-hidden="true" />}>
            {stage === 'review' && result && liveCoverage && (
              <DashboardView
                decision={draft.decision}
                userText={userText}
                result={result}
                coverage={liveCoverage}
                cards={session.cards}
                reflectedCount={session.currentReflections.length}
                busy={busy}
                onCardChange={session.updateCard}
                onRescan={session.rescan}
                onFinish={() => session.setStage('summary')}
              />
            )}

            {stage === 'summary' && liveCoverage && initialCoverage && (
              <Reveal>
                <Summary
                  decision={draft.decision}
                  before={initialCoverage}
                  after={liveCoverage}
                  reflections={session.allReflections}
                  onRestart={session.restart}
                />
              </Reveal>
            )}
          </Suspense>
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
