import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { randomInt } from '../../lib/random';
import type { GameProps } from '../types';
import { spinFate } from './fates';

export default function WhoDrinks({ players }: GameProps) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const [result, setResult] = useState<{ index: number; fate: string } | null>(null);
  // Sips per player id, for the counter on each name.
  const [drunk, setDrunk] = useState<Record<string, number>>({});
  // The name just counted up, for a little bump.
  const [bumped, setBumped] = useState<{ id: string; n: number } | null>(null);
  const addSips = (sips: Record<string, number>) => setDrunk((d) => Object.fromEntries(players.map((p) => [p.id, (d[p.id] ?? 0) + (sips[p.id] ?? 0)])));
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
        addSips(Object.fromEntries(players.map((p, i) => [p.id, fate.sips[i]])));
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
        {players.map((p, i) => {
          const n = drunk[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              className={`spin-chip${highlight === i ? ' lit' : ''}${result?.index === i ? ' chosen' : ''}`}
              style={{ '--chip': p.color } as CSSProperties}
              disabled={spinning}
              aria-label={t('{name}: {n} sips so far. Tap to add one.', { name: p.name, n })}
              onClick={() => {
                // Sips the wheel can't know (handed out, lost a little game): tap the name.
                sfx.tick();
                buzz(8);
                addSips({ [p.id]: 1 });
                setBumped({ id: p.id, n: n + 1 });
              }}
            >
              <span className="spin-chip-avatar">{p.avatar}</span>
              <span className="spin-chip-name">{p.name}</span>
              {/* The drink counter, bottom right. */}
              <span key={bumped?.id === p.id ? bumped.n : 'n'} className={`spin-chip-count${n ? '' : ' zero'}${bumped?.id === p.id ? ' bump' : ''}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>
      <p className="fine-print center">{t('Tap a name to count a sip.')}</p>

      <div className="sticky-action">
        <BigButton size="xl" onClick={spin} disabled={spinning}>
          {result ? t('Spin again') : t('Spin')}
        </BigButton>
      </div>
    </div>
  );
}
