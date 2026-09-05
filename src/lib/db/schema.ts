import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  real,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

// Los cuatro roles de las Bases. El Comité Técnico revisa admisibilidad,
// evalúa la preselección y puede reclasificar categorías; el Jurado evalúa el
// Demo Day; el Comité Organizador (admin) configura fechas y publica resultados.
export const rolEnum = pgEnum("rol", [
  "postulante",
  "comite_tecnico",
  "jurado",
  "admin",
]);


// Ciclo de vida de una postulación, según el calendario de las Bases:
// se envía, el Comité Técnico revisa admisibilidad, evalúa la preselección,
// los preseleccionados hacen el bootcamp —donde se puede quedar descalificado
// por asistencia— y de ahí salen los finalistas del Demo Day.
export const estadoPostulacionEnum = pgEnum("estado_postulacion", [
  "borrador",
  "enviada",
  "en_revision",
  "inadmisible",
  "preseleccionado",
  "no_preseleccionado",
  "descalificado",
  "finalista",
  "no_finalista",
  "premiado",
]);

export const estadoEvaluacionEnum = pgEnum("estado_evaluacion", [
  "pendiente",
  "en_progreso",
  "finalizada",
]);

// Los hitos del calendario oficial. Las fechas viven en la tabla `etapas`
// porque la organización se reserva el derecho de moverlas.
export const tipoEtapaEnum = pgEnum("tipo_etapa", [
  "postulacion",
  "preseleccion",
  "bootcamp",
  "seleccion_finalistas",
  "demo_day",
]);

// ─── CONVOCATORIAS ───────────────────────────────────────────────────────────

