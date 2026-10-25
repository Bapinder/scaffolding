-- =============================================================================
-- Scaffold Tracker — migration 002: real accounts and per-person access
--
-- ADDITIVE ON PURPOSE. Version 1.0 is live on the App Store and authenticates
-- with nothing but a join code, so every function from schema.sql keeps working
-- untouched. This file adds an account-based path alongside it. Once everyone is
-- on 1.1 and every tracker is claimed, run 003 to retire the code-only route.
--
-- Model: a tracker has one owner and any number of members. Membership, not a
-- shared secret, is what grants access. Invitations are by email address and can
-- be issued before that person has ever opened the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ownership
-- ---------------------------------------------------------------------------
alter table public.trackers
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz;

create index if not exists trackers_owner_idx on public.trackers(owner_id);

-- ---------------------------------------------------------------------------
-- who can see a tracker
-- ---------------------------------------------------------------------------
create table if not exists public.tracker_members (
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  user_id    uuid not null references auth.users(id)      on delete cascade,
  role       text not null check (role in ('owner','editor','viewer')),
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (tracker_id, user_id)
);
create index if not exists tracker_members_user_idx on public.tracker_members(user_id);

-- Invitations for people who have not signed up yet. Matched on email at first
-- sign-in and converted into a membership, then deleted.
create table if not exists public.tracker_invites (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('editor','viewer')),
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tracker_id, email)
);
create index if not exists tracker_invites_email_idx on public.tracker_invites(lower(email));

