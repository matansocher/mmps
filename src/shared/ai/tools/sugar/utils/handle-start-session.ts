import { createSession, getActiveSession, type MealType } from '@shared/sugar';

type StartSessionParams = {
  readonly chatId: number;
  readonly mealDescription?: string;
  readonly foods?: string[];
  readonly mealType?: MealType;
  readonly tags?: string[];
};

export async function handleStartSession({ chatId, mealDescription, foods, mealType, tags }: StartSessionParams): Promise<string> {
  if (!mealDescription) {
    return JSON.stringify({ success: false, error: 'mealDescription is required to start a session' });
  }

  const existingSession = await getActiveSession(chatId);
  if (existingSession) {
    return JSON.stringify({
      success: false,
      error: 'There is already an active session. Close it first with close_session action.',
      activeSession: { meal: existingSession.mealDescription, startedAt: existingSession.startedAt },
    });
  }

  const result = await createSession({ chatId, mealDescription, foods, mealType, tags });

  return JSON.stringify({
    success: true,
    message: `Session started for: ${mealDescription}`,
    sessionId: result.insertedId.toString(),
    tip: 'Log your baseline reading now (0 min), then readings at 30, 60, and 120 minutes.',
  });
}
