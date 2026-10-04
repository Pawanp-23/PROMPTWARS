import { useEffect, useMemo, useRef } from 'react';
import type { AnalyzeResponse, Coverage } from '../../../shared/schema';
import { BlindSpotCard, type CardState } from '../components/BlindSpotCard';
import { HighlightedText } from '../components/HighlightedText';
import { Kpis } from '../components/Kpis';
import { Reveal } from '../components/Reveal';
import { ShadowMap } from '../components/ShadowMap';
import { marksFor } from '../lib/highlight';

interface Props {
  decision: string;
  userText: string;
  result: AnalyzeResponse;
  coverage: Coverage;
  cards: Record<string, CardState>;
  reflectedCount: number;
  busy: boolean;
  onCardChange: (id: string, state: CardState) => void;
  onRescan: () => void;
  onFinish: () => void;
}

/** Analysis dashboard: KPIs, spotlight with the Light & Shadow map, and blind-spot cards. */
export default function DashboardView({
  decision,
  userText,
  result,
  coverage,
  cards,
  reflectedCount,
  busy,
  onCardChange,
  onRescan,
  onFinish,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const marks = useMemo(() => marksFor(result), [result]);

  // Land keyboard and screen-reader users on the new results.
  useEffect(() => headingRef.current?.focus(), [result]);

  const blocked = result.blockedCount;

  return (
    <>
      <Reveal>
        <header className="dash-head">
          <p className="eyebrow">Analysis</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {decision}
          </h1>
          <Kpis coverage={coverage} findings={result.findings} reflected={reflectedCount} />
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
              <HighlightedText text={userText} marks={marks} />
            </div>
            <ShadowMap coverage={coverage} />
          </div>
        </section>
      </Reveal>

      <section aria-labelledby="spots-title">
        <div className="panel-head">
          <p className="eyebrow">02 · Examine</p>
          <h2 id="spots-title">Blind spots worth a second look</h2>
          <p className="muted">
            Mark each one as you think it through. The answers are yours; BlindSpot only asks.
          </p>
          {blocked > 0 && (
            <p className="guard-note">
              <span className="mono">Guard</span> {blocked} AI suggestion
              {blocked > 1 ? 's were' : ' was'} removed for trying to decide for you.
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
                onChange={(state) => onCardChange(finding.id, state)}
              />
            </Reveal>
          ))}
        </div>
      </section>

      <div className="actionbar">
        <p className="mono muted">{coverage.percent}% examined</p>
        <div className="actions">
          <button
            type="button"
            className="btn ghost"
            disabled={busy || !reflectedCount}
            onClick={onRescan}
          >
            {busy ? 'Re-scanning…' : 'Re-scan with my reflections'}
          </button>
          <button type="button" className="btn primary" onClick={onFinish}>
            See my reasoning summary
          </button>
        </div>
      </div>
    </>
  );
}
