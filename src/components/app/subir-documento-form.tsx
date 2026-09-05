"use client";

import { useState, useRef, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { subirDocumento } from "@/app/actions/documentos";

const TIPOS = [
  { value: "bases", label: "📋 Bases de la convocatoria" },
  { value: "reglamento", label: "📜 Reglamento" },
  { value: "anexo", label: "📎 Anexo" },
] as const;

export function SubirDocumentoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<string>("bases");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [version, setVersion] = useState("1.0");
  const [publicado, setPublicado] = useState(true);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!archivo) {
      setFeedback({ kind: "err", msg: "Selecciona un archivo PDF" });
      return;
    }

    if (!titulo.trim()) {
      setFeedback({ kind: "err", msg: "El título es obligatorio" });
      return;
    }

    setLoading(true);

    try {
      // Leer archivo como base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Quitar el prefijo "data:application/pdf;base64,"
          const comma = result.indexOf(",");
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(archivo);
      });

      const res = await subirDocumento({
        tipo: tipo as "bases" | "reglamento" | "anexo",
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        version: version.trim() || undefined,
        publicado,
        archivoBase64: base64,
        archivoNombre: archivo.name,
        archivoTipoMime: archivo.type || "application/pdf",
      });

      if (!res.ok) {
        setFeedback({ kind: "err", msg: res.error });
      } else {
        setFeedback({ kind: "ok", msg: "✅ Documento subido correctamente" });
        // Resetear form
        setTitulo("");
        setDescripcion("");
        setVersion("1.0");
        setArchivo(null);
        if (fileRef.current) fileRef.current.value = "";
        // Refrescar la página para mostrar el nuevo documento
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      setFeedback({ kind: "err", msg: "Error inesperado al subir el documento" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-2.5 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft";

  return (
    <Card className="p-7">
      <p className="brand-eyebrow text-brand-accent">Subir nuevo documento</p>
      <h2 className="brand-display mt-1 text-[22px] text-brand-primary">
        Cargar bases, reglamento o anexos
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* Tipo */}
        <div className="flex flex-col gap-1.5">
          <label className="brand-eyebrow text-brand-ink-soft">Tipo de documento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={cn(inputClass, "appearance-none")}
          >
            {TIPOS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Versión */}
        <div className="flex flex-col gap-1.5">
          <label className="brand-eyebrow text-brand-ink-soft">Versión</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="Ej: 1.0"
            className={inputClass}
          />
        </div>

        {/* Título */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="brand-eyebrow text-brand-ink-soft">Título <span className="text-brand-accent">*</span></label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Bases de la Convocatoria 2026"
            required
            maxLength={200}
            className={inputClass}
          />
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="brand-eyebrow text-brand-ink-soft">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve descripción del documento..."
            rows={2}
            maxLength={300}
            className={cn(inputClass, "resize-y")}
          />
        </div>

        {/* Archivo */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="brand-eyebrow text-brand-ink-soft">Archivo PDF <span className="text-brand-accent">*</span></label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="block w-full text-[13px] text-brand-ink-soft file:mr-4 file:rounded-[var(--r-sm)] file:border-0 file:bg-brand-secondary file:px-4 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-brand-secondary/90"
          />
          {archivo && (
            <p className="text-[11px] text-brand-ink-muted">
              {archivo.name} · {(archivo.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>

        {/* Publicado */}
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="publicado"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
            className="h-4 w-4 rounded accent-brand-secondary"
          />
          <label htmlFor="publicado" className="text-[13px] text-brand-ink-soft">
            Visible para postulantes
          </label>
        </div>

        {/* Submit */}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading} variant="tertiary">
            {loading ? "Subiendo…" : "📤 Subir documento"}
          </Button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              "sm:col-span-2 rounded-[var(--r-md)] px-4 py-3 text-[13px] font-medium",
              feedback.kind === "ok"
                ? "border border-st-success/30 bg-st-success/5 text-st-success"
                : "border border-st-danger/30 bg-st-danger/5 text-st-danger",
            )}
          >
            {feedback.msg}
          </div>
        )}
      </form>
    </Card>
  );
}
