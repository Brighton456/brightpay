
CREATE OR REPLACE FUNCTION public.card_settle_charge(p_card_id uuid, p_amount_usd numeric, p_merchant text, p_ref text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card record; v_rate numeric; v_markup numeric; v_kes numeric; v_bal numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_card FROM public.virtual_cards WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;

  SELECT value::numeric INTO v_rate FROM public.platform_settings WHERE key = 'fx_kes_per_usd';
  SELECT value::numeric INTO v_markup FROM public.platform_settings WHERE key = 'card_fx_markup_pct';
  v_rate := COALESCE(v_rate, 135); v_markup := COALESCE(v_markup, 2.5);
  v_kes := round(p_amount_usd * v_rate * (1 + v_markup/100), 2);

  IF v_card.type = 'postpaid' THEN
    UPDATE public.virtual_cards SET credit_used_usd = credit_used_usd + p_amount_usd, updated_at = now() WHERE id = p_card_id;
    SELECT balance INTO v_bal FROM public.wallets WHERE user_id = v_card.user_id AND type = 'income';
    IF COALESCE(v_bal,0) >= v_kes THEN
      UPDATE public.wallets SET balance = balance - v_kes, updated_at = now() WHERE user_id = v_card.user_id AND type = 'income';
      UPDATE public.virtual_cards SET credit_used_usd = GREATEST(credit_used_usd - p_amount_usd, 0) WHERE id = p_card_id;
    END IF;
  ELSE
    UPDATE public.virtual_cards SET balance_usd = GREATEST(balance_usd - p_amount_usd, 0), updated_at = now() WHERE id = p_card_id;
  END IF;

  INSERT INTO public.card_transactions(card_id, user_id, kind, amount_usd, amount_kes, fx_rate, merchant, description, status, flw_reference)
  VALUES (p_card_id, v_card.user_id, 'charge', p_amount_usd, v_kes, v_rate*(1+v_markup/100), p_merchant, 'Card purchase', 'completed', p_ref);

  RETURN jsonb_build_object('ok', true);
END; $$;
