import { AREA_LABELS, FINDING_LABELS, type ReflectionStatus } from '../../../shared/areas';
import type { Finding } from '../../../shared/schema';

export interface CardState {
  status?: ReflectionStatus;
  note: string;
}

const STATUS_OPTIONS: { value: ReflectionStatus; label: string }[] = [
  { value: 'considered', label: '✅ I’ve considered this' },
  { value: 'unknown', label: '🤔 Need to find out' },
  { value: 'not_relevant', label: '➖ Not relevant to me' },
];

interface Props {
  finding: Finding;
  state: CardState;
  onChange: (state: CardState) => void;
}

/** One blind spot: what we noticed, why it may matter, and a question. The user reflects; we never answer. */
export function BlindSpotCard({ finding, state, onChange }: Props) {
  const headingId = `${finding.id}-title`;
  return (
    <article className={`card spot spot-${finding.type}`} aria-labelledby={headingId}>
      <header>
        <span className={`badge badge-${finding.type}`}>{FINDING_LABELS[finding.type]}</span>
        <span className="muted">{AREA_LABELS[finding.area]}</span>
      </header>

      {finding.quote && (
        <p className="quote">
          You said: <q>{finding.quote}</q>
          {finding.quoteB && (
            <>
              {' '}
              but also: <q>{finding.quoteB}</q>
            </>
          )}
        </p>
      )}
      {finding.insight && <p>{finding.insight}</p>}
      <h3 id={headingId} className="question">
        {finding.question}
      </h3>

      <fieldset>
        <legend className="visually-hidden">Your reflection on this question</legend>
        <div className="choices">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name={`status-${finding.id}`}
                value={option.value}
                checked={state.status === option.value}
                onChange={() => onChange({ ...state, status: option.value })}
              />
              {option.label}
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
