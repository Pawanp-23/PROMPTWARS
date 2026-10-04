import { useEffect, useRef, useState } from 'react';
import { AREA_LABELS } from '../../../shared/areas';
import type { Coverage, Reflection } from '../../../shared/schema';
import { ShadowMap } from './ShadowMap';

interface Props {
  decision: string;
  before: Coverage;
  after: Coverage;
  reflections: Reflection[];
  onRestart: () => void;
}

/** Builds a plain-text copy of the summary for the clipboard. */
export function summaryText({
  decision,
  before,
  after,
  reflections,
}: Omit<Props, 'onRestart'>): string {
  const lines = [
    `Decision: ${decision}`,
    `Areas examined: ${before.percent}% → ${after.percent}%`,
    '',
    'Questions I still need to answer:',
    ...reflections.filter((r) => r.status === 'unknown').map((r) => `- ${r.question}`),
    '',
    'Still in shadow:',
    ...after.shadow.map((area) => `- ${AREA_LABELS[area]}`),
    '',
    'BlindSpot does not decide. I do.',
  ];
  return lines.join('\n');
}

/** Step 5 — the reasoning summary. Deliberately contains no verdict. */
export function Summary(props: Props) {
  const { decision, before, after, reflections, onRestart } = props;
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const open = reflections.filter((r) => r.status === 'unknown');
  const considered = reflections.filter((r) => r.status === 'considered');
  const setAside = reflections.filter((r) => r.status === 'not_relevant');

  const copy = async () => {
    await navigator.clipboard.writeText(summaryText(props));
    setCopied(true);
  };

  return (
    <section className="panel summary" aria-labelledby="summary-title">
      <p className="eyebrow">03 · Reasoning summary</p>
      <h2 id="summary-title" ref={headingRef} tabIndex={-1}>
        Your decision, your call
      </h2>
      <p className="lead">{decision}</p>

      <div className="maps">
        <ShadowMap coverage={before} title="Before" />
        <ShadowMap coverage={after} title="After" />
      </div>

      <h3 className="eyebrow">Questions you still need to answer</h3>
      {open.length ? (
        <ul>
          {open.map((r) => (
            <li key={r.findingId + r.question}>{r.question}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">None marked. Nice work.</p>
      )}

      <h3 className="eyebrow">What you examined</h3>
      <ul>
        {considered.map((r) => (
          <li key={r.findingId + r.question}>
            {r.question}
            {r.note && <span className="muted"> — {r.note}</span>}
          </li>
        ))}
        {setAside.map((r) => (
          <li key={r.findingId + r.question}>
            <span className="muted">(set aside)</span> {r.question}
          </li>
        ))}
      </ul>

      <p className="verdict" role="note">
        BlindSpot doesn’t decide. <strong>You do.</strong> You now have a clearer view of what
        you’re weighing.
      </p>

      <div className="actions">
        <button type="button" className="btn primary" onClick={copy}>
          {copied ? 'Copied!' : 'Copy summary'}
        </button>
        <button type="button" className="btn ghost" onClick={onRestart}>
          Examine another decision
        </button>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {copied ? 'Summary copied to clipboard' : ''}
      </p>
    </section>
  );
}

export default Summary;
