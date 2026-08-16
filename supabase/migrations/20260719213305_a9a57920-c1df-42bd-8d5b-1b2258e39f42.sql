
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.user_daraja_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  business_short_code text,
  party_b text,
  b2c_short_code text,
  b2c_initiator_name text,
  consumer_key_enc text,
  consumer_secret_enc text,
  passkey_enc text,
  b2c_security_credential_enc text,
  stk_enabled boolean NOT NULL DEFAULT false,
  b2c_enabled boolean NOT NULL DEFAULT false,
  c2b_enabled boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_daraja_credentials TO authenticated;
GRANT ALL ON public.user_daraja_credentials TO service_role;

ALTER TABLE public.user_daraja_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own daraja creds - select"
  ON public.user_daraja_credentials FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own daraja creds - insert"
  ON public.user_daraja_credentials FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own daraja creds - update"
  ON public.user_daraja_credentials FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own daraja creds - delete"
  ON public.user_daraja_credentials FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_user_daraja_updated_at
  BEFORE UPDATE ON public.user_daraja_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE VIEW public.user_daraja_credentials_public
WITH (security_invoker = true) AS
SELECT id, user_id, environment, business_short_code, party_b,
       b2c_short_code, b2c_initiator_name,
       (consumer_key_enc IS NOT NULL) AS has_consumer_key,
       (consumer_secret_enc IS NOT NULL) AS has_consumer_secret,
       (passkey_enc IS NOT NULL) AS has_passkey,
       (b2c_security_credential_enc IS NOT NULL) AS has_b2c_security_credential,
       stk_enabled, b2c_enabled, c2b_enabled,
       verified, last_tested_at, last_test_result,
       created_at, updated_at
FROM public.user_daraja_credentials;
GRANT SELECT ON public.user_daraja_credentials_public TO authenticated;

ALTER TABLE public.endpoints
  ADD COLUMN IF NOT EXISTS integration_type text NOT NULL DEFAULT 'platform'
  CHECK (integration_type IN ('platform','daraja_own'));

INSERT INTO public.platform_settings (key, value)
VALUES ('daraja_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.provider_fee_tiers (provider, direction, min_amount, max_amount, fee_amount, cost_amount, enabled)
VALUES
  ('daraja_own','deposit',    1,    99,      2,   0, true),
  ('daraja_own','deposit',  100,   499,      3,   0, true),
  ('daraja_own','deposit',  500,   999,      5,   0, true),
  ('daraja_own','deposit', 1000,  4999,      8,   0, true),
  ('daraja_own','deposit', 5000, 999999,    15,   0, true),
  ('daraja_own','withdrawal',    1,   999,   5,  0, true),
  ('daraja_own','withdrawal', 1000,  4999,  10,  0, true),
  ('daraja_own','withdrawal', 5000, 19999,  20,  0, true),
  ('daraja_own','withdrawal',20000,999999,  30,  0, true)
ON CONFLICT DO NOTHING;
