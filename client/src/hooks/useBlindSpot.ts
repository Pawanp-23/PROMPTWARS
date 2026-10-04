import { useMemo, useState } from 'react';
import { computeCoverage } from '../../../shared/coverage';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Coverage,
  IntakeResponse,
  Reflection,
} from '../../../shared/schema';
import type { CardState } from '../components/BlindSpotCard';
import { analyze } from '../lib/api';
import { parseOptions } from '../lib/highlight';
import { EMPTY_DRAFT, type DecisionDraft } from '../lib/sample';

export type Stage = 'input' | 'review' | 'summary';

/** Turns the form draft into a validated-shape API request. */
export function toRequest(source: DecisionDraft, reflections: Reflection[]): AnalyzeRequest {
  return {
    decision: source.decision.trim(),
    options: parseOptions(source.options),
    context: source.context.trim(),
    reasons: source.reasons.trim(),
    reflections: reflections.length ? reflections.slice(-12) : undefined,
  };
}

/** Converts voice-intake fields into a form draft. */
export function draftFromIntake(fields: IntakeResponse['fields']): DecisionDraft {
  return {
    decision: fields.decision,
    options: fields.options.join('\n'),
    context: fields.context,
    reasons: fields.reasons,
  };
}

/** Whether a draft has enough to analyze without the user filling anything else in. */
export function isComplete(draft: DecisionDraft): boolean {
  return (
    draft.decision.trim().length >= 5 &&
    parseOptions(draft.options).length > 0 &&
    draft.reasons.trim().length >= 5
  );
}

/**
 * All BlindSpot session state: the draft, the analysis, the user's reflections,
 * and live coverage. Views stay presentational.
 */
export function useBlindSpot() {
  const [stage, setStage] = useState<Stage>('input');
  const [draft, setDraft] = useState<DecisionDraft>(EMPTY_DRAFT);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [initialCoverage, setInitialCoverage] = useState<Coverage | null>(null);
  const [pastReflections, setPastReflections] = useState<Reflection[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    const request = toRequest(source, reflections);
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
      setInitialCoverage((previous) => previous ?? response.coverage);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  /** Voice intake finished: fill the form, and analyze straight away if nothing is missing. */
  const completeIntake = (fields: IntakeResponse['fields']): boolean => {
    const next = draftFromIntake(fields);
    setDraft(next);
    if (!isComplete(next)) return false;
    void run([], next);
    return true;
  };

  const updateCard = (id: string, state: CardState) =>
    setCards((previous) => ({ ...previous, [id]: state }));

  const restart = () => {
    setStage('input');
    setResult(null);
    setInitialCoverage(null);
    setPastReflections([]);
    setCards({});
    setError('');
  };

  return {
    stage,
    setStage,
    draft,
    setDraft,
    result,
    initialCoverage,
    liveCoverage,
    cards,
    updateCard,
    currentReflections,
    allReflections,
    busy,
    error,
    analyzeDraft: () => run([]),
    rescan: () => run(allReflections),
    completeIntake,
    restart,
  };
}
