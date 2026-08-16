-- Add separate cost columns for service and withdrawal
ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS service_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withdrawal_cost numeric NOT NULL DEFAULT 0;

-- Migrate existing cost_per_transaction to service_cost
UPDATE public.fees SET service_cost = cost_per_transaction, withdrawal_cost = cost_per_transaction WHERE cost_per_transaction > 0;

-- Recreate missing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS auto_upgrade_account_status ON public.profiles;
CREATE TRIGGER auto_upgrade_account_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_upgrade_status();

DROP TRIGGER IF EXISTS enforce_endpoint_limit ON public.endpoints;
CREATE TRIGGER enforce_endpoint_limit
  BEFORE INSERT ON public.endpoints
  FOR EACH ROW EXECUTE FUNCTION public.enforce_endpoint_limit();