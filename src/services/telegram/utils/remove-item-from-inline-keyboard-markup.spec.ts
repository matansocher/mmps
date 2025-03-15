import { removeItemFromInlineKeyboardMarkup } from './remove-item-from-inline-keyboard-markup';

describe('removeItemFromInlineKeyboardMarkup()', () => {
  const searchQuery = 'transcribe';
  const containingItem = { text: 'done', callback_data: 'str - transcribe' };
  const notContainingItem = { text: 'start', callback_data: 'str - complete' };

  test.each([
    { input: { inline_keyboard: [[containingItem], [notContainingItem]] }, expected: { inline_keyboard: [[notContainingItem]] } },
    { input: { inline_keyboard: [[notContainingItem], [containingItem]] }, expected: { inline_keyboard: [[notContainingItem]] } },
    { input: { inline_keyboard: [[containingItem, notContainingItem], [notContainingItem]] }, expected: { inline_keyboard: [[notContainingItem], [notContainingItem]] } },
    { input: { inline_keyboard: [[containingItem], [notContainingItem, notContainingItem]] }, expected: { inline_keyboard: [[notContainingItem, notContainingItem]] } },
  ])('should return $expected when input is $input', ({ input, expected }) => {
    expect(removeItemFromInlineKeyboardMarkup(input, searchQuery)).toEqual(expected);
  });
});
