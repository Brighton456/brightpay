CREATE OR REPLACE FUNCTION public.enforce_endpoint_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.account_status;
  v_can_create boolean;
  v_limit integer := -1;
  v_count integer := 0;
BEGIN
  SELECT account_status, can_create_endpoints
  INTO v_status, v_can_create
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF COALESCE(v_can_create, false) = false THEN
    RAISE EXCEPTION 'Endpoint creation is not allowed for this account';
  END IF;

  IF v_status = 'idle' THEN
    RAISE EXCEPTION 'Complete verification before creating endpoints';
  ELSIF v_status = 'beginner' THEN
    v_limit := 3;
  ELSE
    v_limit := -1;
  END IF;

  IF v_limit > -1 THEN
    SELECT COUNT(*)
    INTO v_count
    FROM public.endpoints
    WHERE user_id = NEW.user_id
      AND (TG_OP = 'INSERT' OR id <> COALESCE(OLD.id, gen_random_uuid()));

    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Endpoint limit reached for this account';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_endpoint_limit_on_endpoints ON public.endpoints;

CREATE TRIGGER enforce_endpoint_limit_on_endpoints
BEFORE INSERT OR UPDATE OF user_id ON public.endpoints
FOR EACH ROW
EXECUTE FUNCTION public.enforce_endpoint_limit();