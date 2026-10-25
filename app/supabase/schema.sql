-- =============================================================================
-- Scaffold Tracker — Supabase schema
-- Paste the whole file into the SQL editor of a fresh project and run it once.
--
-- Security model: the join code IS the capability, exactly like the shared link
-- the crew used before. The trackers table is sealed off from the public API
-- entirely; the only way in is through the four functions below, each of which
-- demands the code. The code never travels in a URL, only in a POST body.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.trackers (
  id          uuid primary key default gen_random_uuid(),
  join_code   text        not null unique,
  company     text        not null default '',
  state       jsonb,
  rev         bigint      not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS on with NO policies at all: anon and authenticated cannot read or write
-- this table directly, whatever they do with the public key baked into the app.
alter table public.trackers enable row level security;
revoke all on public.trackers from anon, authenticated;

-- --------------------------------------------------------------------------
-- helpers (never exposed to the API)
-- --------------------------------------------------------------------------

-- People read these codes off one phone and type them into another, so accept
-- whatever spacing or case they use.
create or replace function public.tracker_norm(p text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p,''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- Alphabet omits I, O, 0 and 1 — a chargehand reading a code over the phone
-- should never have to ask "letter or number?".
create or replace function public.tracker_newcode()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text; i int;
begin
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.trackers where join_code = c);
  end loop;
  return c;
end $$;

-- --------------------------------------------------------------------------
-- the API surface
-- --------------------------------------------------------------------------

create or replace function public.tracker_create(p_company text default '')
returns table(join_code text, rev bigint)
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  c := public.tracker_newcode();
  insert into public.trackers(join_code, company, state, rev)
  values (c, coalesce(p_company,''), null, 0);
  return query select c, 0::bigint;
end $$;

create or replace function public.tracker_get(p_code text)
returns table(state jsonb, rev bigint)
language plpgsql security definer set search_path = public as $$
declare k text := public.tracker_norm(p_code);
begin
  return query select t.state, t.rev from public.trackers t where t.join_code = k;
  if not found then raise exception 'no_such_tracker'; end if;
end $$;

-- One number, so a phone can ask "anything new?" without dragging the photos down.
create or replace function public.tracker_rev(p_code text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare k text := public.tracker_norm(p_code); v bigint;
begin
  select t.rev into v from public.trackers t where t.join_code = k;
  if v is null then raise exception 'no_such_tracker'; end if;
  return v;
end $$;

-- Compare-and-swap. A stale rev is not an error: hand back what is actually
-- there and let the app's own mergeStates() reconcile and come again.
create or replace function public.tracker_put(p_code text, p_state jsonb, p_rev bigint)
returns table(ok boolean, state jsonb, rev bigint)
language plpgsql security definer set search_path = public as $$
declare k text := public.tracker_norm(p_code); cur bigint;
begin
  if octet_length(p_state::text) > 4000000 then
    raise exception 'too_large';
  end if;

  select t.rev into cur from public.trackers t where t.join_code = k for update;
  if cur is null then raise exception 'no_such_tracker'; end if;

  if cur <> p_rev then
    return query select false, t.state, t.rev from public.trackers t where t.join_code = k;
    return;
  end if;

  update public.trackers t
     set state = p_state, rev = t.rev + 1, updated_at = now()
   where t.join_code = k;

  return query select true, t.state, t.rev from public.trackers t where t.join_code = k;
end $$;

-- --------------------------------------------------------------------------
-- grants: only the four entry points, and only those
-- --------------------------------------------------------------------------
revoke all on function public.tracker_norm(text)    from public, anon, authenticated;
revoke all on function public.tracker_newcode()     from public, anon, authenticated;

grant execute on function public.tracker_create(text)                  to anon, authenticated;
grant execute on function public.tracker_get(text)                     to anon, authenticated;
grant execute on function public.tracker_rev(text)                     to anon, authenticated;
grant execute on function public.tracker_put(text, jsonb, bigint)      to anon, authenticated;
