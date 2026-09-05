import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/cn";
import { ASISTENCIA_MINIMA, resumenAsistencia } from "@/lib/bootcamp";

export const metadata: Metadata = { title: "Bootcamp" };

type Sesion = {
  id: number;
  numero: number;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  recursos: { titulo: string; url: string }[] | null;
};

export default async function BootcampPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sesionesRaw } = await supabase
    .from("sesiones_bootcamp")
    .select("id, numero, titulo, descripcion, fecha, recursos")
    .order("numero", { ascending: true });
  const sesiones = (sesionesRaw ?? []) as Sesion[];

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id")
    .eq("postulante_id", user.id)
    .maybeSingle();

  const { data: asistenciasRaw } = proyecto
    ? await supabase
        .from("asistencias")
        .select("sesion_id, presente")
        .eq("proyecto_id", (proyecto as { id: string }).id)
    : { data: [] };

  const registros = ((asistenciasRaw ?? []) as { sesion_id: number; presente: boolean }[]).map(
    (a) => ({ sesionId: a.sesion_id, presente: a.presente }),
  );
  const resumen = resumenAsistencia(registros, sesiones.length);
  const porSesion = new Map(registros.map((r) => [r.sesionId, r.presente]));

  return (
    <div className="space-y-8 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Formación</p>
        <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
          Bootcamp y mentorías
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-brand-ink-soft">
          Las Bases exigen asistir al menos al {ASISTENCIA_MINIMA}% de las sesiones. Bajo ese
          mínimo el proyecto queda descalificado.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Tu asistencia"
          value={`${resumen.porcentaje}%`}
          tone={resumen.cumple ? "secondary" : resumen.irrecuperable ? "warning" : "accent"}
          detail={`${resumen.asistidas} de ${resumen.total} sesiones`}
        />
        <Stat label="Mínimo exigido" value={`${ASISTENCIA_MINIMA}%`} tone="primary" detail="Según las Bases" />
        <Stat
          label={resumen.cumple ? "Estado" : "Te faltan"}
          value={resumen.cumple ? "Al día" : String(resumen.faltanPorAsistir)}
          tone={resumen.cumple ? "secondary" : "warning"}
          detail={resumen.cumple ? "Cumples el mínimo" : "sesiones por asistir"}
        />
      </div>

      {resumen.irrecuperable && resumen.total > 0 && (
        <div className="rounded-[var(--r-md)] border border-st-danger/30 bg-st-danger/5 px-4 py-3 text-[13px] text-st-danger">
          Ya no es posible alcanzar el {ASISTENCIA_MINIMA}% con las sesiones que quedan. Contacta al
          Comité Organizador.
        </div>
      )}

      <div className="space-y-3">
        {sesiones.map((s) => {
          const registrada = porSesion.has(s.id);
          const presente = porSesion.get(s.id) === true;
          return (
            <Card
              key={s.id}
              className={cn("flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}
            >
              <div className="flex items-start gap-4">
                <span className="brand-display text-[32px] leading-none text-brand-secondary-light">
                  {String(s.numero).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-brand-primary">{s.titulo}</h3>
                  {s.descripcion && (
                    <p className="mt-1 text-[13px] leading-relaxed text-brand-ink-soft">
                      {s.descripcion}
                    </p>
                  )}
                  {s.recursos && s.recursos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {s.recursos.map((r) => (
                        <a
                          key={r.url}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-medium text-brand-accent underline-offset-2 hover:underline"
                        >
                          {r.titulo} →
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {s.fecha && (
                  <span className="font-[family-name:var(--font-mono)] text-[12px] text-brand-ink-muted">
                    {new Date(s.fecha).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                )}
                {!registrada ? (
                  <Badge tone="neutral">Sin registrar</Badge>
                ) : presente ? (
                  <Badge tone="success">Asististe</Badge>
                ) : (
                  <Badge tone="warning">Ausente</Badge>
                )}
              </div>
            </Card>
          );
        })}

        {sesiones.length === 0 && (
          <Card variant="ghost" className="py-12 text-center text-[14px] text-brand-ink-muted">
            El calendario del bootcamp todavía no se publica.
          </Card>
        )}
      </div>
    </div>
  );
}
