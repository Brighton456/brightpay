CREATE OR REPLACE FUNCTION public.admin_archive_all(p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Zero user wallets (WHERE id IS NOT NULL satisfies safe-update mode)
  UPDATE public.wallets SET balance = 0, updated_at = now() WHERE id IS NOT NULL AND balance <> 0;

  -- Move admin wallet balances to archived_balance
  UPDATE public.admin_wallets SET archived_balance = archived_balance + balance, balance = 0, updated_at = now() WHERE id IS NOT NULL AND balance <> 0;

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'archive_all', jsonb_build_object('note', p_note), jsonb_build_object('snapshot_id', v_snap_id, 'tx_count', v_count));

  RETURN v_snap_id;
END;
$function$;