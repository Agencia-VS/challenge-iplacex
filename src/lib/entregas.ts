import type { TipoEtapa } from "@/lib/site";

/**
 * Configuración de qué etapas son "entregables" por el postulante y qué acepta
 * cada una. Aditivo: NO incluye `postulacion` (la postulación no se toca).
 *
 * El `estado_postulacion` del proyecto (que mueve el admin al avanzar de ronda)
 * es lo que habilita cada entrega.
 */

export type EstadoPostulacion =
  | "borrador"
  | "enviada"
  | "en_revision"
  | "ronda_1_pasada"
  | "ronda_1_descartada"
  | "ronda_2_pasada"
  | "ronda_2_descartada"
  | "finalista"
  | "ganador";

export interface EntregableConfig {
  titulo: string;
  descripcion: string;
  aceptaVideo: boolean;
  aceptaArchivos: boolean;
  aceptaTexto: boolean;
  /** Estados de postulación que habilitan esta entrega. */
  habilitadaEn: EstadoPostulacion[];
}

// Estados "seleccionado en ronda 1" en adelante.
const DESDE_RONDA_1: EstadoPostulacion[] = [
  "ronda_1_pasada",
  "ronda_2_pasada",
  "finalista",
  "ganador",
];
// Estados "finalista" en adelante.
const DESDE_RONDA_2: EstadoPostulacion[] = ["ronda_2_pasada", "finalista", "ganador"];

/** Config por tipo de etapa. Los tipos no listados no son entregables. */
export const ENTREGABLES: Partial<Record<TipoEtapa, EntregableConfig>> = {
  entrega_2: {
    titulo: "Video Pitch",
    descripcion: "Sube tu Video Pitch (máx. 3 min) y material de apoyo para la 2.ª Entrega.",
    aceptaVideo: true,
    aceptaArchivos: true,
    aceptaTexto: true,
    habilitadaEn: DESDE_RONDA_1,
  },
  pitch: {
    titulo: "Pitch 60 segundos",
    descripcion: "Sube el video de tu pitch de 60 segundos.",
    aceptaVideo: true,
    aceptaArchivos: false,
    aceptaTexto: true,
    habilitadaEn: DESDE_RONDA_2,
  },
  mentoria: {
    titulo: "Mentoría",
    descripcion: "Comparte avances, prototipos o material para tus sesiones de mentoría.",
    aceptaVideo: false,
    aceptaArchivos: true,
    aceptaTexto: true,
    habilitadaEn: DESDE_RONDA_2,
  },
};

export function esEntregable(tipo: string): tipo is TipoEtapa {
  return tipo in ENTREGABLES;
}

export type EtapaEntregable = {
  id: number;
  numero: number;
  nombre: string;
  tipo: TipoEtapa;
};

export interface EntregaHabilitada {
  etapa: EtapaEntregable;
  config: EntregableConfig;
  habilitada: boolean;
}

/**
 * Dado el estado de la postulación y las etapas de la convocatoria, devuelve las
 * etapas entregables (ordenadas por número) indicando cuáles están habilitadas.
 */
export function entregasHabilitadas(
  estado: string | null | undefined,
  etapas: { id: number; numero: number; nombre: string; tipo: string }[] | null | undefined,
): EntregaHabilitada[] {
  const est = (estado ?? "borrador") as EstadoPostulacion;
  return (etapas ?? [])
    .filter((e) => esEntregable(e.tipo))
    .map((e) => {
      const config = ENTREGABLES[e.tipo as TipoEtapa]!;
      return {
        etapa: { id: e.id, numero: e.numero, nombre: e.nombre, tipo: e.tipo as TipoEtapa },
        config,
        habilitada: config.habilitadaEn.includes(est),
      };
    })
    .sort((a, b) => a.etapa.numero - b.etapa.numero);
}
