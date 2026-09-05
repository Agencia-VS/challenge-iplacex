import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { obtenerDocumentosPublicos } from "@/app/actions/documentos";

/**
 * Componente reutilizable para CTA destacada de bases de la convocatoria.
 * Spec § 8.5 — reusable en landing, /bases y dashboards.
 *
 * Carga dinámicamente el documento tipo "bases" más reciente desde la DB.
 * Si no hay documento en DB, muestra un fallback con los datos hardcodeados.
 */
export async function BasesCard({ compact = false }: { compact?: boolean }) {
  const docs = await obtenerDocumentosPublicos();
  const bases = docs.find(d => d.tipo === "bases");

  const titulo = bases?.titulo ?? "Bases del Concurso 2026";
  const url = bases?.archivo_url ?? "/bases/bases-challenge-iplacex-2026.pdf";
  const versionTexto = bases?.version ? `v${bases.version}` : "v1.0";
  const nombreArchivo = bases?.archivo_nombre ?? "bases-challenge-iplacex-2026.pdf";

  return (
    <Card variant="surface" className="relative overflow-hidden p-7">
      <div className="relative max-w-xl">
        <span className="brand-eyebrow text-brand-accent">Documento oficial</span>
        <h3 className="brand-display mt-3 text-[28px] text-brand-primary sm:text-[34px]">
          Bases convocatoria de innovación 2026
        </h3>
        {!compact && (
          <p className="mt-3 max-w-md text-[14px] text-brand-ink-soft">
            Reglas, plazos, criterios de evaluación, derechos de propiedad intelectual y obligaciones de
            participantes y evaluadores.
          </p>
        )}
        {url ? (
          <>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-brand-ink-muted">
              {nombreArchivo} · {versionTexto}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button href={url} variant="primary" size="md">
                Descargar bases
              </Button>
              <Button href="/bases" variant="ghost" size="md">
                Ver detalle
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-5">
            <p className="text-[13px] text-brand-ink-muted">⚠️ Las bases aún no están disponibles. El administrador las publicará pronto.</p>
            <div className="mt-3">
              <Button href="/bases" variant="ghost" size="md">
                Ver detalle
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function BasesSection() {
  return (
    <section className="py-8">
      <Container>
        <BasesCard />
      </Container>
    </section>
  );
}
