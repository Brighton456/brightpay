-- Add withdrawal & account-info API capabilities to endpoints
ALTER TABLE public.endpoints
  ADD COLUMN IF NOT EXISTS withdrawals_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS withdrawal_secret text NOT NULL DEFAULT ('bp_ws_' || encode(gen_random_bytes(24), 'hex')),
  ADD COLUMN IF NOT EXISTS withdrawal_daily_limit numeric NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS withdrawal_phone_whitelist text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expose_account_info boolean NOT NULL DEFAULT true;

-- Helper: aggregate today's API withdrawal total per endpoint
CREATE OR REPLACE FUNCTION public.endpoint_withdrawn_today(p_endpoint_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.transactions
  WHERE endpoint_id = p_endpoint_id
    AND type = 'withdrawal'
    AND status IN ('pending','completed')
    AND created_at >= date_trunc('day', now());
$$;