-- MEMORA: Required columns migration
-- Run this in Supabase SQL Editor before deploying the updated code.

alter table public.albums add column if not exists sender_name text;
alter table public.albums add column if not exists occasion text;
alter table public.albums add column if not exists profile_mode text default 'classic';
alter table public.albums add column if not exists theme_preset text;
alter table public.albums add column if not exists opening_letter text;
alter table public.albums add column if not exists final_message text;
alter table public.albums add column if not exists letter_title text;
alter table public.albums add column if not exists letter_message text;
alter table public.albums add column if not exists letter_hint text;
alter table public.albums add column if not exists letter_closing text;
alter table public.albums add column if not exists voice_url text;
alter table public.albums add column if not exists unlock_date timestamptz;
alter table public.albums add column if not exists time_capsule_message text;

alter table public.albums drop constraint if exists albums_photos_check;

alter table public.albums
  add constraint albums_photos_check
  check (
    photos is not null
    and jsonb_typeof(photos::jsonb) = 'array'
    and jsonb_array_length(photos::jsonb) between 1 and 30
  );

notify pgrst, 'reload schema';
