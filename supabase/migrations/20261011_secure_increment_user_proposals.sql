-- Migration: Secure atomic proposal counter RPC for Smartbit Optimizer
-- Drops vulnerable parameter-accepting overload and implements secure zero-argument RPC

-- 1. Drop old vulnerable function accepting UUID argument
DROP FUNCTION IF EXISTS public.increment_user_proposals(UUID);

-- 2. Create secure no-argument function
CREATE OR REPLACE FUNCTION public.increment_user_proposals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Derive caller identity exclusively from auth.uid()
  v_user_id := auth.uid();
  
  -- Reject unauthenticated calls
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  -- Atomically increment profiles.total_proposals for the verified caller
  INSERT INTO public.profiles (id, total_proposals, created_at)
  VALUES (v_user_id, 1, NOW())
  ON CONFLICT (id)
  DO UPDATE SET total_proposals = COALESCE(public.profiles.total_proposals, 0) + 1;
END;
$$;

-- 3. Restrict permissions: Revoke from public and anon; grant strictly to authenticated
REVOKE EXECUTE ON FUNCTION public.increment_user_proposals() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_user_proposals() FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_user_proposals() TO authenticated;
