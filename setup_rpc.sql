-- Questa funzione riceve un nome utente, controlla a chi appartiene e restituisce la sua email
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT u.email INTO v_email
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.first_name = p_username
    LIMIT 1;

    RETURN v_email;
END;
$$;