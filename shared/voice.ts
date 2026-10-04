/** First line the voice agent says; shared so client and server stay in sync. */
export const OPENING_LINE =
  'Hey! I’m BlindSpot. So, what decision is living rent-free in your head right now?';

/** Said when the interview has enough to analyze. */
export const CLOSING_LINE =
  'Love it, that’s plenty to work with. Let’s go find what you’re not seeing.';

/**
 * Instant acknowledgements played the moment the user stops talking, while the next
 * question is generated. Neutral by design: they never react to which option is better.
 */
export const FILLERS = ['Ooh, okay.', 'Mm, got it.', 'Okay, okay.', 'Right, hold that thought.'];
