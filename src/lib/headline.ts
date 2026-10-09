/** Home headline that follows the night: first line plain, second line on the lime sticker. */
export interface Headline {
  top: string;
  sticker: string;
}

export function headlineFor(hour: number): Headline {
  if (hour >= 17 && hour < 20) return { top: 'Pregame', sticker: 'o’clock' };
  if (hour >= 20 || hour < 2) return { top: 'Party’s', sticker: 'on' };
  if (hour < 6) return { top: 'Last', sticker: 'round' };
  return { top: 'Day', sticker: 'drinking' };
}
