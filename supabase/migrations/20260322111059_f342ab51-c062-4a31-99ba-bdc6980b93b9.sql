
-- 1. Fix PRIVILEGE ESCALATION: Restrict user_roles INSERT/UPDATE/DELETE to admins only
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix KYC status manipulation: Replace permissive update policy
DROP POLICY "Users can update own kyc" ON public.kyc_documents;

CREATE POLICY "Users can update own kyc safe fields" ON public.kyc_documents
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    status = (SELECT kd.status FROM public.kyc_documents kd WHERE kd.id = kyc_documents.id) AND
    reviewed_by IS NOT DISTINCT FROM (SELECT kd.reviewed_by FROM public.kyc_documents kd WHERE kd.id = kyc_documents.id) AND
    admin_notes IS NOT DISTINCT FROM (SELECT kd.admin_notes FROM public.kyc_documents kd WHERE kd.id = kyc_documents.id)
  );

-- 3. Restrict platform_settings read to non-sensitive keys
DROP POLICY "Anyone can read settings" ON public.platform_settings;

CREATE POLICY "Users can read non-sensitive settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (key IN ('support_whatsapp', 'support_prefilled_message', 'platform_name', 'maintenance_mode'));
