import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Logger } from '@core/utils';
import { GPT_5_MODEL } from '@services/openai/constants';
import type { SecretaryMessage } from '../../mongo';
import { generateDraftReply } from '../../secretary-draft.utils';
import type { EvalExample } from './build-dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '../../../../../');
config({ path: join(REPO_ROOT, '.env') });

const logger = new Logger('eval-prompt');

const DATASET_FILE = join(HERE, 'eval-dataset.json');
const REPORT_FILE = join(HERE, 'eval-report.json');

// Tunable via env so we can iterate without editing code.
const SAMPLE_SIZE = Number(env.EVAL_SAMPLE_SIZE ?? 40);
const SEED = Number(env.EVAL_SEED ?? 42);
const CONCURRENCY = Number(env.EVAL_CONCURRENCY ?? 5);
const WORST_TO_SHOW = Number(env.EVAL_WORST ?? 10);

const judgeSchema = z.object({
  toneMatch: z.number().min(1).max(5).describe("How well the draft matches Matan's texting tone/voice"),
  lengthFit: z.number().min(1).max(5).describe('How well the length matches how he actually texts (short)'),
  relevance: z.number().min(1).max(5).describe('How well the draft addresses what she actually said'),
  naturalness: z.number().min(1).max(5).describe('How human/natural it sounds (not generic or AI-like)'),
  wouldSend: z.number().min(1).max(5).describe('How likely Matan would send this as-is'),
  overall: z.number().min(1).max(5).describe('Overall quality of the draft as a reply Matan would send'),
  critique: z.string().describe('One short sentence: the single most important thing to improve'),
});

type Judgement = z.infer<typeof judgeSchema>;

const JUDGE_SYSTEM = `You are evaluating a SUGGESTED reply that an assistant drafted for Matan to send to his wife (Tootie) on Telegram, in Hebrew.
You are given: the recent conversation, Matan's REAL reply (the reference of what he actually sent), and the CANDIDATE draft.
Score the CANDIDATE from 1 (poor) to 5 (excellent) on each dimension.
Guidelines:
- The real reply is ONE valid answer, not the only one. Reward candidates that are plausible alternatives in Matan's voice, even if worded differently.
- Matan texts SHORT, casual spoken Hebrew, usually one line, light on emojis.
- Do NOT penalize the candidate for not knowing facts that are unknowable from the context (things decided off-app). Judge tone, length, relevance, and naturalness.
- Penalize: generic/AI-sounding text, wrong language, over-long replies, wrong emotional read (e.g. joking when she's upset), and ignoring what she actually said.
Return only the structured scores and a single-sentence critique.`;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(items: T[], size: number, seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(size, copy.length));
}

function toSecretaryMessages(example: EvalExample): SecretaryMessage[] {
  return example.context.map((m) => ({
    chatId: 1,
    fromOwner: m.fromOwner,
    senderName: m.senderName,
    text: m.text,
    transcribed: false,
    createdAt: new Date(m.createdAt || Date.now()),
  }));
}

function renderContext(example: EvalExample): string {
  return example.context.map((m) => `${m.fromOwner ? 'Matan' : 'Tootie'}: ${m.text}`).join('\n');
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

type Result = {
  readonly id: number;
  readonly context: string;
  readonly expectedReply: string;
  readonly draft: string;
  readonly scores: Judgement;
};

async function main(): Promise<void> {
  if (!existsSync(DATASET_FILE)) {
    logger.error(`Dataset not found at ${DATASET_FILE}. Run: npm run eval:build`);
    return;
  }

  const all = JSON.parse(readFileSync(DATASET_FILE, 'utf8')) as EvalExample[];
  const chosen = sample(all, SAMPLE_SIZE, SEED);
  logger.log(`Dataset: ${all.length} examples | evaluating ${chosen.length} (seed ${SEED})`);

  const judge = new ChatOpenAI({ model: GPT_5_MODEL, temperature: 1, apiKey: env.OPENAI_API_KEY }).withStructuredOutput(judgeSchema, { name: 'judge_draft' });

  let done = 0;
  const results = await mapWithConcurrency(chosen, CONCURRENCY, async (example) => {
    const messages = toSecretaryMessages(example);
    const generated = await generateDraftReply(messages);
    const draft = generated?.draft ?? '';

    const human = `Recent conversation:\n${renderContext(example)}\n\nMatan's REAL reply:\n${example.expectedReply}\n\nCANDIDATE draft to score:\n${draft}`;
    const scores = await judge.invoke([new SystemMessage(JUDGE_SYSTEM), new HumanMessage(human)]);

    done++;
    if (done % 5 === 0) logger.log(`… judged ${done}/${chosen.length}`);
    return { id: example.id, context: renderContext(example), expectedReply: example.expectedReply, draft, scores } as Result;
  });

  printReport(results);
  writeFileSync(REPORT_FILE, JSON.stringify({ seed: SEED, sampleSize: chosen.length, aggregate: buildAggregate(results), results }, null, 2), 'utf8');
  logger.log(`Full report → ${REPORT_FILE}`);
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}

function buildAggregate(results: Result[]): Record<string, number> {
  const dims: (keyof Judgement)[] = ['toneMatch', 'lengthFit', 'relevance', 'naturalness', 'wouldSend', 'overall'];
  const out: Record<string, number> = {};
  for (const dim of dims) {
    out[dim] = Number(avg(results.map((r) => r.scores[dim] as number)).toFixed(2));
  }
  return out;
}

function printReport(results: Result[]): void {
  const dims: (keyof Judgement)[] = ['toneMatch', 'lengthFit', 'relevance', 'naturalness', 'wouldSend', 'overall'];
  logger.log('\n══════════════ AGGREGATE (1–5) ══════════════');
  for (const dim of dims) {
    if (dim === 'critique') continue;
    logger.log(`  ${dim.padEnd(12)} ${avg(results.map((r) => r.scores[dim] as number)).toFixed(2)}`);
  }

  const overalls = results.map((r) => r.scores.overall);
  const dist = [1, 2, 3, 4, 5].map((n) => `${n}★:${overalls.filter((o) => Math.round(o) === n).length}`).join('  ');
  logger.log(`\n  distribution(overall): ${dist}`);

  const worst = [...results].sort((a, b) => a.scores.overall - b.scores.overall).slice(0, WORST_TO_SHOW);
  logger.log(`\n══════════════ WORST ${worst.length} EXAMPLES ══════════════`);
  for (const r of worst) {
    logger.log(`\n— #${r.id} overall ${r.scores.overall} (tone ${r.scores.toneMatch}, len ${r.scores.lengthFit}, rel ${r.scores.relevance}, nat ${r.scores.naturalness}, send ${r.scores.wouldSend})`);
    logger.log(`  context:\n${r.context.split('\n').map((l) => `    ${l}`).join('\n')}`);
    logger.log(`  REAL : ${r.expectedReply.replace(/\n/g, ' / ')}`);
    logger.log(`  DRAFT: ${r.draft.replace(/\n/g, ' / ')}`);
    logger.log(`  ⚠️  ${r.scores.critique}`);
  }
}

main().catch((err) => logger.error(err));
