-- ================================================================================
-- Challenge IPLACEX 2026
-- Schema completo: DDL + Constraints + Triggers + RLS + Storage + Seed
-- Ejecutar en: Supabase -> SQL Editor -> New Query
-- Es idempotente: se puede re-ejecutar sin errores.
-- ================================================================================

-- ---- 0. Extensiones -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- 1. Enums -----------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.rol AS ENUM (
    'postulante', 'evaluador', 'admin', 'super_evaluador'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_proyecto AS ENUM (
    'idea', 'validacion_problema', 'mvp', 'prototipo_validado', 'producto_activo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_postulacion AS ENUM (
    'borrador', 'enviada', 'en_revision',
    'ronda_1_pasada', 'ronda_1_descartada',
    'ronda_2_pasada', 'ronda_2_descartada',
    'finalista', 'ganador'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_evaluacion AS ENUM (
    'pendiente', 'en_progreso', 'finalizada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_etapa AS ENUM (
    'postulacion', 'formacion', 'evaluacion_1',
    'entrega_2', 'evaluacion_2', 'pitch', 'mentoria', 'demo_day'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- 2. Tablas ----------------------------------------------------------------

-- CONVOCATORIAS
-- Estado: borrador -> abierta -> cerrada -> finalizada
CREATE TABLE IF NOT EXISTS public.convocatorias (
  id           SERIAL       PRIMARY KEY,
  ano          INTEGER      NOT NULL UNIQUE,
  nombre       VARCHAR(200) NOT NULL,
  slug         VARCHAR(100) NOT NULL UNIQUE,
  descripcion  TEXT,
  fecha_inicio TIMESTAMPTZ  NOT NULL,
  fecha_cierre TIMESTAMPTZ  NOT NULL,
  estado       VARCHAR(30)  NOT NULL DEFAULT 'borrador'
               CHECK (estado IN ('borrador', 'abierta', 'cerrada', 'finalizada')),
  config       JSONB NOT NULL DEFAULT
               '{"nEvaluadoresPorProyecto":3,"evaluacionCiega":true,"requiereVideoEnPostulacion":true}'::jsonb,
  created_at   TIMESTAMPTZ  DEFAULT now()
);

-- CATEGORIAS
-- Cada convocatoria tiene 3 categorias (numero 1, 2 y 3). La categoria fija
-- que rubrica se aplica al proyecto: las tres comparten criterios y
-- ponderaciones, y difieren en los descriptores de desempeno.
CREATE TABLE IF NOT EXISTS public.categorias (
  id                 SERIAL       PRIMARY KEY,
  convocatoria_id    INTEGER      NOT NULL REFERENCES public.convocatorias(id),
  numero             INTEGER      NOT NULL CHECK (numero IN (1, 2, 3)),
  nombre             VARCHAR(200) NOT NULL,
  slug               VARCHAR(100) NOT NULL,
  alcance            TEXT,
  UNIQUE (convocatoria_id, numero)
);

-- ETAPAS del proceso (postulacion -> eval1 -> eval2 -> demo_day)
CREATE TABLE IF NOT EXISTS public.etapas (
  id              SERIAL            PRIMARY KEY,
  convocatoria_id INTEGER           NOT NULL REFERENCES public.convocatorias(id),
  numero          INTEGER           NOT NULL,
  tipo            public.tipo_etapa NOT NULL,
  nombre          VARCHAR(200)      NOT NULL,
  descripcion     TEXT,
  fecha_inicio    TIMESTAMPTZ,
  fecha_fin       TIMESTAMPTZ,
  duracion_dias   INTEGER,
  semana_inicio   INTEGER,
  semana_fin      INTEGER,
  UNIQUE (convocatoria_id, numero)
);

-- CRITERIOS de evaluacion (pesos deben sumar 100 por convocatoria)
CREATE TABLE IF NOT EXISTS public.criterios (
  id              SERIAL       PRIMARY KEY,
  convocatoria_id INTEGER      NOT NULL REFERENCES public.convocatorias(id),
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  slug            VARCHAR(100) NOT NULL,
  peso            INTEGER      NOT NULL CHECK (peso > 0 AND peso <= 100),
  orden           INTEGER      NOT NULL,
  UNIQUE (convocatoria_id, slug)
);

-- CAPSULAS de formacion (se desbloquean semana a semana)
CREATE TABLE IF NOT EXISTS public.capsulas (
  id               SERIAL       PRIMARY KEY,
  convocatoria_id  INTEGER      NOT NULL REFERENCES public.convocatorias(id),
  numero           INTEGER      NOT NULL,
  titulo           VARCHAR(200) NOT NULL,
  descripcion      TEXT,
  video_url        TEXT,
  recursos         JSONB,
  disponible_desde TIMESTAMPTZ,
  tags             JSONB,
  UNIQUE (convocatoria_id, numero)
);

-- USUARIOS (espejo de auth.users, sincronizado por trigger)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id             UUID         PRIMARY KEY,  -- = auth.users.id
  email          VARCHAR(200) NOT NULL UNIQUE,
  nombre         VARCHAR(200) NOT NULL,
  avatar_url     TEXT,
  rol            public.rol   NOT NULL DEFAULT 'postulante',
  email_verified TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  DEFAULT now()
);

-- Secuencias para codigo ciego (TC-0001 / EM-0001)
-- Cada categoria tiene su propia secuencia para evitar colisiones
CREATE SEQUENCE IF NOT EXISTS seq_codigo_c1 START 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_c2 START 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_c3 START 1;

-- PROYECTOS
-- Reglas de negocio clave:
--   1. 1 proyecto por postulante por convocatoria (UNIQUE postulante_id+convocatoria_id)
--   2. codigo_ciego generado por trigger al insertar (secuencia TC-/EM-)
--   3. nombre_proyecto nullable para permitir borradores incompletos
--   4. CHECK: si estado=enviada debe tener nombre_proyecto y video_url
--   5. enviada_at asignado por trigger al pasar a estado 'enviada'
--   6. Solo se puede UPDATE mientras estado='borrador' (RLS)
CREATE TABLE IF NOT EXISTS public.proyectos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ciego       VARCHAR(10) NOT NULL UNIQUE,  -- asignado por trigger
  convocatoria_id    INTEGER     NOT NULL REFERENCES public.convocatorias(id),
  categoria_id       INTEGER     NOT NULL REFERENCES public.categorias(id),
  postulante_id      UUID        NOT NULL REFERENCES public.usuarios(id),

  -- Campos del formulario (nullable para borradores parciales)
  nombre_proyecto    VARCHAR(100),
  descripcion_breve  TEXT,
  problema_resuelve  TEXT,
  solucion           TEXT,
  estado_proyecto    public.estado_proyecto,

  equipo_nombre      VARCHAR(200),
  equipo_integrantes INTEGER,
  equipo_descripcion TEXT,

  video_url          TEXT,
  video_id_youtube   VARCHAR(50),

  estado_postulacion public.estado_postulacion NOT NULL DEFAULT 'borrador',
  etapa_actual_id    INTEGER REFERENCES public.etapas(id),
  enviada_at         TIMESTAMPTZ,

  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),

  -- Un postulante tiene un solo proyecto por convocatoria
  UNIQUE (postulante_id, convocatoria_id),

  -- Si el proyecto esta enviado debe tener nombre y video como minimo
  CONSTRAINT chk_enviada_completa CHECK (
    estado_postulacion = 'borrador'
    OR (nombre_proyecto IS NOT NULL AND video_url IS NOT NULL)
  )
);

