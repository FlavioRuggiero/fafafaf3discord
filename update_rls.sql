-- Permette al proprietario di modificare i dettagli del server
CREATE POLICY "Gli utenti possono aggiornare i propri server" 
ON public.servers FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Permette al proprietario di eliminare il proprio server
CREATE POLICY "Gli utenti possono eliminare i propri server" 
ON public.servers FOR DELETE TO authenticated USING (auth.uid() = created_by);