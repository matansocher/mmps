import { getActiveSession } from '@shared/sugar';
import { formatReading } from './format-utils';

type GetActiveParams = {
  readonly chatId: number;
};

export async function handleGetActive({ chatId }: GetActiveParams): Promise<string> {
  const session = await getActiveSession(chatId);
  if (!session) {
    return JSON.stringify({ success: true, message: 'No active session', hasActiveSession: false });
  }

  const elapsedMinutes = Math.round((Date.now() - session.startedAt.getTime()) / 60000);

  return JSON.stringify({
    success: true,
    hasActiveSession: true,
    session: {
      meal: session.mealDescription,
      startedAt: session.startedAt,
      elapsedMinutes,
      readings: session.readings.map(formatReading),
    },
  });
}
