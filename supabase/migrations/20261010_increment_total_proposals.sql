-- [DEPRECATED / SUPERSEDED by 20261011_secure_increment_user_proposals.sql]
-- NOTE: Do not apply this file directly. Apply 20261011_secure_increment_user_proposals.sql instead.

CREATE OR REPLACE FUNCTION public.increment_user_proposals(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, total_proposals, created_at)
  VALUES (user_id, 1, NOW())
  ON CONFLICT (id)
  DO UPDATE SET total_proposals = COALESCE(public.profiles.total_proposals, 0) + 1;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_user_proposals(UUID) TO authenticated;
