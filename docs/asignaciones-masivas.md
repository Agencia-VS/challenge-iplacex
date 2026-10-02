# Asignación masiva y tablas por vertical

## Admin

En **Proyectos**, elegir primero la etapa. La tabla y el ranking muestran solo
proyectos de la convocatoria correspondiente. Las pestañas Todos, Idea,
Emprendimiento e Intraemprendimiento usan `categorias.numero` (1, 2 y 3), por lo
que no dependen de la redacción del nombre de la categoría.

1. Elegir una vertical y, opcionalmente, buscar por código, nombre o postulante.
2. Marcar proyectos o usar la casilla de cabecera para seleccionar todos los
   proyectos visibles y asignables. Borradores y proyectos descartados o
   descalificados no se pueden seleccionar para la operación masiva.
3. Seleccionar uno o varios evaluadores. Cada evaluador elegido recibirá **todos**
   los proyectos seleccionados en esa etapa.
4. Revisar las cantidades en el botón y confirmar con «Asignar».

Cambiar de vertical, búsqueda o etapa limpia los proyectos seleccionados. No hay
selecciones ocultas entre pestañas. Durante una escritura se bloquean los
controles que podrían cambiar su alcance. Los errores conservan la selección y
permiten reintentar; el resultado informa cuántas asignaciones se crearon y
cuántas existían. Se conservan las asignaciones y evaluaciones previas.

Límites por envío: hasta 500 proyectos, 50 evaluadores y 1.000 combinaciones.
Se mantiene la gestión individual existente. La operación masiva solo agrega
asignaciones: no elimina ninguna ni distribuye aleatoriamente los proyectos.

El ranking mantiene sus puestos generales y el cupo de diez de preselección al
filtrar por vertical. La exportación descarga únicamente la vista filtrada,
conservando esos puestos.

## Evaluadores

Dashboard, Proyectos asignados y Mis evaluaciones comparten una tabla con:
- Pestañas de vertical con contadores.
- Búsqueda por código/categoría y filtros por etapa y estado.
- Pendientes primero, luego en progreso y completadas; dentro de cada estado,
  orden por código.
- Código ciego, categoría, etapa, estado, puntaje, fecha y acceso a la evaluación.

Los enlaces conservan el identificador de asignación para abrir la etapa
correcta cuando un proyecto se evalúa más de una vez. El ranking del Comité
Técnico también tiene pestañas por vertical y conserva los puestos globales.

## Seguridad y despliegue

No requiere una migración SQL ni variables nuevas. Usa el cliente administrativo
existente con `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente en el servidor, después
de verificar que la cuenta autenticada tiene rol admin en `usuarios`.

El servidor valida tamaños, UUID, etapa, convocatoria, existencia de todos los
proyectos y usuarios, estados asignables y roles de evaluador. El lote se escribe
en una sola sentencia `upsert` con `ignoreDuplicates`, apoyada en la restricción
existente `UNIQUE (proyecto_id, evaluador_id, etapa_id)`. Los conflictos se omiten,
sin actualizar el estado ni el ID de asignaciones existentes.

Este cambio es independiente del PR de condición académica/Mi perfil.

## Verificación

```bash
npm run build
npm run lint
node --test tests/asignaciones-masivas.test.mjs
```

Prueba manual: seleccionar dos proyectos y dos evaluadores, confirmar las cuatro
combinaciones y repetir la selección. La segunda vez deben reportarse como
existentes, manteniendo las evaluaciones ya iniciadas/finalizadas. Probar cambios
de vertical, búsqueda y etapa, errores de guardado y el flujo desde móvil.
