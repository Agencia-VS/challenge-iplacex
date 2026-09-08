-- ================================================================================
-- Seed · Challenge IPLACEX 2026
-- Concurso de Emprendimiento e Innovacion
--
-- Categorias y criterios provienen del anexo "Rubricas de Evaluacion de
-- Proyectos" de las Bases del Concurso. Su contraparte en codigo es
-- src/lib/rubrica.ts, que es la fuente de verdad de la aplicacion: este seed
-- solo la refleja en la base para que las consultas puedan unir por FK.
--
-- Idempotente: se puede correr mas de una vez sin duplicar filas.
-- ================================================================================

-- 1. Convocatoria
INSERT INTO public.convocatorias (ano, nombre, slug, descripcion, fecha_inicio, fecha_cierre, estado, config)
VALUES (
  2026,
  'Challenge IPLACEX 2026',
  'challenge-iplacex-2026',
  'Concurso de Emprendimiento e Innovacion de Iplacex. Tres categorias, cinco criterios y una rubrica por etapa de desarrollo.',
  -- TODO(bases): fechas provisorias, fijar con el cronograma oficial.
  '2026-03-02 12:00:00+00',
  '2026-06-30 12:00:00+00',
  'borrador',
  '{"nEvaluadoresPorProyecto": 2, "evaluacionCiega": true, "requiereVideoEnPostulacion": true}'::jsonb
)
ON CONFLICT (ano) DO UPDATE
  SET nombre = EXCLUDED.nombre, slug = EXCLUDED.slug, descripcion = EXCLUDED.descripcion;

-- 2. Categorias
INSERT INTO public.categorias (convocatoria_id, numero, nombre, slug, alcance)
SELECT c.id, v.numero, v.nombre, v.slug, v.alcance
FROM public.convocatorias c
CROSS JOIN (VALUES
  (1, 'Idea en etapa temprana (pre-negocio)', 'idea-temprana', 'Proyectos que aún no inician operaciones comerciales y se encuentran en fase de conceptualización, prototipado o validación exploratoria. No se espera evidencia de ventas ni de operación; se evalúa la calidad de la formulación, el sustento exploratorio y la conciencia sobre lo que resta validar.'),
  (2, 'Emprendimiento en etapa de implementación', 'implementacion', 'Proyectos en operación, con evidencia verificable de validación de mercado. Se evalúa la solidez de la evidencia real disponible, la tracción demostrada y la consistencia entre las métricas presentadas y la viabilidad declarada.'),
  (3, 'Intraemprendimiento / Innovación social', 'intraemprendimiento', 'Proyectos que introducen una mejora al interior de una organización existente, o que abordan una problemática social, comunitaria o ambiental. El eje es la pertinencia respecto del contexto declarado: la factibilidad se juzga según las condiciones reales de esa organización o comunidad, y el impacto según los beneficiarios identificados.')
) AS v(numero, nombre, slug, alcance)
WHERE c.ano = 2026
ON CONFLICT (convocatoria_id, numero) DO UPDATE
  SET nombre = EXCLUDED.nombre, slug = EXCLUDED.slug, alcance = EXCLUDED.alcance;

-- 3. Criterios
-- Los cinco criterios son comunes a las tres categorias, igual que sus
-- ponderaciones; lo que cambia entre categorias son los descriptores de
-- desempeno, que viven en src/lib/rubrica.ts. Los pesos suman 100.
INSERT INTO public.criterios (convocatoria_id, nombre, descripcion, slug, peso, orden)
SELECT c.id, v.nombre, v.descripcion, v.slug, v.peso, v.orden
FROM public.convocatorias c
CROSS JOIN (VALUES
  ('Problema y oportunidad', 'Claridad en la identificación del problema u oportunidad y su relevancia para el usuario o beneficiario', 'problema', 20, 1),
  ('Propuesta de valor e innovación', 'Grado de novedad, diferenciación y pertinencia de la solución', 'propuesta-valor', 25, 2),
  ('Viabilidad', 'Solidez de los datos, factibilidad técnica, económica y comercial', 'viabilidad', 25, 3),
  ('Impacto y sostenibilidad', 'Impacto social, económico y/o ambiental; alineación con los ODS', 'impacto', 15, 4),
  ('Comunicación (pitch)', 'Claridad, estructura y capacidad de persuasión en la presentación', 'comunicacion', 15, 5)
) AS v(nombre, descripcion, slug, peso, orden)
WHERE c.ano = 2026
ON CONFLICT (convocatoria_id, slug) DO UPDATE
  SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion,
      peso = EXCLUDED.peso, orden = EXCLUDED.orden;

