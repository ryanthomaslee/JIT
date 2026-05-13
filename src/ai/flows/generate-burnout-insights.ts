'use server';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// --- Types ---

export type AssessmentScores = {
  emotional: number;
  cognitive: number;
  motivation: number;
  relational: number;
};

export type GenerateBurnoutInsightsInput = {
  currentAssessment: AssessmentScores & { type: 'Day 0' | 'Day 14' };
  baselineAssessment?: AssessmentScores & { type: 'Day 0' };
  frictionPoints?: string[];
};

export type GenerateBurnoutInsightsOutput = {
  summary: string;
  insights: string;
};

export type ReflectionData = {
  weeklyScore: number;
  biggestDrain: string;
  mostUsefulExercise: string;
  workNote?: string;
};

export type ProgressNarrativeInput = {
  baseline: AssessmentScores;
  followUp: AssessmentScores;
  intervention: string;
  completionsCount: number;
  week1Reflection?: ReflectionData;
  week2Reflection?: ReflectionData;
};

export type ProgressNarrativeOutput = {
  narrative: string;
};

// --- Burnout Insights ---

export async function generateBurnoutInsights(
  input: GenerateBurnoutInsightsInput
): Promise<GenerateBurnoutInsightsOutput> {
  const baselineSection = input.baselineAssessment
    ? `\nBaseline Assessment (Day 0):\n- Emotional: ${input.baselineAssessment.emotional}\n- Cognitive: ${input.baselineAssessment.cognitive}\n- Motivation: ${input.baselineAssessment.motivation}\n- Relational: ${input.baselineAssessment.relational}`
    : '';

  const frictionContext = input.frictionPoints?.length
    ? `\nWorkload friction points: ${input.frictionPoints.join(', ')}.`
    : '';

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    system: `You are a burnout specialist producing a brief clinical profile. Higher scores = higher burnout load. Use British English. Tone: direct and clinical — not motivational, not therapeutic. Plain prose only. Return only a JSON object with "summary" and "insights" string fields.`,
    messages: [
      {
        role: 'user',
        content: `Scores — Emotional: ${input.currentAssessment.emotional}, Cognitive: ${input.currentAssessment.cognitive}, Motivation: ${input.currentAssessment.motivation}, Relational: ${input.currentAssessment.relational}.${frictionContext}

"summary": exactly 2 sentences — primary depletion domain and what it indicates neurologically.
"insights": exactly 1 sentence — the most important secondary pattern or interaction between domains.

Return JSON: {"summary": "...", "insights": "..."}`,
      },
    ],
  });

  const text = message.content.find((b) => b.type === 'text')?.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? '{}');
  return {
    summary: parsed.summary ?? '',
    insights: parsed.insights ?? '',
  };
}

// --- Milestone Comment ---

export type MilestoneCommentInput = {
  dayOfStudy: 3 | 10;
  scores: AssessmentScores;
  // Day 10 only — shift context derived from Week 1 reflection + exercise completions
  week1ReflectionScore?: number;   // 1–10 subjective load score from Week 1 reflection
  exerciseCompletions?: number;    // total exercises logged since Day 0
};

export type MilestoneCommentOutput = {
  comment: string;
  recommendedExercise: string;
};

/**
 * Generates a short, personalised NEUY comment and one recommended exercise.
 *
 * Day 3  — NEUY insight based on Day 0 baseline scores only.
 * Day 10 — NEUY insight acknowledges any perceived shift using Week 1 reflection
 *           score and exercise engagement alongside the Day 0 baseline.
 */
