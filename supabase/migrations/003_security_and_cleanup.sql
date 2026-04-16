-- Security hardening + cleanup helpers + cron schedule
-- This migration:
-- 1) Makes the `shares` bucket private
-- 2) Removes anonymous public-read policy for storage objects
-- 3) Adds helper SQL functions used by cleanup jobs/edge functions
-- 4) Adds a pg_cron schedule to purge expired shares from DB every 10 minutes

-- ============================================
-- 1. Make storage bucket private
-- ============================================
UPDATE storage.buckets
SET public = false
WHERE id = 'shares';

DROP POLICY IF EXISTS "Allow public read from shares bucket" ON storage.objects;

-- ============================================
-- 2. Cleanup helper SQL
-- ============================================
CREATE OR REPLACE FUNCTION public.get_expired_storage_paths(batch_size integer DEFAULT 500)
RETURNS TABLE(storage_path text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT f.storage_path
    FROM public.files f
    JOIN public.shares s ON s.id = f.share_id
    WHERE s.expires_at <= now()
    ORDER BY s.expires_at ASC
    LIMIT GREATEST(batch_size, 1);
$$;

CREATE OR REPLACE FUNCTION public.delete_expired_shares(batch_size integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    WITH expired AS (
        SELECT id
        FROM public.shares
        WHERE expires_at <= now()
        ORDER BY expires_at ASC
        LIMIT GREATEST(batch_size, 1)
    )
    DELETE FROM public.shares s
    USING expired e
    WHERE s.id = e.id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_expired_storage_paths(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_expired_shares(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expired_storage_paths(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_expired_shares(integer) TO service_role;

-- ============================================
-- 3. Cron schedule for DB cleanup
-- ============================================
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'pg_cron extension could not be enabled automatically: %', SQLERRM;
    END;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            EXECUTE $cmd$SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-expired-shares-db'$cmd$;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;

        EXECUTE $sched$
            SELECT cron.schedule(
                'cleanup-expired-shares-db',
                '*/10 * * * *',
                $$SELECT public.delete_expired_shares(500);$$
            )
        $sched$;
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Create schedule manually after enabling pg_cron.';
    END IF;
END;
$$;