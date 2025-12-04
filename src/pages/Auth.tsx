import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, GraduationCap, BookOpen } from "lucide-react";
import { z } from "zod";

/* ------------------------- VALIDACIÓN ------------------------- */

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

/* -------------------------------------------------------------- */

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "student";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">(
    initialRole as "student" | "teacher"
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  /* ------------------------- SESSION LISTENER ------------------------- */

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) navigate("/dashboard");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });

    return () => {
      subscription?.unsubscribe(); // fixed
    };
  }, [navigate]);

  /* ------------------------- VALIDACIÓN FORM ------------------------- */

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, fullName });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const formErrors: any = {};
        err.errors.forEach((e) => {
          formErrors[e.path[0]] = e.message;
        });
        setErrors(formErrors);
      }
      return false;
    }
  };

  /* ------------------------- AUTH HANDLER ------------------------- */

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        /* ------------------ LOGIN ------------------ */
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          toast({
            variant: "destructive",
            title: "Error de inicio de sesión",
            description: "Email o contraseña incorrectos.",
          });
          return;
        }

        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente.",
        });

        navigate("/dashboard");
      } else {
        /* ------------------ SIGNUP ------------------ */
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: selectedRole,
            },
            emailRedirectTo: ${window.location.origin}/dashboard,
          },
        });

        if (error) {
          toast({
            variant: "destructive",
            title: "Error al crear cuenta",
            description: error.message,
          });
          return;
        }

        // Si Supabase requiere verificación por email, no existirá sesión inmediata
        if (!data.session) {
          toast({
            title: "Cuenta creada",
            description: "Revisa tu correo para confirmar tu cuenta.",
          });
          return;
        }

        toast({
          title: "Cuenta creada",
          description: Tu cuenta de ${selectedRole === "teacher" ? "profesor" : "estudiante"} ha sido creada.,
        });

        navigate("/dashboard");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Algo salió mal. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------- UI ------------------------- */

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? "Ingresa tus credenciales para continuar" : "Selecciona tu rol y regístrate"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>Tipo de cuenta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("student")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        selectedRole === "student"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      disabled={loading}
                    >
                      <GraduationCap className="h-6 w-6" />
                      <span className="text-sm font-medium">Estudiante</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("teacher")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        selectedRole === "teacher"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      disabled={loading}
                    >
                      <BookOpen className="h-6 w-6" />
                      <span className="text-sm font-medium">Profesor</span>
                    </button>
                  </div>
                </div>

                {/* Nombre completo */}
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
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
              </>
            )}

            {/* Email */}
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
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {/* Contraseña */}
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
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Iniciando sesión..." : "Creando cuenta..."}
                </>
              ) : isLogin ? (
                "Iniciar sesión"
              ) : (
                "Crear cuenta"
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
              {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
