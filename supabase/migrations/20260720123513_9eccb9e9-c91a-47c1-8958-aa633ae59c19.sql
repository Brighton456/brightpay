
-- Enums
DO $$ BEGIN
  CREATE TYPE public.card_type AS ENUM ('prepaid','postpaid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.card_status AS ENUM ('active','frozen','terminated','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- virtual_cards
CREATE TABLE IF NOT EXISTS public.virtual_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.card_type NOT NULL DEFAULT 'prepaid',
  currency text NOT NULL DEFAULT 'USD',
  brand text NOT NULL DEFAULT 'visa',
  flw_card_id text,
  flw_card_hash text,
  masked_pan text,
  last4 text,
  expiry_month text,
  expiry_year text,
  cardholder_name text NOT NULL,
  status public.card_status NOT NULL DEFAULT 'pending',
  balance_usd numeric NOT NULL DEFAULT 0,
  credit_limit_usd numeric NOT NULL DEFAULT 0,
  credit_used_usd numeric NOT NULL DEFAULT 0,
  design text NOT NULL DEFAULT 'aurora',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_cards TO authenticated;
GRANT ALL ON public.virtual_cards TO service_role;
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own cards" ON public.virtual_cards FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own cards" ON public.virtual_cards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own cards" ON public.virtual_cards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete cards" ON public.virtual_cards FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_vc_updated BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- card_transactions
CREATE TABLE IF NOT EXISTS public.card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL, -- fund | charge | refund | settle | fee
  amount_usd numeric NOT NULL DEFAULT 0,
  amount_kes numeric NOT NULL DEFAULT 0,
  fx_rate numeric,
  merchant text,
  description text,
  status text NOT NULL DEFAULT 'completed',
  flw_reference text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.card_transactions TO authenticated;
GRANT ALL ON public.card_transactions TO service_role;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own card tx" ON public.card_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "service inserts card tx" ON public.card_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Platform settings
INSERT INTO public.platform_settings(key, value) VALUES
  ('fx_kes_per_usd', '135'),
  ('card_fx_markup_pct', '2.5'),
  ('card_creation_fee_kes', '300'),
  ('cards_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Admin: set postpaid credit limit
CREATE OR REPLACE FUNCTION public.admin_set_card_limit(p_card_id uuid, p_limit_usd numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_limit_usd < 0 THEN RAISE EXCEPTION 'Limit must be >= 0'; END IF;
  UPDATE public.virtual_cards SET credit_limit_usd = p_limit_usd, updated_at = now() WHERE id = p_card_id;
  INSERT INTO public.admin_audit_log(actor, action, payload, result)
  VALUES (auth.uid(), 'set_card_limit', jsonb_build_object('card_id', p_card_id, 'limit', p_limit_usd), '{}'::jsonb);
END; $$;

-- Fund prepaid card: debit user's income wallet in KES, record tx (USD credit at FLW happens in edge fn)
CREATE OR REPLACE FUNCTION public.card_fund_from_wallet(p_card_id uuid, p_amount_usd numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card record;
  v_rate numeric;
  v_markup numeric;
  v_kes numeric;
  v_bal numeric;
BEGIN
  SELECT * INTO v_card FROM public.virtual_cards WHERE id = p_card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF v_card.user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_card.status <> 'active' THEN RAISE EXCEPTION 'Card not active'; END IF;
  IF v_card.type <> 'prepaid' THEN RAISE EXCEPTION 'Only prepaid cards can be funded'; END IF;
  IF p_amount_usd <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT value::numeric INTO v_rate FROM public.platform_settings WHERE key = 'fx_kes_per_usd';
  SELECT value::numeric INTO v_markup FROM public.platform_settings WHERE key = 'card_fx_markup_pct';
  v_rate := COALESCE(v_rate, 135);
  v_markup := COALESCE(v_markup, 2.5);
  v_kes := round(p_amount_usd * v_rate * (1 + v_markup/100), 2);

  SELECT balance INTO v_bal FROM public.wallets WHERE user_id = v_card.user_id AND type = 'income';
  IF COALESCE(v_bal,0) < v_kes THEN RAISE EXCEPTION 'Insufficient income wallet. Need KES %', v_kes; END IF;

  UPDATE public.wallets SET balance = balance - v_kes, updated_at = now()
    WHERE user_id = v_card.user_id AND type = 'income';
  UPDATE public.virtual_cards SET balance_usd = balance_usd + p_amount_usd, updated_at = now()
    WHERE id = p_card_id;

  INSERT INTO public.card_transactions(card_id, user_id, kind, amount_usd, amount_kes, fx_rate, description, status)
  VALUES (p_card_id, v_card.user_id, 'fund', p_amount_usd, v_kes, v_rate * (1 + v_markup/100), 'Card top-up', 'completed');

  RETURN jsonb_build_object('ok', true, 'amount_usd', p_amount_usd, 'debited_kes', v_kes);
END; $$;

-- Settle postpaid charge: debit income wallet in KES for a USD charge, mark credit_used
CREATE OR REPLACE FUNCTION public.card_settle_charge(p_card_id uuid, p_amount_usd numeric, p_merchant text, p_ref text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card record; v_rate numeric; v_markup numeric; v_kes numeric; v_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_card FROM public.virtual_cards WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;

  SELECT value::numeric INTO v_rate FROM public.platform_settings WHERE key = 'fx_kes_per_usd';
  SELECT value::numeric INTO v_markup FROM public.platform_settings WHERE key = 'card_fx_markup_pct';
  v_rate := COALESCE(v_rate, 135); v_markup := COALESCE(v_markup, 2.5);
  v_kes := round(p_amount_usd * v_rate * (1 + v_markup/100), 2);

  IF v_card.type = 'postpaid' THEN
    UPDATE public.virtual_cards SET credit_used_usd = credit_used_usd + p_amount_usd, updated_at = now() WHERE id = p_card_id;
  ELSE
    UPDATE public.virtual_cards SET balance_usd = GREATEST(balance_usd - p_amount_usd, 0), updated_at = now() WHERE id = p_card_id;
  END IF;

  SELECT balance INTO v_bal FROM public.wallets WHERE user_id = v_card.user_id AND type = 'income';
  IF v_card.type = 'postpaid' AND COALESCE(v_bal,0) >= v_kes THEN
    UPDATE public.wallets SET balance = balance - v_kes, updated_at = now() WHERE user_id = v_card.user_id AND type = 'income';
    UPDATE public.virtual_cards SET credit_used_usd = GREATEST(credit_used_usd - p_amount_usd, 0) WHERE id = p_card_id;
  END IF;

  INSERT INTO public.card_transactions(card_id, user_id, kind, amount_usd, amount_kes, fx_rate, merchant, description, status, flw_reference)
  VALUES (p_card_id, v_card.user_id, 'charge', p_amount_usd, v_kes, v_rate*(1+v_markup/100), p_merchant, 'Card purchase', 'completed', p_ref);

  RETURN jsonb_build_object('ok', true);
END; $$;
