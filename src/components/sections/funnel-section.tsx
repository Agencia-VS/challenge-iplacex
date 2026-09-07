import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { etapas as etapasFallback, mapEtapaDB, type EtapaDB, type Etapa } from "@/lib/site";
import { cn } from "@/lib/cn";

const stateClass = {
  completed: "bg-brand-secondary text-white",
  active: "bg-brand-accent text-white ring-[6px] ring-brand-accent-soft",
  upcoming: "bg-brand-surface text-brand-ink-muted border border-brand-line-strong",
} as const;

async function obtenerEtapas(): Promise<Etapa[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  // Convocatoria activa (más reciente no cerrada).
  const { data: convocatoria } = await supabase
    .from("convocatorias")
    .select("id")
    .neq("estado", "cerrada")
    .order("ano", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!convocatoria) return etapasFallback;

  const { data: etapasRaw } = await supabase
    .from("etapas")
    .select("numero, tipo, nombre, descripcion, fecha_inicio, fecha_fin, semana_inicio, semana_fin")
    .eq("convocatoria_id", convocatoria.id)
    .order("numero", { ascending: true });

  if (!etapasRaw || etapasRaw.length === 0) return etapasFallback;

  const now = new Date();
  return (etapasRaw as EtapaDB[]).map((e) => mapEtapaDB(e, now));
}

export async function FunnelSection() {
  const etapas = await obtenerEtapas();

  return (
    <Section
      id="funnel"
      eyebrow="2 meses · 6 hitos"
      eyebrowTone="secondary"
      title="El funnel completo de la convocatoria"
      description="De la postulación al Demo Day. Cada etapa filtra, forma y prepara a los proyectos finalistas."
    >
      <Card className="overflow-hidden p-2">
        <ol className="divide-y divide-brand-line">
          {etapas.map((e, i) => (
            <li
              key={e.numero}
              className="grid grid-cols-[44px_1fr_auto] items-center gap-4 rounded-[var(--r-md)] p-5 transition-colors hover:bg-brand-surface-soft"
            >
              <span
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full brand-display text-[15px]",
                  stateClass[e.estado],
                )}
              >
                {String(e.numero).padStart(2, "0")}
              </span>
              <div>
                <p className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-brand-primary">
                  {e.nombre}
                </p>
                <p className="mt-0.5 text-[13px] text-brand-ink-soft">{e.descripcion}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-[family-name:var(--font-mono)] text-[12px] text-brand-ink-muted">
                  {e.plazo}
                </span>
                {e.badge && (
                  <Badge
                    tone={
                      e.estado === "active"
                        ? "accent"
                        : e.estado === "completed"
                        ? "secondary"
                        : "neutral"
                    }
                  >
                    {e.badge}
                  </Badge>
                )}
              </div>
              {/* connector */}
              {i < etapas.length - 1 && (
                <span
                  aria-hidden
                  className="col-start-1 row-start-2 -mt-2 ml-5 hidden h-2 w-0.5 bg-brand-line-strong"
                />
              )}
            </li>
          ))}
        </ol>
      </Card>
    </Section>
  );
}
