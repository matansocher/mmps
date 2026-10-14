import { parseRadarStatus, selectRadarFrames } from './frames';
import type { ImsRadarItem, ImsRadarResponse } from './types';

function imsItem(time: string, status = 0): ImsRadarItem {
  const stamp = time.replace(/[-: ]/g, '').slice(0, 12);
  return { id: stamp, forecast_time: time, modified: '', created: '', type: 'IMSRadar4GIS', file_name: `/sites/default/files/ims_data/map_images/IMSRadar4GIS/IMSRadar4GIS_${stamp}_${status}.png` };
}

function compositeItem(time: string): ImsRadarItem {
  const stamp = time.replace(/[-: ]/g, '').slice(0, 12);
  return { id: stamp, forecast_time: time, modified: '', created: '', type: 'radarComposite', file_name: `/sites/default/files/ims_data/map_images/radarComposite/radarComposite_${stamp}.gif` };
}

function response(IMSRadar: ImsRadarItem[], radar: ImsRadarItem[] = []): ImsRadarResponse {
  return { data: { types: { IMSRadar, radar } } };
}

function minutesSeries(count: number, stepMinutes: number, build: (time: string) => ImsRadarItem): ImsRadarItem[] {
  return Array.from({ length: count }, (_, i) => {
    const total = 13 * 60 + i * stepMinutes;
    const time = `2026-03-26 ${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
    return build(time);
  });
}

describe('parseRadarStatus()', () => {
  test.each([
    { fileName: 'IMSRadar4GIS_202609261515_0.png', expected: 0 },
    { fileName: 'IMSRadar4GIS_202609261515_1.png', expected: 1 },
    { fileName: 'IMSRadar4GIS_202609261515_3.png', expected: 3 },
    { fileName: 'radarComposite_202609261510.gif', expected: 0 },
  ])('should return $expected for $fileName', ({ fileName, expected }) => {
    expect(parseRadarStatus(fileName)).toEqual(expected);
  });
});

describe('selectRadarFrames()', () => {
  it('should return the last hour of IMS radar frames in chronological order', () => {
    const items = minutesSeries(22, 5, (time) => imsItem(time)).reverse();

    const { source, frames } = selectRadarFrames(response(items), 60);

    expect(source).toEqual('IMSRadar');
    expect(frames).toHaveLength(13);
    expect(frames[0].time).toEqual('2026-03-26 13:45:00');
    expect(frames.at(-1).time).toEqual('2026-03-26 14:45:00');
    expect(frames.at(-1).url).toEqual('https://ims.gov.il/sites/default/files/ims_data/map_images/IMSRadar4GIS/IMSRadar4GIS_202603261445_0.png');
  });

  it('should keep the IMS radar when it reports no active clouds', () => {
    const items = minutesSeries(3, 5, (time) => imsItem(time, 1));

    const { source, frames } = selectRadarFrames(response(items, minutesSeries(3, 10, compositeItem)), 60);

    expect(source).toEqual('IMSRadar');
    expect(frames.map(({ status }) => status)).toEqual([1, 1, 1]);
  });

  test.each([{ status: 2 }, { status: 3 }])('should fall back to the composite radar when the IMS radar status is $status', ({ status }) => {
    const items = minutesSeries(3, 5, (time) => imsItem(time, status));

    const { source, frames } = selectRadarFrames(response(items, minutesSeries(10, 10, compositeItem)), 60);

    expect(source).toEqual('radar');
    expect(frames).toHaveLength(7);
    expect(frames.every(({ status }) => status === 0)).toEqual(true);
  });

  it('should return only the latest frame for a 0 minutes window', () => {
    const { frames } = selectRadarFrames(response(minutesSeries(5, 5, (time) => imsItem(time))), 0);

    expect(frames).toHaveLength(1);
    expect(frames[0].time).toEqual('2026-03-26 13:20:00');
  });

  it('should throw when there are no frames', () => {
    expect(() => selectRadarFrames(response([], []), 60)).toThrow('No radar frames available from IMS');
  });
});
