import { describe, expect, it } from 'vitest';
import { translate } from '.';
import de from './de';
import { STORE } from './store';

/*
 * What the store app must never say (i18n/store.ts explains why). Every text in the app, in both
 * languages, run through the store wording: none of it may be left. A new card or rule that says
 * "down it" or "shot" fails here until store.ts has its store version.
 */
const BANNED = {
  en: /\bshots?\b|^ex!?$|\bdown (it|in one|the whole|your drink|a shot|\{n\} shots)|\bin one(!|\.|$)|empty your glass|finish your drink|drinks? up\b|whole (glass|cup)|waterfall|mystery shot|f\*ck|fuck|asshole|pants down|snus|tschick|cigar|tobacco|smack|\bbum\b|pour (some|a splash)|king’s cup|tipsy ×2/i,
  de: /shot|(^|\s)ex(!|\s|$)|geext|auf ex|glas leer|leer trinken|austrink|trink aus|wasserfall|arschloch|hose runter|snus|tschick|zigarett|klaps|hintern|popo|runter damit|kipp(st)? einen schluck|ganze(n|s)? (glas|becher)|king’s cup|f\*ck|beschwipst ×2/i,
};

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('store app wording', () => {
  it('only replaces texts the app really has', () => {
    expect(Object.keys(STORE).filter((k) => !(k in de))).toEqual([]);
  });

  it('keeps the placeholders in both languages', () => {
    const broken = Object.entries(STORE).filter(([key, v]) => placeholders(v.en) !== placeholders(key) || placeholders(v.de) !== placeholders(key));
    expect(broken.map(([k]) => k)).toEqual([]);
  });

  for (const lang of ['en', 'de'] as const) {
    it(`leaves nothing banned in ${lang === 'en' ? 'English' : 'German'}`, () => {
      const left = Object.keys(de)
        .map((key) => translate(lang, key, undefined, true))
        .filter((text) => BANNED[lang].test(text));
      expect(left).toEqual([]);
    });
  }

  it('changes nothing on the website', () => {
    expect(translate('en', 'Ex!', undefined, false)).toBe('Ex!');
    expect(translate('de', 'Asshole', undefined, false)).toBe('Arschloch');
    expect(translate('de', 'Asshole', undefined, true)).toBe('Bettler');
  });
});
