import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { randomInt } from '../../lib/random';
import type { GameProps } from '../types';
import { spinFate } from './fates';
import Finished from '../../components/Finished';
import Avatar from '../../components/Avatar';
import FitText from '../../components/FitText';
import Glyph from '../../components/Glyph';

export default function WhoDrinks({ players }: GameProps) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const [result, setResult] = useState<{ index: number; fate: string } | null>(null);
  // Counted as a game from the first spin on.
  const [spun, setSpun] = useState(false);
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
        const fate = spinFate(winner, players.length);
        setResult({ index: winner, fate: fate.text });
        setSpun(true);
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
      {/* Spins go on and on: the game counts from its first spin on. */}
      {spun && <Finished game="who-drinks" />}
      {winner && result ? (
        <div className="result-card pop-in" style={{ '--chip': winner.color } as CSSProperties}>
          <div className="result-avatar wobble"><Avatar name={winner.name} color={winner.color} photo={winner.photo} /></div>
          <div className="result-name">{winner.name}</div>
          <div className="result-fate">{result.fate}</div>
        </div>
      ) : (
        <div className="who-drinks-hint">
          <span className="who-drinks-hint-emoji">
            <Glyph name={spinning ? 'shuffle' : 'eye'} />
          </span>
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
            <span className="spin-chip-avatar"><Avatar name={p.name} color={p.color} photo={p.photo} /></span>
            <FitText className="spin-chip-name">{p.name}</FitText>
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
