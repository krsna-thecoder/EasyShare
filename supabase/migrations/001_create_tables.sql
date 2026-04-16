-- AccessCode Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- 1. Create the 'shares' table
-- ============================================
CREATE TABLE public.shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    access_code TEXT UNIQUE NOT NULL,
    content TEXT, -- For text sharing
    password_hash TEXT, -- Optional password protection
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    max_storage_bytes BIGINT DEFAULT 52428800 -- 50MB limit
);

-- ============================================
-- 2. Create the 'files' table
-- ============================================
CREATE TABLE public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id UUID REFERENCES public.shares(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    type TEXT,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Create indexes for fast retrieval
-- ============================================
CREATE INDEX idx_shares_access_code ON public.shares(access_code);
CREATE INDEX idx_files_share_id ON public.files(share_id);

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies for 'shares' table
-- ============================================

-- Allow anyone to insert new shares
CREATE POLICY "Allow anonymous insert on shares"
ON public.shares
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anyone to read shares that haven't expired
CREATE POLICY "Allow read on non-expired shares"
ON public.shares
FOR SELECT
TO anon
USING (now() < expires_at);

-- Allow anyone to update shares that haven't expired
CREATE POLICY "Allow update on non-expired shares"
ON public.shares
FOR UPDATE
TO anon
USING (now() < expires_at)
WITH CHECK (now() < expires_at);

-- ============================================
-- 6. RLS Policies for 'files' table
-- ============================================

-- Allow anyone to insert files
CREATE POLICY "Allow anonymous insert on files"
ON public.files
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anyone to read files if the parent share hasn't expired
CREATE POLICY "Allow read on files of non-expired shares"
ON public.files
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.shares
        WHERE shares.id = files.share_id
        AND now() < shares.expires_at
    )
);

-- ============================================
-- 7. Grant permissions to anonymous users
-- ============================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shares TO anon;
GRANT SELECT, INSERT ON public.files TO anon;
