import { StepHandler } from '@services/tabit/tabit-flow/step-handlers';
import { IFlowStepType } from './flow-step.enum';

export interface IFlowStep {
  id: IFlowStepType;
  handler: new (...args: any[]) => StepHandler;
  preUserActionResponseMessage?: string;
}