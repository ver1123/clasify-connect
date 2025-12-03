import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Clock,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionData {
  id: string;
  student_id: string;
  teacher_id: string;
  subject_id: string;
  topic_id: string | null;
  status: string;
  started_at: string;
  student: {
    full_name: string;
    avatar_url: string | null;
  };
  teacher: {
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

const Session = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchSession();
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [id]);

  useEffect(() => {
    if (!session?.started_at) return;

    const interval = setInterval(() => {
      const start = new Date(session.started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(elapsed);

      // 1 hour limit
      if (elapsed >= 3600) {
        endSession();
        toast({
          title: 'Sesión finalizada',
          description: 'Se ha alcanzado el límite de 1 hora.',
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.started_at]);

  const fetchSession = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        student:profiles!sessions_student_id_fkey(full_name, avatar_url),
        teacher:profiles!sessions_teacher_id_fkey(full_name, avatar_url, is_verified),
        subjects(name, icon),
        topics(name)
      `)
      .eq('id', id)
      .single();

    if (data && !error) {
      setSession(data as unknown as SessionData);
    }
    setLoading(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Error de cámara',
        description: 'No se pudo acceder a la cámara. Por favor verifica los permisos.',
      });
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endSession = async () => {
    if (!session || !profile) return;

    const duration = Math.floor(elapsedTime / 60);

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
      })
      .eq('id', session.id);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Show rating dialog if student
    if (profile.role === 'student') {
      setShowRating(true);
    } else {
      navigate('/dashboard');
    }
  };

  const submitRating = async () => {
    if (!session || !profile || rating === 0) return;

    setSubmittingRating(true);

    await supabase.from('ratings').insert({
      session_id: session.id,
      student_id: profile.id,
      teacher_id: session.teacher_id,
      rating,
      comment: comment || null,
    });

    toast({
      title: '¡Gracias por tu calificación!',
      description: 'Tu opinión nos ayuda a mejorar.',
    });

    navigate('/dashboard');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isStudent = profile?.role === 'student';
  const otherUser = isStudent ? session?.teacher : session?.student;

  if (loading) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (showRating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-3xl border border-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            ¡Sesión completada!
          </h2>
          <p className="text-muted-foreground mb-6">
            ¿Cómo fue tu experiencia con {session?.teacher.full_name}?
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-4xl transition-transform hover:scale-110 ${
                  star <= rating ? 'text-amber-400' : 'text-muted-foreground/30'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            placeholder="Deja un comentario (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-4 rounded-xl border border-border bg-background text-foreground resize-none mb-6"
            rows={3}
          />

          <Button
            onClick={submitRating}
            variant="hero"
            size="lg"
            className="w-full"
            disabled={rating === 0 || submittingRating}
          >
            {submittingRating ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            Enviar calificación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foreground flex flex-col">
      {/* Header */}
      <header className="bg-background/10 backdrop-blur-lg border-b border-primary-foreground/10 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {otherUser ? getInitials(otherUser.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary-foreground">
                    {otherUser?.full_name}
                  </span>
                  {session?.teacher.is_verified && !isStudent && (
                    <Badge variant="secondary" className="text-xs">
                      Verificado ✓
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                  <span>{session?.subjects.icon}</span>
                  <span>{session?.subjects.name}</span>
                  {session?.topics && (
                    <>
                      <span>•</span>
                      <span>{session.topics.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
              <span className="text-xs">/</span>
              <span className="text-xs">60:00</span>
            </div>
          </div>
        </div>
      </header>

      {/* Video Area */}
      <main className="flex-1 relative p-4">
        {/* Remote Video (Full) */}
        <div className="absolute inset-4 bg-foreground/50 rounded-3xl overflow-hidden flex items-center justify-center">
          <video 
            ref={remoteVideoRef}
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  {otherUser ? getInitials(otherUser.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-primary-foreground/70 text-lg">
                Esperando conexión de video...
              </p>
            </div>
          </div>
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-8 right-8 w-48 h-36 bg-foreground rounded-2xl overflow-hidden shadow-2xl border-2 border-primary-foreground/10">
          <video 
            ref={localVideoRef}
            autoPlay 
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <VideoOff className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </main>

      {/* Controls */}
      <footer className="bg-background/10 backdrop-blur-lg border-t border-primary-foreground/10 p-6">
        <div className="container mx-auto flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? 'destructive' : 'secondary'}
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={endSession}
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Session;
