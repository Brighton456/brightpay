-- Seed provider settings (default: swiftwallet for all flows)
INSERT INTO public.platform_settings (key, value)
VALUES
  ('provider_deposits', 'swiftwallet'),
  ('provider_endpoints', 'swiftwallet'),
  ('provider_withdrawals', 'swiftwallet')
ON CONFLICT (key) DO NOTHING;

-- Allow authenticated users to read provider settings (so UI can show active provider)
DROP POLICY IF EXISTS "Users can read non-sensitive settings" ON public.platform_settings;
CREATE POLICY "Users can read non-sensitive settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (key = ANY (ARRAY[
  'support_whatsapp','support_prefilled_message','platform_name','maintenance_mode',
  'provider_deposits','provider_endpoints','provider_withdrawals'
]));

-- Provider-specific channel IDs
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS makamesco_settlement_id text,
  ADD COLUMN IF NOT EXISTS mpay_payment_id text;

-- Record which provider handled each transaction
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider text;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_status
  ON public.transactions (provider, status)
  WHERE status = 'pending';