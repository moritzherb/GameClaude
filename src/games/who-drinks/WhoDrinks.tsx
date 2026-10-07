import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick, randomInt } from '../../lib/random';
import type { GameProps } from '../types';

const FATES = [
  () => {
    const n = randomInt(1, 3);
    return `Drink ${n} sip${n > 1 ? 's' : ''}`;
  },
  () => `Give out ${randomInt(2, 4)} sips`,
  () => 'Finish your drink! 🫗',
  () => 'Everybody drinks! 🍻',
  () => 'Pick a drinking buddy 🤝',
  () => 'Safe! Drink water 💧',
  () => 'Drink with no hands 🙌',
  () => 'Waterfall – you start! 🌊',
];

export default function WhoDrinks({ players }: GameProps) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const [result, setResult] = useState<{ index: number; fate: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const winner = randomInt(0, players.length - 1);
    // Cycle around the circle a few times, slowing down, and stop on the winner.
    const steps = players.length * 3 + winner + randomInt(0, 1) * players.length;
    let step = 0;
    const tick = () => {
      setHighlight(step % players.length);
      sfx.tick();
      buzz(5);
      if (step >= steps) {
        setSpinning(false);
        setResult({ index: winner, fate: pick(FATES)() });
        celebrate();
        return;
      }
      step++;
      const progress = step / steps;
      timer.current = window.setTimeout(tick, 45 + progress ** 3 * 380);
    };
    tick();
  };

  const winner = result ? players[result.index] : null;

  return (
    <div className="who-drinks">
      {winner && result ? (
        <div className="result-card pop-in" style={{ '--chip': winner.color } as CSSProperties}>
          <div className="result-avatar wobble">{winner.avatar}</div>
          <div className="result-name">{winner.name}</div>
          <div className="result-fate">{result.fate}</div>
        </div>
      ) : (
        <div className="who-drinks-hint">
          <span className="who-drinks-hint-emoji">{spinning ? '🥁' : '👀'}</span>
          {spinning ? 'Rolling…' : 'Who’s gonna drink?'}
        </div>
      )}

      <div className="spin-grid">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`spin-chip${highlight === i ? ' lit' : ''}${result?.index === i ? ' chosen' : ''}`}
            style={{ '--chip': p.color } as CSSProperties}
          >
            <span className="spin-chip-avatar">{p.avatar}</span>
            <span className="spin-chip-name">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="sticky-action">
        <BigButton size="xl" onClick={spin} disabled={spinning}>
          {result ? 'Spin again' : 'Spin'}
        </BigButton>
      </div>
    </div>
  );
}
