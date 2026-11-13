import { describe, expect, it } from 'vitest';
import { BOARDS, fromStored, jumps, jumpTarget, layout, toStored, type Board } from './boards';
import { field, FIELDS, KINDS, type Field } from './fields';
import { duel, inTurnOrder, keepsUp, leaders, newGame, nextTurn, reverse, rightOf, rollDie, swapSeats, tossPack, trailers, walk, walkBack } from './logic';

const plain = (n: number): Field[] => Array.from({ length: n }, (_, i) => field(i === 0 ? 'start' : i === n - 1 ? 'goal' : 'safe'));

describe('layout', () => {
  it('snakes: a row across, one field up, the next row back', () => {
    const spots = layout(13, 5);
    expect(spots.slice(0, 7)).toEqual([
      { x: 0, y: 0, link: false },
      { x: 1, y: 0, link: false },
      { x: 2, y: 0, link: false },
      { x: 3, y: 0, link: false },
      { x: 4, y: 0, link: false },
      { x: 4, y: 1, link: true },
      { x: 4, y: 2, link: false },
    ]);
    expect(spots[10]).toEqual({ x: 0, y: 2, link: false });
    expect(spots[11]).toEqual({ x: 0, y: 3, link: true });
    expect(spots[12]).toEqual({ x: 0, y: 4, link: false });
  });
});

describe('boards', () => {
  it('start at the start, end at the finish, and use every kind of field between them (together)', () => {
    for (const b of BOARDS) {
      expect(b.fields[0].kind).toBe('start');
      expect(b.fields[b.fields.length - 1].kind).toBe('goal');
      expect(b.fields.slice(1, -1).every((f) => f.kind !== 'start' && f.kind !== 'goal')).toBe(true);
    }
    const used = new Set(BOARDS.flatMap((b) => b.fields.map((f) => f.kind)));
    expect(KINDS.filter((k) => !used.has(k))).toEqual([]);
  });

  it('have somewhere to go from every bridge back and tunnel', () => {
    for (const b of BOARDS) {
      const to = jumps(b);
      b.fields.forEach((f, i) => {
        if (f.kind === 'back-bridge' || f.kind === 'mole') expect(to[i]).toBeLessThan(i);
        if (f.kind === 'fwd-bridge') expect(to[i]).toBeGreaterThan(i);
      });
    }
  });

  it('cross a bridge back over the water, and follow a tunnel round its corners', () => {
    const board = BOARDS[0];
    // Field 21: across the river from it, field 13.
    expect(jumpTarget(board, 21, 'back-bridge')).toBe(13);
    // And the other way: a bridge ahead goes on over the water to a later field.
    expect(jumpTarget(board, 13, 'fwd-bridge')).toBe(21);
    // Field 28: the tunnel runs down the side to field 16 (passing 17 and 18 on the way).
    expect(jumpTarget(board, 28, 'mole')).toBe(16);
    // No water next to it, no tunnel next to it: nowhere to go.
    expect(jumpTarget(board, 26, 'back-bridge')).toBeNull();
    expect(jumpTarget(board, 26, 'mole')).toBeNull();
    // A tunnel that turns a corner.
    const g = { spots: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }], water: [], tunnels: [{ x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }] };
    expect(jumpTarget(g, 4, 'mole')).toBe(0);
  });

  it('save and load a board of your own, and drop a broken one', () => {
    const own: Board = { ...BOARDS[0], id: 'own', name: 'Mine', custom: true };
    const back = fromStored(JSON.parse(JSON.stringify(toStored(own))));
    expect(back?.spots).toEqual(own.spots);
    expect(back?.fields).toEqual(own.fields);
    expect(back?.water).toEqual(own.water);
    // A gap in the path.
    const broken = toStored(own);
    broken.path.splice(5, 1);
    expect(fromStored(broken)).toBeNull();
    // Saved the old way (only the fields of the board the game came with): still there.
    expect(fromStored({ id: 'old', name: 'Old', base: 'west', fields: BOARDS[0].fields })?.spots).toEqual(BOARDS[0].spots);
  });

  it('give every field a label and a text in English', () => {
    for (const k of Object.keys(FIELDS) as (keyof typeof FIELDS)[]) {
      expect(FIELDS[k].label(2)).toBeTruthy();
      expect(FIELDS[k].text(2, 'Jo')).toBeTruthy();
    }
  });
});

