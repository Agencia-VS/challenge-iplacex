import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleHomePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Convocatoria · Admin" };

const ESTADO_CONV: Record<string, {
  label: string;
  tone: "accent" | "secondary" | "primary" | "neutral" | "success" | "warning";
}> = {
  borrador:   { label: "Borrador",    tone: "warning"  },
  abierta:    { label: "Abierta ✓",   tone: "success"  },
  cerrada:    { label: "Cerrada",     tone: "accent"   },
  finalizada: { label: "Finalizada",  tone: "neutral"    },
};

type Etapa = {
  id: number;
  numero: number;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  semana_inicio: number | null;
  semana_fin: number | null;
};

type Categoria = {
  id: number;
  numero: number;
  nombre: string;
  alcance: string | null;
};

type Convocatoria = {
  id: number;
  ano: number;
  nombre: string;
  descripcion: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_cierre: string;
  config: { nEvaluadoresPorProyecto?: number; evaluacionCiega?: boolean } | null;
  categorias: Categoria[];
  etapas: Etapa[];
};

export default async function ConvocatoriaPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single();
  if (perfil?.rol !== "admin") redirect(roleHomePath(perfil?.rol));

  const { data: raw } = await supabase
    .from("convocatorias")
    .select(`
      id, ano, nombre, descripcion, estado, fecha_inicio, fecha_cierre, config,
      categorias ( id, numero, nombre, alcance ),
      etapas ( id, numero, nombre, fecha_inicio, fecha_fin, semana_inicio, semana_fin )
    `)
    .order("ano", { ascending: false })
    .limit(1)
    .maybeSingle();

  const conv = raw as unknown as Convocatoria | null;

  return (
    <div className="space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-primary">Admin</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          Convocatoria
        </h1>
      </header>

      {!conv ? (
        <Card variant="ghost" className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[56px]">📅</span>
          <div>
            <p className="text-[17px] font-semibold text-brand-primary">Sin convocatoria activa</p>
            <p className="mt-1 text-[13px] text-brand-ink-muted">
              Ejecuta el SQL de setup en Supabase para crear el concurso 2026 con sus categorías y criterios.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Info principal */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="brand-display text-[24px] text-brand-primary">{conv.nombre}</h2>
                {conv.descripcion && (
                  <p className="mt-1 max-w-2xl text-[13px] text-brand-ink-soft">{conv.descripcion}</p>
                )}
              </div>
              <Badge tone={ESTADO_CONV[conv.estado]?.tone ?? "neutral"}>
                {ESTADO_CONV[conv.estado]?.label ?? conv.estado}
              </Badge>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-brand-line pt-5 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="brand-eyebrow">Apertura</dt>
                <dd className="mt-1 text-brand-ink">
                  {new Date(conv.fecha_inicio).toLocaleDateString("es-CL", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="brand-eyebrow">Cierre</dt>
                <dd className="mt-1 text-brand-ink">
                  {new Date(conv.fecha_cierre).toLocaleDateString("es-CL", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="brand-eyebrow">Evaluadores por proyecto</dt>
                <dd className="mt-1 text-brand-ink">
                  {conv.config?.nEvaluadoresPorProyecto ?? 3} · evaluación ciega
                </dd>
              </div>
            </dl>
          </Card>

          {/* Categorías */}
          <p className="brand-eyebrow px-1">Categorías del concurso</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[...conv.categorias].sort((a, b) => a.numero - b.numero).map(c => (
              <Card key={c.id} variant="neutral" className="p-5">
                <Badge tone={c.numero === 1 ? "accent" : c.numero === 2 ? "secondary" : "primary"}>
                  Categoría {c.numero}
                </Badge>
                <p className="mt-2 font-semibold text-brand-primary">{c.nombre}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-muted">
                  {c.alcance ?? "—"}
                </p>
              </Card>
            ))}
          </div>

          {/* Etapas */}
          <p className="brand-eyebrow px-1">Etapas del proceso</p>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-5 py-3 font-semibold">Etapa</th>
                  <th className="px-5 py-3 font-semibold">Inicio</th>
                  <th className="px-5 py-3 font-semibold">Fin</th>
                  <th className="px-5 py-3 font-semibold">Semanas</th>
                </tr>
              </thead>
              <tbody>
                {[...conv.etapas].sort((a, b) => a.numero - b.numero).map(e => (
                  <tr key={e.id} className="border-b border-brand-line/60 hover:bg-brand-surface-soft">
                    <td className="px-5 py-3 font-[family-name:var(--font-mono)] font-bold text-brand-secondary">
                      {String(e.numero).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-3 font-semibold text-brand-ink">{e.nombre}</td>
                    <td className="px-5 py-3 text-brand-ink-muted">
                      {e.fecha_inicio
                        ? new Date(e.fecha_inicio).toLocaleDateString("es-CL", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-ink-muted">
                      {e.fecha_fin
                        ? new Date(e.fecha_fin).toLocaleDateString("es-CL", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-ink-muted">
                      {e.semana_inicio != null ? `S${e.semana_inicio}–S${e.semana_fin}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
