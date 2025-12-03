import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  BookOpen, 
  Video, 
  Star, 
  Users, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface AppStats {
  total_sessions: number;
  average_rating: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<AppStats>({ total_sessions: 0, average_rating: 0 });
  const [activeTeachers, setActiveTeachers] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchActiveTeachers();

    const channel = supabase
      .channel('realtime-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_availability' }, () => {
        fetchActiveTeachers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const { data } = await supabase.from('app_stats').select('*').limit(1).maybeSingle();
    if (data) {
      setStats(data);
    }
  };

  const fetchActiveTeachers = async () => {
    const { count } = await supabase
      .from('teacher_availability')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true);
    setActiveTeachers(count || 0);
  };

  const subjects = [
    { name: 'Matemáticas', icon: '📐', color: 'bg-blue-500/10 text-blue-600' },
    { name: 'Física', icon: '⚛️', color: 'bg-purple-500/10 text-purple-600' },
    { name: 'Química', icon: '🧪', color: 'bg-green-500/10 text-green-600' },
    { name: 'Programación', icon: '💻', color: 'bg-amber-500/10 text-amber-600' },
    { name: 'Inglés', icon: '🇬🇧', color: 'bg-red-500/10 text-red-600' },
    { name: 'Historia', icon: '📜', color: 'bg-cyan-500/10 text-cyan-600' },
  ];

  const features = [
    {
      icon: Video,
      title: 'Videollamadas 1:1',
      description: 'Sesiones personalizadas en tiempo real con tutores expertos.',
    },
    {
      icon: CheckCircle,
      title: 'Tutores Verificados',
      description: 'Todos nuestros tutores pasan por un riguroso proceso de verificación.',
    },
    {
      icon: Clock,
      title: 'Disponibilidad Inmediata',
      description: 'Conecta al instante con tutores que están listos para ayudarte.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Clasify</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#subjects" className="text-muted-foreground hover:text-foreground transition-colors">
              Materias
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} variant="hero">
                Ir al Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate('/auth')} variant="ghost">
                  Iniciar sesión
                </Button>
                <Button onClick={() => navigate('/auth?role=student')} variant="hero">
                  Comenzar gratis
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Plataforma educativa #1 en tiempo real
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6 animate-slide-up">
              Aprende cualquier tema
              <br />
              <span className="text-gradient">con tutores expertos</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Conecta en segundos con tutores verificados listos para resolver 
              tus dudas mediante videollamadas personalizadas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button 
                onClick={() => navigate('/auth?role=student')} 
                variant="hero" 
                size="xl"
                className="w-full sm:w-auto"
              >
                <BookOpen className="w-5 h-5" />
                Quiero aprender
              </Button>
              <Button 
                onClick={() => navigate('/auth?role=teacher')} 
                variant="heroOutline" 
                size="xl"
                className="w-full sm:w-auto"
              >
                <GraduationCap className="w-5 h-5" />
                Quiero enseñar
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="bg-card rounded-2xl p-6 text-center shadow-lg border border-border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">{activeTeachers}</span>
              </div>
              <p className="text-sm text-muted-foreground">Tutores activos</p>
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-500">En línea</span>
              </div>
            </div>
            
            <div className="bg-card rounded-2xl p-6 text-center shadow-lg border border-border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Video className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">{stats.total_sessions.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">Sesiones completadas</p>
            </div>
            
            <div className="bg-card rounded-2xl p-6 text-center shadow-lg border border-border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-3xl font-bold text-foreground">
                  {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '5.0'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Calificación promedio</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              ¿Por qué elegir Clasify?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nuestra plataforma está diseñada para brindarte la mejor experiencia de aprendizaje.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="subjects" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Materias disponibles
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Encuentra tutores expertos en las materias que necesitas aprender.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.name}
                onClick={() => navigate('/auth?role=student')}
                className="bg-card rounded-xl p-6 text-center shadow-md border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                <span className="text-4xl mb-3 block">{subject.icon}</span>
                <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {subject.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="gradient-hero rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                ¿Listo para comenzar?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Únete a miles de estudiantes que ya están mejorando sus habilidades con tutores expertos.
              </p>
              <Button 
                onClick={() => navigate('/auth?role=student')} 
                variant="accent" 
                size="xl"
              >
                Empezar ahora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Clasify</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Clasify. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
