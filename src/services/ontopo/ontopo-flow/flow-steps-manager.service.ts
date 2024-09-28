import { Injectable } from '@nestjs/common';
import { IFlowStepType, IUserFlowDetails } from '../interface';

const ENTITY_INITIAL_STATE = { currentStepIndex: 0 };
@Injectable()
export class FlowStepsManagerService {
  private usersSteps: Map<number, IUserFlowDetails>;

  constructor() {
    this.usersSteps = new Map();
  }

  getCurrentUserStepDetails(chatId: number): IUserFlowDetails | null {
    const userSteps = this.usersSteps.get(chatId) || null;
    if (!userSteps) {
      this.usersSteps.set(chatId, ENTITY_INITIAL_STATE);
      return ENTITY_INITIAL_STATE;
    }
    return userSteps;
  }

  addUserStepDetail(chatId: number, stepUpdate: Partial<IUserFlowDetails>): void {
    const userStep = this.getCurrentUserStepDetails(chatId);
    this.usersSteps.set(chatId, { ...userStep, ...stepUpdate });
  }

  updateUserStepMessageId(chatId: number, stepType: IFlowStepType, messageId: number): void {
    const currentStep = this.getCurrentUserStepDetails(chatId);
    const { botQuestionsMessageIds } = currentStep;
    const newBotQuestionsMessageIds = { ...botQuestionsMessageIds, [stepType]: messageId };
    this.usersSteps.set(chatId, { ...currentStep, botQuestionsMessageIds: newBotQuestionsMessageIds });
  }

  incrementCurrentUserStep(chatId: number): void {
    const currentStep = this.getCurrentUserStepDetails(chatId);
    this.usersSteps.set(chatId, { ...currentStep, currentStepIndex: currentStep.currentStepIndex + 1 });
  }

  resetCurrentUserStep(chatId: number): void {
    this.usersSteps.delete(chatId);
  }
}
