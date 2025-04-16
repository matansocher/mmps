import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BOTS, getMessageData, registerHandlers, sendMessageInStyle, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
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
    const data = [
      { name: '1 ליברפול', points: 73 },
      { name: '2 ארסנל', points: 62 },
      { name: '3 נוטינגהאם פורסט', points: 57 },
      { name: "4 צ'לסי", points: 53 },
      { name: "5 מנצ'סטר סיטי", points: 52 },
      { name: '6 אסטון וילה', points: 51 },
      { name: '7 ניוקאסל יונייטד', points: 50 },
      { name: '8 פולהאם', points: 48 },
      { name: '9 ברייטון', points: 47 },
      { name: "10 בורנמות'", points: 45 },
      { name: '11 קריסטל פאלאס', points: 43 },
      { name: '12 ברנטפורד', points: 42 },
      { name: "13 מנצ'סטר יונייטד", points: 38 },
      { name: '14 טוטנהאם', points: 37 },
      { name: '15 אברטון', points: 35 },
      { name: '16 ווסטהאם', points: 35 },
      { name: '17 וולבס', points: 32 },
      { name: "18 איפסוויץ'", points: 20 },
      { name: '19 לסטר', points: 17 },
      { name: "20 סאות'המפטון", points: 10 },
    ];
    const longestNameLength = Math.max(...data.map(({ name }) => name.length));
    const longestPointsLength = Math.max(...data.map(({ points }) => points.toString().length));
    const longestLength = Math.max(longestNameLength, longestPointsLength);
    const longestLineLength = longestLength + 3;
    const longestLine = '-'.repeat(longestLineLength);
    const header = `| ${' '.repeat(longestLength - 1)} | ${' '.repeat(longestLength - 1)} |`;
    const headerLine = `| ${' '.repeat(longestLength - 1)} | ${' '.repeat(longestLength - 1)} |`;
    const headerString = `| ${' '.repeat(longestLength - 1)} | ${' '.repeat(longestLength - 1)} |`;
    const headerStringWithLine = `${headerString}\n${longestLine}`;
    const headerWithLine = `${headerLine}\n${longestLine}`;
    const headerWithLineString = `${headerString}\n${longestLine}`;
    const headerWithLineStringWithLine = `${headerString}\n${longestLine}`;
    const headerWithLineStringWithLineString = `${headerString}\n${longestLine}`;

    const stringifiedData = data
      .map(({ name, points }) => {
        const nameSpaces = ' '.repeat(longestLength - name.length);
        const pointsSpaces = ' '.repeat(longestLength - points.toString().length);
        return `| ${name}${nameSpaces} | ${points}${pointsSpaces} |`;
      })
      .join('\n');
    const stringifiedDataWithLine = data
      .map(({ name, points }) => {
        const nameSpaces = ' '.repeat(longestLength - name.length);
        const pointsSpaces = ' '.repeat(longestLength - points.toString().length);
        return `| ${name}${nameSpaces} | ${points}${pointsSpaces} |`;
      })
      .join('\n');
    await this.bot.sendMessage(chatId, stringifiedData);
    await this.bot.sendMessage(chatId, stringifiedDataWithLine);
  }

  private async pollHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    // allows_multiple_answers: boolean
    // is_anonymous: boolean
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: true });
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: false });
  }
}
