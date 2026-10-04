import {
  AREA_LABELS,
  BIAS_LABELS,
  FINDING_LABELS,
  type ReflectionStatus,
} from '../../../shared/areas';
import type { Finding } from '../../../shared/schema';

export interface CardState {
  status?: ReflectionStatus;
  note: string;
}

export const STATUS_OPTIONS: { value: ReflectionStatus; label: string }[] = [
  { value: 'considered', label: 'Considered' },
  { value: 'unknown', label: 'Need to find out' },
  { value: 'not_relevant', label: 'Not relevant' },
];

interface Props {
  index: number;
  finding: Finding;
  state: CardState;
  onChange: (state: CardState) => void;
}

/** One blind spot: what we noticed, why it may matter, and a question. The user reflects; we never answer. */
export function BlindSpotCard({ index, finding, state, onChange }: Props) {
  const headingId = `${finding.id}-title`;
  return (
    <article
      className={`spot spot-${finding.type}${state.status ? ' is-marked' : ''}`}
      aria-labelledby={headingId}
    >
      <header className="spot-meta">
        <span className="mono">{String(index + 1).padStart(2, '0')}</span>
        <span className={`tag tag-${finding.type}`}>{FINDING_LABELS[finding.type]}</span>
        {finding.bias && (
          <span className="tag tag-bias" title="A common thinking pattern, not a judgement">
            {BIAS_LABELS[finding.bias]}
          </span>
        )}
        <span className="mono muted">{AREA_LABELS[finding.area]}</span>
      </header>

      <h3 id={headingId} className="question">
        {finding.question}
      </h3>

      {finding.quote && (
        <p className="quote">
          <span className="mono muted">You said</span> “{finding.quote}”
          {finding.quoteB && (
            <>
              {' '}
              <span className="mono muted">but also</span> “{finding.quoteB}”
            </>
          )}
        </p>
      )}
      {finding.insight && <p className="insight">{finding.insight}</p>}

      <fieldset className="reflect">
        <legend className="visually-hidden">Your reflection on this question</legend>
        <div className="segmented">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="segment">
              <input
                type="radio"
                name={`status-${finding.id}`}
                value={option.value}
                checked={state.status === option.value}
                onChange={() => onChange({ ...state, status: option.value })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <label htmlFor={`${finding.id}-note`} className="visually-hidden">
          Optional note
        </label>
        <textarea
          id={`${finding.id}-note`}
          rows={2}
          maxLength={500}
          placeholder="Your thoughts (optional)"
          value={state.note}
          onChange={(e) => onChange({ ...state, note: e.target.value })}
        />
      </fieldset>
    </article>
  );
}
