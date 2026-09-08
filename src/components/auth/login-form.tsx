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

export function LoginForm({ passwordReset = false }: { passwordReset?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigurado) return <AvisoSinConfigurar />;

  const supabase = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/app`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos"
        : error.message);
      setLoading(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <>
      {passwordReset && (
        <p
          role="status"
          className="mt-6 rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3 py-2 text-[12px] leading-relaxed text-brand-ink-soft"
        >
          Tu contraseña se actualizó correctamente. Ya puedes ingresar con la nueva clave.
        </p>
      )}

      <Button
        variant="outline"
        size="lg"
        className="mt-7 w-full"
        onClick={handleGoogle}
        disabled={loading}
        type="button"
      >
        Continuar con Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-brand-ink-muted">
        <span className="h-px flex-1 bg-brand-line" />
        o con email
        <span className="h-px flex-1 bg-brand-line" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="-mt-1 text-right">
          <Link
            href="/recuperar-clave?next=%2Flogin"
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

        <Button size="lg" className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-brand-ink-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/signup" className="font-semibold text-brand-primary hover:text-brand-accent">
          Crear cuenta gratis
        </Link>
      </p>

      <p className="mt-4 text-center text-[12px] text-brand-ink-muted">
        ¿Eres evaluador o administrador?{" "}
        <Link href="/acceso" className="font-medium text-brand-ink-muted underline underline-offset-2 hover:text-brand-primary">
          Acceso equipo {BRAND.shortName}
        </Link>
      </p>
    </>
  );
}
