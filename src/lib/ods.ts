/**
 * Objetivos de Desarrollo Sostenible de la Agenda 2030.
 *
 * La postulación pide vincular el proyecto con uno o más ODS (multiselección),
 * y el criterio "Impacto y sostenibilidad" evalúa que ese vínculo esté fundado.
 * Los nombres son los oficiales en español, en el orden oficial: se usan tal
 * cual porque el evaluador los contrasta contra la documentación de la Agenda.
 */

export type Ods = {
  numero: number;
  nombre: string;
};

export const ODS: Ods[] = [
  { numero: 1, nombre: "Fin de la pobreza" },
  { numero: 2, nombre: "Hambre cero" },
  { numero: 3, nombre: "Salud y bienestar" },
  { numero: 4, nombre: "Educación de calidad" },
  { numero: 5, nombre: "Igualdad de género" },
  { numero: 6, nombre: "Agua limpia y saneamiento" },
  { numero: 7, nombre: "Energía asequible y no contaminante" },
  { numero: 8, nombre: "Trabajo decente y crecimiento económico" },
  { numero: 9, nombre: "Industria, innovación e infraestructura" },
  { numero: 10, nombre: "Reducción de las desigualdades" },
  { numero: 11, nombre: "Ciudades y comunidades sostenibles" },
  { numero: 12, nombre: "Producción y consumo responsables" },
  { numero: 13, nombre: "Acción por el clima" },
  { numero: 14, nombre: "Vida submarina" },
  { numero: 15, nombre: "Vida de ecosistemas terrestres" },
  { numero: 16, nombre: "Paz, justicia e instituciones sólidas" },
  { numero: 17, nombre: "Alianzas para lograr los objetivos" },
];

/** Busca un ODS por su número; `undefined` si está fuera de 1..17. */
export function odsPorNumero(numero: number): Ods | undefined {
  return ODS.find((o) => o.numero === numero);
}
