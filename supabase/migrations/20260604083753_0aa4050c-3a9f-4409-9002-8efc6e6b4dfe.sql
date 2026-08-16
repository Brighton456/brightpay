
-- ====================================================================
-- PHASE 1: Admin Financial Controls Infrastructure
-- ====================================================================

-- 1. Admin profit wallets
CREATE TABLE public.admin_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL UNIQUE CHECK (kind IN ('platform','swiftwallet','makamesco','mpay')),
  balance numeric NOT NULL DEFAULT 0,
  archived_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_wallets TO authenticated;
GRANT ALL ON public.admin_wallets TO service_role;
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read admin wallets" ON public.admin_wallets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage admin wallets" ON public.admin_wallets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.admin_wallets (kind) VALUES ('platform'),('swiftwallet'),('makamesco'),('mpay');

-- 2. Provider fees (flat % per provider)
CREATE TABLE public.provider_fees (
  provider text PRIMARY KEY CHECK (provider IN ('swiftwallet','makamesco','mpay')),
  deposit_cost_pct numeric NOT NULL DEFAULT 0,
  deposit_fee_pct numeric NOT NULL DEFAULT 0,
  withdrawal_cost_pct numeric NOT NULL DEFAULT 0,
  withdrawal_fee_pct numeric NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_fees TO authenticated;
GRANT ALL ON public.provider_fees TO service_role;
ALTER TABLE public.provider_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads provider fees" ON public.provider_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage provider fees" ON public.provider_fees FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.provider_fees (provider, deposit_cost_pct, deposit_fee_pct, withdrawal_cost_pct, withdrawal_fee_pct) VALUES
  ('swiftwallet', 0, 0, 0, 0),
  ('mpay', 10, 15, 10, 15),
  ('makamesco', 0, 10, 8, 15);

-- 3. Audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES auth.users(id),
  action text NOT NULL,
  payload jsonb,
  result jsonb,
  reverted_at timestamptz,
  reverted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 4. Archive snapshots
CREATE TABLE public.archive_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  wallet_totals jsonb,
  admin_wallet_totals jsonb,
  tx_count integer NOT NULL DEFAULT 0,
  note text
);
GRANT SELECT ON public.archive_snapshots TO authenticated;
GRANT ALL ON public.archive_snapshots TO service_role;
ALTER TABLE public.archive_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read snapshots" ON public.archive_snapshots FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add archive markers
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS archive_snapshot_id uuid REFERENCES public.archive_snapshots(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS profit_allocated boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_tx_archived ON public.transactions(archived_at);

-- ====================================================================
-- 6. RPC: archive everything
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_archive_all(p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snap_id uuid;
  v_wallet_totals jsonb;
  v_admin_totals jsonb;
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'type', type, 'balance', balance))
  INTO v_wallet_totals FROM public.wallets WHERE balance > 0;

  SELECT jsonb_agg(jsonb_build_object('kind', kind, 'balance', balance))
  INTO v_admin_totals FROM public.admin_wallets WHERE balance > 0;

  SELECT COUNT(*) INTO v_count FROM public.transactions WHERE archived_at IS NULL;

  INSERT INTO public.archive_snapshots (created_by, wallet_totals, admin_wallet_totals, tx_count, note)
  VALUES (auth.uid(), v_wallet_totals, v_admin_totals, v_count, p_note)
  RETURNING id INTO v_snap_id;

  UPDATE public.transactions SET archived_at = now(), archive_snapshot_id = v_snap_id WHERE archived_at IS NULL;

  -- Zero user wallets (move balance to archived_balance via snapshot)
  UPDATE public.wallets SET balance = 0, updated_at = now();

  -- Move admin wallet balances to archived_balance and zero them
  UPDATE public.admin_wallets SET archived_balance = archived_balance + balance, balance = 0, updated_at = now();

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'archive_all', jsonb_build_object('note', p_note), jsonb_build_object('snapshot_id', v_snap_id, 'tx_count', v_count));

  RETURN v_snap_id;
END;
$$;

