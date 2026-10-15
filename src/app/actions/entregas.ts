"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractYoutubeId } from "@/lib/youtube";
import {
  ENTREGABLES,
  esEntregable,
  MAX_ARCHIVO_ENTREGA_BYTES,
  type EstadoPostulacion,
} from "@/lib/entregas";
import { randomUUID } from "node:crypto";

const BUCKET = "archivos";
const SIGNED_TTL = 60 * 60; // 1 hora
const MAX_NOMBRE_ARCHIVO_LENGTH = 255;

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
}

type Supabase = Awaited<ReturnType<typeof getSupabase>>;

/**
 * Garantiza que exista la entrega (proyecto+etapa) del usuario y que esa etapa
 * esté habilitada para el estado actual del proyecto. Devuelve el id de entrega.
 */
async function ensureEntrega(
  supabase: Supabase,
  userId: string,
  proyectoId: string,
  etapaId: number,
): Promise<{ ok: true; entregaId: string } | { ok: false; error: string }> {
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, convocatoria_id, estado_postulacion")
    .eq("id", proyectoId)
    .eq("postulante_id", userId)
    .maybeSingle();
  if (!proyecto) return { ok: false, error: "Proyecto no encontrado" };

  const { data: etapa } = await supabase
    .from("etapas")
    .select("id, convocatoria_id, tipo, nombre")
    .eq("id", etapaId)
    .maybeSingle();
  if (!etapa || !esEntregable(etapa.tipo)) {
    return { ok: false, error: "Esta etapa no admite entregas" };
  }
  if (etapa.convocatoria_id !== proyecto.convocatoria_id) {
    return { ok: false, error: "La etapa no pertenece a la convocatoria de este proyecto" };
  }

  const config = ENTREGABLES[etapa.tipo]!;
  const estado = (proyecto.estado_postulacion ?? "borrador") as EstadoPostulacion;
  if (!config.habilitadaEn.includes(estado)) {
    return { ok: false, error: "La entrega de esta etapa aún no está habilitada" };
  }

  // Buscar entrega existente
  const { data: existente } = await supabase
    .from("entregas")
    .select("id")
    .eq("proyecto_id", proyectoId)
    .eq("etapa_id", etapaId)
    .maybeSingle();
  if (existente) return { ok: true, entregaId: existente.id };

  const { data: creada, error } = await supabase
    .from("entregas")
    .insert({
      proyecto_id: proyectoId,
      etapa_id: etapaId,
      titulo: config.titulo,
      estado: "borrador",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, entregaId: creada.id };
}

export type GuardarEntregaInput = {
  proyectoId: string;
  etapaId: number;
  videoUrl?: string;
  contexto?: string;
  enviar: boolean;
};

export type EntregaResult =
  | { ok: true; entregaId: string }
  | { ok: false; error: string };

export async function guardarEntrega(input: GuardarEntregaInput): Promise<EntregaResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const ensured = await ensureEntrega(supabase, user.id, input.proyectoId, input.etapaId);
  if (!ensured.ok) return ensured;

  const videoUrl = input.videoUrl?.trim() || null;
  if (videoUrl) {
    try {
      const parsed = new URL(videoUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { ok: false, error: "El enlace del video debe comenzar con https:// o http://" };
      }
    } catch {
      return { ok: false, error: "Ingresa un enlace válido para el video pitch" };
    }
  }
  const videoIdYoutube = videoUrl ? extractYoutubeId(videoUrl) : null;

  const { error } = await supabase
    .from("entregas")
    .update({
      video_url: videoUrl,
      video_id_youtube: videoIdYoutube,
      contexto: input.contexto?.trim() || null,
      estado: input.enviar ? "enviada" : "borrador",
      updated_at: new Date().toISOString(),
      ...(input.enviar ? { enviada_at: new Date().toISOString() } : {}),
    })
    .eq("id", ensured.entregaId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/postulante/entregas");
  return { ok: true, entregaId: ensured.entregaId };
}

export type PrepararSubidaArchivoInput = {
  proyectoId: string;
  etapaId: number;
  archivoNombre: string;
  archivoTamano: number;
};

export type PrepararSubidaArchivoResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

/** Crea un permiso de un solo uso para subir el archivo directo al bucket privado. */
export async function prepararSubidaArchivoEntrega(
  input: PrepararSubidaArchivoInput,
): Promise<PrepararSubidaArchivoResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const nombre = input.archivoNombre?.trim();
  if (!nombre) {
    return { ok: false, error: "Archivo requerido" };
  }
  if (nombre.length > MAX_NOMBRE_ARCHIVO_LENGTH) {
    return { ok: false, error: "El nombre del archivo supera el máximo de 255 caracteres" };
  }
  if (!Number.isSafeInteger(input.archivoTamano) || input.archivoTamano <= 0) {
    return { ok: false, error: "El archivo está vacío o tiene un tamaño inválido" };
  }
  if (input.archivoTamano > MAX_ARCHIVO_ENTREGA_BYTES) {
    return { ok: false, error: "Cada archivo puede pesar hasta 25 MB" };
  }

  const ensured = await ensureEntrega(supabase, user.id, input.proyectoId, input.etapaId);
  if (!ensured.ok) return ensured;

  const admin = createAdminClient();
  const sanitizado = nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "archivo";
  const storagePath = `entregas/${input.proyectoId}/${ensured.entregaId}/${randomUUID()}-${sanitizado}`;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !data) {
    return { ok: false, error: `No se pudo preparar la subida: ${error?.message ?? "Error de Storage"}` };
  }

  return { ok: true, path: data.path, token: data.token };
}

