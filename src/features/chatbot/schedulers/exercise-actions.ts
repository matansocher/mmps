import { InlineKeyboard } from 'grammy';

export const EXERCISE_ACTION_PREFIX = 'exercise';

export type ExerciseAction = 'done' | 'skip' | 'remind';

export function buildExerciseCallbackData(action: ExerciseAction): string {
  return [EXERCISE_ACTION_PREFIX, action].join(':');
}

export function parseExerciseCallbackData(data: string): ExerciseAction | null {
  const [prefix, action] = data.split(':');
  if (prefix !== EXERCISE_ACTION_PREFIX) {
    return null;
  }
  if (action !== 'done' && action !== 'skip' && action !== 'remind') {
    return null;
  }
  return action;
}

export function buildExerciseKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Done', buildExerciseCallbackData('done'))
    .text('⏭️ Skip today', buildExerciseCallbackData('skip'))
    .row()
    .text('😴 Remind in 1h', buildExerciseCallbackData('remind'));
}
