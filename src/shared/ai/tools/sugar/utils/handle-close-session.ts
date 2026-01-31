import { calculateSessionMetrics, closeSession, getActiveSession } from '@shared/sugar';

type CloseSessionParams = {
  readonly chatId: number;
};

export async function handleCloseSession({ chatId }: CloseSessionParams): Promise<string> {
  const session = await getActiveSession(chatId);
  if (!session) {
    return JSON.stringify({ success: false, error: 'No active session to close' });
  }

  await closeSession(session._id);
  const metrics = calculateSessionMetrics(session);

  return JSON.stringify({
    success: true,
    message: 'Session closed',
    summary: {
      meal: session.mealDescription,
      readingCount: session.readings.length,
      peakValue: metrics.peakValue,
      peakTime: metrics.peakTime,
      delta: metrics.delta,
    },
  });
}
