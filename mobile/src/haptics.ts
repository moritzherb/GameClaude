import * as Haptics from 'expo-haptics';

/**
 * The web app's vibration patterns (on, off, on, … in ms, like navigator.vibrate) as the phone's
 * haptics: one tap per "on", stronger the longer it is.
 */
export function playPattern(pattern: number[]) {
  let at = 0;
  pattern.slice(0, 16).forEach((ms, i) => {
    const length = Math.max(0, Number(ms) || 0);
    if (i % 2 === 0 && length > 0) {
      const style =
        length <= 12 ? Haptics.ImpactFeedbackStyle.Light : length <= 40 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy;
      const tap = () => void Haptics.impactAsync(style).catch(() => {});
      if (at === 0) tap();
      else setTimeout(tap, at);
    }
    at += length;
  });
}
