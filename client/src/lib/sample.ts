/** The official example from THE BLIND SPOT problem statement, for one-click demos. */
export const INTERNSHIP_SAMPLE = {
  decision: 'Should I accept a 6-month internship offer?',
  options: 'Accept the internship\nDecline and stay focused on college',
  context:
    'The internship is a 6-month software role at a mid-size company, 15 minutes from my home. The stipend is ₹25,000/month. Working hours are 10am–6pm, Monday to Friday. It overlaps with my 5th semester, which has 6 subjects and end-semester exams in December. The role is described as "assisting the development team".',
  reasons:
    'I am mainly considering it because the stipend is good, the company is close to home, and it will give me industry experience. Everyone says internships are what matter for placements.',
};

export type DecisionDraft = typeof INTERNSHIP_SAMPLE;

export const EMPTY_DRAFT: DecisionDraft = { decision: '', options: '', context: '', reasons: '' };
