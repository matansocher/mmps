import type { TrainTravel } from '@services/israel-rail';
import { selectRailTravels } from './rail-route-image';

const travel = (departureTime: string) => ({ departureTime }) as TrainTravel;
const trains = [travel('15:10'), travel('15:25'), travel('15:40'), travel('15:55'), travel('16:10')];

describe('selectRailTravels()', () => {
  test.each([
    { description: 'no rail result', toolResults: [{ toolName: 'weather', data: {} }], reply: '15:10', expected: [] },
    { description: 'rail error result', toolResults: [{ toolName: 'israel_rail', data: { error: 'Unknown station' } }], reply: '15:10', expected: [] },
    { description: 'mentioned travels only', toolResults: [{ toolName: 'israel_rail', data: { trains } }], reply: '15:25 → 15:50, 15:55 → 16:20', expected: ['15:25', '15:55'] },
    { description: 'first travels as fallback, capped', toolResults: [{ toolName: 'israel_rail', data: { trains } }], reply: 'הנה הרכבות', expected: ['15:10', '15:25', '15:40'] },
  ])('should handle $description', ({ toolResults, reply, expected }) => {
    expect(selectRailTravels(toolResults, reply).map((t) => t.departureTime)).toEqual(expected);
  });

  test('should use the latest rail result in the turn', () => {
    const toolResults = [
      { toolName: 'israel_rail', data: { trains: [travel('08:00')] } },
      { toolName: 'israel_rail', data: { trains: [travel('09:00')] } },
    ];
    expect(selectRailTravels(toolResults, '09:00').map((t) => t.departureTime)).toEqual(['09:00']);
  });
});
