/**
 * @fileOverview Static data for the 24 burnout prevention exercises.
 */

export interface ExerciseData {
  id: string;
  domain: 'Emotional' | 'Cognitive' | 'Motivation' | 'Relational';
  burnoutLevel: 'High Burnout' | 'Moderate Burnout' | 'Low Burnout';
  title: string;
  mechanism: string;
  instruction: string;
  timeRequired: string;
  whenToUse: string;
  /**
   * True for exercises that require minimal initiation cost and ≤3 minutes.
   * Used to route High Depletion users (readinessScore ≤ 3) in Week 1.
   */
  lowDemand?: boolean;
}

export const EXERCISES: ExerciseData[] = [
  // EMOTIONAL DOMAIN
  {
    id: "emo-1",
    domain: "Emotional",
    burnoutLevel: "High Burnout",
    title: "The 5-5-7",
    mechanism: "Extending the exhale activates the parasympathetic nervous system, reducing cortisol within 90 seconds.",
    instruction: "Breathe in for 5 counts. Hold for 5. Out for 7. Repeat three times before opening your first email.",
    timeRequired: "90 seconds",
    whenToUse: "First thing in the morning",
    lowDemand: true
  },
  {
    id: "emo-2",
    domain: "Emotional",
    burnoutLevel: "High Burnout",
    title: "The Hard Stop",
    mechanism: "A deliberate physical transition tells the nervous system the threat period has ended, beginning recovery.",
    instruction: "At the end of your working day, stand up, leave the room you worked in, and don't return for 30 minutes. No exceptions.",
    timeRequired: "30 minutes",
    whenToUse: "End of working day"
  },
  {
    id: "emo-3",
    domain: "Emotional",
    burnoutLevel: "Moderate Burnout",
    title: "The Buffer Window",
    mechanism: "Containing communication to defined windows removes anticipatory cortisol load.",
    instruction: "Choose two times to check messages — morning and afternoon. Notifications off outside those windows. Tell one colleague.",
    timeRequired: "2 minutes to set up",
    whenToUse: "Start of day"
  },
  {
    id: "emo-4",
    domain: "Emotional",
    burnoutLevel: "Moderate Burnout",
    title: "Name It",
    mechanism: "Affect labelling reduces amygdala activation and increases prefrontal regulation — naming what you feel reduces its intensity neurologically.",
    instruction: "Once today, when emotional load rises, write one word describing what you feel. Not a sentence. One word.",
    timeRequired: "30 seconds",
    whenToUse: "Any moment of elevated emotional load",
    lowDemand: true
  },
  {
    id: "emo-5",
    domain: "Emotional",
    burnoutLevel: "Low Burnout",
    title: "The Audit",
    mechanism: "Metacognitive awareness of emotional triggers builds prefrontal regulation capacity over time.",
    instruction: "At end of day write one interaction that cost you emotional energy and one that gave you energy. Two lines maximum.",
    timeRequired: "3 minutes",
    whenToUse: "End of working day"
  },
  {
    id: "emo-6",
    domain: "Emotional",
    burnoutLevel: "Low Burnout",
    title: "The Reframe",
    mechanism: "Cognitive reappraisal reduces emotional reactivity by engaging the prefrontal cortex rather than the amygdala.",
    instruction: "Take one frustrating interaction from today. Write one alternative explanation that doesn't involve the other person being difficult. One sentence.",
    timeRequired: "2 minutes",
    whenToUse: "End of working day"
  },
  // COGNITIVE DOMAIN
  {
    id: "cog-7",
    domain: "Cognitive",
    burnoutLevel: "High Burnout",
    title: "The Dump",
    mechanism: "Externalising working memory contents onto paper empties cognitive load immediately, restoring processing capacity.",
    instruction: "Set a timer for 3 minutes. Write everything in your head — tasks, worries, half-finished thoughts. Don't organise it. Just empty it.",
    timeRequired: "3 minutes",
    whenToUse: "Start of day or whenever cognitive load feels unmanageable",
    lowDemand: true
  },
  {
    id: "cog-8",
    domain: "Cognitive",
    burnoutLevel: "High Burnout",
    title: "One Thing",
    mechanism: "Multitasking depletes prefrontal resources faster than single-task focus. Constraining to one task reduces switching costs.",
    instruction: "Choose one task for 30 minutes. Write it on paper in front of you. If you switch, write what pulled you away and return.",
    timeRequired: "30 minutes",
    whenToUse: "Any point when cognitive load is high"
  },
  {
    id: "cog-9",
    domain: "Cognitive",
    burnoutLevel: "Moderate Burnout",
    title: "The Close",
    mechanism: "Open loops consume cognitive resources continuously. Closing them at end of day reduces overnight cognitive load.",
    instruction: "Spend 5 minutes writing tomorrow's three most important tasks. Close every open tab and application.",
    timeRequired: "5 minutes",
    whenToUse: "End of working day"
  },
  {
    id: "cog-10",
    domain: "Cognitive",
    burnoutLevel: "Moderate Burnout",
    title: "The Platform Rule",
    mechanism: "Each additional platform monitored increases attentional switching and cognitive load.",
    instruction: "For one hour work from one platform only. Close everything else. Track how it feels.",
    timeRequired: "1 hour",
    whenToUse: "Your most cognitively demanding work period"
  },
  {
    id: "cog-11",
    domain: "Cognitive",
    burnoutLevel: "Low Burnout",
    title: "The Threshold",
    mechanism: "Proactive cognitive load management preserves working memory for high-value tasks.",
    instruction: "Identify one recurring task that costs disproportionate effort relative to its value. Write one way to simplify, delegate, or eliminate it.",
    timeRequired: "5 minutes",
    whenToUse: "Any reflective moment"
  },
  {
    id: "cog-12",
    domain: "Cognitive",
    burnoutLevel: "Low Burnout",
    title: "The Design",
    mechanism: "Aligning demanding tasks with peak alertness windows (ultradian rhythms) maximises output while minimising depletion.",
    instruction: "Map your cognitive load hour by hour — high, medium, low. Identify your peak window. Move your most demanding task into it for the rest of the week.",
    timeRequired: "10 minutes",
    whenToUse: "End of day reflection"
  },
  // MOTIVATION DOMAIN
  {
    id: "mot-13",
    domain: "Motivation",
    burnoutLevel: "High Burnout",
    title: "The Smallest Win",
    mechanism: "Artificially small tasks with guaranteed completion reactivate the reward circuit incrementally when dopamine is depleted.",
    instruction: "Choose one task so small it takes under two minutes. Complete it first. Notice the moment it's done.",
    timeRequired: "2 minutes",
    whenToUse: "First thing in the working day",
    lowDemand: true
  },
  {
    id: "mot-14",
    domain: "Motivation",
    burnoutLevel: "High Burnout",
    title: "The Enough Line",
    mechanism: "Defining completion allows the brain to register finishing and release the reward signal — without it dopamine baseline continues to drop.",
    instruction: "Before work, write one sentence — 'Today is enough if I have done X.' When X is done, stop.",
    timeRequired: "2 minutes to define",
    whenToUse: "Start of working day",
    lowDemand: true
  },
  {
    id: "mot-15",
    domain: "Motivation",
    burnoutLevel: "Moderate Burnout",
    title: "The Why Chain",
    mechanism: "Connecting daily tasks to personally meaningful outcomes restores approach motivation.",
    instruction: "Pick one task you're avoiding. Ask why it matters to you personally. Write one sentence. If you can't find a genuine answer, that's important data.",
    timeRequired: "3 minutes",
    whenToUse: "When facing a task you're avoiding"
  },
  {
    id: "mot-16",
    domain: "Motivation",
    burnoutLevel: "Moderate Burnout",
    title: "The Energy Map",
    mechanism: "Approach motivation is preserved for value-aligned activities and depleted for those that don't. Identifying the pattern allows deliberate reallocation.",
    instruction: "Rate each main task today on energy cost and meaningfulness. Find the high-cost, low-meaning tasks — those are your motivation drains.",
    timeRequired: "5 minutes",
    whenToUse: "End of working day"
  },
  {
    id: "mot-17",
    domain: "Motivation",
    burnoutLevel: "Low Burnout",
    title: "The Contribution Audit",
    mechanism: "Actively identifying how current work contributes to longer-term goals strengthens intrinsic motivation.",
    instruction: "Write three ways your work this week contributed to something beyond the immediate task. Three sentences maximum.",
    timeRequired: "5 minutes",
    whenToUse: "End of working week"
  },
  {
    id: "mot-18",
    domain: "Motivation",
    burnoutLevel: "Low Burnout",
    title: "The Horizon",
    mechanism: "Motivation is sustained by visible progress toward valued future states.",
    instruction: "Write one thing you want your working life to look like in two years. Identify one small action this week that moves toward it. Not a plan — one action.",
    timeRequired: "10 minutes",
    whenToUse: "Any quiet reflective moment"
  },
  // RELATIONAL DOMAIN
  {
    id: "rel-19",
    domain: "Relational",
    burnoutLevel: "High Burnout",
    title: "The Sanctioned Withdrawal",
    mechanism: "Deliberate guilt-free social withdrawal allows the parasympathetic nervous system to reset the social engagement circuit.",
    instruction: "Give yourself one hour of complete social silence — no messages, calls, or conversation unless essential. Tell nobody. Notice whether it feels like relief or anxiety. Both are useful data.",
    timeRequired: "1 hour",
    whenToUse: "Any feasible point in the working day",
    lowDemand: true
  },
  {
    id: "rel-20",
    domain: "Relational",
    burnoutLevel: "High Burnout",
    title: "The One Good Interaction",
    mechanism: "Deliberately prioritising one restorative interaction per day begins to rebuild the distinction between depleting and nourishing contact.",
    instruction: "Identify one person whose company you find genuinely easy. Find a reason to interact with them briefly. Notice how it feels compared to other interactions.",
    timeRequired: "5-10 minutes",
    whenToUse: "Any point during the working day",
    lowDemand: true
  },
  {
    id: "rel-21",
    domain: "Relational",
    burnoutLevel: "Moderate Burnout",
    title: "The Script",
    mechanism: "Pre-scripting responses to recurring social demands removes in-the-moment processing cost and reduces threat response around boundary-setting.",
    instruction: "Write three sentences for situations that drain your relational energy — declining a request, managing an impatient colleague, ending a long conversation. You don't have to use them. Just having them ready reduces anticipatory load.",
    timeRequired: "5 minutes",
    whenToUse: "Start of working day or week"
  },
  {
    id: "rel-22",
    domain: "Relational",
    burnoutLevel: "Moderate Burnout",
    title: "The Ratio Check",
    mechanism: "Awareness of the give-and-take ratio in interactions is the first step toward rebalancing it.",
    instruction: "Notice your interactions today — did each give or cost energy? Count the ratio at end of day. You're not fixing it today — just seeing it clearly.",
    timeRequired: "3 minutes",
    whenToUse: "End of working day"
  },
  {
    id: "rel-23",
    domain: "Relational",
    burnoutLevel: "Low Burnout",
    title: "The Boundary Design",
    mechanism: "Making implicit boundaries explicit strengthens their durability under pressure.",
    instruction: "Write one relational boundary you currently maintain that protects your energy. Then one you should have but don't. What's one small step toward the second one this week?",
    timeRequired: "5 minutes",
    whenToUse: "Any reflective moment"
  },
  {
    id: "rel-24",
    domain: "Relational",
    burnoutLevel: "Low Burnout",
    title: "The Quality Investment",
    mechanism: "Relationship quality matters more than quantity for sustained social energy.",
    instruction: "Identify one working relationship you've been neglecting. Send one message, make one comment, ask one genuine question. Actually curious — not performative. Notice whether it costs or returns energy.",
    timeRequired: "5 minutes",
    whenToUse: "Any point in the working day"
  }
];
