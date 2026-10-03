import { hydrate } from '@grammyjs/hydrate';
import { run, type RunnerHandle, sequentialize } from '@grammyjs/runner';
import { Bot } from 'grammy';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import type { TelegramBotConfig } from '../types';
import { getBotToken } from './get-bot-token';

const logger = new Logger('telegram:bot-factory');
const botInstances = new Map<string, Bot>();
const runnerHandles = new Map<string, RunnerHandle>();

export const provideTelegramBot = (botConfig: TelegramBotConfig): Bot => {
  if (botInstances.has(botConfig.id)) {
    return botInstances.get(botConfig.id);
  }

  const botToken = env[botConfig.token];
  const token = getBotToken(botConfig.id, botToken, botConfig.forceLocal);

  if (!token) {
    throw new Error(`Bot ${botConfig.id} cannot be initialized - no token available. This should not happen as the module should not be loaded.`);
  }

  const bot = new Bot(token);
  if (botConfig.concurrentUpdates) {
    // must run before any handler: updates of different chats run in parallel, updates of the same chat stay in order
    bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));
  }
  bot.use(hydrate());

  bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(`Error while handling update ${ctx.update.update_id}: ${err.error}`);
  });

  const commands = Object.values(botConfig.commands || [])
    .filter((command) => !command.hide)
    .map((command) => ({ ...command, command: command.command.replace('/', '') }));
  if (commands?.length) {
    // Finite setup call - contain its rejection so it never reaches the process-wide fatal handler
    bot.api.setMyCommands(commands).catch((err) => logger.error(`Failed to set commands for bot ${botConfig.id}: ${getErrorMessage(err)}`));
  }

  botInstances.set(botConfig.id, bot);

  // Long-running poller - its promise resolves only when the bot stops. A startup/polling rejection
  // must stay contained to this bot instead of escaping to the process-wide unhandledRejection handler.
  if (botConfig.concurrentUpdates) {
    const runner = run(bot);
    runnerHandles.set(botConfig.id, runner);
    runner.task()?.catch((err) => logger.error(`Polling failed for bot ${botConfig.id}: ${getErrorMessage(err)}`));
  } else {
    bot.start().catch((err) => logger.error(`Polling failed for bot ${botConfig.id}: ${getErrorMessage(err)}`));
  }

  logger.log(`Bot ${botConfig.id} (${botConfig.name}) initialized successfully`);

  return bot;
};

export async function stopAllTelegramBots(): Promise<void> {
  const runners = [...runnerHandles.values()].filter((runner) => runner.isRunning());
  await Promise.allSettled([...botInstances.values()].map((bot) => bot.stop()).concat(runners.map((runner) => runner.stop())));
  botInstances.clear();
  runnerHandles.clear();
}
