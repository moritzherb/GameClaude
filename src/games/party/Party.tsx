import { useState } from 'react';
import { load, save } from '../../lib/storage';
import type { GameProps } from '../types';
import { allBoards, BOARDS, deleteBoard, deleteDraft, drafts as savedDrafts, saveBoard, saveDraft, type Board, type Draft } from './boards';
import Editor from './Editor';
import { pawnById, PAWNS, type PawnDef } from './pawns';
import Play from './Play';
import Setup from './Setup';

/** Everyone's pawn: the one they had last time, else the next free classic one. */
function pawnsFor(ids: string[]): Record<string, PawnDef> {
  const saved = load<Record<string, string>>('party-pawns', {});
  const out: Record<string, PawnDef> = {};
  const used = new Set<string>();
  for (const id of ids) {
    const want = saved[id];
    if (want && PAWNS.some((p) => p.id === want) && !used.has(want)) {
      out[id] = pawnById(want);
      used.add(want);
    }
  }
  for (const id of ids) {
    if (out[id]) continue;
    const free = PAWNS.find((p) => !used.has(p.id)) ?? PAWNS[0];
    out[id] = free;
    used.add(free.id);
  }
  return out;
}

/** Party: a board game. Pick a board and pawns, roll, move, and do what the field says. */
export default function Party({ players, exit }: GameProps) {
  const [boards, setBoards] = useState(allBoards);
  const [boardId, setBoardId] = useState(() => load<string>('party-board', 'classic'));
  const [pawns, setPawns] = useState(() => pawnsFor(players.map((p) => p.id)));
  const [editing, setEditing] = useState<{ board: Board; asNew: boolean; draft?: Draft } | null>(null);
  // Boards saved unfinished, to go on with.
  const [drafts, setDrafts] = useState(savedDrafts);
  const [game, setGame] = useState(0);
  const board = boards.find((b) => b.id === boardId) ?? boards[0];

  if (editing) {
    return (
      <Editor
        key={editing.board.id + editing.asNew + (editing.draft?.id ?? '')}
        board={editing.board}
        asNew={editing.asNew}
        draft={editing.draft}
        onCancel={() => setEditing(null)}
        onSave={(b) => {
          saveBoard(b);
          // Finished: the draft it was is done with.
          if (editing.draft) deleteDraft(editing.draft.id);
          setDrafts(savedDrafts());
          setBoards(allBoards());
          setBoardId(b.id);
          save('party-board', b.id);
          setEditing(null);
        }}
        onDraft={(d) => {
          saveDraft(d);
          setDrafts(savedDrafts());
          setEditing(null);
        }}
        onDelete={
          editing.draft
            ? () => {
                deleteDraft(editing.draft!.id);
                setDrafts(savedDrafts());
                setEditing(null);
              }
            : editing.asNew
              ? undefined
              : () => {
                  deleteBoard(editing.board.id);
                  setBoards(allBoards());
                  setBoardId('classic');
                  setEditing(null);
                }
        }
      />
    );
  }

  if (game) return <Play key={game} board={board} players={players} pawns={pawns} exit={exit} onAgain={() => setGame(game + 1)} />;

  return (
    <Setup
      players={players}
      boards={boards}
      boardId={board.id}
      onBoard={(id) => {
        setBoardId(id);
        save('party-board', id);
      }}
      pawns={pawns}
      onPawns={(p) => {
        setPawns(p);
        save('party-pawns', { ...load<Record<string, string>>('party-pawns', {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.id])) });
      }}
      onEdit={(b, asNew) => setEditing({ board: b, asNew })}
      drafts={drafts}
      onDraft={(d) => {
        // Going on with a draft: of the board it changes (if that's still there), else a new one.
        const base = d.base ? boards.find((b) => b.id === d.base) : undefined;
        setEditing({ board: base ?? BOARDS[0], asNew: !base, draft: d });
      }}
      onShared={(b) => {
        saveBoard(b);
        setBoards(allBoards());
        setBoardId(b.id);
        save('party-board', b.id);
      }}
      onStart={() => setGame(1)}
    />
  );
}
