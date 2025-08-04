import { LOCATIONS } from '../tracker.config';

export function findLocation(targetChatId: number) {
  return Object.values(LOCATIONS).find((location) => location.chatId === targetChatId) || null;
}
