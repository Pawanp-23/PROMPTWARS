import type { FormEvent } from 'react';
import { INTERNSHIP_SAMPLE, type DecisionDraft } from '../lib/sample';

interface Props {
  draft: DecisionDraft;
  onChange: (draft: DecisionDraft) => void;
  onSubmit: () => void;
  busy: boolean;
}

/** Step 1 — the user describes the decision and, crucially, why they are leaning one way. */
export function DecisionForm({ draft, onChange, onSubmit, busy }: Props) {
  const update = (field: keyof DecisionDraft) => (value: string) =>
    onChange({ ...draft, [field]: value });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="card form" onSubmit={handleSubmit} aria-describedby="form-help">
      <div className="form-head">
        <h2>1. Tell BlindSpot what you're deciding</h2>
        <button type="button" className="btn ghost" onClick={() => onChange(INTERNSHIP_SAMPLE)}>
          Try the internship example
        </button>
      </div>
      <p id="form-help" className="muted">
        Be honest about why you're leaning one way. That reasoning is what BlindSpot examines.
      </p>

      <label htmlFor="decision">What decision are you facing?</label>
      <input
        id="decision"
        required
        minLength={5}
        maxLength={300}
        value={draft.decision}
        onChange={(e) => update('decision')(e.target.value)}
        placeholder="e.g. Should I accept a 6-month internship?"
      />

      <label htmlFor="options">Your options (one per line)</label>
      <textarea
        id="options"
        required
        rows={2}
        maxLength={600}
        value={draft.options}
        onChange={(e) => update('options')(e.target.value)}
        placeholder={'Accept the internship\nDecline it'}
      />

      <label htmlFor="context">Relevant details</label>
      <textarea
        id="context"
        rows={4}
        maxLength={2000}
        value={draft.context}
        onChange={(e) => update('context')(e.target.value)}
        placeholder="Stipend, location, hours, role, schedule…"
      />

      <label htmlFor="reasons">Why are you leaning this way?</label>
      <textarea
        id="reasons"
        required
        minLength={5}
        rows={3}
        maxLength={1500}
        value={draft.reasons}
        onChange={(e) => update('reasons')(e.target.value)}
        placeholder="I'm mainly considering it because…"
      />

      <button type="submit" className="btn primary" disabled={busy} aria-busy={busy}>
        {busy ? 'Looking for blind spots…' : 'Find my blind spots'}
      </button>
    </form>
  );
}
