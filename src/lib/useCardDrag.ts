import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Dragging a card with a finger (or the mouse). A short touch without moving is a tap. On release the
 * card asks what lies under the finger; if that's no place for it, it slides back.
 */
export function useCardDrag({
  rotated,
  onDrop,
  onTap,
  onStart,
}: {
  /** Inside the turned-around middle, screen moves are mirrored. */
  rotated: boolean;
  onDrop: (target: Element | null) => boolean;
  onTap?: (el: HTMLElement) => void;
  onStart?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const sign = rotated ? -1 : 1;
  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLSpanElement>) => {
      if (e.button !== 0) return;
      onStart?.();
      // No text selection or native drag-and-drop: either would cancel this drag.
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      setDrag({ dx: 0, dy: 0 });
    },
    onPointerMove: (e: ReactPointerEvent<HTMLSpanElement>) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      setDrag({ dx: (e.clientX - s.x) * sign, dy: (e.clientY - s.y) * sign });
    },
    onPointerUp: (e: ReactPointerEvent<HTMLSpanElement>) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      start.current = null;
      const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12;
      if (!moved) {
        setDrag(null);
        if (ref.current) onTap?.(ref.current);
        return;
      }
      // Whatever lies under the finger, below the card itself.
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((el) => !ref.current?.contains(el)) ?? null;
      if (!onDrop(under)) setDrag(null); // slides back
    },
    onPointerCancel: () => {
      start.current = null;
      setDrag(null);
    },
  };
  return { ref, drag, handlers };
}
