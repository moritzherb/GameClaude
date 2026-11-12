import { tx } from '../i18n';
import { load, save } from './storage';

/*
 * The home screen's wallpaper (new look): the plain ground, one of a few made here, or a photo
 * from the phone. A photo is made smaller and kept on this phone only. Each wallpaper knows the
 * colour along its top edge: the strip under the clock takes it, so the two run into each other.
 */

export interface Wallpaper {
  id: string;
  /** Shown in Settings. English; translate with t(). */
  label: string;
  /** The CSS background (none: the look's ground). */
  background?: string;
  /** The colour along the top edge, for the strip under the clock. */
  top?: string;
}

/** Soft light lying low on a dark ground, so the top edge is the plain ground colour. */
const glow = (base: string, a: string, b: string) =>
  `radial-gradient(80% 40% at 24% 64%, ${a}, transparent 70%), radial-gradient(70% 34% at 82% 80%, ${b}, transparent 70%), radial-gradient(60% 30% at 70% 46%, ${a}55, transparent 70%), ${base}`;

export const WALLPAPERS: Wallpaper[] = [
  { id: 'ground', label: tx('Standard') },
  { id: 'lime', label: tx('Lime'), background: glow('#11130e', '#56730f', '#2d4512'), top: '#11130e' },
  { id: 'dusk', label: tx('Dusk'), background: glow('#170f1f', '#74275f', '#b23c62'), top: '#170f1f' },
  { id: 'ocean', label: tx('Ocean'), background: glow('#0a141d', '#124c73', '#0d7569'), top: '#0a141d' },
  { id: 'ember', label: tx('Ember'), background: glow('#1a100b', '#a8481b', '#d18f2b'), top: '#1a100b' },
];

const PHOTO = 'wallpaper-photo';

export interface Photo {
  /** A JPEG as a data URL. */
  data: string;
  /** The colour along its top edge (as it is shown: a little darker). */
  top: string;
}

export function loadPhoto(): Photo | null {
  const p = load<unknown>(PHOTO, null);
  return p && typeof p === 'object' && typeof (p as Photo).data === 'string' && (p as Photo).data.startsWith('data:image/') ? (p as Photo) : null;
}

export function savePhoto(photo: Photo) {
  save(PHOTO, photo);
}

/** A photo on the home screen is shown this much darker, so the icons and their names stand out. */
export const PHOTO_DIM = 0.16;

/** The wallpaper to show: the chosen one, the photo if that was chosen (and there is one), else the ground. */
export function wallpaperFor(id: string | undefined, photo: Photo | null): { background?: string; top?: string; photo: boolean } {
  // A little darker, so the icons and their names stand out (the top colour already is).
  const dim = `linear-gradient(rgba(0, 0, 0, ${PHOTO_DIM}), rgba(0, 0, 0, ${PHOTO_DIM}))`;
  // A photo isn't one colour along its top, the strip under the clock is: the photo comes out of
  // the strip's colour (exactly it at the very top, gone a little further down), so no edge shows
  // between the two.
  const seam = (top: string) => `linear-gradient(${top}, ${top}00 110px)`;
  if (id === 'photo' && photo) return { background: `${seam(photo.top)}, ${dim}, url("${photo.data}") center / cover no-repeat`, top: photo.top, photo: true };
  const w = WALLPAPERS.find((x) => x.id === id);
  return { background: w?.background, top: w?.top, photo: false };
}

/** Average colour of a strip of pixels (RGBA bytes), darkened by `dim`, as #rrggbb. */
export function averageColor(px: Uint8ClampedArray, dim = 0): string {
  let r = 0;
  let g = 0;
  let b = 0;
  const n = Math.max(1, px.length / 4);
  for (let i = 0; i < px.length; i += 4) {
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
  }
  const hex = (v: number) =>
    Math.round((v / n) * (1 - dim))
      .toString(16)
      .padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * A photo from the phone, made ready for the home screen: at most the screen's size (sharp enough,
 * small enough to keep), as a JPEG, with the colour of its top edge.
 */
export async function readPhoto(file: File, longest = 1600): Promise<Photo> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, longest / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(img, 0, 0, w, h);
    // The top edge as shown: the photo covers the screen (centred), so its top rows show at the top.
    const top = averageColor(ctx.getImageData(0, 0, w, Math.max(1, Math.round(h * 0.03))).data, PHOTO_DIM);
    let data = canvas.toDataURL('image/jpeg', 0.82);
    // Kept small enough for the phone's storage.
    if (data.length > 900_000) data = canvas.toDataURL('image/jpeg', 0.6);
    return { data, top };
  } finally {
    URL.revokeObjectURL(url);
  }
}
