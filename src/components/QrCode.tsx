import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** QR code as inline SVG, generated on the phone (works offline). */
export default function QrCode({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111214', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [text]);
  return <div className="qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
