import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardHeader from './DashboardHeader';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Star, 
  Video, 
  ChevronRight, 
  Users,
  Loader2,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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

interface AvailableTeacher {
  id: string;
  teacher_id: string;
  subject_id: string;
  topic_id: string | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  subjects: {
    name: string;
    icon: string;
  };
  topics: {
    name: string;
  } | null;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<AvailableTeacher[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchAvailableTeachers();

    const channel = supabase
      .channel('teacher-availability-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teacher_availability' 
      }, () => {
        fetchAvailableTeachers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject);
    }
  }, [selectedSubject]);

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

  const fetchAvailableTeachers = async () => {
    const { data } = await supabase
      .from('teacher_availability')
      .select(`
        *,
        profiles!teacher_availability_teacher_id_fkey (id, full_name, avatar_url, is_verified),
        subjects (name, icon),
        topics (name)
      `)
      .eq('is_available', true);
    
    if (data) {
      setAvailableTeachers(data as unknown as AvailableTeacher[]);
    }
  };

  const handleConnectToTeacher = async (teacher: AvailableTeacher) => {
    if (!profile) return;

    // Create session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        student_id: profile.id,
        teacher_id: teacher.profiles.id,
        subject_id: teacher.subject_id,
        topic_id: teacher.topic_id,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (session && !error) {
      // Remove teacher availability
      await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', teacher.profiles.id);

      navigate(`/session/${session.id}`);
    }
  };

  const filteredTeachers = availableTeachers.filter((teacher) => {
    const matchesSubject = !selectedSubject || teacher.subject_id === selectedSubject;
    const matchesTopic = !selectedTopic || teacher.topic_id === selectedTopic;
    const matchesSearch = !searchQuery || 
      teacher.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subjects.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesTopic && matchesSearch;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Hola, {profile?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-muted-foreground">
              ¿Qué te gustaría aprender hoy?
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar tutores o materias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>

          {/* Subjects */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Materias
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <button
                onClick={() => {
                  setSelectedSubject(null);
                  setSelectedTopic(null);
                }}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  !selectedSubject
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <span className="text-2xl mb-2 block">📚</span>
                <span className="text-sm font-medium">Todas</span>
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => {
                    setSelectedSubject(subject.id);
                    setSelectedTopic(null);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    selectedSubject === subject.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{subject.icon}</span>
                  <span className="text-sm font-medium truncate block">{subject.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          {selectedSubject && topics.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Temas específicos
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={!selectedTopic ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTopic(null)}
                >
                  Todos
                </Button>
                {topics.map((topic) => (
                  <Button
                    key={topic.id}
                    variant={selectedTopic === topic.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTopic(topic.id)}
                  >
                    {topic.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Available Teachers */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Tutores disponibles ahora
              <span className="ml-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-normal text-emerald-500">
                  {filteredTeachers.length} en línea
                </span>
              </span>
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No hay tutores disponibles
                </h3>
                <p className="text-muted-foreground">
                  {selectedSubject 
                    ? 'No hay tutores disponibles para esta materia en este momento.' 
                    : 'Intenta de nuevo más tarde.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={teacher.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getInitials(teacher.profiles.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-card rounded-full" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {teacher.profiles.full_name}
                          </h3>
                          {teacher.profiles.is_verified && (
                            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                              Verificado ✓
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{teacher.subjects.icon}</span>
                          <span>{teacher.subjects.name}</span>
                          {teacher.topics && (
                            <>
                              <ChevronRight className="w-4 h-4" />
                              <span>{teacher.topics.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="hero"
                        onClick={() => handleConnectToTeacher(teacher)}
                        className="shrink-0"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Conectar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
