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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const rolEnum = pgEnum("rol", [
  "postulante",
  "evaluador",
  "admin",
  "super_evaluador",
]);

export const estadoProyectoEnum = pgEnum("estado_proyecto", [
  "idea",
  "validacion_problema",
  "mvp",
  "prototipo_validado",
  "producto_activo",
]);

export const estadoPostulacionEnum = pgEnum("estado_postulacion", [
  "borrador",
  "enviada",
  "en_revision",
  "ronda_1_pasada",
  "ronda_1_descartada",
  "ronda_2_pasada",
  "ronda_2_descartada",
  "finalista",
  "ganador",
]);

export const estadoEvaluacionEnum = pgEnum("estado_evaluacion", [
  "pendiente",
  "en_progreso",
  "finalizada",
]);

export const tipoEtapaEnum = pgEnum("tipo_etapa", [
  "postulacion",
  "formacion",
  "evaluacion_1",
  "entrega_2",
  "evaluacion_2",
  "pitch",
  "mentoria",
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

export const capsulas = pgTable("capsulas", {
  id: serial("id").primaryKey(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  numero: integer("numero").notNull(),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  videoUrl: text("video_url"),
  recursos: jsonb("recursos").$type<{ titulo: string; url: string }[]>(),
  disponibleDesde: timestamp("disponible_desde"),
  tags: jsonb("tags").$type<string[]>(),
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
  // Código ciego para evaluación: TC-0001, EM-0001
  codigoCiego: varchar("codigo_ciego", { length: 10 }).notNull().unique(),
  convocatoriaId: integer("convocatoria_id")
    .references(() => convocatorias.id)
    .notNull(),
  categoriaId: integer("categoria_id")
    .references(() => categorias.id)
    .notNull(),
  postulanteId: uuid("postulante_id")
    .references(() => usuarios.id)
    .notNull(),

  // Datos del proyecto
  nombreProyecto: varchar("nombre_proyecto", { length: 100 }).notNull(),
  descripcionBreve: text("descripcion_breve"),
  problemaResuelve: text("problema_resuelve"),
  solucion: text("solucion"),
  estadoProyecto: estadoProyectoEnum("estado_proyecto"),

  // Equipo
  equipoNombre: varchar("equipo_nombre", { length: 200 }),
  equipoIntegrantes: integer("equipo_integrantes"),
  equipoDescripcion: text("equipo_descripcion"),

  // Video pitch (YouTube)
  videoUrl: text("video_url"),
  videoIdYoutube: varchar("video_id_youtube", { length: 50 }),

  // Estado en el funnel
  estadoPostulacion: estadoPostulacionEnum("estado_postulacion").default("borrador"),
  etapaActualId: integer("etapa_actual_id").references(() => etapas.id),
  enviadaAt: timestamp("enviada_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  capsulas: many(capsulas),
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
