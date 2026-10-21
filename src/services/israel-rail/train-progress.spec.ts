import { estimateTrainProgress } from './train-progress';
import type { TrainLine, TrainLivePosition } from './types';

const station = (id: number) => ({ id, nameEn: `S${id}`, nameHe: `S${id}` });

function buildLine(times: readonly string[], position: TrainLivePosition | null = null, date = '2025-01-01'): TrainLine {
  return {
    trainNumber: 123,
    date,
    stops: times.map((time, index) => ({ station: station(index + 1), time, platform: 1 })),
    boardingStationId: 1,
    alightingStationId: times.length,
    position,
  };
}

// Israel is UTC+2 on 2025-01-01
const at = (time: string, date = '2025-01-01') => new Date(`${date}T${time}:00+02:00`);

describe('estimateTrainProgress()', () => {
  const times = ['08:00', '08:10', '08:30'];

  test.each([
    { now: '07:50', expected: { status: 'not_started', position: 0, delayMinutes: 0, isLive: false } },
    { now: '08:05', expected: { status: 'running', position: 0.5, delayMinutes: 0, isLive: false } },
    { now: '08:20', expected: { status: 'running', position: 1.5, delayMinutes: 0, isLive: false } },
    { now: '08:40', expected: { status: 'finished', position: 2, delayMinutes: 0, isLive: false } },
  ])('should interpolate from the timetable at $now without a live position', ({ now, expected }) => {
    expect(estimateTrainProgress(buildLine(times), at(now))).toEqual(expected);
  });

  test('should place a standing train at its last station', () => {
    const line = buildLine(times, { lastStationId: 2, nextStationId: null, delayMinutes: 3 });
    expect(estimateTrainProgress(line, at('08:12'))).toEqual({ status: 'running', position: 1, delayMinutes: 3, isLive: true });
  });

  test('should interpolate between the live stations shifted by the delay', () => {
    const line = buildLine(times, { lastStationId: 2, nextStationId: 3, delayMinutes: 5 });
    // Delayed departure 08:15, delayed arrival 08:35 -> a quarter of the way at 08:20
    expect(estimateTrainProgress(line, at('08:20'))).toEqual({ status: 'running', position: 1.25, delayMinutes: 5, isLive: true });
  });

  test('should never draw a moving train on top of the next station', () => {
    const line = buildLine(times, { lastStationId: 2, nextStationId: 3, delayMinutes: 0 });
    expect(estimateTrainProgress(line, at('08:45'))).toEqual({ status: 'running', position: 1.9, delayMinutes: 0, isLive: true });
  });

  test('should mark the train finished when its last station is the final stop', () => {
    const line = buildLine(times, { lastStationId: 3, nextStationId: null, delayMinutes: 2 });
    expect(estimateTrainProgress(line, at('08:31'))).toEqual({ status: 'finished', position: 2, delayMinutes: 2, isLive: true });
  });

  test('should handle a line running past midnight', () => {
    const line = buildLine(['23:50', '00:10'], null, '2025-01-01');
    expect(estimateTrainProgress(line, at('00:00', '2025-01-02'))).toEqual({ status: 'running', position: 0.5, delayMinutes: 0, isLive: false });
  });
});
