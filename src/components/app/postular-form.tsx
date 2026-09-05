"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { guardarPostulacion } from "@/app/actions/postulaciones";
import { CATEGORIAS, type Categoria } from "@/lib/rubrica";
import { ODS } from "@/lib/ods";
import { MAX_INTEGRANTES, MAX_EXTERNOS, type Calidad } from "@/lib/admisibilidad";
import { esRutValido, formatearRut } from "@/lib/rut";

/** Máximo del resumen ejecutivo, en palabras. Lo fijan las Bases. */
const MAX_PALABRAS_RESUMEN = 200;

const CALIDADES: { value: Calidad; label: string }[] = [
  { value: "estudiante", label: "Estudiante" },
  { value: "egresado", label: "Egresado" },
  { value: "titulado", label: "Titulado" },
  { value: "externo", label: "Externo" },
];

export type IntegranteForm = {
  rut: string;
  nombre: string;
  correo: string;
  calidad: Calidad;
  carrera: string;
  sede: string;
  esRepresentante: boolean;
};

export interface PostularFormProps {
  proyectoId?: string;
  initial?: {
    categoriaNumero?: 1 | 2 | 3;
    nombreProyecto?: string;
    resumenEjecutivo?: string;
    problema?: string;
    segmentoUsuarios?: string;
    solucion?: string;
    ods?: number[];
    declaracionAutoria?: boolean;
    equipoNombre?: string;
    integrantes?: IntegranteForm[];
  };
}

/** Cuenta palabras separadas por espacios, ignorando los vacíos. */
function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

const INTEGRANTE_VACIO: IntegranteForm = {
  rut: "",
  nombre: "",
  correo: "",
  calidad: "estudiante",
  carrera: "",
  sede: "",
  esRepresentante: false,
};

