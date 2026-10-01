"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { guardarCondicionAcademica } from "@/app/actions/perfil";
import { createClient, supabaseConfigurado } from "@/lib/supabase/client";
import { CONDICIONES_ACADEMICAS, CONDICION_LABEL, esCondicionAcademica, type CondicionAcademica } from "@/lib/perfil";

type Pendiente = { userId: string; error?: string };

/** Se monta una sola vez para cubrir también sesiones activas en páginas públicas. */
export function CondicionAcademicaGate() {
  const pathname = usePathname();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const revision = useRef(0);
  const invalidar = useCallback(() => { ++revision.current; }, []);

  const comprobar = useCallback(async () => {
    if (!supabaseConfigurado) return;
    const current = ++revision.current;
    const supabase = createClient();
    let userId: string | undefined;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (current !== revision.current) return;
      // Un error transitorio no descarta una pregunta ya pendiente.
      if (authError) return;
      if (!user) {
        setPendiente(null);
        return;
      }
      userId = user.id;
      const { data, error } = await supabase.from("usuarios")
        .select("condicion_academica").eq("id", user.id).single();
      if (current !== revision.current) return;
      if (error) {
        setPendiente({ userId: user.id, error: "No pudimos consultar tu perfil. Reintenta para continuar." });
      } else {
        setPendiente(esCondicionAcademica(data?.condicion_academica) ? null : { userId: user.id });
      }
    } catch {
      if (userId && current === revision.current) {
        setPendiente({ userId, error: "No pudimos consultar tu perfil. Reintenta para continuar." });
      }
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    const supabase = createClient();
    // No ejecutar consultas dentro del callback de Auth (puede bloquear su lock).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearTimeout(timer);
        invalidar();
        setPendiente(null);
      } else {
        clearTimeout(timer);
        timer = setTimeout(() => void comprobar(), 0);
      }
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") void comprobar();
    };
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    clearTimeout(timer);
    timer = setTimeout(() => void comprobar(), 0);
    return () => {
      invalidar();
      clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [comprobar, invalidar, pathname]);

  if (!pendiente) return null;
  return <PreguntaCondicion key={pendiente.userId} userId={pendiente.userId} errorConsulta={pendiente.error}
    onRetry={comprobar} onSaved={comprobar} />;
}

function PreguntaCondicion({ userId, errorConsulta, onRetry, onSaved }: {
  userId: string;
  errorConsulta?: string;
  onRetry: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [seleccion, setSeleccion] = useState<CondicionAcademica | "">("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!seleccion || enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    setError("");
    try {
      const result = await guardarCondicionAcademica(seleccion, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Reconsultar la cuenta activa evita que una respuesta tardía cierre
      // el aviso de otra cuenta si la sesión cambió durante el guardado.
      await onSaved();
      router.refresh();
    } catch {
      setError("No pudimos guardar tu respuesta. Revisa tu conexión e inténtalo nuevamente.");
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="condicion-titulo" aria-describedby="condicion-descripcion"
      onCancel={(event) => event.preventDefault()}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[var(--r-lg)] border border-brand-line bg-brand-surface-raised p-6 text-brand-ink shadow-[var(--sh-lg)] backdrop:bg-brand-ink/60 backdrop:backdrop-blur-sm sm:p-8">
      <p className="brand-eyebrow text-brand-accent">Completa tu perfil · Obligatorio</p>
      <h2 id="condicion-titulo" className="brand-display mt-3 text-2xl text-brand-primary">¿Eres Titulado o Estudiante?</h2>
      <p id="condicion-descripcion" className="mt-3 text-sm leading-relaxed text-brand-ink-soft">
        Selecciona una alternativa para continuar. Guardaremos esta información en tu perfil y solo te la pediremos una vez.
      </p>
      {errorConsulta ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-brand-accent">{errorConsulta}</p>
          <button type="button" onClick={() => void onRetry()} className="mt-4 rounded-lg bg-brand-primary px-5 py-3 font-semibold text-white">Reintentar</button>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-5" aria-busy={guardando}>
          <fieldset disabled={guardando} className="space-y-3">
            <legend className="sr-only">Condición académica (elige una alternativa)</legend>
            {CONDICIONES_ACADEMICAS.map((value) => (
              <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${seleccion === value ? "border-brand-primary bg-brand-surface-soft" : "border-brand-line"}`}>
                <input type="radio" name="condicion_academica" value={value} required
                  checked={seleccion === value} onChange={() => setSeleccion(value)}
                  className="h-5 w-5 shrink-0 appearance-none rounded border-2 border-brand-line-strong checked:border-brand-primary checked:bg-brand-primary checked:shadow-[inset_0_0_0_3px_white] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary" />
                <span className="font-semibold">{CONDICION_LABEL[value]}</span>
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-brand-accent">{error}</p>}
          <button type="submit" disabled={!seleccion || guardando}
            className="w-full rounded-lg bg-brand-primary px-5 py-3 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
            {guardando ? "Guardando…" : "Guardar y continuar"}
          </button>
        </form>
      )}
    </dialog>
  );
}
