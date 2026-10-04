import { buildSegments, type Mark, type MarkKind } from '../lib/highlight';

const KIND_LABEL: Record<MarkKind, string> = {
  focus: 'focus',
  assumption: 'assumption',
  conflict: 'conflict',
};

interface Props {
  text: string;
  marks: Mark[];
}

/** Shows the user's own words with focus, assumption and conflict spans marked (text label + colour). */
export function HighlightedText({ text, marks }: Props) {
  return (
    <p className="highlighted">
      {buildSegments(text, marks).map((segment, index) =>
        segment.kind ? (
          <mark key={index} className={`mark-${segment.kind}`}>
            {segment.text}
            <span className="mark-tag">{KIND_LABEL[segment.kind]}</span>
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
