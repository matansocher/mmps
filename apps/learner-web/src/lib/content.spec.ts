import { describe, expect, it } from 'vitest';
import { BITES, CURRICULUM } from './bites.data';
import { QUIZZES } from './quizzes.data';
import { SCENARIOS } from './scenarios';

// Stored learner progress is keyed by bite id, so renaming or removing an id silently drops a learner's completion state.
const PERSISTED_BITE_IDS = [
  'system-design:delivery',
  'system-design:numbers',
  'system-design:networking',
  'system-design:api-design',
  'system-design:data-modeling',
  'system-design:caching',
  'system-design:sharding',
  'system-design:consistent-hashing',
  'system-design:cap',
  'system-design:indexing',
  'system-design:p-realtime',
  'system-design:p-contention',
  'system-design:p-multistep',
  'system-design:p-reads',
  'system-design:p-writes',
  'system-design:p-blobs',
  'system-design:p-longtasks',
  'system-design:dd-redis',
  'system-design:dd-kafka',
  'system-design:dd-postgres',
  'system-design:dd-cassandra',
  'system-design:dd-dynamodb',
  'system-design:dd-elasticsearch',
  'system-design:dd-flink',
  'system-design:dd-zookeeper',
  'system-design:dd-apigw',
  'system-design:dd-proximity',
  'system-design:dd-timeseries',
  'system-design:dd-vectordb',
  'system-design:dd-bigdata',
  'system-design:dd-cdc',
  'system-design:q-ad-click',
  'system-design:cheatsheet',
  'ai-engineering:foundations',
  'ai-engineering:prompting',
  'ai-engineering:embeddings',
  'ai-engineering:rag',
  'ai-engineering:advanced-rag',
  'ai-engineering:agents',
  'ai-engineering:multi-agent',
  'ai-engineering:multi-agent-harnesses',
  'ai-engineering:mmps-agents',
  'ai-engineering:multimodal',
  'ai-engineering:finetuning',
  'ai-engineering:production',
  'ai-engineering:interview',
  'ai-engineering:glossary',
];

describe('learner content', () => {
  const biteIds = new Set(BITES.map((b) => b.id));

  it('keeps every previously persisted bite id', () => {
    PERSISTED_BITE_IDS.forEach((id) => expect(biteIds.has(id)).toEqual(true));
    BITES.filter((b) => !b.isReference).forEach((b) => expect(CURRICULUM.includes(b.id)).toEqual(true));
  });

  it('gives every lesson toggle-to-reveal questions', () => {
    const missing = BITES.filter((b) => !b.isReference && !b.html.includes('<details class="qa">')).map((b) => b.id);
    expect(missing).toEqual([]);
  });

  it('has well-formed quiz questions for existing bites', () => {
    QUIZZES.forEach((q) => {
      expect(biteIds.has(q.biteId)).toEqual(true);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(new Set(q.options).size).toEqual(q.options.length);
    });
  });

  it('has exactly one recommended choice per scenario for existing bites', () => {
    SCENARIOS.forEach((s) => {
      expect(biteIds.has(s.biteId)).toEqual(true);
      expect(s.choices.filter((c) => c.recommended).length).toEqual(1);
    });
  });
});
