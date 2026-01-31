import { addReading, getActiveSession, type SugarReading } from '@shared/sugar';

type LogReadingParams = {
  readonly chatId: number;
  readonly value?: number;
  readonly minutesAfterMeal?: number;
};

export async function handleLogReading({ chatId, value, minutesAfterMeal }: LogReadingParams): Promise<string> {
  if (value === undefined) {
    return JSON.stringify({ success: false, error: 'value is required to log a reading' });
  }

  const session = await getActiveSession(chatId);
  if (!session) {
    return JSON.stringify({
      success: false,
      error: 'No active session. Start one first with start_session action.',
    });
  }

  const minutes = minutesAfterMeal ?? Math.round((Date.now() - session.startedAt.getTime()) / 60000);

  const reading: SugarReading = {
    minutesAfterMeal: minutes,
    value,
    timestamp: new Date(),
  };

  await addReading(session._id, reading);

  const existingReadings = session.readings.map((r) => r.minutesAfterMeal);
  const allReadings = [...existingReadings, minutes].sort((a, b) => a - b);

  return JSON.stringify({
    success: true,
    message: `Logged ${value} mg/dL at ${minutes} minutes`,
    meal: session.mealDescription,
    readings: allReadings.map((m) => `${m}min`).join(', '),
  });
}
