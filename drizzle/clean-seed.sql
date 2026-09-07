-- ================================================================================
-- LIMPIEZA DE DATOS SEED — Challenge IPLACEX 2026
-- Ejecutar en Supabase SQL Editor (Settings > SQL Editor)
-- Elimina todos los datos de prueba en orden correcto (respetando FKs)
-- ================================================================================

-- 1. Evaluaciones (dependen de proyectos y criterios)
DELETE FROM public.evaluaciones
WHERE proyecto_id IN (
  SELECT p.id FROM public.proyectos p
  INNER JOIN public.categorias cat ON cat.id = p.categoria_id
  INNER JOIN public.convocatorias conv ON conv.id = cat.convocatoria_id
  WHERE conv.ano = 2026
);

-- 2. Asignaciones (dependen de proyectos y etapas)
DELETE FROM public.asignaciones
WHERE proyecto_id IN (
  SELECT p.id FROM public.proyectos p
  INNER JOIN public.categorias cat ON cat.id = p.categoria_id
  INNER JOIN public.convocatorias conv ON conv.id = cat.convocatoria_id
  WHERE conv.ano = 2026
);

-- 3. Proyectos (dependen de categorias)
DELETE FROM public.proyectos
WHERE categoria_id IN (
  SELECT cat.id FROM public.categorias cat
  INNER JOIN public.convocatorias conv ON conv.id = cat.convocatoria_id
  WHERE conv.ano = 2026
);

-- 4. Cápsulas
DELETE FROM public.sesiones_bootcamp
WHERE convocatoria_id IN (SELECT id FROM public.convocatorias WHERE ano = 2026);

-- 5. Criterios
DELETE FROM public.criterios
WHERE convocatoria_id IN (SELECT id FROM public.convocatorias WHERE ano = 2026);

-- 6. Etapas
DELETE FROM public.etapas
WHERE convocatoria_id IN (SELECT id FROM public.convocatorias WHERE ano = 2026);

-- 7. Categorias
DELETE FROM public.categorias
WHERE convocatoria_id IN (SELECT id FROM public.convocatorias WHERE ano = 2026);

-- 8. Convocatoria
DELETE FROM public.convocatorias WHERE ano = 2026;

-- ================================================================================
-- Verificación — deben retornar 0 filas:
-- SELECT * FROM public.convocatorias;
-- SELECT * FROM public.categorias;
-- SELECT * FROM public.proyectos;
-- ================================================================================
