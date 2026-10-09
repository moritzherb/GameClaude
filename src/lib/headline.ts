import type { Lang } from '../i18n';

/** Home headline that follows the night: first line plain, second line on the lime sticker. */
export interface Headline {
  top: string;
  sticker: string;
}

type Slot = 'pregame' | 'party' | 'late' | 'day';

// Each headline is translated as a whole: "on" needs a different German word in each one.
const HEADLINES: Record<Slot, Record<Lang, Headline>> = {
  pregame: { en: { top: 'Pregame', sticker: 'o’clock?' }, de: { top: 'Zeit zum', sticker: 'Vorglühen?' } },
  party: { en: { top: 'Party’s', sticker: 'on' }, de: { top: 'Party', sticker: 'läuft' } },
  late: { en: { top: 'Last', sticker: 'round' }, de: { top: 'Letzte', sticker: 'Runde' } },
  day: { en: { top: 'Game’s', sticker: 'on' }, de: { top: 'Los', sticker: 'geht’s' } },
};

function slotFor(hour: number): Slot {
  if (hour >= 17 && hour < 20) return 'pregame';
  if (hour >= 20 || hour < 2) return 'party';
  if (hour < 6) return 'late';
  return 'day';
}

export function headlineFor(hour: number, lang: Lang = 'en'): Headline {
  return HEADLINES[slotFor(hour)][lang];
}
