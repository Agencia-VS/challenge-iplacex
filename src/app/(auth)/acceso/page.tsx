import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AccesoForm } from "@/components/auth/acceso-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Acceso equipo" };

export default function AccesoPage() {
  return (
    <Card className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="brand-eyebrow text-brand-primary">Acceso restringido</p>
          <h1 className="brand-display mt-2 text-[34px] text-brand-primary">Equipo {BRAND.shortName}</h1>
          <p className="mt-2 text-[14px] text-brand-ink-soft">
            Para administradores, evaluadores y super evaluadores del programa.
          </p>
        </div>
        <span className="hidden rounded-full border border-brand-line bg-brand-surface px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-brand-ink-muted sm:inline-block">
          Solo equipo interno
        </span>
      </div>

      <div className="mb-5 rounded-[var(--r-md)] border border-brand-line bg-brand-surface-soft px-4 py-3 text-[13px] text-brand-ink-soft">
        Si eres postulante, usa el acceso{" "}
        <Link href="/login" className="font-semibold text-brand-accent hover:underline">
          normal de participantes
        </Link>
        .
      </div>

      <AccesoForm />

      <p className="mt-6 text-center text-[12px] text-brand-ink-muted">
        Si no recuerdas tu contraseña, usa la opción de recuperación del formulario.
      </p>
    </Card>
  );
}
