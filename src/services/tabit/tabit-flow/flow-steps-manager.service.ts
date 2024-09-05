import { Injectable } from '@nestjs/common';
import { IUserFlowDetails } from '@services/tabit/interface';

@Injectable()
export class FlowStepsManagerService {
  private usersSteps: Map<number, IUserFlowDetails>;

  constructor() {
    this.usersSteps = new Map();
  }

  getCurrentUserStepDetails(chatId: number): IUserFlowDetails | null {
    const userStep = this.usersSteps.get(chatId);
    if (!userStep) {
      return null;
    }
    return this.usersSteps.get(chatId);
  }

  setInitialUserStep(chatId: number): void {
    this.usersSteps.set(chatId, { currentStepIndex: 0 });
  }

  addUserStepDetail(chatId: number, stepUpdate: Partial<IUserFlowDetails>): void {
    const userStep = this.usersSteps.get(chatId);
    this.usersSteps.set(chatId, { ...userStep, ...stepUpdate });
  }

  incrementCurrentUserStep(chatId: number): void {
    const currentStep = this.usersSteps.get(chatId);
    if (!currentStep) {
      this.usersSteps.set(chatId, { currentStepIndex: 0 });
      return;
    }
    this.usersSteps.set(chatId, { ...currentStep, currentStepIndex: currentStep.currentStepIndex + 1 });
  }

  resetCurrentUserStep(chatId: number): void {
    this.usersSteps.delete(chatId);
  }
}
