type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue) {
  if (typeof value === "number") return String(value);
  let text = value ?? "";
  // Evita que respuestas ingresadas por usuarios se interpreten como fórmulas
  // al abrir el archivo en Excel o una hoja de cálculo.
  if (/^[\t\r\n ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function descargarCsv(
  nombre: string,
  encabezados: string[],
  filas: CsvValue[][],
) {
  const contenido = "\uFEFF" + [encabezados, ...filas]
    .map((fila) => fila.map(csvCell).join(";"))
    .join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
