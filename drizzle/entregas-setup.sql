-- ================================================================================
-- ENTREGAS POR ETAPA — migración ADITIVA (no altera datos existentes)
-- Ejecutar en Supabase SQL Editor (Settings > SQL Editor)
--
-- Crea la tabla `entregas` (una por proyecto+etapa) y vincula `archivos` a la
-- entrega. No toca `proyectos` ni la postulación. Seguro de correr con el
-- concurso en vivo: solo agrega estructura nueva.
-- ================================================================================

-- 1. Tabla entregas
CREATE TABLE IF NOT EXISTS public.entregas (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id       UUID         NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  etapa_id          INTEGER      NOT NULL REFERENCES public.etapas(id),
  titulo            VARCHAR(200),
  contexto          TEXT,
  video_url         TEXT,
  video_id_youtube  VARCHAR(50),
  estado            VARCHAR(20)  DEFAULT 'borrador',  -- 'borrador' | 'enviada'
  enviada_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT now(),
  updated_at        TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (proyecto_id, etapa_id)
);

CREATE INDEX IF NOT EXISTS entregas_proyecto_idx ON public.entregas (proyecto_id);

-- 2. Vincular archivos a una entrega (columna nueva, nullable → no rompe filas existentes)
ALTER TABLE public.archivos
  ADD COLUMN IF NOT EXISTS entrega_id UUID REFERENCES public.entregas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS archivos_entrega_idx ON public.archivos (entrega_id);

-- 3. RLS de entregas (espejo de las políticas de `archivos`)
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entregas_postulante"   ON public.entregas;
DROP POLICY IF EXISTS "entregas_staff_select" ON public.entregas;

-- El dueño del proyecto gestiona sus entregas (el gating por etapa/estado se
-- valida en la server action + UI, igual que en la postulación).
CREATE POLICY "entregas_postulante" ON public.entregas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.proyectos
      WHERE id = entregas.proyecto_id AND postulante_id = (select auth.uid())
    )
  );

-- El admin puede leer todas; los evaluadores solo la etapa asignada.
CREATE POLICY "entregas_staff_select" ON public.entregas
  FOR SELECT USING (
    public.get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.asignaciones a
      WHERE a.proyecto_id = entregas.proyecto_id
        AND a.etapa_id = entregas.etapa_id
        AND a.evaluador_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "archivos_staff_select" ON public.archivos;
CREATE POLICY "archivos_staff_select" ON public.archivos
  FOR SELECT USING (
    public.get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.asignaciones a
      WHERE a.proyecto_id = archivos.proyecto_id
        AND a.evaluador_id = (select auth.uid())
        AND (
          archivos.entrega_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.entregas e
            WHERE e.id = archivos.entrega_id
              AND e.proyecto_id = archivos.proyecto_id
              AND e.etapa_id = a.etapa_id
          )
        )
    )
  );

-- Los objetos del bucket privado se limitan al proyecto propio o a la etapa
-- asignada. Las subidas de la app usan URLs temporales generadas en servidor.
DROP POLICY IF EXISTS "storage_postulante_archivos" ON storage.objects;
DROP POLICY IF EXISTS "storage_entrega_postulante" ON storage.objects;
DROP POLICY IF EXISTS "storage_entrega_staff_select" ON storage.objects;

CREATE POLICY "storage_entrega_postulante" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'archivos'
    AND EXISTS (
      SELECT 1
      FROM public.entregas e
      JOIN public.proyectos p ON p.id = e.proyecto_id
      WHERE (storage.foldername(name))[1] = 'entregas'
        AND e.id::text = (storage.foldername(name))[3]
        AND p.id::text = (storage.foldername(name))[2]
        AND p.postulante_id = (select auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'archivos'
    AND EXISTS (
      SELECT 1
      FROM public.entregas e
      JOIN public.proyectos p ON p.id = e.proyecto_id
      WHERE (storage.foldername(name))[1] = 'entregas'
        AND e.id::text = (storage.foldername(name))[3]
        AND p.id::text = (storage.foldername(name))[2]
        AND p.postulante_id = (select auth.uid())
    )
  );

CREATE POLICY "storage_entrega_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'archivos'
    AND (
      public.get_my_rol() = 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.entregas e
        JOIN public.asignaciones a
          ON a.proyecto_id = e.proyecto_id AND a.etapa_id = e.etapa_id
        WHERE (storage.foldername(name))[1] = 'entregas'
          AND e.id::text = (storage.foldername(name))[3]
          AND e.proyecto_id::text = (storage.foldername(name))[2]
          AND a.evaluador_id = (select auth.uid())
      )
    )
  );

-- ================================================================================
-- Verificación:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'archivos' AND column_name = 'entrega_id';
--   SELECT * FROM public.entregas LIMIT 1;
-- ================================================================================
