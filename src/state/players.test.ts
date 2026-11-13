import { describe, expect, it } from 'vitest';
import { refreshed, type Player } from './AppState';

describe('crew refresh', () => {
  const laura: Player = { id: 'a', name: 'laura', avatar: '👑', color: '#ff5a4e', personId: 'p1' };
  const tim: Player = { id: 'b', name: 'Tim', avatar: '🐻', color: '#6b95ff' };

  it('gives someone with a profile the photo they have put up since', () => {
    const list = refreshed([laura, tim], [{ personId: 'p1', name: 'Laura', avatar: '👑', color: '#ff5a4e', photo: 'data:image/jpeg;base64,xx' }]);
    expect(list[0].photo).toBe('data:image/jpeg;base64,xx');
    // Their name in the crew stays as it is; nobody else changes.
    expect(list[0].name).toBe('laura');
    expect(list[1]).toBe(tim);
  });

  it('leaves the list as it is when nothing changed', () => {
    const list = [laura, tim];
    expect(refreshed(list, [{ personId: 'p1', name: 'laura', avatar: '👑', color: '#ff5a4e' }])).toBe(list);
  });
});
