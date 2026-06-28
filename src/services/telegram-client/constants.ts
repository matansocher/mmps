export const EXCLUDED_EVENTS = ['UpdateUserStatus', 'UpdateReadChannelInbox'];

export const LISTEN_TO_EVENTS = [
  'UpdateNewChannelMessage',
  'UpdateNewMessage',
  'UpdateShortMessage',
  'UpdateNewMessageService',
  'UpdateNewEncryptedMessage',
  'UpdateNewEncryptedChatMessage',
  'UpdateEditMessage',
  'UpdateEditChannelMessage',
  'UpdateDeleteMessages',
  'UpdateDeleteChannelMessages',
];

export type ChannelConfig = {
  readonly id: string;
  readonly name: string;
  readonly type: 'channel' | 'chat';
};

export const CHANNELS: Record<string, ChannelConfig> = {
  TOODIE: { id: '1332013273', name: `Toodie 🦔`, type: 'chat' },
  NEWS_FROM_THE_FIELD: { id: '1406113886', name: `חדשות 100שטח`, type: 'channel' },
  DANIEL_AMRAM: { id: '3648142719', name: `דניאל עמרם ללא צנזורה`, type: 'channel' },
  SHLOMO_WEATHER: { id: '1665567611', name: `שלמה ⛈️ מזג אוויר`, type: 'channel' },
  MORAD_STERN: { id: '1083698033', name: `מורד שטרן, הערוץ הטכנולוגי 🇮🇱`, type: 'channel' },
  GEEKTIME: { id: '1282228958', name: `Geektime`, type: 'channel' },
};

export const EXCLUDED_CHANNELS = [];
