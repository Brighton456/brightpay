insert into public.platform_settings (key, value) values ('makamesco_deposit_destination','payments')
on conflict (key) do update set value = excluded.value, updated_at = now();