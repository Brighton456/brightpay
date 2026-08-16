
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own safe fields" ON public.profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    banned = (SELECT p.banned FROM public.profiles p WHERE p.id = auth.uid()) AND
    kyc_status = (SELECT p.kyc_status FROM public.profiles p WHERE p.id = auth.uid()) AND
    activation_paid = (SELECT p.activation_paid FROM public.profiles p WHERE p.id = auth.uid()) AND
    account_status = (SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid()) AND
    flagged = (SELECT p.flagged FROM public.profiles p WHERE p.id = auth.uid()) AND
    withdrawal_review_required = (SELECT p.withdrawal_review_required FROM public.profiles p WHERE p.id = auth.uid()) AND
    can_deposit = (SELECT p.can_deposit FROM public.profiles p WHERE p.id = auth.uid()) AND
    can_withdraw = (SELECT p.can_withdraw FROM public.profiles p WHERE p.id = auth.uid()) AND
    can_create_endpoints = (SELECT p.can_create_endpoints FROM public.profiles p WHERE p.id = auth.uid())
  );
