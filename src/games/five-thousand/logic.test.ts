import { describe, expect, it } from 'vitest';
import { canStop, gainFor, newGame, nextTurn, roll, rollValue, score, setAside, triples, type Face, type Game } from './logic';

/** A "random" source that rolls exactly these faces. */
function dice(...faces: Face[]) {
  const all: Face[] = [9, 10, 11, 12, 13, 14];
  const queue = faces.map((f) => (all.indexOf(f) + 0.5) / all.length);
  return () => queue.shift() ?? 0;
}

/** A game where it's player 0's turn with this score. */
function at(score: number, opened = score > 0): Game {
  const g = newGame(3, 0);
  return { ...g, scores: [score, 0, 0], opened: [opened, false, false] };
}

describe('5000 scoring', () => {
  it('counts Kings and Aces', () => {
    expect(score([13])).toBe(50);
    expect(score([14])).toBe(100);
    expect(score([13, 13, 14])).toBe(200);
  });

  it('counts triples, and Kings or Aces beyond them', () => {
    expect(score([9, 9, 9])).toBe(100);
    expect(score([10, 10, 10])).toBe(200);
    expect(score([11, 11, 11])).toBe(300);
    expect(score([12, 12, 12])).toBe(400);
    expect(score([13, 13, 13])).toBe(500);
    expect(score([14, 14, 14])).toBe(1000);
    expect(score([9, 9, 9, 13])).toBe(150);
  });

  it('only exactly three of a kind is a triple: four or five are none', () => {
    expect(triples([14, 14, 14, 14, 9])).toEqual([]);
    expect(triples([12, 12, 12, 12, 12])).toEqual([]);
    expect(triples([12, 12, 12, 9, 10])).toEqual([12]);
    // Four Aces: four single Aces, not a triple plus one.
    expect(score([14, 14, 14, 14])).toBe(400);
    expect(score([14, 14, 14], [14, 14, 14, 14, 9])).toBe(300);
    // Four or five Queens score nothing.
    expect(score([12, 12, 12], [12, 12, 12, 12, 9])).toBeNull();
  });

  it('a triple only goes as a whole, also Kings and Aces', () => {
    const roll: Face[] = [13, 13, 13, 9, 10];
    expect(score([13], roll)).toBeNull();
    expect(score([13, 13], roll)).toBeNull();
    expect(score([13, 13, 13], roll)).toBe(500);
  });

  it('rejects dice that don’t score', () => {
    expect(score([9])).toBeNull();
    expect(score([12, 12])).toBeNull();
    expect(score([9, 9, 9, 9])).toBeNull();
    expect(score([13, 10])).toBeNull();
  });

  it('adds up everything a roll brings', () => {
    expect(rollValue([13, 14, 9, 9, 10])).toBe(150);
    expect(rollValue([9, 9, 9, 10, 13])).toBe(150);
    expect(rollValue([14, 14, 14, 14, 13])).toBe(450);
    expect(rollValue([9, 10, 11, 12, 12])).toBe(0);
  });
});

