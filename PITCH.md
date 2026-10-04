# BlindSpot: Jury Pitch Script (3 minutes)

**Live:** https://blindspot-s5sh.onrender.com · **Score:** 96.16 / 100 (rank #8)
**Before you start:** open the live link 2 minutes early (the free server wakes in ~50s). Use **Chrome**.

---

## 1. Hook (15 sec)

> "We make decisions based on what we notice first: the stipend, the location, what everyone says.
> The real risk is what we _don't_ see. BlindSpot shows you what you're not seeing,
> and it **never** makes the decision for you."

## 2. The problem, in their words (15 sec)

> "The problem statement had three blind spots: overlooked factors, unstated assumptions,
> and conflicts in our own reasoning. Plus one hard rule: don't decide for the user.
> We built one feature for each, and enforced the rule in code."

## 3. Live demo (90 sec)

1. **Click "Try the internship example"**, which is the exact case from the problem statement. Click **Find my blind spots**.
   > "One Gemini call returns structured JSON in about 3 seconds."
2. **Dashboard headline numbers:** point at _Exploration_, _Assumptions_, _Conflicts_, _Thinking traps_.
   > "Exploration measures how thoroughly you've thought, **not** whether the choice is right."
3. **Spotlight + Light & Shadow map:**
   > "Stipend and location are lit. **Academics is in shadow**: the student never mentioned exams.
   > Every highlight is the user's _own words_; we verify each quote exists, so the AI can't invent them."
4. **Cards:** show a **Conflict** (10am–6pm job vs. 6 subjects) and the **Bandwagon effect** tag on _"Everyone says internships matter."_
   > "We name the thinking trap neutrally, then ask one sharp question. No answers."
5. **Mark a card "Considered"** and the map lights up live.
6. **See my reasoning summary**, then **Save & get a share link**.
   > "Saved to Google Cloud Firestore, so you can revisit it or show a mentor before deciding.
   > The summary has no verdict: _BlindSpot doesn't decide. You do._"

## 4. Talk to it (30 sec)

Back on the home page, tap the **mic orb** and say: _"I got an internship offer during my 5th semester."_

> "It interviews you like a witty friend ('bold calendar move'), but it only asks. It never advises.
> After about 5 answers it fills the form and runs the analysis for you."

_(If the voice sounds robotic: "Gemini TTS hit the free-tier quota; it falls back to the browser voice automatically.")_

## 5. Why trust it (20 sec)

- **"Never decide" is enforced in code:** a guard strips any "you should / I recommend", with tests proving it.
- **No hallucinated highlights:** quotes are checked against the input.
- **Resilient:** automatic Gemini model fallback during peak load.
- **104 automated tests:** API, engine, UI flow, no-microphone path, axe accessibility.

## 6. Close (10 sec)

> "Google stack: Gemini for reasoning and voice, Firestore for saved reasoning, Docker ready for Cloud Run.
> 100 on Efficiency, 99 on Security and Alignment. BlindSpot doesn't give you answers.
> It gives you better questions."

---

## Likely jury questions

| Question                                | Answer                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| How do you stop the AI recommending?    | Prompt rule **plus** a code guard on every output; findings that prescribe a choice are dropped, and the UI says how many were removed. Unit-tested. |
| Isn't the coverage map just AI opinion? | No. Gemini classifies findings into 8 fixed areas; the map and percentages are computed by plain, tested code.                                       |
| What if Gemini is down or busy?         | Ordered model fallback + backoff retry; friendly error; typing always works if voice fails.                                                          |
| Privacy?                                | Nothing is stored unless you click Save; saved summaries use random IDs and expire in 30 days.                                                       |
| What's next?                            | Gemini Live API for true real-time voice; a decision journal that revisits outcomes to build calibration.                                            |
