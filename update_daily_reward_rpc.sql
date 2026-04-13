CREATE OR REPLACE FUNCTION public.claim_daily_reward(user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_xp_needed INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_rewarded BOOLEAN := FALSE;
  v_base_xp INTEGER := 5;
  v_base_dc INTEGER := 3;
  v_bonus_multiplier NUMERIC := 1.0;
  v_earned_xp INTEGER;
  v_earned_dc INTEGER;
BEGIN
  -- Blocca la riga per prevenire race conditions
  SELECT * INTO v_profile FROM profiles WHERE id = user_id_param FOR UPDATE;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Controlla se la ricompensa è già stata riscattata oggi
  IF v_profile.last_reward_date IS NULL OR v_profile.last_reward_date < CURRENT_DATE THEN
    
    -- Controlla se ha il privilegio del bonus giornaliero
    IF 'privilege-daily-bonus' = ANY(v_profile.purchased_decorations) THEN
      v_bonus_multiplier := 1.2;
    END IF;

    v_earned_xp := CEIL(v_base_xp * v_bonus_multiplier);
    v_earned_dc := CEIL(v_base_dc * v_bonus_multiplier);

    -- Aggiungi premi base + eventuale bonus
    v_profile.xp := COALESCE(v_profile.xp, 0) + v_earned_xp;
    v_profile.digitalcardus := COALESCE(v_profile.digitalcardus, 25) + v_earned_dc;
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
    'new_digitalcardus', v_profile.digitalcardus,
    'earned_xp', v_earned_xp,
    'earned_dc', v_earned_dc,
    'bonus_applied', v_bonus_multiplier > 1.0
  );
END;
$function$;