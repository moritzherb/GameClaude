import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Codes already made: back in the room (after a game) the code is there at once, not blank first. */
const made = new Map<string, string>();

/** QR code as inline SVG, generated on the phone (works offline). */
export default function QrCode({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState(() => made.get(text) ?? '');
  useEffect(() => {
    const ready = made.get(text);
    if (ready) {
      setSvg(ready);
      return;
    }
    let alive = true;
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111214', light: '#ffffff' } })
      .then((s) => {
        made.set(text, s);
        if (alive) setSvg(s);
      })
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [text]);
  return <div className="qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
