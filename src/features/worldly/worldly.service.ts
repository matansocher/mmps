import * as fs from 'fs';
import { type Bot, InputFile } from 'grammy';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR, buildInlineKeyboard } from '@services/telegram';
import { getAllCountries, getAllStates, getUserDetails, updateSubscription } from '@shared/worldly';
import { buildQuestion, QuestionDescriptor } from './question-builder';
import { getAreaMap } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './worldly.config';

const MODE_TO_BOT_ACTION: Record<QuestionDescriptor['mode'], BOT_ACTIONS> = {
  map: BOT_ACTIONS.MAP,
  us_map: BOT_ACTIONS.US_MAP,
  flag: BOT_ACTIONS.FLAG,
  capital: BOT_ACTIONS.CAPITAL,
};

export class WorldlyService {
  constructor(private readonly bot: Bot) {}

  async randomGameHandler(chatId: number): Promise<void> {
    try {
      const descriptor = await buildQuestion('random', chatId);
      await this.sendQuestion(chatId, descriptor);
    } catch (err) {
      if (err.message.includes(BLOCKED_ERROR)) {
        const userDetails = await getUserDetails(chatId);
        notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
        await updateSubscription(chatId, { isActive: false });
      }
    }
  }

  async mapHandler(chatId: number): Promise<void> {
    const descriptor = await buildQuestion('map', chatId);
    await this.sendQuestion(chatId, descriptor);
  }

  async USMapHandler(chatId: number): Promise<void> {
    const descriptor = await buildQuestion('us_map', chatId);
    await this.sendQuestion(chatId, descriptor);
  }

  async flagHandler(chatId: number): Promise<void> {
    const descriptor = await buildQuestion('flag', chatId);
    await this.sendQuestion(chatId, descriptor);
  }

  async capitalHandler(chatId: number): Promise<void> {
    const descriptor = await buildQuestion('capital', chatId);
    await this.sendQuestion(chatId, descriptor);
  }

  private async sendQuestion(chatId: number, descriptor: QuestionDescriptor): Promise<void> {
    const action = MODE_TO_BOT_ACTION[descriptor.mode];
    const keyboard = buildInlineKeyboard(
      descriptor.options.map((opt) => ({
        text: opt.label,
        data: [action, opt.id, descriptor.correct.id, descriptor.gameId].join(INLINE_KEYBOARD_SEPARATOR),
        style: 'primary' as const,
      })),
    );

    if (descriptor.mode === 'map' || descriptor.mode === 'us_map') {
      const allAreas = descriptor.isState ? await getAllStates() : await getAllCountries();
      const imagePath = getAreaMap(allAreas, descriptor.imageAreaName!, descriptor.isState);
      await this.bot.api.sendPhoto(chatId, new InputFile(fs.createReadStream(imagePath)), { reply_markup: keyboard, caption: descriptor.captionText });
      return;
    }

    if (descriptor.mode === 'flag') {
      await this.bot.api.sendMessage(chatId, descriptor.flagEmoji!, { reply_markup: keyboard });
      return;
    }

    // capital
    await this.bot.api.sendMessage(chatId, descriptor.captionText!, { reply_markup: keyboard });
  }
}
