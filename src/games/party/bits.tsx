import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { storeSafe } from '../../lib/native';
import type { Player } from '../../state/AppState';
import type { Toss } from './logic';
import { drawDie } from './die3d';
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

/** How long the big die is in the air and bouncing before it lies still, and how long its number
 *  shows before the game goes on (ms). */
const TUMBLE = 1500;
const READ = 700;

export interface Roller {
  die: { value: number | null; rolling: boolean; flip: number };
  roll: (value?: number) => Promise<number>;
}

/** Roll a die: tumbles a moment, then lands. Resolves with the number. `flip` counts the rolls. */
export function useRoll(): Roller {
  const [die, setDie] = useState<{ value: number | null; rolling: boolean; flip: number }>({ value: null, rolling: false, flip: 0 });
  const roll = (value = 1 + Math.floor(Math.random() * 6)) =>
    new Promise<number>((done) => {
      sfx.tick();
      setDie((d) => ({ value, rolling: true, flip: d.flip + 1 }));
      window.setTimeout(() => {
        setDie((d) => ({ ...d, value, rolling: false }));
        buzz(20);
        sfx.pop();
        window.setTimeout(() => done(value), READ);
      }, TUMBLE);
    });
  return { die, roll };
}

/** The game's one die: the big one in the middle of the board. Cards with a single roll use it too. */
export const BigRoll = createContext<Roller | null>(null);

/** The board's big die where there is one (in the game), else a die of its own. */
export function useBigRoll(): Roller {
  const own = useRoll();
  return useContext(BigRoll) ?? own;
}

/** Which face shows which number, and how the cube turns to put a number in front. */
const CUBE: { face: string; n: number; turn: [number, number] }[] = [
  { face: 'front', n: 1, turn: [0, 0] },
  { face: 'back', n: 6, turn: [0, 180] },
  { face: 'right', n: 3, turn: [0, -90] },
  { face: 'left', n: 4, turn: [0, 90] },
  { face: 'top', n: 2, turn: [-90, 0] },
  { face: 'bottom', n: 5, turn: [90, 0] },
];

/** The fall: height above the board (px, up is minus) and how close to you (scale) over the throw,
 *  as keyframe offsets. It drops in, bounces twice, lower each time, and lies still. */
const HOPS: [offset: number, y: number, scale: number][] = [
  [0, -300, 1.45],
  [0.34, 0, 1],
  [0.52, -78, 1.08],
  [0.67, 0, 1],
  [0.78, -24, 1.02],
  [0.87, 0, 1],
  [1, 0, 1],
];
/** How much of the spin is left at each of those moments (it slows down at every bounce), and a
 *  last little rock as it settles. */
const SPIN = [1, 0.42, 0.2, 0.07, 0.025, -0.006, 0];
const FALL = 'cubic-bezier(0.5, 0, 0.9, 0.5)';
const RISE = 'cubic-bezier(0.1, 0.5, 0.5, 1)';
/** The canvas the die is drawn on (CSS px): room for it turned on a corner and close to you. */
const DIE_BOX = 240;

/** CSS's cubic-bezier(x1, y1, x2, y2) as a function of progress (0 to 1). */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
/** How the spin eases between the bounces: the throw, then each slowing after a bounce. */
const SPIN_EASE = [bezier(0.3, 0, 0.7, 1), bezier(0, 0, 0.58, 1)];

/** How much of the spin is left `t` ms into the throw (as the keyframes above, eased between). */
function spinLeft(t: number) {
  const x = Math.max(0, Math.min(1, t / TUMBLE));
  let i = 0;
  while (i < HOPS.length - 2 && x > HOPS[i + 1][0]) i++;
  const [a, b] = [HOPS[i][0], HOPS[i + 1][0]];
  const k = (i === 0 ? SPIN_EASE[0] : SPIN_EASE[1])(b > a ? (x - a) / (b - a) : 1);
  return SPIN[i] + (SPIN[i + 1] - SPIN[i]) * k;
}

/** The big die in the middle of the board: thrown onto it from above, spinning, bouncing twice and
 *  landing flat on the number, facing you, with the number under it, so you see at once what comes.
 *  Its shadow on the board grows and sharpens as it comes down. */
