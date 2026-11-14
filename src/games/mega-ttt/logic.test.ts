import { describe, expect, it } from 'vitest';
import { canPlay, newGame, play, playable, type Game } from './logic';

const moves = (g: Game, list: [number, number][]) => list.reduce((x, [b, c]) => play(x, b, c), g);

describe('mega tic tac toe', () => {
  it('starts anywhere, then sends the other player to the board in the same place', () => {
    let g = newGame();
    expect(playable(g)).toHaveLength(9);
    g = play(g, 4, 2);
    expect(g.turn).toBe('O');
    expect(g.next).toBe(2);
    expect(canPlay(g, 0, 0)).toBe(false);
    expect(canPlay(g, 2, 0)).toBe(true);
    // An illegal move changes nothing.
    expect(play(g, 0, 0)).toBe(g);
  });

  it('wins a small board, and sends anywhere when sent to a decided one', () => {
    // X takes board 0 with cells 0, 1, 2; O plays elsewhere in between.
    const g = moves(newGame(), [
      [0, 0], // X → O to 0
      [0, 3], // O → X to 3
      [3, 0], // X → O to 0
      [0, 4], // O → X to 4
      [4, 0], // X → O to 0
      [0, 5], // O wins board 0 (3, 4, 5) → X to 5
    ]);
    expect(g.boards[0]).toBe('O');
    expect(g.lines[0]).toEqual([3, 4, 5]);
    expect(g.next).toBe(5);
    // X plays in board 5 at cell 0: O is sent to board 0, which is decided: anywhere.
    const h = play(g, 5, 0);
    expect(h.next).toBeNull();
    expect(playable(h)).not.toContain(0);
    expect(canPlay(h, 0, 8)).toBe(false);
  });

  it('a full board without a line is nobody’s', () => {
    // Board 4 as X O X / X O O / O X _: the last mark fills it without a line.
    const g = newGame();
    const cells = g.cells.map((b) => [...b]);
    cells[4] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null];
    const h = play({ ...g, cells, next: 4 }, 4, 8);
    expect(h.boards[4]).toBe('draw');
  });

  it('three boards in a row win the game', () => {
    const g = newGame();
    const h = play({ ...g, boards: ['X', 'X', null, null, null, null, null, null, null], cells: g.cells.map((b, i) => (i === 2 ? ['X', 'X', null, null, null, null, null, null, null] : b)) }, 2, 2);
    expect(h.boards[2]).toBe('X');
    expect(h.winner).toBe('X');
    expect(h.line).toEqual([0, 1, 2]);
    expect(playable(h)).toEqual([]);
  });

  it('every board decided and no line: a draw', () => {
    const g = newGame();
    const boards = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null] as Game['boards'];
    const cells = g.cells.map((b, i) => (i === 8 ? (['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null] as Game['cells'][number]) : b));
    const h = play({ ...g, boards, cells, next: 8 }, 8, 8);
    expect(h.boards[8]).toBe('draw');
    expect(h.winner).toBe('draw');
  });
});
