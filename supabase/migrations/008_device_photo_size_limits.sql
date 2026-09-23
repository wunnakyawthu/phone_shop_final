-- Keep device-image storage predictable as the public catalog grows.
-- The browser targets <= 800 KB WebP files; the bucket has a 1 MB hard ceiling
-- as a second line of defense for uploads outside the normal UI.

update storage.buckets
set
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'device-images';
