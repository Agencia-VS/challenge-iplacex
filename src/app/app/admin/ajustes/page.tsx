import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleHomePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Ajustes · Admin" };

export default async function AjustesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: perfil } = await supabase
    .from("usuarios").select("nombre, email, rol").eq("id", user.id).single();
  if (perfil?.rol !== "admin") redirect(roleHomePath(perfil?.rol));

  const pendientes = [
    {
      titulo: "Custom Access Token Hook",
      desc: "Supabase → Auth → Hooks → Enable hook con public.custom_access_token_hook · Necesario para que el proxy lea el rol desde el JWT sin consultar la BD.",
      done: false,
    },
    {
      titulo: "Google OAuth",
      desc: "Supabase → Auth → Providers → Google → agrega Client ID y Client Secret.",
      done: false,
    },
    {
      titulo: "DATABASE_URL",
      desc: "Descomentar en .env.local y agregar en Vercel para poder ejecutar migraciones con Drizzle.",
      done: false,
    },
    {
      titulo: "Ejecutar supabase-setup.sql",
      desc: "Supabase → SQL Editor → New Query → pegar drizzle/supabase-setup.sql completo.",
      done: false,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-primary">Admin</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          Ajustes
        </h1>
      </header>

      {/* Tu cuenta */}
      <Card className="p-6">
        <p className="brand-eyebrow mb-4">Tu cuenta</p>
        <dl className="space-y-4 text-[13px]">
          <div className="flex items-center justify-between gap-4 border-b border-brand-line pb-4">
            <dt className="text-brand-ink-muted">Nombre</dt>
            <dd className="font-semibold text-brand-ink">{perfil?.nombre ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-brand-line pb-4">
            <dt className="text-brand-ink-muted">Email</dt>
            <dd className="text-brand-ink">{perfil?.email ?? user.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-brand-ink-muted">Rol</dt>
            <dd><Badge tone="primary">Admin</Badge></dd>
          </div>
        </dl>
      </Card>

      {/* Checklist de pendientes */}
      <Card variant="neutral" className="p-6">
        <p className="brand-eyebrow mb-4">Pendientes de configuración</p>
        <ul className="space-y-4">
          {pendientes.map(item => (
            <li key={item.titulo} className="flex gap-3 text-[13px]">
              <span className="mt-0.5 shrink-0 text-brand-accent">○</span>
              <div>
                <p className="font-semibold text-brand-ink">{item.titulo}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-brand-ink-muted">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
