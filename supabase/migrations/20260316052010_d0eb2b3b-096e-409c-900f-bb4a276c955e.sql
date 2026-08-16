
-- Create account status enum
CREATE TYPE public.account_status AS ENUM ('idle', 'beginner', 'active');

-- Create KYC status enum
CREATE TYPE public.kyc_status AS ENUM ('not_submitted', 'pending', 'approved', 'rejected');

-- Create transaction status enum
CREATE TYPE public.tx_status AS ENUM ('pending', 'completed', 'failed');

-- Create transaction type enum
CREATE TYPE public.tx_type AS ENUM ('deposit', 'withdrawal', 'endpoint', 'transfer', 'activation_fee');

-- Create wallet type enum
CREATE TYPE public.wallet_type AS ENUM ('income', 'service');

-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  account_status account_status NOT NULL DEFAULT 'idle',
  kyc_status kyc_status NOT NULL DEFAULT 'not_submitted',
  activation_paid BOOLEAN NOT NULL DEFAULT false,
  banned BOOLEAN NOT NULL DEFAULT false,
  can_deposit BOOLEAN NOT NULL DEFAULT true,
  can_withdraw BOOLEAN NOT NULL DEFAULT true,
  can_create_endpoints BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type wallet_type NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Endpoints table
CREATE TABLE public.endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT ('bp_ep_' || substr(md5(random()::text), 1, 16)),
  status TEXT NOT NULL DEFAULT 'active',
  total_collected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  successful_transactions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint_id UUID REFERENCES public.endpoints(id) ON DELETE SET NULL,
  type tx_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  phone TEXT,
  status tx_status NOT NULL DEFAULT 'pending',
  mpesa_receipt TEXT,
  external_reference TEXT,
  swiftwallet_checkout_id TEXT,
  callback_data JSONB,
  error_message TEXT,
  wallet_type wallet_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- KYC documents table
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL, -- 'id_front', 'id_back', 'kra_pin'
  file_url TEXT NOT NULL,
  status kyc_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Fee structure table
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_amount NUMERIC(12,2) NOT NULL,
  max_amount NUMERIC(12,2) NOT NULL,
  service_fee NUMERIC(12,2) NOT NULL,
  withdrawal_fee NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- Packages table
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tx_limit INTEGER NOT NULL DEFAULT 50,
  endpoint_limit INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Platform settings table
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user profile without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS account_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_status FROM public.profiles WHERE id = _user_id
$$;

-- RLS POLICIES

-- user_roles: users read own, admins read all
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles: users read/update own, admins read all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- wallets: users read own, admins read all
CREATE POLICY "Users can read own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all wallets" ON public.wallets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- endpoints: users CRUD own, admins read all
CREATE POLICY "Users can read own endpoints" ON public.endpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own endpoints" ON public.endpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own endpoints" ON public.endpoints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own endpoints" ON public.endpoints FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all endpoints" ON public.endpoints FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- transactions: users read own, admins read all
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- kyc_documents: users CRUD own, admins manage all
CREATE POLICY "Users can read own kyc" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kyc" ON public.kyc_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all kyc" ON public.kyc_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- fees: public read, admins manage
CREATE POLICY "Anyone can read fees" ON public.fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fees" ON public.fees FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- packages: public read, admins manage
CREATE POLICY "Anyone can read packages" ON public.packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- platform_settings: public read, admins manage
CREATE POLICY "Anyone can read settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile + wallets on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''));
  
  INSERT INTO public.wallets (user_id, type, balance) VALUES (NEW.id, 'income', 0.00);
  INSERT INTO public.wallets (user_id, type, balance) VALUES (NEW.id, 'service', 0.00);
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate fee for a given amount
CREATE OR REPLACE FUNCTION public.get_fee(p_amount NUMERIC, p_fee_type TEXT DEFAULT 'service')
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee NUMERIC := 0;
BEGIN
  IF p_fee_type = 'withdrawal' THEN
    SELECT withdrawal_fee INTO v_fee FROM public.fees WHERE p_amount >= min_amount AND p_amount <= max_amount LIMIT 1;
  ELSE
    SELECT service_fee INTO v_fee FROM public.fees WHERE p_amount >= min_amount AND p_amount <= max_amount LIMIT 1;
  END IF;
  RETURN COALESCE(v_fee, 0);
END;
$$;

-- Insert default fee structure
INSERT INTO public.fees (min_amount, max_amount, service_fee, withdrawal_fee) VALUES
  (1, 49, 0, 0),
  (50, 499, 6, 6),
  (500, 999, 10, 10),
  (1000, 4999, 15, 15),
  (5000, 49999, 25, 25),
  (50000, 999999, 50, 50);

-- Insert default packages
INSERT INTO public.packages (name, tx_limit, endpoint_limit, features) VALUES
  ('idle', 50, 0, '["Dashboard deposits", "Basic analytics", "Transaction history"]'),
  ('beginner', 500, 3, '["Payment endpoints", "Webhook callbacks", "CSV exports", "500 transactions/mo"]'),
  ('active', -1, -1, '["Unlimited endpoints", "Unlimited transactions", "Withdrawals", "Priority support", "PDF reports"]');

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('activation_fee', '1000'),
  ('kyc_review_hours', '48');

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
