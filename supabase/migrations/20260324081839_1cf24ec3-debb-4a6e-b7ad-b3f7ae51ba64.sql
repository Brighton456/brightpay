
-- Re-create the trigger for new user profile/wallet creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: submit KYC (bypasses RLS restriction on kyc_status)
CREATE OR REPLACE FUNCTION public.submit_kyc(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET kyc_status = 'pending', updated_at = now()
  WHERE id = p_user_id AND id = p_user_id
    AND kyc_status IN ('not_submitted', 'rejected');
END;
$$;

-- Function: resubmit KYC (set back to not_submitted when rejected)
CREATE OR REPLACE FUNCTION public.resubmit_kyc(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET kyc_status = 'not_submitted', updated_at = now()
  WHERE id = p_user_id AND kyc_status = 'rejected';
END;
$$;

-- Function: activate account (atomic: deduct balance + update profile + record tx)
CREATE OR REPLACE FUNCTION public.activate_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_paid boolean;
BEGIN
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id AND type = 'service';
  SELECT activation_paid INTO v_paid FROM public.profiles WHERE id = p_user_id;

  IF COALESCE(v_paid, false) THEN
    RAISE EXCEPTION 'Account already activated';
  END IF;

  IF COALESCE(v_balance, 0) < 1000 THEN
    RAISE EXCEPTION 'Insufficient service wallet balance. Need KES 1,000.';
  END IF;

  UPDATE public.wallets SET balance = balance - 1000, updated_at = now()
  WHERE user_id = p_user_id AND type = 'service';

  UPDATE public.profiles
  SET activation_paid = true, account_status = 'active', updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, fee, status, wallet_type, external_reference)
  VALUES (p_user_id, 'activation_fee', 1000, 0, 'completed', 'service', 'ACTIVATION-' || extract(epoch from now())::text);
END;
$$;

-- Auto-upgrade account status trigger
CREATE OR REPLACE FUNCTION public.auto_upgrade_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- idle → beginner when KYC approved
  IF NEW.kyc_status = 'approved' AND OLD.kyc_status IS DISTINCT FROM 'approved' AND NEW.account_status = 'idle' THEN
    NEW.account_status := 'beginner';
  END IF;

  -- beginner → active when activation paid
  IF NEW.activation_paid = true AND OLD.activation_paid = false AND NEW.account_status = 'beginner' THEN
    NEW.account_status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_upgrade_account_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_upgrade_status();
