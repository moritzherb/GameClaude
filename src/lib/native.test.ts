import { afterEach, describe, expect, it, vi } from 'vitest';

/** Load the modules fresh, as the page would inside the store app (or not). */
async function load(inApp: boolean) {
  vi.resetModules();
  const classes = new Set<string>();
  const listen = { addEventListener: () => {}, removeEventListener: () => {} };
  vi.stubGlobal('window', {
    __PROST_NATIVE__: inApp ? { platform: 'ios', version: '1.0.0', storeSafe: true } : undefined,
    location: { hash: '#/' },
    ...listen,
  });
  vi.stubGlobal('document', { documentElement: { classList: { add: (...c: string[]) => c.forEach((x) => classes.add(x)) } }, ...listen });
  const native = await import('./native');
  const { FIELDS } = await import('../games/party/fields');
  return { native, FIELDS, classes };
}

afterEach(() => vi.unstubAllGlobals());

describe('store app', () => {
  it('knows it is in the app and marks the page', async () => {
    const { native, classes } = await load(true);
    expect(native.isNative).toBe(true);
    expect(native.storeSafe).toBe(true);
    expect([...classes]).toEqual(['native', 'native-ios']);
  });

  it('shows no tobacco on Party fields in the app', async () => {
    const { FIELDS } = await load(true);
    const all = Object.values(FIELDS).flatMap((f) => [f.icon, f.label(0), f.label(1), f.title(0), f.text(0, 'Lena')]).join(' ');
    expect(all).not.toMatch(/\bsmoke\b|snus|tschick|cigar|tobacco/i);
    expect(FIELDS.tschick.label(0)).toBe('Box flip');
    expect(FIELDS.snus.label(0)).toBe('Tin flip');
  });

  it('shows no swearing, pants or shots in the icons', async () => {
    const { FIELDS } = await load(true);
    const { GAMES } = await import('../games/registry');
    const icons = [...GAMES.map((g) => g.emoji), ...Object.values(FIELDS).map((f) => f.icon)].join(' ');
    expect(icons).not.toMatch(/🚬|🥃|🍑|👖|🤬|💩|\bsmoke\b|\bshot\b/u);
    // Loads every game: give it time on a busy machine.
  }, 30_000);

  it('keeps the website as it is', async () => {
    const { native, FIELDS } = await load(false);
    expect(native.isNative).toBe(false);
    expect(FIELDS.tschick.icon).toBe('smoke');
    expect(FIELDS.snus.label(0)).toBe('Snus flip');
  });
});
