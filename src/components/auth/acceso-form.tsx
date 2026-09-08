"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { BRAND } from "@/lib/brand";
import { AvisoSinConfigurar } from "@/components/auth/aviso-sin-configurar";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

export function AccesoForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigurado) return <AvisoSinConfigurar />;

  const supabase = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Credenciales inválidas"
        : error.message);
      setLoading(false);
      return;
    }

    // Validar rol — solo equipo interno puede entrar por /acceso
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", data.user.id)
      .single();

    if (!perfil || perfil.rol === "postulante") {
      await supabase.auth.signOut();
      setError("Esta cuenta no tiene permisos de equipo. Usa el acceso de postulantes.");
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Email corporativo"
        type="email"
        name="email"
        placeholder={`nombre@${BRAND.emailDomain}`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        type="password"
        name="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <div className="-mt-1 text-right">
        <Link
          href="/recuperar-clave?next=%2Facceso"
          className="text-[12px] font-medium text-brand-accent hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {error && (
        <p className="rounded-[var(--r-sm)] border border-st-danger/30 bg-st-danger/5 px-3 py-2 text-[12px] text-st-danger">
          {error}
        </p>
      )}

      <Button variant="secondary" size="lg" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar al panel"}
      </Button>
    </form>
  );
}
