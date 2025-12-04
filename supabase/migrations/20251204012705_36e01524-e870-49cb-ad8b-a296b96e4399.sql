-- Update handle_new_user to accept role from metadata but validate it properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role text;
  valid_role user_role;
BEGIN
  -- Get the requested role from metadata, default to 'student'
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Validate the role - only allow 'student' or 'teacher'
  IF requested_role = 'teacher' THEN
    valid_role := 'teacher'::user_role;
  ELSE
    -- Default to student for any other value (security measure)
    valid_role := 'student'::user_role;
  END IF;

  -- Create profile with validated role
  INSERT INTO public.profiles (user_id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    valid_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Also add to user_roles table with the corresponding app_role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, valid_role::text::app_role);
  
  RETURN NEW;
END;
$$;