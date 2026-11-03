import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isNative, toNative } from '../lib/native';

/*
 * The backend (Supabase, see supabase/migrations): shared Party boards and backups to move to a
 * new phone. Switched on by building with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the
 * project's public key: safe in the app, the database's own rules decide what it may do).
 * Without them the app is exactly as before, and nothing here is offered.
 *
 * A phone signs in anonymously the first time it needs to: no e-mail, no password.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudOn = Boolean(URL && KEY);

/** Where the sign-in is kept (not part of a backup: the new phone signs in on its own). */
const AUTH_KEY = 'prost:cloud-auth';

let client: SupabaseClient | null = null;
function db() {
  if (!cloudOn) throw new CloudError('off');
  client ??= createClient(URL!, KEY!, { auth: { storageKey: AUTH_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}

export class CloudError extends Error {
  constructor(readonly kind: 'off' | 'offline' | 'not-found' | 'too-big' | 'failed') {
    super(kind);
  }
}

async function signedIn() {
  const sb = db();
  const { data } = await sb.auth.getSession();
  if (data.session) return sb;
  const { error } = await sb.auth.signInAnonymously();
  if (error) throw new CloudError(navigator.onLine === false ? 'offline' : 'failed');
  return sb;
}

function fail(error: { code?: string; message?: string }): never {
  if (navigator.onLine === false || /fetch|network/i.test(error.message ?? '')) throw new CloudError('offline');
  if (error.code === '23514' || error.code === '54000') throw new CloudError('too-big');
  throw new CloudError('failed');
}

/* ---------- Codes ---------- */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** What someone typed, as a code: capitals, without spaces and dashes. */
export function cleanCode(typed: string) {
  return typed
    .toUpperCase()
    .split('')
    .filter((c) => ALPHABET.includes(c))
    .join('');
}

/** A backup code in groups of four, for reading out and typing. */
export const groupCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code;

/* ---------- Boards ---------- */

/** Share a board (as boards.ts stores it): returns its 6-letter code. */
export async function shareBoard(name: string, stored: object): Promise<string> {
  const sb = await signedIn();
  const { data, error } = await sb.rpc('share_board', { p_name: name, p_board: stored });
  if (error) fail(error);
  return String(data);
}

/** A shared board by its code (as stored; check it with fromStored before playing it). */
export async function fetchBoard(code: string): Promise<{ name: string; board: unknown }> {
  const { data, error } = await db().rpc('get_board', { p_code: cleanCode(code) });
  if (error) fail(error);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new CloudError('not-found');
  return { name: String(row.name ?? ''), board: row.board };
}

/* ---------- Backups ---------- */

/** Everything the app keeps on this phone, except the sign-in. */
export function collectBackup(storage: Storage = localStorage): Record<string, string> {
  const all: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith('prost:') || key === AUTH_KEY) continue;
    const value = storage.getItem(key);
    if (value != null) all[key] = value;
  }
  return all;
}

/** Put a backup on this phone: its keys replace what's here (the sign-in stays). */
export function applyBackup(data: unknown, storage: Storage = localStorage) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new CloudError('not-found');
  const entries = Object.entries(data).filter(([k, v]) => k.startsWith('prost:') && k !== AUTH_KEY && typeof v === 'string');
  if (!entries.length) throw new CloudError('not-found');
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (key?.startsWith('prost:') && key !== AUTH_KEY) storage.removeItem(key);
  }
  for (const [k, v] of entries) storage.setItem(k, v as string);
}

/** Back this phone up: returns the code (a new one each time; the old one stops working). */
export async function backUp(): Promise<string> {
  const sb = await signedIn();
  const { data, error } = await sb.rpc('save_backup', { p_data: collectBackup() });
  if (error) fail(error);
  return String(data);
}

/** Bring a backup onto this phone, then start the app again with it. */
export async function restore(code: string) {
  const { data, error } = await db().rpc('load_backup', { p_code: cleanCode(code) });
  if (error) fail(error);
  if (data == null) throw new CloudError('not-found');
  applyBackup(data);
  restart();
}

/** Delete this phone's backup and shared boards from the server. */
export async function deleteMyData() {
  const sb = await signedIn();
  const { error } = await sb.rpc('delete_my_data');
  if (error) fail(error);
}

/** Start the app again (in the store app the app reloads its own copy; a plain reload would fetch the website). */
export function restart() {
  if (isNative) toNative({ type: 'reload' });
  else window.location.reload();
}
