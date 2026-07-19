-- Global "Start New Share" click counter
-- Powers the usage counter shown in the landing page footer.
-- The counter is seeded at 1000 and incremented atomically on each click.

-- ============================================
-- 1. Stats table (simple key -> value store)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stats (
    key   text PRIMARY KEY,
    value bigint NOT NULL DEFAULT 0
);

-- Seed the share-click counter starting at 1000.
INSERT INTO public.stats (key, value)
VALUES ('share_button_clicks', 1000)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 2. Row Level Security: allow anon read only
-- ============================================
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read on stats" ON public.stats;
CREATE POLICY "Allow anonymous read on stats"
ON public.stats
FOR SELECT
TO anon
USING (true);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.stats TO anon;

-- ============================================
-- 3. Atomic increment via SECURITY DEFINER RPC
--    (writes are only allowed through this function,
--     never directly by the anon client)
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_share_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_value bigint;
BEGIN
    INSERT INTO public.stats (key, value)
    VALUES ('share_button_clicks', 1001)
    ON CONFLICT (key) DO UPDATE
        SET value = public.stats.value + 1
    RETURNING value INTO new_value;

    RETURN new_value;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_share_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_share_count() TO anon;
