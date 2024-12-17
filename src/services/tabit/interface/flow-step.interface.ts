import { StepHandler } from '../tabit-flow/step-handlers/step.handler';
import { IFlowStepType } from './flow-step.enum';

export interface IFlowStep {
  id: IFlowStepType;
  handler: new (...args: any[]) => StepHandler;
  preUserActionResponseMessage?: string; // message to the user on what is the next step asking (pre handler)
}
