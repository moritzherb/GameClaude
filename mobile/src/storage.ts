import { File, Paths } from 'expo-file-system';

/*
 * A copy of the web app's localStorage (players, settings, boards, stats…) in a file of the app's
 * own. The WebView keeps its storage itself; the copy is there for when it doesn't (the system
 * cleared website data, a WebView update lost it): then the page gets it back before it starts.
 */

const file = new File(Paths.document, 'web-storage.json');
let items: Record<string, string> = {};
let timer: ReturnType<typeof setTimeout> | undefined;

let loaded = false;

/** What was saved (read from the file once; later the latest copy in memory, e.g. for a restarted WebView). */
export function loadSaved(): Record<string, string> {
  if (loaded) return { ...items };
  loaded = true;
  try {
    if (file.exists) {
      const parsed: unknown = JSON.parse(file.textSync());
      if (parsed && typeof parsed === 'object') {
        items = Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
      }
    }
  } catch {
    items = {};
  }
  return items;
}

/** One key changed in the page (value null: removed). */
export function setItem(key: string, value: string | null) {
  if (value == null) delete items[key];
  else items[key] = value;
  later();
}

/** Everything the page has (sent once it has loaded). */
export function replaceAll(all: Record<string, string>) {
  items = { ...all };
  later();
}

function later() {
  clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

/** Write it now (also when the app goes to the background: it may be closed there). */
export function flush() {
  clearTimeout(timer);
  timer = undefined;
  // Never write before the saved copy was read: that would wipe it.
  if (!loaded) return;
  try {
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(items));
  } catch {
    /* full disk: the WebView still has its own */
  }
}
