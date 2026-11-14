// Sound, vibration and confetti. Kept outside React so any game can call them directly.

import { isNative, toNative } from './native';

export const fxSettings = { sound: true, haptics: true };

export function buzz(pattern: number | number[] = 15) {
  if (!fxSettings.haptics) return;
  // In the store app: the phone's real haptics (iPhones have no navigator.vibrate at all).
  if (isNative) return toNative({ type: 'haptic', pattern: Array.isArray(pattern) ? pattern : [pattern] });
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not supported */
    }
    return;
  }
  // An iPhone (no navigator.vibrate): a tick for each buzz of the pattern, where it would start.
  const parts = Array.isArray(pattern) ? pattern : [pattern];
  let at = 0;
  parts.forEach((ms, i) => {
    if (i % 2 === 0) {
      if (at === 0) tick();
      else window.setTimeout(tick, at);
    }
    at += ms;
  });
}

/**
 * The iPhone's own tick, the one its switches give: a switch (Safari 17.4 and later) flipped by a
 * hidden label, gone again at once. Elsewhere it does nothing.
 */
function tick() {
  if (typeof document === 'undefined') return;
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.append(input);
    document.head.append(label);
    label.click();
    label.remove();
  } catch {
    /* not supported */
  }
}

let ctx: AudioContext | null = null;
function audio() {
  if (!fxSettings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.18, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export const sfx = {
  pop: () => tone(520, 0, 0.09, 'sine', 0.2, 880),
  tick: () => tone(1200, 0, 0.03, 'square', 0.05),
  boo: () => tone(220, 0, 0.45, 'sawtooth', 0.12, 90),
  tada: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.16));
  },
};

/** Paper in the game's own colour, champagne, cream and a warm coral: no rainbow. */
const PAPER = ['#f2c94c', '#f6f1e3', '#ff8a65'];

/** A colour mixed toward black: the back of a piece of paper, turned away from the light. */
function shade(hex: string, by: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - by)));
  return `rgb(${c.join(',')})`;
}

/** The colour the screen in front plays in (its accent), else the app's. */
function accentNow() {
  const el = document.querySelector('.screen') ?? document.documentElement;
  const v = getComputedStyle(el).getPropertyValue('--accent').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#c5f235';
}

/**
 * Confetti: two poppers go off at the bottom corners. The paper shoots up, slows in the air, then
 * flutters down, each piece tumbling (narrow, then wide, then its darker back) and swaying, and
 * fades before it lands. One canvas over the screen (a layer per piece made iPhones flicker).
 */
export function confetti(amount = 130) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.className = 'confetti-layer';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.scale(dpr, dpr);
  const colors = [accentNow(), ...PAPER];
  const reach = Math.min(1.25, h / 844);
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const bits = Array.from({ length: amount }, (_, i) => {
    const left = i % 2 === 0;
    // Up and in from each corner, fanned out.
    const angle = ((left ? -71 : -109) + rnd(-14, 14)) * (Math.PI / 180);
    const speed = rnd(1500, 2500) * reach;
    const color = colors[i % colors.length];
    return {
      x: left ? rnd(-8, 12) : w - rnd(-8, 12),
      y: h + rnd(0, 16),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      delay: (left ? 0 : 0.12) + rnd(0, 0.08),
      life: rnd(2.6, 3.6),
      pw: rnd(7, 12),
      ph: rnd(4, 6.5),
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-5, 5),
      tilt: rnd(0, Math.PI * 2),
      vt: rnd(7, 13),
      sway: rnd(0, Math.PI * 2),
      vs: rnd(2, 4),
      color,
      back: shade(color, 0.32),
    };
  });
  document.body.appendChild(canvas);
  const DRAG = 2.3;
  const GRAVITY = 600;
  let last = performance.now();
  const start = last;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const age = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const b of bits) {
      const t = age - b.delay;
      if (t < 0) {
        alive = true;
        continue;
      }
      if (t > b.life || b.y > h + 30) continue;
      alive = true;
      const k = Math.exp(-DRAG * dt);
      b.vx *= k;
      b.vy = b.vy * k + GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      b.tilt += b.vt * dt;
      b.sway += b.vs * dt;
      const flip = Math.cos(b.tilt);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (b.life - t) / 0.6);
      ctx.translate(b.x + Math.sin(b.sway) * 10, b.y);
      ctx.rotate(b.rot);
      ctx.scale(1, Math.max(0.08, Math.abs(flip)));
      ctx.fillStyle = flip >= 0 ? b.color : b.back;
      ctx.fillRect(-b.pw / 2, -b.ph / 2, b.pw, b.ph);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** "Something great happened", heard and felt: the fanfare and a happy buzz. */
export function cheer() {
  sfx.tada();
  buzz([40, 60, 40, 60, 120]);
}

/** The full "something great happened" package: cheer, and confetti on top. */
export function celebrate() {
  cheer();
  confetti();
}
