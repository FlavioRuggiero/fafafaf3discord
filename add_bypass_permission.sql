-- Aggiungi la colonna alla tabella server_roles
ALTER TABLE public.server_roles ADD COLUMN IF NOT EXISTS can_bypass_restrictions BOOLEAN DEFAULT false;

-- Aggiorna la funzione check_channel_rules per tenere conto del nuovo permesso
CREATE OR REPLACE FUNCTION public.check_channel_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_channel RECORD;
    v_server RECORD;
    v_last_msg_time TIMESTAMP WITH TIME ZONE;
    v_admin_id UUID;
    v_has_bypass BOOLEAN;
BEGIN
    -- Ignora le regole per i messaggi di sistema
    IF NEW.content = '<system:welcome>' OR NEW.content LIKE '<system:status>%' THEN
        RETURN NEW;
    END IF;

    -- Ottieni le info del canale
    SELECT * INTO v_channel FROM public.channels WHERE id = NEW.channel_id;
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Ottieni le info del server per verificare chi è il proprietario
    SELECT * INTO v_server FROM public.servers WHERE id = v_channel.server_id;

    -- Ottieni l'ID dell'admin globale
    v_admin_id := public.get_admin_id();

    -- Ignora le regole se l'utente è il proprietario del server o l'admin globale
    IF v_server.created_by = NEW.user_id OR NEW.user_id = v_admin_id THEN
        RETURN NEW;
    END IF;

    -- Controlla se l'utente ha il permesso di bypass
    SELECT EXISTS (
        SELECT 1 FROM public.server_member_roles smr
        JOIN public.server_roles sr ON smr.role_id = sr.id
        WHERE smr.server_id = v_server.id AND smr.user_id = NEW.user_id AND sr.can_bypass_restrictions = true
    ) INTO v_has_bypass;

    IF v_has_bypass THEN
        RETURN NEW;
    END IF;

    -- Regola 1: Canale bloccato
    IF v_channel.is_locked THEN
        RAISE EXCEPTION 'Questo canale è bloccato. Solo il proprietario può scrivere.';
    END IF;

    -- Regola 2: Cooldown (Slowmode)
    IF v_channel.cooldown > 0 THEN
        -- Trova l'ultimo messaggio inviato da questo utente in questo canale (escludendo i messaggi di sistema)
        SELECT created_at INTO v_last_msg_time
        FROM public.messages
        WHERE channel_id = NEW.channel_id AND user_id = NEW.user_id AND content != '<system:welcome>' AND content NOT LIKE '<system:status>%'
        ORDER BY created_at DESC
        LIMIT 1;

        -- Se esiste un messaggio precedente, controlla la differenza di tempo
        IF v_last_msg_time IS NOT NULL AND EXTRACT(EPOCH FROM (NOW() - v_last_msg_time)) < v_channel.cooldown THEN
            RAISE EXCEPTION 'Devi attendere prima di inviare un altro messaggio (Slowmode attiva).';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;