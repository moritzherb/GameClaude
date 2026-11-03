/*
 * The two sides talk in small JSON messages (the page's half is src/lib/native.ts in the web app).
 */

export interface NativeInfo {
  platform: 'ios' | 'android';
  version: string;
  storeSafe: boolean;
}

export type FromPage =
  | { type: 'haptic'; pattern: number[] }
  | { type: 'awake'; on: boolean }
  | { type: 'share'; title: string; text: string; url: string }
  | { type: 'screen'; route: string; playing: boolean }
  | { type: 'break' }
  | { type: 'privacy' }
  | { type: 'open'; url: string }
  | { type: 'exit' }
  | { type: 'reload' }
  | { type: 'ready' }
  | { type: 'store'; key: string; value: string | null }
  | { type: 'store-all'; items: Record<string, string> };

export type ToPage = { type: 'back' } | { type: 'ads'; privacyOptions: boolean };

/** A message from the page, checked: anything else is ignored. */
export function parseMessage(data: string): FromPage | null {
  try {
    const msg: unknown = JSON.parse(data);
    if (!msg || typeof msg !== 'object' || typeof (msg as { type?: unknown }).type !== 'string') return null;
    return msg as FromPage;
  } catch {
    return null;
  }
}

/** The script that tells the page what to do with a message (for WebView.injectJavaScript). */
export const toPageScript = (msg: ToPage) => `window.__prostNative && window.__prostNative(${JSON.stringify(msg)}); true;`;

/**
 * Runs in the page before anything else: who it is talking to, the saved copy of its storage
 * (put back only if the page lost its own), and a watch on every storage change.
 */
export function beforeLoadScript(info: NativeInfo, saved: Record<string, string>) {
  // Plain JSON is valid JavaScript (U+2028/2029 included, since ES2019).
  const json = (v: unknown) => JSON.stringify(v);
  return `(function () {
  window.__PROST_NATIVE__ = ${json(info)};
  var post = function (m) { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} };
  try {
    var ls = window.localStorage, has = false;
    for (var i = 0; i < ls.length; i++) { if (String(ls.key(i)).indexOf('prost:') === 0) { has = true; break; } }
    if (!has) { var saved = ${json(saved)}; for (var k in saved) ls.setItem(k, saved[k]); }
    var S = Storage.prototype, set = S.setItem, rem = S.removeItem, clr = S.clear;
    S.setItem = function (k, v) { set.call(this, k, v); if (this === ls) post({ type: 'store', key: String(k), value: String(v) }); };
    S.removeItem = function (k) { rem.call(this, k); if (this === ls) post({ type: 'store', key: String(k), value: null }); };
    S.clear = function () { clr.call(this); if (this === ls) post({ type: 'store-all', items: {} }); };
    window.addEventListener('load', function () {
      var all = {};
      for (var j = 0; j < ls.length; j++) { var key = ls.key(j); all[key] = ls.getItem(key); }
      post({ type: 'store-all', items: all });
    });
  } catch (e) {}
})();
true;`;
}

/** Only the bundled page itself (and its # screens) opens inside the app; every other link goes to the browser. */
export function isOwnPage(url: string, base: string) {
  if (url === 'about:blank' || url.startsWith('data:') || url.startsWith('blob:')) return true;
  return url.split('#')[0].split('?')[0] === base;
}
