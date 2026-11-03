import { describe, expect, it } from 'vitest';
import { applyBackup, cleanCode, collectBackup, CloudError, groupCode } from './cloud';

/** localStorage, in memory. */
function memory(init: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(init));
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe('codes', () => {
  it('reads a typed code: capitals, no spaces or dashes', () => {
    expect(cleanCode(' abcd-efgh-jkmn ')).toBe('ABCDEFGHJKMN');
  });
  it('drops letters no code has (0, O, 1, I, L)', () => {
    expect(cleanCode('A0O1IL2')).toBe('A2');
  });
  it('groups a backup code in fours', () => {
    expect(groupCode('ABCDEFGHJKMN')).toBe('ABCD-EFGH-JKMN');
  });
});

describe('backups', () => {
  const phone = { 'prost:players': '[1]', 'prost:settings': '{}', 'prost:cloud-auth': 'token', 'other-app': 'x' };

  it('takes everything of the app, not the sign-in, not other things', () => {
    expect(collectBackup(memory(phone))).toEqual({ 'prost:players': '[1]', 'prost:settings': '{}' });
  });

  it('brings a backup in: replaces the app’s keys, keeps the sign-in and other things', () => {
    const s = memory({ ...phone, 'prost:stats': 'old' });
    applyBackup({ 'prost:players': '[2]', 'prost:boards': '[]' }, s);
    expect(collectBackup(s)).toEqual({ 'prost:players': '[2]', 'prost:boards': '[]' });
    expect(s.getItem('prost:cloud-auth')).toBe('token');
    expect(s.getItem('other-app')).toBe('x');
  });

  it('ignores what isn’t the app’s in a backup (and the sign-in)', () => {
    const s = memory();
    applyBackup({ 'prost:a': '1', evil: 'x', 'prost:cloud-auth': 'stolen', 'prost:n': 5 }, s);
    expect(collectBackup(s)).toEqual({ 'prost:a': '1' });
    expect(s.getItem('evil')).toBeNull();
    expect(s.getItem('prost:cloud-auth')).toBeNull();
  });

  it('refuses something that is no backup, and changes nothing then', () => {
    const s = memory(phone);
    for (const bad of [null, [], 'x', {}, { evil: 'x' }]) {
      expect(() => applyBackup(bad, s)).toThrow(CloudError);
    }
    expect(collectBackup(s)).toEqual({ 'prost:players': '[1]', 'prost:settings': '{}' });
  });
});
