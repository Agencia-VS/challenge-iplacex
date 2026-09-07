"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { AvisoSinConfigurar } from "@/components/auth/aviso-sin-configurar";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

export function SignupForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!supabaseConfigurado) return <AvisoSinConfigurar />;

  const supabase = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nombre },
        emailRedirectTo: `${location.origin}/auth/callback?next=/app`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="rounded-[var(--r-md)] border border-st-success/30 bg-st-success/5 p-5">
        <p className="brand-eyebrow text-st-success">Cuenta creada</p>
        <h2 className="mt-2 text-[18px] font-semibold text-brand-ink">Revisa tu correo</h2>
        <p className="mt-2 text-[13px] text-brand-ink-soft">
          Te enviamos un email a <strong>{email}</strong> con un link para confirmar tu cuenta. Una
          vez que lo abras, podrás iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <Field
        label="Nombre"
        name="nombre"
        placeholder="Catalina Rojas"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        autoComplete="name"
      />
      <Field
        label="Email"
        type="email"
        name="email"
        placeholder="tu@correo.cl"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        type="password"
        name="password"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />

      {error && (
        <p className="rounded-[var(--r-sm)] border border-st-danger/30 bg-st-danger/5 px-3 py-2 text-[12px] text-st-danger">
          {error}
        </p>
      )}

      <Button size="lg" className="w-full" disabled={loading}>
        {loading ? "Creando…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
