import { hydrate } from '@grammyjs/hydrate';
import { Bot } from 'grammy';
import { env } from 'node:process';
import { markComponentFailed } from '@core/health';
import { getErrorMessage, Logger } from '@core/utils';
import type { TelegramBotConfig } from '../types';
import { getBotToken } from './get-bot-token';

const logger = new Logger('telegram:bot-factory');
const botInstances = new Map<string, Bot>();
// Tracks bots being stopped intentionally (graceful shutdown) so their poller
// resolving/rejecting is not misreported as an unexpected termination.
const stoppingBots = new Set<string>();

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
  // If the poller ends for any reason other than an intentional shutdown, the bot is no longer serving,
  // so readiness is flipped to failed (the process stays live but degraded).
  bot
    .start()
    .then(() => {
      if (stoppingBots.has(botConfig.id)) return;
      markComponentFailed(botConfig.id, 'polling terminated unexpectedly');
      logger.error(`Polling terminated unexpectedly for bot ${botConfig.id}`);
    })
    .catch((err) => {
      if (stoppingBots.has(botConfig.id)) return;
      markComponentFailed(botConfig.id, getErrorMessage(err));
      logger.error(`Polling failed for bot ${botConfig.id}: ${getErrorMessage(err)}`);
    });

  logger.log(`Bot ${botConfig.id} (${botConfig.name}) initialized successfully`);

  return bot;
};

export async function stopAllTelegramBots(): Promise<void> {
  for (const id of botInstances.keys()) {
    stoppingBots.add(id);
  }
  await Promise.allSettled([...botInstances.values()].map((bot) => bot.stop()));
  botInstances.clear();
  stoppingBots.clear();
}
