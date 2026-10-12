import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { t } from '../i18n';
import { buzz } from '../lib/fx';
import { cropPhoto } from '../lib/photo';
import BigButton from './BigButton';

/** How far in you may zoom (1: the photo just covers the circle). */
const MAX_ZOOM = 4;

interface View {
  zoom: number;
  /** The photo's top left corner, in px of the frame. */
  x: number;
  y: number;
}

/**
 * Pick the part of a photo for the round profile picture: drag it around, zoom with two fingers or
 * the slider. The circle shows what the others will see.
 */
export default function PhotoCrop({ img, onDone, onCancel }: { img: HTMLImageElement; onDone: (photo: string) => void; onCancel: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(260);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  /** Scale at zoom 1: the photo's short side fills the frame. */
  const base = size / Math.min(w, h);

  const clamp = (v: View): View => {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
    const s = base * zoom;
    return {
      zoom,
      x: Math.min(0, Math.max(size - w * s, v.x)),
      y: Math.min(0, Math.max(size - h * s, v.y)),
    };
  };
  const centred = (): View => clamp({ zoom: 1, x: (size - w * base) / 2, y: (size - h * base) / 2 });
  const [view, setView] = useState<View>(centred);
  const viewRef = useRef(view);
  viewRef.current = view;

  // The frame's real size (it follows the screen); start centred in it.
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    setSize(el.clientWidth);
  }, []);
  useLayoutEffect(() => {
    setView(centred());
    // Only when the frame's size is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  /** Zoom to `zoom`, keeping the point at (fx, fy) in the frame where it is. */
  const zoomTo = (zoom: number, fx = size / 2, fy = size / 2) => {
    const v = viewRef.current;
    const s = base * v.zoom;
    const px = (fx - v.x) / s;
    const py = (fy - v.y) / s;
    const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
    setView(clamp({ zoom: z, x: fx - px * base * z, y: fy - py * base * z }));
  };

  // Fingers on the photo: one drags it, two zoom it.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const local = (e: ReactPointerEvent) => {
    const r = frame.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: viewRef.current.zoom };
    }
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const before = pointers.current.get(e.pointerId);
    if (!before) return;
    const now = local(e);
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((pinch.current.zoom * dist) / pinch.current.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const v = viewRef.current;
    setView(clamp({ ...v, x: v.x + now.x - before.x, y: v.y + now.y - before.y }));
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const done = () => {
    const s = base * view.zoom;
    onDone(cropPhoto(img, -view.x / s, -view.y / s, size / s));
    buzz(15);
  };

  const s = base * view.zoom;
  return (
    <div className="crop-backdrop">
      <div className="crop" role="dialog" aria-modal aria-label={t('Move and zoom')}>
        <h2 className="sheet-title">{t('Move and zoom')}</h2>
        <p className="crop-hint">{t('Drag the photo, pinch or slide to zoom. The circle is what the others see.')}</p>
        <div
          ref={frame}
          className="crop-frame"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={(e) => zoomTo(viewRef.current.zoom * (e.deltaY < 0 ? 1.1 : 0.9))}
        >
          <img
            className="crop-img"
            src={img.src}
            alt=""
            draggable={false}
            style={{ width: w * s, height: h * s, transform: `translate3d(${view.x}px, ${view.y}px, 0)` }}
          />
          <span className="crop-mask" aria-hidden />
        </div>
        <input
          className="crop-zoom"
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          aria-label={t('Zoom')}
          onChange={(e) => zoomTo(Number(e.target.value))}
        />
        <div className="crop-actions">
          <BigButton variant="light" onClick={onCancel}>
            {t('Cancel')}
          </BigButton>
          <BigButton onClick={done}>{t('Use photo')}</BigButton>
        </div>
      </div>
    </div>
  );
}
