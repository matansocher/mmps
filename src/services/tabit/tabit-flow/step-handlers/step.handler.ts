import { IFlowStep, IUserFlowDetails } from '@services/tabit/interface';

export abstract class StepHandler {
  abstract validateInput(userInput: string, args?): boolean;
  transformInput?(userInput: string, args?);
  async handlePreUserAction?(chatId: number, options: IUserFlowDetails, flowStep: IFlowStep): Promise<void>;
  abstract handlePostUserAction(chatId: number, options: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void>;
}
