import { config } from 'dotenv';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { Logger } from '@core/utils';
import type { SecretaryMessage } from '../mongo';
import { buildDraftUserPrompt, generateDraftReply, unansweredTail } from '../secretary-draft.utils';
import { REPLY_NEEDED_THRESHOLD } from '../secretary.config';

config({ path: join(cwd(), '../../../../.env') });

const logger = new Logger('test-draft');

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ME: paste a real past conversation below.
// One message per line. Prefix a line with "me:" for YOUR replies; untagged
// lines are from her. Order is oldest → newest (most recent message last).
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE = `
אני אוהבת אותך דוזה
אפילו שאין לך כוח אליי
אני פה מסתובבת ומרעיפה אהבה עליך ועל גילי ושניכם בתכלס ברומן ביניכם אחריי רודף אופיר
מזל שרוצים לשכב איתי גם סוג של מוטיבציה
`;

// Name used for her side in the transcript (label only).
const HER_NAME = 'her';

function parseSample(raw: string): SecretaryMessage[] {
  const base = Date.now();
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const fromOwner = line.toLowerCase().startsWith('me:');
      const text = fromOwner ? line.slice(3).trim() : line;
      return {
        chatId: 1,
        fromOwner,
        senderName: fromOwner ? undefined : HER_NAME,
        text,
        transcribed: false,
        createdAt: new Date(base + index * 1000),
      } as SecretaryMessage;
    });
}

async function main(): Promise<void> {
  const messages = parseSample(SAMPLE);
  if (messages.length === 0) {
    logger.error('SAMPLE is empty — paste a conversation into the script first.');
    return;
  }

  const unanswered = unansweredTail(messages);
  if (unanswered.length === 0) {
    logger.error('The last message is from you (me:) — there is nothing unanswered to reply to.');
    return;
  }

  const { userPrompt, wantSummary } = buildDraftUserPrompt(messages, unanswered);

  logger.log('────────────── PROMPT SENT TO MODEL ──────────────');
  logger.log(`\n${userPrompt}\n`);
  logger.log(`Unanswered messages: ${unanswered.length} | Summary threshold reached: ${wantSummary ? 'YES (summary requested)' : 'no (summary suppressed)'}`);
  logger.log(`──────────── GENERATING DRAFT OPTIONS ────────────`);

  try {
    const result = await generateDraftReply(messages);
    if (!result) {
      logger.warn('(empty — model returned no drafts)');
      return;
    }
    const wouldSend = result.replyNeeded >= REPLY_NEEDED_THRESHOLD;
    logger.log(`\n🎯 replyNeeded: ${result.replyNeeded.toFixed(2)} (threshold ${REPLY_NEEDED_THRESHOLD}) → ${wouldSend ? 'WOULD SEND ✅' : 'WOULD STAY SILENT 🤫'}`);
    result.drafts.forEach((draft, i) => logger.log(`#${i + 1} 💬 ${draft}`));
    if (result.summary) logger.log(`📋 SUMMARY: ${result.summary}`);
  } catch (err) {
    logger.error(`Draft generation failed: ${err}`);
  }
}

main().catch((err) => logger.error(err));
