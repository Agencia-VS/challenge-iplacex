import type { TipoEtapa } from "@/lib/site";

/**
 * Qué etapas admiten una entrega del postulante y qué acepta cada una.
 *
 * TODO(bases): las Bases no definen campos de carga de archivos, pese a que la
 * Categoría 2 exige acreditar ventas o contratos y el Demo Day requiere
 * material de presentación. Los entregables de abajo son provisorios y están
 * pendientes de confirmación con la Dirección de Formación General; el
 * mecanismo ya funciona, lo que falta es la definición.
 *
 * La postulación misma nunca es un entregable: se edita en su propio
 * formulario y se cierra con el plazo.
 */

export type EstadoPostulacion =
  | "borrador"
  | "enviada"
  | "en_revision"
  | "inadmisible"
  | "preseleccionado"
  | "no_preseleccionado"
  | "descalificado"
  | "finalista"
  | "no_finalista"
  | "premiado";

export interface EntregableConfig {
  titulo: string;
  descripcion: string;
  aceptaVideo: boolean;
  aceptaArchivos: boolean;
  aceptaTexto: boolean;
  /** Estados de postulación que habilitan esta entrega. */
  habilitadaEn: EstadoPostulacion[];
}

/** Quien fue preseleccionado participa del bootcamp y sigue en carrera. */
const EN_CARRERA: EstadoPostulacion[] = ["preseleccionado", "finalista", "premiado"];
/** Solo los finalistas presentan en el Demo Day. */
const FINALISTAS: EstadoPostulacion[] = ["finalista", "premiado"];

export const ENTREGABLES: Partial<Record<TipoEtapa, EntregableConfig>> = {
  bootcamp: {
    titulo: "Avances del bootcamp",
    descripcion: "Comparte avances, prototipos o material para tus sesiones de mentoría.",
    aceptaVideo: false,
    aceptaArchivos: true,
    aceptaTexto: true,
    habilitadaEn: EN_CARRERA,
  },
  demo_day: {
    titulo: "Material del Demo Day",
    descripcion: "Sube la presentación con que expondrás ante el jurado.",
    aceptaVideo: true,
    aceptaArchivos: true,
    aceptaTexto: true,
    habilitadaEn: FINALISTAS,
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
 * Dado el estado de la postulación y las etapas del concurso, devuelve las
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