export type RegistrarArchivoEntregaInput = {
  proyectoId: string;
  etapaId: number;
  storagePath: string;
  archivoNombre: string;
};

export type RegistrarArchivoEntregaResult =
  | { ok: true; id: string; nombre: string; url: string }
  | { ok: false; error: string };

/** Verifica y registra el objeto que el navegador subió directamente a Storage. */
export async function registrarArchivoEntrega(
  input: RegistrarArchivoEntregaInput,
): Promise<RegistrarArchivoEntregaResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const ensured = await ensureEntrega(supabase, user.id, input.proyectoId, input.etapaId);
  if (!ensured.ok) return ensured;

  const nombre = input.archivoNombre?.trim();
  const prefijoPermitido = `entregas/${input.proyectoId}/${ensured.entregaId}/`;
  if (!nombre || !input.storagePath?.startsWith(prefijoPermitido)) {
    return { ok: false, error: "No se pudo verificar el archivo subido" };
  }
  if (nombre.length > MAX_NOMBRE_ARCHIVO_LENGTH) {
    return { ok: false, error: "El nombre del archivo supera el máximo de 255 caracteres" };
  }

  const admin = createAdminClient();
  const { data: metadata, error: infoError } = await admin.storage
    .from(BUCKET)
    .info(input.storagePath);
  if (infoError || !metadata) {
    return { ok: false, error: "No se encontró el archivo subido. Intenta nuevamente." };
  }

  const tamano = metadata.size ?? 0;
  if (tamano <= 0 || tamano > MAX_ARCHIVO_ENTREGA_BYTES) {
    await admin.storage.from(BUCKET).remove([input.storagePath]);
    return { ok: false, error: "Cada archivo puede pesar hasta 25 MB y no puede estar vacío" };
  }

  const { data: fila, error: insertError } = await supabase
    .from("archivos")
    .insert({
      proyecto_id: input.proyectoId,
      entrega_id: ensured.entregaId,
      nombre,
      url: input.storagePath, // guardamos la ruta (bucket privado); se firma al leer
      tipo_mime: metadata.contentType?.slice(0, 100) || null,
      tamano,
    })
    .select("id")
    .single();
  if (insertError) {
    await admin.storage.from(BUCKET).remove([input.storagePath]);
    return { ok: false, error: `Error al registrar: ${insertError.message}` };
  }

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(input.storagePath, SIGNED_TTL);

  revalidatePath("/app/postulante/entregas");
  return { ok: true, id: fila.id, nombre, url: signed?.signedUrl ?? "" };
}

export type EliminarArchivoResult = { ok: true } | { ok: false; error: string };

export async function eliminarArchivoEntrega(archivoId: string): Promise<EliminarArchivoResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  // La RLS de `archivos` solo deja ver/borrar los del propio proyecto.
  const { data: archivo } = await supabase
    .from("archivos")
    .select("id, url")
    .eq("id", archivoId)
    .maybeSingle();
  if (!archivo) return { ok: false, error: "Archivo no encontrado" };

  const { error } = await supabase.from("archivos").delete().eq("id", archivoId);
  if (error) return { ok: false, error: error.message };

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([archivo.url]);

  revalidatePath("/app/postulante/entregas");
  return { ok: true };
}

/** Genera URLs firmadas para una lista de rutas del bucket privado `archivos`. */
export async function firmarArchivos(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
  const out: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}
