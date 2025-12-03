import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardHeader from './DashboardHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Star, 
  Clock, 
  BookOpen,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Subject {
  id: string;
  name: string;
  icon: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface Session {
  id: string;
  student_id: string;
  status: string;
  profiles: {
    full_name: string;
  };
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [stats, setStats] = useState({ totalSessions: 0, avgRating: 0 });
  const [pendingSession, setPendingSession] = useState<Session | null>(null);

  useEffect(() => {
    if (profile) {
      fetchSubjects();
      fetchAvailability();
      fetchStats();
      checkPendingSession();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('session-requests')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sessions',
        filter: `teacher_id=eq.${profile.id}`
      }, (payload) => {
        if (payload.new.status === 'active') {
          navigate(`/session/${payload.new.id}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, navigate]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
    setLoading(false);
  };

  const fetchTopics = async (subjectId: string) => {
    const { data } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('name');
    if (data) setTopics(data);
  };

  const fetchAvailability = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('teacher_availability')
      .select('*, subjects(name), topics(name)')
      .eq('teacher_id', profile.id)
      .maybeSingle();
    
    if (data) {
      setIsAvailable(data.is_available);
      setSelectedSubject(data.subject_id);
      if (data.topic_id) setSelectedTopic(data.topic_id);
    }
  };

  const fetchStats = async () => {
    if (!profile) return;

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', profile.id)
      .eq('status', 'completed');

    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('teacher_id', profile.id);

    const avgRating = ratings?.length 
      ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length 
      : 0;

    setStats({
      totalSessions: sessionCount || 0,
      avgRating: avgRating,
    });
  };

  const checkPendingSession = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('sessions')
      .select('*, profiles!sessions_student_id_fkey(full_name)')
      .eq('teacher_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      setPendingSession(data as unknown as Session);
    }
  };

  const toggleAvailability = async () => {
    if (!profile || !selectedSubject) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona una materia antes de activar tu disponibilidad.',
      });
      return;
    }

    setToggleLoading(true);

    try {
      if (isAvailable) {
        await supabase
          .from('teacher_availability')
          .delete()
          .eq('teacher_id', profile.id);
        setIsAvailable(false);
        toast({
          title: 'Disponibilidad desactivada',
          description: 'Ya no aparecerás como disponible para los estudiantes.',
        });
      } else {
        await supabase
          .from('teacher_availability')
          .upsert({
            teacher_id: profile.id,
            subject_id: selectedSubject,
            topic_id: selectedTopic || null,
            is_available: true,
          });
        setIsAvailable(true);
        toast({
          title: '¡Estás en línea!',
          description: 'Los estudiantes ahora pueden conectarse contigo.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al actualizar tu disponibilidad.',
      });
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
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
          {/* Welcome */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Hola, {profile?.full_name?.split(' ')[0]} 👋
              </h1>
              {profile?.is_verified && (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Gestiona tu disponibilidad y conecta con estudiantes.
            </p>
          </div>

          {/* Pending Session Alert */}
          {pendingSession && (
            <div className="mb-8 bg-primary/10 border border-primary/30 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Sesión activa</h3>
                  <p className="text-sm text-muted-foreground">
                    Tienes una sesión pendiente con {pendingSession.profiles.full_name}
                  </p>
                </div>
                <Button onClick={() => navigate(`/session/${pendingSession.id}`)}>
                  Ir a la sesión
                </Button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">{stats.totalSessions}</span>
              </div>
              <p className="text-sm text-muted-foreground">Sesiones completadas</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-2xl font-bold text-foreground">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Calificación promedio</p>
            </div>
          </div>

          {/* Availability Control */}
          <div className="bg-card rounded-2xl border border-border p-8">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Configurar disponibilidad
            </h2>

            <div className="space-y-6">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Materia que enseñarás
                </label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={(value) => {
                    setSelectedSubject(value);
                    setSelectedTopic('');
                  }}
                  disabled={isAvailable}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecciona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <span className="mr-2">{subject.icon}</span>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Selection */}
              {selectedSubject && topics.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tema específico (opcional)
                  </label>
                  <Select 
                    value={selectedTopic} 
                    onValueChange={setSelectedTopic}
                    disabled={isAvailable}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Cualquier tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Cualquier tema</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Toggle Button */}
              <Button
                onClick={toggleAvailability}
                variant={isAvailable ? 'destructive' : 'success'}
                size="xl"
                className="w-full"
                disabled={toggleLoading || !selectedSubject}
              >
                {toggleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : isAvailable ? (
                  <VideoOff className="w-5 h-5 mr-2" />
                ) : (
                  <Video className="w-5 h-5 mr-2" />
                )}
                {isAvailable ? 'Desactivar disponibilidad' : 'Activar disponibilidad'}
              </Button>

              {isAvailable && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-sm text-emerald-600 font-medium">
                      Estás visible para los estudiantes. Espera a que alguien se conecte contigo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
