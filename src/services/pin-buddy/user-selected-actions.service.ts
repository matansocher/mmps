import { Injectable } from '@nestjs/common';
import { IVoicePalOption } from '@services/voice-pal/interface';
import { PIN_BUDDY_OPTIONS } from '@services/pin-buddy/pin-buddy.config';

@Injectable()
export class UserSelectedActionsService {
  private userActions: any = {};

  getCurrentUserAction(chatId: number): IVoicePalOption {
    const userAction = this.userActions[chatId];
    if (!userAction) {
      return null;
    }
    const relevantActionKey = Object.keys(PIN_BUDDY_OPTIONS).find((option: string) => PIN_BUDDY_OPTIONS[option].displayName === userAction);
    if (!relevantActionKey) {
      return null;
    }
    return PIN_BUDDY_OPTIONS[relevantActionKey];
  }

  setCurrentUserAction(chatId: number, action: string): void {
    this.userActions[chatId] = action;
  }
}
