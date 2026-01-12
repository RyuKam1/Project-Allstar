-- Allow authenticated users to upload files to 'allstar-assets' bucket
create policy "Allow Authenticated Uploads"
on storage.objects for insert
with check (
  bucket_id = 'allstar-assets' 
  and auth.role() = 'authenticated'
);

-- Allow users to update/delete their own files (optional but recommended)
create policy "Allow Individual Update/Delete"
on storage.objects for all
using (
  bucket_id = 'allstar-assets' 
  and auth.uid() = owner
);

-- Ensure public access is explicit if "Public Bucket" toggle didn't catch everything
create policy "Give Public Access"
on storage.objects for select
using ( bucket_id = 'allstar-assets' );
