export function validateUserTaskInput(input: string): boolean {
  const [interval, title] = input.split(' - ');
  if (!interval || !title) {
    return false;
  }
  const [intervalAmount, intervalUnits] = interval.split('');
  if (!intervalAmount || !intervalUnits) {
    return false;
  }
  if (isNaN(parseInt(intervalAmount))) {
    return false;
  }
  return true;
}
