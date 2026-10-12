/** Side of the square profile picture, in pixels: sharp enough for the round avatars, a few kB. */
const SIZE = 112;
/** Largest data URL kept (the room passes it on to every phone). */
const MAX_LENGTH = 12_000;

/**
 * A photo from the camera or the gallery as a small square JPEG (a data URL): cut to a square
 * from the middle, scaled down, compressed until it's small.
 */
export async function squarePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    for (const quality of [0.78, 0.66, 0.54, 0.42]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= MAX_LENGTH) return data;
    }
    return canvas.toDataURL('image/jpeg', 0.3);
  } finally {
    URL.revokeObjectURL(url);
  }
}
