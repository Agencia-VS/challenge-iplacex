/**
 * Reglas de admisibilidad de una postulación — Challenge IPLACEX 2026.
 *
 * Traduce las validaciones duras de las Bases. Todas devuelven problemas en
 * lugar de lanzar: la postulación puede guardarse como borrador incompleta, y
 * solo el envío exige que no quede ninguno. Cada problema trae un código
 * estable, para que la interfaz pueda señalar el campo culpable.
 */

import { esRutValido, rutCanonico } from "@/lib/rut";

export const MAX_INTEGRANTES = 5;
export const MAX_EXTERNOS = 2;
export const EDAD_MINIMA = 18;

/** Vínculo del integrante con Iplacex. */
export type Calidad = "estudiante" | "egresado" | "titulado" | "externo";

export type Integrante = {
  rut: string;
  nombre: string;
  correo: string;
  calidad: Calidad;
  /** Obligatorios para quien no es externo. */
  carrera?: string | null;
  sede?: string | null;
  fechaNacimiento?: string | null;
  /** Solo aplica a estudiantes; egresados y titulados no tienen restricción. */
  matriculaVigente?: boolean | null;
  esRepresentante: boolean;
};

export type CodigoProblema =
  | "sin_integrantes"
  | "rut_invalido"
  | "rut_duplicado_en_equipo"
  | "correo_duplicado_en_equipo"
  | "equipo_excede_maximo"
  | "demasiados_externos"
  | "sin_representante"
  | "representante_duplicado"
  | "representante_externo"
  | "menor_de_edad"
  | "fecha_nacimiento_faltante"
  | "matricula_no_vigente"
  | "ya_participa_en_otro_proyecto"
  | "persona_excluida"
  | "postulaciones_cerradas";

export type Problema = {
  codigo: CodigoProblema;
  mensaje: string;
  /** RUT del integrante al que apunta el problema, si aplica a uno. */
  rut?: string;
};

/** Quien no puede participar, por las incompatibilidades de las Bases. */
export type PersonaExcluida = {
  rut: string;
  /** Docente, directivo, miembro del jurado, proveedor, familiar, etc. */
  motivo: string;
};

export type ContextoAdmisibilidad = {
  /** RUT (en cualquier formato) → id del proyecto en que ya participa. */
  rutsYaPostulados?: Record<string, string>;
  /** Registro de incompatibilidades, indexado por RUT. */
  excluidos?: PersonaExcluida[];
  /** Cierre de postulaciones; si se pasó, no se puede enviar. */
  cierre?: Date;
  ahora?: Date;
  /** Proyecto que se está editando: no se acusa a sí mismo de duplicado. */
  proyectoId?: string;
};

/** Edad cumplida a una fecha dada. */
export function edadA(fechaNacimiento: string, fecha: Date): number {
  const n = new Date(fechaNacimiento);
  let edad = fecha.getUTCFullYear() - n.getUTCFullYear();
  const mes = fecha.getUTCMonth() - n.getUTCMonth();
  if (mes < 0 || (mes === 0 && fecha.getUTCDate() < n.getUTCDate())) edad--;
  return edad;
}

