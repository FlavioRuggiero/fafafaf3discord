DO $$
DECLARE
    v_dec_id text;
    v_admin_id uuid;
BEGIN
    -- Trova l'ID del contorno "Braccia Robotiche"
    SELECT id INTO v_dec_id FROM public.custom_decorations WHERE name ILIKE '%Braccia Robotiche%' LIMIT 1;
    
    -- Trova l'ID del tuo utente admin
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'fafetto05@gmail.com' LIMIT 1;
    
    IF v_dec_id IS NOT NULL AND v_admin_id IS NOT NULL THEN
        -- Aggiunge l'oggetto all'array purchased_decorations se non è già presente
        UPDATE public.profiles 
        SET purchased_decorations = array_append(
            array_remove(purchased_decorations, v_dec_id), 
            v_dec_id
        )
        WHERE id = v_admin_id;
    END IF;
END $$;