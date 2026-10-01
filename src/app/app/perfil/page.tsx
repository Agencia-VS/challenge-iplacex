import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_ROL } from "@/lib/roles";
import { CONDICION_LABEL, esCondicionAcademica } from "@/lib/perfil";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function MiPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil, error } = await supabase.from("usuarios")
    .select("nombre, rol, condicion_academica, created_at")
    .eq("id", user.id).single();

  const datos = perfil ? [
    ["Nombre", perfil.nombre],
    ["Correo electrónico", user.email ?? "Sin correo registrado"],
    ["Rol en la plataforma", ETIQUETA_ROL[perfil.rol] ?? perfil.rol],
    ["Condición académica", esCondicionAcademica(perfil.condicion_academica)
      ? CONDICION_LABEL[perfil.condicion_academica] : "Pendiente de completar"],
    ["Verificación del correo", user.email_confirmed_at ? "Verificado" : "Pendiente"],
    ["Fecha de registro", new Intl.DateTimeFormat("es-CL", {
      dateStyle: "long", timeZone: "America/Santiago",
    }).format(new Date(perfil.created_at ?? user.created_at))],
  ] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="brand-eyebrow text-brand-accent">Mi cuenta</p>
      <h1 className="brand-display mt-2 text-3xl text-brand-primary">Mi perfil</h1>
      <p className="mt-3 text-sm text-brand-ink-soft">Aquí puedes consultar los datos asociados a tu cuenta.</p>
      {error || !perfil ? (
        <p role="alert" className="mt-8 rounded-lg border border-brand-line p-5 text-sm text-brand-accent">
          No pudimos cargar tu perfil. Recarga la página para volver a intentarlo.
        </p>
      ) : (
        <dl className="mt-8 grid gap-x-8 rounded-[var(--r-lg)] border border-brand-line bg-brand-surface-raised px-6 shadow-[var(--sh-sm)] sm:grid-cols-2">
          {datos.map(([label, value]) => (
            <div key={label} className="min-w-0 border-b border-brand-line py-5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
              <dt className="text-xs font-medium text-brand-ink-muted">{label}</dt>
              <dd className="mt-2 break-words text-sm font-semibold text-brand-primary">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
