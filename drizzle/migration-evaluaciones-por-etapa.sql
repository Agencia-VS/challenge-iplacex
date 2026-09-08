-- Permite que un mismo evaluador califique un proyecto en más de una etapa.
-- Ejecutar una sola vez en Supabase. La unicidad queda garantizada por asignacion_id.

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.evaluaciones'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) = 'UNIQUE (proyecto_id, evaluador_id)';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.evaluaciones DROP CONSTRAINT %I',
      v_constraint
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_etapa
  ON public.evaluaciones(etapa_id);
