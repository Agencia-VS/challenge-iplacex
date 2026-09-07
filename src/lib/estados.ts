// Configuración de display para cada estado de postulación.
// Los valores por defecto se usan cuando el concurso no define los suyos propios.
// La columna `convocatorias.config.estadosBadge` y `convocatorias.config.transicionesEstado`
// pueden sobreescribirlos desde la BD.

export type EstadoBadgeTone =
  | "accent"
  | "secondary"
  | "primary"
  | "neutral"
  | "success"
  | "warning";

export interface EstadoBadgeConfig {
  label: string;
  tone: EstadoBadgeTone;
}

export interface TransicionEstado {
  label: string;
  estado: string;
  danger?: boolean;
}

export const ESTADO_BADGE_DEFAULT: Record<string, EstadoBadgeConfig> = {
  borrador:           { label: "Borrador",          tone: "neutral"   },
  enviada:            { label: "Enviada",           tone: "secondary" },
  en_revision:        { label: "En revisión",       tone: "accent"    },
  inadmisible:        { label: "Inadmisible",       tone: "neutral"   },
  preseleccionado:    { label: "Preseleccionado",   tone: "success"   },
  no_preseleccionado: { label: "No preseleccionado", tone: "neutral"  },
  descalificado:      { label: "Descalificado",     tone: "warning"   },
  finalista:          { label: "Finalista",         tone: "primary"   },
  no_finalista:       { label: "No finalista",      tone: "neutral"   },
  premiado:           { label: "Premiado",          tone: "accent"    },
};

// Transiciones que el Comité Técnico y el Comité Organizador pueden aplicar,
// en el orden del calendario. La descalificación por asistencia al bootcamp se
// aplica sobre un preseleccionado, que es quien participa en él.
export const TRANSICIONES_DEFAULT: Record<string, TransicionEstado[]> = {
  enviada: [
    { label: "Revisar admisibilidad", estado: "en_revision" },
  ],
  en_revision: [
    { label: "Declarar inadmisible", estado: "inadmisible", danger: true },
    { label: "Preseleccionar ✓", estado: "preseleccionado" },
    { label: "No preseleccionar ✗", estado: "no_preseleccionado", danger: true },
  ],
  preseleccionado: [
    { label: "Marcar finalista ✓", estado: "finalista" },
    { label: "No pasa a finalista ✗", estado: "no_finalista", danger: true },
    { label: "Descalificar por asistencia", estado: "descalificado", danger: true },
  ],
  finalista: [
    { label: "Marcar premiado 🏆", estado: "premiado" },
  ],
};

/** Fusiona los overrides de BD con los defaults. Acepta datos parciales. */
export function resolveEstadoBadge(
  overrides?: Partial<Record<string, EstadoBadgeConfig>> | null,
): Record<string, EstadoBadgeConfig> {
  if (!overrides) return ESTADO_BADGE_DEFAULT;
  return { ...ESTADO_BADGE_DEFAULT, ...overrides } as Record<string, EstadoBadgeConfig>;
}

export function resolveTransiciones(
  overrides?: Partial<Record<string, TransicionEstado[]>> | null,
): Record<string, TransicionEstado[]> {
  if (!overrides) return TRANSICIONES_DEFAULT;
  return { ...TRANSICIONES_DEFAULT, ...overrides } as Record<string, TransicionEstado[]>;
}
