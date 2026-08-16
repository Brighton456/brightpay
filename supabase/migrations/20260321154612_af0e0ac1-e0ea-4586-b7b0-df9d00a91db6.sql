
-- Backfill profile for existing user
INSERT INTO public.profiles (id, full_name, phone)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', ''), COALESCE(raw_user_meta_data->>'phone', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Backfill wallets
INSERT INTO public.wallets (user_id, type, balance)
SELECT u.id, 'income', 0.00
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.wallets WHERE type = 'income')
ON CONFLICT DO NOTHING;

INSERT INTO public.wallets (user_id, type, balance)
SELECT u.id, 'service', 20.00
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.wallets WHERE type = 'service')
ON CONFLICT DO NOTHING;

-- Backfill user role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'user')
ON CONFLICT DO NOTHING;
