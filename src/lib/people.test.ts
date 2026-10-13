import { beforeEach, describe, expect, it } from 'vitest';
import { forgetPerson, loadPeople, MAX_PEOPLE, mergePeople, rememberPeople } from './people';
import { crewKey, loadCrewStats, loadStats, recordFinished, summary } from './stats';

// Tests run without a browser: a plain stand-in for localStorage.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  get length() {
    return store.size;
  },
} as Storage;

const lena = { id: 'phone-lena', name: 'Lena', avatar: '🐯', color: '#f80', photo: 'data:image/jpeg;base64,AAAA' };
const jo = { id: 'phone-jo', name: 'Jo', avatar: '🐼', color: '#0af' };
const me = { id: 'phone-me', name: 'Moritz', avatar: '🦁', color: '#a0f' };

describe('people met in rooms', () => {
  beforeEach(() => localStorage.clear());

  it('remembers everyone in a room but this phone, with their photo', () => {
    rememberPeople([me, lena, jo], me.id, 1000);
    const people = loadPeople();
    expect(people.map((p) => p.name).sort()).toEqual(['Jo', 'Lena']);
    expect(people.find((p) => p.id === lena.id)?.photo).toBe(lena.photo);
  });

  it('keeps one entry per phone, as they are now', () => {
    rememberPeople([lena], me.id, 1000);
    rememberPeople([{ ...lena, name: 'Lenchen', photo: undefined }], me.id, 2000);
    const people = loadPeople();
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({ name: 'Lenchen', photo: undefined, seen: 2000 });
  });

  it('keeps the most recently met, up to a limit', () => {
    const many = Array.from({ length: MAX_PEOPLE + 5 }, (_, i) => ({ ...jo, id: `p${i}`, name: `P${i}` }));
    let known = mergePeople([], many.slice(0, 5), me.id, 1);
    known = mergePeople(known, many.slice(5), me.id, 2);
    expect(known).toHaveLength(MAX_PEOPLE);
    expect(known.every((p) => p.seen === 2)).toBe(true);
  });

  it('ignores damaged entries and odd photos', () => {
    localStorage.setItem('prost:people', JSON.stringify([{ id: 'x' }, { ...jo, seen: 5, photo: 'javascript:alert(1)' }, 'nope']));
    expect(loadPeople()).toEqual([{ ...jo, photo: undefined, seen: 5 }]);
  });

  it('can forget someone', () => {
    rememberPeople([lena, jo], me.id, 1000);
    forgetPerson(jo.id);
    expect(loadPeople().map((p) => p.id)).toEqual([lena.id]);
  });
});

describe('the crew’s numbers', () => {
  beforeEach(() => localStorage.clear());

  it('a finished game counts for everyone who played it', () => {
    const crew = [
      { id: 'a', personId: lena.id },
      { id: 'b' },
    ].map(crewKey);
    expect(crew).toEqual([lena.id, 'player:b']);
    recordFinished('kings-cup', 1000, crew);
    recordFinished('bus-driver', 100_000, crew);
    recordFinished('bus-driver', 200_000, [lena.id]);
    const stats = loadCrewStats();
    expect(stats[lena.id].played).toEqual({ 'kings-cup': 1, 'bus-driver': 2 });
    expect(stats['player:b'].played).toEqual({ 'kings-cup': 1, 'bus-driver': 1 });
    expect(summary(stats[lena.id].played)).toEqual({ total: 3, favourite: 'bus-driver' });
    // This phone's own numbers count every game, as before.
    expect(loadStats().played).toEqual({ 'kings-cup': 1, 'bus-driver': 2 });
  });

  it('the same end shown again (a reload) counts once, for the crew too', () => {
    recordFinished('maexchen', 1000, ['player:a']);
    recordFinished('maexchen', 5000, ['player:a']);
    expect(loadCrewStats()['player:a'].played).toEqual({ maexchen: 1 });
  });

  it('survives damaged storage', () => {
    localStorage.setItem('prost:crew-stats', JSON.stringify({ a: null, b: { played: { x: 'lots', y: 2 } } }));
    expect(loadCrewStats()).toEqual({ b: { played: { y: 2 } } });
  });
});
