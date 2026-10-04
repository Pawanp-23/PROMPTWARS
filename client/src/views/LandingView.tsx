import type { IntakeResponse } from '../../../shared/schema';
import { DecisionForm } from '../components/DecisionForm';
import { Reveal } from '../components/Reveal';
import { VoiceAgent } from '../components/VoiceAgent';
import type { DecisionDraft } from '../lib/sample';

const STEPS = [
  {
    title: 'Spotlight',
    text: 'See which parts of life your reasoning lights up, and which sit in shadow.',
  },
  {
    title: 'Examine',
    text: 'Work through overlooked factors, unstated assumptions and conflicts in your own words.',
  },
  {
    title: 'Decide',
    text: 'Leave with a reasoning summary and open questions. The choice stays yours.',
  },
];

interface Props {
  draft: DecisionDraft;
  busy: boolean;
  onDraftChange: (draft: DecisionDraft) => void;
  onAnalyze: () => void;
  /** Returns false when the voice intake still needs the form to be completed. */
  onIntakeComplete: (fields: IntakeResponse['fields']) => boolean;
}

/** Landing: hero, voice intake, how it works, and the written form. */
export function LandingView({ draft, busy, onDraftChange, onAnalyze, onIntakeComplete }: Props) {
  const handleIntake = (fields: IntakeResponse['fields']) => {
    if (!onIntakeComplete(fields)) {
      document.getElementById('write')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
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
            Talk through a decision you’re facing. BlindSpot maps what your reasoning covers,
            surfaces the assumptions and conflicts you missed, and asks better questions. It never
            decides for you.
          </p>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <VoiceAgent onComplete={handleIntake} />
      </Reveal>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          Three steps. No verdicts.
        </h2>
        <ol className="how-grid">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="mono muted">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="write" aria-labelledby="write-title" className="write">
        <h2 id="write-title" className="section-title">
          Prefer to write it down?
        </h2>
        <DecisionForm draft={draft} onChange={onDraftChange} onSubmit={onAnalyze} busy={busy} />
      </section>

      {busy && (
        <div className="panel skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </>
  );
}
