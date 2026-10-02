export const VERTICALES = [
  { id: 0, label: "Todos" },
  { id: 1, label: "Idea" },
  { id: 2, label: "Emprendimiento" },
  { id: 3, label: "Intraemprendimiento" },
] as const;

export function coincideVertical(numero: number | null, vertical: number) {
  return vertical === 0 || numero === vertical;
}

export function normalizarBusqueda(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function proyectoAsignable(estado: string) {
  return ["enviada", "en_revision", "preseleccionado", "finalista", "premiado"].includes(estado);
}
