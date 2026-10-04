import type { Stage } from '../hooks/useBlindSpot';

const STEPS: { id: Stage; label: string }[] = [
  { id: 'input', label: 'Describe' },
  { id: 'review', label: 'Examine' },
  { id: 'summary', label: 'Decide' },
];

/** Sticky header with the wordmark and the three-step progress indicator. */
export function TopBar({ stage }: { stage: Stage }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="wordmark" href="/" aria-label="BlindSpot home">
          <span className="logo" aria-hidden="true" />
          BlindSpot
        </a>
        <ol className="stepper" aria-label="Progress">
          {STEPS.map((step, index) => (
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
  );
}
