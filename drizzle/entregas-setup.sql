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

-- Staff (admin / evaluador) puede leer las entregas para evaluarlas.
CREATE POLICY "entregas_staff_select" ON public.entregas
  FOR SELECT USING (public.get_my_rol() IN ('admin', 'jurado', 'comite_tecnico'));

-- ================================================================================
-- Verificación:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'archivos' AND column_name = 'entrega_id';
--   SELECT * FROM public.entregas LIMIT 1;
-- ================================================================================