export function validarAdmisibilidad(
  integrantes: Integrante[],
  contexto: ContextoAdmisibilidad = {},
): Problema[] {
  const problemas: Problema[] = [];
  const ahora = contexto.ahora ?? new Date();
  const yaPostulados = Object.fromEntries(
    Object.entries(contexto.rutsYaPostulados ?? {}).map(([r, id]) => [rutCanonico(r), id]),
  );
  const excluidos = new Map(
    (contexto.excluidos ?? []).map((e) => [rutCanonico(e.rut), e]),
  );

  if (contexto.cierre && ahora > contexto.cierre) {
    problemas.push({
      codigo: "postulaciones_cerradas",
      mensaje: "El plazo de postulación está cerrado.",
    });
  }

  if (integrantes.length === 0) {
    problemas.push({ codigo: "sin_integrantes", mensaje: "El equipo no tiene integrantes." });
    return problemas;
  }

  if (integrantes.length > MAX_INTEGRANTES) {
    problemas.push({
      codigo: "equipo_excede_maximo",
      mensaje: `El equipo no puede superar ${MAX_INTEGRANTES} integrantes; tiene ${integrantes.length}.`,
    });
  }

  const externos = integrantes.filter((i) => i.calidad === "externo");
  if (externos.length > MAX_EXTERNOS) {
    problemas.push({
      codigo: "demasiados_externos",
      mensaje: `Se admiten hasta ${MAX_EXTERNOS} integrantes externos; hay ${externos.length}.`,
    });
  }

  const representantes = integrantes.filter((i) => i.esRepresentante);
  if (representantes.length === 0) {
    problemas.push({ codigo: "sin_representante", mensaje: "Falta designar al representante." });
  } else if (representantes.length > 1) {
    problemas.push({
      codigo: "representante_duplicado",
      mensaje: "Solo puede haber un representante.",
    });
  }
  for (const r of representantes) {
    if (r.calidad === "externo") {
      problemas.push({
        codigo: "representante_externo",
        mensaje: "El representante debe ser estudiante, egresado o titulado de Iplacex.",
        rut: r.rut,
      });
    }
  }

  // Duplicados dentro del propio equipo, por RUT y por correo.
  const vistosRut = new Set<string>();
  const vistosCorreo = new Set<string>();

  for (const i of integrantes) {
    const rut = rutCanonico(i.rut);

    if (!esRutValido(i.rut)) {
      problemas.push({ codigo: "rut_invalido", mensaje: `RUT inválido: ${i.rut}`, rut: i.rut });
    }

    if (vistosRut.has(rut)) {
      problemas.push({
        codigo: "rut_duplicado_en_equipo",
        mensaje: `El RUT ${i.rut} aparece más de una vez en el equipo.`,
        rut: i.rut,
      });
    }
    vistosRut.add(rut);

    const correo = i.correo.trim().toLowerCase();
    if (correo && vistosCorreo.has(correo)) {
      problemas.push({
        codigo: "correo_duplicado_en_equipo",
        mensaje: `El correo ${i.correo} aparece más de una vez en el equipo.`,
        rut: i.rut,
      });
    }
    if (correo) vistosCorreo.add(correo);

    // Una persona, un solo proyecto: participar en dos es inadmisible.
    const otroProyecto = yaPostulados[rut];
    if (otroProyecto && otroProyecto !== contexto.proyectoId) {
      problemas.push({
        codigo: "ya_participa_en_otro_proyecto",
        mensaje: `${i.nombre} ya participa en otro proyecto.`,
        rut: i.rut,
      });
    }

    const excluido = excluidos.get(rut);
    if (excluido) {
      problemas.push({
        codigo: "persona_excluida",
        mensaje: `${i.nombre} no puede participar: ${excluido.motivo}.`,
        rut: i.rut,
      });
    }

    if (!i.fechaNacimiento) {
      problemas.push({
        codigo: "fecha_nacimiento_faltante",
        mensaje: `Falta la fecha de nacimiento de ${i.nombre}.`,
        rut: i.rut,
      });
    } else if (edadA(i.fechaNacimiento, ahora) < EDAD_MINIMA) {
      problemas.push({
        codigo: "menor_de_edad",
        mensaje: `${i.nombre} debe ser mayor de ${EDAD_MINIMA} años.`,
        rut: i.rut,
      });
    }

    // La matrícula vigente solo se exige a estudiantes: egresados y titulados
    // no tienen restricción de año.
    if (i.calidad === "estudiante" && i.matriculaVigente !== true) {
      problemas.push({
        codigo: "matricula_no_vigente",
        mensaje: `${i.nombre} debe tener matrícula vigente.`,
        rut: i.rut,
      });
    }
  }

  return problemas;
}

/** ¿La postulación puede enviarse? */
export function esAdmisible(
  integrantes: Integrante[],
  contexto: ContextoAdmisibilidad = {},
): boolean {
  return validarAdmisibilidad(integrantes, contexto).length === 0;
}

/**
 * Los externos no pueden recibir el premio en dinero. La postulación es válida
 * con ellos; la restricción aplica al momento de pagar.
 */
export function integrantesQuePuedenCobrar(integrantes: Integrante[]): Integrante[] {
  return integrantes.filter((i) => i.calidad !== "externo");
}
