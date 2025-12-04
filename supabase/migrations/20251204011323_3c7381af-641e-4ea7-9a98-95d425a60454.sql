-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Create SECURITY DEFINER has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, p.role::text::app_role
FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Fix handle_new_user to ALWAYS default to student
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Always create profile as student (ignore user metadata for role)
  INSERT INTO public.profiles (user_id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    'student',  -- ALWAYS student, never trust user input
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Also add to user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- 8. Fix profiles SELECT policy - require authentication
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- 9. Fix sessions INSERT policy - only students can create their own sessions
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.sessions;
CREATE POLICY "Students can create their own sessions" ON public.sessions
FOR INSERT WITH CHECK (
  student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 10. Demote existing unverified teachers to students in user_roles
UPDATE public.user_roles 
SET role = 'student' 
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE role = 'teacher' AND is_verified = false
);

-- 11. Also update profiles table to reflect correct roles
UPDATE public.profiles 
SET role = 'student' 
WHERE role = 'teacher' AND is_verified = false;