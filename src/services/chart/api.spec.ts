import fs from 'fs';
import { generateLineChartImage } from './api';

describe('generateLineChartImage()', () => {
  const created: string[] = [];

  afterEach(() => {
    created.splice(0).forEach((filePath) => fs.existsSync(filePath) && fs.rmSync(filePath));
  });

  it('should write a non-empty PNG file and return its path', async () => {
    const points = [
      { x: 0, y: 1.2, label: 'Aug 4' },
      { x: 1, y: 2.4, label: 'Aug 11' },
      { x: 2, y: 0.9, label: 'Aug 18' },
      { x: 3, y: 3.1, label: 'Aug 25' },
    ];

    const outputPath = await generateLineChartImage({ title: 'Weekly spend', points, yAxisFormatter: (value) => `$${value.toFixed(0)}` });
    created.push(outputPath);

    expect(outputPath.endsWith('.png')).toBe(true);
    const buffer = fs.readFileSync(outputPath);
    expect(buffer.length).toBeGreaterThan(0);
    // PNG magic number.
    expect(buffer.subarray(0, 4).toString('hex')).toBe('89504e47');
  });

  it('should throw when given no data points', async () => {
    await expect(generateLineChartImage({ title: 'Empty', points: [] })).rejects.toThrow('without data points');
  });
});
