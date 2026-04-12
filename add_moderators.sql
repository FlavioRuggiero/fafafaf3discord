CREATE OR REPLACE FUNCTION public.get_moderator_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ids UUID[];
BEGIN
    SELECT array_agg(id) INTO v_ids FROM auth.users WHERE email IN ('leoale2920@gmail.com', 'miaomiaoserpente@gmail.com');
    RETURN v_ids;
END;
$function$;