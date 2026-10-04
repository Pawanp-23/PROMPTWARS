import type { AnalyzeResponse } from '../../../shared/schema';

export type MarkKind = 'focus' | 'assumption' | 'conflict';

export interface Mark {
  quote: string;
  kind: MarkKind;
}

export interface Segment {
  text: string;
  kind?: MarkKind;
}

/**
 * Splits `text` into plain and highlighted segments for each quote found in it.
 * Matching is case-insensitive; overlapping marks keep the earliest one.
 */
export function buildSegments(text: string, marks: Mark[]): Segment[] {
  const lower = text.toLowerCase();
  const ranges = marks
    .map((mark) => {
      const start = lower.indexOf(mark.quote.toLowerCase().trim());
      return { start, end: start + mark.quote.trim().length, kind: mark.kind };
    })
    .filter((range) => range.start >= 0 && range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start) });
    segments.push({ text: text.slice(range.start, range.end), kind: range.kind });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/** Turns the textarea "one option per line" into a clean list. */
export function parseOptions(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/** Quotes to highlight in the user's text: what they focused on, assumptions, and conflicts. */
export function marksFor(result: Pick<AnalyzeResponse, 'focus' | 'findings'>): Mark[] {
  const marks: Mark[] = result.focus.map((f) => ({ quote: f.quote, kind: 'focus' }));
  for (const finding of result.findings) {
    if (finding.type === 'overlooked') continue;
    if (finding.quote) marks.push({ quote: finding.quote, kind: finding.type });
    if (finding.quoteB) marks.push({ quote: finding.quoteB, kind: finding.type });
  }
  return marks;
}
