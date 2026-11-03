-- prost! backend on Supabase. For now two things:
--   * shared Party boards: share a board you made, friends load it with its 6-letter code;
--   * backups: everything the app keeps on a phone (players, settings, boards, stats), under a
--     secret code, to move it to a new phone.
-- Phones sign in anonymously (Authentication → Sign In / Providers → "Allow anonymous sign-ins"):
-- no e-mail, no password, nothing personal. Tables are closed (row level security); everything
-- goes through the functions below, which check what may be done.

-- Codes people type: no 0/O, 1/I/L, so nothing can be misread. Drawn from gen_random_uuid()
-- (a strong random source; random() is not one, and backup codes are secrets).
create or replace function public.random_code(len int)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + get_byte(uuid_send(gen_random_uuid()), 0) % 31, 1), '')
  from generate_series(1, len);
$$;

/* ---------- Shared boards ---------- */

create table public.boards (
  code text primary key check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  owner uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 40),
  board jsonb not null check (jsonb_typeof(board) = 'object' and pg_column_size(board) < 65536),
  created_at timestamptz not null default now()
);
create index boards_owner on public.boards (owner);
alter table public.boards enable row level security;
-- Your own boards: see and delete them. Nobody can list anyone else's.
create policy "boards: own rows" on public.boards for select to authenticated using (owner = (select auth.uid()));
create policy "boards: delete own" on public.boards for delete to authenticated using (owner = (select auth.uid()));

-- Share a board: returns its code. 100 shared boards per phone at most.
create or replace function public.share_board(p_name text, p_board jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_code text;
begin
  if me is null then raise exception 'sign in first' using errcode = '28000'; end if;
  if (select count(*) from public.boards where owner = me) >= 100 then
    raise exception 'too many shared boards' using errcode = '54000';
  end if;
  loop
    new_code := public.random_code(6);
    begin
      insert into public.boards (code, owner, name, board) values (new_code, me, left(coalesce(nullif(trim(p_name), ''), 'Board'), 40), p_board);
      return new_code;
    exception when unique_violation then
      -- That code is taken: draw another.
    end;
  end loop;
end;
$$;

-- Load a board by its code (anyone with the code; no sign-in needed).
create or replace function public.get_board(p_code text)
returns table (name text, board jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, b.board from public.boards b where b.code = upper(trim(p_code));
$$;

/* ---------- Backups ---------- */

create table public.backups (
  -- Only the code's hash is kept: a database leak can't open anyone's backup.
  code_hash text primary key,
  owner uuid not null default auth.uid() unique,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 4000000),
  updated_at timestamptz not null default now()
);
alter table public.backups enable row level security;
-- No policies: only the functions below touch it.

create or replace function public.code_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to('prost-backup:' || upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex');
$$;

-- Back up this phone: replaces its previous backup and returns a new 12-letter code.
create or replace function public.save_backup(p_data jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_code text := public.random_code(12);
begin
  if me is null then raise exception 'sign in first' using errcode = '28000'; end if;
  delete from public.backups where owner = me;
  insert into public.backups (code_hash, owner, data) values (public.code_hash(new_code), me, p_data);
  return new_code;
end;
$$;

-- Load a backup with its code (on the new phone; no sign-in needed).
create or replace function public.load_backup(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select b.data from public.backups b where b.code_hash = public.code_hash(p_code);
$$;

-- "Delete my data": this phone's backup and shared boards.
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return; end if;
  delete from public.backups where owner = me;
  delete from public.boards where owner = me;
end;
$$;

-- Who may call what. Functions are callable by everyone by default: take that back first.
revoke all on function public.random_code(int) from public, anon, authenticated;
revoke all on function public.code_hash(text) from public, anon, authenticated;
revoke all on function public.share_board(text, jsonb) from public, anon;
revoke all on function public.save_backup(jsonb) from public, anon;
revoke all on function public.delete_my_data() from public, anon;
revoke all on function public.get_board(text) from public;
revoke all on function public.load_backup(text) from public;
grant execute on function public.share_board(text, jsonb) to authenticated;
grant execute on function public.save_backup(jsonb) to authenticated;
grant execute on function public.delete_my_data() to authenticated;
grant execute on function public.get_board(text) to anon, authenticated;
grant execute on function public.load_backup(text) to anon, authenticated;
revoke all on table public.boards, public.backups from anon, authenticated;
grant select, delete on table public.boards to authenticated;