-- 4. Etapas del proceso
-- El bootcamp representa la semifinal operativa: durante esta etapa los
-- proyectos entregan los antecedentes solicitados y se define quiénes pasan
-- al Demo Day. No se crea una etapa pública adicional llamada "semifinal".
INSERT INTO public.etapas (
  convocatoria_id, numero, tipo, nombre, descripcion,
  fecha_inicio, fecha_fin, duracion_dias, semana_inicio, semana_fin
)
SELECT
  c.id,
  v.numero,
  v.tipo::public.tipo_etapa,
  v.nombre,
  v.descripcion,
  v.fecha_inicio::timestamptz,
  v.fecha_fin::timestamptz,
  v.duracion_dias,
  v.semana_inicio,
  v.semana_fin
FROM public.convocatorias c
CROSS JOIN (VALUES
  (
    1,
    'postulacion',
    'Lanzamiento y apertura',
    'Se inicia la recepción de proyectos mediante la plataforma.',
    '2026-09-14 12:00:00+00',
    '2026-09-14 12:00:00+00',
    1,
    NULL,
    NULL
  ),
  (
    2,
    'postulacion',
    'Cierre de postulaciones',
    'Finaliza la recepción de proyectos y comienza la revisión de admisibilidad.',
    '2026-10-02 00:00:00+00',
    '2026-10-02 23:59:00+00',
    1,
    NULL,
    NULL
  ),
  (
    3,
    'preseleccion',
    'Preselección',
    'El Comité Técnico evalúa los proyectos y selecciona los que pasan al bootcamp.',
    '2026-10-03 00:00:00+00',
    '2026-10-09 23:59:00+00',
    7,
    NULL,
    NULL
  ),
  (
    4,
    'bootcamp',
    'Bootcamp y mentorías',
    'Los proyectos preseleccionados participan en el bootcamp y cargan los archivos solicitados durante esta etapa.',
    '2026-10-12 00:00:00+00',
    '2026-11-06 23:59:00+00',
    26,
    1,
    4
  ),
  (
    5,
    'seleccion_finalistas',
    'Selección de finalistas',
    'Se seleccionan los proyectos que presentarán su propuesta en el Demo Day.',
    '2026-11-06 00:00:00+00',
    '2026-11-06 23:59:00+00',
    1,
    NULL,
    NULL
  ),
  (
    6,
    'demo_day',
    'Demo Day y premiación',
    'Instancia presencial y en vivo en la que el jurado selecciona el proyecto ganador.',
    '2026-11-12 00:00:00+00',
    '2026-11-12 23:59:00+00',
    1,
    NULL,
    NULL
  )
) AS v(
  numero, tipo, nombre, descripcion,
  fecha_inicio, fecha_fin, duracion_dias, semana_inicio, semana_fin
)
WHERE c.ano = 2026
ON CONFLICT (convocatoria_id, numero) DO UPDATE
  SET tipo = EXCLUDED.tipo,
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      fecha_inicio = EXCLUDED.fecha_inicio,
      fecha_fin = EXCLUDED.fecha_fin,
      duracion_dias = EXCLUDED.duracion_dias,
      semana_inicio = EXCLUDED.semana_inicio,
      semana_fin = EXCLUDED.semana_fin;

-- Verificacion: los pesos deben sumar exactamente 100.
DO $$
DECLARE total INTEGER;
BEGIN
  SELECT COALESCE(SUM(cr.peso), 0) INTO total
  FROM public.criterios cr
  INNER JOIN public.convocatorias c ON c.id = cr.convocatoria_id
  WHERE c.ano = 2026;
  IF total <> 100 THEN
    RAISE EXCEPTION 'Los pesos de los criterios suman %, deben sumar 100', total;
  END IF;
END $$;
