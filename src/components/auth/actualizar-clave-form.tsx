"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { AvisoSinConfigurar } from "@/components/auth/aviso-sin-configurar";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigurado,
} from "@/lib/supabase/config";

type LoginPath = "/login" | "/acceso";

export function ActualizarClaveForm({ loginPath = "/login" }: { loginPath?: LoginPath }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigurado) return <AvisoSinConfigurar />;

  const supabase = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace(`${loginPath}?restablecida=1`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="brand-eyebrow text-brand-ink-soft">Nueva contraseña</span>
        <input
          type="password"
          name="password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-2 block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
        />
      </label>

      <label className="block">
        <span className="brand-eyebrow text-brand-ink-soft">Repite la contraseña</span>
        <input
          type="password"
          name="confirmation"
          placeholder="Escríbela nuevamente"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-2 block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--r-sm)] border border-st-danger/30 bg-st-danger/5 px-3 py-2 text-[12px] text-st-danger"
        >
          {error}
        </p>
      )}

      <Button size="lg" className="w-full" disabled={loading}>
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
