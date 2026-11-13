import { useEffect, useState } from 'react';
import Alert from '../../components/Alert';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Finished from '../../components/Finished';
import { t, tx } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import type { Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { canPlay, newGame, other, play, playable, type Game, type Mark } from './logic';

/** Where each small board lies, said the way players say it. */
const PLACES = ['top left', 'top', 'top right', 'left', 'middle', 'right', 'bottom left', 'bottom', 'bottom right'] as const;
const PLACE_NAME: Record<(typeof PLACES)[number], string> = {
  'top left': tx('the top left board'),
  top: tx('the top board'),
  'top right': tx('the top right board'),
  left: tx('the left board'),
  middle: tx('the middle board'),
  right: tx('the right board'),
  'bottom left': tx('the bottom left board'),
  bottom: tx('the bottom board'),
  'bottom right': tx('the bottom right board'),
};

export default function MegaTicTacToe({ players }: GameProps) {
  // Who plays: the first two picked (X starts). With exactly two, straight in.
  const [pair, setPair] = useState<[Player, Player] | null>(() => (players.length === 2 ? [players[0], players[1]] : null));
  if (!pair) return <PickTwo players={players} onPick={setPair} />;
  return <Match pair={pair} onSwap={() => setPair([pair[1], pair[0]])} />;
}

function PickTwo({ players, onPick }: { players: Player[]; onPick: (p: [Player, Player]) => void }) {
  const [picked, setPicked] = useState<Player[]>(() => players.slice(0, 2));
  const toggle = (p: Player) => {
    sfx.tick();
    buzz(8);
    setPicked((list) => (list.some((q) => q.id === p.id) ? list.filter((q) => q.id !== p.id) : [...list, p].slice(-2)));
  };
  return (
    <div className="bd mt-pick">
      <div className="bd-head">
        <h2 className="bd-title">{t('Who plays?')}</h2>
        <p className="lead">{t('Pick two. The first one is X and starts.')}</p>
      </div>
      <div className="mt-pick-list">
        {players.map((p) => {
          const at = picked.findIndex((q) => q.id === p.id);
          return (
            <button key={p.id} type="button" className={`mt-pick-row${at >= 0 ? ' on' : ''}`} aria-pressed={at >= 0} onClick={() => toggle(p)}>
              <span className="bd-avatar xs" style={{ background: p.color }}>
                <Avatar avatar={p.avatar} photo={p.photo} />
              </span>
              <span className="mt-pick-name">{p.name}</span>
              <span className={`mt-pick-mark${at === 0 ? ' x' : at === 1 ? ' o' : ''}`} aria-hidden>
                {at === 0 ? <MarkIcon mark="X" /> : at === 1 ? <MarkIcon mark="O" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="sticky-action">
        <BigButton size="xl" disabled={picked.length < 2} onClick={() => onPick([picked[0], picked[1]])}>
          {picked.length < 2 ? t('Pick two players') : t('Let’s go')}
        </BigButton>
      </div>
    </div>
  );
}

function Match({ pair, onSwap }: { pair: [Player, Player]; onSwap: () => void }) {
  const [g, setG] = useState<Game>(() => newGame());
  const [note, setNote] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const who = (m: Mark) => (m === 'X' ? pair[0] : pair[1]);
  const open = playable(g);

  useEffect(() => {
    if (g.winner && g.winner !== 'draw') celebrate();
  }, [g.winner]);

  const tap = (board: number, cell: number) => {
    if (!canPlay(g, board, cell)) {
      if (!g.winner && g.cells[board][cell] == null) buzz([15, 30, 15]);
      return;
    }
    const mark = g.turn;
    const next = play(g, board, cell);
    sfx.tick();
    buzz(12);
    if (next.boards[board] === mark && g.boards[board] == null) {
      sfx.pop();
      buzz([20, 40, 30]);
      setNote(t('{name} takes {place}: {other} drinks 1', { name: who(mark).name, place: t(PLACE_NAME[PLACES[board]]), other: who(other(mark)).name }));
    } else if (next.boards[board] === 'draw' && g.boards[board] == null) setNote(t('Nobody gets {place}: it’s full', { place: t(PLACE_NAME[PLACES[board]]) }));
    else setNote(null);
    setG(next);
  };

  const restart = (swap: boolean) => {
    setNote(null);
    setG(newGame());
    if (swap) onSwap();
  };

  const loser = g.winner && g.winner !== 'draw' ? who(other(g.winner)) : null;
  const info = g.winner
    ? g.winner === 'draw'
      ? t('A draw: every board is decided, no three in a row')
      : t('{name} wins! {other} drinks 3', { name: who(g.winner).name, other: loser!.name })
    : (note ??
      (g.next != null
        ? t('{name}: play in {place}', { name: who(g.turn).name, place: t(PLACE_NAME[PLACES[g.next]]) })
        : g.moves === 0
          ? t('{name} starts: anywhere', { name: who(g.turn).name })
          : t('{name}: free choice, any open board', { name: who(g.turn).name })));

  return (
    <div className={`bd mt-play turn-${g.turn === 'X' ? 'x' : 'o'}${g.winner ? ' over' : ''}`}>
      {g.winner && <Finished game="mega-ttt" players={pair} />}
      <div className="mt-players">
        {(['X', 'O'] as Mark[]).map((m) => {
          const p = who(m);
          const on = !g.winner && g.turn === m;
          const won = g.winner === m;
          return (
            <div key={m} className={`mt-player ${m === 'X' ? 'x' : 'o'}${on ? ' on' : ''}${won ? ' won' : ''}`} aria-current={on ? 'true' : undefined}>
              <span className="mt-player-face">
                <span className="bd-avatar sm" style={{ background: p.color }}>
                  <Avatar avatar={p.avatar} photo={p.photo} />
                </span>
                <span className="mt-player-mark">
                  <MarkIcon mark={m} />
                </span>
              </span>
              <span className="mt-player-text">
                <span className="mt-player-name">{p.name}</span>
                <span className="mt-player-sub">{won ? t('Winner') : on ? t('Your turn') : boardsText(g.boards.filter((o) => o === m).length)}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-big" role="grid" aria-label={t('Board')}>
        {g.cells.map((cells, b) => {
          const owner = g.boards[b];
          const live = open.includes(b);
          const inLine = g.line?.includes(b);
          return (
            <div
              key={b}
              role="row"
              className={`mt-small${live ? ' live' : ''}${owner ? ` owned ${owner === 'draw' ? 'draw' : owner === 'X' ? 'x' : 'o'}` : ''}${inLine ? ' line' : ''}`}
              aria-label={t(PLACE_NAME[PLACES[b]])}
            >
              {cells.map((c, i) => {
                const last = g.last?.board === b && g.last.cell === i;
                const inSmallLine = g.lines[b]?.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    role="gridcell"
                    className={`mt-cell${c ? ` ${c === 'X' ? 'x' : 'o'}` : ''}${last ? ' last' : ''}${inSmallLine ? ' in-line' : ''}`}
                    aria-label={c ?? t('Empty')}
                    disabled={!live || c != null}
                    onClick={() => tap(b, i)}
                  >
                    {c && <MarkIcon mark={c} />}
                  </button>
                );
              })}
              {owner && owner !== 'draw' && (
                <span className="mt-small-owner" aria-hidden>
                  <MarkIcon mark={owner} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-foot">
        <p key={info} className={`mt-info${note && !g.winner ? ' note' : ''}`} aria-live="polite">
          {info}
        </p>
        {g.winner ? (
          <BigButton size="xl" onClick={() => restart(g.winner === 'X')}>
            {t('Play again')}
          </BigButton>
        ) : (
          <button type="button" className="text-btn mt-restart" disabled={g.moves === 0} onClick={() => setAsking(true)}>
            {t('Restart')}
          </button>
        )}
      </div>
      {asking && (
        <Alert
          title={t('Start over?')}
          text={t('The board is cleared and X starts again.')}
          action={t('Restart')}
          onConfirm={() => {
            setAsking(false);
            restart(false);
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </div>
  );
}

const boardsText = (n: number) => (n === 1 ? t('1 board') : t('{n} boards', { n }));

/** X: two strokes; O: a ring. Drawn as they appear. */
function MarkIcon({ mark }: { mark: Mark }) {
  return mark === 'X' ? (
    <svg className="mt-mark x" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6 L18 18" pathLength={1} />
      <path d="M18 6 L6 18" pathLength={1} />
    </svg>
  ) : (
    <svg className="mt-mark o" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="6.5" pathLength={1} />
    </svg>
  );
}
