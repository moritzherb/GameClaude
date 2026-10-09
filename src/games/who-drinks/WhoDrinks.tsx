import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick, randomInt } from '../../lib/random';
import type { GameProps } from '../types';

// Picked when the wheel stops (at runtime), so t() is fine here.
const FATES = [
  () => {
    const n = randomInt(1, 3);
    return n === 1 ? t('Drink {n} sip', { n }) : t('Drink {n} sips', { n });
  },
  () => t('Give out {n} sips', { n: randomInt(2, 4) }),
  () => t('Finish your drink! 🫗'),
  () => t('Everybody drinks! 🍻'),
  () => t('Pick a drinking buddy 🤝'),
  () => t('Safe! Drink water 💧'),
  () => t('Drink with no hands 🙌'),
  () => t('Waterfall – you start! 🌊'),
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
          {spinning ? t('Rolling…') : t('Who’s gonna drink?')}
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
          {result ? t('Spin again') : t('Spin')}
        </BigButton>
      </div>
    </div>
  );
}
