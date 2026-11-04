import { describe, expect, it } from 'vitest';
import { parseColor, tone } from './themeColor';

describe('the strip under the clock', () => {
  it('reads the colours the browser gives back', () => {
    expect(parseColor('#20211c')).toEqual([32, 33, 28, 1]);
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColor('rgba(0, 0, 0, 0.45)')).toEqual([0, 0, 0, 0.45]);
    expect(parseColor('rgb(10 10 8 / 0.6)')).toEqual([10, 10, 8, 0.6]);
    expect(parseColor('color(srgb 1 0.5 0 / 0.96)')).toEqual([255, 127.5, 0, 0.96]);
    expect(parseColor('oklab(0.5 0 0)')).toBeNull();
  });

  it('tones a colour in OKLCH: the same colour unchanged, darker when asked', () => {
    expect(tone('#ff8a3d', 1, 1)).toBe('#ff8a3d');
    expect(tone('#6cb6ff', 1, 1)).toBe('#6cb6ff');
    const dark = parseColor(tone('#ff8a3d', 0.8))!;
    expect(dark[0]).toBeLessThan(255);
    expect(dark[1]).toBeLessThan(0x8a);
  });
});
