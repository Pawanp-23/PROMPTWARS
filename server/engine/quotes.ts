import type { Finding, FocusItem } from '../../shared/schema.js';

const normalize = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** True when `quote` appears verbatim (ignoring case and spacing) in the user's input. */
export function isGrounded(quote: string | undefined, source: string): quote is string {
  if (!quote || quote.trim().length < 3) return false;
  return normalize(source).includes(normalize(quote));
}

/**
 * Drops any quote the model did not take from the user's own words, so highlights
 * can never point at text the user did not write.
 */
export function groundFindings(findings: Finding[], source: string): Finding[] {
  return findings.map((finding) => {
    const quote = isGrounded(finding.quote, source) ? finding.quote : undefined;
    const quoteB = quote && isGrounded(finding.quoteB, source) ? finding.quoteB : undefined;
    return { ...finding, quote, quoteB };
  });
}

/** Keeps only focus items whose quote is real; focus without evidence would inflate coverage. */
export function groundFocus(focus: FocusItem[], source: string): FocusItem[] {
  return focus.filter((item) => isGrounded(item.quote, source));
}
