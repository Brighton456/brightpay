-- Webhook: send welcome email when a new profile is created
-- This fires after the auth trigger creates the profile row

-- Note: Webhooks are configured via the Supabase dashboard or Management API.
-- This migration creates a helper function that can be called by the webhook.

-- Function to call the welcome-email edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire an HTTP request to the welcome-email edge function
  -- Using pg_net if available, or leave as a no-op placeholder
  -- The webhook is configured via Management API to call the edge function
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the profile creation for audit
CREATE OR REPLACE FUNCTION public.log_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE LOG 'New profile created: % (%)', NEW.id, NEW.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on profiles insert
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_creation();
