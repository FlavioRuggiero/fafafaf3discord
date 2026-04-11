-- Aggiungi colonna xp e last_reward_date se non esistono
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reward_date DATE;

-- Funzione per riscattare le ricompense giornaliere
CREATE OR REPLACE FUNCTION public.claim_daily_reward(user_id_param UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_xp_needed INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_rewarded BOOLEAN := FALSE;
BEGIN
  -- Blocca la riga per prevenire race conditions
  SELECT * INTO v_profile FROM profiles WHERE id = user_id_param FOR UPDATE;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Controlla se la ricompensa è già stata riscattata oggi
  IF v_profile.last_reward_date IS NULL OR v_profile.last_reward_date < CURRENT_DATE THEN
    -- Aggiungi premi base
    v_profile.xp := COALESCE(v_profile.xp, 0) + 5;
    v_profile.digitalcardus := COALESCE(v_profile.digitalcardus, 25) + 3;
    v_profile.last_reward_date := CURRENT_DATE;
    v_rewarded := TRUE;

    -- Logica Level Up: Livello * 5
    LOOP
      v_xp_needed := COALESCE(v_profile.level, 1) * 5;
      EXIT WHEN v_profile.xp < v_xp_needed;

      v_profile.xp := v_profile.xp - v_xp_needed;
      v_profile.level := COALESCE(v_profile.level, 1) + 1;
      v_leveled_up := TRUE;
    END LOOP;

    -- Aggiorna il database
    UPDATE profiles
    SET xp = v_profile.xp,
        level = v_profile.level,
        digitalcardus = v_profile.digitalcardus,
        last_reward_date = v_profile.last_reward_date
    WHERE id = user_id_param;
  END IF;

  RETURN json_build_object(
    'rewarded', v_rewarded,
    'leveled_up', v_leveled_up,
    'new_level', v_profile.level,
    'new_xp', v_profile.xp,
    'new_digitalcardus', v_profile.digitalcardus
  );
END;
$$;