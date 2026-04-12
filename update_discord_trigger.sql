-- Esegui questo script nell'SQL Editor di Supabase per aggiornare la funzione di registrazione

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    avatar_url,
    last_reward_date,
    email
  )
  VALUES (
    new.id,
    -- Cerca il nome utente in vari campi (Discord usa preferred_username, full_name o name)
    COALESCE(
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data #>> '{custom_claims, global_name}',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'last_name',
    -- Se Discord fornisce un avatar, usalo, altrimenti usa quello generato casualmente
    COALESCE(
      new.raw_user_meta_data ->> 'avatar_url',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
    ),
    CURRENT_DATE,
    new.email
  );
  RETURN new;
END;
$function$;