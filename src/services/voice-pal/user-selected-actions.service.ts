import { Injectable } from '@nestjs/common';
import { IVoicePalOption } from '@services/voice-pal';
import { VOICE_PAL_OPTIONS } from '@services/voice-pal';

@Injectable()
export class UserSelectedActionsService {
  private userActions: any = {};

  getCurrentUserAction(chatId: number): IVoicePalOption {
    const userAction = this.userActions[chatId];
    if (!userAction) {
      return null;
    }
    const relevantActionKey = Object.keys(VOICE_PAL_OPTIONS).find(
      (option: string) => VOICE_PAL_OPTIONS[option].displayName === userAction,
    );
    if (!relevantActionKey) {
      return null;
    }
    return VOICE_PAL_OPTIONS[relevantActionKey];
  }

  setCurrentUserAction(chatId: number, action: string): void {
    this.userActions[chatId] = action;
  }
}
