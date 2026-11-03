import { describe, expect, it } from 'vitest';
import { detectPlatform, platformFor } from './platform';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

describe('platform', () => {
  it('takes what the store app says over the user agent', () => {
    expect(detectPlatform({ platform: 'android', version: '1.0.0', storeSafe: true }, IPHONE)).toBe('android');
    expect(detectPlatform({ platform: 'ios', version: '1.0.0', storeSafe: true }, ANDROID)).toBe('ios');
  });

  it('reads the browser: Android phones get Android, everything else the iPhone look', () => {
    expect(detectPlatform(null, ANDROID)).toBe('android');
    expect(detectPlatform(null, IPHONE)).toBe('ios');
    expect(detectPlatform(null, DESKTOP)).toBe('ios');
  });

  it('follows the setting, or the phone on "auto"', () => {
    expect(platformFor('android', 'ios')).toBe('android');
    expect(platformFor('ios', 'android')).toBe('ios');
    expect(platformFor('auto', 'android')).toBe('android');
    expect(platformFor(undefined, 'ios')).toBe('ios');
  });
});
