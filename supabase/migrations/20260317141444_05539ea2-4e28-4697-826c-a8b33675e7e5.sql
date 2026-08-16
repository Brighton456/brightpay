
-- Add grand_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'grand_admin';

-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS current_package_id uuid REFERENCES public.packages(id),
  ADD COLUMN IF NOT EXISTS package_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS withdrawal_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS referral_code text DEFAULT ('BP-' || substr(md5(random()::text), 1, 8));

-- Add price and description to packages
ALTER TABLE public.packages 
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- Add flagged column to transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_review_notes text;

-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  votes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read all feature requests" ON public.feature_requests FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can create own feature requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own feature requests" ON public.feature_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admins can manage all feature requests" ON public.feature_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert default platform settings for support
INSERT INTO public.platform_settings (key, value) VALUES 
  ('support_whatsapp', '0720363215'),
  ('support_prefilled_message', 'Hello BrightPay Support, I need help with'),
  ('platform_name', 'BrightPay'),
  ('ceo_name', 'Brighton Wanjala')
ON CONFLICT (key) DO NOTHING;

-- Clear existing packages and insert proper subscription tiers
DELETE FROM public.packages;
INSERT INTO public.packages (name, tx_limit, endpoint_limit, price, description, is_popular, features) VALUES
  ('Free', 1000, 3, 0, 'Perfect for getting started', false, '["1,000 API requests/month", "Standard support", "Basic analytics", "Up to 3 endpoints"]'::jsonb),
  ('Professional', 10000, 10, 1000, 'For growing businesses', false, '["10,000 API requests/month", "Priority support", "Advanced analytics", "Custom webhooks", "Up to 10 endpoints"]'::jsonb),
  ('Enterprise', 100000, 50, 10000, 'For large-scale operations', true, '["100,000 API requests/month", "24/7 Premium support", "Advanced analytics", "Custom webhooks", "Dedicated account manager", "Custom integrations", "Up to 50 endpoints"]'::jsonb),
  ('Elite', -1, -1, 50000, 'Unlimited everything', false, '["Unlimited API requests", "Dedicated infrastructure", "White-label options", "SLA guarantee", "Unlimited endpoints", "Custom development support"]'::jsonb);

-- Insert comprehensive fee tiers
DELETE FROM public.fees;
INSERT INTO public.fees (min_amount, max_amount, service_fee, withdrawal_fee) VALUES
  (1, 49, 0, 5),
  (50, 499, 5, 10),
  (500, 999, 6, 15),
  (1000, 1499, 8, 20),
  (1500, 2499, 12, 25),
  (2500, 3499, 13, 30),
  (3500, 4999, 16, 35),
  (5000, 7499, 21, 45),
  (7500, 9999, 23, 50),
  (10000, 14999, 26, 55),
  (15000, 19999, 35, 65),
  (20000, 34999, 45, 85),
  (35000, 49999, 55, 110),
  (50000, 149999, 75, 150),
  (150000, 249999, 85, 170),
  (250000, 349999, 95, 190),
  (350000, 549999, 110, 220),
  (550000, 749999, 150, 300),
  (750000, 999999, 200, 500);
