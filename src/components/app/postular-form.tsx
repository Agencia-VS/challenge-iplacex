"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { guardarPostulacion } from "@/app/actions/postulaciones";
import { CATEGORIAS, type Categoria } from "@/lib/rubrica";

const ESTADOS_PROYECTO = [
  { value: "idea", label: "💡 Idea / Concepto" },
  { value: "validacion_problema", label: "🔬 Validación de problema" },
  { value: "mvp", label: "🛠 MVP en desarrollo" },
  { value: "prototipo_validado", label: "✅ Prototipo validado" },
  { value: "producto_activo", label: "🚀 Producto activo" },
];

export interface PostularFormProps {
  proyectoId?: string;
  initial?: {
    categoriaNumero?: 1 | 2 | 3;
    nombreProyecto?: string;
    descripcionBreve?: string;
    problemaResuelve?: string;
    solucion?: string;
    estadoProyecto?: string;
    equipoNombre?: string;
    equipoIntegrantes?: number;
    equipoDescripcion?: string;
    videoUrl?: string;
  };
}

export function PostularForm({ proyectoId, initial = {} }: PostularFormProps) {
  const router = useRouter();

  const [categoria, setCategoria] = useState<1 | 2 | 3>(initial.categoriaNumero ?? 1);
  const [nombreProyecto, setNombreProyecto] = useState(initial.nombreProyecto ?? "");
  const [descripcionBreve, setDescripcionBreve] = useState(initial.descripcionBreve ?? "");
  const [problemaResuelve, setProblemaResuelve] = useState(initial.problemaResuelve ?? "");
  const [solucion, setSolucion] = useState(initial.solucion ?? "");
  const [estadoProyecto, setEstadoProyecto] = useState(initial.estadoProyecto ?? "");
  const [equipoNombre, setEquipoNombre] = useState(initial.equipoNombre ?? "");
  const [equipoIntegrantes, setEquipoIntegrantes] = useState(initial.equipoIntegrantes ?? 1);
  const [equipoDescripcion, setEquipoDescripcion] = useState(initial.equipoDescripcion ?? "");
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl ?? "");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function submit(enviar: boolean) {
    setLoading(true);
    setFeedback(null);

    // Sanitizar equipoIntegrantes para evitar NaN no serializable
    const integrantes = Number.isFinite(equipoIntegrantes) && equipoIntegrantes > 0
      ? equipoIntegrantes
      : 1;

    const res = await guardarPostulacion({
      proyectoId,
      categoriaNumero: categoria,
      nombreProyecto,
      descripcionBreve,
      problemaResuelve,
      solucion,
      estadoProyecto,
      equipoNombre,
      equipoIntegrantes: integrantes,
      equipoDescripcion,
      videoUrl,
      enviar,
    });
    setLoading(false);

    if (!res.ok) {
      setFeedback({ kind: "err", msg: res.error });
      return;
    }
    setFeedback({
      kind: "ok",
      msg: enviar ? "✅ Postulación enviada correctamente" : "💾 Borrador guardado",
    });
    if (enviar) {
      setTimeout(() => router.push("/app/postulante"), 1200);
    } else {
      router.refresh();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── 1. Categoría ───────────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 1</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Elige tu categoría</h2>
        <p className="mt-1 text-[13px] text-brand-ink-muted">
          Las tres comparten criterios y ponderaciones; lo que cambia es la evidencia que se te
          exige. Elige según la etapa en que está tu proyecto, no según lo ambicioso que sea.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {CATEGORIAS.map((c) => (
            <CategoriaCard
              key={c.slug}
              categoria={c}
              selected={categoria === c.numero}
              onClick={() => setCategoria(c.numero)}
            />
          ))}
        </div>
      </Card>

      {/* ── 2. Información del proyecto ─────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 2</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Información del proyecto</h2>
        <p className="mt-1 text-[13px] text-brand-ink-muted">
          Respuestas breves y concretas. Calidad sobre cantidad.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormGroup label="Nombre del proyecto" required>
            <Input
              value={nombreProyecto}
              onChange={(e) => setNombreProyecto(e.target.value)}
              placeholder="Ej: SportSync AI"
              maxLength={50}
              required
            />
            <CharCount value={nombreProyecto.length} max={50} />
          </FormGroup>

          <FormGroup label="Estado del proyecto" required>
            <Select value={estadoProyecto} onChange={(e) => setEstadoProyecto(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {ESTADOS_PROYECTO.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup label="Descripción breve" required full>
            <Textarea
              value={descripcionBreve}
              onChange={(e) => setDescripcionBreve(e.target.value)}
              placeholder="¿Qué hace tu proyecto en una frase? Sé específico y claro."
              maxLength={200}
              rows={2}
            />
            <CharCount value={descripcionBreve.length} max={200} />
          </FormGroup>

          <FormGroup label="Problema que resuelve" required full>
            <Textarea
              value={problemaResuelve}
              onChange={(e) => setProblemaResuelve(e.target.value)}
              placeholder="¿Cuál es el problema real? ¿Quién lo sufre? (Pilar: Justificación)"
              maxLength={300}
              rows={3}
            />
            <CharCount value={problemaResuelve.length} max={300} />
          </FormGroup>

          <FormGroup label="Tu solución" required full>
            <Textarea
              value={solucion}
              onChange={(e) => setSolucion(e.target.value)}
              placeholder="¿Cómo lo resuelves? ¿Cuál es tu propuesta de valor? (Pilar: Modelo)"
              maxLength={300}
              rows={3}
            />
            <CharCount value={solucion.length} max={300} />
          </FormGroup>
        </div>
      </Card>

      {/* ── 3. Equipo ──────────────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 3</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Equipo</h2>
        <p className="mt-1 text-[13px] text-brand-ink-muted">¿Quiénes están detrás del proyecto?</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormGroup label="Nombre del equipo / Startup">
            <Input
              value={equipoNombre}
              onChange={(e) => setEquipoNombre(e.target.value)}
              placeholder="Ej: TechSport Labs"
            />
          </FormGroup>

          <FormGroup label="N° de integrantes">
            <Select
              value={equipoIntegrantes}
              onChange={(e) => setEquipoIntegrantes(Number(e.target.value))}
            >
              <option value={1}>1 persona</option>
              <option value={2}>2 personas</option>
              <option value={3}>3 personas</option>
              <option value={4}>4+ personas</option>
            </Select>
          </FormGroup>

          <FormGroup label="Descripción del equipo" full>
            <Textarea
              value={equipoDescripcion}
              onChange={(e) => setEquipoDescripcion(e.target.value)}
              placeholder="Roles, experiencia, por qué son el equipo ideal para este desafío"
              maxLength={250}
              rows={3}
            />
            <CharCount value={equipoDescripcion.length} max={250} />
          </FormGroup>
        </div>
      </Card>

      {/* ── 4. Video & adjuntos ────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 4</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Video pitch</h2>
        <p className="mt-1 text-[13px] text-brand-ink-muted">
          Máximo 60 segundos. Claro y directo. Es la pieza clave.
        </p>

        <div className="mt-5">
          <FormGroup label="Link Video YouTube" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent text-[14px]">▶</span>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/tu-video (público o no listado)"
                required
                className="block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft py-3 pl-10 pr-3.5 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-brand-ink-muted">
              💡 Tip: la Cápsula 04 te enseña cómo hacer un pitch convincente en 60 segundos.
            </p>
          </FormGroup>
        </div>
      </Card>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "rounded-[var(--r-md)] px-4 py-3 text-[13px] font-medium",
            feedback.kind === "ok"
              ? "border border-st-success/30 bg-st-success/5 text-st-success"
              : "border border-st-danger/30 bg-st-danger/5 text-st-danger",
          )}
        >
          {feedback.msg}
        </div>
      )}

      {/* Acciones */}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-line bg-brand-surface-raised/95 px-5 py-4 shadow-[var(--sh-md)] backdrop-blur-xl">
        <p className="text-[12px] text-brand-ink-muted">
          {proyectoId ? "Editando postulación" : "Nueva postulación"} · <Badge tone="warning">Borrador</Badge>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => submit(false)}
            disabled={loading}
          >
            💾 Guardar borrador
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Enviando…" : "🚀 Enviar postulación"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function CategoriaCard({
  categoria,
  selected,
  onClick,
}: {
  categoria: Categoria;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative overflow-hidden rounded-[var(--r-md)] border-2 p-5 text-left transition-all",
        selected
          ? "border-brand-primary bg-brand-surface-soft shadow-[var(--sh-md)]"
          : "border-brand-line bg-brand-surface-raised hover:border-brand-primary-light",
      )}
    >
      <span className="inline-block rounded bg-brand-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
        Categoría {categoria.numero}
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-brand-primary">{categoria.nombre}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-soft">{categoria.alcance}</p>
      {selected && (
        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand-primary text-[11px] text-white">
          ✓
        </span>
      )}
    </button>
  );
}

function FormGroup({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <label className="brand-eyebrow text-brand-ink-soft">
        {label} {required && <span className="text-brand-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="block w-full appearance-none rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none transition-all focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="block w-full resize-y rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
    />
  );
}

function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <p className="text-right font-[family-name:var(--font-mono)] text-[11px] text-brand-ink-muted">
      {value} / {max}
    </p>
  );
}
