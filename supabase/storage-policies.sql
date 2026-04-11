-- =============================================================================
-- Supabase Storage: cho phép upload (admin đã đăng nhập) + đọc file (public)
-- Chạy trong: Supabase Dashboard → SQL Editor → Run
--
-- Trước đó: tạo 3 bucket tên đúng như dưới (Storage → New bucket):
--   albums-images | albums-videos | albums-audio
-- Khuyến nghị: bật "Public bucket" cho cả 3 để URL công khai hoạt động với getPublicUrl.
-- =============================================================================

-- Xóa policy cũ nếu bạn đã chạy file này trước đó (tên phải khớp)
drop policy if exists "albums_images_authenticated_insert" on storage.objects;
drop policy if exists "albums_images_authenticated_select" on storage.objects;
drop policy if exists "albums_images_public_select" on storage.objects;
drop policy if exists "albums_videos_authenticated_insert" on storage.objects;
drop policy if exists "albums_videos_authenticated_select" on storage.objects;
drop policy if exists "albums_videos_public_select" on storage.objects;
drop policy if exists "albums_audio_authenticated_insert" on storage.objects;
drop policy if exists "albums_audio_authenticated_select" on storage.objects;
drop policy if exists "albums_audio_public_select" on storage.objects;

-- Authenticated: upload (INSERT)
create policy "albums_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'albums-images');

create policy "albums_videos_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'albums-videos');

create policy "albums_audio_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'albums-audio');

-- Authenticated: xem / liệt kê file trong bucket (SELECT) — hữu ích khi debug
create policy "albums_images_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'albums-images');

create policy "albums_videos_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'albums-videos');

create policy "albums_audio_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'albums-audio');

-- Public: người xem album (anon) tải ảnh/video/nhạc qua URL công khai
-- Cần bucket được đặt Public trong UI, hoặc ít nhất policy SELECT cho public.
create policy "albums_images_public_select"
on storage.objects
for select
to public
using (bucket_id = 'albums-images');

create policy "albums_videos_public_select"
on storage.objects
for select
to public
using (bucket_id = 'albums-videos');

create policy "albums_audio_public_select"
on storage.objects
for select
to public
using (bucket_id = 'albums-audio');
