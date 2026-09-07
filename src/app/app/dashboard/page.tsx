import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BasesCard } from "@/components/sections/bases-section";
import { etapas } from "@/lib/site";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const etapaActiva = etapas.find((e) => e.estado === "active") ?? etapas[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-accent">Hola de nuevo</p>
          <h1 className="brand-display mt-2 text-[40px] text-brand-primary">Tu proceso, en un vistazo</h1>
          <p className="mt-2 max-w-xl text-[14px] text-brand-ink-soft">
            Sigue tu postulación, accede a las cápsulas y descarga las bases de la convocatoria.
          </p>
        </div>
        <Button href="/app/postular">Continuar postulación</Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Estado postulación" value="Borrador" tone="warning" detail="60% completado" />
        <Stat label="Etapa actual" value={`0${etapaActiva.numero}`} tone="accent" detail={etapaActiva.nombre} />
        <Stat label="Cápsulas vistas" value="2 / 5" tone="secondary" detail="Sigue formándote" />
        <Stat label="Cierre postulación" value="28 ago" tone="primary" detail="vía plataforma web" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-brand-primary">
              Timeline de la convocatoria
            </h2>
            <Badge tone="accent">Cierre 28 ago</Badge>
          </div>
          <ol className="mt-5 space-y-3">
            {etapas.slice(0, 5).map((e) => (
              <li
                key={e.numero}
                className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-[12px] font-bold text-white">
                    {e.numero}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-brand-primary">{e.nombre}</p>
                    <p className="text-[12px] text-brand-ink-muted">{e.plazo}</p>
                  </div>
                </div>
                {e.estado === "active" && <Badge tone="accent">En curso</Badge>}
                {e.estado === "completed" && <Badge tone="secondary">Cerrada</Badge>}
              </li>
            ))}
          </ol>
        </Card>

        <BasesCard compact />
      </div>
    </div>
  );
}
