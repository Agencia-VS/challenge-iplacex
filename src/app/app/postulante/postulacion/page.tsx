import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleHomePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Mi postulación" };

const ESTADO_CONFIG: Record<string, {
  label: string;
  tone: "accent" | "secondary" | "primary" | "neutral" | "success" | "warning";
}> = {
  borrador:           { label: "Borrador",          tone: "warning"  },
  enviada:            { label: "Enviada ✓",          tone: "secondary"     },
  en_revision:        { label: "En revisión",        tone: "accent"   },
  ronda_1_pasada:     { label: "Ronda 1 ✓",          tone: "success"  },
  ronda_1_descartada: { label: "No seleccionada",    tone: "neutral"    },
  ronda_2_pasada:     { label: "Ronda 2 ✓",          tone: "success"  },
  ronda_2_descartada: { label: "No seleccionada",    tone: "neutral"    },
  finalista:          { label: "Finalista 🏆",        tone: "primary"   },
  ganador:            { label: "Ganador 🥇",           tone: "accent"   },
};

export default async function MiPostulacionPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single();
  if (perfil?.rol && perfil.rol !== "postulante") redirect(roleHomePath(perfil.rol));

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select(`
      id, codigo_ciego, nombre_proyecto, descripcion_breve,
      estado_proyecto, estado_postulacion, video_url,
      equipo_nombre, equipo_integrantes, created_at, enviada_at,
      categorias ( nombre )
    `)
    .eq("postulante_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  type Proyecto = {
    id: string;
    codigo_ciego: string;
    nombre_proyecto: string | null;
    descripcion_breve: string | null;
    estado_proyecto: string | null;
    estado_postulacion: string;
    video_url: string | null;
    equipo_nombre: string | null;
    equipo_integrantes: number | null;
    created_at: string;
    enviada_at: string | null;
    categorias: { nombre: string } | null;
  };

  const p = proyecto as Proyecto | null;
  const estadoConf = ESTADO_CONFIG[p?.estado_postulacion ?? ""] ?? null;
  const esEditable = !p || p.estado_postulacion === "borrador";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Mi proceso</p>
        <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
          Mi postulación
        </h1>
      </header>

      {!p ? (
        <Card variant="ghost" className="flex flex-col items-center gap-5 py-20 text-center">
          <span className="text-[56px]">📋</span>
          <div>
            <p className="text-[18px] font-semibold text-brand-primary">Todavía no has postulado</p>
            <p className="mt-1.5 max-w-sm text-[13px] text-brand-ink-muted">
              Completa el formulario y envía tu proyecto antes del cierre de la convocatoria.
            </p>
          </div>
          <Button href="/app/postulante/postular">🚀 Postular ahora</Button>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="brand-eyebrow text-brand-ink-muted">
                  {(p.categorias as { nombre: string } | null)?.nombre ?? "Categoría"}
                  {p.codigo_ciego && (
                    <span className="ml-2 font-[family-name:var(--font-mono)] text-brand-secondary">
                      {p.codigo_ciego}
                    </span>
                  )}
                </p>
                <h2 className="brand-display mt-0.5 text-[24px] text-brand-primary">
                  {p.nombre_proyecto ?? "(sin nombre)"}
                </h2>
                {p.descripcion_breve && (
                  <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-brand-ink-soft">
                    {p.descripcion_breve}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {estadoConf && <Badge tone={estadoConf.tone}>{estadoConf.label}</Badge>}
                {esEditable && (
                  <Button href="/app/postulante/postular" size="sm" variant="ghost">
                    ✏️ Editar borrador
                  </Button>
                )}
              </div>
            </div>

            <dl className="mt-6 grid gap-4 border-t border-brand-line pt-5 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="brand-eyebrow">Equipo</dt>
                <dd className="mt-1 text-brand-ink">
                  {p.equipo_nombre ?? "—"}
                  {p.equipo_integrantes
                    ? ` · ${p.equipo_integrantes} persona${p.equipo_integrantes > 1 ? "s" : ""}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="brand-eyebrow">Estado del proyecto</dt>
                <dd className="mt-1 capitalize text-brand-ink">
                  {p.estado_proyecto?.replace(/_/g, " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="brand-eyebrow">
                  {p.enviada_at ? "Enviada el" : "Guardada el"}
                </dt>
                <dd className="mt-1 text-brand-ink">
                  {new Date(p.enviada_at ?? p.created_at).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </Card>

          {p.video_url && (
            <Card className="flex items-center justify-between gap-4 p-5">
              <p className="brand-eyebrow text-brand-ink-muted">Video pitch</p>
              <a
                href={p.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-brand-accent underline-offset-2 hover:underline"
              >
                ▶ Ver en YouTube →
              </a>
            </Card>
          )}

          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="brand-eyebrow text-brand-ink-muted">Entregas por etapa</p>
              <p className="mt-0.5 text-[13px] text-brand-ink-soft">
                Sube el material de cada fase (Video Pitch, pitch 60s, mentoría) al avanzar.
              </p>
            </div>
            <Button href="/app/postulante/entregas" variant="secondary" size="sm">
              Ir a entregas →
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
