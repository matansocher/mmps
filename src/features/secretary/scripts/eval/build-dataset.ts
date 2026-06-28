import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger } from '@core/utils';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '../../../../../');
config({ path: join(REPO_ROOT, '.env') });

const logger = new Logger('build-eval-dataset');

const SOURCE_FILE = join(REPO_ROOT, 'toodie-conversation.json');
const OUTPUT_FILE = join(HERE, 'eval-dataset.json');

const ME_ID = 'user862305226'; // Matan
const HER_ID = 'user1332013273'; // Tootie
const HER_NAME = 'Tootie';

// How many trailing messages of context to keep before his reply (mirrors production's recent-window).
const CONTEXT_WINDOW = 16;

type RawEntity = string | { readonly type?: string; readonly text?: string };
type RawMessage = {
  readonly type?: string;
  readonly from_id?: string;
  readonly date?: string;
  readonly text?: string | RawEntity[];
};

type CleanMessage = {
  readonly fromOwner: boolean;
  readonly senderName: string;
  readonly text: string;
  readonly createdAt: string;
};

export type EvalExample = {
  readonly id: number;
  readonly context: CleanMessage[]; // ends with her unanswered run; excludes his real reply
  readonly expectedReply: string; // what Matan actually sent (his reply turn, lines joined)
};

function flattenText(text: string | RawEntity[] | undefined): string {
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) return text.map((part) => (typeof part === 'string' ? part : (part.text ?? ''))).join('');
  return '';
}

function toCleanMessages(messages: RawMessage[]): CleanMessage[] {
  const clean: CleanMessage[] = [];
  for (const message of messages) {
    if (message.type !== 'message') continue;
    if (message.from_id !== ME_ID && message.from_id !== HER_ID) continue;
    const text = flattenText(message.text).trim();
    if (!text) continue; // skip media-only / empty
    const fromOwner = message.from_id === ME_ID;
    clean.push({ fromOwner, senderName: fromOwner ? 'Matan' : HER_NAME, text, createdAt: message.date ?? '' });
  }
  return clean;
}

// Build one example at every her -> Matan transition.
function buildExamples(clean: CleanMessage[]): EvalExample[] {
  const examples: EvalExample[] = [];
  let id = 0;
  for (let i = 1; i < clean.length; i++) {
    const isTransition = clean[i].fromOwner && !clean[i - 1].fromOwner;
    if (!isTransition) continue;

    // His reply turn = consecutive owner messages starting at i.
    let j = i;
    const replyLines: string[] = [];
    while (j < clean.length && clean[j].fromOwner) {
      replyLines.push(clean[j].text);
      j++;
    }

    const context = clean.slice(Math.max(0, i - CONTEXT_WINDOW), i);
    if (context.length === 0 || context[context.length - 1].fromOwner) continue;

    examples.push({ id: id++, context, expectedReply: replyLines.join('\n') });
    i = j - 1; // skip past his reply turn
  }
  return examples;
}

function main(): void {
  logger.log(`Reading ${SOURCE_FILE} …`);
  const raw = JSON.parse(readFileSync(SOURCE_FILE, 'utf8')) as { messages: RawMessage[] };
  const clean = toCleanMessages(raw.messages ?? []);
  logger.log(`Clean text messages: ${clean.length}`);

  const examples = buildExamples(clean);
  logger.log(`Built ${examples.length} (context → his reply) examples.`);

  writeFileSync(OUTPUT_FILE, JSON.stringify(examples), 'utf8');
  logger.log(`Wrote dataset → ${OUTPUT_FILE}`);
}

main();
