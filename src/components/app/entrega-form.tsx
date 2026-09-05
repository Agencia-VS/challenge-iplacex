"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getYoutubeThumbnail } from "@/lib/youtube";
import {
  guardarEntrega,
  subirArchivoEntrega,
  eliminarArchivoEntrega,
} from "@/app/actions/entregas";

export interface EntregaArchivo {
  id: string;
  nombre: string;
  url: string; // URL firmada para descargar/ver
}

export interface EntregaFormProps {
  proyectoId: string;
  etapa: { id: number; numero: number; nombre: string };
  config: {
    titulo: string;
    descripcion: string;
    aceptaVideo: boolean;
    aceptaArchivos: boolean;
    aceptaTexto: boolean;
  };
  initial?: {
    videoUrl?: string | null;
    contexto?: string | null;
    estado?: string | null;
    archivos?: EntregaArchivo[];
  };
}

const inputClass =
  "block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-2.5 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function EntregaForm({ proyectoId, etapa, config, initial = {} }: EntregaFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl ?? "");
  const [contexto, setContexto] = useState(initial.contexto ?? "");
  const [archivos, setArchivos] = useState<EntregaArchivo[]>(initial.archivos ?? []);
  const [estado, setEstado] = useState(initial.estado ?? "borrador");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const thumbnail = config.aceptaVideo && videoUrl ? getYoutubeThumbnail(videoUrl) : null;

  async function handleGuardar(enviar: boolean) {
    setSaving(true);
    setFeedback(null);
    const res = await guardarEntrega({
      proyectoId,
      etapaId: etapa.id,
      videoUrl: config.aceptaVideo ? videoUrl : undefined,
      contexto: config.aceptaTexto ? contexto : undefined,
      enviar,
    });
    setSaving(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: res.error });
      return;
    }
    setEstado(enviar ? "enviada" : "borrador");
    setFeedback({ kind: "ok", msg: enviar ? "✅ Entrega enviada" : "💾 Borrador guardado" });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await subirArchivoEntrega({
        proyectoId,
        etapaId: etapa.id,
        archivoBase64: base64,
        archivoNombre: file.name,
        archivoTipoMime: file.type || "application/octet-stream",
      });
      if (!res.ok) {
        setFeedback({ kind: "err", msg: res.error });
      } else {
        setArchivos((prev) => [...prev, { id: res.id, nombre: res.nombre, url: res.url }]);
        setFeedback({ kind: "ok", msg: "📎 Archivo subido" });
      }
    } catch {
      setFeedback({ kind: "err", msg: "Error al subir el archivo" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleEliminar(id: string) {
    const res = await eliminarArchivoEntrega(id);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: res.error });
      return;
    }
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="brand-eyebrow text-brand-ink-muted">
            Etapa {String(etapa.numero).padStart(2, "0")} · {etapa.nombre}
          </p>
          <h3 className="brand-display mt-0.5 text-[20px] text-brand-primary">{config.titulo}</h3>
          <p className="mt-1 max-w-lg text-[13px] text-brand-ink-soft">{config.descripcion}</p>
        </div>
        <Badge tone={estado === "enviada" ? "secondary" : "neutral"}>
          {estado === "enviada" ? "Enviada ✓" : "Borrador"}
        </Badge>
      </div>

      <div className="mt-5 space-y-4">
        {/* Video */}
        {config.aceptaVideo && (
          <div className="flex flex-col gap-1.5">
            <label className="brand-eyebrow text-brand-ink-soft">Video (link de YouTube)</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtu.be/..."
              className={inputClass}
            />
            {thumbnail && (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt="Miniatura del video"
                  className="h-24 rounded-[var(--r-sm)] border border-brand-line object-cover"
                  loading="lazy"
                />
              </a>
            )}
          </div>
        )}

        {/* Contexto */}
        {config.aceptaTexto && (
          <div className="flex flex-col gap-1.5">
            <label className="brand-eyebrow text-brand-ink-soft">Contexto adicional</label>
            <textarea
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              rows={3}
              placeholder="Avances, métricas, respuestas al feedback…"
              className={cn(inputClass, "resize-y")}
            />
          </div>
        )}

        {/* Archivos */}
        {config.aceptaArchivos && (
          <div className="flex flex-col gap-2">
            <label className="brand-eyebrow text-brand-ink-soft">Archivos</label>
            {archivos.length > 0 && (
              <ul className="space-y-1.5">
                {archivos.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3 py-2 text-[13px]"
                  >
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-brand-ink hover:text-brand-accent hover:underline"
                    >
                      📎 {a.nombre}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleEliminar(a.id)}
                      className="shrink-0 text-[12px] text-brand-ink-muted hover:text-brand-accent"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileRef}
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="block w-full text-[13px] text-brand-ink-soft file:mr-3 file:rounded-[var(--r-sm)] file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white hover:file:bg-brand-primary/90"
            />
            {uploading && <p className="text-[12px] text-brand-ink-muted">Subiendo…</p>}
          </div>
        )}

        {feedback && (
          <p
            className={cn(
              "text-[13px]",
              feedback.kind === "ok" ? "text-brand-secondary" : "text-brand-accent",
            )}
          >
            {feedback.msg}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={() => handleGuardar(false)} disabled={saving}>
            {saving ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Button size="sm" onClick={() => handleGuardar(true)} disabled={saving}>
            Enviar entrega
          </Button>
        </div>
      </div>
    </Card>
  );
}