export function PostularForm({ proyectoId, initial = {} }: PostularFormProps) {
  const router = useRouter();

  const [categoria, setCategoria] = useState<1 | 2 | 3>(initial.categoriaNumero ?? 1);
  const [nombreProyecto, setNombreProyecto] = useState(initial.nombreProyecto ?? "");
  const [resumenEjecutivo, setResumenEjecutivo] = useState(initial.resumenEjecutivo ?? "");
  const [problema, setProblema] = useState(initial.problema ?? "");
  const [segmentoUsuarios, setSegmentoUsuarios] = useState(initial.segmentoUsuarios ?? "");
  const [solucion, setSolucion] = useState(initial.solucion ?? "");
  const [ods, setOds] = useState<number[]>(initial.ods ?? []);
  const [declaracion, setDeclaracion] = useState(initial.declaracionAutoria ?? false);
  const [equipoNombre, setEquipoNombre] = useState(initial.equipoNombre ?? "");
  const [integrantes, setIntegrantes] = useState<IntegranteForm[]>(
    initial.integrantes?.length
      ? initial.integrantes
      : [{ ...INTEGRANTE_VACIO, esRepresentante: true }],
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const palabras = useMemo(() => contarPalabras(resumenEjecutivo), [resumenEjecutivo]);
  const excedeResumen = palabras > MAX_PALABRAS_RESUMEN;
  const externos = integrantes.filter((i) => i.calidad === "externo").length;

  function actualizarIntegrante(i: number, cambios: Partial<IntegranteForm>) {
    setIntegrantes((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) {
          // El representante es uno solo: designar a otro libera al anterior.
          return cambios.esRepresentante ? { ...it, esRepresentante: false } : it;
        }
        return { ...it, ...cambios };
      }),
    );
  }

  async function submit(enviar: boolean) {
    setLoading(true);
    setFeedback(null);
    const res = await guardarPostulacion({
      proyectoId,
      categoriaNumero: categoria,
      nombreProyecto,
      resumenEjecutivo,
      problema,
      segmentoUsuarios,
      solucion,
      ods,
      declaracionAutoria: declaracion,
      equipoNombre,
      integrantes,
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
    if (enviar) setTimeout(() => router.push("/app/postulante"), 1200);
    else router.refresh();
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

      {/* ── 2. El proyecto ─────────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 2</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Tu proyecto</h2>

        <div className="mt-5 space-y-5">
          <FormGroup label="Nombre del proyecto" required>
            <Input
              value={nombreProyecto}
              onChange={(e) => setNombreProyecto(e.target.value)}
              maxLength={100}
              placeholder="¿Cómo se llama?"
            />
          </FormGroup>

          <FormGroup label={`Resumen ejecutivo (máx. ${MAX_PALABRAS_RESUMEN} palabras)`} required>
            <Textarea
              value={resumenEjecutivo}
              onChange={(e) => setResumenEjecutivo(e.target.value)}
              rows={6}
              placeholder="En pocas líneas: qué es, para quién y por qué importa."
            />
            <p
              className={cn(
                "text-right font-[family-name:var(--font-mono)] text-[11px]",
                excedeResumen ? "font-bold text-st-danger" : "text-brand-ink-muted",
              )}
            >
              {palabras} / {MAX_PALABRAS_RESUMEN} palabras
            </p>
          </FormGroup>

          <FormGroup label="Problema u oportunidad" required>
            <Textarea
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              rows={4}
              placeholder="¿Qué problema resuelve o qué oportunidad aprovecha?"
            />
          </FormGroup>

          <FormGroup label="Segmento de usuarios o beneficiarios" required>
            <Textarea
              value={segmentoUsuarios}
              onChange={(e) => setSegmentoUsuarios(e.target.value)}
              rows={3}
              placeholder="¿A quiénes afecta el problema y quiénes usarían la solución?"
            />
          </FormGroup>

          <FormGroup label="Solución y propuesta de valor" required>
            <Textarea
              value={solucion}
              onChange={(e) => setSolucion(e.target.value)}
              rows={5}
              placeholder="¿Cuál es tu solución y en qué se distingue de las alternativas?"
            />
          </FormGroup>
        </div>
      </Card>

      {/* ── 3. ODS ─────────────────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 3</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">
          Objetivos de Desarrollo Sostenible
        </h2>
        <p className="mt-1 text-[13px] text-brand-ink-muted">
          Marca los ODS con que tu proyecto se vincula. El criterio de impacto evalúa que ese
          vínculo esté fundado, así que elige solo los que puedas sostener.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ODS.map((o) => {
            const marcado = ods.includes(o.numero);
            return (
              <label
                key={o.numero}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-[var(--r-sm)] border-2 p-3 transition-all",
                  marcado
                    ? "border-brand-primary bg-brand-surface-soft"
                    : "border-brand-line bg-brand-surface-raised hover:border-brand-primary-light",
                )}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() =>
                    setOds((prev) =>
                      prev.includes(o.numero)
                        ? prev.filter((n) => n !== o.numero)
                        : [...prev, o.numero].sort((a, b) => a - b),
                    )
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-accent"
                />
                <span className="text-[12px] leading-snug text-brand-ink-soft">
                  <span className="font-[family-name:var(--font-mono)] text-brand-ink-muted">
                    {String(o.numero).padStart(2, "0")}
                  </span>{" "}
                  {o.nombre}
                </span>
              </label>
            );
          })}
        </div>
        {ods.length === 0 && (
          <p className="mt-3 text-[12px] text-brand-ink-muted">Debes marcar al menos uno.</p>
        )}
      </Card>

      {/* ── 4. Equipo ──────────────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 4</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Equipo</h2>
        <p className="mt-1 text-[13px] text-brand-ink-muted">
          Hasta {MAX_INTEGRANTES} integrantes, de los cuales a lo más {MAX_EXTERNOS} pueden ser
          externos. El representante debe ser de Iplacex y es la única contraparte oficial. Nadie
          puede figurar en dos proyectos.
        </p>

        <div className="mt-5">
          <FormGroup label="Nombre del equipo">
            <Input
              value={equipoNombre}
              onChange={(e) => setEquipoNombre(e.target.value)}
              maxLength={200}
              placeholder="Opcional"
            />
          </FormGroup>
        </div>

        <div className="mt-5 space-y-4">
          {integrantes.map((it, i) => (
            <IntegranteFila
              key={i}
              indice={i}
              integrante={it}
              puedeEliminar={integrantes.length > 1}
              onChange={(cambios) => actualizarIntegrante(i, cambios)}
              onEliminar={() => setIntegrantes((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={integrantes.length >= MAX_INTEGRANTES}
            onClick={() => setIntegrantes((prev) => [...prev, { ...INTEGRANTE_VACIO }])}
          >
            + Agregar integrante
          </Button>
          <span className="text-[12px] text-brand-ink-muted">
            {integrantes.length} de {MAX_INTEGRANTES}
            {externos > 0 && ` · ${externos} externo${externos > 1 ? "s" : ""}`}
          </span>
          {externos > MAX_EXTERNOS && (
            <Badge tone="warning">Máximo {MAX_EXTERNOS} externos</Badge>
          )}
        </div>
      </Card>

      {/* ── 5. Declaración ─────────────────────────────────────────────── */}
      <Card className="p-7">
        <p className="brand-eyebrow">Paso 5</p>
        <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Declaración</h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={declaracion}
            onChange={(e) => setDeclaracion(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-accent"
          />
          <span className="text-[13px] leading-relaxed text-brand-ink-soft">
            Declaro que el proyecto es de autoría propia del equipo y que acepto las Bases del
            Concurso, incluidas las causales de inadmisibilidad y el control de similitud.
          </span>
        </label>
      </Card>

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
          {proyectoId ? "Editando postulación" : "Nueva postulación"} ·{" "}
          <Badge tone="warning">Borrador</Badge>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => submit(false)} disabled={loading}>
            💾 Guardar borrador
          </Button>
          <Button type="submit" disabled={loading || excedeResumen}>
            {loading ? "Enviando…" : "🚀 Enviar postulación"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function IntegranteFila({
  indice,
  integrante,
  puedeEliminar,
  onChange,
  onEliminar,
}: {
  indice: number;
  integrante: IntegranteForm;
  puedeEliminar: boolean;
  onChange: (cambios: Partial<IntegranteForm>) => void;
  onEliminar: () => void;
}) {
  const esExterno = integrante.calidad === "externo";
  // Solo se avisa de un RUT inválido cuando ya escribió algo.
  const rutMalo = integrante.rut.trim().length > 0 && !esRutValido(integrante.rut);

  return (
    <div className="rounded-[var(--r-md)] border border-brand-line bg-brand-surface-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-brand-primary">
          Integrante {indice + 1}
          {integrante.esRepresentante && (
            <Badge tone="primary" className="ml-2">
              Representante
            </Badge>
          )}
        </span>
        {puedeEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            className="text-[12px] font-medium text-st-danger hover:underline"
          >
            Quitar
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormGroup label="Nombre completo" required>
          <Input value={integrante.nombre} onChange={(e) => onChange({ nombre: e.target.value })} />
        </FormGroup>

        <FormGroup label="RUT" required>
          <Input
            value={integrante.rut}
            onChange={(e) => onChange({ rut: e.target.value })}
            onBlur={(e) => e.target.value && onChange({ rut: formatearRut(e.target.value) })}
            placeholder="12.345.678-5"
            aria-invalid={rutMalo}
          />
          {rutMalo && <p className="text-[11px] font-medium text-st-danger">RUT inválido</p>}
        </FormGroup>

        <FormGroup label="Correo" required>
          <Input
            type="email"
            value={integrante.correo}
            onChange={(e) => onChange({ correo: e.target.value })}
          />
        </FormGroup>

        <FormGroup label="Calidad" required>
          <Select
            value={integrante.calidad}
            onChange={(e) => onChange({ calidad: e.target.value as Calidad })}
          >
            {CALIDADES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormGroup>

        {!esExterno && (
          <>
            <FormGroup label="Carrera">
              <Input
                value={integrante.carrera}
                onChange={(e) => onChange({ carrera: e.target.value })}
              />
            </FormGroup>
            <FormGroup label="Sede">
              <Input value={integrante.sede} onChange={(e) => onChange({ sede: e.target.value })} />
            </FormGroup>
          </>
        )}
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-brand-ink-soft">
        <input
          type="radio"
          name="representante"
          checked={integrante.esRepresentante}
          onChange={() => onChange({ esRepresentante: true })}
          disabled={esExterno}
          className="h-3.5 w-3.5 accent-brand-accent"
        />
        Designar como representante
        {esExterno && <span className="text-brand-ink-muted">(no puede ser externo)</span>}
      </label>
    </div>
  );
}

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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="brand-eyebrow text-brand-ink-soft">
        {label}
        {required && <span className="ml-1 text-brand-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

const CAMPO =
  "block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-2.5 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CAMPO, props.className)} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CAMPO, "cursor-pointer", props.className)} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CAMPO, "resize-y", props.className)} />;
}
