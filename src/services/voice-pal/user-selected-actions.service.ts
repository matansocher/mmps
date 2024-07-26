import { Injectable } from '@nestjs/common';
import { VOICE_PAL_OPTIONS } from '@services/voice-pal/voice-pal.config';

@Injectable()
export class UserSelectedActionsService {
  private userActions: any = {};

  getCurrentUserAction(chatId) {
    const userAction = this.userActions[chatId];
    if (!userAction) {
      return null;
    }
    const relevantActionKey = Object.keys(VOICE_PAL_OPTIONS).find(
      (option) => VOICE_PAL_OPTIONS[option].displayName === userAction,
    );
    if (!relevantActionKey) {
      return null;
    }
    return VOICE_PAL_OPTIONS[relevantActionKey];
  }

  setCurrentUserAction(chatId, action) {
    this.userActions[chatId] = action;
  }
}
