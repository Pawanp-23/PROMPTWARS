import type { AnalyzeRequest, ModelOutput } from '../../shared/schema.js';
import type { ModelClient } from '../engine/analyze.js';

export const internshipRequest: AnalyzeRequest = {
  decision: 'Should I accept a 6-month internship offer?',
  options: ['Accept the internship', 'Decline and focus on college'],
  context: 'The internship overlaps with my 5th semester. Working hours are 10am to 6pm.',
  reasons:
    'The stipend is good, the company is close to home, and it will give me industry experience.',
};

export const goodModelOutput: ModelOutput = {
  focus: [
    { area: 'finances', quote: 'The stipend is good' },
    { area: 'health_time', quote: 'close to home' },
  ],
  findings: [
    {
      id: 'x',
      type: 'overlooked',
      area: 'academics',
      insight: 'The internship overlaps with a full semester.',
      question: 'How will attendance and exams fit around 10am to 6pm workdays?',
    },
    {
      id: 'x',
      type: 'assumption',
      area: 'learning_growth',
      quote: 'it will give me industry experience',
      insight: 'Experience depends on the actual work and mentorship.',
      question: 'What will you actually work on, and who will mentor you?',
    },
  ],
};

/** Fake model client returning fixed text and counting calls. */
export function fakeClient(output: unknown): ModelClient & { calls: number } {
  return {
    calls: 0,
    async generateJson() {
      this.calls += 1;
      return typeof output === 'string' ? output : JSON.stringify(output);
    },
  };
}
