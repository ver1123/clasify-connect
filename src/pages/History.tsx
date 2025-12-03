import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Star, 
  Calendar,
  ChevronRight,
  Loader2,
  History as HistoryIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SessionHistory {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  student: {
    full_name: string;
    avatar_url: string | null;
  };
  teacher: {
    full_name: string;
    avatar_url: string | null;
  };
  subjects: {
    name: string;
    icon: string;
  };
  topics: {
    name: string;
  } | null;
  ratings: {
    rating: number;
  }[] | null;
}

const History = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchHistory();
    }
  }, [profile]);

  const fetchHistory = async () => {
    if (!profile) return;

    const isTeacher = profile.role === 'teacher';
    const filterColumn = isTeacher ? 'teacher_id' : 'student_id';

    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        student:profiles!sessions_student_id_fkey(full_name, avatar_url),
        teacher:profiles!sessions_teacher_id_fkey(full_name, avatar_url),
        subjects(name, icon),
        topics(name),
        ratings(rating)
      `)
      .eq(filterColumn, profile.id)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (data) {
      setSessions(data as unknown as SessionHistory[]);
    }
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isTeacher = profile?.role === 'teacher';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <HistoryIcon className="w-8 h-8 text-primary" />
              Historial de clases
            </h1>
            <p className="text-muted-foreground">
              Revisa tus sesiones anteriores.
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <HistoryIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sin historial
              </h3>
              <p className="text-muted-foreground">
                Aún no tienes sesiones completadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const otherUser = isTeacher ? session.student : session.teacher;
                const sessionRating = session.ratings?.[0]?.rating;

                return (
                  <div
                    key={session.id}
                    className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={otherUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(otherUser.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {otherUser.full_name}
                          </h3>
                          <Badge 
                            variant={session.status === 'completed' ? 'secondary' : 'destructive'}
                            className={session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                          >
                            {session.status === 'completed' ? 'Completada' : 'Cancelada'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {session.subjects.icon} {session.subjects.name}
                            {session.topics && (
                              <>
                                <ChevronRight className="w-3 h-3" />
                                {session.topics.name}
                              </>
                            )}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(session.started_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </span>

                          {session.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.duration_minutes} min
                            </span>
                          )}

                          {sessionRating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              {sessionRating}/5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
