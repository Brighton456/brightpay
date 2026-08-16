CREATE TABLE IF NOT EXISTS public.provider_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('deposit', 'withdrawal')),
  min_amount numeric NOT NULL,
  max_amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  cost_amount numeric NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, direction, min_amount, max_amount)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_fee_tiers TO authenticated;
GRANT ALL ON public.provider_fee_tiers TO service_role;

ALTER TABLE public.provider_fee_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage provider fee tiers" ON public.provider_fee_tiers;
CREATE POLICY "Admins manage provider fee tiers"
ON public.provider_fee_tiers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.archive_snapshots
ADD COLUMN IF NOT EXISTS report_totals jsonb;

CREATE OR REPLACE FUNCTION public.active_provider_for_direction(p_direction text, p_flow text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
  v_provider text;
BEGIN
  IF p_flow = 'endpoints' THEN
    v_key := 'provider_endpoints';
  ELSIF p_direction = 'withdrawal' THEN
    v_key := 'provider_withdrawals';
  ELSE
    v_key := 'provider_deposits';
  END IF;

  SELECT lower(value) INTO v_provider
  FROM public.platform_settings
  WHERE key = v_key;

  IF v_provider IN ('swiftwallet', 'makamesco', 'mpay') THEN
    RETURN v_provider;
  END IF;

  RETURN 'swiftwallet';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_fee_amount(p_amount numeric, p_fee_type text DEFAULT 'service', p_flow text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_direction text := CASE WHEN p_fee_type = 'withdrawal' THEN 'withdrawal' ELSE 'deposit' END;
  v_provider text := public.active_provider_for_direction(CASE WHEN p_fee_type = 'withdrawal' THEN 'withdrawal' ELSE 'deposit' END, p_flow);
  v_fee numeric;
BEGIN
  SELECT fee_amount INTO v_fee
  FROM public.provider_fee_tiers
  WHERE provider = v_provider
    AND direction = v_direction
    AND enabled = true
    AND p_amount >= min_amount
    AND p_amount <= max_amount
  ORDER BY min_amount DESC
  LIMIT 1;

  IF v_fee IS NOT NULL THEN
    RETURN v_fee;
  END IF;

  IF p_fee_type = 'withdrawal' THEN
    SELECT withdrawal_fee INTO v_fee FROM public.fees WHERE p_amount >= min_amount AND p_amount <= max_amount LIMIT 1;
  ELSE
    SELECT service_fee INTO v_fee FROM public.fees WHERE p_amount >= min_amount AND p_amount <= max_amount LIMIT 1;
  END IF;

  RETURN COALESCE(v_fee, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_fee_cost(p_amount numeric, p_fee_type text DEFAULT 'service', p_flow text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_direction text := CASE WHEN p_fee_type = 'withdrawal' THEN 'withdrawal' ELSE 'deposit' END;
  v_provider text := public.active_provider_for_direction(CASE WHEN p_fee_type = 'withdrawal' THEN 'withdrawal' ELSE 'deposit' END, p_flow);
  v_cost numeric;
BEGIN
  SELECT cost_amount INTO v_cost
  FROM public.provider_fee_tiers
  WHERE provider = v_provider
    AND direction = v_direction
    AND enabled = true
    AND p_amount >= min_amount
    AND p_amount <= max_amount
  ORDER BY min_amount DESC
  LIMIT 1;

  RETURN COALESCE(v_cost, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_fee(p_amount numeric, p_fee_type text DEFAULT 'service')
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.get_provider_fee_amount(p_amount, p_fee_type, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_pricing(p_direction text DEFAULT NULL)
RETURNS TABLE(direction text, min_amount numeric, max_amount numeric, fee_amount numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deposit_provider text := public.active_provider_for_direction('deposit', NULL);
  v_withdrawal_provider text := public.active_provider_for_direction('withdrawal', NULL);
BEGIN
  RETURN QUERY
  SELECT t.direction, t.min_amount, t.max_amount, t.fee_amount
  FROM public.provider_fee_tiers t
  WHERE t.enabled = true
    AND (
      (t.direction = 'deposit' AND t.provider = v_deposit_provider AND (p_direction IS NULL OR p_direction = 'deposit'))
      OR
      (t.direction = 'withdrawal' AND t.provider = v_withdrawal_provider AND (p_direction IS NULL OR p_direction = 'withdrawal'))
    )
  ORDER BY t.direction, t.min_amount;
END;
$$;

WITH base AS (
  SELECT * FROM (VALUES
    (1::numeric,49::numeric,16::numeric,16::numeric),
    (50,499,20,20),
    (500,999,35,35),
    (1000,1499,50,50),
    (1500,2499,100,100),
    (2500,3499,170,170),
    (3500,4999,320,320),
    (5000,7499,420,420),
    (7500,9999,460,460),
    (10000,14999,52,110),
    (15000,19999,70,130),
    (20000,34999,90,170),
    (35000,49999,110,220),
    (50000,149999,150,300),
    (150000,249999,170,340),
    (250000,349999,190,380),
    (350000,549999,220,440),
    (550000,749999,300,600),
    (750000,999999,400,1000)
  ) AS v(min_amount, max_amount, service_fee, withdrawal_fee)
), providers AS (
  SELECT * FROM (VALUES ('swiftwallet'), ('makamesco'), ('mpay')) AS p(provider)
), expanded AS (
  SELECT provider, 'deposit'::text AS direction, min_amount, max_amount, service_fee AS fee_amount,
    CASE provider
      WHEN 'swiftwallet' THEN CASE
        WHEN min_amount = 1 THEN 0 WHEN min_amount = 50 THEN 7 WHEN min_amount = 500 THEN 10 WHEN min_amount = 1000 THEN 15
        WHEN min_amount = 1500 THEN 20 WHEN min_amount = 2500 THEN 25 WHEN min_amount = 3500 THEN 30 WHEN min_amount = 5000 THEN 35
        WHEN min_amount = 7500 THEN 40 WHEN min_amount = 10000 THEN 45 WHEN min_amount = 15000 THEN 50 WHEN min_amount = 20000 THEN 60
        WHEN min_amount = 35000 THEN 70 WHEN min_amount = 50000 THEN 80 WHEN min_amount = 150000 THEN 90 WHEN min_amount = 250000 THEN 100
        WHEN min_amount = 350000 THEN 150 ELSE 0 END
      WHEN 'makamesco' THEN 0
      ELSE 0
    END AS cost_amount
  FROM base CROSS JOIN providers
  UNION ALL
  SELECT provider, 'withdrawal'::text AS direction, min_amount, max_amount, withdrawal_fee AS fee_amount,
    CASE provider
      WHEN 'swiftwallet' THEN CASE
        WHEN min_amount = 1 THEN 10 WHEN min_amount = 50 THEN 15 WHEN min_amount = 500 THEN 20 WHEN min_amount = 1000 THEN 30
        WHEN min_amount = 1500 THEN 40 WHEN min_amount = 2500 THEN 50 WHEN min_amount = 3500 THEN 60 WHEN min_amount = 5000 THEN 70
        WHEN min_amount = 7500 THEN 80 WHEN min_amount = 10000 THEN 90 WHEN min_amount = 15000 THEN 100 WHEN min_amount = 20000 THEN 120
        WHEN min_amount = 35000 THEN 140 WHEN min_amount = 50000 THEN 160 WHEN min_amount = 150000 THEN 180 WHEN min_amount = 250000 THEN 200
        WHEN min_amount = 350000 THEN 300 ELSE 0 END
      WHEN 'makamesco' THEN CASE
        WHEN min_amount < 101 THEN 2 WHEN min_amount < 501 THEN 8 WHEN min_amount < 1001 THEN 12 WHEN min_amount < 5001 THEN 15 ELSE 30 END
      ELSE 0
    END AS cost_amount
  FROM base CROSS JOIN providers
)
INSERT INTO public.provider_fee_tiers (provider, direction, min_amount, max_amount, fee_amount, cost_amount, enabled, updated_at)
SELECT provider, direction, min_amount, max_amount, fee_amount, cost_amount, true, now()
FROM expanded
ON CONFLICT (provider, direction, min_amount, max_amount)
DO UPDATE SET fee_amount = EXCLUDED.fee_amount, cost_amount = EXCLUDED.cost_amount, enabled = EXCLUDED.enabled, updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_archive_all(p_note text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_snap_id uuid;
  v_wallet_totals jsonb;
  v_admin_totals jsonb;
  v_endpoint_totals jsonb;
  v_report_totals jsonb;
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'type', type, 'balance', balance))
  INTO v_wallet_totals FROM public.wallets WHERE balance > 0;

  SELECT jsonb_agg(jsonb_build_object('kind', kind, 'balance', balance, 'archived_balance', archived_balance))
  INTO v_admin_totals FROM public.admin_wallets WHERE balance > 0 OR archived_balance > 0;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'total_collected', total_collected,
    'total_transactions', total_transactions,
    'successful_transactions', successful_transactions
  )) INTO v_endpoint_totals
  FROM public.endpoints
  WHERE total_transactions > 0 OR total_collected > 0 OR successful_transactions > 0;

  SELECT COUNT(*) INTO v_count FROM public.transactions WHERE archived_at IS NULL;

  SELECT jsonb_build_object(
    'transactions', COUNT(*),
    'completed_transactions', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending_transactions', COUNT(*) FILTER (WHERE status = 'pending'),
    'revenue', COALESCE(SUM(fee) FILTER (WHERE status = 'completed'), 0),
    'total_volume', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
    'total_deposits', COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND type::text IN ('deposit','endpoint')), 0),
    'total_withdrawals', COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND type::text = 'withdrawal'), 0),
    'admin_wallets', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', kind, 'balance', balance, 'archived_balance', archived_balance)) FROM public.admin_wallets), '[]'::jsonb)
  ) INTO v_report_totals
  FROM public.transactions
  WHERE archived_at IS NULL;

  INSERT INTO public.archive_snapshots (created_by, wallet_totals, admin_wallet_totals, endpoint_totals, report_totals, tx_count, note)
  VALUES (auth.uid(), v_wallet_totals, v_admin_totals, v_endpoint_totals, v_report_totals, v_count, p_note)
  RETURNING id INTO v_snap_id;

  UPDATE public.transactions
  SET archived_at = now(), archive_snapshot_id = v_snap_id, updated_at = now()
  WHERE archived_at IS NULL;

  UPDATE public.wallets SET balance = 0, updated_at = now() WHERE id IS NOT NULL AND balance <> 0;

  UPDATE public.admin_wallets SET archived_balance = archived_balance + balance, balance = 0, updated_at = now()
  WHERE id IS NOT NULL AND balance <> 0;

  UPDATE public.endpoints
  SET total_collected = 0, total_transactions = 0, successful_transactions = 0, updated_at = now()
  WHERE id IS NOT NULL AND (total_transactions <> 0 OR total_collected <> 0 OR successful_transactions <> 0);

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'archive_all', jsonb_build_object('note', p_note), jsonb_build_object('snapshot_id', v_snap_id, 'tx_count', v_count, 'report_totals', v_report_totals));

  RETURN v_snap_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_allocate_profit(p_tx_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx record;
  v_kind text;
  v_direction text;
  v_cost numeric := 0;
  v_profit numeric := 0;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id;
  IF NOT FOUND OR v_tx.profit_allocated OR v_tx.status <> 'completed' THEN RETURN; END IF;

  v_kind := COALESCE(v_tx.provider, 'swiftwallet');
  IF v_kind NOT IN ('swiftwallet','makamesco','mpay') THEN v_kind := 'platform'; END IF;

  IF v_tx.type::text = 'activation_fee' THEN
    UPDATE public.admin_wallets SET balance = balance + v_tx.amount, updated_at = now() WHERE kind = 'platform';
    UPDATE public.transactions SET profit_allocated = true WHERE id = p_tx_id;
    RETURN;
  END IF;

  v_direction := CASE WHEN v_tx.type::text = 'withdrawal' THEN 'withdrawal' ELSE 'deposit' END;

  SELECT cost_amount INTO v_cost
  FROM public.provider_fee_tiers
  WHERE provider = v_kind
    AND direction = v_direction
    AND enabled = true
    AND v_tx.amount >= min_amount
    AND v_tx.amount <= max_amount
  ORDER BY min_amount DESC
  LIMIT 1;

  v_profit := GREATEST(COALESCE(v_tx.fee, 0) - COALESCE(v_cost, 0), 0);

  IF v_profit > 0 THEN
    UPDATE public.admin_wallets SET balance = balance + v_profit, updated_at = now() WHERE kind = v_kind;
  END IF;

  UPDATE public.transactions SET profit_allocated = true WHERE id = p_tx_id;
END;
$$;