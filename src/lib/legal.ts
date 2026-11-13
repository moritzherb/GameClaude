import { isNative, toNative } from './native';

/**
 * Open the legal page (privacy policy, terms of use, imprint: public/privacy.html), at `section`
 * if given: in the store app's browser, in place when installed to the home screen (no new window
 * to get stuck in), else in a new tab.
 */
export function openLegal(section?: 'terms' | 'impressum') {
  const url = new URL('privacy.html', window.location.href.split('#')[0]).href + (section ? `#${section}` : '');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (isNative) toNative({ type: 'open', url });
  else if (standalone) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}