export const convocatorias = pgTable("convocatorias", {
  id: serial("id").primaryKey(),
  ano: integer("ano").notNull().unique(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  descripcion: text("descripcion"),
  fechaInicio: timestamp("fecha_inicio").notNull(),
  fechaCierre: timestamp("fecha_cierre").notNull(),
  estado: varchar("estado", { length: 30 }).default("borrador"),
  config: jsonb("config").$type<{
    nEvaluadoresPorProyecto: number;
    evaluacionCiega: boolean;
    requiereVideoEnPostulacion: boolean;
    /** Overrides de display para cada estado. Clave = valor del enum estado_postulacion. */
    estadosBadge?: Record<string, { label: string; tone: string }>;
    /** Overrides de transiciones permitidas. Clave = estado origen. */
    transicionesEstado?: Record<string, { label: string; estado: string; danger?: boolean }[]>;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────

// La categoría fija qué rúbrica se aplica al proyecto: las tres comparten
// criterios y ponderaciones, y difieren en los descriptores de desempeño
// (ver `src/lib/rubrica.ts`).
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  numero: integer("numero").notNull(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  /** A qué proyectos aplica y qué evidencia se les exige. */
  alcance: text("alcance"),
});

// ─── ETAPAS ──────────────────────────────────────────────────────────────────

export const etapas = pgTable("etapas", {
  id: serial("id").primaryKey(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  numero: integer("numero").notNull(),
  tipo: tipoEtapaEnum("tipo").notNull(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  fechaInicio: timestamp("fecha_inicio"),
  fechaFin: timestamp("fecha_fin"),
  duracionDias: integer("duracion_dias"),
  semanaInicio: integer("semana_inicio"),
  semanaFin: integer("semana_fin"),
});

// ─── CRITERIOS ────────────────────────────────────────────────────────────────

export const criterios = pgTable("criterios", {
  id: serial("id").primaryKey(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  slug: varchar("slug", { length: 100 }).notNull(),
  peso: integer("peso").notNull(),
  orden: integer("orden").notNull(),
});

// ─── CÁPSULAS ────────────────────────────────────────────────────────────────

// Sesiones del bootcamp. Las Bases exigen asistir al menos al 75% de ellas,
// así que cada sesión es una unidad contable y no solo material de estudio.
export const sesionesBootcamp = pgTable("sesiones_bootcamp", {
  id: serial("id").primaryKey(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  numero: integer("numero").notNull(),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  fecha: timestamp("fecha"),
  duracionMinutos: integer("duracion_minutos"),
  /** Material de apoyo: enlaces a grabación, presentación, lecturas. */
  recursos: jsonb("recursos").$type<{ titulo: string; url: string }[]>(),
});

// Asistencia a cada sesión. Se registra por proyecto y no por persona porque
// la consecuencia de las Bases —la descalificación— recae sobre el proyecto.
export const asistencias = pgTable("asistencias", {
  id: uuid("id").defaultRandom().primaryKey(),
  sesionId: integer("sesion_id")
    .references(() => sesionesBootcamp.id)
    .notNull(),
  proyectoId: uuid("proyecto_id")
    .references(() => proyectos.id)
    .notNull(),
  presente: boolean("presente").notNull().default(false),
  observacion: text("observacion"),
  registradoPor: uuid("registrado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── USUARIOS ─────────────────────────────────────────────────────────────────
// Sincronizado con auth.users de Supabase via trigger.

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: varchar("email", { length: 200 }).notNull().unique(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  avatarUrl: text("avatar_url"),
  rol: rolEnum("rol").default("postulante").notNull(),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── PROYECTOS ────────────────────────────────────────────────────────────────

export const proyectos = pgTable("proyectos", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Código ciego para evaluación: C1-0001, C2-0001, C3-0001 según categoría.
  codigoCiego: varchar("codigo_ciego", { length: 10 }).notNull().unique(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  categoriaId: integer("categoria_id")
    .references(() => categorias.id)
    .notNull(),
  /** Representante del equipo: la única contraparte oficial ante el concurso. */
  postulanteId: uuid("postulante_id")
    .references(() => usuarios.id)
    .notNull(),

  // Campos del formulario. Nullable porque un borrador se guarda incompleto;
  // el CHECK `chk_enviada_completa` los exige recién al enviar.
  nombreProyecto: varchar("nombre_proyecto", { length: 100 }),
  /** Máximo 200 palabras; el contador vive en el formulario. */
  resumenEjecutivo: text("resumen_ejecutivo"),
  problema: text("problema"),
  segmentoUsuarios: text("segmento_usuarios"),
  solucion: text("solucion"),
  /** Números 1..17 de la Agenda 2030 (ver src/lib/ods.ts). */
  ods: integer("ods").array(),

  /** Declaración de autoría propia y aceptación de bases. */
  declaracionAutoria: boolean("declaracion_autoria").notNull().default(false),

  // Control de plagio: máximo 30% de similitud.
  // TODO(bases): falta definir con qué herramienta se integra.
  similitudPct: real("similitud_pct"),

  equipoNombre: varchar("equipo_nombre", { length: 200 }),

  // Material audiovisual. Opcional: las Bases no exigen video para postular.
  videoUrl: text("video_url"),
  videoIdYoutube: varchar("video_id_youtube", { length: 50 }),

  estadoPostulacion: estadoPostulacionEnum("estado_postulacion").default("borrador"),
  etapaActualId: integer("etapa_actual_id").references(() => etapas.id),
  enviadaAt: timestamp("enviada_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Vínculo del integrante con Iplacex. */
export const calidadIntegranteEnum = pgEnum("calidad_integrante", [
  "estudiante",
  "egresado",
  "titulado",
  "externo",
]);

// Integrantes del equipo. Tabla propia porque las Bases prohíben que una
// persona figure en dos proyectos, y esa verificación es por integrante y no
// solo por representante: la base lo impide con un índice único sobre
// (convocatoria_id, rut).
export const integrantes = pgTable("integrantes", {
  id: uuid("id").defaultRandom().primaryKey(),
  proyectoId: uuid("proyecto_id")
    .references(() => proyectos.id, { onDelete: "cascade" })
    .notNull(),
  /** Denormalizado desde el proyecto por un trigger; sostiene el índice único. */
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  /** RUT en forma canónica: sin puntos ni guion, K en mayúscula. */
  rut: varchar("rut", { length: 12 }).notNull(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  correo: varchar("correo", { length: 255 }).notNull(),
  calidad: calidadIntegranteEnum("calidad").notNull(),
  carrera: varchar("carrera", { length: 200 }),
  sede: varchar("sede", { length: 200 }),
  fechaNacimiento: date("fecha_nacimiento"),
  /** Solo se exige a estudiantes. */
  matriculaVigente: boolean("matricula_vigente"),
  esRepresentante: boolean("es_representante").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ARCHIVOS ADJUNTOS ────────────────────────────────────────────────────────

export const archivos = pgTable("archivos", {
  id: uuid("id").defaultRandom().primaryKey(),
  proyectoId: uuid("proyecto_id")
    .references(() => proyectos.id, { onDelete: "cascade" })
    .notNull(),
  // Entrega a la que pertenece el archivo (opcional; null = archivo suelto del proyecto).
  entregaId: uuid("entrega_id").references(() => entregas.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  url: text("url").notNull(), // ruta (key) del objeto en el bucket privado `archivos`
  tipoMime: varchar("tipo_mime", { length: 100 }),
  tamano: integer("tamano"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ENTREGAS (por etapa: Video Pitch, Pitch 60s, mentoría, etc.) ──────────────
// Una entrega por (proyecto, etapa). Aditivo: NO reemplaza la postulación.

export const entregas = pgTable("entregas", {
  id: uuid("id").defaultRandom().primaryKey(),
  proyectoId: uuid("proyecto_id")
    .references(() => proyectos.id, { onDelete: "cascade" })
    .notNull(),
  etapaId: integer("etapa_id")
    .references(() => etapas.id)
    .notNull(),
  titulo: varchar("titulo", { length: 200 }),
  contexto: text("contexto"),
  videoUrl: text("video_url"),
  videoIdYoutube: varchar("video_id_youtube", { length: 50 }),
  estado: varchar("estado", { length: 20 }).default("borrador"), // "borrador" | "enviada"
  enviadaAt: timestamp("enviada_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── ASIGNACIONES ─────────────────────────────────────────────────────────────

export const asignaciones = pgTable("asignaciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  proyectoId: uuid("proyecto_id").references(() => proyectos.id).notNull(),
  evaluadorId: uuid("evaluador_id").references(() => usuarios.id).notNull(),
  etapaId: integer("etapa_id").references(() => etapas.id).notNull(),
  asignadoPor: uuid("asignado_por").references(() => usuarios.id),
  estado: estadoEvaluacionEnum("estado").default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── EVALUACIONES ─────────────────────────────────────────────────────────────

export const evaluaciones = pgTable("evaluaciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  asignacionId: uuid("asignacion_id")
    .references(() => asignaciones.id)
    .notNull(),
  proyectoId: uuid("proyecto_id").references(() => proyectos.id).notNull(),
  evaluadorId: uuid("evaluador_id").references(() => usuarios.id).notNull(),
  etapaId: integer("etapa_id").references(() => etapas.id),

  // Nivel de desempeño por criterio: { "problema": 4, "viabilidad": 3, ... }
  // Claves = criterio.slug; valores = 1..4 (ver NIVELES en src/lib/rubrica.ts).
  puntajes: jsonb("puntajes").$type<Record<string, number>>(),
  // Puntaje en escala 0-100. Va en coma flotante porque los valores son
  // múltiplos de 1,25 y la normalización de preselección produce decimales
  // periódicos (55 sobre 85 = 64,7059…); redondear a entero sesgaría el
  // ranking. En preselección ya viene normalizado (ver `calcularPuntaje`).
  puntajePonderado: real("puntaje_ponderado"),

  comentarioFortalezas: text("comentario_fortalezas"),
  comentarioMejoras: text("comentario_mejoras"),

  estado: estadoEvaluacionEnum("estado").default("pendiente"),
  finalizadaAt: timestamp("finalizada_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── DOCUMENTOS (Bases de la convocatoria, Reglamento, etc.) ───────────────────────

export const documentos = pgTable("documentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // "bases" | "reglamento" | "anexo"
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  archivoUrl: text("archivo_url").notNull(), // Supabase Storage URL
  archivoNombre: varchar("archivo_nombre", { length: 255 }).notNull(),
  archivoTamano: integer("archivo_tamano"),
  version: varchar("version", { length: 20 }), // "v1.0"
  publicado: boolean("publicado").default(true),
  subidoPor: uuid("subido_por").references(() => usuarios.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  accion: varchar("accion", { length: 100 }).notNull(),
  entidad: varchar("entidad", { length: 50 }),
  entidadId: varchar("entidad_id", { length: 100 }),
  metadata: jsonb("metadata"),
  ip: varchar("ip", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── RELATIONS ───────────────────────────────────────────────────────────────

export const convocatoriasRelations = relations(convocatorias, ({ many }) => ({
  categorias: many(categorias),
  etapas: many(etapas),
  criterios: many(criterios),
  sesionesBootcamp: many(sesionesBootcamp),
  proyectos: many(proyectos),
  documentos: many(documentos),
}));

export const categoriasRelations = relations(categorias, ({ one, many }) => ({
  convocatoria: one(convocatorias, {
    fields: [categorias.convocatoriaId],
    references: [convocatorias.id],
  }),
  proyectos: many(proyectos),
}));

export const proyectosRelations = relations(proyectos, ({ one, many }) => ({
  convocatoria: one(convocatorias, {
    fields: [proyectos.convocatoriaId],
    references: [convocatorias.id],
  }),
  categoria: one(categorias, {
    fields: [proyectos.categoriaId],
    references: [categorias.id],
  }),
  postulante: one(usuarios, {
    fields: [proyectos.postulanteId],
    references: [usuarios.id],
  }),
  integrantes: many(integrantes),
  archivos: many(archivos),
  entregas: many(entregas),
  asignaciones: many(asignaciones),
  evaluaciones: many(evaluaciones),
}));

export const entregasRelations = relations(entregas, ({ one, many }) => ({
  proyecto: one(proyectos, {
    fields: [entregas.proyectoId],
    references: [proyectos.id],
  }),
  etapa: one(etapas, {
    fields: [entregas.etapaId],
    references: [etapas.id],
  }),
  integrantes: many(integrantes),
  archivos: many(archivos),
}));

export const archivosRelations = relations(archivos, ({ one }) => ({
  proyecto: one(proyectos, {
    fields: [archivos.proyectoId],
    references: [proyectos.id],
  }),
  entrega: one(entregas, {
    fields: [archivos.entregaId],
    references: [entregas.id],
  }),
}));

export const asignacionesRelations = relations(asignaciones, ({ one, many }) => ({
  proyecto: one(proyectos, {
    fields: [asignaciones.proyectoId],
    references: [proyectos.id],
  }),
  evaluador: one(usuarios, {
    fields: [asignaciones.evaluadorId],
    references: [usuarios.id],
  }),
  evaluaciones: many(evaluaciones),
}));

export const evaluacionesRelations = relations(evaluaciones, ({ one }) => ({
  asignacion: one(asignaciones, {
    fields: [evaluaciones.asignacionId],
    references: [asignaciones.id],
  }),
  proyecto: one(proyectos, {
    fields: [evaluaciones.proyectoId],
    references: [proyectos.id],
  }),
  evaluador: one(usuarios, {
    fields: [evaluaciones.evaluadorId],
    references: [usuarios.id],
  }),
}));
