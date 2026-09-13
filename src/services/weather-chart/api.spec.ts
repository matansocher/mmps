import fs from 'fs';
import { generateWeatherChartImage } from './api';

describe('generateWeatherChartImage()', () => {
  const created: string[] = [];

  afterEach(() => {
    created.splice(0).forEach((filePath) => fs.existsSync(filePath) && fs.rmSync(filePath));
  });

  it('should write a non-empty PNG file and return its path', async () => {
    const points = [
      { hour: 8, temperature: 21 },
      { hour: 12, temperature: 27 },
      { hour: 16, temperature: 29 },
      { hour: 20, temperature: 24 },
      { hour: 23, temperature: 22 },
    ];

    const outputPath = await generateWeatherChartImage({ points });
    created.push(outputPath);

    expect(outputPath.endsWith('.png')).toBe(true);
    const buffer = fs.readFileSync(outputPath);
    expect(buffer.length).toBeGreaterThan(0);
    // PNG magic number.
    expect(buffer.subarray(0, 4).toString('hex')).toBe('89504e47');
  });

  it('should throw when given no data points', async () => {
    await expect(generateWeatherChartImage({ points: [] })).rejects.toThrow('without data points');
  });
});
