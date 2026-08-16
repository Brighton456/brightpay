
-- Re-create the missing trigger for new user profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Re-create the auto upgrade status trigger
CREATE OR REPLACE TRIGGER auto_upgrade_account_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_upgrade_status();

-- Re-create the endpoint limit trigger
CREATE OR REPLACE TRIGGER enforce_endpoint_limit_trigger
  BEFORE INSERT ON public.endpoints
  FOR EACH ROW EXECUTE FUNCTION public.enforce_endpoint_limit();

-- Add cost_per_transaction column to fees table for profit calculation
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS cost_per_transaction numeric NOT NULL DEFAULT 0;

-- Create channels table for multiple payment destinations
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  channel_type text NOT NULL DEFAULT 'till',
  business_number text,
  account_number text,
  bank_name text,
  bank_code text,
  status text NOT NULL DEFAULT 'pending',
  swiftwallet_channel_id text,
  admin_notes text,
  reviewed_by uuid,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own channels" ON public.channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own channels" ON public.channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own channels" ON public.channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own channels" ON public.channels FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all channels" ON public.channels FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
