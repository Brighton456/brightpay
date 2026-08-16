-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO public USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read active announcements" ON public.announcements FOR SELECT TO authenticated USING (is_active = true);

-- Update handle_new_user to give 20 KES service wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''));
  
  INSERT INTO public.wallets (user_id, type, balance) VALUES (NEW.id, 'income', 0.00);
  INSERT INTO public.wallets (user_id, type, balance) VALUES (NEW.id, 'service', 20.00);
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;