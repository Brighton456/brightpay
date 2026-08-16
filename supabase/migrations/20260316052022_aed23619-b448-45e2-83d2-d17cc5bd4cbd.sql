
-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage policies for kyc-documents bucket
CREATE POLICY "Users can upload own kyc docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read own kyc docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all kyc docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));
