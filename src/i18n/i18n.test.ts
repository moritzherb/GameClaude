import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translate } from '.';
import de from './de';

/** Every t('…') / tx('…') literal in the source, with the file it came from. */
function literals(dir: string, found: { text: string; file: string }[] = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'i18n') literals(path, found);
      continue;
    }
    if (!/\.tsx?$/.test(name) || name.endsWith('.test.ts')) continue;
    const src = readFileSync(path, 'utf8');
    const re = /\btx?\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;
    for (const m of src.matchAll(re)) {
      const raw = m[1] ?? m[2];
      found.push({ text: raw.replace(/\\(['"\\])/g, '$1'), file: path });
    }
  }
  return found;
}

describe('i18n', () => {
  it('replaces placeholders', () => {
    expect(translate('en', 'Next: {name} →', { name: 'Lena' })).toBe('Next: Lena →');
  });

  it('falls back to English', () => {
    expect(translate('de', 'This text has no translation yet')).toBe('This text has no translation yet');
  });

  it('has a German translation for every t()/tx() string', () => {
    const missing = literals(join(__dirname, '..'))
      .filter(({ text }) => !(text in de))
      .map(({ text, file }) => `${file.split('/src/')[1]}: ${text}`);
    expect([...new Set(missing)]).toEqual([]);
  });

  it('keeps the placeholders in every translation', () => {
    const broken = Object.entries(de).filter(([en, gr]) => {
      const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      return names(en) !== names(gr);
    });
    expect(broken).toEqual([]);
  });
});
