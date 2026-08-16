
-- Wallet increment function
CREATE OR REPLACE FUNCTION public.increment_wallet(p_user_id UUID, p_type wallet_type, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id AND type = p_type;
END;
$$;

-- Wallet decrement function
CREATE OR REPLACE FUNCTION public.decrement_wallet(p_user_id UUID, p_type wallet_type, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets SET balance = GREATEST(balance - p_amount, 0), updated_at = now()
  WHERE user_id = p_user_id AND type = p_type;
END;
$$;
