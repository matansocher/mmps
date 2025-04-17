import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BOTS, getMessageData, getTableTemplate, registerHandlers, sendMessageInStyle, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { PLAYGROUNDS_BOT_COMMANDS } from './playgrounds.config';

@Injectable()
export class PlaygroundsController implements OnModuleInit {
  private readonly logger = new Logger(PlaygroundsController.name);

  constructor(@Inject(BOTS.PLAYGROUNDS.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(PLAYGROUNDS_BOT_COMMANDS));
    const { COMMAND } = TELEGRAM_EVENTS;
    const { START } = PLAYGROUNDS_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [{ event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) }];
    registerHandlers({ bot: this.bot, logger: this.logger, isBlocked: true, handlers });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const replyMessage = 'this is a very long message and we want to send each word separately so it looks like it is being written live';
    // await sendMessageInStyle(this.bot, chatId, replyMessage);

    const items = [
      { name: 'הפועל באר שבע', value: 73 },
      { name: 'מכבי תל אביב', value: 62 },
      { name: 'מכבי חיפה', value: 57 },
      { name: 'בית״ר ירושלים', value: 53 },
      { name: 'הפועל חיפה', value: 52 },
      { name: 'מכבי נתניה', value: 51 },
      { name: 'הפועל ירושלים', value: 50 },
      { name: 'עירוני קרית שמונה', value: 48 },
      { name: 'מכבי בני ריינה', value: 47 },
      { name: 'מכבי פתח תקווה', value: 45 },
      { name: 'בני סכנין', value: 43 },
      { name: 'עירוני טבריה', value: 42 },
      { name: 'מ.ס. אשדוד', value: 38 },
      { name: 'הפועל חדרה', value: 37 },
    ];

    const indices = items.map((_, i) => String(i + 1));
    const names = items.map((item) => item.name);
    const pts = items.map((item) => String(item.value));

    const idxWidth = Math.max(...indices.map((s) => s.length));
    const nameWidth = Math.max(...names.map((s) => s.length));
    const ptsWidth = Math.max(...pts.map((s) => s.length));

    const rows = items.map((item, i) => {
      const idx = String(i + 1).padStart(idxWidth, ' ');
      const name = item.name.padEnd(nameWidth, ' ');
      const pt = String(item.value).padStart(ptsWidth, ' ');
      return `${idx}  ${name}  ${pt}`;
    });

    const table = rows.join('\n');
    const replyText = '```\n' + table + '\n```';

    const replyTextTwo = getTableTemplate(items);

    await this.bot.sendMessage(chatId, `🇮🇱 ליגת העל 🇮🇱\n${replyText}`, { parse_mode: 'Markdown' });
    await this.bot.sendMessage(chatId, `🇮🇱 ליגת העל 🇮🇱\n${replyTextTwo}`, { parse_mode: 'Markdown' });
  }

  private async pollHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    // allows_multiple_answers: boolean
    // is_anonymous: boolean
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: true });
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: false });
  }
}
