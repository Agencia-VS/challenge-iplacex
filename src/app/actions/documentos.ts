"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

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

export type SubirDocumentoInput = {
  tipo: "bases" | "reglamento" | "anexo";
  titulo: string;
  descripcion?: string;
  version?: string;
  publicado?: boolean;
  archivoBase64: string;   // base64 del archivo
  archivoNombre: string;    // nombre original del archivo
  archivoTipoMime: string;  // ej: "application/pdf"
};

export type SubirDocumentoResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

export async function subirDocumento(input: SubirDocumentoInput): Promise<SubirDocumentoResult> {
  const supabase = await getSupabase();

  // Verificar que es admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") return { ok: false, error: "No autorizado" };

  if (!input.archivoBase64 || !input.archivoNombre) {
    return { ok: false, error: "Archivo requerido" };
  }

  if (!input.titulo?.trim()) {
    return { ok: false, error: "Título requerido" };
  }

  // Usar admin client para subir al storage (service_role)
  const adminClient = createAdminClient();

  // Generar nombre único en el bucket
  const timestamp = Date.now();
  const sanitizado = input.archivoNombre.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${input.tipo}/${timestamp}-${sanitizado}`;

  // Decodificar base64 → bytes
  const bytes = Buffer.from(input.archivoBase64, "base64");

  // Subir a Supabase Storage
  const { error: uploadError } = await adminClient.storage
    .from("documentos")
    .upload(storagePath, bytes, {
      contentType: input.archivoTipoMime || "application/pdf",
      upsert: true,
    });

  if (uploadError) return { ok: false, error: `Error al subir: ${uploadError.message}` };

  // Obtener URL pública
  const { data: urlData } = adminClient.storage
    .from("documentos")
    .getPublicUrl(storagePath);

  const archivoUrl = urlData.publicUrl;

  // Insertar registro en la tabla documentos
  const { data, error: insertError } = await adminClient
    .from("documentos")
    .insert({
      convocatoria_id: 1, // Convocatoria 2026
      tipo: input.tipo,
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      archivo_url: archivoUrl,
      archivo_nombre: input.archivoNombre,
      archivo_tamano: bytes.length,
      version: input.version?.trim() || null,
      publicado: input.publicado ?? true,
      subido_por: user.id,
    })
    .select("id")
    .single();

  if (insertError) return { ok: false, error: `Error al registrar: ${insertError.message}` };

  revalidatePath("/app/admin/bases");
  revalidatePath("/bases");

  return { ok: true, id: data.id, url: archivoUrl };
}

// Obtener documentos para el front público
export type DocumentoPublico = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  archivo_url: string;
  archivo_nombre: string;
  version: string | null;
  publicado: boolean;
  created_at: string;
};

export async function obtenerDocumentosPublicos(): Promise<DocumentoPublico[]> {
  const supabase = await getSupabase();

  const { data } = await supabase
    .from("documentos")
    .select("id, tipo, titulo, descripcion, archivo_url, archivo_nombre, version, publicado, created_at")
    .eq("publicado", true)
    .order("created_at", { ascending: false });

  return (data ?? []) as DocumentoPublico[];
}
