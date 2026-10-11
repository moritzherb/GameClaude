import { describe, expect, it } from 'vitest';
import { bank, loserSips, newGame, nextPlayer, play, rollPose, score, throwPigs, POSE_ODDS } from './logic';

describe('schweinerei', () => {
  it('scores two pigs', () => {
    expect(score('side', 'side')).toMatchObject({ kind: 'score', points: 1 });
    expect(score('side-dot', 'side-dot')).toMatchObject({ kind: 'score', points: 1 });
    expect(score('side', 'side-dot').kind).toBe('pig-out');
    expect(score('side', 'back')).toMatchObject({ points: 5, double: false });
    expect(score('snout', 'side-dot')).toMatchObject({ points: 10 });
    expect(score('jowl', 'side')).toMatchObject({ points: 15 });
    expect(score('back', 'back')).toMatchObject({ points: 20, double: true, gives: 2 });
    expect(score('standing', 'standing')).toMatchObject({ points: 20, double: true });
    expect(score('snout', 'snout')).toMatchObject({ points: 40, gives: 4 });
    expect(score('jowl', 'jowl')).toMatchObject({ points: 60, gives: 6 });
    expect(score('back', 'snout')).toMatchObject({ points: 15, double: false });
  });

  it('lands each way about as often as real pigs', () => {
    let i = 0;
    const counts: Record<string, number> = {};
    const N = 60000;
    for (; i < N; i++) {
      const p = rollPose();
      counts[p] = (counts[p] ?? 0) + 1;
    }
    for (const [pose, p] of POSE_ODDS) expect(Math.abs(counts[pose] / N - p)).toBeLessThan(0.01);
  });

  it('the pigs touch in about 1 throw in 100', () => {
    const N = 100000;
    let touch = 0;
    for (let i = 0; i < N; i++) if (throwPigs().kind === 'touch') touch++;
    expect(Math.abs(touch / N - 0.01)).toBeLessThan(0.002);
  });

  it('touching and piggyback are rare', () => {
    expect(throwPigs(() => 0.001).kind).toBe('piggyback');
    expect(throwPigs(() => 0.005).kind).toBe('touch');
  });

  it('a turn: throw, add up, bank or lose it', () => {
    let g = newGame(3, 0);
    g = play(g, score('side', 'back'));
    g = play(g, score('snout', 'side'));
    expect(g.turnPts).toBe(15);
    g = bank(g);
    expect(g.scores).toEqual([15, 0, 0]);
    expect(g.turn).toBe(1);
    g = play(g, score('back', 'side'));
    g = play(g, score('side', 'side-dot'));
    expect(g.ended).toBe(true);
    expect(g.turnPts).toBe(0);
    expect(bank(g)).toBe(g);
    g = nextPlayer(g);
    expect(g.turn).toBe(2);
    expect(g.scores).toEqual([15, 0, 0]);
  });

  it('touching pigs lose everything', () => {
    let g = { ...newGame(2, 0), scores: [80, 10] };
    g = play(g, { kind: 'touch' });
    expect(g.scores).toEqual([0, 10]);
    expect(g.ended).toBe(true);
  });

  it('first to 100 wins at once; the others drink what they are short', () => {
    let g = { ...newGame(2, 1), scores: [30, 90] };
    g = play(g, score('snout', 'side'));
    expect(g.winner).toBe(1);
    expect(g.scores[1]).toBe(100);
    expect(loserSips(30)).toBe(7);
    expect(loserSips(95)).toBe(1);
  });
});
