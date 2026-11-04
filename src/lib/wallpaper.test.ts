import { describe, expect, it } from 'vitest';
import { averageColor, wallpaperFor, WALLPAPERS } from './wallpaper';

describe('wallpaper', () => {
  it('averages a strip of pixels, darkened as it is shown', () => {
    const px = new Uint8ClampedArray([200, 100, 0, 255, 100, 0, 200, 255]);
    expect(averageColor(px)).toBe('#963264');
    expect(averageColor(px, 0.5)).toBe('#4b1932');
  });

  it('shows the photo only when there is one, else the ground', () => {
    const photo = { data: 'data:image/jpeg;base64,xx', top: '#101010' };
    expect(wallpaperFor('photo', photo)).toMatchObject({ top: '#101010', photo: true });
    expect(wallpaperFor('photo', null)).toEqual({ background: undefined, top: undefined, photo: false });
    expect(wallpaperFor(undefined, photo).photo).toBe(false);
  });

  it('gives every made wallpaper but the ground its top colour', () => {
    for (const w of WALLPAPERS.slice(1)) expect(w.top).toMatch(/^#[0-9a-f]{6}$/);
    expect(WALLPAPERS[0].background).toBeUndefined();
  });
});
