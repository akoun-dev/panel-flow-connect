-- Allow panelists to update their own questions
CREATE POLICY "Panelists can update their questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (panelist_email = (auth.jwt() ->> 'email'))
WITH CHECK (panelist_email = (auth.jwt() ->> 'email'));
