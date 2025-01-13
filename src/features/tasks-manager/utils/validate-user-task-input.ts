import { TaskDetails } from '@features/tasks-manager/interface';

interface ValidationOutput {
  readonly isValid: boolean;
  readonly taskDetails?: TaskDetails;
}

export function validateUserTaskInput(input: string): ValidationOutput {
  const interval = input.split(' ')[0];
  const title = input.replace(interval, '').trim();
  if (!interval || !title) {
    return { isValid: false };
  }
  const [intervalAmount, intervalUnits] = interval.split('');
  if (!intervalAmount || !intervalUnits) {
    return { isValid: false };
  }
  if (isNaN(parseInt(intervalAmount))) {
    return { isValid: false };
  }
  return { isValid: true, taskDetails: { title, intervalUnits, intervalAmount: +intervalAmount } };
}
