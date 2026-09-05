"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { CrearEvaluadorForm } from "@/components/app/crear-evaluador-form";
import { eliminarEvaluador } from "@/app/actions/evaluadores";

export interface EvaluadorRow {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  total: number;
  finalizadas: number;
}

const ROL_TONE = {
  super_evaluador: "secondary",
  admin: "primary",
  evaluador: "neutral",
} as const;

const ROL_LABEL = {
  super_evaluador: "Super Eval.",
  admin: "Admin",
  evaluador: "Evaluador",
} as const;

export function EvaluadoresPanel({ evaluadores }: { evaluadores: EvaluadorRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    setDeleteError(null);
    const res = await eliminarEvaluador(id);
    setDeletingId(null);
    if (!res.ok) setDeleteError(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Botón crear + formulario inline */}
      {showForm ? (
        <Card className="border-brand-primary/30 bg-brand-surface-soft">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="brand-eyebrow text-brand-accent">Nuevo usuario</p>
              <h2 className="brand-display mt-0.5 text-[20px] text-brand-primary">
                Crear evaluador / admin
              </h2>
            </div>
          </div>
          <CrearEvaluadorForm onSuccess={() => setShowForm(false)} />
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            + Crear evaluador
          </Button>
        </div>
      )}

      {deleteError && (
        <div className="rounded-[var(--r-md)] border border-st-danger/30 bg-st-danger/5 px-4 py-3 text-[13px] text-st-danger">
          {deleteError}
        </div>
      )}

      {/* Tabla */}
      {evaluadores.length === 0 ? (
        <Card variant="ghost" className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[56px]">👥</span>
          <div>
            <p className="text-[17px] font-semibold text-brand-primary">
              0 evaluadores registrados
            </p>
            <p className="mt-1 text-[13px] text-brand-ink-muted">
              Crea el primer evaluador con el botón de arriba.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                <th className="px-6 py-3 font-semibold">Nombre</th>
                <th className="px-6 py-3 font-semibold">Email</th>
                <th className="px-6 py-3 font-semibold">Rol</th>
                <th className="px-6 py-3 font-semibold text-center">Eval.</th>
                <th className="px-6 py-3 font-semibold text-center">Completadas</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {evaluadores.map((e) => {
                const tone = ROL_TONE[e.rol as keyof typeof ROL_TONE] ?? "neutral";
                const label = ROL_LABEL[e.rol as keyof typeof ROL_LABEL] ?? e.rol;
                return (
                  <tr
                    key={e.id}
                    className={cn(
                      "border-b border-brand-line/60 hover:bg-brand-surface-soft",
                      deletingId === e.id && "opacity-50",
                    )}
                  >
                    <td className="px-6 py-4 font-semibold text-brand-ink">{e.nombre}</td>
                    <td className="px-6 py-4 text-brand-ink-soft">{e.email}</td>
                    <td className="px-6 py-4">
                      <Badge tone={tone}>{label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center font-[family-name:var(--font-mono)] text-brand-ink">
                      {e.total}
                    </td>
                    <td className="px-6 py-4 text-center font-[family-name:var(--font-mono)] text-brand-ink">
                      {e.finalizadas}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(e.id, e.nombre)}
                        disabled={deletingId === e.id}
                        className="text-[12px] text-brand-ink-muted transition-colors hover:text-st-danger disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
