import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [role, setRole] = useState("student"); // ← valor inicial válido

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { role },
      },
    });

    if (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>

      <Select value={role} onValueChange={setRole}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un rol" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="student">Estudiante</SelectItem>
          <SelectItem value="teacher">Profesor</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={handleLogin} className="mt-4 w-full">
        Continuar con Google
      </Button>
    </div>
  );
}
