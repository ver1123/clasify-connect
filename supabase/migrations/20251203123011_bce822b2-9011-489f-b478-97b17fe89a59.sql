-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('student', 'teacher');

-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subject_id, name)
);

-- Create teacher_subjects (teachers and their specializations)
CREATE TABLE public.teacher_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, topic_id)
);

-- Create teacher_availability (teachers waiting for calls)
CREATE TABLE public.teacher_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_stats table for real statistics
CREATE TABLE public.app_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial app stats
INSERT INTO public.app_stats (total_sessions, average_rating) VALUES (0, 0);

-- Insert default subjects
INSERT INTO public.subjects (name, icon) VALUES
  ('Matemáticas', '📐'),
  ('Física', '⚛️'),
  ('Química', '🧪'),
  ('Biología', '🧬'),
  ('Historia', '📜'),
  ('Inglés', '🇬🇧'),
  ('Programación', '💻'),
  ('Economía', '📊');

-- Insert default topics for each subject
INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Álgebra'), ('Cálculo'), ('Geometría'), ('Trigonometría'), ('Estadística')
) AS t(name) WHERE s.name = 'Matemáticas';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Mecánica'), ('Termodinámica'), ('Electromagnetismo'), ('Óptica'), ('Física Moderna')
) AS t(name) WHERE s.name = 'Física';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Química Orgánica'), ('Química Inorgánica'), ('Bioquímica'), ('Estequiometría')
) AS t(name) WHERE s.name = 'Química';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Genética'), ('Ecología'), ('Anatomía'), ('Microbiología'), ('Botánica')
) AS t(name) WHERE s.name = 'Biología';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Historia Universal'), ('Historia de México'), ('Historia del Arte'), ('Civilizaciones Antiguas')
) AS t(name) WHERE s.name = 'Historia';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Gramática'), ('Conversación'), ('TOEFL'), ('Vocabulario'), ('Escritura')
) AS t(name) WHERE s.name = 'Inglés';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Python'), ('JavaScript'), ('Java'), ('Algoritmos'), ('Base de Datos')
) AS t(name) WHERE s.name = 'Programación';

INSERT INTO public.topics (subject_id, name) 
SELECT s.id, t.name FROM public.subjects s
CROSS JOIN (VALUES 
  ('Microeconomía'), ('Macroeconomía'), ('Finanzas'), ('Contabilidad')
) AS t(name) WHERE s.name = 'Economía';

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for subjects and topics (public read)
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Topics are viewable by everyone" ON public.topics FOR SELECT USING (true);

-- RLS Policies for teacher_subjects
CREATE POLICY "Teacher subjects are viewable by everyone" ON public.teacher_subjects FOR SELECT USING (true);
CREATE POLICY "Teachers can manage their subjects" ON public.teacher_subjects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = teacher_id AND user_id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Teachers can delete their subjects" ON public.teacher_subjects FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = teacher_id AND user_id = auth.uid() AND role = 'teacher')
);

-- RLS Policies for teacher_availability
CREATE POLICY "Teacher availability is viewable by authenticated users" ON public.teacher_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage their availability" ON public.teacher_availability FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = teacher_id AND user_id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Teachers can update their availability" ON public.teacher_availability FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = teacher_id AND user_id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Teachers can delete their availability" ON public.teacher_availability FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = teacher_id AND user_id = auth.uid() AND role = 'teacher')
);

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE (id = student_id OR id = teacher_id) AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Participants can update sessions" ON public.sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE (id = student_id OR id = teacher_id) AND user_id = auth.uid())
);

-- RLS Policies for ratings
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Students can rate their sessions" ON public.ratings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = student_id AND user_id = auth.uid())
);

-- RLS Policies for app_stats (public read)
CREATE POLICY "App stats are viewable by everyone" ON public.app_stats FOR SELECT USING (true);

-- Enable realtime for teacher_availability
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Function to update app stats
CREATE OR REPLACE FUNCTION public.update_app_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.app_stats SET
    total_sessions = (SELECT COUNT(*) FROM public.sessions WHERE status = 'completed'),
    average_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM public.ratings), 0),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update app stats
CREATE TRIGGER on_session_complete
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.update_app_stats();

CREATE TRIGGER on_rating_added
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_app_stats();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();