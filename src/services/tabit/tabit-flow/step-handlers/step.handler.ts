import { IFlowStep, IUserFlowDetails } from '@services/tabit/interface';

export abstract class StepHandler {
  async handlePreUserAction?(chatId: number, options: IUserFlowDetails, flowStep: IFlowStep): Promise<void>;
  abstract handlePostUserAction(chatId: number, options: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void>;
}
