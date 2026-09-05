import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app/app-sidebar";
import { BRAND } from "@/lib/brand";

type Rol = "postulante" | "jurado" | "admin" | "comite_tecnico";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // En RSC no podemos hacer set — el proxy ya gestiona esto
        },
      },
    },
  );

  // Verificar sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener el rol desde la tabla pública
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, nombre")
    .eq("id", user.id)
    .single();

  const rol = (perfil?.rol ?? "postulante") as Rol;
  const nombre = perfil?.nombre ?? user.email?.split("@")[0] ?? "Usuario";
  const email = user.email ?? "";

  // Convocatoria activa para el topbar
  const { data: convActiva } = await supabase
    .from("convocatorias")
    .select("id, ano, fecha_inicio, etapas(semana_fin)")
    .eq("estado", "abierta")
    .maybeSingle();

  let topbarLabel = "Sin convocatoria activa";
  if (convActiva) {
    const inicio = new Date(convActiva.fecha_inicio as string);
    const hoy = new Date();
    const diffDias = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const semanaActual = Math.max(1, Math.ceil((diffDias + 1) / 7));
    const etapas = (convActiva.etapas ?? []) as { semana_fin: number }[];
    const totalSemanas = etapas.length > 0 ? Math.max(...etapas.map(e => e.semana_fin)) : null;
    topbarLabel = `Convocatoria ${convActiva.ano}${totalSemanas ? ` · Semana ${semanaActual} de ${totalSemanas}` : ""}`;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      {/* Sidebar (desktop) + mobile bar + drawer */}
      <AppSidebar rol={rol} nombre={nombre} email={email} />

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col">
        {/* Topbar desktop */}
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-4 border-b border-brand-line bg-brand-surface/85 px-8 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-1.5 text-[12px] text-brand-ink-muted">
            <span>{BRAND.name}</span>
            <span className="text-brand-line-strong">/</span>
            <span className="font-semibold text-brand-primary capitalize">{rol}</span>
          </div>
          {/* Semana activa */}
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-brand-ink-muted">
            {topbarLabel}
          </p>
        </header>

        <main className="flex-1 px-5 py-8 md:px-9">{children}</main>
      </div>
    </div>
  );
}
