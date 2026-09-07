import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app/app-sidebar";
import { BRAND } from "@/lib/brand";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

type Rol = "postulante" | "jurado" | "admin" | "comite_tecnico";

/**
 * Sin credenciales de Supabase no hay a quién autenticar, así que el área
 * privada no puede funcionar. Se explica qué falta en lugar de responder 500:
 * el error de librería («Your project's URL and Key are required») no le dice
 * nada a quien está desplegando.
 */
function SinConfigurar() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-brand-surface px-6">
      <div className="max-w-md text-center">
        <p className="brand-eyebrow text-brand-accent">Plataforma sin configurar</p>
        <h1 className="brand-display mt-2 text-[30px] text-brand-primary">
          Falta conectar la base de datos
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-brand-ink-soft">
          El área privada necesita las credenciales de Supabase. Define{" "}
          <code className="font-[family-name:var(--font-mono)] text-[13px] text-brand-primary">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          y{" "}
          <code className="font-[family-name:var(--font-mono)] text-[13px] text-brand-primary">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          en el entorno, y ejecuta los scripts de <code className="font-[family-name:var(--font-mono)] text-[13px] text-brand-primary">drizzle/</code>.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-[var(--r-sm)] border border-brand-line-strong px-4 py-2 text-[13px] font-semibold text-brand-primary transition-colors hover:bg-brand-surface-raised"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfigurado) return <SinConfigurar />;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
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
