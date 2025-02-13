import { processMessageTemplate } from './process-message-template';

describe('processMessageTemplate()', () => {
  it('should return the string if no templates in string', () => {
    const template = 'some string';
    const actualResult = processMessageTemplate(template, {});
    expect(actualResult).toEqual(template);
  });

  it('should replace the variable in the template - totalExercises', () => {
    const template = `yes, {currentStreak} days left 💪`;
    const input = { currentStreak: 6 };
    const actualResult = processMessageTemplate(template, input);
    expect(actualResult).toEqual(`yes, 6 days left 💪`);
  });

  it('should replace the variable in the template and add another number', () => {
    const template = `yes, {currentStreak + 4} days left 💪`;
    const input = { currentStreak: 6 };
    const actualResult = processMessageTemplate(template, input);
    expect(actualResult).toEqual(`yes, 10 days left 💪`);
  });

  it('should replace the variable in the template and subtract another number', () => {
    const template = `yes, {currentStreak - 4} days left 💪`;
    const input = { currentStreak: 6 };
    const actualResult = processMessageTemplate(template, input);
    expect(actualResult).toEqual(`yes, 2 days left 💪`);
  });

  it('should replace the variable in the template and add another variable', () => {
    const template = `yes, {longestStreak + currentStreak} days left 💪`;
    const input = { longestStreak: 10, currentStreak: 6 };
    const actualResult = processMessageTemplate(template, input);
    expect(actualResult).toEqual(`yes, 16 days left 💪`);
  });

  it('should replace the variable in the template and subtract another variable', () => {
    const template = `yes, {longestStreak - currentStreak} days left 💪`;
    const input = { longestStreak: 10, currentStreak: 6 };
    const actualResult = processMessageTemplate(template, input);
    expect(actualResult).toEqual(`yes, 4 days left 💪`);
  });
});
