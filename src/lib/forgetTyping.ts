/*
 * Shaking an iPhone after typing (a name, a code) pops up "Undo Typing", and in a drinking game
 * phones get shaken. The page's undo history is the phone's: WebKit empties it whenever a frame of
 * the page closes its document (FrameLoader::closeURL → clearUndoRedoOperations → the web view's
 * undo manager loses all its steps), and a frame taken out of the page does just that. So once a
 * text field is left, a tiny empty frame goes in and out again: nothing is left to undo.
 */

const TYPED = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]), textarea, [contenteditable]';

/** Empty the phone's undo history (see above). */
export function forgetTyping() {
  if (typeof document === 'undefined' || !document.body) return;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0', opacity: '0', pointerEvents: 'none' });
  document.body.append(frame);
  frame.remove();
}

/** From now on, whenever typing in a field ends (it loses focus), forget it. */
export function watchTyping() {
  if (typeof document === 'undefined') return;
  document.addEventListener(
    'focusout',
    (e) => {
      if ((e.target as Element | null)?.matches?.(TYPED)) window.setTimeout(forgetTyping, 0);
    },
    true,
  );
}
