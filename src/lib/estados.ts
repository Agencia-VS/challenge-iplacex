// Configuración de display para cada estado de postulación.
// Los valores por defecto se usan cuando la convocatoria no define los suyos propios.
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
  borrador:           { label: "Borrador",    tone: "neutral"   },
  enviada:            { label: "Enviada",     tone: "secondary"    },
  en_revision:        { label: "En revisión", tone: "accent"  },
  ronda_1_pasada:     { label: "R1 ✓",        tone: "success" },
  ronda_1_descartada: { label: "R1 ✗",        tone: "neutral"   },
  ronda_2_pasada:     { label: "R2 ✓",        tone: "success" },
  ronda_2_descartada: { label: "R2 ✗",        tone: "neutral"   },
  finalista:          { label: "Finalista",   tone: "primary"  },
  ganador:            { label: "Ganador",     tone: "accent"  },
};

export const TRANSICIONES_DEFAULT: Record<string, TransicionEstado[]> = {
  enviada: [
    { label: "Poner en revisión", estado: "en_revision" },
  ],
  en_revision: [
    { label: "Pasar Ronda 1 ✓",      estado: "ronda_1_pasada"     },
    { label: "Descartar Ronda 1 ✗",  estado: "ronda_1_descartada", danger: true },
  ],
  ronda_1_pasada: [
    { label: "Pasar Ronda 2 ✓",      estado: "ronda_2_pasada"     },
    { label: "Descartar Ronda 2 ✗",  estado: "ronda_2_descartada", danger: true },
  ],
  ronda_2_pasada: [
    { label: "Marcar Finalista", estado: "finalista" },
  ],
  finalista: [
    { label: "Marcar Ganador 🏆", estado: "ganador" },
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
