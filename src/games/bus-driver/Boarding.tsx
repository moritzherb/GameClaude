import { useEffect, type CSSProperties } from 'react';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import type { Player } from '../../state/AppState';
import Avatar from '../../components/Avatar';

/** How long the bus takes: in, stop, door open, the driver gets on, door shut, off it goes. */
const BOARDING_MS = 3300;

/**
 * Before the ride: a bus pulls up, opens its door, the driver hops on, the door shuts and the bus
 * drives off, out of the screen and into the ride. A tap skips it.
 */
export default function Boarding({ driver, road, onDone }: { driver: Player; road: string; onDone: () => void }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone();
      return;
    }
    // The door, and off it goes.
    const door = window.setTimeout(() => {
      sfx.tick();
      buzz(15);
    }, BOARDING_MS * 0.34);
    const go = window.setTimeout(() => buzz([20, 30, 40]), BOARDING_MS * 0.74);
    const done = window.setTimeout(onDone, BOARDING_MS);
    return () => {
      window.clearTimeout(door);
      window.clearTimeout(go);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <button type="button" className="boarding" onClick={onDone} aria-label={t('{name} gets on the bus', { name: driver.name })}>
      <span className="boarding-text">
        <span className="kicker">{road}</span>
        <span className="boarding-title">{t('{name} gets on the bus', { name: driver.name })}</span>
      </span>
      <span className="boarding-stage" aria-hidden>
        <span className="boarding-bus">
          <svg viewBox="0 0 260 130" className="boarding-svg">
            {/* Body */}
            <rect x="8" y="14" width="238" height="86" rx="16" fill="#ffc83d" />
            <rect x="8" y="78" width="238" height="22" rx="8" fill="#f2a71b" />
            <rect x="8" y="64" width="238" height="6" fill="#1b1b1f" opacity="0.85" />
            {/* Windows */}
            {[22, 66, 110, 154].map((x) => (
              <rect key={x} x={x} y="26" width="36" height="30" rx="6" fill="#2b3a4a" />
            ))}
            {[22, 66, 110, 154].map((x) => (
              <path key={`g${x}`} d={`M${x + 5} 30h10l-8 22h-6z`} fill="#fff" opacity="0.18" />
            ))}
            {/* The door: two halves folding open */}
            <rect x="200" y="24" width="34" height="70" rx="4" fill="#1b1b1f" />
            <g className="boarding-door-l">
              <rect x="201" y="25" width="16" height="68" rx="3" fill="#3b4c5e" />
              <rect x="204" y="29" width="10" height="26" rx="2" fill="#8fb3d1" opacity="0.6" />
            </g>
            <g className="boarding-door-r">
              <rect x="217" y="25" width="16" height="68" rx="3" fill="#3b4c5e" />
              <rect x="220" y="29" width="10" height="26" rx="2" fill="#8fb3d1" opacity="0.6" />
            </g>
            {/* Lights */}
            <rect x="240" y="74" width="8" height="12" rx="3" fill="#fff6c2" />
            <rect x="6" y="74" width="6" height="12" rx="3" fill="#ff5a4a" />
            {/* Sign */}
            <rect x="22" y="15" width="168" height="9" rx="3" fill="#1b1b1f" opacity="0.8" />
            {/* Wheels */}
            {[62, 196].map((x) => (
              <g key={x} className="boarding-wheel">
                <circle cx={x} cy="102" r="17" fill="#1b1b1f" />
                <circle cx={x} cy="102" r="8" fill="#9aa3ad" />
                <rect x={x - 1.5} y="94" width="3" height="16" rx="1.5" fill="#1b1b1f" />
              </g>
            ))}
          </svg>
        </span>
        {/* The driver, waiting at the stop, hopping on */}
        <span className="boarding-driver" style={{ '--chip': driver.color } as CSSProperties}>
          <Avatar avatar={driver.avatar} photo={driver.photo} />
        </span>
      </span>
    </button>
  );
}
