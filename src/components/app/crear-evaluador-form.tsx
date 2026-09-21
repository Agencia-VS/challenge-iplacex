"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { crearEvaluador } from "@/app/actions/evaluadores";
import { BRAND } from "@/lib/brand";

const ROLES = [
  {
    value: "comite_tecnico",
    label: "Comité Técnico",
    desc: "Revisa la admisibilidad y evalúa la preselección escrita, sin pitch.",
  },
  {
    value: "jurado",
    label: "Jurado Evaluador",
    desc: "Evalúa a los finalistas y su pitch durante el Demo Day.",
  },
  {
    value: "admin",
    label: "Comité Organizador (admin)",
    desc: "Gestiona la convocatoria, los usuarios, las asignaciones, las etapas y los resultados.",
  },
] as const;

type Rol = (typeof ROLES)[number]["value"];

export function CrearEvaluadorForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("jurado");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await crearEvaluador({ nombre, email, password, rol });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("jurado");
    router.refresh();
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-1">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label className="brand-eyebrow text-brand-ink-soft">
            Nombre completo <span className="text-brand-accent">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej: María González"
            className="block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="brand-eyebrow text-brand-ink-soft">
            Email <span className="text-brand-accent">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={`maria@${BRAND.emailDomain}`}
            className="block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
          />
        </div>

        {/* Contraseña */}
        <div className="flex flex-col gap-1.5">
          <label className="brand-eyebrow text-brand-ink-soft">
            Contraseña temporal <span className="text-brand-accent">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
          />
          <p className="text-[11px] text-brand-ink-muted">
            Comparte esta contraseña con el usuario para que la cambie en su primer acceso.
          </p>
        </div>

        {/* Rol */}
        <div className="flex flex-col gap-1.5">
          <label className="brand-eyebrow text-brand-ink-soft">
            Rol <span className="text-brand-accent">*</span>
          </label>
          <div
            role="note"
            aria-label="Ayuda para elegir el rol"
            className="rounded-[var(--r-sm)] border border-brand-secondary/25 bg-brand-secondary-soft/40 px-3.5 py-3"
          >
            <p className="text-[12px] font-semibold text-brand-primary">
              ¿Qué rol corresponde?
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-brand-ink-soft">
              <li>
                <strong>Comité Técnico:</strong> participa en la primera evaluación y revisa
                las respuestas escritas y la admisibilidad.
              </li>
              <li>
                <strong>Jurado Evaluador:</strong> evalúa a los finalistas y sus presentaciones
                en el Demo Day.
              </li>
              <li>
                <strong>Comité Organizador:</strong> administra la plataforma; no corresponde
                a una cuenta evaluadora.
              </li>
            </ul>
            <p className="mt-2 border-t border-brand-secondary/15 pt-2 text-[10px] text-brand-ink-muted">
              Después de crear una cuenta evaluadora, asígnale sus emprendimientos o proyectos
              desde la sección «Proyectos».
            </p>
          </div>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--r-sm)] border px-3.5 py-2.5 transition-all",
                  rol === r.value
                    ? "border-brand-primary bg-brand-surface-soft"
                    : "border-brand-line hover:border-brand-primary-light",
                )}
              >
                <input
                  type="radio"
                  name="rol"
                  value={r.value}
                  checked={rol === r.value}
                  onChange={() => setRol(r.value)}
                  className="mt-0.5 accent-brand-primary"
                />
                <div>
                  <p className="text-[13px] font-semibold text-brand-ink">{r.label}</p>
                  <p className="text-[11px] text-brand-ink-muted">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--r-md)] border border-st-danger/30 bg-st-danger/5 px-4 py-3 text-[13px] font-medium text-st-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-brand-line pt-4">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
