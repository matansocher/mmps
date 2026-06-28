import { config } from 'dotenv';
import { Bot, GrammyError } from 'grammy';
import { join } from 'node:path';
import { cwd, env, argv } from 'node:process';
import { Logger } from '@core/utils';
import { BOT_CONFIG } from '../wolt.config';

const logger = new Logger('wolt-broadcast');

// Paste the affected chat ids here, e.g. [123456789, 987654321].
const CHAT_IDS: number[] = [5660723464, 253901676, 5205717975, 7404564565, 1809195019, 2012077456, 186702734, 5833146559, 597884902, 398475771, 1198554451];

// The message to send. Edit before running.
const MESSAGE = [
  'היי! 👋',
  'הייתה תקלה זמנית בבוט שבגללה חלק מהחיפושים וההתראות לא עבדו כמו שצריך.',
  'התקלה תוקנה והכל חזר לפעול כרגיל 🙏',
  'מצטערים על אי הנוחות!',
  'תמיד פתוחים לשמוע הצעות לשיפור הבוט, אפשר ללחוץ על צור קשר ותגיעו לדבר איתנו 😁',
].join('\n');

// ~20 messages/sec, comfortably under Telegram's bulk broadcast limit.
const DELAY_BETWEEN_MESSAGES_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToUser(bot: Bot, chatId: number): Promise<'sent' | 'blocked' | 'failed'> {
  try {
    await bot.api.sendMessage(chatId, MESSAGE);
    return 'sent';
  } catch (err) {
    if (err instanceof GrammyError) {
      if (err.error_code === 403) {
        return 'blocked'; // user blocked the bot or chat no longer exists
      }
      if (err.error_code === 429) {
        const retryAfter = err.parameters?.retry_after ?? 1;
        await sleep((retryAfter + 1) * 1000);
        try {
          await bot.api.sendMessage(chatId, MESSAGE);
          return 'sent';
        } catch (retryErr) {
          logger.error(`${sendToUser.name} - retry failed for ${chatId} - ${retryErr}`);
          return 'failed';
        }
      }
    }
    logger.error(`${sendToUser.name} - failed for ${chatId} - ${err}`);
    return 'failed';
  }
}

async function main(): Promise<void> {
  config({ path: join(cwd(), '.env.serve') }); // no-op on Heroku, where env is already populated

  const token = env[BOT_CONFIG.token];
  if (!token) {
    throw new Error(`Missing ${BOT_CONFIG.token} in env`);
  }

  const bot = new Bot(token); // bare API client - no bot.start(), so it never conflicts with the live bot's polling

  // Pass a chat id as an argument for a dry run to a single user; pass nothing to send to all CHAT_IDS.
  const dryRunChatId = argv[2] ? Number(argv[2]) : null;
  const targets = dryRunChatId !== null ? [dryRunChatId] : CHAT_IDS;
  if (!targets.length) {
    logger.log('No chat ids to send to. Fill CHAT_IDS (or pass a chat id argument) and re-run.');
    return;
  }

  logger.log(`Broadcasting to ${targets.length} user(s)${dryRunChatId !== null ? ' [DRY RUN]' : ''}...`);

  const tally = { sent: 0, blocked: 0, failed: 0 };
  for (const chatId of targets) {
    const result = await sendToUser(bot, chatId);
    tally[result] += 1;
    await sleep(DELAY_BETWEEN_MESSAGES_MS);
  }

  logger.log(`Done. sent=${tally.sent} blocked=${tally.blocked} failed=${tally.failed}`);
}

main().catch((err) => logger.error(`${err}`));
