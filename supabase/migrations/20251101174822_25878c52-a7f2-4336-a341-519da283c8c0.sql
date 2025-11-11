-- Make resumes bucket public so previews work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'resumes';