-- ====================================================================
-- 7. RPC: restore from snapshot
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_unarchive(p_snapshot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snap record;
  v_w jsonb;
  v_a jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_snap FROM public.archive_snapshots WHERE id = p_snapshot_id;
  IF v_snap.restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'Snapshot already restored';
  END IF;

  -- Restore user wallet balances (add to current — preserves new activity)
  IF v_snap.wallet_totals IS NOT NULL THEN
    FOR v_w IN SELECT * FROM jsonb_array_elements(v_snap.wallet_totals) LOOP
      UPDATE public.wallets
      SET balance = balance + (v_w->>'balance')::numeric, updated_at = now()
      WHERE user_id = (v_w->>'user_id')::uuid AND type = (v_w->>'type')::wallet_type;
    END LOOP;
  END IF;

  -- Restore admin wallets
  IF v_snap.admin_wallet_totals IS NOT NULL THEN
    FOR v_a IN SELECT * FROM jsonb_array_elements(v_snap.admin_wallet_totals) LOOP
      UPDATE public.admin_wallets
      SET balance = balance + (v_a->>'balance')::numeric,
          archived_balance = GREATEST(archived_balance - (v_a->>'balance')::numeric, 0),
          updated_at = now()
      WHERE kind = v_a->>'kind';
    END LOOP;
  END IF;

  -- Unarchive transactions
  UPDATE public.transactions SET archived_at = NULL WHERE archive_snapshot_id = p_snapshot_id;

  UPDATE public.archive_snapshots SET restored_at = now() WHERE id = p_snapshot_id;

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'unarchive', jsonb_build_object('snapshot_id', p_snapshot_id), jsonb_build_object('restored', true));
END;
$$;

-- ====================================================================
-- 8. RPC: allocate profit on completed transaction (called by finalize.ts)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_allocate_profit(p_tx_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_kind text;
  v_profit numeric;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id;
  IF NOT FOUND OR v_tx.profit_allocated OR v_tx.status <> 'completed' THEN RETURN; END IF;

  v_kind := COALESCE(v_tx.provider, 'swiftwallet');
  IF v_kind NOT IN ('swiftwallet','makamesco','mpay') THEN v_kind := 'platform'; END IF;

  -- Profit = fee charged to user - cost paid to provider
  -- Cost is implicit; we credit fee to provider wallet and platform absorbs cost separately.
  -- Simple model: credit fee to the provider wallet.
  v_profit := COALESCE(v_tx.fee, 0);
  IF v_profit > 0 THEN
    UPDATE public.admin_wallets SET balance = balance + v_profit, updated_at = now() WHERE kind = v_kind;
  END IF;

  -- Activation/manual fees go to platform
  IF v_tx.type::text = 'activation_fee' THEN
    UPDATE public.admin_wallets SET balance = balance + v_tx.amount, updated_at = now() WHERE kind = 'platform';
  END IF;

  UPDATE public.transactions SET profit_allocated = true WHERE id = p_tx_id;
END;
$$;

-- ====================================================================
-- 9. RPC: admin withdraw from profit wallet
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_withdraw_profit(p_kind text, p_amount numeric, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric;
  v_log_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT balance INTO v_bal FROM public.admin_wallets WHERE kind = p_kind FOR UPDATE;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'Unknown wallet kind'; END IF;
  IF v_bal < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.admin_wallets SET balance = balance - p_amount, updated_at = now() WHERE kind = p_kind;

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'withdraw_profit', jsonb_build_object('kind', p_kind, 'amount', p_amount, 'note', p_note), jsonb_build_object('new_balance', v_bal - p_amount))
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ====================================================================
-- 10. RPC: revert an audit action (best-effort)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_revert_audit(p_audit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_log FROM public.admin_audit_log WHERE id = p_audit_id;
  IF v_log.reverted_at IS NOT NULL THEN RAISE EXCEPTION 'Already reverted'; END IF;

  IF v_log.action = 'withdraw_profit' THEN
    UPDATE public.admin_wallets SET balance = balance + (v_log.payload->>'amount')::numeric WHERE kind = v_log.payload->>'kind';
  ELSIF v_log.action = 'archive_all' THEN
    PERFORM public.admin_unarchive((v_log.result->>'snapshot_id')::uuid);
  END IF;

  UPDATE public.admin_audit_log SET reverted_at = now(), reverted_by = auth.uid() WHERE id = p_audit_id;
END;
$$;
