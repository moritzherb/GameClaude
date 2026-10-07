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

const CONFETTI_COLORS = ['#ff2e63', '#ff9f1c', '#7b5cff', '#00c2a8', '#ffd23f', '#ffffff'];

export function confetti(amount = 90) {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  for (let i = 0; i < amount; i++) {
    const bit = document.createElement('i');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    bit.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`);
    bit.style.setProperty('--spin', `${(Math.random() - 0.5) * 1440}deg`);
    if (i % 3 === 0) bit.style.borderRadius = '50%';
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3400);
}

/** The full "something great happened" package. */
export function celebrate() {
  sfx.tada();
  buzz([40, 60, 40, 60, 120]);
  confetti();
}
