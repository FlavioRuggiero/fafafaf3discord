-- 1. Aggiungi le colonne dei permessi alla tabella server_roles
ALTER TABLE public.server_roles
ADD COLUMN IF NOT EXISTS can_manage_channels BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_messages BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_use_commands BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_server BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_roles BOOLEAN DEFAULT false;

-- 2. Crea una funzione helper per verificare i permessi di un utente in un server
CREATE OR REPLACE FUNCTION public.has_server_permission(p_server_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_has_role BOOLEAN;
BEGIN
  -- Controlla se è il proprietario del server
  SELECT EXISTS (SELECT 1 FROM public.servers WHERE id = p_server_id AND created_by = auth.uid()) INTO v_is_owner;
  IF v_is_owner THEN RETURN TRUE; END IF;

  -- Controlla se ha un ruolo con il permesso richiesto
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON smr.role_id = sr.id
      WHERE smr.server_id = $1 AND smr.user_id = $2 AND sr.%I = true
    )
  ', p_permission) INTO v_has_role USING p_server_id, auth.uid();

  RETURN v_has_role;
END;
$$;

-- 3. Crea una funzione helper per i canali (ricava il server_id dal canale)
CREATE OR REPLACE FUNCTION public.has_channel_permission(p_channel_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_server_id UUID;
BEGIN
  SELECT server_id INTO v_server_id FROM public.channels WHERE id = p_channel_id;
  IF v_server_id IS NULL THEN RETURN FALSE; END IF;
  RETURN public.has_server_permission(v_server_id, p_permission);
END;
$$;

-- 4. Aggiorna le policy per i Canali
DROP POLICY IF EXISTS "Tutti possono creare canali" ON public.channels;
CREATE POLICY "Permesso creazione canali" ON public.channels FOR INSERT WITH CHECK (
  public.has_server_permission(server_id, 'can_manage_channels')
);

DROP POLICY IF EXISTS "I proprietari possono aggiornare canali" ON public.channels;
CREATE POLICY "Permesso aggiornamento canali" ON public.channels FOR UPDATE USING (
  public.has_server_permission(server_id, 'can_manage_channels')
);

DROP POLICY IF EXISTS "I proprietari possono eliminare canali" ON public.channels;
CREATE POLICY "Permesso eliminazione canali" ON public.channels FOR DELETE USING (
  public.has_server_permission(server_id, 'can_manage_channels')
);

-- 5. Aggiorna le policy per i Ruoli
DROP POLICY IF EXISTS "Solo i proprietari possono gestire i ruoli" ON public.server_roles;
CREATE POLICY "Permesso gestione ruoli" ON public.server_roles FOR ALL USING (
  public.has_server_permission(server_id, 'can_manage_roles')
);

DROP POLICY IF EXISTS "Solo i proprietari possono assegnare ruoli" ON public.server_member_roles;
CREATE POLICY "Permesso assegnazione ruoli" ON public.server_member_roles FOR ALL USING (
  public.has_server_permission(server_id, 'can_manage_roles')
);

-- 6. Aggiorna le policy per i Server
DROP POLICY IF EXISTS "Gli utenti possono aggiornare i propri server" ON public.servers;
CREATE POLICY "Permesso aggiornamento server" ON public.servers FOR UPDATE USING (
  created_by = auth.uid() OR public.has_server_permission(id, 'can_manage_server')
);

-- 7. Aggiorna le policy per i Messaggi (Eliminazione)
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages FOR DELETE USING (
  auth.uid() = user_id OR public.has_channel_permission(channel_id, 'can_delete_messages')
);