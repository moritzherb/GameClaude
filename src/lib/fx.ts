// Sound, vibration and confetti. Kept outside React so any game can call them directly.

export const fxSettings = { sound: true, haptics: true };

export function buzz(pattern: number | number[] = 15) {
  if (!fxSettings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
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

const CONFETTI_COLORS = ['#c5f235', '#ffd23f', '#ff8a3d', '#4be3a5', '#f3efe4', '#ff7eb6'];

/**
 * Confetti, drawn on one canvas over the screen. It used to be a little element per bit, each
 * falling on a layer of its own: ninety layers at once, the moment something great happened, and
 * iPhones let the screen under them flicker.
 */
export function confetti(amount = 90) {
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
  // Each bit falls from just above the screen to below it, drifting and spinning on the way.
  const bits = Array.from({ length: amount }, (_, i) => ({
    x: Math.random() * w,
    delay: Math.random() * 350,
    duration: 1600 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 200,
    spin: (Math.random() - 0.5) * 8 * Math.PI,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  }));
  document.body.appendChild(canvas);
  const start = performance.now();
  const frame = (now: number) => {
    ctx.clearRect(0, 0, w, h);
    let falling = false;
    for (const b of bits) {
      const t = Math.min(1, Math.max(0, (now - start - b.delay) / b.duration));
      if (t < 1) falling = true;
      ctx.save();
      ctx.translate(b.x + b.drift * t, -13 + 1.1 * h * t);
      ctx.rotate(b.spin * t);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      if (b.round) ctx.ellipse(0, 0, 4.5, 7, 0, 0, 2 * Math.PI);
      else ctx.rect(-4.5, -7, 9, 14);
      ctx.fill();
      ctx.restore();
    }
    if (falling) requestAnimationFrame(frame);
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
