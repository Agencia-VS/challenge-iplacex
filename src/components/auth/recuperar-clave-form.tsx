"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { AvisoSinConfigurar } from "@/components/auth/aviso-sin-configurar";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigurado,
} from "@/lib/supabase/config";

type LoginPath = "/login" | "/acceso";

export function RecuperarClaveForm({ nextPath = "/login" }: { nextPath?: LoginPath }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigurado) return <AvisoSinConfigurar />;

  const supabase = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);

    const updatePath = `/actualizar-clave?login=${encodeURIComponent(nextPath)}`;
    const redirectTo =
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(updatePath)}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    // El mensaje es neutro para no revelar si el correo tiene una cuenta.
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Correo electrónico"
        type="email"
        name="email"
        placeholder="tu@correo.cl"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoComplete="email"
      />

      {error && (
        <p
          role="alert"
          className="rounded-[var(--r-sm)] border border-st-danger/30 bg-st-danger/5 px-3 py-2 text-[12px] text-st-danger"
        >
          {error}
        </p>
      )}

      {sent && (
        <p
          role="status"
          className="rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3 py-2 text-[12px] leading-relaxed text-brand-ink-soft"
        >
          Si existe una cuenta asociada a este correo, recibirás un enlace para crear
          una nueva contraseña. Revisa también la carpeta de correo no deseado.
        </p>
      )}

      <Button size="lg" className="w-full" disabled={loading}>
        {loading ? "Enviando enlace…" : "Enviar enlace de recuperación"}
      </Button>
    </form>
  );
}