alter table public.tracker_members enable row level security;
alter table public.tracker_invites enable row level security;
revoke all on public.tracker_members from anon, authenticated;
revoke all on public.tracker_invites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.tm_role(p_tracker uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.tracker_members
   where tracker_id = p_tracker and user_id = auth.uid()
$$;

create or replace function public.tm_can_edit(p_tracker uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.tm_role(p_tracker) in ('owner','editor'), false)
$$;

-- ---------------------------------------------------------------------------
-- starting and claiming
-- ---------------------------------------------------------------------------

-- A brand-new tracker, owned by whoever is signed in.
create or replace function public.acct_tracker_create(p_company text default '')
returns table(tracker_id uuid, join_code text)
language plpgsql security definer set search_path = public as $$
declare c text; t uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  c := public.tracker_newcode();
  insert into public.trackers(join_code, company, state, rev, owner_id, claimed_at)
  values (c, coalesce(p_company,''), null, 0, auth.uid(), now())
  returning id into t;
  insert into public.tracker_members(tracker_id, user_id, role, added_by)
  values (t, auth.uid(), 'owner', auth.uid());
  return query select t, c;
end $$;

-- The 1.0 → 1.1 bridge. Somebody already running a code-only tracker signs up and
-- claims it once; from then on it is owned and the code stops being the way in.
-- Refuses if the tracker already has an owner, so a leaked code cannot steal one.
create or replace function public.acct_tracker_claim(p_code text)
returns table(tracker_id uuid, company text)
language plpgsql security definer set search_path = public as $$
declare k text := public.tracker_norm(p_code); t uuid; o uuid; cmp text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select id, owner_id, trackers.company into t, o, cmp
    from public.trackers where join_code = k;
  if t is null then raise exception 'no_such_tracker'; end if;
  if o is not null and o <> auth.uid() then raise exception 'already_claimed'; end if;

  update public.trackers set owner_id = auth.uid(), claimed_at = coalesce(claimed_at, now())
   where id = t;
  insert into public.tracker_members(tracker_id, user_id, role, added_by)
  values (t, auth.uid(), 'owner', auth.uid())
  on conflict (tracker_id, user_id) do update set role = 'owner';
  return query select t, cmp;
end $$;

-- ---------------------------------------------------------------------------
-- reading and writing, gated on membership rather than on a secret
-- ---------------------------------------------------------------------------
create or replace function public.acct_tracker_list()
returns table(tracker_id uuid, company text, role text, rev bigint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.company, m.role, t.rev, t.updated_at
    from public.trackers t
    join public.tracker_members m on m.tracker_id = t.id
   where m.user_id = auth.uid()
   order by t.updated_at desc
$$;

create or replace function public.acct_tracker_get(p_tracker uuid)
returns table(state jsonb, rev bigint, role text)
language plpgsql security definer set search_path = public as $$
declare r text := public.tm_role(p_tracker);
begin
  if r is null then raise exception 'no_access'; end if;
  return query select t.state, t.rev, r from public.trackers t where t.id = p_tracker;
end $$;

create or replace function public.acct_tracker_rev(p_tracker uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if public.tm_role(p_tracker) is null then raise exception 'no_access'; end if;
  select rev into v from public.trackers where id = p_tracker;
  return v;
end $$;

-- Same compare-and-swap contract as 1.0: ok:false hands back the server's copy so
-- the app's own mergeStates() can reconcile and come again.
create or replace function public.acct_tracker_put(p_tracker uuid, p_state jsonb, p_rev bigint)
returns table(ok boolean, state jsonb, rev bigint)
language plpgsql security definer set search_path = public as $$
declare cur bigint;
begin
  if not public.tm_can_edit(p_tracker) then raise exception 'read_only'; end if;
  if octet_length(p_state::text) > 4000000 then raise exception 'too_large'; end if;

  select t.rev into cur from public.trackers t where t.id = p_tracker for update;
  if cur is null then raise exception 'no_such_tracker'; end if;

  if cur <> p_rev then
    return query select false, t.state, t.rev from public.trackers t where t.id = p_tracker;
    return;
  end if;

  update public.trackers t set state = p_state, rev = t.rev + 1, updated_at = now()
   where t.id = p_tracker;
  return query select true, t.state, t.rev from public.trackers t where t.id = p_tracker;
end $$;

-- ---------------------------------------------------------------------------
-- managing who is on it
-- ---------------------------------------------------------------------------
create or replace function public.acct_people(p_tracker uuid)
returns table(user_id uuid, email text, role text, pending boolean)
language plpgsql security definer set search_path = public as $$
begin
  if public.tm_role(p_tracker) is null then raise exception 'no_access'; end if;
  return query
    select m.user_id, u.email::text, m.role, false
      from public.tracker_members m join auth.users u on u.id = m.user_id
     where m.tracker_id = p_tracker
    union all
    select null::uuid, i.email, i.role, true
      from public.tracker_invites i
     where i.tracker_id = p_tracker;
end $$;

-- NOTE: the OUT parameters carry r_ prefixes, and the upserts name their
-- constraint rather than inferring it. Both are for the same reason: an ON CONFLICT
-- inference clause resolves its column names against plpgsql variables as well as
-- table columns, and cannot be table-qualified — so a function with an OUT parameter
-- called "email" cannot say "on conflict (tracker_id, email)". Postgres reports it as
-- 'column reference "email" is ambiguous', pointing at the INSERT.
create or replace function public.acct_invite(p_tracker uuid, p_email text, p_role text default 'editor')
returns table(r_email text, r_role text, r_pending boolean)
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); u uuid;
begin
  if public.tm_role(p_tracker) <> 'owner' then raise exception 'owner_only'; end if;
  if p_role not in ('editor','viewer') then raise exception 'bad_role'; end if;
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'bad_email'; end if;

  select au.id into u from auth.users au where lower(au.email) = e;

  if u is not null then
    insert into public.tracker_members (tracker_id, user_id, role, added_by)
    values (p_tracker, u, p_role, auth.uid())
    on conflict on constraint tracker_members_pkey do update set role = excluded.role;
    return query select e, p_role, false;
  else
    insert into public.tracker_invites (tracker_id, email, role, added_by)
    values (p_tracker, e, p_role, auth.uid())
    on conflict on constraint tracker_invites_tracker_id_email_key do update set role = excluded.role;
    return query select e, p_role, true;
  end if;
end $$;

create or replace function public.acct_revoke(p_tracker uuid, p_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); u uuid;
begin
  if public.tm_role(p_tracker) <> 'owner' then raise exception 'owner_only'; end if;
  select id into u from auth.users where lower(auth.users.email) = e;
  if u is not null then
    if exists (select 1 from public.tracker_members
                where tracker_id = p_tracker and user_id = u and role = 'owner') then
      raise exception 'cannot_remove_owner';
    end if;
    delete from public.tracker_members where tracker_id = p_tracker and user_id = u;
  end if;
  delete from public.tracker_invites where tracker_id = p_tracker and lower(email) = e;
  return true;
end $$;

-- Called by the app right after sign-in: turns any invitation addressed to this
-- person's email into a real membership. Cheap, idempotent, safe to call always.
create or replace function public.acct_accept_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare e text; n integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into e from auth.users where id = auth.uid();
  if e is null then return 0; end if;

  insert into public.tracker_members(tracker_id, user_id, role, added_by)
  select i.tracker_id, auth.uid(), i.role, i.added_by
    from public.tracker_invites i
   where lower(i.email) = e
  on conflict (tracker_id, user_id) do nothing;
  get diagnostics n = row_count;

  delete from public.tracker_invites where lower(email) = e;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- grants — signed-in users only; anon keeps nothing new
-- ---------------------------------------------------------------------------
revoke all on function public.tm_role(uuid), public.tm_can_edit(uuid) from public, anon, authenticated;

-- Postgres grants EXECUTE to PUBLIC on every new function, so granting to
-- 'authenticated' is not enough on its own — anon can still call it. Revoke first.
-- (Caught by calling acct_tracker_list with the anon key and getting [] back
-- instead of a refusal.)
revoke execute on function
  public.acct_tracker_create(text),
  public.acct_tracker_claim(text),
  public.acct_tracker_list(),
  public.acct_tracker_get(uuid),
  public.acct_tracker_rev(uuid),
  public.acct_tracker_put(uuid, jsonb, bigint),
  public.acct_people(uuid),
  public.acct_invite(uuid, text, text),
  public.acct_revoke(uuid, text),
  public.acct_accept_invites()
from public, anon;

grant execute on function
  public.acct_tracker_create(text),
  public.acct_tracker_claim(text),
  public.acct_tracker_list(),
  public.acct_tracker_get(uuid),
  public.acct_tracker_rev(uuid),
  public.acct_tracker_put(uuid, jsonb, bigint),
  public.acct_people(uuid),
  public.acct_invite(uuid, text, text),
  public.acct_revoke(uuid, text),
  public.acct_accept_invites()
to authenticated;
