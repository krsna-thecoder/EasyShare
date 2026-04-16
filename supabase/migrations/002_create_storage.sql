-- AccessCode Storage Configuration
-- Run this in your Supabase SQL Editor after creating the tables

-- ============================================
-- 1. Create the 'shares' storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('shares', 'shares', true);

-- ============================================
-- 2. Storage Policies - Allow anonymous uploads
-- ============================================

-- Allow anyone to upload files to the shares bucket
CREATE POLICY "Allow anonymous uploads to shares bucket"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'shares');

-- Allow anyone to read files from the shares bucket
CREATE POLICY "Allow public read from shares bucket"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'shares');

-- Allow anyone to delete their own uploads (based on path)
CREATE POLICY "Allow anonymous delete from shares bucket"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'shares');
