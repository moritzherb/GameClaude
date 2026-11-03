import { useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Sheet from '../../components/Sheet';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { cloudOn } from '../../net/cloud';
import type { Player } from '../../state/AppState';
import { PawnIcon } from './bits';
import { FetchBoardSheet, ShareBoardSheet } from './BoardCode';
import type { Board } from './boards';
import { PAWNS, type PawnDef } from './pawns';

const THEME_EMOJI: Record<string, string> = { classic: '🎲' };

interface Props {
  players: Player[];
  boards: Board[];
  boardId: string;
  onBoard: (id: string) => void;
  pawns: Record<string, PawnDef>;
  onPawns: (p: Record<string, PawnDef>) => void;
  onEdit: (b: Board, asNew: boolean) => void;
  /** A board someone shared, loaded by its code: save it and pick it. */
  onShared: (b: Board) => void;
  onStart: () => void;
}

/** Before the game: which board, and everyone's pawn. */
export default function Setup({ players, boards, boardId, onBoard, pawns, onPawns, onEdit, onShared, onStart }: Props) {
  const [picking, setPicking] = useState<Player | null>(null);
  const [sharing, setSharing] = useState<Board | null>(null);
  const [fetching, setFetching] = useState(false);
  const board = boards.find((b) => b.id === boardId) ?? boards[0];

  const pick = (p: Player, def: PawnDef) => {
    // Taken by someone else: they get this player's old pawn instead.
    const other = players.find((q) => q.id !== p.id && pawns[q.id]?.id === def.id);
    const next = { ...pawns, [p.id]: def };
    if (other) next[other.id] = pawns[p.id];
    onPawns(next);
    setPicking(null);
  };

  return (
    <div className="bd pt-setup">
      <section className="section">
        <h3 className="section-title">{t('Board')}</h3>
        <div className="pt-boards">
          {boards.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`pt-board-card${b.id === board.id ? ' on' : ''}`}
              aria-pressed={b.id === board.id}
              onClick={() => {
                sfx.tick();
                buzz(10);
                onBoard(b.id);
              }}
            >
              <span className="pt-board-emoji" aria-hidden>
                {THEME_EMOJI[b.theme]}
              </span>
              <span className="pt-board-name">{b.custom ? b.name : t(b.name)}</span>
              <span className="pt-board-sub">{b.custom ? t('Your own · {n} fields', { n: b.fields.length - 1 }) : t('{n} fields', { n: b.fields.length - 1 })}</span>
            </button>
          ))}
        </div>
        <div className="pt-board-tools">
          {board.custom && (
            <button type="button" className="text-btn pt-link" onClick={() => onEdit(board, false)}>
              ✏️ {t('Edit this board')}
            </button>
          )}
          <button type="button" className="text-btn pt-link" onClick={() => onEdit(board, true)}>
            ＋ {t('Make your own from this board')}
          </button>
          {cloudOn && board.custom && (
            <button type="button" className="text-btn pt-link" onClick={() => setSharing(board)}>
              📤 {t('Share this board')}
            </button>
          )}
          {cloudOn && (
            <button type="button" className="text-btn pt-link" onClick={() => setFetching(true)}>
              📥 {t('Board from a code')}
            </button>
          )}
        </div>
        {cloudOn && (
          <>
            <ShareBoardSheet board={sharing} onClose={() => setSharing(null)} />
            <FetchBoardSheet
              open={fetching}
              onClose={() => setFetching(false)}
              onBoard={(b) => {
                setFetching(false);
                onShared(b);
              }}
            />
          </>
        )}
      </section>

      <section className="section">
        <h3 className="section-title">{t('Pawns')}</h3>
        <div className="pt-pawn-rows">
          {players.map((p) => (
            <button key={p.id} type="button" className="pt-pawn-row" onClick={() => setPicking(p)}>
              <span className="bd-avatar sm" style={{ background: p.color }}>
                <Avatar avatar={p.avatar} photo={p.photo} />
              </span>
              <span className="pt-pawn-row-name">{p.name}</span>
              <span className="pt-pawn-row-pawn">
                <PawnIcon pawn={pawns[p.id]} size={40} />
                <span>{t(pawns[p.id].name)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="sticky-action">
        <BigButton size="xl" onClick={onStart}>
          {t('Let’s go')}
        </BigButton>
      </div>

      <Sheet open={!!picking} onClose={() => setPicking(null)} title={picking ? t('{name}’s pawn', { name: picking.name }) : ''} closeLabel={t('Cancel')}>
        <div className="pt-pawn-grid">
          {PAWNS.map((def) => {
            const owner = players.find((q) => pawns[q.id]?.id === def.id);
            return (
              <button
                key={def.id}
                type="button"
                className={`pt-pawn-choice${picking && pawns[picking.id]?.id === def.id ? ' on' : ''}`}
                style={owner ? ({ '--chip': owner.color } as CSSProperties) : undefined}
                onClick={() => picking && pick(picking, def)}
              >
                <PawnIcon pawn={def} size={56} />
                <span className="pt-pawn-choice-name">{t(def.name)}</span>
                {owner && owner.id !== picking?.id && <span className="pt-pawn-owner">{owner.name}</span>}
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}