export async function generateMilestoneComment(
  input: MilestoneCommentInput
): Promise<MilestoneCommentOutput> {
  const domainList = [
    { name: 'Emotional', score: input.scores.emotional },
    { name: 'Cognitive', score: input.scores.cognitive },
    { name: 'Motivation', score: input.scores.motivation },
    { name: 'Relational', score: input.scores.relational },
  ];
  const sorted = [...domainList].sort((a, b) => b.score - a.score);
  const highestBurdenDomain = sorted[0]; // highest score = highest burnout load

  // Build shift context block for Day 10
  const shiftContext = input.dayOfStudy === 10 && input.week1ReflectionScore !== undefined
    ? `\nWeek 1 self-reported load score: ${input.week1ReflectionScore}/10 (lower = better).
Exercises completed since Day 0: ${input.exerciseCompletions ?? 0}.
Compare Week 1 load score to the Day 0 domain scores to identify any perceived shift. If load score is lower than the average Day 0 domain score, acknowledge genuine progress. If similar or higher, acknowledge that the load is still present and the tools need more time.`
    : '';

  const dayLabel = input.dayOfStudy === 3 ? 'Day 3' : 'Day 10';
  const taskInstruction = input.dayOfStudy === 3
    ? 'Write a 2-sentence comment acknowledging where the user is in their first three days, referencing their highest-burden domain specifically. Then name one exercise for that domain.'
    : 'Write a 2-sentence comment that references any shift (or lack of it) between their Day 0 baseline and their Week 1 self-reported load. Be honest — if there is no clear improvement, say so without alarm. Then name one exercise for their highest-burden domain.';

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: `You are NEUY, a warm and clinically sharp burnout recovery coach for the JIT Program by JAI Behavioural. You write brief milestone check-in messages for professionals on a 14-day burnout prevention journey.

SCORING: Higher scores (1–10) indicate higher burnout load (worse). The user's highest-scoring domain is their primary area of concern.

TASK: ${taskInstruction}

RULES:
- Use British English.
- No em-dashes, en-dashes, or semicolons.
- No generic motivational jargon or toxic positivity.
- The exercise must be specific and named (e.g. "The Buffer Window", "The Dump", "The Sanctioned Withdrawal").
- Return only a JSON object: {"comment": "...", "recommendedExercise": "..."}`,
    messages: [
      {
        role: 'user',
        content: `${dayLabel} check-in.
Day 0 baseline scores (higher = more burnout load):
- Emotional: ${input.scores.emotional}
- Cognitive: ${input.scores.cognitive}
- Motivation: ${input.scores.motivation}
- Relational: ${input.scores.relational}
Highest-burden domain: ${highestBurdenDomain.name} (${highestBurdenDomain.score}/10)${shiftContext}

Return JSON: {"comment": "...", "recommendedExercise": "..."}`,
      },
    ],
  });

  const text = message.content.find((b) => b.type === 'text')?.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? '{}');
  return {
    comment: parsed.comment ?? '',
    recommendedExercise: parsed.recommendedExercise ?? '',
  };
}

// --- Progress Narrative ---

export async function generateProgressNarrative(
  input: ProgressNarrativeInput
): Promise<ProgressNarrativeOutput> {
  const week1Section = input.week1Reflection
    ? `  Week 1: Score ${input.week1Reflection.weeklyScore}, Drain: "${input.week1Reflection.biggestDrain}", Useful: "${input.week1Reflection.mostUsefulExercise}"`
    : '  Week 1: No reflection data';
  const week2Section = input.week2Reflection
    ? `  Week 2: Score ${input.week2Reflection.weeklyScore}, Drain: "${input.week2Reflection.biggestDrain}", Useful: "${input.week2Reflection.mostUsefulExercise}"`
    : '  Week 2: No reflection data';

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: `You are NEUY, a world-class behavioural scientist and empathetic personal coach designed to help professionals regulate their nervous systems and manage burnout. Your tone is authoritative yet deeply personable, warm but clinical. Speak directly to the user as a respected peer and supportive mentor.

SCORING LOGIC:
- Higher scores = Higher BURNOUT LOAD (worse).
- Decrease in score = Improvement.
- Increase in score = Deterioration.

CONSTRAINTS:
1. Exactly 3 sentences. Sentences must be concise, punchy, and easy to digest.
2. Sentence 1: Warmly acknowledge their specific efforts and detail improvements in their cognitive or emotional load. Explain how this physiological shift realistically reclaims their daily capacity, focus, and resilience in their work and life.
3. Sentence 2: With empathy and precision, identify one specific area that remains a risk or has deteriorated. Frame this not as a failure, but as understandable neurological friction or systemic load that simply needs our attention next.
4. Sentence 3: Provide a substantive, neuroscience-grounded interpretation of their overall 14-day pattern (e.g., referencing HPA axis regulation, allostatic load, or prefrontal resource allocation). Briefly explain any technical terms in brackets so they feel empowered by the science, not lectured to.
5. Use British English throughout (e.g., personalised, analyse). No quotation marks.
6. Attribution: Only credit score shifts to the specific intervention if completionsCount > 0.
7. STRICT PUNCTUATION RULE: Absolutely no em-dashes (—), en-dashes (–), or semi-colons (;) are allowed in the output. Use standard periods to end thoughts.
8. Tone: Deeply supportive, human, and validating, but maintaining a sharp, evidence-based clinical edge. Absolutely no generic motivational jargon, toxic positivity, or life-coaching fluff.

Output the 3-sentence narrative only — no preamble, no labels.`,
    messages: [
      {
        role: 'user',
        content: `Data:
- Baseline Scores: Emotional ${input.baseline.emotional}, Cognitive ${input.baseline.cognitive}, Motivation ${input.baseline.motivation}, Relational ${input.baseline.relational}
- Day 14 Scores: Emotional ${input.followUp.emotional}, Cognitive ${input.followUp.cognitive}, Motivation ${input.followUp.motivation}, Relational ${input.followUp.relational}
- Primary Intervention: ${input.intervention}
- Recorded Completions: ${input.completionsCount}
- Reflections:
${week1Section}
${week2Section}`,
      },
    ],
  });

  const narrative = message.content.find((b) => b.type === 'text')?.text ?? '';
  return { narrative };
}
