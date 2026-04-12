CREATE OR REPLACE FUNCTION public.get_admin_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM auth.users WHERE email = 'fafetto05@gmail.com' LIMIT 1;
    RETURN v_id;
END;
$function$;