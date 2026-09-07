import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PostularForm } from "@/components/app/postular-form";

export const metadata: Metadata = { title: "Postular proyecto" };

export default async function PostularPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ¿Ya tiene un proyecto (borrador)? — lo precargamos
  const { data: proyectoExistente } = await supabase
    .from("proyectos")
    .select(`
      id,
      nombre_proyecto,
      resumen_ejecutivo,
      problema,
      segmento_usuarios,
      solucion,
      ods,
      declaracion_autoria,
      equipo_nombre,
      video_url,
      categorias ( numero )
    `)
    .eq("postulante_id", user.id)
    .eq("estado_postulacion", "borrador")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initial = proyectoExistente
    ? {
        categoriaNumero: ((proyectoExistente.categorias as unknown as { numero: 1 | 2 | 3 } | null)?.numero ?? 1) as 1 | 2 | 3,
        nombreProyecto: proyectoExistente.nombre_proyecto ?? "",
        resumenEjecutivo: proyectoExistente.resumen_ejecutivo ?? "",
        problema: proyectoExistente.problema ?? "",
        segmentoUsuarios: proyectoExistente.segmento_usuarios ?? "",
        solucion: proyectoExistente.solucion ?? "",
        ods: proyectoExistente.ods ?? [],
        declaracionAutoria: proyectoExistente.declaracion_autoria ?? false,
        equipoNombre: proyectoExistente.equipo_nombre ?? "",
        videoUrl: proyectoExistente.video_url ?? "",
      }
    : {};

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Postular proyecto</p>
        <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
          Tu One Pager
        </h1>
        <p className="mt-2 text-[14px] text-brand-ink-soft">
          Completa los 4 pasos. Puedes guardar borradores y editar antes del cierre.
        </p>
      </header>

      <PostularForm proyectoId={proyectoExistente?.id} initial={initial} />
    </div>
  );
}
