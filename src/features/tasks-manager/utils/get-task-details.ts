import { TaskDetails } from '../interface';

export function getTaskDetails(input: string): TaskDetails {
  const [interval, title] = input.split(' - ');
  const [intervalAmount, intervalUnits] = interval.split('');
  return {
    title,
    intervalUnits,
    intervalAmount: parseInt(intervalAmount),
  };
}
