import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_STORES } from './saved';

/** Every file under a folder. */
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

describe('ending a room game', () => {
  it('forgets the saved copy of every game that shares its state (so a new one starts fresh)', () => {
    const keys = new Set<string>();
    for (const f of files('src/games').filter((f) => f.endsWith('.tsx'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/useShared<\w+>\('([\w-]+)'/g)) keys.add(`${m[1]}:shared`);
    }
    expect(keys.size).toBeGreaterThan(0);
    for (const k of keys) expect(GAME_STORES).toContain(k);
  });
});
