/**
 * Tiny i18n: English is the source language and doubles as the lookup key.
 *
 *   t('Deal the cards')                       → "Karten austeilen" in German
 *   t('Next: {name} →', { name })             → placeholders in {braces}
 *   tx('Pick a dealer.')                      → marks text in module-level data (rules, game info)
 *                                               for translation; translate it later with t(text)
 *
 * Every string passed to t()/tx() needs an entry in src/i18n/de/*.ts; i18n.test.ts checks that.
 * Missing entries fall back to English.
 */
import de from './de';

export type Lang = 'en' | 'de';
export type Vars = Record<string, string | number>;

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

let current: Lang = 'en';

/** Called by AppProvider on every render, so t() always follows the setting. */
export function setLang(lang: Lang) {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function getLang(): Lang {
  return current;
}

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = lang === 'de' ? (de[text] ?? text) : text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Translate into the current language. */
export function t(text: string, vars?: Vars): string {
  return translate(current, text, vars);
}

/** Marks a string for translation without translating it (for module-level data). */
export function tx<T extends string>(text: T): T {
  return text;
}
