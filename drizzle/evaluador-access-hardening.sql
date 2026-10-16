-- Aislamiento del flujo de evaluación y entregas
-- Ejecutar en Supabase SQL Editor después de drizzle/entregas-setup.sql.
-- Es idempotente y no modifica filas existentes; reemplaza políticas RLS.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.entregas') IS NULL THEN
    RAISE EXCEPTION 'Primero ejecuta drizzle/entregas-setup.sql para crear public.entregas';
  END IF;
END $$;

ALTER TABLE public.archivos
  ADD COLUMN IF NOT EXISTS entrega_id UUID REFERENCES public.entregas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS archivos_entrega_idx ON public.archivos (entrega_id);
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proyectos_evaluador_select" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_admin_select" ON public.proyectos;
DROP POLICY IF EXISTS "evaluador_ve_asignados" ON public.proyectos;
CREATE POLICY "proyectos_evaluador_select" ON public.proyectos
  FOR SELECT USING (
    public.get_my_rol() IN ('jurado', 'comite_tecnico')
    AND EXISTS (
      SELECT 1 FROM public.asignaciones
      WHERE proyecto_id = proyectos.id AND evaluador_id = (select auth.uid())
    )
  );
CREATE POLICY "proyectos_admin_select" ON public.proyectos
  FOR SELECT USING (public.get_my_rol() = 'admin');

DROP POLICY IF EXISTS "eval_insert" ON public.evaluaciones;
DROP POLICY IF EXISTS "eval_propia" ON public.evaluaciones;
DROP POLICY IF EXISTS "eval_admin_super" ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluador_gestiona_sus_eval" ON public.evaluaciones;
DROP POLICY IF EXISTS "admin_super_ven_evaluaciones" ON public.evaluaciones;
CREATE POLICY "eval_insert" ON public.evaluaciones
  FOR INSERT WITH CHECK (
    evaluador_id = (select auth.uid())
    AND public.get_my_rol() IN ('jurado', 'comite_tecnico')
    AND EXISTS (
      SELECT 1 FROM public.asignaciones a
      WHERE a.id = evaluaciones.asignacion_id
        AND a.evaluador_id = (select auth.uid())
        AND a.proyecto_id = evaluaciones.proyecto_id
        AND a.etapa_id = evaluaciones.etapa_id
    )
  );
CREATE POLICY "eval_propia" ON public.evaluaciones
  FOR ALL
  USING (evaluador_id = (select auth.uid()))
  WITH CHECK (
    evaluador_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.asignaciones a
      WHERE a.id = evaluaciones.asignacion_id
        AND a.evaluador_id = (select auth.uid())
        AND a.proyecto_id = evaluaciones.proyecto_id
        AND a.etapa_id = evaluaciones.etapa_id
    )
  );
CREATE POLICY "eval_admin_super" ON public.evaluaciones
  FOR SELECT USING (public.get_my_rol() IN ('admin', 'comite_tecnico'));

DROP POLICY IF EXISTS "archivos_postulante" ON public.archivos;
CREATE POLICY "archivos_postulante" ON public.archivos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.id = archivos.proyecto_id AND p.postulante_id = (select auth.uid())
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

DROP POLICY IF EXISTS "entregas_postulante" ON public.entregas;
CREATE POLICY "entregas_postulante" ON public.entregas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.id = entregas.proyecto_id AND p.postulante_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "entregas_staff_select" ON public.entregas;
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

COMMIT;
