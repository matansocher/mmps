import { buildToolImages } from './registry';
import type { ToolImageBuilder } from './types';

const image = Buffer.from('png');

const builder = (toolName: string, build: ToolImageBuilder['build']): ToolImageBuilder => ({ toolName, fileName: `${toolName}.png`, build });

describe('buildToolImages()', () => {
  test('should pass only matching, successful results to each builder', async () => {
    const build = vi.fn(() => image);
    const toolResults = [
      { toolName: 'weather', data: { a: 1 } },
      { toolName: 'weather', data: null, error: 'boom' },
      { toolName: 'football', data: { b: 2 } },
    ];
    const images = await buildToolImages(toolResults, 'reply', [builder('weather', build)]);
    expect(build).toHaveBeenCalledWith([{ toolName: 'weather', data: { a: 1 } }], 'reply');
    expect(images).toEqual([{ fileName: 'weather.png', image }]);
  });

  test('should skip builders whose tool was not called', async () => {
    const build = vi.fn(() => image);
    expect(await buildToolImages([{ toolName: 'football', data: {} }], 'reply', [builder('weather', build)])).toEqual([]);
    expect(build).not.toHaveBeenCalled();
  });

  test('should keep other images when a builder throws or returns null', async () => {
    const builders = [
      builder('a', () => {
        throw new Error('render failed');
      }),
      builder('b', async () => null),
      builder('c', async () => image),
    ];
    const toolResults = ['a', 'b', 'c'].map((toolName) => ({ toolName, data: {} }));
    expect(await buildToolImages(toolResults, 'reply', builders)).toEqual([{ fileName: 'c.png', image }]);
  });
});