export function BigDie({ value, flip }: { value: number | null; flip: number }) {
  const hop = useRef<HTMLSpanElement>(null);
  const cube = useRef<HTMLCanvasElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  useLayoutEffect(() => {
    const [h, c, sh] = [hop.current, cube.current, shadow.current];
    if (!h || !c || !sh || !value || !flip) return;
    setShown(true);
    const [rx, ry] = CUBE.find((x) => x.n === value)!.turn;
    // A few whole turns on two axes (and a twist), different every throw, all ending on the number.
    const ax = 360 * (2 + (flip % 2)) + 90 * (flip % 3);
    const ay = 360 * (2 + ((flip + 1) % 2)) - 90 * (flip % 2);
    const az = flip % 2 ? 40 : -40;
    const easing = (i: number) => (i % 2 === 0 ? FALL : RISE);
    // The die itself: one solid body drawn on its canvas each frame (die3d.ts), turning as the
    // keyframes say; its height and how close it is come from the hop round it.
    const ctx = c.getContext('2d');
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    // Sharp also when it's close to you (the hop scales it up to 1.45).
    const res = Math.round(DIE_BOX * dpr * 1.45);
    if (c.width !== res) c.width = c.height = res;
    const paint = (t: number) => {
      if (!ctx) return;
      const k = spinLeft(t);
      ctx.setTransform(res / DIE_BOX, 0, 0, res / DIE_BOX, 0, 0);
      drawDie(ctx, DIE_BOX, rx + ax * k, ry + ay * k, az * k);
    };
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - start;
      paint(t);
      if (t < TUMBLE) frame = requestAnimationFrame(tick);
    };
    paint(0);
    frame = requestAnimationFrame(tick);
    const anims = [
      h.animate(
        HOPS.map(([offset, y, scale], i) => ({ offset, transform: `translateY(${y}px) scale(${scale})`, easing: easing(i) })),
        { duration: TUMBLE, fill: 'forwards' },
      ),
      // The shadow: small and faint while it's high, full under it on the board.
      sh.animate(
        HOPS.map(([offset, y], i) => {
          const k = 1 - Math.min(1, -y / 300);
          return { offset, transform: `scale(${0.35 + 0.65 * k})`, opacity: 0.15 + 0.85 * k, easing: easing(i) };
        }),
        { duration: TUMBLE, fill: 'forwards' },
      ),
    ];
    if (pill.current)
      anims.push(
        pill.current.animate([{ opacity: 0, transform: 'translateX(-50%) scale(0.4)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }], {
          duration: 320,
          delay: TUMBLE * 0.86,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'both',
        }),
      );
    // A tap on each bounce.
    const taps = [0.34, 0.67].map((at, i) => window.setTimeout(() => buzz(i ? 6 : 12), TUMBLE * at));
    const hide = window.setTimeout(() => setShown(false), TUMBLE + 1700);
    return () => {
      window.clearTimeout(hide);
      taps.forEach((x) => window.clearTimeout(x));
      cancelAnimationFrame(frame);
      anims.forEach((a) => a.cancel());
    };
  }, [flip, value]);
  return (
    <span className={`pt-cube-stage${shown ? ' on' : ''}`} aria-hidden>
      <span ref={shadow} className="pt-cube-shadow" />
      <span ref={hop} className="pt-cube-hop">
        <canvas ref={cube} className="pt-cube" />
      </span>
      {value != null && (
        <span ref={pill} className="pt-cube-n" key={`n${flip}`}>
          {value}
        </span>
      )}
    </span>
  );
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

/** A pack of cigarettes (a plain box in the store app), flipped into the air; it lands flat, on its side or upright. */
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
          <span className="pt-pack-name">{storeSafe ? 'PROST' : 'TSCHICK'}</span>
        </span>
        <span className="pt-pack-face back">
          <span className="pt-pack-top" />
          <span className="pt-pack-name">{storeSafe ? 'PROST' : 'TSCHICK'}</span>
        </span>
        <span className="pt-pack-face left" />
        <span className="pt-pack-face right" />
        <span className="pt-pack-face top" />
        <span className="pt-pack-face bottom" />
      </span>
    </span>
  );
}

/** A tin of snus (a plain tin in the store app), flipped like a coin: it lands lid up or bottom up. */
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
          <span className="pt-snus-name">{storeSafe ? 'PROST' : 'SNUS'}</span>
        </span>
        <span className="pt-snus-face bottom">
          <span className="pt-snus-ring" />
        </span>
      </span>
    </span>
  );
}
