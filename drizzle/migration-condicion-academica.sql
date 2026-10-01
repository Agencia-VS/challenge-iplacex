-- Ejecutar ANTES de desplegar el frontend. No requiere desactivar RLS.
-- Idempotente: conserva todos los usuarios y las respuestas existentes.
BEGIN;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS condicion_academica VARCHAR(20);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_condicion_academica_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_condicion_academica_check
  CHECK (condicion_academica IN ('titulado', 'estudiante'));

COMMENT ON COLUMN public.usuarios.condicion_academica IS
  'Condición académica declarada por el usuario. NULL indica respuesta pendiente.';

-- Conserva NULL para usuarios nuevos/antiguos hasta que respondan. Un NOT NULL
-- o un DEFAULT inventaría la respuesta o impediría registrarse antes de verla.
-- RLS existente permite leer/actualizar solo el propio perfil. El trigger
-- impide borrar/cambiar una respuesta desde la API autenticada tras enviarla.
CREATE OR REPLACE FUNCTION public.proteger_condicion_academica()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.condicion_academica IS NOT NULL
     AND NEW.condicion_academica IS DISTINCT FROM OLD.condicion_academica THEN
    RAISE EXCEPTION 'La condición académica ya fue registrada.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_condicion_academica ON public.usuarios;
CREATE TRIGGER proteger_condicion_academica
  BEFORE UPDATE OF condicion_academica ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.proteger_condicion_academica();

COMMIT;
