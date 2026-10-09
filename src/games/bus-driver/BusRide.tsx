import { useState } from 'react';
import BigButton from '../../components/BigButton';
import Tap from '../../components/Tap';
import { useApp, type Player } from '../../state/AppState';
import BoardRide from './BoardRide';
import { BOARD_ROWS, type BoardMode } from './board';
import ClassicRide from './ClassicRide';
import RideFinish, { type RideStats } from './RideFinish';

type RideMode = 'classic' | BoardMode;

const MODES: { id: RideMode; name: string; layout: number[]; explain: string }[] = [
  {
    id: 'classic',
    name: 'Classic',
    layout: [5],
    explain:
      'Fresh deck, all five questions from part 1 in a row. Get one wrong: drink the question number in sips and start again from question 1.',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    layout: BOARD_ROWS.diamond,
    explain:
      'A 1-2-3-2-1 diamond. Bottom card: red or black? Then higher or lower, row by row, following the road: you can only pick a card that touches the one below. Wrong: drink the row number, the turned cards get covered, start again at the bottom.',
  },
  {
    id: 'zigzag',
    name: '1-2-1-2-1',
    layout: BOARD_ROWS.zigzag,
    explain:
      'Single cards: red or black? Pairs: pick a card, higher or lower? Wrong: drink the row number, the turned cards get covered, start again at the bottom.',
  },
];

interface Props {
  driver: Player;
  /** Start part 1 again with everyone. */
  onPlayAgain: () => void;
  onExit: () => void;
}

/** Part 3: pick how the bus is driven, drive it, arrive. */
export default function BusRide({ driver, onPlayAgain, onExit }: Props) {
  const known = useApp().knows('bus-driver');
  const [mode, setMode] = useState<RideMode>('classic');
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<RideStats | null>(null);

  if (stats) return <RideFinish driver={driver} stats={stats} onPlayAgain={onPlayAgain} onExit={onExit} />;
  if (started) {
    return mode === 'classic' ? (
      <ClassicRide driver={driver} onFinish={setStats} />
    ) : (
      <BoardRide key={mode} driver={driver} mode={mode} onFinish={setStats} />
    );
  }

  const current = MODES.find((m) => m.id === mode)!;
  return (
    <div className="bd">
      <div className="driver-hero pop-in">
        <span className="driver-bus">🚌</span>
        <span className="bd-avatar xl" style={{ background: driver.color }}>
          {driver.avatar}
        </span>
      </div>
      <div className="bd-head center">
        <span className="kicker">Part 3 · The bus ride</span>
        <h2 className="bd-title big">{driver.name} drives the bus</h2>
      </div>

      <section className="section">
        <h3 className="section-title">Which road?</h3>
        <div className="seg three">
          {MODES.map((m) => (
            <Tap key={m.id} className={`seg-btn size-btn${m.id === mode ? ' active' : ''}`} onClick={() => setMode(m.id)} ariaLabel={m.name}>
              <MiniLayout rows={m.layout} />
              <span className="seg-main">{m.name}</span>
            </Tap>
          ))}
        </div>
        {!known && <p className="lead">{current.explain}</p>}
      </section>

      <div className="sticky-action">
        <BigButton size="xl" onClick={() => setStarted(true)}>
          Start the ride
        </BigButton>
      </div>
    </div>
  );
}

/** Tiny card backs showing how the cards are laid out (top row first). */
function MiniLayout({ rows }: { rows: number[] }) {
  return (
    <span className="mini-pyramid" aria-hidden>
      {[...rows].reverse().map((n, r) => (
        <span key={r} className="mini-pyramid-row">
          {Array.from({ length: n }, (_, k) => (
            <i key={k} />
          ))}
        </span>
      ))}
    </span>
  );
}
