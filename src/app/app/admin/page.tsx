import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleHomePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Panel Admin" };

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    redirect(roleHomePath(perfil?.rol));
  }

  const nombre = perfil?.nombre ?? user.email?.split("@")[0] ?? "Admin";

  // Stats reales ——————————————————————————————————————————————
  const [
    { data: proyectosData },
    { count: totalEvaluadores },
    { data: etapaActual },
  ] = await Promise.all([
    supabase.from("proyectos").select("estado_postulacion"),
    supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .in("rol", ["evaluador", "super_evaluador"]),
    supabase
      .from("etapas")
      .select("nombre, numero, fecha_fin")
      .lte("fecha_inicio", new Date().toISOString())
      .gte("fecha_fin", new Date().toISOString())
      .maybeSingle(),
  ]);

  const proyectos = proyectosData ?? [];
  const totalPostulaciones = proyectos.length;
  const enviados = proyectos.filter(p => p.estado_postulacion !== "borrador").length;

  // Agrupar por estado para el funnel
  const FUNNEL: { estado: string; label: string; tone: "warning" | "secondary" | "accent" | "primary" }[] = [
    { estado: "borrador",    label: "Borrador",           tone: "warning" },
    { estado: "enviada",     label: "Enviadas",           tone: "secondary"    },
    { estado: "en_revision", label: "En revisión",        tone: "accent"  },
    { estado: "ronda_1_pasada", label: "Ronda 1 aprobadas", tone: "primary" },
  ];
  const funnelData = FUNNEL.map(f => ({
    ...f,
    cantidad: proyectos.filter(p => p.estado_postulacion === f.estado).length,
  }));

  // Info de ronda activa
  let rondaLabel = "—";
  let rondaDetail = "Sin etapa activa";
  if (etapaActual) {
    rondaLabel = etapaActual.nombre ?? `Etapa ${etapaActual.numero}`;
    const dias = Math.ceil(
      (new Date(etapaActual.fecha_fin as string).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    rondaDetail = dias > 0 ? `Cierra en ${dias} día${dias !== 1 ? "s" : ""}` : "Cierra hoy";
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-primary">Administrador</p>
          <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
            Panel de control
          </h1>
          <p className="mt-2 max-w-lg text-[14px] text-brand-ink-soft">
            Gestiona la convocatoria, los proyectos postulados y el equipo evaluador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/app/admin/evaluadores" variant="secondary">
            Asignar evaluadores
          </Button>
          <Button href="/app/admin/convocatoria">
            Gestionar convocatoria →
          </Button>
        </div>
      </header>

      {/* Stats globales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total proyectos" value={String(totalPostulaciones)} tone="primary" detail={`${enviados} enviados`} />
        <Stat label="Evaluadores activos" value={String(totalEvaluadores ?? 0)} tone="secondary" detail="En el sistema" />
        <Stat label="Ronda activa" value={etapaActual ? "Sí" : "—"} tone="accent" detail={rondaDetail} />
        <Stat label="En revisión" value={String(proyectos.filter(p => p.estado_postulacion === "en_revision").length)} tone="secondary" detail="Pendientes de nota" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Estado de postulaciones */}
        <Card variant="surface" className="col-span-2 p-6">
          <p className="brand-eyebrow">Postulaciones</p>
          <h2 className="mt-1 mb-5 text-[17px] font-semibold text-brand-ink">
            Estado actual del funnel
          </h2>
          {totalPostulaciones === 0 ? (
            <p className="text-[13px] text-brand-ink-muted">
              Aún no hay proyectos registrados.{" "}
              <a href="/app/admin/convocatoria" className="text-brand-accent underline">Crear convocatoria →</a>
            </p>
          ) : (
          <ul className="space-y-3">
            {funnelData.map((e) => (
              <li key={e.estado} className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-brand-ink-soft">{e.label}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-brand-line-strong">
                    <div
                      className={`h-full rounded-full ${e.tone === "secondary" ? "bg-brand-secondary" : e.tone === "accent" ? "bg-brand-accent" : e.tone === "warning" ? "bg-st-warning" : "bg-brand-primary"} opacity-60`}
                      style={{ width: totalPostulaciones > 0 ? `${(e.cantidad / totalPostulaciones) * 100}%` : "0%" }}
                    />
                  </div>
                  <Badge tone={e.tone}>{e.cantidad}</Badge>
                </div>
              </li>
            ))}
          </ul>
          )}
          <Button variant="ghost" href="/app/admin/proyectos" className="mt-5 self-start text-[12px]">
            Ver todos los proyectos →
          </Button>
        </Card>

        {/* Acciones rápidas */}
        <Card variant="primary" className="flex flex-col gap-4 p-6">
          <p className="brand-eyebrow text-white/60">Acciones rápidas</p>
          <ul className="space-y-2">
            {[
              { label: "Subir bases de la convocatoria", href: "/app/admin/bases" },
              { label: "Publicar convocatoria", href: "/app/admin/convocatoria" },
              { label: "Asignar evaluadores", href: "/app/admin/evaluadores" },
              { label: "Avanzar ronda", href: "/app/admin/convocatoria" },
              { label: "Exportar resultados", href: "/app/admin/proyectos" },
            ].map((a) => (
              <li key={a.href}>
                <Button
                  href={a.href}
                  variant="ghost"
                  className="w-full justify-start text-[13px] text-white/80 hover:bg-white/10 hover:text-white"
                >
                  → {a.label}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
