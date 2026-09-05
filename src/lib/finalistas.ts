/**
 * Selección de finalistas para el Demo Day — Challenge IPLACEX 2026.
 *
 * El ranking es único: no hay premios por categoría. Pero para garantizar que
 * las tres categorías lleguen representadas, seis de los diez cupos se asignan
 * a los dos mejores de cada categoría y los cuatro restantes salen del ranking
 * general, sin importar la categoría.
 *
 * Si una categoría no reúne dos proyectos sobre el umbral de aprobación, sus
 * cupos no se pierden: caen al ranking general. Eso ocurre solo, sin un caso
 * especial, porque la segunda pasada rellena hasta completar los diez.
 */

import {
  CATEGORIAS,
  PUNTAJE_APROBACION,
  type CategoriaSlug,
  type CriterioSlug,
  type NivelDesempeno,
} from "@/lib/rubrica";

/** Cupos totales del Demo Day. */
export const CUPOS_DEMO_DAY = 10;
/** Cupos garantizados a cada categoría. */
export const CUPOS_POR_CATEGORIA = 2;

/**
 * Orden de desempate según las Bases. Se comparan los niveles y no el puntaje
 * del criterio porque la ponderación es la misma para ambos proyectos: a igual
 * peso, mayor nivel es siempre mayor puntaje, y el nivel es exacto.
 */
export const ORDEN_DESEMPATE: CriterioSlug[] = ["propuesta-valor", "viabilidad", "impacto"];

export type ProyectoPuntuado = {
  id: string;
  codigoCiego: string;
  categoria: CategoriaSlug;
  /** Puntaje consolidado en escala 0-100. */
  puntaje: number;
  /** Niveles por criterio, para aplicar el desempate. */
  niveles: Partial<Record<CriterioSlug, NivelDesempeno>>;
};

/** Por qué entró un proyecto: cupo garantizado de su categoría o ranking general. */
export type OrigenCupo = "categoria" | "general";

export type Finalista = ProyectoPuntuado & { origen: OrigenCupo; posicion: number };

/**
 * Empate que el desempate automático no resuelve y que además decide un cupo:
 * un proyecto seleccionado y otro que quedó fuera con exactamente el mismo
 * puntaje y los mismos niveles en los tres criterios de desempate.
 */
export type EmpateSinResolver = {
  dentro: ProyectoPuntuado;
  fuera: ProyectoPuntuado;
};

export type Seleccion = {
  finalistas: Finalista[];
  /** Todos los elegibles, ordenados. */
  ranking: ProyectoPuntuado[];
  /** Sobre el umbral pero sin cupo. */
  noSeleccionados: ProyectoPuntuado[];
  /** Cupos de categoría que quedaron sin llenar y pasaron al ranking general. */
  cuposRedistribuidos: number;
  /**
   * Empates en la línea de corte que las Bases mandan a "decisión fundada del
   * jurado". El algoritmo no los resuelve por su cuenta: los expone.
   */
  empatesSinResolver: EmpateSinResolver[];
};

/**
 * Orden del ranking: primero el puntaje, luego los criterios de desempate.
 * Devuelve 0 cuando las Bases ya no ofrecen más criterios, es decir cuando la
 * decisión pasa al jurado.
 */
export function compararProyectos(a: ProyectoPuntuado, b: ProyectoPuntuado): number {
  if (a.puntaje !== b.puntaje) return b.puntaje - a.puntaje;
  for (const slug of ORDEN_DESEMPATE) {
    const na = a.niveles[slug] ?? 0;
    const nb = b.niveles[slug] ?? 0;
    if (na !== nb) return nb - na;
  }
  return 0;
}

/** ¿Empatan hasta agotar los criterios de desempate de las Bases? */
function empatanDelTodo(a: ProyectoPuntuado, b: ProyectoPuntuado): boolean {
  return compararProyectos(a, b) === 0;
}

export function seleccionarFinalistas(
  proyectos: ProyectoPuntuado[],
  opciones: { cupos?: number; cuposPorCategoria?: number; umbral?: number } = {},
): Seleccion {
  const cupos = opciones.cupos ?? CUPOS_DEMO_DAY;
  const porCategoria = opciones.cuposPorCategoria ?? CUPOS_POR_CATEGORIA;
  const umbral = opciones.umbral ?? PUNTAJE_APROBACION;

  // Solo compiten los proyectos que alcanzan el mínimo de aprobación.
  const ranking = proyectos.filter((p) => p.puntaje >= umbral).sort(compararProyectos);

  const elegidos: Finalista[] = [];
  const tomados = new Set<string>();

  // 1. Cupos garantizados: los mejores de cada categoría.
  let cuposDeCategoriaUsados = 0;
  for (const categoria of CATEGORIAS) {
    const deLaCategoria = ranking.filter((p) => p.categoria === categoria.slug);
    for (const p of deLaCategoria.slice(0, porCategoria)) {
      if (elegidos.length >= cupos) break;
      elegidos.push({ ...p, origen: "categoria", posicion: 0 });
      tomados.add(p.id);
      cuposDeCategoriaUsados++;
    }
  }

  // 2. El resto, por ranking general. Absorbe los cupos de categoría vacantes.
  for (const p of ranking) {
    if (elegidos.length >= cupos) break;
    if (tomados.has(p.id)) continue;
    elegidos.push({ ...p, origen: "general", posicion: 0 });
    tomados.add(p.id);
  }

  const finalistas = elegidos
    .sort(compararProyectos)
    .map((f, i) => ({ ...f, posicion: i + 1 }));

  const noSeleccionados = ranking.filter((p) => !tomados.has(p.id));

  // Un empate solo importa si decide un cupo: alguien dentro empatado del todo
  // con alguien fuera. Entre dos que entran, o dos que quedan fuera, da igual.
  const empatesSinResolver: EmpateSinResolver[] = [];
  for (const dentro of finalistas) {
    for (const fuera of noSeleccionados) {
      if (empatanDelTodo(dentro, fuera)) empatesSinResolver.push({ dentro, fuera });
    }
  }

  return {
    finalistas,
    ranking,
    noSeleccionados,
    cuposRedistribuidos: porCategoria * CATEGORIAS.length - cuposDeCategoriaUsados,
    empatesSinResolver,
  };
}
