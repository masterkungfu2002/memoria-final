create extension if not exists pgcrypto;

create or replace function public.jwt_album_id()
returns uuid
language sql
stable
as $$
  select nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'album_id'), '')::uuid
$$;

create or replace function public.validate_album_photos(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(p) <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p) < 6 or jsonb_array_length(p) > 10 then
    return false;
  end if;
  for item in select * from jsonb_array_elements(p)
  loop
    if jsonb_typeof(item) <> 'object' then
      return false;
    end if;
    if not (item ? 'url') or not (item ? 'caption') then
      return false;
    end if;
    if coalesce(length(item->>'url'), 0) = 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  cover_image text not null,
  photos jsonb not null check (public.validate_album_photos(photos)),
  video_url text not null,
  background_music_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_albums_admin_id on public.albums(admin_id);
create index if not exists idx_albums_created_at on public.albums(created_at desc);
create index if not exists idx_feedbacks_album_id on public.feedbacks(album_id);
create index if not exists idx_feedbacks_created_at on public.feedbacks(created_at desc);

alter table public.albums enable row level security;
alter table public.feedbacks enable row level security;

-- ALBUMS POLICIES
drop policy if exists albums_admin_crud_own on public.albums;
create policy albums_admin_crud_own
on public.albums
for all
to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

drop policy if exists albums_anon_read_public on public.albums;
create policy albums_anon_read_public
on public.albums
for select
to anon
using (true);

-- FEEDBACKS POLICIES
drop policy if exists feedbacks_admin_manage_own_album on public.feedbacks;
create policy feedbacks_admin_manage_own_album
on public.feedbacks
for all
to authenticated
using (
  exists (
    select 1
    from public.albums a
    where a.id = feedbacks.album_id
      and a.admin_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.albums a
    where a.id = feedbacks.album_id
      and a.admin_id = auth.uid()
  )
);

drop policy if exists feedbacks_anon_insert_public on public.feedbacks;
create policy feedbacks_anon_insert_public
on public.feedbacks
for insert
to anon
with check (true);

-- GRANTS
grant usage on schema public to anon, authenticated;
grant select on public.albums to anon;
grant select, insert on public.feedbacks to anon;
grant all on public.albums to authenticated;
grant all on public.feedbacks to authenticated;
