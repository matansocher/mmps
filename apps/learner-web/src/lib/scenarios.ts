import type { Scenario } from './types';

export const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    biteId: 'system-design:delivery',
    title: 'The interview clock is running',
    prompt: 'You have 40 minutes to design a global photo-sharing feed. The interviewer gives a broad prompt. What do you do first?',
    choices: [
      {
        label: 'List and quantify the top requirements',
        feedback: 'Best choice. A small, quantified scope gives every later decision a clear target and protects the timebox.',
        recommended: true,
      },
      {
        label: 'Draw a complete microservice architecture',
        feedback: 'This may look productive, but it commits to complexity before you know which user flows and constraints matter.',
        recommended: false,
      },
      {
        label: 'Calculate every possible storage cost',
        feedback: 'Selective estimates are useful, but exhaustive capacity math consumes time before it can inform a concrete decision.',
        recommended: false,
      },
    ],
  },
  {
    biteId: 'system-design:caching',
    title: 'A celebrity post goes viral',
    prompt: 'One cache key expires and thousands of requests immediately hit the database for the same post. Which response is strongest?',
    choices: [
      {
        label: 'Use single-flight regeneration with a jittered TTL',
        feedback: 'Best choice. One request rebuilds the value while jitter reduces the chance that related keys expire together.',
        recommended: true,
      },
      {
        label: 'Remove caching for popular posts',
        feedback: 'That removes the stampede, but shifts all sustained traffic to the database and loses the main benefit of caching.',
        recommended: false,
      },
      {
        label: 'Set every hot key to never expire',
        feedback: 'This protects the database, but creates stale data and makes invalidation operationally risky.',
        recommended: false,
      },
    ],
  },
  {
    biteId: 'ai-engineering:prompting',
    title: 'A support assistant is inconsistent',
    prompt: 'Your assistant produces different formats and occasionally ignores an important policy. What should you improve first?',
    choices: [
      {
        label: 'Add a clear instruction hierarchy and concrete examples',
        feedback: 'Best choice. Explicit constraints and representative examples make the expected behavior testable and repeatable.',
        recommended: true,
      },
      {
        label: 'Raise the temperature for more variety',
        feedback: 'Higher temperature increases variation, which works against the need for consistent formatting and policy adherence.',
        recommended: false,
      },
      {
        label: 'Make the prompt much longer without evaluation',
        feedback: 'More text is not automatically clearer. Added instructions can conflict unless they are structured and tested.',
        recommended: false,
      },
    ],
  },
  {
    biteId: 'ai-engineering:rag',
    title: 'Answers cite stale policies',
    prompt: 'A RAG assistant retrieves a relevant but superseded policy alongside the current one. What is the best first improvement?',
    choices: [
      {
        label: 'Filter by validity metadata before ranking',
        feedback: 'Best choice. Eligibility filters remove invalid evidence before semantic relevance is considered.',
        recommended: true,
      },
      {
        label: 'Increase the number of retrieved chunks',
        feedback: 'More chunks may include the current policy, but they also add noise and do not prevent the stale source from influencing the answer.',
        recommended: false,
      },
      {
        label: 'Tell the model to guess which policy is current',
        feedback: 'The model should not infer authority from prose when the retrieval system can enforce explicit validity metadata.',
        recommended: false,
      },
    ],
  },
] as const;

const BY_BITE = new Map(SCENARIOS.map((scenario) => [scenario.biteId, scenario]));

export function scenarioForBite(biteId: string): Scenario | undefined {
  return BY_BITE.get(biteId);
}

export function hasScenario(biteId: string): boolean {
  return BY_BITE.has(biteId);
}
