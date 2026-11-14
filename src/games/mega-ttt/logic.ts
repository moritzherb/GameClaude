/**
 * Mega Tic Tac Toe: nine small boards in a big one. Where you play in a small board sends the
 * other player to the small board in that same place. Win a small board and it's yours (a big X or
 * O); full without a winner, it's nobody's. Sent to a board that's decided: play anywhere still
 * open. Three small boards in a row win the game.
 */

export type Mark = 'X' | 'O';
export type Owner = Mark | 'draw' | null;

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export interface Game {
  /** cells[board][cell], both 0–8, row by row. */
  cells: (Mark | null)[][];
  /** Who has each small board. */
  boards: Owner[];
  /** The winning line of each small board that was won. */
  lines: (number[] | null)[];
  /** Where the next mark must go (null: any open board). */
  next: number | null;
  turn: Mark;
  /** 'draw': every board decided and no three in a row. */
  winner: Mark | 'draw' | null;
  /** The big winning line (boards). */
  line: number[] | null;
  last: { board: number; cell: number } | null;
  moves: number;
}

export function newGame(first: Mark = 'X'): Game {
  return {
    cells: Array.from({ length: 9 }, () => Array<Mark | null>(9).fill(null)),
    boards: Array<Owner>(9).fill(null),
    lines: Array<number[] | null>(9).fill(null),
    next: null,
    turn: first,
    winner: null,
    line: null,
    last: null,
    moves: 0,
  };
}

/** Three of one mark in a row: that line. */
export function lineOf(marks: (Owner | Mark | null)[], mark: Mark): number[] | null {
  for (const l of LINES) if (l.every((i) => marks[i] === mark)) return [...l];
  return null;
}

/** May the player whose turn it is put a mark here? */
export function canPlay(g: Game, board: number, cell: number) {
  return !g.winner && g.boards[board] == null && g.cells[board][cell] == null && (g.next == null || g.next === board);
}

/** The boards a mark may go in right now. */
export const playable = (g: Game) => (g.winner ? [] : g.next != null ? [g.next] : g.boards.flatMap((o, i) => (o == null ? [i] : [])));

export const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');

/** A mark goes down: the small board may be won or full, the big one may be won. */
export function play(g: Game, board: number, cell: number): Game {
  if (!canPlay(g, board, cell)) return g;
  const mark = g.turn;
  const cells = g.cells.map((b, i) => (i === board ? b.map((c, j) => (j === cell ? mark : c)) : b));
  const boards = [...g.boards];
  const lines = [...g.lines];
  const won = lineOf(cells[board], mark);
  if (won) {
    boards[board] = mark;
    lines[board] = won;
  } else if (cells[board].every((c) => c != null)) boards[board] = 'draw';
  const line = lineOf(boards, mark);
  const done = boards.every((o) => o != null);
  return {
    cells,
    boards,
    lines,
    // Sent to the board in the place just played; decided already: anywhere.
    next: boards[cell] == null ? cell : null,
    turn: other(mark),
    winner: line ? mark : done ? 'draw' : null,
    line,
    last: { board, cell },
    moves: g.moves + 1,
  };
}
