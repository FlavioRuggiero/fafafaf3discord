-- Funzione per rubare un oggetto (chiamata quando la vittima perde il minigioco)
CREATE OR REPLACE FUNCTION public.steal_item(p_attacker_id uuid, p_victim_id uuid, p_item_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_victim_items text[];
    v_attacker_items text[];
BEGIN
    -- Ottieni gli oggetti della vittima
    SELECT purchased_decorations INTO v_victim_items FROM public.profiles WHERE id = p_victim_id;

    -- Controlla se la vittima possiede effettivamente l'oggetto
    IF NOT (p_item_id = ANY(v_victim_items)) THEN
        RETURN false;
    END IF;

    -- Rimuovi l'oggetto dalla vittima
    UPDATE public.profiles
    SET purchased_decorations = array_remove(purchased_decorations, p_item_id)
    WHERE id = p_victim_id;

    -- Aggiungi l'oggetto all'attaccante
    SELECT purchased_decorations INTO v_attacker_items FROM public.profiles WHERE id = p_attacker_id;
    UPDATE public.profiles
    SET purchased_decorations = array_append(v_attacker_items, p_item_id)
    WHERE id = p_attacker_id;

    -- Rimuovi l'equipaggiamento se la vittima lo stava usando
    UPDATE public.profiles SET avatar_decoration = NULL WHERE id = p_victim_id AND avatar_decoration = p_item_id;
    UPDATE public.profiles SET active_cursor = NULL WHERE id = p_victim_id AND active_cursor = p_item_id;

    RETURN true;
END;
$$;