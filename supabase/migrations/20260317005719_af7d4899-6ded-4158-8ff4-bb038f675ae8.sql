
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _empresa_name TEXT;
  _empresa_id UUID;
BEGIN
  _empresa_name := NEW.raw_user_meta_data->>'empresa';
  
  -- If empresa name provided, create it
  IF _empresa_name IS NOT NULL AND _empresa_name != '' THEN
    INSERT INTO public.empresas (nome_empresa)
    VALUES (_empresa_name)
    RETURNING id INTO _empresa_id;
  END IF;

  INSERT INTO public.profiles (user_id, nome, email, empresa_id, cargo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    _empresa_id,
    CASE WHEN _empresa_id IS NOT NULL THEN 'admin' ELSE NULL END
  );

  -- Auto-assign admin role if creating empresa
  IF _empresa_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;
