
ALTER TABLE public.archive_snapshots ADD COLUMN IF NOT EXISTS endpoint_totals jsonb;

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
  v_endpoint_totals jsonb;
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'type', type, 'balance', balance))
  INTO v_wallet_totals FROM public.wallets WHERE balance > 0;

  SELECT jsonb_agg(jsonb_build_object('kind', kind, 'balance', balance))
  INTO v_admin_totals FROM public.admin_wallets WHERE balance > 0;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'total_collected', total_collected,
    'total_transactions', total_transactions,
    'successful_transactions', successful_transactions
  )) INTO v_endpoint_totals
  FROM public.endpoints
  WHERE total_transactions > 0 OR total_collected > 0;

  SELECT COUNT(*) INTO v_count FROM public.transactions WHERE archived_at IS NULL;

  INSERT INTO public.archive_snapshots (created_by, wallet_totals, admin_wallet_totals, endpoint_totals, tx_count, note)
  VALUES (auth.uid(), v_wallet_totals, v_admin_totals, v_endpoint_totals, v_count, p_note)
  RETURNING id INTO v_snap_id;

  UPDATE public.transactions SET archived_at = now(), archive_snapshot_id = v_snap_id WHERE archived_at IS NULL;

  UPDATE public.wallets SET balance = 0, updated_at = now() WHERE id IS NOT NULL AND balance <> 0;

  UPDATE public.admin_wallets SET archived_balance = archived_balance + balance, balance = 0, updated_at = now()
  WHERE id IS NOT NULL AND balance <> 0;

  UPDATE public.endpoints
  SET total_collected = 0, total_transactions = 0, successful_transactions = 0, updated_at = now()
  WHERE id IS NOT NULL AND (total_transactions <> 0 OR total_collected <> 0);

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'archive_all', jsonb_build_object('note', p_note), jsonb_build_object('snapshot_id', v_snap_id, 'tx_count', v_count));

  RETURN v_snap_id;
END;
$$;

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
  v_e jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_snap FROM public.archive_snapshots WHERE id = p_snapshot_id;
  IF v_snap.restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'Snapshot already restored';
  END IF;

  IF v_snap.wallet_totals IS NOT NULL THEN
    FOR v_w IN SELECT * FROM jsonb_array_elements(v_snap.wallet_totals) LOOP
      UPDATE public.wallets
      SET balance = balance + (v_w->>'balance')::numeric, updated_at = now()
      WHERE user_id = (v_w->>'user_id')::uuid AND type = (v_w->>'type')::wallet_type;
    END LOOP;
  END IF;

  IF v_snap.admin_wallet_totals IS NOT NULL THEN
    FOR v_a IN SELECT * FROM jsonb_array_elements(v_snap.admin_wallet_totals) LOOP
      UPDATE public.admin_wallets
      SET balance = balance + (v_a->>'balance')::numeric,
          archived_balance = GREATEST(archived_balance - (v_a->>'balance')::numeric, 0),
          updated_at = now()
      WHERE kind = v_a->>'kind';
    END LOOP;
  END IF;

  IF v_snap.endpoint_totals IS NOT NULL THEN
    FOR v_e IN SELECT * FROM jsonb_array_elements(v_snap.endpoint_totals) LOOP
      UPDATE public.endpoints
      SET total_collected = total_collected + (v_e->>'total_collected')::numeric,
          total_transactions = total_transactions + (v_e->>'total_transactions')::integer,
          successful_transactions = successful_transactions + (v_e->>'successful_transactions')::integer,
          updated_at = now()
      WHERE id = (v_e->>'id')::uuid;
    END LOOP;
  END IF;

  UPDATE public.transactions SET archived_at = NULL, archive_snapshot_id = NULL WHERE archive_snapshot_id = p_snapshot_id;

  UPDATE public.archive_snapshots SET restored_at = now() WHERE id = p_snapshot_id;

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'unarchive', jsonb_build_object('snapshot_id', p_snapshot_id), jsonb_build_object('restored', true));
END;
$$;

-- Allow a user to read their own archived balances + admin note
CREATE OR REPLACE FUNCTION public.get_my_archived_balances()
RETURNS TABLE(wallet_type text, balance numeric, note text, archived_at timestamptz, snapshot_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (w->>'type')::text AS wallet_type,
         (w->>'balance')::numeric AS balance,
         s.note,
         s.archived_at,
         s.id AS snapshot_id
  FROM public.archive_snapshots s,
       jsonb_array_elements(COALESCE(s.wallet_totals,'[]'::jsonb)) w
  WHERE s.restored_at IS NULL
    AND (w->>'user_id')::uuid = auth.uid()
    AND (w->>'balance')::numeric > 0
  ORDER BY s.archived_at DESC;
$$;