describe('walk', () => {
  it('steps forward field by field', () => {
    expect(walk(plain(20), 3, 4)).toEqual([4, 5, 6, 7]);
  });

  it('only gets into the finish with the exact number, and walks the rest back', () => {
    expect(walk(plain(10), 7, 2)).toEqual([8, 9]);
    expect(walk(plain(10), 7, 5)).toEqual([8, 9, 8, 7, 6]);
  });

  it('stops at a bridge, but leaves it once crossed', () => {
    const fields = plain(20);
    fields[6] = field('bridge', 0);
    expect(walk(fields, 3, 6)).toEqual([4, 5, 6]);
    expect(walk(fields, 6, 3)).toEqual([7, 8, 9]);
  });

  it('goes back no further than the start', () => {
    expect(walkBack(5, 3)).toEqual([4, 3, 2]);
    expect(walkBack(2, 6)).toEqual([1, 0]);
  });
});

describe('turns', () => {
  const g = newGame(plain(20), ['a', 'b', 'c', 'd']);

  it('go round, and the other way after a Reverse', () => {
    expect(nextTurn(g).turn).toBe(1);
    expect(nextTurn(reverse(g)).turn).toBe(3);
    expect(inTurnOrder(g, 'c')).toEqual(['c', 'd', 'a', 'b']);
    expect(inTurnOrder(reverse(g), 'c')).toEqual(['c', 'b', 'a', 'd']);
  });

  it('end the silence when its caller is on again', () => {
    let s: typeof g = { ...g, silence: 'a' };
    s = nextTurn(nextTurn(nextTurn(s)));
    expect(s.silence).toBe('a');
    expect(nextTurn(s).silence).toBeNull();
  });

  it('swap seats with the player on the right, and go on from the new seat', () => {
    expect(rightOf(g, 'a')).toBe('b');
    expect(rightOf(g, 'd')).toBe('a');
    const s = swapSeats(g, 'a');
    expect(s.order).toEqual(['b', 'a', 'c', 'd']);
    expect(s.order[nextTurn(s).turn]).toBe('c');
  });

  it('know who is in front and who is at the back', () => {
    const s = { ...g, pawns: { ...g.pawns, a: { ...g.pawns.a, pos: 5 }, b: { ...g.pawns.b, pos: 5 }, c: { ...g.pawns.c, pos: 2 } } };
    expect(leaders(s)).toEqual(['a', 'b']);
    expect(trailers(s)).toEqual(['d']);
  });
});

describe('little games', () => {
  it('Tschick flip: flat 35 %, on its side 50 %, upright 15 %', () => {
    expect(tossPack(() => 0)).toBe(1);
    expect(tossPack(() => 0.349)).toBe(1);
    expect(tossPack(() => 0.35)).toBe(2);
    expect(tossPack(() => 0.849)).toBe(2);
    expect(tossPack(() => 0.85)).toBe(3);
    expect(tossPack(() => 0.999)).toBe(3);
  });

  it('A die: every number one time in six', () => {
    const n = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) n[rollDie(() => i / 6000)]++;
    expect(n.slice(1)).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });

  it('Tschick flip: as good or better keeps up', () => {
    expect(keepsUp(null, 1)).toBe(true);
    expect(keepsUp(1, 1)).toBe(true);
    expect(keepsUp(2, 3)).toBe(true);
    expect(keepsUp(2, 1)).toBe(false);
  });

  it('Dice duel: the lower drinks both added up, the same rolls again', () => {
    expect(duel(2, 5)).toEqual({ loser: 0, sips: 7 });
    expect(duel(6, 1)).toEqual({ loser: 1, sips: 7 });
    expect(duel(4, 4)).toBeNull();
  });
});
