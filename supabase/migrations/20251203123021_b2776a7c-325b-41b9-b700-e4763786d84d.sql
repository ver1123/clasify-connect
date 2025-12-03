-- Fix function search_path for update_app_stats
CREATE OR REPLACE FUNCTION public.update_app_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.app_stats SET
    total_sessions = (SELECT COUNT(*) FROM public.sessions WHERE status = 'completed'),
    average_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM public.ratings), 0),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;