import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "student";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({
        email,
        password,
        fullName: isLogin ? undefined : fullName,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string; fullName?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof typeof fieldErrors] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: "Error de inicio de sesión",
              description: "Email o contraseña incorrectos.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "¡Bienvenido!",
            description: "Has iniciado sesión correctamente.",
          });
          navigate("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              // Note: role is NOT passed here - handle_new_user always sets 'student'
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              variant: "destructive",
              title: "Usuario existente",
              description: "Este email ya está registrado. Intenta iniciar sesión.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "¡Cuenta creada!",
            description: "Tu cuenta ha sido creada. Ya puedes iniciar sesión.",
          });
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Ingresa tus credenciales para continuar" 
                : `Regístrate como ${role === "teacher" ? "profesor" : "estudiante"}`
              }
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Tu nombre"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Iniciando sesión..." : "Creando cuenta..."}
                </>
              ) : (
                isLogin ? "Iniciar sesión" : "Crear cuenta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {isLogin 
                ? "¿No tienes cuenta? Regístrate" 
                : "¿Ya tienes cuenta? Inicia sesión"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
