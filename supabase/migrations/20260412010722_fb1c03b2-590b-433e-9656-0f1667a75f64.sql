CREATE POLICY "Super admin can delete leads"
ON public.leads
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));