import { TelegramBotConfig } from '../interface';

export const BOTS: Record<string, TelegramBotConfig> = {
  WOLT: {
    id: 'WOLT',
    name: 'Wolt Bot 🍔',
    token: 'WOLT_TELEGRAM_BOT_TOKEN',
  },
  VOICE_PAL: {
    id: 'VOICE_PAL',
    name: 'Voice Pal Bot 🎧',
    token: 'VOICE_PAL_TELEGRAM_BOT_TOKEN',
  },
  COACH: {
    id: 'COACH',
    name: 'Coach Bot ⚽️',
    token: 'COACH_TELEGRAM_BOT_TOKEN',
  },
  TEACHER: {
    id: 'TEACHER',
    name: 'Teacher Bot 👨‍🏫',
    token: 'TEACHER_TELEGRAM_BOT_TOKEN',
  },
  PROGRAMMING_TEACHER: {
    id: 'PROGRAMMING_TEACHER',
    name: 'Programming Teacher Bot 👨‍🏫',
    token: 'PROGRAMMING_TEACHER_TELEGRAM_BOT_TOKEN',
  },
  ROLLINSPARK: {
    id: 'ROLLINSPARK',
    name: 'Rollins Park Bot 🏘️',
    token: 'ROLLINSPARK_TELEGRAM_BOT_TOKEN',
  },
  NOTIFIER: {
    id: 'NOTIFIER',
    name: 'Notifier Bot 🦔',
    token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
  },
};

export enum BOT_BROADCAST_ACTIONS {
  TYPING = 'typing',
  UPLOADING_VOICE = 'upload_voice',
}

export enum POSSIBLE_INPUTS {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
  PHOTO = 'photo',
  FILE = 'file',
}

// getMarkupExample() {
//   return `
//       *bold \\*text*
//       _italic \\*text_
//       __underline__
//       ~strikethrough~
//       ||spoiler||
//       *bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
//       [inline URL](http://www.example.com/)
//       [inline mention of a user](tg://user?id=123456789)
//       ![👍](tg://emoji?id=5368324170671202286)
//       \`inline fixed-width code\`
//       \`\`\`
//       pre-formatted fixed-width code block
//       \`\`\`
//       \`\`\`python
//       pre-formatted fixed-width code block written in the Python programming language
//       \`\`\`
//     `;
//
//   // >Block quotation started
//   // >Block quotation continued
//   // >Block quotation continued
//   // >Block quotation continued
//   // >The last line of the block quotation
//   // **>The expandable block quotation started right after the previous block quotation
//   // >It is separated from the previous block quotation by an empty bold entity
//   // >Expandable block quotation continued
//   // >Hidden by default part of the expandable block quotation started
//   // >Expandable block quotation continued
//   // >The last line of the expandable block quotation with the expandability mark||
// }