-- ARCHIVOS adjuntos (cascade delete cuando se borra el proyecto)
CREATE TABLE IF NOT EXISTS public.archivos (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID         NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  url         TEXT         NOT NULL,
  tipo_mime   VARCHAR(100),
  tamano      INTEGER,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ASIGNACIONES: que evaluador evalua que proyecto en que etapa
-- El admin crea estas filas; el evaluador luego sube la evaluacion.
CREATE TABLE IF NOT EXISTS public.asignaciones (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id  UUID    NOT NULL REFERENCES public.proyectos(id),
  evaluador_id UUID    NOT NULL REFERENCES public.usuarios(id),
  etapa_id     INTEGER NOT NULL REFERENCES public.etapas(id),
  asignado_por UUID    REFERENCES public.usuarios(id),
  estado       public.estado_evaluacion NOT NULL DEFAULT 'pendiente',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (proyecto_id, evaluador_id, etapa_id)
);

-- EVALUACIONES
-- Reglas de negocio clave:
--   1. 1 evaluacion por evaluador por proyecto (UNIQUE proyecto_id+evaluador_id)
--   2. puntajes JSONB: { "impacto": 9.5, "innovacion": 7, ... } (slug -> score 0-10)
--   3. puntaje_ponderado 0-100 calculado en la app antes de guardar
--   4. asignacion_id nullable en MVP
--   5. finalizada_at asignado por trigger al cambiar estado a 'finalizada'
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  asignacion_id         UUID    NOT NULL REFERENCES public.asignaciones(id),
  proyecto_id           UUID    NOT NULL REFERENCES public.proyectos(id),
  evaluador_id          UUID    NOT NULL REFERENCES public.usuarios(id),
  etapa_id              INTEGER REFERENCES public.etapas(id),

  puntajes              JSONB,    -- nivel 1-4 por criterio: { "problema": 4, ... }
  puntaje_ponderado     REAL,     -- 0-100 (ver calcularPuntaje en src/lib/rubrica.ts)

  comentario_fortalezas TEXT,
  comentario_mejoras    TEXT,

  estado                public.estado_evaluacion NOT NULL DEFAULT 'pendiente',
  finalizada_at         TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE (proyecto_id, evaluador_id),
  UNIQUE (asignacion_id)  -- 1 evaluación por asignación
);

