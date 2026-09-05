"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractYoutubeId } from "@/lib/youtube";
import { ENTREGABLES, esEntregable, type EstadoPostulacion } from "@/lib/entregas";

const BUCKET = "archivos";
const SIGNED_TTL = 60 * 60; // 1 hora

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
    .select("id, estado_postulacion")
    .eq("id", proyectoId)
    .eq("postulante_id", userId)
    .maybeSingle();
  if (!proyecto) return { ok: false, error: "Proyecto no encontrado" };

  const { data: etapa } = await supabase
    .from("etapas")
    .select("id, tipo, nombre")
    .eq("id", etapaId)
    .maybeSingle();
  if (!etapa || !esEntregable(etapa.tipo)) {
    return { ok: false, error: "Esta etapa no admite entregas" };
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

  const videoIdYoutube = input.videoUrl ? extractYoutubeId(input.videoUrl) : null;

  const { error } = await supabase
    .from("entregas")
    .update({
      video_url: input.videoUrl?.trim() || null,
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

export type SubirArchivoInput = {
  proyectoId: string;
  etapaId: number;
  archivoBase64: string;
  archivoNombre: string;
  archivoTipoMime: string;
};

export type SubirArchivoResult =
  | { ok: true; id: string; nombre: string; url: string }
  | { ok: false; error: string };

export async function subirArchivoEntrega(input: SubirArchivoInput): Promise<SubirArchivoResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  if (!input.archivoBase64 || !input.archivoNombre) {
    return { ok: false, error: "Archivo requerido" };
  }

  const ensured = await ensureEntrega(supabase, user.id, input.proyectoId, input.etapaId);
  if (!ensured.ok) return ensured;

  const admin = createAdminClient();
  const sanitizado = input.archivoNombre.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `entregas/${input.proyectoId}/${ensured.entregaId}/${Date.now()}-${sanitizado}`;
  const bytes = Buffer.from(input.archivoBase64, "base64");

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: input.archivoTipoMime || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return { ok: false, error: `Error al subir: ${uploadError.message}` };

  const { data: fila, error: insertError } = await supabase
    .from("archivos")
    .insert({
      proyecto_id: input.proyectoId,
      entrega_id: ensured.entregaId,
      nombre: input.archivoNombre,
      url: storagePath, // guardamos la ruta (bucket privado); se firma al leer
      tipo_mime: input.archivoTipoMime || null,
      tamano: bytes.length,
    })
    .select("id")
    .single();
  if (insertError) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: `Error al registrar: ${insertError.message}` };
  }

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_TTL);

  revalidatePath("/app/postulante/entregas");
  return { ok: true, id: fila.id, nombre: input.archivoNombre, url: signed?.signedUrl ?? "" };
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
