-- Aggiorniamo la funzione che si attiva alla registrazione di un nuovo utente.
-- Inserendo CURRENT_DATE come last_reward_date, l'utente non riceverà il premio giornaliero per il suo primo giorno.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    avatar_url,
    last_reward_date
  )
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id,
    CURRENT_DATE
  );
  RETURN new;
END;
$$;