-- DOCUMENTOS (Bases del concurso, Reglamento, etc.)
CREATE TABLE IF NOT EXISTS public.documentos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  convocatoria_id INTEGER      NOT NULL REFERENCES public.convocatorias(id),
  tipo            VARCHAR(50)  NOT NULL CHECK (tipo IN ('bases', 'reglamento', 'anexo')),
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  archivo_url     TEXT         NOT NULL,
  archivo_nombre  VARCHAR(255) NOT NULL,
  archivo_tamano  INTEGER,
  version         VARCHAR(20),
  publicado       BOOLEAN      NOT NULL DEFAULT true,
  subido_por      UUID         REFERENCES public.usuarios(id),
  created_at      TIMESTAMPTZ  DEFAULT now(),
  updated_at      TIMESTAMPTZ  DEFAULT now()
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID         REFERENCES public.usuarios(id),
  accion     VARCHAR(100) NOT NULL,
  entidad    VARCHAR(50),
  entidad_id VARCHAR(100),
  metadata   JSONB,
  ip         VARCHAR(50),
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- ---- 3. Indices ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proyectos_postulante    ON public.proyectos(postulante_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_convocatoria  ON public.proyectos(convocatoria_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_categoria     ON public.proyectos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado        ON public.proyectos(estado_postulacion);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_proyecto   ON public.evaluaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_evaluador  ON public.evaluaciones(evaluador_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_evaluador  ON public.asignaciones(evaluador_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_proyecto   ON public.asignaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario       ON public.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidad       ON public.audit_log(entidad, entidad_id);

-- ---- 4. Funciones -------------------------------------------------------------

-- 4a. Sincronizar nuevo usuario de Auth -> public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'postulante'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 4b. Asignar codigo ciego al insertar un proyecto
--     C1-XXXX, C2-XXXX o C3-XXXX segun la categoria
CREATE OR REPLACE FUNCTION public.assign_codigo_ciego()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_num    INTEGER;
  v_prefix TEXT;
  v_seq    BIGINT;
BEGIN
  SELECT numero INTO v_num FROM public.categorias WHERE id = NEW.categoria_id;
  IF v_num = 1 THEN
    v_prefix := 'C1';
    v_seq    := nextval('seq_codigo_c1');
  ELSIF v_num = 2 THEN
    v_prefix := 'C2';
    v_seq    := nextval('seq_codigo_c2');
  ELSIF v_num = 3 THEN
    v_prefix := 'C3';
    v_seq    := nextval('seq_codigo_c3');
  ELSE
    RAISE EXCEPTION 'Categoria % sin prefijo de codigo ciego definido', v_num;
  END IF;
  NEW.codigo_ciego := v_prefix || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- 4c. Asignar enviada_at cuando el estado transiciona a 'enviada'
CREATE OR REPLACE FUNCTION public.set_enviada_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado_postulacion = 'enviada' AND OLD.estado_postulacion <> 'enviada' THEN
    NEW.enviada_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4d. Asignar finalizada_at cuando una evaluacion se marca como finalizada
CREATE OR REPLACE FUNCTION public.set_finalizada_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado = 'finalizada' AND OLD.estado <> 'finalizada' THEN
    NEW.finalizada_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4e. Actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 4f. JWT hook: agrega campo 'rol' al access token
-- REQUIERE: habilitar en Supabase -> Auth -> Hooks -> "Custom Access Token Hook"
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims   jsonb;
  user_rol text;
BEGIN
  SELECT rol::text INTO user_rol
    FROM public.usuarios
    WHERE id = (event->>'user_id')::uuid;
  claims := event->'claims';
  claims := jsonb_set(claims, '{rol}', to_jsonb(COALESCE(user_rol, 'postulante')));
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- 4g. Helper: obtener rol del usuario autenticado actual
CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$ SELECT rol::text FROM public.usuarios WHERE id = (select auth.uid()) $$;

-- ---- 5. Triggers --------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created        ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_proyectos_codigo_ciego  ON public.proyectos;
CREATE TRIGGER trg_proyectos_codigo_ciego
  BEFORE INSERT ON public.proyectos
  FOR EACH ROW
  WHEN (NEW.codigo_ciego IS NULL OR NEW.codigo_ciego = '')
  EXECUTE FUNCTION public.assign_codigo_ciego();

DROP TRIGGER IF EXISTS trg_proyectos_enviada_at    ON public.proyectos;
CREATE TRIGGER trg_proyectos_enviada_at
  BEFORE UPDATE OF estado_postulacion ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.set_enviada_at();

DROP TRIGGER IF EXISTS trg_proyectos_updated_at    ON public.proyectos;
CREATE TRIGGER trg_proyectos_updated_at
  BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_evaluaciones_finalizada ON public.evaluaciones;
CREATE TRIGGER trg_evaluaciones_finalizada
  BEFORE UPDATE OF estado ON public.evaluaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_finalizada_at();

DROP TRIGGER IF EXISTS trg_evaluaciones_updated_at ON public.evaluaciones;
CREATE TRIGGER trg_evaluaciones_updated_at
  BEFORE UPDATE ON public.evaluaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_documentos_updated_at   ON public.documentos;
CREATE TRIGGER trg_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- 6. Row Level Security ---------------------------------------------------
ALTER TABLE public.usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capsulas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log      ENABLE ROW LEVEL SECURITY;

-- USUARIOS
DROP POLICY IF EXISTS "usuarios_select_propio" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_admin"  ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_propio" ON public.usuarios;
-- Limpiar políticas legacy (de versiones anteriores)
DROP POLICY IF EXISTS "usuario_ve_su_perfil"       ON public.usuarios;
DROP POLICY IF EXISTS "usuario_actualiza_su_perfil" ON public.usuarios;
DROP POLICY IF EXISTS "admin_ve_todos_usuarios"     ON public.usuarios;
CREATE POLICY "usuarios_select_propio" ON public.usuarios
  FOR SELECT USING (id = (select auth.uid()));
CREATE POLICY "usuarios_select_admin" ON public.usuarios
  FOR SELECT USING (public.get_my_rol() IN ('admin', 'super_evaluador'));
CREATE POLICY "usuarios_update_propio" ON public.usuarios
  FOR UPDATE USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- PROYECTOS
DROP POLICY IF EXISTS "proyectos_postulante_select" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_evaluador_select"  ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_admin_select"      ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_insert"            ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_update_borrador"   ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_admin_update"      ON public.proyectos;
-- Limpiar políticas legacy
DROP POLICY IF EXISTS "postulante_ve_su_proyecto"    ON public.proyectos;
DROP POLICY IF EXISTS "evaluador_ve_asignados"       ON public.proyectos;
DROP POLICY IF EXISTS "postulante_inserta_proyecto"  ON public.proyectos;
DROP POLICY IF EXISTS "postulante_edita_su_proyecto" ON public.proyectos;
DROP POLICY IF EXISTS "admin_edita_proyectos"         ON public.proyectos;

-- Postulante solo ve su propio proyecto
CREATE POLICY "proyectos_postulante_select" ON public.proyectos
  FOR SELECT USING (postulante_id = (select auth.uid()));

-- Evaluador solo ve proyectos que tiene asignados (evaluacion ciega)
CREATE POLICY "proyectos_evaluador_select" ON public.proyectos
  FOR SELECT USING (
    public.get_my_rol() = 'evaluador'
    AND EXISTS (
      SELECT 1 FROM public.asignaciones
      WHERE proyecto_id = proyectos.id AND evaluador_id = (select auth.uid())
    )
  );

CREATE POLICY "proyectos_admin_select" ON public.proyectos
  FOR SELECT USING (public.get_my_rol() IN ('admin', 'super_evaluador'));

-- Solo postulantes pueden crear proyectos para si mismos
CREATE POLICY "proyectos_insert" ON public.proyectos
  FOR INSERT WITH CHECK (
    postulante_id = (select auth.uid())
    AND public.get_my_rol() = 'postulante'
  );

-- Postulante puede editar solo mientras el proyecto esta en borrador
CREATE POLICY "proyectos_update_borrador" ON public.proyectos
  FOR UPDATE
  USING (postulante_id = (select auth.uid()) AND estado_postulacion = 'borrador')
  WITH CHECK (postulante_id = (select auth.uid()));

CREATE POLICY "proyectos_admin_update" ON public.proyectos
  FOR UPDATE USING (public.get_my_rol() = 'admin');

-- EVALUACIONES
DROP POLICY IF EXISTS "eval_insert"      ON public.evaluaciones;
DROP POLICY IF EXISTS "eval_propia"      ON public.evaluaciones;
DROP POLICY IF EXISTS "eval_admin_super" ON public.evaluaciones;
-- Limpiar políticas legacy
DROP POLICY IF EXISTS "evaluador_gestiona_sus_eval"   ON public.evaluaciones;
DROP POLICY IF EXISTS "admin_super_ven_evaluaciones"  ON public.evaluaciones;
CREATE POLICY "eval_insert" ON public.evaluaciones
  FOR INSERT WITH CHECK (
    evaluador_id = (select auth.uid())
    AND public.get_my_rol() IN ('evaluador', 'super_evaluador')
  );
CREATE POLICY "eval_propia" ON public.evaluaciones
  FOR ALL USING (evaluador_id = (select auth.uid()));
CREATE POLICY "eval_admin_super" ON public.evaluaciones
  FOR SELECT USING (public.get_my_rol() IN ('admin', 'super_evaluador'));

-- ASIGNACIONES
DROP POLICY IF EXISTS "asig_evaluador_select" ON public.asignaciones;
DROP POLICY IF EXISTS "asig_evaluador_update" ON public.asignaciones;
DROP POLICY IF EXISTS "asig_admin_all"        ON public.asignaciones;
-- Limpiar políticas legacy
DROP POLICY IF EXISTS "evaluador_ve_sus_asignaciones" ON public.asignaciones;
CREATE POLICY "asig_evaluador_select" ON public.asignaciones
  FOR SELECT USING (evaluador_id = (select auth.uid()));
CREATE POLICY "asig_evaluador_update" ON public.asignaciones
  FOR UPDATE USING (evaluador_id = (select auth.uid()));
CREATE POLICY "asig_admin_all" ON public.asignaciones
  FOR ALL USING (public.get_my_rol() IN ('admin', 'super_evaluador'));

-- ARCHIVOS
DROP POLICY IF EXISTS "archivos_postulante"   ON public.archivos;
DROP POLICY IF EXISTS "archivos_staff_select" ON public.archivos;
CREATE POLICY "archivos_postulante" ON public.archivos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.proyectos
      WHERE id = archivos.proyecto_id AND postulante_id = (select auth.uid())
    )
  );
CREATE POLICY "archivos_staff_select" ON public.archivos
  FOR SELECT USING (public.get_my_rol() IN ('admin', 'evaluador', 'super_evaluador'));

-- DOCUMENTOS
DROP POLICY IF EXISTS "docs_autenticado_select" ON public.documentos;
DROP POLICY IF EXISTS "docs_admin_all"          ON public.documentos;
-- Limpiar políticas legacy
DROP POLICY IF EXISTS "autenticado_lee_documentos_publicados" ON public.documentos;
DROP POLICY IF EXISTS "admin_gestiona_documentos"             ON public.documentos;
CREATE POLICY "docs_autenticado_select" ON public.documentos
  FOR SELECT USING ((select auth.uid()) IS NOT NULL AND publicado = true);
CREATE POLICY "docs_admin_all" ON public.documentos
  FOR ALL USING (public.get_my_rol() = 'admin');

-- TABLAS MAESTRAS (lectura publica o autenticada)
DROP POLICY IF EXISTS "convocatorias_select" ON public.convocatorias;
DROP POLICY IF EXISTS "categorias_select"    ON public.categorias;
DROP POLICY IF EXISTS "etapas_select"        ON public.etapas;
DROP POLICY IF EXISTS "criterios_select"     ON public.criterios;
DROP POLICY IF EXISTS "capsulas_select"      ON public.capsulas;
DROP POLICY IF EXISTS "convocatorias_admin"  ON public.convocatorias;
DROP POLICY IF EXISTS "categorias_admin"     ON public.categorias;
DROP POLICY IF EXISTS "etapas_admin"         ON public.etapas;
DROP POLICY IF EXISTS "criterios_admin"      ON public.criterios;
DROP POLICY IF EXISTS "capsulas_admin"       ON public.capsulas;
-- Limpiar políticas legacy
DROP POLICY IF EXISTS "publico_lee_convocatorias"    ON public.convocatorias;
DROP POLICY IF EXISTS "publico_lee_categorias"       ON public.categorias;
DROP POLICY IF EXISTS "publico_lee_etapas"           ON public.etapas;
DROP POLICY IF EXISTS "publico_lee_criterios"        ON public.criterios;
DROP POLICY IF EXISTS "autenticado_lee_capsulas"     ON public.capsulas;

-- Agregar política pública para cápsulas (landing page anónimo)
DROP POLICY IF EXISTS "capsulas_public_select" ON public.capsulas;
CREATE POLICY "capsulas_public_select" ON public.capsulas
  FOR SELECT USING (true);

CREATE POLICY "convocatorias_select" ON public.convocatorias FOR SELECT USING (true);
CREATE POLICY "categorias_select"    ON public.categorias    FOR SELECT USING (true);
CREATE POLICY "etapas_select"        ON public.etapas        FOR SELECT USING (true);
CREATE POLICY "criterios_select"     ON public.criterios     FOR SELECT USING (true);
CREATE POLICY "capsulas_select"      ON public.capsulas
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "convocatorias_admin"  ON public.convocatorias
  FOR ALL USING (public.get_my_rol() = 'admin');
CREATE POLICY "categorias_admin"     ON public.categorias
  FOR ALL USING (public.get_my_rol() = 'admin');
CREATE POLICY "etapas_admin"         ON public.etapas
  FOR ALL USING (public.get_my_rol() = 'admin');
CREATE POLICY "criterios_admin"      ON public.criterios
  FOR ALL USING (public.get_my_rol() = 'admin');
CREATE POLICY "capsulas_admin"       ON public.capsulas
  FOR ALL USING (public.get_my_rol() = 'admin');

-- AUDIT LOG
DROP POLICY IF EXISTS "audit_admin_select" ON public.audit_log;
CREATE POLICY "audit_admin_select" ON public.audit_log
  FOR SELECT USING (public.get_my_rol() = 'admin');

-- ---- 7. Storage buckets -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('documentos', 'documentos', true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('archivos',   'archivos',   false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatares',   'avatares',   true)  ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "storage_admin_docs"          ON storage.objects;
DROP POLICY IF EXISTS "storage_postulante_archivos" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatares"            ON storage.objects;
CREATE POLICY "storage_admin_docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND public.get_my_rol() = 'admin');
CREATE POLICY "storage_postulante_archivos" ON storage.objects
  FOR ALL USING (bucket_id = 'archivos' AND auth.uid() IS NOT NULL);
CREATE POLICY "storage_avatares" ON storage.objects
  FOR ALL USING (bucket_id = 'avatares' AND auth.uid() IS NOT NULL);

-- ---- 8. Migraciones (ejecutar en DBs existentes) -------------------------------
-- Hacer asignacion_id NOT NULL y agregar constraint única para upsert
-- ⚠️ Si hay filas con asignacion_id NULL, primero asígnales un valor o elimínalas
-- DELETE FROM public.evaluaciones WHERE asignacion_id IS NULL;
ALTER TABLE public.evaluaciones
  ALTER COLUMN asignacion_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evaluaciones_asignacion_id_key'
      AND conrelid = 'public.evaluaciones'::regclass
  ) THEN
    ALTER TABLE public.evaluaciones
      ADD CONSTRAINT evaluaciones_asignacion_id_key UNIQUE (asignacion_id);
  END IF;
END $$;

-- ================================================================================
-- LISTO.
-- Pendientes manuales en Supabase Dashboard:
--   1. Auth > Hooks > Enable "Custom Access Token Hook"
--      Funcion: public.custom_access_token_hook
--   2. Auth > Providers > Enable Google OAuth (Client ID + Secret)
-- ================================================================================
