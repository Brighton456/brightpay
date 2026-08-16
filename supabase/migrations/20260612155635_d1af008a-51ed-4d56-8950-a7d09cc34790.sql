
-- Verification source on transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS verified_via text;
COMMENT ON COLUMN public.transactions.verified_via IS 'webhook | polling | sync | manual';

-- Per-user gateway permissions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled_providers text[] NOT NULL DEFAULT '{}'::text[];

-- Default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('makamesco_deposit_destination', 'payments'),
  ('mpay_default_payment_id', '')
ON CONFLICT (key) DO NOTHING;

-- Admin reconciliation RPC for withdrawals that were paid out by provider but
-- not finalised in our DB (pending or failed locally, completed at provider).
CREATE OR REPLACE FUNCTION public.admin_reconcile_withdrawal(
  p_tx_id uuid,
  p_receipt text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_announce boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_action text;
  v_msg text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_tx.type::text <> 'withdrawal' THEN RAISE EXCEPTION 'Only withdrawals can be reconciled here'; END IF;
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'action', 'noop', 'message', 'Already completed');
  END IF;

  -- If status='failed' the wallets were refunded; re-deduct.
  -- If status='pending' the wallets were already deducted at request time.
  IF v_tx.status = 'failed' THEN
    PERFORM public.decrement_wallet(v_tx.user_id, 'income'::wallet_type, v_tx.amount);
    IF COALESCE(v_tx.fee,0) > 0 THEN
      PERFORM public.decrement_wallet(v_tx.user_id, 'service'::wallet_type, v_tx.fee);
    END IF;
    v_action := 'rededucted_and_completed';
  ELSE
    v_action := 'marked_completed';
  END IF;

  UPDATE public.transactions SET
    status = 'completed',
    mpesa_receipt = COALESCE(NULLIF(p_receipt,''), mpesa_receipt),
    verified_via = 'manual',
    admin_review_notes = COALESCE(p_note, admin_review_notes),
    updated_at = now()
  WHERE id = p_tx_id;

  BEGIN PERFORM public.admin_allocate_profit(p_tx_id); EXCEPTION WHEN OTHERS THEN NULL; END;

  IF p_announce THEN
    v_msg := format(
      'A withdrawal of KES %s to %s was successfully paid by our partner but had not been recorded as completed in your account. We have now reconciled it: KES %s was deducted from your income wallet and KES %s service fee from your service wallet. Reference: %s.',
      v_tx.amount::text, v_tx.phone, v_tx.amount::text, COALESCE(v_tx.fee,0)::text,
      COALESCE(p_receipt, v_tx.external_reference, v_tx.id::text)
    );
    INSERT INTO public.announcements (title, content, created_by, audience, is_active)
    VALUES ('Withdrawal reconciled', v_msg, auth.uid(), 'user:' || v_tx.user_id::text, true);
  END IF;

  INSERT INTO public.admin_audit_log (actor, action, payload, result)
  VALUES (auth.uid(), 'reconcile_withdrawal',
    jsonb_build_object('tx_id', p_tx_id, 'receipt', p_receipt, 'note', p_note),
    jsonb_build_object('action', v_action));

  RETURN jsonb_build_object('ok', true, 'action', v_action);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reconcile_withdrawal(uuid, text, text, boolean) TO authenticated;