describe('5000 turns', () => {
  it('the example turn: keep the Ace, reroll four, all five score, roll all five again, bust', () => {
    let g = roll(at(1000), dice(13, 13, 14, 9, 9));
    expect(g.phase).toBe('choose');
    expect(gainFor(g, [0, 1, 2])).toBe(200);
    // Only the Ace aside, the Kings go back in the cup.
    g = setAside(g, [2], 'roll', dice(14, 14, 14, 13));
    expect(g.turn.points).toBe(100);
    expect(g.turn.roll).toEqual([14, 14, 14, 13]);
    // All four score: everything is set aside and all five go back in the cup.
    g = setAside(g, [0, 1, 2, 3], 'roll', dice(9, 10, 11, 12, 9));
    expect(g.phase).toBe('over');
    expect(g.end).toEqual({ kind: 'nothing', lost: 1150, penalty: 0 });
    expect(g.scores[0]).toBe(1000);
  });

  it('rolls all five again once every die has scored', () => {
    let g = roll(at(1000), dice(13, 13, 14, 9, 9));
    // The two 9s on the table don't make a triple with a 9 from the next roll.
    g = setAside(g, [0, 1, 2], 'roll', dice(9, 10));
    expect(g.phase).toBe('over');
    g = roll(at(1000), dice(14, 14, 13, 13, 13));
    g = setAside(g, [0, 1, 2, 3, 4], 'roll', dice(14, 10, 10, 11, 12));
    expect(g.turn.rolls).toBe(2);
    expect(g.turn.roll).toHaveLength(5);
    expect(g.turn.points).toBe(700);
  });

  it('a first roll without points costs 300 once you’re in', () => {
    const g = roll(at(1200), dice(9, 10, 11, 12, 9));
    expect(g.end).toEqual({ kind: 'nothing', lost: 0, penalty: 300 });
    expect(g.scores[0]).toBe(900);
  });

  it('no penalty before you’re in, and never below 0', () => {
    expect(roll(at(0, false), dice(9, 10, 11, 12, 9)).scores[0]).toBe(0);
    expect(roll(at(200, true), dice(9, 10, 11, 12, 9)).scores[0]).toBe(0);
  });

  it('a triple on the first roll saves the turn', () => {
    const g = roll(at(1200), dice(10, 10, 10, 9, 11));
    expect(g.phase).toBe('choose');
    expect(gainFor(g, [0, 1, 2])).toBe(200);
    expect(gainFor(g, [0, 1])).toBeNull();
  });

  it('needs 500 in one turn to get in', () => {
    let g = roll(at(0, false), dice(14, 14, 13, 9, 10));
    expect(canStop(g, 250)).toBe(false);
    expect(setAside(g, [0, 1, 2], 'stop')).toBe(g);
    g = setAside(g, [0, 1, 2], 'roll', dice(14, 14));
    // 450 still isn't enough to stop.
    expect(setAside(g, [0, 1], 'stop')).toBe(g);
    g = setAside(g, [0, 1], 'roll', dice(14, 9, 10, 11, 12));
    expect(g.turn.points).toBe(450);
    g = setAside(g, [0], 'stop');
    expect(g.end).toEqual({ kind: 'banked', gained: 550, first: true });
    expect(g.opened[0]).toBe(true);
    expect(g.scores[0]).toBe(550);
  });

  it('banks whatever you have once you’re in', () => {
    let g = roll(at(800), dice(13, 9, 10, 11, 12));
    g = setAside(g, [0], 'stop');
    expect(g.scores[0]).toBe(850);
  });

  it('close to 5000 the whole roll has to fit, or the turn is over without points', () => {
    // 4900 with an Ace and a King: 150 is more than the 100 needed. You can't take just the Ace.
    const ak = roll(at(4900), dice(14, 13, 9, 10, 11));
    expect(ak.end).toEqual({ kind: 'too-much', lost: 0, value: 150, need: 100 });
    expect(ak.scores[0]).toBe(4900);
    // A triple of Kings on 4600: 500 is too much, and it can't be split.
    const kings = roll(at(4600), dice(13, 13, 13, 9, 10));
    expect(kings.end).toMatchObject({ kind: 'too-much', lost: 0 });
    // Points collected this turn are gone too.
    let g = roll(at(4500), dice(14, 9, 10, 11, 12));
    g = setAside(g, [0], 'roll', dice(14, 14, 14, 13));
    expect(g.end).toMatchObject({ kind: 'too-much', lost: 100 });
    expect(g.scores[0]).toBe(4500);
  });

  it('exactly enough wins by itself, without picking anything', () => {
    // 4900 and one Ace: won.
    let g = roll(at(4900), dice(14, 9, 10, 11, 12));
    expect(g.end).toEqual({ kind: 'won' });
    expect(g.scores[0]).toBe(5000);
    expect(nextTurn(g)).toBe(g);
    // 4900 and two Kings: won as well.
    g = roll(at(4900), dice(13, 13, 9, 10, 11));
    expect(g.end).toEqual({ kind: 'won' });
    // With points from earlier rolls this turn.
    g = roll(at(4800), dice(14, 9, 10, 11, 12));
    g = setAside(g, [0], 'roll', dice(13, 13, 9, 10));
    expect(g.end).toEqual({ kind: 'won' });
    expect(g.scores[0]).toBe(5000);
  });

  it('less than needed: pick as usual', () => {
    const g = roll(at(4700), dice(14, 13, 9, 10, 11));
    expect(g.phase).toBe('choose');
    expect(gainFor(g, [0])).toBe(100);
  });

  it('passes the cup to the left', () => {
    let g = roll(at(800), dice(13, 9, 10, 11, 12));
    g = nextTurn(setAside(g, [0], 'stop'));
    expect(g.current).toBe(1);
    expect(g.phase).toBe('roll');
    expect(g.turn.cup).toBe(5);
    g = nextTurn(roll(g, dice(9, 10, 11, 12, 9)));
    g = nextTurn(roll(g, dice(9, 10, 11, 12, 9)));
    expect(g.current).toBe(0);
  });
});
