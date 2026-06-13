-- Allow anonymous users to delete active shares/sessions.
-- Deleting a share cascades delete to files table because of FK ON DELETE CASCADE.

-- Grant delete privilege on shares table
GRANT DELETE ON public.shares TO anon;

-- RLS policy for deleting non-expired shares
DROP POLICY IF EXISTS "Allow delete on non-expired shares" ON public.shares;
CREATE POLICY "Allow delete on non-expired shares"
ON public.shares
FOR DELETE
TO anon
USING (now() < expires_at);
