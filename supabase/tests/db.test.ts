import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

/*
 * The migration run in a real Postgres (PGlite), set up the way Supabase is: the anon and
 * authenticated roles with Supabase's default grants, and auth.uid() from the request's token.
 * Then every rule is tried as a stranger, as the owner and as someone else.
 */

const migration = readFileSync(new URL('../migrations/20261103000000_init.sql', import.meta.url), 'utf8');
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
let db: PGlite;

/** Run as a phone: signed in as `user`, or anonymous (null). */
async function as<T>(user: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user ?? '']);
    await tx.exec(`set local role ${user ? 'authenticated' : 'anon'}`);
    return (await tx.query<T>(sql, params)).rows;
  });
}
const fails = async (p: Promise<unknown>) => {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    -- Supabase's defaults: every new table and function open to both roles (RLS does the rest).
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  await db.exec(migration);
  // Starting Postgres (WASM) takes a few seconds, more on a busy machine.
}, 60_000);

const board = { id: 'b1', name: 'Mine', cols: 4, rows: 10, path: [], water: [], tunnels: [] };

describe('shared boards', () => {
  let code = '';
  it('a signed-in phone shares a board and gets a 6-letter code', async () => {
    [{ share_board: code }] = await as<{ share_board: string }>(ALICE, 'select public.share_board($1, $2)', ['Mine', board]);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
  it('anyone loads it with the code, any case, spaces around', async () => {
    const rows = await as<{ name: string; board: unknown }>(null, 'select * from public.get_board($1)', [` ${code.toLowerCase()} `]);
    expect(rows).toEqual([{ name: 'Mine', board }]);
  });
  it('a wrong code finds nothing', async () => {
    expect(await as(null, 'select * from public.get_board($1)', ['ZZZZZZ'])).toEqual([]);
  });
  it('without signing in nobody can share', async () => {
    expect(await fails(as(null, 'select public.share_board($1, $2)', ['x', board]))).toBe(true);
  });
  it('nobody reads the table directly: strangers nothing, others nothing, the owner their own', async () => {
    expect(await fails(as(null, 'select * from public.boards'))).toBe(true);
    expect(await as(BOB, 'select * from public.boards')).toEqual([]);
    expect((await as(ALICE, 'select code from public.boards')).length).toBe(1);
  });
  it('nobody writes the table directly', async () => {
    expect(await fails(as(BOB, `insert into public.boards (code, owner, name, board) values ('AAAAAA', $1, 'x', '{}')`, [BOB]))).toBe(true);
    expect(await fails(as(ALICE, `update public.boards set name = 'hacked'`))).toBe(true);
  });
  it('only the owner deletes', async () => {
    await as(BOB, 'delete from public.boards where code = $1', [code]);
    expect((await as(null, 'select * from public.get_board($1)', [code])).length).toBe(1);
  });
  it('a board that is no JSON object, or far too big, is refused', async () => {
    expect(await fails(as(ALICE, 'select public.share_board($1, $2)', ['x', '[1,2]']))).toBe(true);
    const huge = { junk: 'x'.repeat(200_000).split('').map((c, i) => c + i).join('') };
    expect(await fails(as(ALICE, 'select public.share_board($1, $2)', ['x', huge]))).toBe(true);
  });
});

describe('backups', () => {
  let code = '';
  const data = { 'prost:players': '[{"name":"Moritz"}]', 'prost:settings': '{"lang":"de"}' };
  it('a signed-in phone backs up and gets a 12-letter code', async () => {
    [{ save_backup: code }] = await as<{ save_backup: string }>(ALICE, 'select public.save_backup($1)', [data]);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{12}$/);
  });
  it('the new phone loads it with the code (dashes and case don’t matter)', async () => {
    const typed = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`.toLowerCase();
    const [{ load_backup }] = await as<{ load_backup: unknown }>(null, 'select public.load_backup($1)', [typed]);
    expect(load_backup).toEqual(data);
  });
  it('the code itself is not stored, only its hash', async () => {
    const rows = (await db.query<{ code_hash: string }>('select code_hash from public.backups')).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).not.toContain(code);
    expect(rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it('backing up again replaces the old backup: the old code stops working', async () => {
    const [{ save_backup: second }] = await as<{ save_backup: string }>(ALICE, 'select public.save_backup($1)', [{ v: 2 }]);
    expect(second).not.toBe(code);
    expect((await as<{ load_backup: unknown }>(null, 'select public.load_backup($1)', [code]))[0].load_backup).toBeNull();
    expect((await as<{ load_backup: unknown }>(null, 'select public.load_backup($1)', [second]))[0].load_backup).toEqual({ v: 2 });
  });
  it('nobody reads or writes the table directly', async () => {
    expect(await fails(as(ALICE, 'select * from public.backups'))).toBe(true);
    expect(await fails(as(null, 'select * from public.backups'))).toBe(true);
    expect(await fails(as(BOB, `delete from public.backups`))).toBe(true);
  });
  it('without signing in nobody can back up', async () => {
    expect(await fails(as(null, 'select public.save_backup($1)', [data]))).toBe(true);
  });
  it('the helpers are not callable from outside', async () => {
    expect(await fails(as(ALICE, 'select public.random_code(6)'))).toBe(true);
    expect(await fails(as(null, `select public.code_hash('x')`))).toBe(true);
  });
});

describe('delete my data', () => {
  it('removes this phone’s backup and boards, nobody else’s', async () => {
    const [{ share_board: bobs }] = await as<{ share_board: string }>(BOB, 'select public.share_board($1, $2)', ['Bob’s', board]);
    await as(ALICE, 'select public.delete_my_data()');
    expect((await db.query('select * from public.backups where owner = $1', [ALICE])).rows).toEqual([]);
    expect((await db.query('select * from public.boards where owner = $1', [ALICE])).rows).toEqual([]);
    expect((await as(null, 'select * from public.get_board($1)', [bobs])).length).toBe(1);
  });
});
