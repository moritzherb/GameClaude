/** Side of the square profile picture, in pixels: sharp enough for the round avatars, a few kB. */
const SIZE = 112;
/** Largest data URL kept (the room passes it on to every phone). */
const MAX_LENGTH = 12_000;

/** A photo from the camera or the gallery, loaded and ready to draw. */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Done with a loaded photo: free its memory. */
export function releaseImage(img: HTMLImageElement) {
  if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
}

/**
 * A square part of the photo (left, top and side in the photo's own pixels) as a small JPEG data
 * URL: scaled down and compressed until it's small.
 */
export function cropPhoto(img: HTMLImageElement, sx: number, sy: number, side: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
  for (const quality of [0.78, 0.66, 0.54, 0.42]) {
    const data = canvas.toDataURL('image/jpeg', quality);
    if (data.length <= MAX_LENGTH) return data;
  }
  return canvas.toDataURL('image/jpeg', 0.3);
}
