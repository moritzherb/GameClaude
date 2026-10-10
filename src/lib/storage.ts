import { useEffect, useState } from 'react';

const PREFIX = 'prost:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private mode or full storage – the app still works, it just forgets.
  }
}

/** useState that survives a page reload (and a drunk thumb closing the tab). */
export function usePersistentState<T>(key: string, fallback: T, clean?: (raw: unknown) => T) {
  // `clean` turns whatever is stored (maybe damaged, maybe from an old version) into a usable value.
  const [value, setValue] = useState<T>(() => {
    const raw = load<unknown>(key, fallback);
    try {
      return clean ? clean(raw) : (raw as T);
    } catch {
      return fallback;
    }
  });
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}
