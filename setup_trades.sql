-- Crea la tabella per gli scambi
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_items TEXT[] DEFAULT '{}',
    receiver_items TEXT[] DEFAULT '{}',
    sender_accepted BOOLEAN DEFAULT FALSE,
    receiver_accepted BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere e modificare solo i propri scambi
CREATE POLICY "Users can view their trades" ON public.trades
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their trades" ON public.trades
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Funzione sicura per eseguire lo scambio (Anti-Cheat)
CREATE OR REPLACE FUNCTION public.execute_trade(p_trade_id UUID, p_item_prices JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trade RECORD;
    v_sender RECORD;
    v_receiver RECORD;
    v_sender_new_items TEXT[];
    v_receiver_new_items TEXT[];
    v_sender_refund INT := 0;
    v_receiver_refund INT := 0;
    v_item TEXT;
    v_price INT;
BEGIN
    -- Blocca la riga dello scambio per evitare race conditions
    SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id FOR UPDATE;
    
    IF v_trade.status != 'pending' THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Lo scambio non è più in corso.'); 
    END IF;
    
    IF NOT v_trade.sender_accepted OR NOT v_trade.receiver_accepted THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Entrambi gli utenti devono accettare.'); 
    END IF;

    -- Ottieni i profili bloccandoli per l'aggiornamento
    SELECT * INTO v_sender FROM public.profiles WHERE id = v_trade.sender_id FOR UPDATE;
    SELECT * INTO v_receiver FROM public.profiles WHERE id = v_trade.receiver_id FOR UPDATE;

    -- Verifica che possiedano realmente gli oggetti
    FOREACH v_item IN ARRAY v_trade.sender_items LOOP
        IF NOT (v_item = ANY(v_sender.purchased_decorations)) THEN 
            RETURN jsonb_build_object('success', false, 'error', 'Il mittente non possiede più uno degli oggetti.'); 
        END IF;
    END LOOP;
    
    FOREACH v_item IN ARRAY v_trade.receiver_items LOOP
        IF NOT (v_item = ANY(v_receiver.purchased_decorations)) THEN 
            RETURN jsonb_build_object('success', false, 'error', 'Il destinatario non possiede più uno degli oggetti.'); 
        END IF;
    END LOOP;

    -- Calcolo per il Mittente (Sender)
    v_sender_new_items := v_sender.purchased_decorations;
    -- Rimuovi gli oggetti dati
    FOREACH v_item IN ARRAY v_trade.sender_items LOOP
        v_sender_new_items := array_remove(v_sender_new_items, v_item);
    END LOOP;
    -- Aggiungi gli oggetti ricevuti o rimborsa se doppioni
    FOREACH v_item IN ARRAY v_trade.receiver_items LOOP
        IF v_item = ANY(v_sender_new_items) THEN
            v_price := COALESCE((p_item_prices->>v_item)::INT, 0);
            v_sender_refund := v_sender_refund + FLOOR(v_price / 2);
        ELSE
            v_sender_new_items := array_append(v_sender_new_items, v_item);
        END IF;
    END LOOP;

    -- Calcolo per il Destinatario (Receiver)
    v_receiver_new_items := v_receiver.purchased_decorations;
    -- Rimuovi gli oggetti dati
    FOREACH v_item IN ARRAY v_trade.receiver_items LOOP
        v_receiver_new_items := array_remove(v_receiver_new_items, v_item);
    END LOOP;
    -- Aggiungi gli oggetti ricevuti o rimborsa se doppioni
    FOREACH v_item IN ARRAY v_trade.sender_items LOOP
        IF v_item = ANY(v_receiver_new_items) THEN
            v_price := COALESCE((p_item_prices->>v_item)::INT, 0);
            v_receiver_refund := v_receiver_refund + FLOOR(v_price / 2);
        ELSE
            v_receiver_new_items := array_append(v_receiver_new_items, v_item);
        END IF;
    END LOOP;

    -- Disattiva l'equipaggiamento se l'oggetto è stato scambiato
    IF v_sender.avatar_decoration = ANY(v_trade.sender_items) THEN
        UPDATE public.profiles SET avatar_decoration = NULL WHERE id = v_trade.sender_id;
    END IF;
    IF v_receiver.avatar_decoration = ANY(v_trade.receiver_items) THEN
        UPDATE public.profiles SET avatar_decoration = NULL WHERE id = v_trade.receiver_id;
    END IF;

    -- Aggiorna i profili
    UPDATE public.profiles 
    SET purchased_decorations = v_sender_new_items, 
        digitalcardus = COALESCE(digitalcardus, 0) + v_sender_refund 
    WHERE id = v_trade.sender_id;

    UPDATE public.profiles 
    SET purchased_decorations = v_receiver_new_items, 
        digitalcardus = COALESCE(digitalcardus, 0) + v_receiver_refund 
    WHERE id = v_trade.receiver_id;

    -- Segna lo scambio come completato
    UPDATE public.trades SET status = 'completed', updated_at = NOW() WHERE id = p_trade_id;

    RETURN jsonb_build_object(
        'success', true, 
        'sender_refund', v_sender_refund, 
        'receiver_refund', v_receiver_refund
    );
END;
$$;