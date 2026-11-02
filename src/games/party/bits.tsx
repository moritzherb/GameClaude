import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import type { Player } from '../../state/AppState';
import type { Toss } from './logic';
import { pawnSprite, SPRITE_H, type PawnDef } from './pawns';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A die with pips. Rolling, it tumbles and flicks through faces. */
export function Die({ value, rolling, big }: { value: number | null; rolling?: boolean; big?: boolean }) {
  const [face, setFace] = useState(value ?? 6);
  useEffect(() => {
    if (!rolling) {
      if (value) setFace(value);
      return;
    }
    const id = window.setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 75);
    return () => window.clearInterval(id);
  }, [rolling, value]);
  return (
    <span className={`pt-die${rolling ? ' rolling' : ''}${big ? ' big' : ''}${value == null && !rolling ? ' blank' : ''}`} aria-label={value ? String(value) : undefined}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`pt-pip${PIPS[face].includes(i) ? ' on' : ''}`} />
      ))}
    </span>
  );
}

/** Roll a die: tumbles a moment, then lands. Resolves with the number. */
export function useRoll() {
  const [die, setDie] = useState<{ value: number | null; rolling: boolean }>({ value: null, rolling: false });
  const roll = (value = 1 + Math.floor(Math.random() * 6)) =>
    new Promise<number>((done) => {
      sfx.tick();
      setDie({ value, rolling: true });
      window.setTimeout(() => {
        setDie({ value, rolling: false });
        buzz(20);
        sfx.pop();
        window.setTimeout(() => done(value), 350);
      }, 750);
    });
  return { die, roll, reset: () => setDie({ value: null, rolling: false }) };
}

/** A pawn's picture. */
export function PawnIcon({ pawn, size = 40 }: { pawn: PawnDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(size * 0.8 * ratio);
    c.height = Math.round(size * ratio);
    const ctx = c.getContext('2d')!;
    const sprite = pawnSprite(pawn, Math.min(ratio, 2.5));
    const sr = Math.min(ratio, 2.5);
    const m = (size * 0.86) / SPRITE_H;
    const sw = (sprite.width / sr) * m;
    const sh = (sprite.height / sr) * m;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(sprite, (size * 0.8 - sw) / 2, size - sh + 4 * m, sw, sh);
  }, [pawn, size]);
  return <canvas ref={ref} className="pt-pawn-icon" style={{ width: size * 0.8, height: size }} aria-hidden />;
}

/** Pick one of the other players. */
export function PickPlayer({ players, onPick, picked }: { players: Player[]; onPick: (p: Player) => void; picked?: string }) {
  return (
    <div className="pick-grid pt-pick">
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`pick-chip${picked === p.id ? ' selected' : ''}`}
          style={{ '--chip': p.color } as CSSProperties}
          onClick={() => {
            sfx.pop();
            buzz();
            onPick(p);
          }}
        >
          <span className="pick-chip-avatar">
            <Avatar avatar={p.avatar} photo={p.photo} />
          </span>
          <span className="pick-chip-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

/** 3, 2, 1 … now! Then `onDone`. */
export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (n === 0) {
      buzz([40, 40, 80]);
      const id = window.setTimeout(() => done.current(), 700);
      return () => window.clearTimeout(id);
    }
    sfx.tick();
    buzz(15);
    const id = window.setTimeout(() => setN(n - 1), 800);
    return () => window.clearTimeout(id);
  }, [n]);
  return (
    <span key={n} className="pt-count pop-in" aria-live="assertive">
      {n || t('Now!')}
    </span>
  );
}

/** The pose a pack lands in, as a rotation. */
const POSE: Record<Toss, { rx: number; rz: number; y: number }> = {
  1: { rx: 90, rz: 0, y: 66 },
  2: { rx: 0, rz: 90, y: 52 },
  3: { rx: 0, rz: 0, y: 37 },
};

/** A pack of cigarettes, flipped into the air; it lands flat, on its side or upright. */
export function Pack({ toss, flip }: { toss: Toss | null; flip: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !toss || !flip) return;
    const p = POSE[toss];
    const spinX = 720 + (flip % 2) * 360;
    const a = el.animate(
      [
        { transform: `translateY(60px) rotateX(0deg) rotateZ(0deg)` },
        { transform: `translateY(-90px) rotateX(${spinX / 2 + p.rx / 2}deg) rotateZ(${180 + p.rz / 2}deg)`, offset: 0.45 },
        { transform: `translateY(${p.y - 6}px) rotateX(${spinX + p.rx}deg) rotateZ(${360 + p.rz}deg)`, offset: 0.85 },
        { transform: `translateY(${p.y}px) rotateX(${spinX + p.rx}deg) rotateZ(${360 + p.rz}deg)` },
      ],
      { duration: 1000, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'forwards' },
    );
    return () => a.cancel();
  }, [toss, flip]);
  const rest = toss ? POSE[toss] : POSE[3];
  return (
    <span className="pt-pack-stage" aria-hidden>
      <span className="pt-pack-floor" />
      <span ref={ref} className="pt-pack" style={{ transform: `translateY(${rest.y}px) rotateX(${rest.rx}deg) rotateZ(${rest.rz}deg)` }}>
        <span className="pt-pack-face front">
          <span className="pt-pack-top" />
          <span className="pt-pack-name">TSCHICK</span>
        </span>
        <span className="pt-pack-face back">
          <span className="pt-pack-top" />
          <span className="pt-pack-name">TSCHICK</span>
        </span>
        <span className="pt-pack-face left" />
        <span className="pt-pack-face right" />
        <span className="pt-pack-face top" />
        <span className="pt-pack-face bottom" />
      </span>
    </span>
  );
}

/** A tin of snus, flipped like a coin: it lands lid up or bottom up. */
export function SnusTin({ lid, flip }: { lid: boolean | null; flip: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || lid == null || !flip) return;
    const end = 1440 + (lid ? 0 : 180);
    const a = el.animate(
      [
        { transform: 'translateY(40px) rotateX(0deg)' },
        { transform: `translateY(-100px) rotateX(${end / 2}deg)`, offset: 0.5 },
        { transform: `translateY(0) rotateX(${end}deg)` },
      ],
      { duration: 1100, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'forwards' },
    );
    return () => a.cancel();
  }, [lid, flip]);
  return (
    <span className="pt-snus-stage" aria-hidden>
      <span ref={ref} className="pt-snus" style={{ transform: `rotateX(${lid === false ? 180 : 0}deg)` }}>
        <span className="pt-snus-face lid">
          <span className="pt-snus-star">★</span>
          <span className="pt-snus-name">SNUS</span>
        </span>
        <span className="pt-snus-face bottom">
          <span className="pt-snus-ring" />
        </span>
      </span>
    </span>
  );
}
